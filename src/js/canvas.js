// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Canvas sizing and drawing primitives. The bike is drawn in metres; PX is one CSS pixel in the
// current units, so that thin lines never vanish when the view is small.

let PX = 0.01;

// Canvas sizes come from a ResizeObserver, so the animation loop never has to read the layout.
const canvasSize = new Map();
const resizeObserver =
  typeof ResizeObserver === 'function'
    ? new ResizeObserver((entries) => {
        for (const e of entries) {
          canvasSize.set(e.target, { width: e.contentRect.width, height: e.contentRect.height });
          if (e.target.id === 'bpc') drawBpDemo();
        }
        invalidate();
      })
    : null;
addEventListener('resize', () => {
  invalidate();
  drawBpDemo();
});

/** Matches the canvas backing store to its size on screen; returns the size in CSS pixels. */
function fit(c, g) {
  let r = canvasSize.get(c);
  if (!r) {
    r = c.getBoundingClientRect();
    if (resizeObserver) {
      canvasSize.set(c, { width: r.width, height: r.height });
      resizeObserver.observe(c);
    }
  }
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: r.width, h: r.height };
}

/** Middle joint of a two-segment limb from a to b with lengths l1, l2, bent to the side sign. */
function joint(a, b, l1, l2, sign) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-4);
  const t = Math.atan2(dy, dx) + sign * Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [a[0] + l1 * Math.cos(t), a[1] + l1 * Math.sin(t)];
}
const add = (p, x, y) => [p[0] + x, p[1] + y];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

function poly(g, pts, fill, stroke, lw) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.stroke();
  }
}

function line(g, a, b, col, lw) {
  g.strokeStyle = col;
  g.lineWidth = Math.max(lw, PX);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.stroke();
}

function path(g, pts, col, lw) {
  g.strokeStyle = col;
  g.lineWidth = Math.max(lw, PX);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}

function disc(g, c, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(c[0], c[1], r, 0, Math.PI * 2);
  g.fill();
}

function ring(g, c, r, col, lw, a0 = 0, a1 = Math.PI * 2) {
  g.strokeStyle = col;
  g.lineWidth = Math.max(lw, PX);
  g.beginPath();
  g.arc(c[0], c[1], r, a0, a1);
  g.stroke();
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Text of height sizeM [m] at (x, y), upright in the bike's frame whatever the transform. */
function label(g, x, y, sizeM, text, col) {
  const m = g.getTransform();
  const p = m.transformPoint(new DOMPoint(x, y));
  const k = Math.hypot(m.a, m.b);
  if (sizeM * k < 5) return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(p.x, p.y);
  g.rotate(Math.atan2(m.b, m.a));
  g.fillStyle = col;
  g.font = `700 ${sizeM * k}px ${FONT_DISPLAY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 0);
  g.restore();
}
