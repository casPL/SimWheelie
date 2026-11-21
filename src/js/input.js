// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Keyboard and the touch pads. Both feed the same controls; the stronger of the two wins.

// prettier-ignore
const KEYMAP = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'back', KeyA: 'back', ArrowRight: 'fwd', KeyD: 'fwd' };

function setPaused(on) {
  if (paused === on) return;
  paused = on;
  invalidate();
}

addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const k = KEYMAP[e.code];
  if (k) {
    keys[k] = 1;
    e.preventDefault();
    return;
  }
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (phase !== 'ride' && !e.repeat) start();
  } else if (e.code === 'KeyP' && phase === 'ride') {
    setPaused(!paused);
  }
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) keys[k] = 0;
});
addEventListener('blur', () => {
  Object.keys(keys).forEach((k) => (keys[k] = 0));
  Object.keys(pads).forEach((k) => (pads[k] = 0));
  document.querySelectorAll('.pad.on').forEach((p) => p.classList.remove('on'));
  if (phase === 'ride') setPaused(true);
});

const padsEl = $('pads');
if (COARSE.matches) padsEl.classList.add('on');
// On a phone a long press selects text or opens a menu, and the browser then cancels the touch, so
// a pad held for a while would let go. Nothing in the game area has a long-press action of its own.
padsEl.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
$('play').addEventListener('contextmenu', (e) => e.preventDefault());
padsEl.querySelectorAll('.pad').forEach((p) => {
  const k = p.dataset.k;
  const down = (e) => {
    e.preventDefault();
    getSelection()?.removeAllRanges();
    try {
      p.setPointerCapture(e.pointerId);
    } catch (err) {}
    pads[k] = 1;
    p.classList.add('on');
    if (k === 'gas' && phase !== 'ride') start();
    setPaused(false);
  };
  const up = () => {
    pads[k] = 0;
    p.classList.remove('on');
  };
  p.addEventListener('pointerdown', down);
  p.addEventListener('pointerup', up);
  p.addEventListener('pointercancel', up);
  p.addEventListener('lostpointercapture', up);
});

/** The controls as the physics sees them. */
function controls() {
  return {
    gas: Math.max(keys.gas, pads.gas),
    brake: Math.max(keys.brake, pads.brake),
    back: Math.max(keys.back, pads.back),
    fwd: Math.max(keys.fwd, pads.fwd),
  };
}
