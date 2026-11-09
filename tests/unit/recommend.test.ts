import { describe, expect, it } from 'vitest';
import { exerciseById } from '../../src/content/exercises';
import { TEMPLATES } from '../../src/content/sessions';
import { adaptSteps, alternativesFor, recommend, trimToTime } from '../../src/domain/recommend';
import { DEFAULT_PREFS, type UserPreferences } from '../../src/domain/types';
import { estimate } from '../../src/domain/estimate';

const P = (o: Partial<UserPreferences> = {}): UserPreferences => ({ ...DEFAULT_PREFS, ...o });
const ok = (p: UserPreferences) => { const r = recommend(p); if (r.kind !== 'ok') throw new Error(`expected a recommendation, got ${r.kind}`); return r.rec; };

describe('recommender', () => {
  it('is deterministic: the same input gives the same session', () => { expect(ok(P())).toEqual(ok(P())); });
  it('honours the goal', () => { for (const g of ['prep', 'wind', 'mob', 'roll', 'gen'] as const) expect(ok(P({ goal: g, equip: ['mat', 'roller'] })).template.intent).toBe(g); });
  it('time is a hard preference: a 5 minute cap gives a session of at most 5:30 and never fewer than 3 steps', () => {
    for (const g of ['prep', 'wind', 'mob', 'gen'] as const) { const r = ok(P({ goal: g, timeMin: 5, equip: ['mat'] })); expect(r.totalSec, g).toBeLessThanOrEqual(330); expect(r.steps.length, g).toBeGreaterThanOrEqual(3); expect(r.fitsTime, g).toBe(true); }
  });
  it('a longer cap keeps more of the session', () => {
    const a = ok(P({ goal: 'prep', timeMin: 5 })), b = ok(P({ goal: 'prep', timeMin: 20, equip: ['mat'] }));
    expect(b.steps.length).toBeGreaterThanOrEqual(a.steps.length);
  });
  it('never recommends equipment the user does not have, and says what it swapped or dropped', () => {
    const r = ok(P({ goal: 'mob', equip: [], timeMin: 15 }));
    for (const s of r.steps) expect(exerciseById(s.ex)!.equip, s.ex).toBe('none');
    // a mat-only session offered to someone without a mat is adapted, and the changes are reported
    const matOnly = { id: 't', intent: 'mob' as const, name: { pl: 't', en: 't' }, desc: { pl: '', en: '' }, tags: [], steps: [{ ex: 'h9090' }, { ex: 'rocks' }, { ex: 'swingfb' }, { ex: 'catcow' }] };
    const r2 = recommend(P({ goal: 'mob', equip: [], timeMin: 15 }), [matOnly]); if (r2.kind !== 'ok') throw new Error('expected ok');
    expect(r2.rec.changes.map(c => c.kind)).toContain('swapped'); for (const s of r2.rec.steps) expect(exerciseById(s.ex)!.equip).toBe('none');
  });
  it('rolling goal with no roller finds nothing honest to offer and says so', () => {
    const r = recommend(P({ goal: 'roll', equip: ['mat'] }));
    expect(r.kind).toBe('none');
  });
  it('level new removes everything above level 1', () => { for (const g of ['prep', 'mob'] as const) for (const s of ok(P({ goal: g, level: 'new', equip: ['mat'], timeMin: 15 })).steps) expect(exerciseById(s.ex)!.level, s.ex).toBe(1); });
  it('a declared limitation removes or replaces exercises that name that region', () => {
    const r = ok(P({ goal: 'prep', limits: ['knee'], equip: ['mat'], timeMin: 15 }));
    for (const s of r.steps) expect(exerciseById(s.ex)!.avoid, s.ex).not.toContain('knee');
  });
  it('a stated focus area picks the session that covers it', () => {
    expect(ok(P({ goal: 'mob', focus: ['ankles'], equip: ['mat'], timeMin: 10 })).template.id).toBe('ankles');
    expect(ok(P({ goal: 'mob', focus: ['shoulders'], equip: ['mat'], timeMin: 10 })).template.id).toBe('shouldthor');
  });
  it('sharp or worsening pain / numbness: no session at all', () => { expect(recommend(P({ redFlag: true })).kind).toBe('redflag'); });
  it('empty filter fallback: impossible limits give a reason, not a broken session', () => {
    const r = recommend(P({ goal: 'mob', limits: ['knee', 'hip', 'ankle', 'back', 'shoulder', 'wrist'], equip: [] }));
    expect(['none']).toContain(r.kind);
  });
  it('every recommended session keeps its sides balanced (a side is never dropped alone)', () => {
    for (const g of ['prep', 'wind', 'mob', 'gen'] as const) { const r = ok(P({ goal: g, timeMin: 5, equip: ['mat'] })); const e = estimate(r.steps); expect(e.phases % 1).toBe(0); }
  });
  it('trimToTime drops optional steps first, last one first', () => {
    const t = TEMPLATES.find(x => x.id === 'prerun')!; const r = trimToTime(t.steps, 120);
    expect(r.dropped[0]).toBe('lungerot'); expect(r.dropped[1]).toBe('calfraise');
  });
  it('adaptSteps swaps to an alternative of the same kind when equipment is missing', () => {
    const a = adaptSteps([{ ex: 'h9090' }, { ex: 'march' }, { ex: 'calfraise' }], { equip: [], level: 'regular', limits: [] });
    expect(a.changes[0]).toMatchObject({ kind: 'swapped', from: 'h9090', why: 'equipment' }); expect(exerciseById((a.changes[0] as { to: string }).to)!.equip).toBe('none');
  });
  it('alternativesFor returns usable exercises of the same kind first and excludes the current one', () => {
    const alts = alternativesFor('swingfb', { equip: [], level: 'regular', limits: [] });
    expect(alts.map(a => a.id)).not.toContain('swingfb'); expect(alts[0]!.type).toBe('dynamic');
  });
});
