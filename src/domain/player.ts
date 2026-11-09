import { exerciseById } from '../content/exercises';
import { phaseSec, phasesOf, estimate, type Phase, type StepLike } from './estimate';
import type { SessionInstance, SessionStepResult } from './types';

/* The guided player as pure functions of (state, now). Nothing here owns a timer: the UI calls tick() from requestAnimationFrame,
   from visibilitychange and after every action, so a missed tick only costs precision, never correctness.

   Time reconciliation (monotonic clock = performance.now, wall clock = Date.now), see elapsedMs():
     - both agree (within 2 s): use the monotonic delta;
     - the wall clock ran ahead (the device slept or the app was frozen, the monotonic clock may stop): use the wall delta, at most 6 h;
     - the wall clock went back (the date or time was changed): use the monotonic delta;
     - a gap never advances more than ONE phase: a long absence finishes the current phase, the next one starts fresh.
   A process killed by the system cannot keep counting: restore() always returns a session that restarts the current phase,
   and says so (resumed = true). Time away is not counted as exercise time.

   A timed phase never starts by itself: it enters as "ready" (nothing counts, the person reads the instruction) and runs after start().
   That holds for the first phase, for every next exercise and for the second side. Rep-based phases have no timer and run at once. */
export interface Clock { mono: number; wall: number }
export type PhaseOutcome = 'pending' | 'done' | 'skipped' | 'swapped';
export interface PhaseResult { doneMs: number; outcome: PhaseOutcome; swappedFrom?: string }
export interface PlayerState {
  v: 1;
  source: { kind: 'template' | 'custom'; id: string };
  name: string;
  phases: Phase[];
  results: PhaseResult[];
  i: number;
  status: 'ready' | 'running' | 'paused' | 'finished';
  remainingMs: number;           // time phases only
  monoLast: number; wallLast: number;
  activeMs: number;
  startedWall: number; endedWall: number | null;
  plannedSec: number;
  modified: boolean; early: boolean; resumed: boolean;
}

const AGREE_MS = 2000, MAX_GAP_MS = 6 * 3600 * 1000;
export function elapsedMs(s: Pick<PlayerState, 'monoLast' | 'wallLast'>, now: Clock): number {
  const dm = Math.max(0, now.mono - s.monoLast); const dw = now.wall - s.wallLast;
  if (dw < 0) return dm;                              // the clock was set back
  if (Math.abs(dw - dm) <= AGREE_MS) return dm;
  return dw > dm ? Math.min(dw, MAX_GAP_MS) : dm;     // slept / frozen
}
const full = (p: Phase): number => (p.mode === 'time' ? p.val * 1000 : 0);
/** The status a phase enters with: a timed phase waits for start(), a rep-based one runs. */
const entry = (p: Phase): PlayerState['status'] => (p.mode === 'time' ? 'ready' : 'running');

export function createPlayer(source: PlayerState['source'], name: string, steps: StepLike[], now: Clock): PlayerState | null {
  const phases = phasesOf(steps); if (!phases.length) return null;
  return { v: 1, source, name, phases, results: phases.map(() => ({ doneMs: 0, outcome: 'pending' as PhaseOutcome })), i: 0, status: entry(phases[0]!), remainingMs: full(phases[0]!),
    monoLast: now.mono, wallLast: now.wall, activeMs: 0, startedWall: now.wall, endedWall: null, plannedSec: estimate(steps).totalSec, modified: false, early: false, resumed: false };
}
const clone = (s: PlayerState): PlayerState => ({ ...s, phases: s.phases.map(p => ({ ...p })), results: s.results.map(r => ({ ...r })) });

function moveTo(s: PlayerState, idx: number, outcome: PhaseOutcome, now: Clock): void {
  const r = s.results[s.i]!; if (r.outcome === 'pending') r.outcome = outcome;
  if (idx >= s.phases.length) { s.status = 'finished'; s.endedWall = now.wall; s.remainingMs = 0; return; }
  s.i = Math.max(0, idx); s.remainingMs = full(s.phases[s.i]!); s.status = entry(s.phases[s.i]!);
}

/** Advance the clock. Credits time to the current phase (never more than the phase has left) and moves on when a timed phase ends. */
export function tick(state: PlayerState, now: Clock): PlayerState {
  const s = clone(state); if (s.status !== 'running') { s.monoLast = now.mono; s.wallLast = now.wall; return s; }
  const delta = elapsedMs(s, now); s.monoLast = now.mono; s.wallLast = now.wall;
  const p = s.phases[s.i]!; const r = s.results[s.i]!;
  if (p.mode === 'time') {
    const credit = Math.min(delta, Math.max(0, s.remainingMs)); r.doneMs += credit; s.activeMs += credit; s.remainingMs -= delta;
    if (s.remainingMs <= 0) moveTo(s, s.i + 1, 'done', now);
  } else {
    const cap = Math.max(phaseSec(p) * 3000, 30000); const credit = Math.min(delta, cap); r.doneMs += credit; s.activeMs += credit;
  }
  return s;
}
export function pause(state: PlayerState, now: Clock): PlayerState { const s = tick(state, now); if (s.status === 'running') s.status = 'paused'; return s; }
/** Start the countdown of a timed phase that is waiting ("ready"). */
export function start(state: PlayerState, now: Clock): PlayerState { const s = clone(state); if (s.status === 'ready' || s.status === 'paused') { s.status = 'running'; s.monoLast = now.mono; s.wallLast = now.wall; } return s; }
export function resume(state: PlayerState, now: Clock): PlayerState { const s = clone(state); if (s.status === 'paused') { s.status = 'running'; s.monoLast = now.mono; s.wallLast = now.wall; } return s; }
/** Reps phase done, or a timed phase finished by hand: counts as done. */
export function complete(state: PlayerState, now: Clock): PlayerState { const s = tick(state, now); if (s.status === 'finished') return s; moveTo(s, s.i + 1, 'done', now); return s; }
export function skip(state: PlayerState, now: Clock): PlayerState { const s = tick(state, now); if (s.status === 'finished') return s; moveTo(s, s.i + 1, 'skipped', now); return s; }
/** Back: restarts the previous phase (the one we left stays in the record as it was). */
export function back(state: PlayerState, now: Clock): PlayerState {
  const s = tick(state, now); if (s.status === 'finished') return s;
  const j = Math.max(0, s.i - 1); s.i = j; s.remainingMs = full(s.phases[j]!); s.status = entry(s.phases[j]!); s.results[j] = { doneMs: s.results[j]!.doneMs, outcome: 'pending' }; return s;
}
/** Change the length of the current step (both sides) by deltaSec (time) or by deltaSec reps; at least 5 s or 1 rep. */
export function adjust(state: PlayerState, deltaSec: number, now: Clock): PlayerState {
  const s = tick(state, now); if (s.status === 'finished') return s;
  const p = s.phases[s.i]!; const min = p.mode === 'time' ? 5 : 1; const nv = Math.max(min, p.val + deltaSec); const d = nv - p.val; if (!d) return s;
  s.phases.forEach(q => { if (q.step === p.step) q.val = nv; });
  if (p.mode === 'time') s.remainingMs = Math.max(1000, s.remainingMs + d * 1000);
  s.modified = true; return s;
}
/** Replace the current step (both sides) with another exercise. The record keeps what was swapped. */
export function swap(state: PlayerState, toId: string, now: Clock): PlayerState {
  const s = tick(state, now); if (s.status === 'finished') return s; const e = exerciseById(toId); if (!e) return s;
  const p = s.phases[s.i]!; const from = p.ex;
  s.phases = s.phases.map((q, k) => { if (q.step !== p.step) return q; const w = { ...q, ex: e.id, mode: e.mode, val: e.dur, spr: e.spr ?? 4 }; if (k < s.i) return q; return w; });
  s.results = s.results.map((r, k) => (s.phases[k]!.step === p.step && k >= s.i ? { doneMs: r.doneMs, outcome: 'pending' as PhaseOutcome, swappedFrom: from } : r));
  s.remainingMs = full(s.phases[s.i]!); s.status = entry(s.phases[s.i]!); s.modified = true; return s;
}
/** Finish now. early = the person stopped before the end: the session is recorded as partial. */
export function finish(state: PlayerState, now: Clock): PlayerState {
  const s = tick(state, now); if (s.status === 'finished') return s;
  const remaining = s.results.some((r, k) => k >= s.i && r.outcome === 'pending');
  s.early = remaining; s.status = 'finished'; s.endedWall = now.wall; s.remainingMs = 0; return s;
}
/** Back from storage after the app was closed or killed: paused, current phase restarts, nothing is counted for the time away. */
export function restore(snapshot: PlayerState, now: Clock): PlayerState {
  const s = clone(snapshot); if (s.status === 'finished') return s;
  s.status = s.phases[s.i]!.mode === 'time' ? 'ready' : 'paused'; s.monoLast = now.mono; s.wallLast = now.wall; s.resumed = true; s.remainingMs = full(s.phases[s.i]!); return s;
}
export const msLeft = (s: PlayerState, now: Clock): number => { if (s.status !== 'running') return Math.max(0, s.remainingMs); const d = elapsedMs(s, now); return Math.max(0, s.remainingMs - d); };
export const isLastPhase = (s: PlayerState): boolean => s.i >= s.phases.length - 1;

export function toInstance(state: PlayerState, id: string): SessionInstance {
  const steps: SessionStepResult[] = state.phases.map((p, k): SessionStepResult => {
    const r = state.results[k]!; const done = r.outcome === 'pending' ? 'skipped' : r.outcome;
    return { ex: p.ex, side: p.side, plannedSec: phaseSec(p), doneSec: Math.round(r.doneMs / 1000), outcome: done === 'swapped' ? 'swapped' : done, ...(r.swappedFrom ? { swappedFrom: r.swappedFrom } : {}) };
  });
  return { id, source: state.source, name: state.name, startedAt: state.startedWall, endedAt: state.endedWall ?? state.wallLast, plannedSec: state.plannedSec, activeSec: Math.round(state.activeMs / 1000),
    status: state.early ? 'partial' : 'completed', steps, checkIn: null };
}
