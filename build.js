#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Builds the single-file game, dist/simwheelie.html. No dependencies.
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

// The physics runs without a browser (see test/); the interface builds on top of it.
// All files share one function scope and are concatenated in this order.
const CORE = ['core', 'bikes', 'road', 'physics'];
const UI = ['app', 'cards', 'input', 'sound', 'canvas', 'bikeview', 'scene', 'hud', 'telemetry', 'demo', 'main'];

const read = (...parts) => fs.readFileSync(path.join(SRC, ...parts), 'utf8');
const scripts = (names) => names.map((name) => read('js', name + '.js').trimEnd()).join('\n\n');

function build() {
  const parts = {
    style: read('style.css').trimEnd(),
    page: read('page.html').trimEnd(),
    script: `(() => {\n'use strict';\n\n${scripts([...CORE, ...UI])}\n})();`,
  };
  const html = read('shell.html').replace(/\{\{(\w+)\}\}/g, (_, name) => parts[name]);
  const file = path.join(DIST, 'simwheelie.html');
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(file, html);
  console.log(`${path.relative(__dirname, file)}  ${(html.length / 1024).toFixed(0)} kB`);
}

/** The physics without a browser; returns the named declarations. */
function loadCore(names) {
  return new Function(`'use strict';\n${scripts(CORE)}\nreturn { ${names.join(', ')} };`)();
}

if (require.main === module) build();

module.exports = { loadCore };
