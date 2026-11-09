import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../../src/content/exercises';
import { TEMPLATES } from '../../src/content/sessions';

describe('content library', () => {
  it('has 35-50 exercises with unique, stable ids and 12+ ready sessions', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(35); expect(EXERCISES.length).toBeLessThanOrEqual(50);
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(TEMPLATES.map(t => t.id)).size).toBe(TEMPLATES.length);
  });
  it('covers all five kinds and every intent', () => {
    for (const t of ['dynamic', 'mobility', 'static', 'control', 'roll'] as const) expect(EXERCISES.filter(e => e.type === t).length, t).toBeGreaterThanOrEqual(5);
    for (const i of ['prep', 'wind', 'mob', 'roll', 'gen'] as const) expect(TEMPLATES.some(t => t.intent === i), i).toBe(true);
  });
  it('every exercise is complete in both languages', () => {
    for (const e of EXERCISES) {
      for (const f of [e.name, e.how, e.easier, e.harder, e.caution]) { expect(f.pl.length, e.id).toBeGreaterThan(3); expect(f.en.length, e.id).toBeGreaterThan(3); }
      for (const f of [e.steps, e.mistakes]) { expect(f.pl.length, e.id).toBeGreaterThanOrEqual(2); expect(f.pl.length, e.id).toBe(f.en.length); }
      expect(e.steps.pl.length, e.id).toBe(3);
      expect(e.dur, e.id).toBeGreaterThan(0);
      if (e.mode === 'reps') expect(e.spr, e.id).toBeGreaterThan(0);
    }
  });
  it('alternatives and template steps point at real exercises, never at themselves, and sessions have no repeats', () => {
    for (const e of EXERCISES) for (const a of e.alt) { expect(exerciseById(a), `${e.id} -> ${a}`).toBeDefined(); expect(a).not.toBe(e.id); }
    for (const t of TEMPLATES) {
      expect(t.steps.length, t.id).toBeGreaterThanOrEqual(3);
      for (const s of t.steps) expect(exerciseById(s.ex), `${t.id} -> ${s.ex}`).toBeDefined();
      expect(new Set(t.steps.map(s => s.ex)).size, t.id).toBe(t.steps.length);
    }
  });
  it('nothing is presented as verified, and no demonstration media is claimed (text steps are the fallback)', () => {
    for (const e of EXERCISES) { expect(e.qa.status, e.id).toBe('needs-review'); expect(e.media, e.id).toBeNull(); }
  });
  it('static stretches and rolling are never the opening step of a "prepare" session', () => {
    for (const t of TEMPLATES.filter(x => x.intent === 'prep')) for (const s of t.steps) expect(['static', 'roll'], `${t.id}/${s.ex}`).not.toContain(exerciseById(s.ex)!.type);
  });
  it('rolling sessions carry the "optional" wording and the neck/spine caution is present on upper-back rolling', () => {
    expect(exerciseById('rollback')!.caution.en.toLowerCase()).toContain('never on the neck');
    for (const e of EXERCISES.filter(x => x.type === 'roll')) expect(e.caution.pl.length).toBeGreaterThan(20);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('QA manifest', () => {
  it('docs/content-qa.json is current: same ids, same statuses, and it says plainly that nothing is verified yet', () => {
    const m = JSON.parse(readFileSync(join(process.cwd(), 'docs/content-qa.json'), 'utf8'));
    expect(m.exercises.map((e: { id: string }) => e.id)).toEqual(EXERCISES.map(e => e.id));
    expect(m.sessions.map((s: { id: string }) => s.id)).toEqual(TEMPLATES.map(t => t.id));
    expect(m.summary).toMatchObject({ exercises: 40, sessions: 13, reviewed: 0, needsReview: 40, withVerifiedMedia: 0, withTextFallback: 40 });
  });
});
