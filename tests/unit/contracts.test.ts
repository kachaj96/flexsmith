import { describe, expect, it } from 'vitest';
import type { AssessmentResult, ProgramEnrollment, SyncAdapter, TrainingContext, TrainingContextProvider } from '../../src/domain/contracts';

/* v1.5 contracts: a fake provider proves the "no data" behaviour the real ones must have. Nothing here is wired into the app. */
const none: TrainingContextProvider = { upcoming: async () => [], completed: async () => [] };
describe('v1.5 contracts (types only)', () => {
  it('a provider without permission resolves to an empty list, never throws', async () => { expect(await none.upcoming(0, 1)).toEqual([]); expect(await none.completed(0, 1)).toEqual([]); });
  it('context carries its provenance and broad areas only', () => {
    const c: TrainingContext = { source: 'runsmith', kind: 'run', startsAt: 1, status: 'planned', areas: ['calves', 'hips'], provenance: { grantedAt: 1, readAt: 2 } };
    expect(Object.keys(c).sort()).toEqual(['areas', 'kind', 'provenance', 'source', 'startsAt', 'status']);
  });
  it('permission can be revoked', async () => {
    const perms: Awaited<ReturnType<SyncAdapter['permissions']>> = [{ peer: 'runsmith', scopes: ['read-upcoming'], grantedAt: 1 }];
    const adapter: SyncAdapter = { permissions: async () => perms, grant: async p => { perms.push(p); }, revoke: async peer => { perms.forEach(p => { if (p.peer === peer) p.revokedAt = 9; }); } };
    await adapter.revoke('runsmith'); expect((await adapter.permissions())[0]!.revokedAt).toBe(9);
  });
  it('programs and assessments have no combined score field', () => {
    const e: ProgramEnrollment = { id: 'e', programId: 'p', startedAt: 1, completedWeeks: [], status: 'active' }; const r: AssessmentResult = { id: 'r', assessmentId: 'a', at: 1, side: 'L', value: 12 };
    expect('score' in e).toBe(false); expect('score' in r).toBe(false);
  });
});
