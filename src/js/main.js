// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The run loop and start-up. Physics advances in fixed steps of DT, scaled by the tempo; the scene
// is drawn only while something moves or after invalidate().

const CRASH_TILT = 1.9; // the bike rolls over the tail up to this pitch after a loop-out [rad]
let last = performance.now();
let acc = 0;

function rollOver(dt) {
  if (S.th < CRASH_TILT) {
    S.th = Math.min(CRASH_TILT, S.th + crash.om * dt);
    crash.om = Math.max(0.6, crash.om * (1 - 2 * dt));
  }
  S.x += crash.v * dt;
  S.ra += (crash.v / bike.rr) * dt;
  crash.v = Math.max(0, crash.v - 6 * dt);
  if (crash.v > 0.5) {
    const [tx, ty] = tailPoint(bike);
    spawn('spark', S.x + tx * Math.cos(S.th) - (ty - bike.rr) * Math.sin(S.th), road.y(S.x), 2);
  }
}

function frame(now) {
  const dtReal = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dtGame = dtReal * cfg.tempo;
  const riding = phase === 'ride' && !paused;
  if (riding) {
    acc += dtGame;
    const inp = controls();
    while (acc >= DT && phase === 'ride') {
      acc -= DT;
      step(S, bike, road, inp);
      traceT += DT;
      if (traceT >= 1 / 30) {
        traceT = 0;
        recordTrace();
      }
      if (S.done) finish();
    }
    if (S.slip > 0 && Math.random() < S.slip * 0.6) spawn('smoke', S.x - 0.05, road.y(S.x), 1);
    if (S.scrape && S.v > 0.5 && Math.random() < 0.9) spawn('spark', S.x + S.tailX, road.y(S.x), 2);
  } else {
    acc = 0;
    if (phase === 'over' && crash) rollOver(dtGame);
  }
  if (!paused) stepParts(dtGame);
  sound.update(S, riding);
  const crashing = crash && (crash.v > 0 || S.th < CRASH_TILT);
  if (riding || crashing || flash > 0 || shake > 0 || (!paused && parts.length) || sceneDirty) {
    sceneDirty = false;
    drawScene(dtReal);
  }
  if (teleDirty) {
    teleDirty = false;
    drawTele();
  }
  requestAnimationFrame(frame);
}

if (document.fonts) {
  const redraw = () => {
    invalidate();
    drawBpDemo();
  };
  document.fonts.ready.then(redraw);
  document.fonts.addEventListener('loadingdone', redraw);
}
bikeInfo();
showReady();
requestAnimationFrame(frame);
