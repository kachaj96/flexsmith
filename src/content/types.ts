/* Content definitions. Exercises and sessions are data with stable ids and localized text; user data refers to them by id only. */
export type Lang = 'pl' | 'en';
export interface Loc { pl: string; en: string }
export interface LocList { pl: string[]; en: string[] }
/** The kind of movement. Never interchangeable: a static stretch is not a warm-up and rolling is optional. */
export type ExType = 'dynamic' | 'mobility' | 'static' | 'control' | 'roll';
export type Area = 'ankles' | 'calves' | 'hips' | 'glutes' | 'hams' | 'quads' | 'thoracic' | 'shoulders' | 'core' | 'wrists' | 'feet' | 'full';
export type Equip = 'none' | 'mat' | 'roller' | 'miniband' | 'longband' | 'ball';
/** A body region the user may declare as a limitation. Used only to swap or drop exercises, never to diagnose. */
export type Limit = 'knee' | 'ankle' | 'hip' | 'back' | 'shoulder' | 'wrist';
export type Level = 1 | 2 | 3;
export type ReviewStatus = 'needs-review' | 'reviewed';

export interface MediaAsset {
  id: string; kind: 'vector' | 'video'; availableOffline: boolean; license: string; attribution: string; version: number;
}
export interface Exercise {
  id: string;                       // stable and immutable
  type: ExType;
  area: Area;
  equip: Equip;
  mode: 'time' | 'reps';
  /** seconds (mode time) or repetitions (mode reps); per side when `sides` */
  dur: number;
  /** seconds per repetition, used only for the time estimate of a rep-based exercise */
  spr?: number;
  sides: boolean;
  level: Level;
  name: Loc;
  how: Loc;
  steps: LocList;
  mistakes: LocList;
  easier: Loc;
  harder: Loc;
  caution: Loc;
  /** regions where a user with a declared limitation should get an alternative */
  avoid: Limit[];
  /** ids of alternatives of the same kind, tried in this order */
  alt: string[];
  tags: string[];
  /** null until a reviewed demonstration exists; the text steps are the fallback */
  media: MediaAsset | null;
  qa: { status: ReviewStatus; sources: string[]; note: string };
}
export type Intent = 'prep' | 'wind' | 'mob' | 'roll' | 'gen';
export interface TemplateStep { ex: string; /** seconds or reps override */ dur?: number; sides?: boolean; /** dropped first when the time is short */ opt?: boolean }
/** A curated, read-only session. Users customise a copy. */
export interface RoutineTemplate { id: string; intent: Intent; name: Loc; desc: Loc; steps: TemplateStep[]; tags: string[] }
