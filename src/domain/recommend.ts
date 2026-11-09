import { EXERCISES, exerciseById } from '../content/exercises';
import { TEMPLATES } from '../content/sessions';
import type { Area, Equip, Exercise, Intent, Limit, RoutineTemplate, TemplateStep } from '../content/types';
import { estimate, type StepLike } from './estimate';
import type { Level, UserPreferences } from './types';

/* A deterministic, explainable recommender. No fatigue, readiness or physiology is invented: only what the user stated
   (goal, time, equipment, level, focus areas, declared limitations) decides. The same input always gives the same session. */
export type Change = { kind: 'swapped'; from: string; to: string; why: 'equipment' | 'level' | 'limit' } | { kind: 'dropped'; ex: string; why: 'equipment' | 'level' | 'limit' | 'time' };
export interface Recommendation {
  template: RoutineTemplate;
  steps: StepLike[];
  changes: Change[];
  totalSec: number;
  fitsTime: boolean;
  focusHits: Area[];
  /** the facts the sentence is built from, so the UI can word them in either language */
  basis: { goal: Intent; timeMin: number; equip: Equip[]; level: Level; limits: Limit[]; focus: Area[] };
}
export type RecResult = { kind: 'ok'; rec: Recommendation } | { kind: 'redflag' } | { kind: 'none'; reason: 'no-match' | 'limits' };

const LEVEL_MAX: Record<Level, number> = { new: 1, regular: 2, experienced: 3 };
const MIN_STEPS = 3;
const SLACK_SEC = 30;

const usable = (e: Exercise, equip: Set<Equip>, level: Level, limits: Set<Limit>): false | 'equipment' | 'level' | 'limit' => {
  if (e.equip !== 'none' && !equip.has(e.equip)) return 'equipment';
  if (e.level > LEVEL_MAX[level]) return 'level';
  if (e.avoid.some(l => limits.has(l))) return 'limit';
  return false;
};

/** Adapt a step list to what the user has: swap for the first suitable alternative of the same kind, otherwise drop. */
export function adaptSteps(steps: TemplateStep[], prefs: Pick<UserPreferences, 'equip' | 'level' | 'limits'>, taken = new Set<string>()): { steps: TemplateStep[]; changes: Change[] } {
  const equip = new Set<Equip>(prefs.equip); const limits = new Set<Limit>(prefs.limits);
  const used = new Set(taken); steps.forEach(s => used.add(s.ex));
  const out: TemplateStep[] = []; const changes: Change[] = [];
  for (const s of steps) {
    const e = exerciseById(s.ex); if (!e) continue;
    const why = usable(e, equip, prefs.level, limits);
    if (!why) { out.push(s); continue; }
    const alt = e.alt.map(exerciseById).find((a): a is Exercise => !!a && !used.has(a.id) && (a.type === 'roll') === (e.type === 'roll') && !usable(a, equip, prefs.level, limits));
    if (alt) { used.add(alt.id); out.push({ ex: alt.id, ...(s.opt ? { opt: true } : {}) }); changes.push({ kind: 'swapped', from: e.id, to: alt.id, why }); }
    else changes.push({ kind: 'dropped', ex: e.id, why });
  }
  return { steps: out, changes };
}
/** Drop optional steps (last first), then trailing steps, until the total fits, never below MIN_STEPS. */
export function trimToTime(steps: TemplateStep[], capSec: number): { steps: TemplateStep[]; dropped: string[]; fits: boolean } {
  const cur = [...steps]; const dropped: string[] = [];
  const fits = () => estimate(cur).totalSec <= capSec + SLACK_SEC;
  while (!fits() && cur.length > MIN_STEPS) {
    let i = -1; for (let k = cur.length - 1; k >= 0; k--) if (cur[k]!.opt) { i = k; break; }
    if (i < 0) i = cur.length - 1;
    dropped.push(cur[i]!.ex); cur.splice(i, 1);
  }
  return { steps: cur, dropped, fits: fits() };
}

export function recommend(prefs: UserPreferences, templates: RoutineTemplate[] = TEMPLATES): RecResult {
  if (prefs.redFlag) return { kind: 'redflag' };
  const cap = prefs.timeMin * 60;
  const inGoal = templates.filter(t => t.intent === prefs.goal);
  if (!inGoal.length) return { kind: 'none', reason: 'no-match' };
  const basis = { goal: prefs.goal, timeMin: prefs.timeMin, equip: prefs.equip, level: prefs.level, limits: prefs.limits, focus: prefs.focus };
  const cands: { rec: Recommendation; score: number }[] = [];
  for (const t of inGoal) {
    const a = adaptSteps(t.steps, prefs);
    if (a.steps.length < MIN_STEPS) continue;
    const tr = trimToTime(a.steps, cap);
    const changes: Change[] = [...a.changes, ...tr.dropped.map((ex): Change => ({ kind: 'dropped', ex, why: 'time' }))];
    const areas = new Set(tr.steps.map(s => exerciseById(s.ex)!.area));
    const focusHits = prefs.focus.filter(f => areas.has(f));
    const total = estimate(tr.steps).totalSec;
    // the time cap is a hard preference: a session that does not fit never beats one that does
    const score = (tr.fits ? 100 : 0) + focusHits.length * 6 + (1 - Math.min(1, Math.abs(cap - total) / cap)) * 4 - changes.length * 1.5;
    cands.push({ score, rec: { template: t, steps: tr.steps.map(({ ex, dur, sides }) => ({ ex, ...(dur !== undefined ? { dur } : {}), ...(sides !== undefined ? { sides } : {}) })), changes, totalSec: total, fitsTime: tr.fits, focusHits, basis } });
  }
  if (!cands.length) return { kind: 'none', reason: prefs.limits.length ? 'limits' : 'no-match' };
  cands.sort((x, y) => y.score - x.score || x.rec.template.id.localeCompare(y.rec.template.id));
  return { kind: 'ok', rec: cands[0]!.rec };
}

/** Swap candidates for a step during a session: same kind first, then the same area, never what is already unusable. */
export function alternativesFor(exId: string, prefs: Pick<UserPreferences, 'equip' | 'level' | 'limits'>, exclude: string[] = []): Exercise[] {
  const e = exerciseById(exId); if (!e) return [];
  const equip = new Set<Equip>(prefs.equip); const limits = new Set<Limit>(prefs.limits);
  const ok = (x: Exercise) => x.id !== e.id && !exclude.includes(x.id) && !usable(x, equip, prefs.level, limits);
  const declared = e.alt.map(exerciseById).filter((x): x is Exercise => !!x && ok(x));
  const same = EXERCISES.filter(x => ok(x) && x.type === e.type && x.area === e.area && !declared.includes(x));
  const kind = EXERCISES.filter(x => ok(x) && x.type === e.type && !declared.includes(x) && !same.includes(x));
  return [...declared, ...same, ...kind];
}
