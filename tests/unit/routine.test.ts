import { describe, expect, it } from 'vitest';
import { addStep, createRoutine, danglingSteps, duplicate, fromTemplate, moveStep, removeStep, restoreRoutine, setStepDuration, setStepSides, softDelete, withoutDangling, MAX_STEPS } from '../../src/domain/routine';
import { templateById } from '../../src/content/sessions';
import { estimate } from '../../src/domain/estimate';

describe('custom routines', () => {
  it('create, add, reorder by step id, change duration, remove', () => {
    let r = createRoutine('Moja'); r = addStep(r, 'march'); r = addStep(r, 'rocks'); r = addStep(r, 'catcow');
    const [a, , c] = r.steps; r = moveStep(r, c!.id, -2); expect(r.steps.map(s => s.ex)).toEqual(['catcow', 'march', 'rocks']);
    r = setStepDuration(r, a!.id, 45); expect(r.steps.find(s => s.id === a!.id)!.dur).toBe(45);
    r = setStepDuration(r, a!.id, 9999); expect(r.steps.find(s => s.id === a!.id)!.dur).toBe(300);
    r = removeStep(r, a!.id); expect(r.steps.map(s => s.ex)).toEqual(['catcow', 'rocks']);
  });
  it('moving past either end does nothing', () => { let r = createRoutine('x'); r = addStep(r, 'march'); r = addStep(r, 'rocks'); expect(moveStep(r, r.steps[0]!.id, -1)).toBe(r); expect(moveStep(r, r.steps[1]!.id, 1)).toBe(r); });
  it('the estimate follows every edit, with the same calculation as everywhere else', () => {
    let r = createRoutine('x'); r = addStep(r, 'march'); expect(estimate(r.steps).totalSec).toBe(30);
    r = setStepDuration(r, r.steps[0]!.id, 60); expect(estimate(r.steps).totalSec).toBe(60);
    r = addStep(r, 'swingfb'); expect(estimate(r.steps).totalSec).toBe(60 + 40 + 2 * 5);
    r = setStepSides(r, r.steps[0]!.id, true); expect(estimate(r.steps).phases).toBe(4);
  });
  it('a copy of a template leaves the original untouched, and a duplicate gets new step ids', () => {
    const t = templateById('prerun')!; const before = JSON.stringify(t); const r = fromTemplate(t, 'Kopia'); expect(r.basedOn).toBe('prerun'); expect(r.steps.length).toBe(t.steps.length);
    const d = duplicate(r, 'Kopia 2'); expect(d.id).not.toBe(r.id); expect(d.steps.map(s => s.id).some(id => r.steps.some(x => x.id === id))).toBe(false); expect(JSON.stringify(t)).toBe(before);
  });
  it('unknown exercises cannot be added, and dangling references are removed on load', () => {
    const r = createRoutine('x'); expect(addStep(r, 'nope')).toBe(r);
    const bad = { ...r, steps: [{ id: 's1', ex: 'march' }, { id: 's2', ex: 'gone' }] }; expect(danglingSteps(bad).length).toBe(1); expect(withoutDangling(bad).steps.map(s => s.ex)).toEqual(['march']);
  });
  it('soft delete and restore', () => { const r = createRoutine('x'); const d = softDelete(r, 5); expect(d.deletedAt).toBe(5); expect(restoreRoutine(d).deletedAt).toBeNull(); });
  it('the number of steps is bounded', () => { let r = createRoutine('x'); for (let i = 0; i < MAX_STEPS + 5; i++) r = addStep(r, 'march'); expect(r.steps.length).toBe(MAX_STEPS); });
});
