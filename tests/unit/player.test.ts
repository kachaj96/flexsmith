import { describe, expect, it } from 'vitest';
import { adjust, back, complete, createPlayer, elapsedMs, finish, msLeft, pause, restore, resume, skip, start, swap, tick, toInstance, type Clock, type PlayerState } from '../../src/domain/player';

const at = (mono: number, wall = 1_700_000_000_000 + mono): Clock => ({ mono, wall });
const SRC = { kind: 'template' as const, id: 't' };
/* swingfb: 20 s per side (L, R), march: 30 s (one phase), rocks: 8 reps per side */
const raw = (steps = [{ ex: 'march' }, { ex: 'swingfb' }], now = at(0)) => createPlayer(SRC, 'Test', steps, now)!;
/** created and started at the same moment */
const mk = (steps = [{ ex: 'march' }, { ex: 'swingfb' }], now = at(0)) => start(raw(steps, now), now);

describe('player: a timed exercise waits for the person', () => {
  it('a new session with a timed first exercise is "ready": nothing counts until start()', () => {
    let s = raw(); expect(s.status).toBe('ready'); s = tick(s, at(60_000)); expect(s.remainingMs).toBe(30_000); expect(s.activeMs).toBe(0);
    s = start(s, at(60_000)); s = tick(s, at(65_000)); expect(s.remainingMs).toBe(25_000); expect(s.status).toBe('running');
  });
  it('when a timed exercise ends, the next one (and the second side) waits again', () => {
    let s = mk([{ ex: 'march' }, { ex: 'swingfb' }]); s = tick(s, at(30_000)); expect(s.i).toBe(1); expect(s.status).toBe('ready');
    s = tick(s, at(90_000)); expect(s.remainingMs).toBe(20_000);
    s = start(s, at(90_000)); s = tick(s, at(110_000)); expect(s.phases[s.i]!.side).toBe('R'); expect(s.status).toBe('ready');
  });
  it('a rep-based exercise has no countdown and runs at once', () => { const s = raw([{ ex: 'rocks' }]); expect(s.status).toBe('running'); });
  it('skip and back land on a waiting timed phase', () => { let s = mk(); s = skip(s, at(1000)); expect(s.status).toBe('ready'); s = back(s, at(2000)); expect(s.status).toBe('ready'); });
});

describe('player: normal flow', () => {
  it('counts down from timestamps and moves to the next phase when the time is up', () => {
    let s = mk(); expect(msLeft(s, at(0))).toBe(30000);
    s = tick(s, at(10_000)); expect(s.remainingMs).toBe(20000); expect(s.activeMs).toBe(10000);
    s = tick(s, at(30_000)); expect(s.i).toBe(1); expect(s.phases[1]).toMatchObject({ ex: 'swingfb', side: 'L' }); expect(s.results[0]!.outcome).toBe('done');
  });
  it('left then right (the right side is started by the person), then the session ends', () => {
    let s = mk([{ ex: 'swingfb' }]); s = tick(s, at(20_000)); expect(s.phases[s.i]!.side).toBe('R'); s = start(s, at(20_000)); s = tick(s, at(40_000)); expect(s.status).toBe('finished');
    expect(toInstance(s, 'x')).toMatchObject({ status: 'completed', plannedSec: 45, activeSec: 40 });
  });
  it('pause holds the value, resume continues from it', () => {
    let s = mk(); s = pause(tick(s, at(5000)), at(5000)); expect(s.status).toBe('paused');
    s = tick(s, at(60_000)); expect(s.remainingMs).toBe(25000);
    s = resume(s, at(60_000)); s = tick(s, at(65_000)); expect(s.remainingMs).toBe(20000); expect(s.activeMs).toBe(10000);
  });
  it('a rep-based phase waits for "done" and does not advance by itself', () => {
    let s = mk([{ ex: 'rocks' }]); s = tick(s, at(120_000)); expect(s.i).toBe(0); s = complete(s, at(121_000)); expect(s.i).toBe(1); expect(s.phases[1]!.side).toBe('R');
  });
  it('skip records the phase as skipped, back restarts the previous phase', () => {
    let s = mk(); s = skip(s, at(1000)); expect(s.results[0]!.outcome).toBe('skipped'); s = back(s, at(2000)); expect(s.i).toBe(0); expect(s.remainingMs).toBe(30000); expect(s.status).toBe('ready');
  });
  it('adjust changes both sides of the step and never goes below 5 s', () => {
    let s = mk([{ ex: 'swingfb' }]); s = adjust(s, 10, at(0)); expect(s.phases.map(p => p.val)).toEqual([30, 30]); expect(s.remainingMs).toBe(30000);
    s = adjust(s, -100, at(0)); expect(s.phases[0]!.val).toBe(5); expect(s.modified).toBe(true);
  });
  it('swap replaces the step on this and the following side and remembers what it replaced', () => {
    let s = mk([{ ex: 'swingfb' }]); s = swap(s, 'swinglat', at(0)); expect(s.phases.map(p => p.ex)).toEqual(['swinglat', 'swinglat']); expect(s.results[0]!.swappedFrom).toBe('swingfb');
    const inst = toInstance(finish(tick(s, at(40_000)), at(40_000)), 'i'); expect(inst.steps[0]).toMatchObject({ ex: 'swinglat', swappedFrom: 'swingfb' });
  });
  it('finishing early is recorded honestly as partial, with skipped steps and the real time', () => {
    let s = mk(); s = finish(tick(s, at(12_000)), at(12_000)); const i = toInstance(s, 'x');
    expect(i.status).toBe('partial'); expect(i.activeSec).toBe(12); expect(i.plannedSec).toBeGreaterThan(30); expect(i.steps.map(x => x.outcome)).toEqual(['skipped', 'skipped', 'skipped']);
  });
  it('finishing after the last phase is "completed" even if finish() is called', () => {
    let s = mk([{ ex: 'march' }]); s = tick(s, at(30_000)); expect(s.status).toBe('finished'); expect(toInstance(finish(s, at(31_000)), 'x').status).toBe('completed');
  });
});

describe('player: clocks, background, sleep, process death', () => {
  it('monotonic and wall clock agree: the monotonic delta is used', () => { expect(elapsedMs({ monoLast: 0, wallLast: 1000 }, { mono: 5000, wall: 6500 })).toBe(5000); });
  it('background / screen lock: the wall clock ran on while the monotonic one stopped, so the time away counts (capped to the phase)', () => {
    let s = mk(); s = tick(s, { mono: 1000, wall: s.wallLast + 20_000 }); expect(s.remainingMs).toBe(10_000);
    expect(s.activeMs).toBe(20_000);
  });
  it('a long absence advances at most ONE phase and does not credit more time than the phase had', () => {
    let s = mk(); s = tick(s, { mono: 500, wall: s.wallLast + 3_000_000 }); expect(s.i).toBe(1); expect(s.activeMs).toBe(30_000); expect(s.status).toBe('ready'); expect(s.remainingMs).toBe(20_000);
  });
  it('the date or time is set back: the monotonic clock decides, time never runs backwards', () => {
    let s = mk(); s = tick(s, { mono: 4000, wall: s.wallLast - 3_600_000 }); expect(s.remainingMs).toBe(26_000); expect(s.activeMs).toBe(4000);
  });
  it('the clock is set far forward: capped at 6 hours and at the phase, still one phase', () => {
    let s = mk(); s = tick(s, { mono: 100, wall: s.wallLast + 10 * 86_400_000 }); expect(s.i).toBe(1); expect(s.activeMs).toBe(30_000);
  });
  it('a paused session ignores the time that passes', () => {
    let s = pause(mk(), at(0)); s = tick(s, { mono: 999_999, wall: s.wallLast + 999_999 }); expect(s.activeMs).toBe(0); expect(s.remainingMs).toBe(30_000);
  });
  it('restore after the process was killed: paused, current phase restarts, the time away is not counted, and it says so', () => {
    let s = mk(); s = tick(s, at(12_000)); const saved: PlayerState = JSON.parse(JSON.stringify(s));
    const r = restore(saved, { mono: 5, wall: saved.wallLast + 7_200_000 });
    expect(r.status).toBe('ready'); expect(r.resumed).toBe(true); expect(r.remainingMs).toBe(30_000); expect(r.activeMs).toBe(12_000);
    const r2 = tick(start(r, { mono: 10, wall: saved.wallLast + 7_200_005 }), { mono: 5010, wall: saved.wallLast + 7_205_005 }); expect(r2.remainingMs).toBe(25_000);
  });
  it('a restored finished session stays finished', () => { const s = finish(mk(), at(1)); expect(restore(s, at(2)).status).toBe('finished'); });
  it('the state is plain JSON: it survives a save and load unchanged', () => { const s = tick(mk(), at(7000)); expect(JSON.parse(JSON.stringify(s))).toEqual(s); });
});

describe('player: planned vs actual duration', () => {
  it('a 5 / 10 / 20 minute pass: the actual duration is the sum of what was credited, not wall time between start and end', () => {
    let s = mk([{ ex: 'march' }, { ex: 'march' }]); s = pause(tick(s, at(10_000)), at(10_000)); void resume;
    s = tick(s, { mono: 600_000, wall: s.wallLast + 590_000 }); s = resume(s, at(600_000)); s = finish(tick(s, at(605_000)), at(605_000));
    expect(toInstance(s, 'x').activeSec).toBe(15);
  });
});
