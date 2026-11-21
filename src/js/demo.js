// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The balance point diagram under the game, with the body position slider.

const demoCanvas = $('bpc');
const demoCtx = demoCanvas.getContext('2d');

function drawBpDemo() {
  const g = demoCtx;
  const { w, h } = fit(demoCanvas, g);
  g.clearRect(0, 0, w, h);
  const body = Number($('bpr').value);
  const bp = balancePoint(bike, body);
  const b = cogB(bike, body);
  const hc = bike.h - bike.rr;
  $('bpv').textContent = `BP ${Math.round(deg(bp))}° · b ${Math.round(b * 100)} cm · h − r ${Math.round(hc * 100)} cm`;
  const sc = Math.min(h / 2.05, w / 2.4);
  PX = 1 / sc;
  const gx = w * 0.4,
    gy = h - 12;
  g.strokeStyle = '#4b5158';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, gy);
  g.lineTo(w, gy);
  g.stroke();
  const ax = gx,
    ay = gy - bike.rr * sc;
  g.save();
  g.translate(ax, ay);
  g.scale(sc, -sc);
  g.rotate(bp);
  g.translate(0, -bike.rr);
  drawBike(g, bike, { fork: 1, s: body, th: bp }, 0, 0);
  g.restore();
  const cx = ax + (b * Math.cos(bp) - hc * Math.sin(bp)) * sc;
  const cy = ay - (b * Math.sin(bp) + hc * Math.cos(bp)) * sc;
  g.setLineDash([5, 5]);
  g.strokeStyle = COL.ok;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(gx, gy);
  g.stroke();
  g.setLineDash([]);
  disc(g, [ax, ay], 3, COL.chalk);
  disc(g, [cx, cy], 6, COL.chalk);
  g.fillStyle = COL.ok;
  g.font = `600 12px ${FONT_MONO}`;
  g.textAlign = 'left';
  g.fillText(Math.round(deg(bp)) + '°', ax + 34, ay - 6);
  g.strokeStyle = COL.ok;
  g.beginPath();
  g.arc(ax, ay, 28, -bp, 0);
  g.stroke();
  g.strokeStyle = alpha(COL.chalk, 0.35);
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(ax + 40, ay);
  g.stroke();
}
$('bpr').addEventListener('input', drawBpDemo);
