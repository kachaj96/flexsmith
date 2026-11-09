#!/usr/bin/env node
// Writes docs/content-qa.json: one row per exercise and per session with its review status, sources and media coverage.
// Run: node --experimental-strip-types scripts/gen-content-qa.mjs   (docs/CONTENT-QA.md explains the process; a test checks that the file is current)
import { writeFileSync } from 'node:fs';
import { EXERCISES } from '../src/content/exercises.ts';
import { TEMPLATES } from '../src/content/sessions.ts';

const rows = EXERCISES.map(e => ({ id: e.id, type: e.type, area: e.area, equip: e.equip, level: e.level, status: e.qa.status, sources: e.qa.sources, mediaAsset: e.media ? e.media.id : null, textFallback: true, note: e.qa.note }));
const out = {
  generatedFrom: 'src/content/exercises.ts',
  summary: { exercises: rows.length, sessions: TEMPLATES.length, reviewed: rows.filter(r => r.status === 'reviewed').length, needsReview: rows.filter(r => r.status === 'needs-review').length, withVerifiedMedia: rows.filter(r => r.mediaAsset).length, withTextFallback: rows.length },
  exercises: rows,
  sessions: TEMPLATES.map(t => ({ id: t.id, intent: t.intent, steps: t.steps.map(s => s.ex), status: 'needs-review' })),
};
writeFileSync(new URL('../docs/content-qa.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`docs/content-qa.json: ${rows.length} exercises, ${out.summary.needsReview} need review, ${out.summary.withVerifiedMedia} with verified media`);
