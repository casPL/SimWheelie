// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The bikes and the quantities derived from their data: balance point, tail contact, fork and
// tail stiffness.

// m [kg], P [kW], L [m], h CoG with rider [m], ff front load, mu grip, rr/rw wheel radius [m], rake [°],
// hp/ls swingarm pivot height/length [m], aMax [m/s²], brk rear brake [m/s²], eb engine braking [m/s²],
// tau throttle lag [s], me/ms drivetrain inertia as tyre mass [kg], k2 [m²], dx seat slide [m], seat/fork/ext [m]
// prettier-ignore
const BIKES = [
  {
    id: 'ebike', name: 'Sur-Ron SM 17"', short: 'Sur-Ron', look: 'e', color: '#e33b34',
    m: 85,  P: 21,  L: 1.38,  h: 0.72, ff: 0.48, mu: 1.15, rr: 0.3,   rw: 0.296, rake: 26, hp: 0.42, ls: 0.57,
    aMax: 10.5, brk: 6.5, eb: 0.3, tau: 0.02, me: 6,  ms: 3.5, k2: 0.3,  dx: 0.17,
    seat: 0.88, fork: 0.86, ext: 0.07,
  },
  {
    id: 'pit', name: 'Pitbike SM 12"', short: 'Pitbike', look: 'd', color: '#202327',
    m: 72,  P: 11,  L: 1.17,  h: 0.72, ff: 0.47, mu: 1.4,  rr: 0.243, rw: 0.242, rake: 26, hp: 0.33, ls: 0.46,
    aMax: 10.5, brk: 5.5, eb: 0.8, tau: 0.05, me: 17, ms: 2.5, k2: 0.24, dx: 0.15,
    seat: 0.78, fork: 0.66, ext: 0.05,
  },
  {
    id: 'sm', name: 'Supermoto 450', short: 'SM 450', look: 'd', color: '#e33b34',
    m: 118, P: 40,  L: 1.49,  h: 0.95, ff: 0.46, mu: 1.35, rr: 0.3,   rw: 0.3,   rake: 26, hp: 0.45, ls: 0.585,
    aMax: 12,   brk: 7,   eb: 1.2, tau: 0.05, me: 21, ms: 3.5, k2: 0.3,  dx: 0.17,
    seat: 0.94, fork: 0.92, ext: 0.08,
  },
  {
    id: 'cbr', name: 'CBR600', short: 'CBR600', look: 's', color: '#e0483e',
    m: 195, P: 85,  L: 1.375, h: 0.76, ff: 0.52, mu: 1.2,  rr: 0.308, rw: 0.3,   rake: 24, hp: 0.44, ls: 0.58,
    aMax: 10,   brk: 5,   eb: 0.8, tau: 0.05, me: 24, ms: 6,   k2: 0.3,  dx: 0.12,
    seat: 0.82, fork: 0.72, ext: 0.04,
  },
  {
    id: 'gsxr', name: 'GSX-R 1000', short: 'GSX-R', look: 's', color: '#3d8bff',
    m: 203, P: 140, L: 1.42,  h: 0.78, ff: 0.51, mu: 1.2,  rr: 0.304, rw: 0.3,   rake: 24, hp: 0.43, ls: 0.58,
    aMax: 12.5, brk: 5,   eb: 1.0, tau: 0.05, me: 24, ms: 6,   k2: 0.3,  dx: 0.12,
    seat: 0.83, fork: 0.72, ext: 0.04,
  },
];

/** The rearmost point of the tail, relative to the rear contact patch with the bike level [m]. */
function tailPoint(bk) {
  if (bk.look === 's') return [-1.05 * bk.rr, bk.seat + 0.1];
  if (bk.look === 'e') return [-1.33 * bk.rr, bk.seat - 0.03];
  return [-1.45 * bk.rr, bk.seat - 0.02];
}

/** Pitch at which the tail touches flat ground [rad]. */
function tailAngle(bk) {
  const [tx, ty] = tailPoint(bk);
  const f = (a) => bk.rr + tx * Math.sin(a) + (ty - bk.rr) * Math.cos(a);
  let lo = 0.2,
    hi = 1.6;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

const PREP = new Map();

/**
 * Constants of a bike used by every physics step, computed once.
 * b0, hc: CoG ahead of and above the rear axle; mu, jm: drivetrain inertia terms; ev, kf, cf, cmax:
 * fork travel to top-out, stiffness, damping and bump stop; tp, tail, kt, ct: tail point, contact
 * angle, stiffness and damping; mred, rho: rider-on-seat coupling.
 */
function prep(bk) {
  let c = PREP.get(bk.id);
  if (c) return c;
  const M = bk.m + RIDER;
  const yR = bk.seat + 0.2;
  const yB = (M * bk.h - RIDER * yR) / bk.m;
  const b0 = bk.ff * bk.L,
    hc = bk.h - bk.rr,
    mu = M / (M + bk.me),
    jm = (bk.rr * (bk.ms - bk.me)) / M;
  const ev = bk.ext * Math.cos(bk.rake * RAD);
  const kf = (bk.ff * M * G) / ev;
  const den0 = bk.k2 + b0 * b0 + (1 - mu) * hc * hc - mu * hc * jm;
  const tp = tailPoint(bk);
  const tail = tailAngle(bk);
  const xt0 = tp[0] * Math.cos(tail) - (tp[1] - bk.rr) * Math.sin(tail);
  const pxT = b0 * Math.cos(tail) - hc * Math.sin(tail),
    pyT = b0 * Math.sin(tail) + hc * Math.cos(tail);
  const meT = (M * (bk.k2 + pxT * pxT + (1 - mu) * pyT * pyT - mu * pyT * jm)) / (xt0 * xt0);
  const kt = (M * G) / 0.012;
  c = {
    M,
    b0,
    hc,
    mu,
    jm,
    ev,
    kf,
    tp,
    tail,
    kt,
    ct: 1.4 * Math.sqrt(kt * meT),
    cf: (2 * Math.sqrt(kf * M * den0)) / bk.L,
    cmax: 3.5 * ev,
    mred: (bk.m * RIDER) / M,
    rho: yR - yB,
  };
  PREP.set(bk.id, c);
  return c;
}

/** Distance of the CoG ahead of the rear axle with the rider at body (−1 back … 1 forward) [m]. */
function cogB(bk, body) {
  const c = prep(bk);
  return c.b0 + (RIDER * body * bk.dx) / c.M;
}

/** Pitch with the CoG right above the rear axle [rad]. */
function balancePoint(bk, body) {
  return Math.atan2(cogB(bk, body), prep(bk).hc);
}

/** Time for a small deviation from the balance point to double with no input [s]. */
function doubling(bk) {
  const c = prep(bk);
  const d = Math.hypot(c.b0, c.hc);
  const lam = Math.sqrt((G * d) / (bk.k2 + (1 - c.mu) * d * d - c.mu * d * c.jm));
  return Math.LN2 / lam;
}

/** Acceleration that starts lifting the front wheel [m/s²]. */
function liftLimit(bk, body) {
  const c = prep(bk);
  return (G * cogB(bk, body)) / (bk.rr + c.mu * (c.hc + c.jm));
}
