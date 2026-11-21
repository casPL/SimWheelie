// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// What the physics promises the player, and recorded rides that pin it down.
// The recorded rides are compared bit for bit on the JavaScript engine that recorded them. Other
// engines differ in the last bits of some Math functions, and a minute on the balance point
// amplifies that, so there the rides only have to end the same way and agree within 3%. After a
// deliberate change to the physics, record the new rides with
//   RECORD=1 node --test

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadCore } = require('../build.js');

// prettier-ignore
const { BIKES, step, newState, makeRoad, prep, balancePoint, cogB, clamp, DT, RAD, G, AIR, ROLL, RUNUP } = loadCore([
  'BIKES', 'step', 'newState', 'makeRoad', 'prep', 'balancePoint', 'cogB', 'clamp', 'DT', 'RAD', 'G', 'AIR', 'ROLL', 'RUNUP',
]);
const flat = { y: () => 0, dy: () => 0 };
const bikeById = (id) => BIKES.find((b) => b.id === id);

/** Steps s with the same controls for up to seconds, or until the run ends or until(s) is true. */
function hold(s, bike, controls, seconds, until = () => false) {
  const end = s.t + seconds;
  while (s.t < end && !s.done && !until(s)) step(s, bike, flat, controls);
  return s;
}

/** A bike already on its back wheel at speed v [m/s], pitch th [rad] and pitch rate om [rad/s]. */
function wheelie(v, th, om = 0) {
  return Object.assign(newState(), { v, th, om, air: true, lifted: true, fork: 1 });
}

test('the balance point moves with the rider and stays below the tail', () => {
  for (const bike of BIKES) {
    const [back, middle, forward] = [-1, 0, 1].map((body) => balancePoint(bike, body));
    assert.ok(back < middle && middle < forward, bike.id);
    assert.ok(forward < prep(bike).tail, bike.id);
  }
});

test('full throttle with the body back flips every bike over the tail', () => {
  for (const bike of BIKES) assert.equal(hold(newState(), bike, { gas: 1, back: 1 }, 5).done, 'loop', bike.id);
});

test('low hops before the attempt do not end the run', () => {
  for (const bike of BIKES) {
    const s = newState();
    hold(s, bike, { gas: 1, back: 1 }, 3, (s) => s.th > 3 * RAD);
    hold(s, bike, {}, 2);
    assert.ok(s.t > 1 && s.th < RAD, bike.id + ': the front should be down again');
    assert.equal(s.lifted, false, bike.id);
    assert.equal(s.done, null, bike.id);
  }
});

test('without a wheelie the run ends after the run-up', () => {
  for (const bike of BIKES) {
    const s = newState();
    while (!s.done) step(s, bike, flat, { gas: clamp((8 - s.v) * 0.5, 0, 0.4) });
    assert.equal(s.done, 'late', bike.id);
    assert.ok(s.x >= RUNUP && s.x < RUNUP + 1, `${bike.id}: ended at ${s.x} m`);
  }
});

test('a rear brake pump lifts the front with less throttle on the light bikes', () => {
  // Rolling at 10 km/h, an optional dab of the rear brake, then steady throttle with the body back.
  const lifts = (bike, pump, gas) => {
    const s = newState();
    while (s.t < 4) step(s, bike, flat, { gas: clamp((10 / 3.6 - s.v) * 0.6 + 0.12, 0, 0.45) });
    if (pump) hold(s, bike, { brake: 1 }, pump);
    return hold(s, bike, { gas, back: 1 }, 2).lifted;
  };
  const lowestGas = (bike, pump) => {
    let lo = 0.3;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (lifts(bike, pump, mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  for (const id of ['ebike', 'pit', 'sm']) {
    const bike = bikeById(id);
    const plain = lowestGas(bike, 0);
    const pumped = lowestGas(bike, 0.15);
    assert.ok(pumped < plain - 0.01, `${id}: ${pumped} with the pump, ${plain} without`);
  }
});

test('a tail scrape neither ends the run nor adds distance', () => {
  for (const bike of BIKES) {
    const s = wheelie(5, prep(bike).tail + 0.5 * RAD);
    let scraping = 0;
    while (s.t < 0.5 && !s.done) {
      const dist = s.wDist;
      step(s, bike, flat, { gas: 0.3 });
      if (s.scrape) {
        scraping += DT;
        assert.equal(s.wDist, dist, bike.id);
      }
    }
    assert.ok(scraping > 0.05, `${bike.id}: scraped for ${scraping} s`);
    assert.equal(s.done, null, bike.id);
  }
});

test('a bike that sits on its tail ends the run', () => {
  for (const bike of BIKES) {
    const s = wheelie(0.6, prep(bike).tail + 0.3 * RAD);
    assert.equal(hold(s, bike, {}, 3).done, 'tail', bike.id);
  }
});

test('the front wheel touching down ends the attempt', () => {
  for (const bike of BIKES) assert.equal(hold(wheelie(8, 0.5, -1), bike, {}, 3).done, 'down', bike.id);
});

// A test rider who plays with the keys only. Sixty times a second it looks at the bike as it was a
// reaction time ago, picks the pitch rate that brings the front to the balance point, works out the
// drive force at the tyre that gives that rate, and taps the gas or the rear brake towards it.

/** Rides bike on road for up to seconds; returns the final state. */
function ride(bike, road, seconds, reaction = 0.1) {
  const c = prep(bike);
  const s = newState();
  const seen = [];
  const keys = { gas: 0, brake: 0, back: 0, fwd: 0 };
  let holding = false;
  let nextLook = 0;
  while (s.t < seconds && !s.done) {
    seen.push({ th: s.th, om: s.om, body: s.s, v: s.v });
    if (s.t >= nextLook) {
      nextLook += 1 / 60;
      const o = seen[Math.max(0, seen.length - 1 - Math.round(reaction / DT))];
      // Full gas with the body back until the front starts to rise, then hold it.
      holding = holding || o.th > RAD;
      if (!holding) Object.assign(keys, { gas: 1, brake: 0, back: 1 });
      else {
        keys.back = 0;
        const th = o.th + o.om * reaction;
        const rate = clamp(3 * (balancePoint(bike, o.body) - th), -0.6, 0.6);
        const b = cogB(bike, o.body);
        const px = b * Math.cos(th) - c.hc * Math.sin(th);
        const py = b * Math.sin(th) + c.hc * Math.cos(th);
        const pitch = (c.M * ((bike.k2 + px * px) * 6 * (rate - o.om) + G * px)) / (bike.rr + py);
        const force = pitch + AIR * o.v * o.v + ROLL * c.M * G;
        const pull = Math.min(bike.aMax * c.M, (bike.P * 1000) / Math.max(o.v, 1));
        const gas = force > 0 ? Math.sqrt(clamp(force / pull, 0, 1)) : 0;
        const brake = force < 0 ? clamp(-force / (bike.brk * c.M), 0, 1) : 0;
        // The rider feels the grip and the brake lever, so each key is held until they get there.
        keys.gas = s.thrCmd < gas ? 1 : 0;
        keys.brake = s.brk < brake ? 1 : 0;
      }
    }
    step(s, bike, road, keys);
  }
  return s;
}

const road = makeRoad(8);
const file = path.join(__dirname, 'runs.json');
const rides = {};
for (const bike of BIKES) {
  const s = ride(bike, road, 60);
  rides[bike.id] = { end: s.done, dist: s.wDist, time: s.wTime, bp: s.bpTime };
}
if (process.env.RECORD) fs.writeFileSync(file, JSON.stringify({ engine: process.versions.v8, rides }, null, 1) + '\n');
const recorded = JSON.parse(fs.readFileSync(file, 'utf8'));
const exact = recorded.engine === process.versions.v8;
const agree = (a, b) => (exact ? a === b : Math.abs(a - b) <= 0.03 * Math.abs(b));

test('a player who reacts in 0.1 s can hold every bike on the back wheel for a minute', () => {
  for (const [id, r] of Object.entries(rides)) {
    assert.equal(r.end, null, `${id}: ended with ${r.end} after ${r.time} s`);
    assert.ok(r.time > 59, `${id}: ${r.time} s`);
  }
});

test('the rides match the recorded ones', () => {
  assert.deepEqual(Object.keys(rides), Object.keys(recorded.rides));
  for (const [id, r] of Object.entries(recorded.rides)) {
    assert.equal(rides[id].end, r.end, id);
    for (const k of ['dist', 'time', 'bp'])
      assert.ok(agree(rides[id][k], r[k]), `${id} ${k}: ${rides[id][k]}, recorded ${r[k]}`);
  }
});
