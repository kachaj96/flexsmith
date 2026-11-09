#!/usr/bin/env node
// Inlines the local fonts (Manrope, Inter: OFL, same files the sibling apps ship) into index.src.html -> flexsmith-prototype.html (one self-contained file).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const b64 = f => readFileSync(join(dir, 'fonts', f)).toString('base64');
const face = (fam, w, file, range) => `@font-face{font-family:'${fam}';font-style:normal;font-display:swap;font-weight:${w};src:url(data:font/woff2;base64,${b64(file)}) format('woff2');unicode-range:${range}}`;
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const css = [face('Inter Variable', '100 900', 'inter-latin-ext-wght-normal.woff2', EXT), face('Inter Variable', '100 900', 'inter-latin-wght-normal.woff2', LAT),
  face('Manrope Variable', '200 800', 'manrope-latin-ext-wght-normal.woff2', EXT), face('Manrope Variable', '200 800', 'manrope-latin-wght-normal.woff2', LAT)].join('\n');
writeFileSync(join(dir, 'flexsmith-prototype.html'), readFileSync(join(dir, 'index.src.html'), 'utf8').replace('/*FONTS*/', css));
console.log('prototype/flexsmith-prototype.html written');
