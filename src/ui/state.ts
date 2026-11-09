import { EXERCISES } from '../content/exercises';
import { TEMPLATES } from '../content/sessions';
import type { Exercise, ExType, Intent, RoutineTemplate } from '../content/types';
import { estimate, type StepLike } from '../domain/estimate';
import type { PlayerState } from '../domain/player';
import type { CustomRoutine, Favorite, SessionInstance, UserPreferences } from '../domain/types';
import { DEFAULT_PREFS } from '../domain/types';

export type Tab = 'today' | 'sessions' | 'mine' | 'lib' | 'more';
export type Page =
  | { t: 'ex'; id: string; from: Page | null }
  | { t: 'session'; kind: 'template' | 'custom'; id: string; from: Page | null }
  | { t: 'edit'; id: string }
  | { t: 'hist' } | { t: 'about' } | { t: 'backup' } | { t: 'onboarding' };
export type Sheet =
  | { t: 'adjust' } | { t: 'confirm'; kind: 'routine'; id: string; msg: string } | { t: 'pick'; q: string }
  | { t: 'pickRoutine'; ex: string }
  | { t: 'import'; text: string; plan: import('../storage/backup').ImportPlan; summary: { r: number; h: number }; current: { r: number; h: number }; migrated: boolean; dropped: number; prefsToo: boolean };
export interface UI {
  tab: Tab; page: Page | null; sheet: Sheet | null;
  filt: { q: string; intent: 'all' | Intent };
  lib: { q: string; type: 'all' | ExType; fav: boolean };
  toast: { msg: string; undo?: () => void } | null;
  ob: { step: number; draft: UserPreferences } | null;
}
export interface Store {
  db: IDBDatabase; root: HTMLElement;
  prefs: UserPreferences; routines: CustomRoutine[]; history: SessionInstance[]; favs: Favorite[];
  /** an unfinished session found in storage at start (offered for resuming) */
  saved: PlayerState | null;
  ui: UI;
}
export const newUI = (): UI => ({ tab: 'today', page: null, sheet: null, filt: { q: '', intent: 'all' }, lib: { q: '', type: 'all', fav: false }, toast: null, ob: null });
export let store: Store = null as unknown as Store;
export const initStore = (s: Partial<Store> & Pick<Store, 'db' | 'root'>): Store => { store = { prefs: { ...DEFAULT_PREFS }, routines: [], history: [], favs: [], saved: null, ui: newUI(), ...s }; return store; };

export const liveRoutines = (): CustomRoutine[] => store.routines.filter(r => !r.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
export const routineById = (id: string): CustomRoutine | undefined => store.routines.find(r => r.id === id && !r.deletedAt);
export interface Source { kind: 'template' | 'custom'; id: string; name: string; desc: string; steps: StepLike[]; template?: RoutineTemplate; intent?: Intent }
/** The one place that turns "template or custom routine" into steps. */
export function resolveSource(kind: 'template' | 'custom', id: string, lang: 'pl' | 'en'): Source | null {
  if (kind === 'template') { const t = TEMPLATES.find(x => x.id === id); return t ? { kind, id, name: t.name[lang], desc: t.desc[lang], steps: t.steps, template: t, intent: t.intent } : null; }
  const r = routineById(id); return r ? { kind, id, name: r.name, desc: '', steps: r.steps } : null;
}
export const sessionTotal = (steps: StepLike[]): number => estimate(steps).totalSec;
export const equipOf = (steps: StepLike[]): Exercise['equip'][] => [...new Set(steps.map(s => EXERCISES.find(e => e.id === s.ex)?.equip).filter((e): e is Exercise['equip'] => !!e && e !== 'none'))];
export const isFav = (id: string): boolean => store.favs.some(f => f.id === id);
