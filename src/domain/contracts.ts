/* v1.5 compatibility contracts. TYPES ONLY: nothing here ships as a feature in v1.0 and nothing in the app calls it.
   They fix the shape of what v1.5 will plug in (docs/ROADMAP-1.5.md), so v1.0 data does not need a second migration for it. */
import type { Area } from '../content/types';

/** Opt-in context from Runsmith / Repsmith. Broad type and body area only, never raw workout data. Absent by default. */
export interface TrainingContext {
  source: 'runsmith' | 'repsmith';
  kind: 'run' | 'strength' | 'other';
  startsAt: number;                     // epoch ms, with the time zone of the device
  status: 'planned' | 'completed';
  areas: Area[];                        // broad areas the workout loads
  /** where this came from and when it was read, shown to the user */
  provenance: { grantedAt: number; readAt: number };
}
export interface TrainingContextProvider {
  /** must resolve to an empty list when permission is missing or revoked; never throws for "no data" */
  upcoming(from: number, to: number): Promise<TrainingContext[]>;
  completed(from: number, to: number): Promise<TrainingContext[]>;
}
export interface SyncPermission { peer: 'runsmith' | 'repsmith'; scopes: ('read-upcoming' | 'read-completed')[]; grantedAt: number; revokedAt?: number }
export interface SyncAdapter { permissions(): Promise<SyncPermission[]>; grant(p: SyncPermission): Promise<void>; revoke(peer: SyncPermission['peer']): Promise<void> }

export interface ProgramWeek { week: number; sessions: { templateId: string; dayOffset: number }[] }
export interface ProgramDefinition { id: string; name: { pl: string; en: string }; weeks: ProgramWeek[]; baselineAssessments: string[] }
export interface ProgramEnrollment { id: string; programId: string; startedAt: number; completedWeeks: number[]; status: 'active' | 'paused' | 'done' }
/** A repeatable range-of-motion self-test with user-entered values and its own limits. There is deliberately no combined "mobility score". */
export interface AssessmentDefinition { id: string; name: { pl: string; en: string }; unit: 'cm' | 'deg' | 'reps' | 'sec'; instructions: { pl: string[]; en: string[] }; sides: boolean }
export interface AssessmentResult { id: string; assessmentId: string; at: number; side: 'L' | 'R' | null; value: number; note?: string }
