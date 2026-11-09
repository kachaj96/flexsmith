#!/usr/bin/env node
// Contrast gate for src/styles/tokens.css: computes WCAG ratios from the real values in both themes.
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const block = sel => { const m = css.match(new RegExp(`${sel.replace(/[[\]"=\-]/g, '\\$&')}[^{]*\\{([\\s\\S]*?)\\n\\}|${sel.replace(/[[\]"=\-]/g, '\\$&')}[^{]*\\{([^}]*)\\}`)); return (m && (m[1] ?? m[2])) || ''; };
const vars = text => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const light = { ...vars(block(':root,[data-smith-theme="light"]')) };
const dark = { ...light, ...vars(block('[data-smith-theme="dark"]')) };
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const L = h => { const [r, g, b] = rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// [foreground, background, minimum, what]: text 4.5, large text and graphics 3
const PAIRS = [
  ['smith-text', 'smith-bg', 4.5], ['smith-text', 'smith-surface', 4.5], ['smith-text', 'smith-surface-muted', 4.5],
  ['smith-text-secondary', 'smith-bg', 4.5], ['smith-text-secondary', 'smith-surface', 4.5], ['smith-text-secondary', 'smith-surface-muted', 4.5],
  ['smith-accent', 'smith-bg', 4.5], ['smith-accent', 'smith-surface', 4.5], ['smith-accent', 'smith-accent-soft', 4.5], ['smith-on-accent', 'smith-accent', 4.5],
  ['smith-danger', 'smith-surface', 4.5], ['smith-danger', 'smith-danger-soft', 4.5], ['smith-warning', 'smith-warning-soft', 4.5], ['smith-positive', 'smith-surface', 4.5],
  ['smith-border-strong', 'smith-bg', 3], ['smith-border-strong', 'smith-surface', 3],
  ['t-prep', 'smith-surface', 3], ['t-mob', 'smith-surface', 3], ['t-stat', 'smith-surface', 3], ['t-roll', 'smith-surface', 3],
];
let bad = 0, n = 0;
for (const [name, theme] of [['light', light], ['dark', dark]]) for (const [f, b, min] of PAIRS) {
  const fv = theme[f], bv = theme[b]; n++;
  if (!/^#/.test(fv ?? '') || !/^#/.test(bv ?? '')) { console.log(`FAIL [${name}] ${f} / ${b}: not a hex colour (${fv}, ${bv})`); bad++; continue; }
  const r = ratio(fv, bv); if (r < min) { console.log(`FAIL [${name}] ${f} on ${b}: ${r.toFixed(2)} < ${min}`); bad++; } else if (process.argv.includes('-v')) console.log(`ok   [${name}] ${f} on ${b}: ${r.toFixed(2)}`);
}
// the logo tile with its white mark is a graphic: 3:1
const tile = light.tile; if (ratio('#ffffff', tile) < 3) { console.log(`FAIL tile ${tile} with white mark`); bad++; } n++;
console.log(bad ? `${bad} contrast failure(s) of ${n}` : `contrast ok: ${n} pairs`); process.exit(bad ? 1 : 0);
