// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The street seen from the side, following the bike: parallax background, road with bumps and
// distance marks, the record marker, the bike, sparks and tyre smoke, and the CoG marker.

const canvas = $('cv');
const ctx = canvas.getContext('2d');

function spawn(kind, x, y, n) {
  if (REDUCED) return;
  for (let i = 0; i < n; i++) {
    if (kind === 'smoke')
      parts.push({
        kind,
        x,
        y: y + 0.05,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.2 + Math.random() * 0.4,
        life: 1,
        r: 0.06,
      });
    else
      parts.push({
        kind,
        x,
        y,
        vx: S.v * 0.4 + (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 2.5,
        life: 0.5 + Math.random() * 0.4,
      });
  }
  if (parts.length > 220) parts.splice(0, parts.length - 220);
}

function stepParts(dt) {
  let n = 0;
  for (const p of parts) {
    if (p.kind === 'smoke') {
      p.life -= dt * 0.9;
      p.r += dt * 0.35;
      p.vy *= 0.98;
    } else {
      p.life -= dt * 1.6;
      p.vy -= 9.81 * dt;
    }
    p.x += p.vx * dt;
    p.y = Math.max(0, p.y + p.vy * dt);
    if (p.life > 0) parts[n++] = p;
  }
  parts.length = n;
}

// Sparks are stroked in a few brightness levels, one path per level.
const SPARK_LEVELS = 6;
function drawParts(toX, toY, sc, camV) {
  for (const p of parts) {
    if (p.kind !== 'smoke') continue;
    ctx.fillStyle = `rgba(190,194,198,${0.28 * p.life})`;
    ctx.beginPath();
    ctx.arc(toX(p.x), toY(p.y), p.r * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  for (let lvl = 0; lvl < SPARK_LEVELS; lvl++) {
    let any = false;
    ctx.beginPath();
    for (const p of parts) {
      if (p.kind === 'smoke' || Math.min(SPARK_LEVELS - 1, Math.floor((p.life / 0.9) * SPARK_LEVELS)) !== lvl) continue;
      ctx.moveTo(toX(p.x), toY(p.y));
      ctx.lineTo(toX(p.x - (p.vx - camV) * 0.035), toY(p.y - p.vy * 0.035));
      any = true;
    }
    if (!any) continue;
    const life = ((lvl + 0.5) / SPARK_LEVELS) * 0.9;
    ctx.strokeStyle = `rgba(255,${150 + Math.round(80 * life)},60,${Math.min(1, life * 1.3)})`;
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// Gradients depend only on the layout, so they are rebuilt only when it changes.
const gradients = { key: '', sky: null, lamp: null };
function sceneGradients(gy, top) {
  const key = gy + ' ' + top;
  if (gradients.key !== key) {
    gradients.key = key;
    gradients.sky = ctx.createLinearGradient(0, 0, 0, gy);
    gradients.sky.addColorStop(0, '#0f1319');
    gradients.sky.addColorStop(1, '#252b33');
    gradients.lamp = ctx.createLinearGradient(0, top, 0, gy);
    gradients.lamp.addColorStop(0, 'rgba(255,236,190,0.10)');
    gradients.lamp.addColorStop(1, 'rgba(255,236,190,0)');
  }
  return gradients;
}

function drawScene(dtReal) {
  const { w, h } = fit(canvas, ctx);
  const narrow = w < 560;
  const sc = Math.min(h / 3.05, w / (narrow ? 3.5 : 4.6));
  PX = 1 / sc;
  const gy = h * (narrow ? 0.83 : 0.8);
  let ox = w * (narrow ? 0.4 : 0.36);
  let oy = 0;
  if (shake > 0 && !REDUCED) {
    shake -= dtReal;
    ox += (Math.random() - 0.5) * 10 * shake;
    oy += (Math.random() - 0.5) * 10 * shake;
  }
  const camX = S.x;
  const toX = (wx) => (wx - camX) * sc + ox;
  const toY = (wy) => gy - wy * sc + oy;
  const lampTop = gy - sc * 2.3;
  const grad = sceneGradients(gy, lampTop);

  ctx.fillStyle = grad.sky;
  ctx.fillRect(0, 0, w, h);

  // Buildings, then all their windows: neither overlaps another, so two fills draw them all.
  const far = camX * sc * 0.1;
  const bw = 64;
  const first = Math.floor(far / bw) - 1;
  const last = first + Math.ceil(w / bw) + 3;
  const height = (id) => 24 + (((((id * 9301 + 49297) % 233280) + 233280) % 233280) / 233280) * 90;
  ctx.beginPath();
  for (let id = first; id < last; id++) {
    const hh = height(id);
    ctx.rect(id * bw - far, gy - sc * 0.75 - hh, bw - 8, hh + sc * 0.4);
  }
  ctx.fillStyle = '#191d23';
  ctx.fill();
  ctx.beginPath();
  for (let id = first; id < last; id++) {
    const hh = height(id);
    const bx = id * bw - far;
    const top = gy - sc * 0.75 - hh;
    for (let r = 0; r < hh / 14 - 1; r++)
      for (let c = 0; c < 4; c++)
        if (((id * 31 + r * 7 + c * 13) & 7) === 0) ctx.rect(bx + 6 + c * 12, top + 8 + r * 14, 5, 6);
  }
  ctx.fillStyle = 'rgba(242,193,78,0.16)';
  ctx.fill();

  const mid = camX * sc * 0.45;
  const pole = 26 * sc * 0.45;
  for (let i = -1; i < w / pole + 2; i++) {
    const id = Math.floor(mid / pole) + i;
    const px = id * pole - mid;
    ctx.fillStyle = grad.lamp;
    ctx.beginPath();
    ctx.moveTo(px - 4, lampTop + 6);
    ctx.lineTo(px - sc * 0.9, gy - sc * 0.4);
    ctx.lineTo(px + sc * 0.9, gy - sc * 0.4);
    ctx.lineTo(px + 4, lampTop + 6);
    ctx.fill();
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(px - 1.5, lampTop, 3, gy - lampTop - sc * 0.4);
    ctx.fillStyle = '#ffe8b8';
    ctx.fillRect(px - 7, lampTop - 2, 14, 4);
  }
  const fen = camX * sc * 0.6;
  const fy = gy - sc * 0.52;
  ctx.strokeStyle = '#2f353c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, fy);
  ctx.lineTo(w, fy);
  ctx.moveTo(0, fy + sc * 0.2);
  ctx.lineTo(w, fy + sc * 0.2);
  for (let i = -1; i < w / 34 + 2; i++) {
    const px = i * 34 - (fen % 34);
    ctx.moveTo(px, fy);
    ctx.lineTo(px, gy - sc * 0.3);
  }
  ctx.stroke();

  ctx.fillStyle = '#23272b';
  ctx.fillRect(0, gy - sc * 0.32 + oy, w, sc * 0.32);
  const x0 = camX - ox / sc - 1;
  const x1 = camX + (w - ox) / sc + 1;
  for (let m = Math.max(0, Math.ceil(x0 / 10) * 10); m < x1; m += 10) {
    const px = toX(m);
    const py = toY(0) - sc * 0.2;
    const cs = sc * 0.2;
    ctx.fillStyle = (m / 10) % 2 ? '#f0443a' : '#3d8bff';
    ctx.beginPath();
    ctx.moveTo(px - cs * 0.32, py);
    ctx.lineTo(px - cs * 0.07, py - cs);
    ctx.lineTo(px + cs * 0.07, py - cs);
    ctx.lineTo(px + cs * 0.32, py);
    ctx.fill();
    ctx.fillRect(px - cs * 0.48, py - 2, cs * 0.96, 3);
    ctx.fillStyle = 'rgba(236,232,221,0.75)';
    ctx.fillRect(px - cs * 0.2, py - cs * 0.55, cs * 0.4, cs * 0.12);
  }

  ctx.beginPath();
  ctx.moveTo(-5, h + 5);
  for (let px = -5; px <= w + 5; px += 3) ctx.lineTo(px, toY(road.y(camX + (px - ox) / sc)));
  ctx.lineTo(w + 5, h + 5);
  ctx.closePath();
  ctx.fillStyle = '#2b2f34';
  ctx.fill();
  ctx.strokeStyle = '#4b5158';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = road.first(x0); i < road.bumps.length && road.bumps[i].x <= x1; i++) {
    const b = road.bumps[i];
    ctx.fillStyle = b.h > 0 ? 'rgba(160,166,172,0.16)' : 'rgba(0,0,0,0.25)';
    ctx.fillRect(toX(b.x - 0.25), toY(0) + 1, (b.len + 0.5) * sc, sc * 0.12);
  }
  ctx.beginPath();
  for (let m = Math.floor(x0 * 2) / 2; m < x1; m += 0.5) {
    const s1 = Math.abs(Math.sin(m * 127.1) * 43758.5453) % 1;
    const s2 = Math.abs(Math.sin(m * 311.7) * 12543.1) % 1;
    ctx.rect(toX(m + s1 * 0.5), toY(0) + 4 + s2 * (h - gy - 8), 2, 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(236,232,221,0.33)';
  ctx.lineWidth = Math.max(2, sc * 0.03);
  ctx.beginPath();
  for (let m = Math.floor(x0 / 4) * 4; m < x1; m += 4) {
    ctx.moveTo(toX(m), gy + sc * 0.17 + oy);
    ctx.lineTo(toX(m + 2), gy + sc * 0.17 + oy);
  }
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(236,232,221,0.42)';
  ctx.font = `700 ${Math.round(sc * 0.13)}px ${FONT_MONO}`;
  for (let m = Math.max(50, Math.ceil(x0 / 50) * 50); m < x1; m += 50)
    ctx.fillText(m + ' m', toX(m), gy + sc * 0.38 + oy);
  if (x0 < 1) {
    ctx.fillStyle = 'rgba(236,232,221,0.75)';
    ctx.fillRect(toX(0) - 2, gy + oy, 4, sc * 0.3);
  }

  // Where the record falls: the distance still missing, counted from here.
  const rec = best[bestKey()];
  if (rec && S.lifted && phase === 'ride' && S.wDist < rec) {
    const rx = toX(S.x + rec - S.wDist);
    const top = Math.max(gy - sc * 1.9 + oy, 24 + 140 * clamp(w / 900, 0.72, 1.2));
    if (rx > -20 && rx < w + 20 && top < gy + oy) {
      ctx.strokeStyle = COL.ok;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(rx, gy + oy + sc * 0.3);
      ctx.lineTo(rx, top);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COL.ok;
      ctx.font = `600 ${Math.max(11, Math.round(sc * 0.11))}px ${FONT_MONO}`;
      ctx.fillText('rekord', rx, top - 6);
    }
  }

  const ground = toY(road.y(S.x));
  const lift = phase === 'over' && crash ? tailLift(bike, S.th) : 0;
  const zA = road.y(S.x) + bike.rr + lift;
  const axX = toX(S.x),
    axY = toY(zA);

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(
    toX(S.x + bike.L * 0.5 * Math.cos(S.th)),
    ground + 2,
    sc * bike.L * 0.62 * Math.max(0.45, Math.cos(S.th)),
    sc * 0.04,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.save();
  ctx.translate(axX, axY);
  ctx.scale(sc, -sc);
  ctx.rotate(S.th);
  ctx.translate(0, -bike.rr);
  drawBike(ctx, bike, S, S.ra, S.fa);
  ctx.restore();

  drawParts(toX, toY, sc, phase === 'ride' ? S.v : crash ? crash.v : 0);

  const bp = balancePoint(bike, S.s);
  if (cfg.cog) {
    const b = cogB(bike, S.s);
    const hc = bike.h - bike.rr;
    const gx = toX(S.x + b * Math.cos(S.th) - hc * Math.sin(S.th));
    const gyy = toY(zA + b * Math.sin(S.th) + hc * Math.cos(S.th));
    const inZone = Math.abs(S.th - bp) <= 3 * RAD;
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = alpha(COL.chalk, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gyy);
    ctx.lineTo(gx, ground);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = inZone ? COL.ok : alpha(COL.ok, 0.45);
    ctx.lineWidth = inZone ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(axX, ground);
    ctx.lineTo(axX, ground - sc * 1.25);
    ctx.stroke();
    const rr = Math.max(5, sc * 0.05);
    disc(ctx, [gx, gyy], rr, COL.chalk);
    ctx.fillStyle = COL.asphalt;
    ctx.beginPath();
    ctx.moveTo(gx, gyy);
    ctx.arc(gx, gyy, rr, 0, Math.PI / 2);
    ctx.lineTo(gx, gyy);
    ctx.arc(gx, gyy, rr, Math.PI, Math.PI * 1.5);
    ctx.fill();
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(239,83,80,${0.35 * flash})`;
    ctx.fillRect(0, 0, w, h);
    flash = Math.max(0, flash - dtReal * 2.5);
  }
  drawHud(w, h, bp, narrow);
}
