import { describe, expect, it } from 'vitest';
import { estimate, phasesOf, fmtClock, TRANSITION_SEC } from '../../src/domain/estimate';
import { templateById } from '../../src/content/sessions';

describe('time estimate', () => {
  /* worked out by hand: prerun = march 30 s (1 phase) + swingfb 20 s x2 sides + rocks 8 reps x 4 s x2 + calf raises 12 x 3 s + lunge 5 reps x 6 s x2
     work = 30 + 40 + 64 + 36 + 60 = 230 s over 8 phases, 7 transitions x 5 s = 35 s, total 265 s */
  it('the pre-run session is 4:25 and the calculation is the one shown to the user', () => {
    const e = estimate(templateById('prerun')!.steps);
    expect(e).toEqual({ phases: 8, workSec: 230, transitions: 7, transitionSec: TRANSITION_SEC, totalSec: 265 });
    expect(fmtClock(e.totalSec)).toBe('4:25');
  });
  it('a two-sided step is two phases, left then right, and overrides apply to both', () => {
    const p = phasesOf([{ ex: 'swingfb', dur: 30 }]);
    expect(p.map(x => [x.side, x.val])).toEqual([['L', 30], ['R', 30]]);
    expect(phasesOf([{ ex: 'march', sides: true }]).length).toBe(2);
  });
  it('unknown exercise ids are skipped, an empty routine is 0:00', () => {
    expect(phasesOf([{ ex: 'nope' }]).length).toBe(0);
    expect(estimate([]).totalSec).toBe(0);
  });
});
