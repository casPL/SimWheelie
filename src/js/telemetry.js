// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The last 12 seconds: bike angle against the balance point, throttle, brake and body position.

const teleCanvas = $('tele');
const tctx = teleCanvas.getContext('2d');
const TELE_SPAN = 12;

function recordTrace() {
  trace.push({ t: S.t, th: deg(S.th), bp: deg(balancePoint(bike, S.s)), thr: S.thrCmd, brk: S.brk, body: S.s });
  while (trace.length && trace[0].t < S.t - TELE_SPAN - 0.5) trace.shift();
  teleDirty = true;
}

function drawTele() {
  const { w, h } = fit(teleCanvas, tctx);
  tctx.clearRect(0, 0, w, h);
  const tEnd = Math.max(TELE_SPAN, S.t);
  const tx = (t) => ((t - (tEnd - TELE_SPAN)) / TELE_SPAN) * w;
  const top = 12,
    bot = h - 4;
  const ty = (d) => bot - (d / 90) * (bot - top);
  tctx.lineWidth = 1;
  tctx.font = `10px ${FONT_MONO}`;
  tctx.textAlign = 'left';
  tctx.strokeStyle = alpha(COL.rule, 0.7);
  tctx.fillStyle = COL.dim;
  tctx.beginPath();
  for (let d = 0; d <= 90; d += 30) {
    tctx.moveTo(0, ty(d));
    tctx.lineTo(w, ty(d));
    if (d) tctx.fillText(d + '°', 3, ty(d) - 3);
  }
  tctx.stroke();
  if (trace.length < 2) return;
  const band = (key, col) => {
    tctx.fillStyle = col;
    tctx.beginPath();
    tctx.moveTo(tx(trace[0].t), bot);
    for (const p of trace) tctx.lineTo(tx(p.t), bot - p[key] * (bot - top) * 0.35);
    tctx.lineTo(tx(trace[trace.length - 1].t), bot);
    tctx.fill();
  };
  band('thr', alpha(COL.gas, 0.3));
  band('brk', alpha(COL.rear, 0.35));
  tctx.fillStyle = alpha(COL.ok, 0.16);
  tctx.beginPath();
  trace.forEach((p, i) => (i ? tctx.lineTo(tx(p.t), ty(p.bp + 3)) : tctx.moveTo(tx(p.t), ty(p.bp + 3))));
  for (let i = trace.length - 1; i >= 0; i--) tctx.lineTo(tx(trace[i].t), ty(trace[i].bp - 3));
  tctx.fill();
  const plot = (f, col, lw, dash) => {
    tctx.strokeStyle = col;
    tctx.lineWidth = lw;
    tctx.setLineDash(dash || []);
    tctx.beginPath();
    trace.forEach((p, i) => (i ? tctx.lineTo(tx(p.t), f(p)) : tctx.moveTo(tx(p.t), f(p))));
    tctx.stroke();
    tctx.setLineDash([]);
  };
  plot((p) => ty(p.bp), COL.ok, 1.2, [4, 4]);
  plot((p) => (top + bot) / 2 - p.body * (bot - top) * 0.14, alpha(COL.spd, 0.85), 1.2);
  plot((p) => ty(p.th), COL.chalk, 2);
}
