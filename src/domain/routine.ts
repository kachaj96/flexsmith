import { exerciseById } from '../content/exercises';
import type { RoutineTemplate } from '../content/types';
import type { CustomRoutine, RoutineStep } from './types';

/* Editing a custom routine: pure functions returning a new routine. Steps are addressed by their stable id, never by position. */
let seq = 0;
export const newId = (prefix: string, now = Date.now()): string => `${prefix}${now.toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const MAX_STEPS = 40;
const touch = (r: CustomRoutine, steps: RoutineStep[], now: number): CustomRoutine => ({ ...r, steps, updatedAt: now });

export const createRoutine = (name: string, now = Date.now()): CustomRoutine => ({ id: newId('r', now), name: name.trim() || 'Sesja', steps: [], createdAt: now, updatedAt: now, deletedAt: null });
export function fromTemplate(t: RoutineTemplate, name: string, now = Date.now()): CustomRoutine {
  const r = createRoutine(name, now); r.basedOn = t.id;
  r.steps = t.steps.filter(s => exerciseById(s.ex)).map(s => ({ id: newId('s', now), ex: s.ex, ...(s.dur !== undefined ? { dur: s.dur } : {}), ...(s.sides !== undefined ? { sides: s.sides } : {}) }));
  return r;
}
export const rename = (r: CustomRoutine, name: string, now = Date.now()): CustomRoutine => ({ ...r, name: name.trim().slice(0, 60) || r.name, updatedAt: now });
export function addStep(r: CustomRoutine, ex: string, now = Date.now()): CustomRoutine {
  if (!exerciseById(ex) || r.steps.length >= MAX_STEPS) return r;
  return touch(r, [...r.steps, { id: newId('s', now), ex }], now);
}
export const removeStep = (r: CustomRoutine, stepId: string, now = Date.now()): CustomRoutine => touch(r, r.steps.filter(s => s.id !== stepId), now);
export function moveStep(r: CustomRoutine, stepId: string, delta: number, now = Date.now()): CustomRoutine {
  const i = r.steps.findIndex(s => s.id === stepId); const j = i + delta; if (i < 0 || j < 0 || j >= r.steps.length) return r;
  const a = [...r.steps]; const [m] = a.splice(i, 1); a.splice(j, 0, m!); return touch(r, a, now);
}
export function setStepDuration(r: CustomRoutine, stepId: string, dur: number, now = Date.now()): CustomRoutine {
  return touch(r, r.steps.map(s => { if (s.id !== stepId) return s; const e = exerciseById(s.ex); if (!e) return s; const max = e.mode === 'time' ? 300 : 40; const min = e.mode === 'time' ? 5 : 1; return { ...s, dur: Math.max(min, Math.min(max, Math.round(dur))) }; }), now);
}
export const setStepSides = (r: CustomRoutine, stepId: string, sides: boolean, now = Date.now()): CustomRoutine => touch(r, r.steps.map(s => (s.id === stepId ? { ...s, sides } : s)), now);
export function duplicate(r: CustomRoutine, name: string, now = Date.now()): CustomRoutine {
  const c = createRoutine(name, now); c.basedOn = r.basedOn; c.steps = r.steps.map(s => ({ ...s, id: newId('s', now) })); return c;
}
export const softDelete = (r: CustomRoutine, now = Date.now()): CustomRoutine => ({ ...r, deletedAt: now, updatedAt: now });
export const restoreRoutine = (r: CustomRoutine, now = Date.now()): CustomRoutine => ({ ...r, deletedAt: null, updatedAt: now });
/** References that no longer point at an exercise (content removed in a later version). They are dropped on load, never rendered. */
export const danglingSteps = (r: CustomRoutine): RoutineStep[] => r.steps.filter(s => !exerciseById(s.ex));
export const withoutDangling = (r: CustomRoutine): CustomRoutine => (danglingSteps(r).length ? { ...r, steps: r.steps.filter(s => exerciseById(s.ex)) } : r);
