// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Heads-up display over the scene: distance, angle gauge with the balance point, control bars.

function panel(x, y, w, h) {
  ctx.fillStyle = alpha(COL.asphalt, 0.74);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 6);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

function drawHud(w, h, bp, narrow) {
  const u = clamp(w / 900, 0.72, 1.2);
  const mono = (s, wgt = 500) => `${wgt} ${s * u}px ${FONT_MONO}`;
  const disp = (s) => `700 ${s * u}px ${FONT_DISPLAY}`;
  const inZone = S.air && Math.abs(S.th - bp) <= 3 * RAD;
  const zoneCol = inZone ? '#6ee08e' : COL.ok;
  const counting = S.lifted || phase === 'over';

  panel(10, 10, 178 * u, 96 * u);
  ctx.textAlign = 'left';
  ctx.font = mono(10.5);
  const scraping = phase === 'ride' && S.scrape;
  ctx.fillStyle = scraping ? '#ffb74d' : COL.muted;
  ctx.fillText(
    scraping ? 'OGON TRZE · DYSTANS STOI' : counting ? 'NA TYLNYM KOLE' : `PODERWIJ PONAD ${LIFT_DEG}°`,
    20 * u,
    27 * u,
  );
  ctx.fillStyle = counting ? COL.chalk : COL.dim;
  ctx.font = disp(32);
  ctx.fillText(fmt(S.wDist) + ' m', 20 * u, 59 * u);
  ctx.font = mono(11.5);
  ctx.fillStyle = COL.muted;
  const zp = S.wTime > 0 ? Math.round((100 * S.bpTime) / S.wTime) : 0;
  ctx.fillText(`${Math.round(S.v * 3.6)} km/h · strefa BP ${zp}%`, 20 * u, 78 * u);
  const rec = best[bestKey()];
  ctx.fillText(`${rec ? 'rekord ' + fmt(rec) + ' m' : 'bez rekordu'} · ${pct(cfg.tempo)}`, 20 * u, 95 * u);

  const R = (narrow ? 62 : 74) * u;
  const pad = 14 * u;
  const bx = w - R - 2 * pad - 10;
  panel(bx, 10, R + 2 * pad, R + 2 * pad + 26 * u);
  const cx = bx + pad,
    cy = 10 + pad + R;
  const onArc = (a, r) => [cx + Math.cos(a) * r, cy - Math.sin(a) * r];
  const arc = (a0, a1, col, lw) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.min(a1, Math.PI / 2), -Math.max(0, a0));
    ctx.stroke();
  };
  const tick = (a, r0, r1) => {
    ctx.moveTo(...onArc(a, r0));
    ctx.lineTo(...onArc(a, r1));
  };
  ctx.lineCap = 'butt';
  arc(0, Math.PI / 2, COL.rule, 9 * u);
  arc(bp - 7 * RAD, bp + 7 * RAD, alpha(COL.warn, 0.75), 9 * u);
  arc(bp - 3 * RAD, bp + 3 * RAD, zoneCol, (inZone ? 13 : 9) * u);
  arc(prep(bike).tail, Math.PI / 2, 'rgba(239,83,80,0.85)', 9 * u);
  if (!S.lifted && phase !== 'over') {
    ctx.strokeStyle = alpha(COL.chalk, 0.8);
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    tick(LIFT_DEG * RAD, R - 8 * u, R + 8 * u);
    ctx.stroke();
  }
  ctx.strokeStyle = COL.dim;
  ctx.lineWidth = 1;
  ctx.fillStyle = COL.dim;
  ctx.font = mono(9);
  ctx.textAlign = 'center';
  ctx.beginPath();
  for (let d = 0; d <= 90; d += 15) {
    tick(d * RAD, R - 8 * u, R - 13 * u);
    if (d % 30 === 0) {
      const [lx, ly] = onArc(d * RAD, R - 22 * u);
      ctx.fillText(String(d), lx, ly + 3 * u);
    }
  }
  ctx.stroke();
  if (cfg.trend && S.air) {
    const [tx, ty] = onArc(clamp(S.th + S.om * 0.25, 0, Math.PI / 2), R);
    ctx.strokeStyle = COL.chalk;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 5 * u, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = COL.chalk;
  ctx.lineWidth = 3 * u;
  ctx.lineCap = 'round';
  ctx.beginPath();
  tick(S.th, 0, R + 6 * u);
  ctx.stroke();
  disc(ctx, [cx, cy], 4 * u, COL.chalk);
  ctx.textAlign = 'left';
  ctx.font = disp(22);
  ctx.fillStyle = COL.chalk;
  ctx.fillText(fmt(deg(S.th), 0) + '°', cx, cy + 24 * u);
  ctx.textAlign = 'right';
  ctx.font = mono(11, 600);
  ctx.fillStyle = zoneCol;
  ctx.fillText('BP ' + Math.round(deg(bp)) + '°', cx + R + 4 * u, cy + 22 * u);

  const bw = 92 * u,
    lab = 62 * u,
    rowH = 17 * u;
  const pw = lab + bw + 22 * u,
    ph = rowH * 3 + 12 * u;
  const lx = LANDPADS.matches && padsEl.classList.contains('on') ? (w - pw) / 2 : 10;
  const py = h - ph - 10;
  panel(lx, py, pw, ph);
  const bar = (i, val, col, text) => {
    const y = py + 8 * u + i * rowH;
    ctx.fillStyle = COL.muted;
    ctx.font = mono(10);
    ctx.textAlign = 'left';
    ctx.fillText(text, lx + 10 * u, y + 9 * u);
    ctx.fillStyle = COL.rule;
    ctx.fillRect(lx + lab + 10 * u, y + 2 * u, bw, 8 * u);
    ctx.fillStyle = col;
    if (val === null) {
      ctx.fillRect(lx + lab + 10 * u + bw / 2 - 1, y, 2, 12 * u);
      ctx.fillStyle = COL.spd;
      ctx.fillRect(lx + lab + 10 * u + bw / 2 + (S.s * bw) / 2 - 4 * u, y - 1 * u, 8 * u, 14 * u);
    } else ctx.fillRect(lx + lab + 10 * u, y + 2 * u, bw * val, 8 * u);
  };
  bar(0, S.thrCmd, COL.gas, 'GAZ');
  bar(1, S.brk, COL.rear, 'HAMULEC');
  bar(2, null, COL.dim, 'CIAŁO');

  if (paused && phase === 'ride') {
    ctx.fillStyle = 'rgba(12,14,16,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COL.chalk;
    ctx.textAlign = 'center';
    ctx.font = disp(30);
    ctx.fillText('Pauza', w / 2, h / 2);
    ctx.font = mono(13);
    ctx.fillText(COARSE.matches ? 'dotknij przycisku, aby jechać dalej' : 'P: dalej', w / 2, h / 2 + 26 * u);
  }
}
