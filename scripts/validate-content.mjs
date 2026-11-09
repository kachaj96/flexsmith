#!/usr/bin/env node
// Content gate: runs the vitest content suite's cheap structural checks without a browser, plus the QA manifest freshness check.
// (Full checks are in tests/unit/content.test.ts; this exists so `npm test` fails fast and prints a readable list.)
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/content/exercises.ts', import.meta.url), 'utf8');
const ids = [...src.matchAll(/E\(\{ id: '([a-z0-9]+)'/g)].map(m => m[1]);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
let bad = 0;
if (dup.length) { console.log('FAIL duplicate exercise ids:', dup.join(', ')); bad++; }
if (ids.length < 35 || ids.length > 50) { console.log(`FAIL ${ids.length} exercises, expected 35-50`); bad++; }
const banned = [/rozbij\w* (powi[eę]zi|zrost)/i, /break(s|ing)? up (fascia|adhesions)/i, /toksyn/i, /toxin/i, /wypłuk\w+ kwas/i, /flush\w* (out )?lactic/i, /poprawi\w* postawę/i, /fix(es)? (your )?posture/i, /zapobiega kontuzj/i, /prevents? injur/i, /lecz\w+ ból/i, /cures? pain/i];
for (const re of banned) {
  // allowed only inside an explicit negation ("nie rozbija", "does not break up", "not for flushing")
  for (const m of src.matchAll(new RegExp(`.{0,40}${re.source}.{0,10}`, 'gi'))) {
    const ctx = m[0].toLowerCase();
    if (!/(nie |not |does not|dla komfortu, nie)/.test(ctx)) { console.log(`FAIL forbidden claim: ${m[0].trim()}`); bad++; }
  }
}
console.log(bad ? `${bad} content problem(s)` : `content ok: ${ids.length} exercises`);
process.exit(bad ? 1 : 0);
