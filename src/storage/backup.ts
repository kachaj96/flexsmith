import { exerciseById } from '../content/exercises';
import { DEFAULT_PREFS, SCHEMA, type CustomRoutine, type Favorite, type SessionInstance, type UserPreferences } from '../domain/types';
import { loadFavorites, loadHistory, loadPrefs, loadRoutines, replaceStores } from './db';

/* Backup file: { app: "flexsmith", schema, exportedAt, data: { prefs, routines, history, favorites } }.
   Import validates everything first, tells the person what would change, and applies it in one transaction (all or nothing). */
export const BACKUP_APP = 'flexsmith';
export interface BackupData { prefs: UserPreferences; routines: CustomRoutine[]; history: SessionInstance[]; favorites: Favorite[] }
export interface BackupFile { app: 'flexsmith'; schema: number; exportedAt: string; data: BackupData }
export type BackupError = 'not-json' | 'not-object' | 'wrong-app' | 'newer-schema' | 'bad-schema' | 'no-data';
export interface Validated { data: BackupData; warnings: { droppedRoutines: number; droppedHistory: number; droppedSteps: number; droppedFavorites: number }; migrated: boolean }
export type ValidateResult = { ok: true; value: Validated } | { ok: false; error: BackupError };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown): x is string => typeof x === 'string';
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export async function exportBackup(db: IDBDatabase, now = new Date()): Promise<BackupFile> {
  const routines = (await loadRoutines(db)).filter(r => !r.deletedAt);
  return { app: BACKUP_APP, schema: SCHEMA, exportedAt: now.toISOString(), data: { prefs: await loadPrefs(db), routines, history: await loadHistory(db), favorites: await loadFavorites(db) } };
}

/** The format the interactive prototype exported (data.hist, data.favs, routines with `n`). Converted so that file is not lost. */
function fromPrototype(d: Record<string, unknown>): Record<string, unknown> {
  const now = Date.now();
  const routines = (Array.isArray(d.routines) ? d.routines : []).filter(isObj).map((r, i) => ({ id: str(r.id) ? r.id : `r${i}`, name: str(r.n) ? r.n : 'Sesja', steps: (Array.isArray(r.steps) ? r.steps : []).filter(isObj).map((s, k) => ({ id: `s${i}_${k}`, ex: s.ex, ...(num(s.dur) ? { dur: s.dur } : {}) })), createdAt: now, updatedAt: now, deletedAt: null }));
  const history = (Array.isArray(d.hist) ? d.hist : []).filter(isObj).map((h, i) => ({ id: str(h.id) ? h.id : `h${i}`, source: { kind: 'template', id: str(h.sid) ? h.sid : 'unknown' }, name: str(h.name) ? h.name : 'Sesja', startedAt: num(h.at) ? h.at : now, endedAt: num(h.at) ? h.at + (num(h.actual) ? h.actual * 1000 : 0) : now,
    plannedSec: num(h.planned) ? h.planned : 0, activeSec: num(h.actual) ? h.actual : 0, status: h.done ? 'completed' : 'partial', steps: [], checkIn: { comfort: h.comfort === 'ok' ? 'ok' : h.comfort === 'mid' ? 'strong' : h.comfort === 'bad' ? 'discomfort' : null, note: str(h.note) ? h.note : '', modified: !!h.modified } }));
  const favorites = (Array.isArray(d.favs) ? d.favs : []).filter(str).map(id => ({ id, at: now }));
  const prefs = { lang: d.lang === 'en' ? 'en' : 'pl', theme: ['light', 'dark'].includes(String(d.theme)) ? d.theme : 'system', motion: d.motion === 'off' ? 'off' : 'system', sound: !!d.sound, haptic: !!d.haptic };
  return { prefs, routines, history, favorites };
}

function cleanPrefs(x: unknown): UserPreferences {
  const p: Record<string, unknown> = isObj(x) ? x : {}; const d = DEFAULT_PREFS;
  const pick = <T extends string>(v: unknown, all: readonly T[], def: T): T => (all.includes(v as T) ? (v as T) : def);
  return {
    onboarded: typeof p.onboarded === 'boolean' ? p.onboarded : d.onboarded,
    goal: pick(p.goal, ['prep', 'wind', 'mob', 'roll', 'gen'] as const, d.goal),
    timeMin: num(p.timeMin) ? Math.max(1, Math.min(120, Math.round(p.timeMin))) : d.timeMin,
    equip: (Array.isArray(p.equip) ? p.equip : d.equip).filter((e): e is UserPreferences['equip'][number] => ['mat', 'roller', 'miniband', 'longband', 'ball'].includes(String(e))),
    level: pick(p.level, ['new', 'regular', 'experienced'] as const, d.level),
    focus: (Array.isArray(p.focus) ? p.focus : []).filter((a): a is UserPreferences['focus'][number] => ['ankles', 'calves', 'hips', 'glutes', 'hams', 'quads', 'thoracic', 'shoulders', 'core', 'wrists', 'feet', 'full'].includes(String(a))),
    limits: (Array.isArray(p.limits) ? p.limits : []).filter((a): a is UserPreferences['limits'][number] => ['knee', 'ankle', 'hip', 'back', 'shoulder', 'wrist'].includes(String(a))),
    redFlag: typeof p.redFlag === 'boolean' ? p.redFlag : false,
    lang: pick(p.lang, ['pl', 'en'] as const, d.lang), theme: pick(p.theme, ['system', 'light', 'dark'] as const, d.theme), motion: pick(p.motion, ['system', 'off'] as const, d.motion),
    sound: typeof p.sound === 'boolean' ? p.sound : false, haptic: typeof p.haptic === 'boolean' ? p.haptic : false,
  };
}

/** Parse and validate. Never throws. Entries that are malformed are dropped and counted, steps that point at unknown exercises are dropped and counted. */
export function validateBackup(text: string): ValidateResult {
  let raw: unknown; try { raw = JSON.parse(text); } catch { return { ok: false, error: 'not-json' }; }
  if (!isObj(raw)) return { ok: false, error: 'not-object' };
  if (raw.app !== BACKUP_APP) return { ok: false, error: 'wrong-app' };
  if (!num(raw.schema) || raw.schema < 0 || !Number.isInteger(raw.schema)) return { ok: false, error: 'bad-schema' };
  if (raw.schema > SCHEMA) return { ok: false, error: 'newer-schema' };
  if (!isObj(raw.data)) return { ok: false, error: 'no-data' };
  let d: Record<string, unknown> = raw.data; let migrated = false;
  if ('hist' in d || 'favs' in d) { d = fromPrototype(d); migrated = true; }
  const w = { droppedRoutines: 0, droppedHistory: 0, droppedSteps: 0, droppedFavorites: 0 };
  const routines: CustomRoutine[] = [];
  for (const r of Array.isArray(d.routines) ? d.routines : []) {
    if (!isObj(r) || !str(r.id) || !str(r.name) || !Array.isArray(r.steps)) { w.droppedRoutines++; continue; }
    const steps: CustomRoutine['steps'] = [];
    r.steps.forEach((s, k) => {
      if (!isObj(s) || !str(s.ex) || !exerciseById(s.ex)) { w.droppedSteps++; return; }
      steps.push({ id: str(s.id) ? s.id : `s${k}`, ex: s.ex, ...(num(s.dur) ? { dur: s.dur } : {}), ...(typeof s.sides === 'boolean' ? { sides: s.sides } : {}) });
    });
    routines.push({ id: r.id, name: r.name.slice(0, 60), steps, ...(str(r.basedOn) ? { basedOn: r.basedOn } : {}), createdAt: num(r.createdAt) ? r.createdAt : Date.now(), updatedAt: num(r.updatedAt) ? r.updatedAt : Date.now(), deletedAt: null });
  }
  const history: SessionInstance[] = [];
  for (const h of Array.isArray(d.history) ? d.history : []) {
    if (!isObj(h) || !str(h.id) || !str(h.name) || !num(h.startedAt) || !num(h.activeSec) || !num(h.plannedSec) || (h.status !== 'completed' && h.status !== 'partial') || !isObj(h.source)) { w.droppedHistory++; continue; }
    const chk = h.checkIn; const ci = isObj(chk) ? { comfort: (['ok', 'strong', 'discomfort'] as const).find(c => c === chk.comfort) ?? null, note: str(chk.note) ? chk.note.slice(0, 500) : '', modified: !!chk.modified } : null;
    const steps: SessionInstance['steps'] = (Array.isArray(h.steps) ? h.steps : []).filter(isObj).filter(s => str(s.ex) && num(s.plannedSec) && num(s.doneSec)).map(s => ({ ex: String(s.ex), side: s.side === 'L' ? 'L' as const : s.side === 'R' ? 'R' as const : null, plannedSec: Number(s.plannedSec), doneSec: Number(s.doneSec), outcome: (['done', 'skipped', 'swapped'] as const).find(o => o === s.outcome) ?? 'done', ...(str(s.swappedFrom) ? { swappedFrom: s.swappedFrom } : {}) }));
    history.push({ id: h.id, source: { kind: h.source.kind === 'custom' ? 'custom' : 'template', id: str(h.source.id) ? h.source.id : '' }, name: h.name, startedAt: h.startedAt, endedAt: num(h.endedAt) ? h.endedAt : h.startedAt, plannedSec: h.plannedSec, activeSec: h.activeSec, status: h.status, steps, checkIn: ci });
  }
  const favorites: Favorite[] = [];
  for (const f of Array.isArray(d.favorites) ? d.favorites : []) { if (isObj(f) && str(f.id) && exerciseById(f.id)) favorites.push({ id: f.id, at: num(f.at) ? f.at : Date.now() }); else w.droppedFavorites++; }
  return { ok: true, value: { data: { prefs: cleanPrefs(d.prefs), routines, history, favorites }, warnings: w, migrated } };
}

export interface ImportPlan { addRoutines: number; overwriteRoutines: number; addHistory: number; overwriteHistory: number; replaceAll: { routines: number; history: number } }
/** What importing would change, for the confirmation dialog. */
export function planImport(current: BackupData, incoming: BackupData): ImportPlan {
  const rIds = new Set(current.routines.map(r => r.id)); const hIds = new Set(current.history.map(h => h.id));
  return { addRoutines: incoming.routines.filter(r => !rIds.has(r.id)).length, overwriteRoutines: incoming.routines.filter(r => rIds.has(r.id)).length,
    addHistory: incoming.history.filter(h => !hIds.has(h.id)).length, overwriteHistory: incoming.history.filter(h => hIds.has(h.id)).length,
    replaceAll: { routines: current.routines.length, history: current.history.length } };
}
/** merge: incoming wins only when it is newer (routines: updatedAt; history is immutable, so same id keeps the current one). replace: the file becomes the data. */
export function applyMerge(current: BackupData, incoming: BackupData): BackupData {
  const routines = new Map(current.routines.map(r => [r.id, r] as const));
  for (const r of incoming.routines) { const c = routines.get(r.id); if (!c || r.updatedAt > c.updatedAt) routines.set(r.id, r); }
  const history = new Map(current.history.map(h => [h.id, h] as const)); for (const h of incoming.history) if (!history.has(h.id)) history.set(h.id, h);
  const favorites = new Map(current.favorites.map(f => [f.id, f] as const)); for (const f of incoming.favorites) if (!favorites.has(f.id)) favorites.set(f.id, f);
  return { prefs: current.prefs, routines: [...routines.values()], history: [...history.values()], favorites: [...favorites.values()] };
}
export async function writeBackupData(db: IDBDatabase, data: BackupData, includePrefs: boolean): Promise<void> {
  await replaceStores(db, { routines: data.routines, history: data.history, favorites: data.favorites, ...(includePrefs ? { prefs: [{ key: 'prefs', value: data.prefs }] } : {}) });
}
