import { exerciseById } from '../content/exercises';
import type { Exercise } from '../content/types';

/** A step as templates, custom routines and the engine all write it. */
export interface StepLike { ex: string; dur?: number; sides?: boolean }
export interface Phase { step: number; ex: string; side: 'L' | 'R' | null; mode: 'time' | 'reps'; val: number; spr: number }
/** Seconds of rest or switching between two phases. Shown to the user in the total. */
export const TRANSITION_SEC = 5;

export const stepSides = (s: StepLike, e: Exercise): boolean => s.sides ?? e.sides;
/** Steps to phases: a two-sided step is two phases (left, right), so side balance is built in. Unknown exercise ids are skipped. */
export function phasesOf(steps: StepLike[]): Phase[] {
  const out: Phase[] = [];
  steps.forEach((s, step) => {
    const e = exerciseById(s.ex); if (!e) return;
    const val = s.dur ?? e.dur;
    for (const side of stepSides(s, e) ? (['L', 'R'] as const) : [null]) out.push({ step, ex: e.id, side, mode: e.mode, val, spr: e.spr ?? 4 });
  });
  return out;
}
export const phaseSec = (p: Phase): number => (p.mode === 'time' ? p.val : p.val * p.spr);
export interface Estimate { phases: number; workSec: number; transitions: number; transitionSec: number; totalSec: number }
/** The number shown to the user is always this one: work + (phases - 1) transitions of TRANSITION_SEC. */
export function estimate(steps: StepLike[]): Estimate {
  const ph = phasesOf(steps); const work = ph.reduce((a, p) => a + phaseSec(p), 0); const transitions = Math.max(0, ph.length - 1);
  return { phases: ph.length, workSec: work, transitions, transitionSec: TRANSITION_SEC, totalSec: work + transitions * TRANSITION_SEC };
}
export const fmtClock = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
export const minutes = (sec: number): number => Math.max(1, Math.round(sec / 60));
