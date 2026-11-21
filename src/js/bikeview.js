// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The bike and its rider, drawn in metres from the rear contact patch with the bike level.
// geom() gives the key points: R, F wheel centres, Pv swingarm pivot, H, Hl steering head, B
// handlebar, Sf, Sr seat front and rear, T tail, hip and footpeg.

function geom(bk, fork, body) {
  const rk = bk.rake * RAD;
  const u = [Math.sin(rk), -Math.cos(rk)];
  const sport = bk.look === 's';
  const pvx = Math.sqrt(bk.ls * bk.ls - (bk.hp - bk.rr) ** 2);
  const F0 = [bk.L, bk.rw];
  const e = fork * bk.ext;
  const H = [F0[0] - bk.fork * u[0], F0[1] - bk.fork * u[1]];
  const Sf = [H[0] - (sport ? 0.42 : bk.look === 'e' ? 0.33 : 0.38), bk.seat];
  const Sr = sport ? [pvx - 0.28, bk.seat + 0.03] : [-0.03 - 0.05 * (bk.rr / 0.3), bk.seat + 0.01];
  return {
    u,
    R: [0, bk.rr],
    Pv: [pvx, bk.hp],
    F: [F0[0] + e * u[0], F0[1] + e * u[1]],
    H,
    Hl: [H[0] + 0.15 * u[0], H[1] + 0.15 * u[1]],
    B: sport ? [H[0] - 0.09, H[1] - 0.07] : [H[0] - 0.12, H[1] + 0.15],
    Sf,
    Sr,
    peg: sport ? [pvx - 0.04, bk.hp - 0.02] : [pvx + 0.05, bk.hp - 0.04],
    hip: [Sr[0] + (Sf[0] - Sr[0]) * (sport ? 0.45 : 0.5) + body * bk.dx, bk.seat + 0.1],
    T: tailPoint(bk),
  };
}

function wheel(g, c, r, ang, bk, front) {
  const sport = bk.look === 's';
  disc(g, c, r, '#0f1113');
  ring(g, c, r * 0.9, '#1c1f23', r * 0.06);
  const rim = bk.rr < 0.26 ? 0.63 : 0.72;
  ring(g, c, r * rim, sport ? '#24272b' : '#b2b7bc', r * 0.075);
  if (sport) ring(g, c, r * (rim - 0.035), bk.color, r * 0.02);
  // Spokes, or the arms of a cast wheel, in one stroke; they are opaque, so overlaps look the same.
  const at = (a, k) => [c[0] + Math.cos(a) * r * k, c[1] + Math.sin(a) * r * k];
  const spoke = (a, k0, b, k1) => {
    g.moveTo(...at(a, k0));
    g.lineTo(...at(b, k1));
  };
  g.beginPath();
  if (sport) {
    for (let i = 0; i < 3; i++) {
      const a = ang + (i * Math.PI * 2) / 3;
      spoke(a, 0.15, a - 0.13, rim * 0.97);
      spoke(a, 0.15, a + 0.13, rim * 0.97);
    }
  } else {
    for (let i = 0; i < 18; i++) {
      const a = ang + (i * Math.PI * 2) / 18;
      spoke(a, 0.12, a + 0.42, rim);
    }
  }
  g.strokeStyle = sport ? '#24272b' : '#c4c8cc';
  g.lineWidth = Math.max(sport ? r * 0.06 : 0.006, PX);
  g.lineCap = 'round';
  g.stroke();
  const dr = front ? (sport ? 0.155 : bk.rr < 0.26 ? 0.11 : 0.16) : bk.rr < 0.26 ? 0.08 : 0.11;
  if (front || !sport) {
    ring(g, c, dr, '#8a9096', 0.032);
    g.fillStyle = '#3a3f44';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = ang + (i * Math.PI * 2) / 10;
      const x = c[0] + Math.cos(a) * dr;
      const y = c[1] + Math.sin(a) * dr;
      g.moveTo(x + 0.006, y);
      g.arc(x, y, 0.006, 0, Math.PI * 2);
    }
    g.fill();
  }
  disc(g, c, r * 0.13, '#5c6166');
  disc(g, c, r * 0.05, '#c9cdd1');
}

const RIDER_COL = {
  helmet: '#ece8dd',
  accent: '#ff6b1a',
  jersey: '#2c3540',
  pants: '#3a4049',
  boot: '#e3dfd3',
  glove: '#1d2024',
  visor: '#14171a',
};

function limbs(g, geo, far) {
  const k = far ? 0.62 : 1;
  const c = (hex) => (far ? shade(hex, k) : hex);
  const hip = far ? add(geo.hip, 0.02, 0) : geo.hip;
  const peg = far ? add(geo.peg, 0.02, 0) : geo.peg;
  const ankle = add(peg, -0.02, 0.07);
  const knee = joint(hip, ankle, 0.45, 0.46, 1);
  line(g, hip, knee, c(RIDER_COL.pants), 0.15);
  line(g, knee, ankle, c(RIDER_COL.pants), 0.12);
  poly(
    g,
    [
      add(ankle, -0.06, 0.14),
      add(ankle, 0.05, 0.15),
      add(peg, 0.15, 0.03),
      add(peg, 0.16, -0.03),
      add(peg, -0.07, -0.035),
      add(ankle, -0.07, 0.0),
    ],
    c(RIDER_COL.boot),
  );
  poly(
    g,
    [add(peg, -0.07, -0.035), add(peg, 0.16, -0.03), add(peg, 0.16, -0.05), add(peg, -0.07, -0.055)],
    c('#1b1d20'),
  );
  if (!far) line(g, add(knee, 0.02, 0.02), add(knee, 0.06, -0.12), '#5a616a', 0.05);
}

function arm(g, geo, sh, far) {
  const c = (hex) => (far ? shade(hex, 0.62) : hex);
  const B = far ? add(geo.B, 0.03, 0.01) : geo.B;
  const el = joint(sh, B, 0.31, 0.3, -1);
  line(g, sh, el, c(RIDER_COL.jersey), 0.1);
  line(g, el, B, c(RIDER_COL.jersey), 0.085);
  if (!far) line(g, mix(sh, el, 0.2), mix(el, B, 0.8), RIDER_COL.accent, 0.015);
  disc(g, B, 0.045, c(RIDER_COL.glove));
}

function torso(geo, bk, pose) {
  let phi = Math.max(bk.look === 's' ? 0.72 : 0.3, 0.65 * (pose.th || 0)) + 0.12 * (pose.s || 0);
  let sh;
  for (let i = 0; i < 40; i++) {
    sh = [geo.hip[0] + 0.55 * Math.sin(phi), geo.hip[1] + 0.55 * Math.cos(phi)];
    if (Math.hypot(geo.B[0] - sh[0], geo.B[1] - sh[1]) < 0.57) break;
    phi += 0.02;
  }
  return { phi, sh };
}

function drawRiderBody(g, geo, bk, pose, trunk) {
  const { phi, sh } = trunk;
  const a = [Math.sin(phi), Math.cos(phi)];
  const f = [Math.cos(phi), -Math.sin(phi)];
  const hip = geo.hip;
  const P = (p, s, t) => [p[0] + f[0] * s + a[0] * t, p[1] + f[1] * s + a[1] * t];
  poly(
    g,
    [
      P(hip, -0.1, -0.02),
      P(hip, 0.1, -0.04),
      P(hip, 0.12, 0.25),
      P(sh, 0.11, -0.02),
      P(sh, 0.04, 0.07),
      P(sh, -0.09, 0.05),
      P(sh, -0.14, -0.1),
      P(hip, -0.13, 0.2),
    ],
    RIDER_COL.jersey,
  );
  path(g, [P(hip, -0.12, 0.05), P(hip, -0.135, 0.22), P(sh, -0.14, -0.1)], '#232a33', 0.03);
  path(g, [P(hip, 0.0, 0.02), P(sh, 0.0, -0.04)], RIDER_COL.accent, 0.02);
  line(g, P(hip, -0.1, 0.0), P(hip, 0.1, -0.02), '#1b1f24', 0.05);
  const nphi = 0.45 * pose.th + 0.55 * phi;
  const hd = add(sh, 0.2 * Math.sin(nphi) + 0.02, 0.2 * Math.cos(nphi));
  line(g, sh, hd, '#1b1f24', 0.08);
  helmet(g, hd, -0.8 * pose.th + (bk.look === 's' ? 0.1 : 0), bk.look === 's');
}

function helmet(g, c, rot, sport) {
  g.save();
  g.translate(c[0], c[1]);
  g.rotate(rot);
  disc(g, [0, 0], 0.14, RIDER_COL.helmet);
  ring(g, [0, 0], 0.115, RIDER_COL.accent, 0.03, Math.PI * 0.55, Math.PI * 1.05);
  if (sport) {
    poly(
      g,
      [
        [0.04, 0.05],
        [0.145, 0.03],
        [0.15, -0.04],
        [0.05, -0.035],
      ],
      RIDER_COL.visor,
    );
    poly(
      g,
      [
        [0.06, -0.05],
        [0.15, -0.06],
        [0.11, -0.13],
        [0.0, -0.13],
      ],
      RIDER_COL.helmet,
    );
  } else {
    poly(
      g,
      [
        [0.05, -0.04],
        [0.21, -0.07],
        [0.18, -0.14],
        [0.02, -0.135],
      ],
      RIDER_COL.helmet,
    );
    poly(
      g,
      [
        [0.12, -0.075],
        [0.2, -0.085],
        [0.185, -0.12],
        [0.11, -0.115],
      ],
      '#c7c2b6',
    );
    poly(
      g,
      [
        [0.07, 0.04],
        [0.165, 0.035],
        [0.17, -0.03],
        [0.075, -0.03],
      ],
      RIDER_COL.visor,
    );
    poly(
      g,
      [
        [0.1, 0.03],
        [0.16, 0.026],
        [0.162, -0.01],
        [0.103, -0.008],
      ],
      'rgba(255,107,26,0.55)',
    );
    poly(
      g,
      [
        [0.0, 0.115],
        [0.26, 0.105],
        [0.25, 0.07],
        [0.04, 0.07],
      ],
      RIDER_COL.accent,
    );
  }
  g.restore();
}

function bodyDirt(g, bk, geo, col, dark) {
  const { H, Hl, Pv, Sf, Sr, T } = geo;
  const s = bk.seat,
    hp = bk.hp;
  const P = add;
  const alu = '#8d939a';
  path(g, [P(Pv, -0.12, s - hp - 0.3), P(Sr, 0.06, -0.12)], '#8f959b', 0.1);
  disc(g, P(Sr, 0.06, -0.12), 0.045, '#5b6167');
  poly(
    g,
    [P(Pv, 0.03, -0.07), P(Pv, 0.36, -0.12), P(Pv, 0.44, 0.03), P(Pv, 0.32, 0.17), P(Pv, 0.06, 0.15)],
    '#3c4147',
    '#202326',
    0.006,
  );
  const c0 = P(Pv, 0.22, 0.13),
    c1 = P(Pv, 0.4, 0.08),
    c2 = P(Pv, 0.47, 0.32),
    c3 = P(Pv, 0.3, 0.37);
  poly(g, [c0, c1, c2, c3], '#585e65', '#202326', 0.006);
  for (let i = 1; i < 5; i++) line(g, mix(c0, c3, i / 5), mix(c1, c2, i / 5), '#3c4147', 0.008);
  path(g, [P(Pv, 0.42, 0.3), P(Pv, 0.5, 0.18), P(Pv, 0.46, 0.02), P(Pv, 0.2, -0.05)], '#a2a8ae', 0.038);
  path(g, [P(H, -0.03, -0.07), [Pv[0] + 0.1, s - 0.28], P(Pv, 0.02, 0.04)], alu, 0.055);
  path(g, [P(Hl, -0.02, 0), P(Pv, 0.47, -0.06), P(Pv, 0.3, -0.14)], '#3a3f45', 0.032);
  line(g, [Pv[0] + 0.02, s - 0.27], P(Sr, 0.12, -0.08), alu, 0.028);
  poly(
    g,
    [P(Sr, 0.16, -0.06), [T[0], T[1] + 0.015], [T[0] + 0.02, T[1] - 0.02], P(Sr, 0.18, -0.13)],
    col,
    geo.edge,
    geo.ew,
  );
  poly(
    g,
    [P(Sr, 0.1, -0.04), [Pv[0], s - 0.03], [Pv[0] + 0.02, s - 0.3], P(Sr, 0.26, -0.27)],
    '#e9e5da',
    '#0b0c0d',
    0.006,
  );
  const lc = mix(P(Sr, 0.18, -0.15), [Pv[0], s - 0.17], 0.5);
  label(g, lc[0], lc[1], 0.13, '8', '#16181a');
  poly(g, [P(Sr, -0.03, 0.025), [Sf[0] + 0.02, s + 0.03], [Sf[0] + 0.07, s - 0.03], P(Sr, 0, -0.04)], '#16181b');
  const t0 = [Sf[0] - 0.02, s],
    t1 = P(H, -0.1, -0.03),
    t2 = P(H, -0.04, -0.12),
    t3 = [H[0] - 0.1, s - 0.3],
    t4 = [Sf[0] + 0.1, s - 0.32];
  poly(g, [t0, t1, t2, t3, t4], col, geo.edge, geo.ew);
  for (let i = 1; i < 4; i++)
    line(
      g,
      mix(P(t4, 0.03, 0.06), P(t3, -0.01, 0.06), i / 4),
      mix(P(t4, 0.05, 0.2), P(t2, -0.04, -0.06), i / 4),
      dark,
      0.012,
    );
}

function bodyE(g, bk, geo, col, dark) {
  const { R, H, Pv, Sf, Sr, T } = geo;
  const s = bk.seat;
  const P = add;
  const lo = mix(R, Pv, 0.6),
    hi = [Pv[0] - 0.12, s - 0.13];
  line(g, lo, hi, '#2a2e32', 0.04);
  line(g, mix(lo, hi, 0.18), mix(lo, hi, 0.8), '#d8a21f', 0.032);
  poly(
    g,
    [
      P(H, -0.02, -0.03),
      [Sf[0] - 0.05, s - 0.04],
      [Pv[0] - 0.04, s - 0.1],
      P(Pv, -0.06, 0.06),
      P(Pv, 0.02, -0.12),
      P(Pv, 0.3, -0.14),
      P(H, -0.08, -0.27),
    ],
    '#3a3f45',
    '#1d2023',
    0.006,
  );
  poly(
    g,
    [[Sf[0] - 0.03, s - 0.1], [Pv[0] + 0.02, s - 0.13], P(Pv, 0.04, 0.04), P(Pv, 0.28, -0.08), P(H, -0.13, -0.3)],
    '#24282d',
  );
  poly(g, [[Pv[0] + 0.07, s - 0.17], P(H, -0.15, -0.33), P(H, -0.165, -0.4), [Pv[0] + 0.07, s - 0.25]], col);
  disc(g, P(Pv, 0.08, -0.06), 0.08, '#1e2125');
  ring(g, P(Pv, 0.08, -0.06), 0.055, '#555b62', 0.012);
  poly(
    g,
    [P(Sr, 0.15, -0.06), [T[0], T[1] + 0.015], [T[0] + 0.02, T[1] - 0.02], P(Sr, 0.17, -0.12)],
    '#2a2e33',
    '#0b0c0d',
    0.006,
  );
  poly(
    g,
    [P(Sr, 0.08, -0.04), [Pv[0] - 0.08, s - 0.03], [Pv[0] - 0.14, s - 0.2], P(Sr, 0.22, -0.18)],
    col,
    '#0b0c0d',
    0.006,
  );
  const lc = mix(P(Sr, 0.15, -0.11), [Pv[0] - 0.11, s - 0.11], 0.5);
  label(g, lc[0], lc[1], 0.11, '8', '#16181a');
  poly(g, [P(Sr, -0.03, 0.025), [Sf[0] + 0.02, s + 0.03], [Sf[0] + 0.07, s - 0.03], P(Sr, 0, -0.04)], '#16181b');
  poly(
    g,
    [
      [Sf[0] - 0.01, s - 0.01],
      P(H, -0.09, -0.04),
      P(H, -0.05, -0.12),
      [H[0] - 0.12, s - 0.16],
      [Sf[0] + 0.09, s - 0.12],
    ],
    dark,
    '#0b0c0d',
    0.006,
  );
}

function bodySport(g, bk, geo, col, dark) {
  const { H, Pv, Sf, Sr, T } = geo;
  const s = bk.seat,
    hp = bk.hp;
  const P = add;
  poly(g, [P(Pv, 0.02, -0.1), P(Pv, 0.52, -0.18), P(Pv, 0.58, 0.1), P(Pv, 0.1, 0.2)], '#2c3035');
  poly(
    g,
    [
      P(H, -0.05, -0.03),
      [Sf[0] + 0.04, s - 0.06],
      P(Pv, 0.06, 0.14),
      P(Pv, 0, -0.03),
      P(Pv, 0.14, 0),
      P(H, -0.1, -0.15),
    ],
    '#9aa1a8',
    '#2a2e32',
    0.006,
  );
  poly(
    g,
    [
      [T[0] + 0.1, T[1] - 0.13],
      [Pv[0] - 0.3, s - 0.12],
      [Pv[0] - 0.38, s - 0.22],
      [T[0] + 0.2, T[1] - 0.2],
    ],
    '#1d2023',
  );
  poly(
    g,
    [
      P(Sr, 0.1, 0.0),
      P(Sr, -0.1, 0.05),
      [T[0] + 0.03, T[1]],
      [T[0], T[1] - 0.055],
      [T[0] + 0.1, T[1] - 0.13],
      [Pv[0] - 0.3, s - 0.12],
      [Pv[0] - 0.05, s - 0.1],
    ],
    col,
    '#0b0c0d',
    0.006,
  );
  poly(
    g,
    [
      [T[0] + 0.025, T[1] - 0.008],
      [T[0] + 0.06, T[1] - 0.012],
      [T[0] + 0.045, T[1] - 0.05],
      [T[0] + 0.005, T[1] - 0.047],
    ],
    '#ff5a4f',
  );
  poly(g, [P(Sr, -0.08, 0.06), P(Sr, 0.08, 0.02), P(Sr, 0.1, 0.0), P(Sr, -0.1, 0.045)], '#16181b');
  poly(g, [P(Sr, 0.05, 0.005), [Sf[0], s + 0.0], [Sf[0] + 0.02, s - 0.03], P(Sr, 0.06, -0.03)], '#16181b');
  poly(
    g,
    [
      [Sf[0] - 0.03, s + 0.01],
      [Sf[0] + 0.12, s + 0.12],
      P(H, -0.12, 0.01),
      P(H, -0.08, -0.1),
      [Sf[0] + 0.12, s - 0.08],
    ],
    dark,
    '#0b0c0d',
    0.006,
  );
  poly(
    g,
    [
      P(H, 0.17, -0.07),
      P(H, 0.08, 0.06),
      P(H, -0.04, 0.08),
      P(H, -0.1, -0.02),
      [Sf[0] + 0.14, s - 0.08],
      [Sf[0] + 0.16, hp + 0.12],
      P(Pv, 0.34, -0.14),
      [H[0] + 0.02, hp - 0.16],
      P(H, 0.12, -0.3),
    ],
    col,
    '#0b0c0d',
    0.006,
  );
  poly(g, [[Sf[0] + 0.22, s - 0.14], P(H, -0.12, -0.16), P(H, -0.08, -0.24), [Sf[0] + 0.25, s - 0.22]], dark);
  poly(g, [P(H, 0.08, 0.06), P(H, -0.02, 0.2), P(H, -0.09, 0.16), P(H, -0.04, 0.08)], 'rgba(150,190,220,0.4)');
  poly(g, [P(H, 0.165, -0.07), P(H, 0.12, -0.03), P(H, 0.1, -0.12)], '#e8e4d8');
}

function drawBike(g, bk, pose, wr, wf) {
  const geo = geom(bk, pose.fork, pose.s);
  const { u, R, Pv, F, H, Hl, B } = geo;
  const col = bk.color;
  const blk = lum(col) < 0.2;
  const dark = blk ? '#5a6068' : shade(col, 0.55);
  geo.edge = blk ? '#5a6068' : '#0b0c0d';
  geo.ew = blk ? 0.011 : 0.006;
  const sport = bk.look === 's';
  const trunk = torso(geo, bk, pose);

  arm(g, geo, [trunk.sh[0] + 0.02, trunk.sh[1]], true);
  limbs(g, geo, true);
  if (sport)
    path(
      g,
      [
        [Pv[0], bk.hp - 0.1],
        [Pv[0] - 0.4, bk.hp + 0.06],
      ],
      '#9aa0a6',
      0.11,
    );

  wheel(g, R, bk.rr, -wr, bk, false);
  const k = bk.rr / 0.3;
  ring(g, R, 0.1 * k, '#454a50', 0.012);
  const fs = [Pv[0] + 0.07, Pv[1] + 0.01];
  line(g, [fs[0], fs[1] + 0.035], [R[0], R[1] + 0.1 * k], '#2a2e32', 0.013);
  line(g, [fs[0], fs[1] - 0.035], [R[0], R[1] - 0.1 * k], '#2a2e32', 0.013);
  poly(
    g,
    [
      [Pv[0], Pv[1] + 0.04],
      [R[0] + 0.02, R[1] + 0.03],
      [R[0] + 0.02, R[1] - 0.025],
      [Pv[0], Pv[1] - 0.045],
    ],
    bk.look === 'e' ? '#6f767d' : '#8d939a',
    '#2a2e32',
    0.006,
  );

  if (sport) bodySport(g, bk, geo, col, dark);
  else if (bk.look === 'e') bodyE(g, bk, geo, col, dark);
  else bodyDirt(g, bk, geo, col, dark);

  const fu = mix(H, F, 0.42);
  const low = sport ? '#c8ccd0' : '#c9a227';
  line(g, [F[0] - 0.012, F[1]], [fu[0] - 0.012, fu[1]], low, 0.036);
  wheel(g, F, bk.rw, -wf, bk, true);
  if (sport) ring(g, F, bk.rw + 0.03, '#1d2023', 0.035, Math.PI * 0.25, Math.PI * 0.75);
  else {
    if (blk) ring(g, F, bk.rw + 0.035, geo.edge, 0.062, Math.PI * 0.14, Math.PI * 0.86);
    ring(g, F, bk.rw + 0.035, bk.look === 'e' ? '#2a2e33' : col, 0.045, Math.PI * 0.14, Math.PI * 0.86);
  }
  line(g, F, fu, low, 0.036);
  line(g, fu, H, sport ? '#c9a227' : '#2b2f33', 0.062);
  poly(
    g,
    [
      [F[0] - 0.08, F[1] + 0.03],
      [F[0] - 0.04, F[1] + 0.065],
      [F[0] - 0.01, F[1] - 0.01],
      [F[0] - 0.05, F[1] - 0.035],
    ],
    '#2b2f33',
  );
  const nx = [-u[1], u[0]];
  for (const p of [H, Hl])
    line(g, [p[0] - nx[0] * 0.05, p[1] - nx[1] * 0.05], [p[0] + nx[0] * 0.05, p[1] + nx[1] * 0.05], '#6d737a', 0.03);
  if (sport) {
    line(g, [H[0] - 0.01, H[1] - 0.06], B, '#1c1f22', 0.026);
  } else {
    poly(
      g,
      [
        [H[0] + 0.03, H[1] + 0.04],
        [H[0] + 0.12, H[1] - 0.04],
        [H[0] + 0.09, H[1] - 0.25],
        [H[0], H[1] - 0.2],
      ],
      bk.look === 'e' ? '#2a2e33' : '#e9e5da',
      '#0b0c0d',
      0.006,
    );
    if (bk.look === 'e')
      poly(
        g,
        [
          [H[0] + 0.1, H[1] - 0.07],
          [H[0] + 0.115, H[1] - 0.05],
          [H[0] + 0.1, H[1] - 0.15],
        ],
        '#e8e4d8',
      );
    line(g, [H[0] - 0.02, H[1] + 0.05], B, '#1c1f22', 0.024);
  }

  limbs(g, geo, false);
  drawRiderBody(g, geo, bk, pose, trunk);
  arm(g, geo, trunk.sh, false);
  return geo;
}

function tailLift(bk, th) {
  const [tx, ty] = tailPoint(bk);
  const z = bk.rr + tx * Math.sin(th) + (ty - bk.rr) * Math.cos(th);
  return Math.max(0, -z);
}
