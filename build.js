#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Builds the single-file editions of the game, dist/simwheelie-<lang>.html. No dependencies.
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

// The physics runs without a browser (see test/); the interface builds on top of it.
// All files share one function scope and are concatenated in this order.
const CORE = ['core', 'bikes', 'road', 'physics'];
const UI = [
  'i18n',
  'app',
  'cards',
  'input',
  'sound',
  'canvas',
  'bikeview',
  'scene',
  'hud',
  'telemetry',
  'demo',
  'main',
];

const EDITIONS = {
  pl: {
    description:
      'SimWheelie: trening balance pointu na tylnym kole. Fizyka motocykla w przeglądarce, pięć motocykli, telemetria.',
  },
  en: {
    description:
      'SimWheelie: a wheelie balance point trainer. Motorcycle physics in the browser, five bikes, telemetry.',
  },
};

const read = (...parts) => fs.readFileSync(path.join(SRC, ...parts), 'utf8');
const scripts = (names) => names.map((name) => read('js', name + '.js').trimEnd()).join('\n\n');

/** The source text of every i18n`...` template in a script, with {} standing for each ${...}. */
function templateKeys(source) {
  const skipQuoted = (i) => {
    const quote = source[i];
    for (i++; source[i] !== quote; i++) if (source[i] === '\\') i++;
    return i + 1;
  };
  const skipExpression = (i) => {
    for (let depth = 1; depth; ) {
      const c = source[i];
      if (c === "'" || c === '"') i = skipQuoted(i);
      else if (c === '`') i = readTemplate(i + 1).end;
      else {
        if (c === '{') depth++;
        if (c === '}') depth--;
        i++;
      }
    }
    return i;
  };
  const readTemplate = (i) => {
    let raw = '';
    while (source[i] !== '`') {
      if (source[i] === '\\') {
        raw += source.slice(i, i + 2);
        i += 2;
      } else if (source.startsWith('${', i)) {
        raw += '{}';
        i = skipExpression(i + 2);
      } else raw += source[i++];
    }
    return { key: new Function('return `' + raw + '`')(), end: i + 1 };
  };
  const keys = new Set();
  for (const match of source.matchAll(/\bi18n`/g)) keys.add(readTemplate(match.index + match[0].length).key);
  return keys;
}

/** The dictionary of an edition, checked against the templates used in the scripts. */
function dictionary(lang, source = scripts([...CORE, ...UI])) {
  if (lang === 'pl') return null;
  const dict = JSON.parse(read(lang + '.json'));
  const keys = templateKeys(source);
  const missing = [...keys].filter((key) => !(key in dict));
  const unused = Object.keys(dict).filter((key) => !keys.has(key));
  const uneven = Object.keys(dict).filter((key) => key.split('{}').length !== dict[key].split('{}').length);
  for (const [problem, list] of Object.entries({ missing, unused, 'placeholder mismatch': uneven })) {
    if (list.length) throw new Error(`${lang}.json, ${problem}:\n  ` + list.join('\n  '));
  }
  return dict;
}

function bundle(lang) {
  const source = scripts([...CORE, ...UI]);
  const prelude = `const LANG = '${lang}';\nconst DICT = ${JSON.stringify(dictionary(lang, source))};`;
  return `(() => {\n'use strict';\n\n${prelude}\n\n${source}\n})();`;
}

function build(lang) {
  const parts = {
    lang,
    ...EDITIONS[lang],
    style: read('style.css').trimEnd(),
    page: read(`page.${lang}.html`).trimEnd(),
    script: bundle(lang),
  };
  const html = read('shell.html').replace(/\{\{(\w+)\}\}/g, (_, name) => parts[name]);
  const file = path.join(DIST, `simwheelie-${lang}.html`);
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(file, html);
  console.log(`${path.relative(__dirname, file)}  ${(html.length / 1024).toFixed(0)} kB`);
}

/** The physics without a browser; returns the named declarations. */
function loadCore(names) {
  return new Function(`'use strict';\n${scripts(CORE)}\nreturn { ${names.join(', ')} };`)();
}

if (require.main === module) Object.keys(EDITIONS).forEach(build);

module.exports = { SRC, EDITIONS, dictionary, loadCore };
