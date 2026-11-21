// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Interface language. Polish is the source language: user-visible strings stay in the code as
// templates tagged with i18n. For another edition the build defines DICT, which maps every Polish
// template (with {} standing for each placeholder) to its translation; LANG is the edition's language.

const DECIMAL = LANG === 'pl' ? ',' : '.';

const translated = new WeakMap();

function i18n(strings, ...values) {
  let parts = translated.get(strings);
  if (!parts) {
    const source = strings.join('{}');
    parts = (DICT?.[source] ?? source).split('{}');
    translated.set(strings, parts);
  }
  let text = parts[0];
  for (let i = 1; i < parts.length; i++) text += values[i - 1] + parts[i];
  return text;
}
