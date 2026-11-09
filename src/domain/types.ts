import type { Area, Equip, Intent, Lang, Limit } from '../content/types';

/** Bump with a migration in storage/backup.ts. */
export const SCHEMA = 1;
export type Level = 'new' | 'regular' | 'experienced';
export type Theme = 'system' | 'light' | 'dark';

export interface UserPreferences {
  onboarded: boolean;
  goal: Intent;
  timeMin: number;
  equip: Equip[];                 // 'none' is always available and is not stored
  level: Level;
  focus: Area[];
  limits: Limit[];                // user-declared, only used to swap or drop exercises
  redFlag: boolean;               // the user reports sharp, worsening pain or numbness: no session is recommended
  lang: Lang;
  theme: Theme;
  motion: 'system' | 'off';
  sound: boolean;
  haptic: boolean;
}
export const DEFAULT_PREFS: UserPreferences = { onboarded: false, goal: 'prep', timeMin: 10, equip: ['mat'], level: 'regular', focus: [], limits: [], redFlag: false, lang: 'pl', theme: 'system', motion: 'system', sound: false, haptic: false };

/** A step of a user's own routine. The step id is stable, so reordering never breaks references. */
export interface RoutineStep { id: string; ex: string; /** seconds or reps override */ dur?: number; sides?: boolean }
export interface CustomRoutine { id: string; name: string; steps: RoutineStep[]; basedOn?: string; createdAt: number; updatedAt: number; deletedAt?: number | null }
export interface Favorite { id: string; at: number }

export type StepOutcome = 'done' | 'skipped' | 'swapped';
export interface SessionStepResult { ex: string; side: 'L' | 'R' | null; plannedSec: number; doneSec: number; outcome: StepOutcome; swappedFrom?: string }
export interface SessionCheckIn { comfort: 'ok' | 'strong' | 'discomfort' | null; note: string; modified: boolean }
/** One performed session. A snapshot: it never depends on the routine that produced it still existing. */
export interface SessionInstance {
  id: string; source: { kind: 'template' | 'custom'; id: string }; name: string; startedAt: number; endedAt: number;
  plannedSec: number; activeSec: number; status: 'completed' | 'partial'; steps: SessionStepResult[]; checkIn: SessionCheckIn | null;
}
