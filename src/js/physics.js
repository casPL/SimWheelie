// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// One time step of the bike. The pitch is a free-base rotation about the rear axle, with the
// drivetrain inertia, the rider sliding on the seat, a sprung front fork and a sprung tail that can
// scrape the asphalt. The rear tyre drives or brakes within its grip.

/**
 * x, v, t: position, speed, time; th, om: pitch and pitch rate; thrCmd, thr: throttle grip and the
 * engine's response; brk: rear brake; s, sv: rider position on the seat (−1 back … 1 forward); zb,
 * vzb: rear suspension over bumps; ra, fa, fw: wheel angles and front wheel speed for drawing;
 * fork: fork extension for drawing (0 static sag, 1 topped out); air: front wheel off the ground;
 * scrape, tailX: tail on the asphalt and its distance behind the axle; lifted: the attempt has
 * started; done: why it ended ('down', 'loop', 'tail', 'late'); w…, bpTime, sumDev, maxTh, vMax,
 * brkHist, impact: statistics of the attempt.
 */
function newState() {
  // prettier-ignore
  return {
    t: 0, x: 0, v: 0, th: 0, om: 0,
    thrCmd: 0, thr: 0, brk: 0, s: 0, sv: 0, fork: 0, zb: 0, vzb: 0,
    ra: 0, fa: 0, fw: 0, slip: 0, air: false, lifted: false, done: null, impact: 0, scrape: false, tailX: 0, flip: false, stuck: 0,
    wDist: 0, wTime: 0, bpTime: 0, maxTh: 0, sumDev: 0, vMax: 0, brkHist: 0,
  };
}

/** Advances s by DT with the controls inp = { gas, brake, back, fwd }, each 0…1. */
function step(s, bk, road, inp) {
  const c = prep(bk);
  const dt = DT;
  s.thrCmd = approach(s.thrCmd, clamp(inp.gas || 0, 0, 1), 1 / 0.2, 1 / 0.12, dt);
  s.thr += (s.thrCmd - s.thr) * Math.min(1, dt / bk.tau);
  s.brk = approach(s.brk, clamp(inp.brake || 0, 0, 1), 1 / 0.15, 1 / 0.1, dt);
  const target = clamp((inp.fwd || 0) - (inp.back || 0), -1, 1);
  const sa = BODY_W * BODY_W * (target - s.s) - 2 * BODY_W * s.sv;
  s.sv += sa * dt;
  s.s += s.sv * dt;
  if (Math.abs(s.s) > 1) {
    s.s = Math.sign(s.s);
    s.sv = 0;
  }

  const b = c.b0 + (RIDER * s.s * bk.dx) / c.M;
  const cs = Math.cos(s.th),
    sn = Math.sin(s.th);
  const px = b * cs - c.hc * sn;
  const py = b * sn + c.hc * cs;
  const v = s.v;

  const y0 = road.y(s.x);
  const dy = road.dy(s.x);
  const az = SUS_W * SUS_W * (y0 - s.zb) + 2 * SUS_Z * SUS_W * (v * dy - s.vzb);
  s.vzb += az * dt;
  s.zb += s.vzb * dt;
  const geff = Math.max(0.2 * G, G + az);
  const W = c.M * geff;

  // Front fork: a spring through the static sag up to full extension, with a bump stop.
  const xf = bk.L * cs - (bk.rw - bk.rr) * sn;
  const xF = s.x + xf;
  const z = bk.L * sn - (bk.rw - bk.rr) * (1 - cs) - (road.y(xF) - y0);
  const zd = xf * s.om - v * (road.dy(xF) - dy);
  const cv = c.ev - z;
  let nF = 0;
  if (cv > 0) {
    nF = c.kf * cv - (zd > 0 ? FORK_ZR : FORK_ZC) * c.cf * zd;
    if (cv > c.cmax) nF += 20 * c.kf * (cv - c.cmax);
    nF = Math.max(0, nF);
  }
  const wasAir = s.air;
  s.air = cv <= 0;

  // Tail: a stiff spring on the asphalt. On first contact the bike goes over the tail when its
  // angular momentum about the tail can lift the CoG over it.
  const [tx, ty] = c.tp;
  const zt = bk.rr + tx * sn + (ty - bk.rr) * cs;
  const xt = tx * cs - (ty - bk.rr) * sn;
  const nT = zt < 0 ? Math.max(0, -c.kt * zt - c.ct * xt * s.om) : 0;
  const wasScrape = s.scrape;
  s.scrape = nT > 0;
  s.tailX = xt;
  if (s.scrape) {
    const dx = px - xt,
      dz = py + bk.rr;
    const r2 = dx * dx + dz * dz;
    if (dx <= 0) s.flip = true;
    else if (!wasScrape && s.om > 0) {
      const w = (s.om * (bk.k2 + px * dx + py * dz)) / (bk.k2 + r2);
      if (0.5 * (bk.k2 + r2) * w * w > geff * (Math.sqrt(r2) - dz)) s.flip = true;
    }
  }
  s.stuck = s.scrape && v < 1 ? s.stuck + dt : 0;

  // Longitudinal forces at the rear tyre; at a standstill the resistances only hold the bike.
  const fReq = Math.min(bk.aMax * c.M, (bk.P * 1000) / Math.max(v, 1)) * s.thr * s.thr;
  const nRear = Math.max(0, W - nF - nT);
  const grip = bk.mu * nRear;
  const fDrive = Math.min(grip, fReq);
  s.slip = fReq > grip ? Math.min(1, (fReq - grip) / grip + 0.3) : 0;
  let fEng = v > 0.3 ? bk.eb * c.M * Math.max(0, 1 - 4 * s.thr) : 0;
  let fBrake = s.brk * Math.min(bk.brk * c.M, grip);
  let fRoll = ROLL * W;
  let fTail = TAIL_MU * nT * Math.min(1, v / 0.5);
  const drag = AIR * v * v;
  const fSlope = -W * dy;
  if (v < 0.05) {
    const room = Math.max(0, fDrive + fSlope - drag + (v * c.M) / dt);
    const res = fEng + fBrake + fRoll + fTail;
    if (res > room) {
      const k = room / res;
      fEng *= k;
      fBrake *= k;
      fRoll *= k;
      fTail *= k;
    }
  }
  const ft = fDrive - fEng - fBrake;
  const fa = fSlope - fRoll;

  // Pitch and forward motion, coupled through the axle acceleration.
  const q = c.mu * (py + c.jm);
  const den = bk.k2 + px * px + (1 - c.mu) * py * py - c.mu * py * c.jm;
  const alpha =
    (ft * (bk.rr + q) +
      q * fa +
      (py - q) * drag +
      c.mred * c.rho * sa * bk.dx +
      nF * xf +
      nT * xt -
      fTail * (bk.rr + q)) /
      (c.M * den) +
    (q * px * s.om * s.om - geff * px) / den;

  if (wasAir && !s.air) s.impact = Math.max(s.impact, -s.om);
  s.om += alpha * dt;
  s.th += s.om * dt;
  const aA = (ft + fa - drag - fTail + c.M * (py * alpha + px * s.om * s.om)) / (c.M + bk.me);

  s.v = Math.max(0, v + aA * dt);
  s.x += s.v * dt;
  s.t += dt;
  s.vMax = Math.max(s.vMax, s.v);
  s.ra += (s.v / bk.rr) * dt;
  s.fw = s.air ? s.fw * Math.max(0, 1 - 0.25 * dt) : s.v / bk.rw;
  s.fa += s.fw * dt;
  s.fork = s.air ? 1 : clamp(1 - cv / c.ev, -2.5, 1);
  s.brkHist = Math.max(s.brk, s.brkHist - dt * 1.5);

  // The distance counts with the front up and the tail off the asphalt.
  if (s.air) {
    if (!s.scrape) {
      s.wDist += s.v * dt;
      s.wTime += dt;
      const dev = s.th - Math.atan2(b, c.hc);
      s.sumDev += dev * dt;
      if (Math.abs(dev) <= 3 * RAD) s.bpTime += dt;
    }
    s.maxTh = Math.max(s.maxTh, s.th);
    if (s.th > LIFT_DEG * RAD) s.lifted = true;
  } else if (!s.lifted) {
    s.wDist = s.wTime = s.bpTime = s.sumDev = s.maxTh = s.impact = 0;
  }

  if (s.flip || s.th > c.tail + 10 * RAD) s.done = 'loop';
  else if (s.stuck > 0.5) s.done = 'tail';
  else if (s.lifted && !s.air) s.done = 'down';
  else if (!s.lifted && s.x > RUNUP) s.done = 'late';
  return s;
}
