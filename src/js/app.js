// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Interface state, settings, colours and fonts taken from the stylesheet, and the link to SimGP8.

const $ = (id) => document.getElementById(id);
const deg = (r) => (r * 180) / Math.PI;
const fmt = (n, d = 1) => n.toFixed(d).replace('.', DECIMAL).replace('-', '−');
const pct = (t) => Math.round(t * 100) + '%';
const store = {
  get(k, def) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};

const rootStyle = getComputedStyle(document.documentElement);
const cssVar = (n) => rootStyle.getPropertyValue('--' + n).trim();
const COL = {};
['chalk', 'muted', 'dim', 'rule', 'panel', 'asphalt', 'ok', 'warn', 'rear', 'gas', 'spd'].forEach(
  (k) => (COL[k] = cssVar(k)),
);
const FONT_MONO = cssVar('f-mono') || 'monospace';
const FONT_DISPLAY = cssVar('f-display') || 'sans-serif';
/** A stylesheet colour (#rrggbb) with transparency. */
function alpha(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)');
const LANDPADS = matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 540px)');
const TEMPOS = [1, 0.75, 0.5, 0.35];
const cfg = Object.assign(
  { bike: 'ebike', tempo: 0.5, cog: true, trend: true, sound: false },
  store.get('simwheelie-cfg', {}),
);
if (!BIKES.some((b) => b.id === cfg.bike)) cfg.bike = 'ebike';
if (!TEMPOS.includes(cfg.tempo)) cfg.tempo = 0.5;
cfg.sound = false;
const best = store.get('simwheelie-best', {});
const bestKey = () => bike.id + '@' + cfg.tempo;
const saveCfg = () => store.set('simwheelie-cfg', { bike: cfg.bike, tempo: cfg.tempo, cog: cfg.cog, trend: cfg.trend });

const road = makeRoad(8);
let bike = BIKES.find((b) => b.id === cfg.bike);
let S = newState();
let phase = 'ready';
let paused = false;
let trace = [];
let traceT = 0;
let crash = null;
let shake = 0;
let flash = 0;
let parts = [];
const keys = { gas: 0, brake: 0, back: 0, fwd: 0 };
const pads = { gas: 0, brake: 0, back: 0, fwd: 0 };

// The scene is redrawn only while something moves; anything else that changes it calls invalidate().
let sceneDirty = true;
let teleDirty = true;
function invalidate() {
  sceneDirty = true;
  teleDirty = true;
}

// On secpro.pl the games live under the same key, /simwheelie/<key>/, /simgp8/<key>/ and
// /simtrackstand/<key>/, with the English editions in en/ below them. Elsewhere the other language is
// the file next to this one, as in dist/; where there is none, the language link is hidden.
const secpro = /^(.*)\/simwheelie\/([0-9a-f]{32})\//i.exec(location.pathname);
if (secpro) {
  const [, root, key] = secpro;
  const en = (yes) => (yes ? 'en/' : '');
  document.querySelectorAll('a[data-sibling]').forEach((a) => {
    a.href = `${root}/${a.dataset.sibling}/${key}/${en(LANG === 'en')}`;
    a.removeAttribute('target');
    a.removeAttribute('rel');
  });
  document.querySelectorAll('a[data-lang]').forEach((a) => (a.href = `${root}/simwheelie/${key}/${en(LANG !== 'en')}`));
} else if (!/\/simwheelie-(pl|en)\.html$/.test(location.pathname)) {
  document.querySelectorAll('a[data-lang]').forEach((a) => (a.hidden = true));
}

function segmented(el, val, onPick) {
  el.querySelectorAll('button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.v === String(val)));
    b.addEventListener('click', () => {
      onPick(b.dataset.v);
      el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      b.blur();
    });
  });
}

$('bikes').innerHTML = BIKES.map((b) => `<button data-v="${b.id}">${b.short}</button>`).join('');
segmented($('bikes'), cfg.bike, (v) => {
  cfg.bike = v;
  bike = BIKES.find((b) => b.id === v);
  saveCfg();
  reset();
  bikeInfo();
});
segmented($('tempo'), cfg.tempo, (v) => {
  cfg.tempo = Number(v);
  saveCfg();
  reset();
});
$('view')
  .querySelectorAll('button')
  .forEach((b) => {
    const k = b.dataset.v;
    b.setAttribute('aria-pressed', String(!!cfg[k]));
    b.addEventListener('click', () => {
      cfg[k] = !cfg[k];
      b.setAttribute('aria-pressed', String(cfg[k]));
      if (k === 'sound') sound.toggle(cfg.sound);
      saveCfg();
      invalidate();
      b.blur();
    });
  });
