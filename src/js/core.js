// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Constants of the model. SI units throughout; the bike is seen from its right side, x forward,
// z up, and the pitch angle th grows as the front wheel rises.

const G = 9.81;
const RIDER = 80; // rider mass [kg]
const AIR = 0.36; // aerodynamic drag, F = AIR·v² [N]
const ROLL = 0.012; // rolling resistance coefficient
const DT = 1 / 240; // physics time step [s]
const SUS_W = 2 * Math.PI * 2.2; // rear suspension over bumps: natural frequency [rad/s]
const SUS_Z = 0.45; // and damping ratio
const BODY_W = 9; // rider sliding on the seat: natural frequency [rad/s], critically damped
const FORK_ZC = 0.3; // fork damping ratio in compression
const FORK_ZR = 0.25; // and in rebound
const LIFT_DEG = 20; // an attempt counts once the bike pitches up past this [°]
const RUNUP = 150; // run-up allowed before the front has to come up [m]
const TAIL_MU = 0.45; // friction of the tail scraping the asphalt

const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Moves cur towards target at the rate up when rising and down when falling [1/s]. */
function approach(cur, target, up, down, dt) {
  return target > cur ? Math.min(target, cur + up * dt) : Math.max(target, cur - down * dt);
}
