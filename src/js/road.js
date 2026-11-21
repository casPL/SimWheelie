// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The road: flat asphalt with a seeded sequence of bumps and dips that grow over the first 600 m.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRoad(seed) {
  const r = rng(seed);
  const bumps = [];
  let x = 70;
  while (x < 6000) {
    const k = Math.min(1, x / 600);
    const hgt = 0.015 + r() * (0.02 + 0.03 * k);
    const len = 0.5 + r() * 0.7;
    bumps.push({ x, len, h: r() < 0.25 ? -hgt * 0.7 : hgt });
    x += 14 + r() * (34 - 18 * k);
  }
  function find(px) {
    let lo = 0,
      hi = bumps.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const b = bumps[mid];
      if (px < b.x) hi = mid - 1;
      else if (px > b.x + b.len) lo = mid + 1;
      else return b;
    }
    return null;
  }
  /** Index of the first bump that ends at or after px. */
  function first(px) {
    let lo = 0,
      hi = bumps.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (bumps[mid].x + bumps[mid].len < px) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  return {
    bumps,
    first,
    y(px) {
      const b = find(px);
      return b ? b.h * 0.5 * (1 - Math.cos((2 * Math.PI * (px - b.x)) / b.len)) : 0;
    },
    dy(px) {
      const b = find(px);
      return b ? ((b.h * Math.PI) / b.len) * Math.sin((2 * Math.PI * (px - b.x)) / b.len) : 0;
    },
  };
}
