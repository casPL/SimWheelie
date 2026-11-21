// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SRC, EDITIONS, dictionary } = require('../build.js');

test('every edition translates every interface string', () => {
  for (const lang of Object.keys(EDITIONS)) assert.doesNotThrow(() => dictionary(lang), lang);
});

test('the pages of all editions have the same markup', () => {
  const tags = (lang) =>
    fs
      .readFileSync(path.join(SRC, `page.${lang}.html`), 'utf8')
      .match(/<[^!][^>]*>/g)
      .map((tag) => tag.replace(/\s(title|aria-label|href|hreflang)="[^"]*"/g, ''));
  for (const lang of Object.keys(EDITIONS)) assert.deepEqual(tags(lang), tags('pl'), lang);
});
