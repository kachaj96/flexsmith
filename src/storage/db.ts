import type { CustomRoutine, Favorite, SessionInstance, UserPreferences } from '../domain/types';
import { DEFAULT_PREFS } from '../domain/types';
import type { PlayerState } from '../domain/player';

/* Local-first persistence. IndexedDB database "flexsmith" (never "running" or "repsmith"), localStorage keys only with the prefix "flexsmith.". */
export const DB_NAME = 'flexsmith';
export const DB_VERSION = 1;
export const STORES = ['prefs', 'routines', 'history', 'favorites', 'active', 'meta'] as const;
export type StoreName = (typeof STORES)[number];
export class StorageError extends Error { constructor(public code: 'open' | 'write' | 'read', msg: string) { super(msg); } }

export function openDb(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try { req = factory.open(DB_NAME, DB_VERSION); } catch (e) { reject(new StorageError('open', e instanceof Error ? e.message : String(e))); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('prefs')) db.createObjectStore('prefs', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('routines')) db.createObjectStore('routines', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('favorites')) db.createObjectStore('favorites', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('active')) db.createObjectStore('active', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new StorageError('open', req.error?.message ?? 'open failed'));
    req.onblocked = () => reject(new StorageError('open', 'database blocked by another tab'));
  });
}
const done = (tx: IDBTransaction): Promise<void> => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(new StorageError('write', tx.error?.message ?? 'write failed')); tx.onabort = () => rej(new StorageError('write', tx.error?.message ?? 'aborted')); });
const reqP = <T>(r: IDBRequest<T>): Promise<T> => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(new StorageError('read', r.error?.message ?? 'read failed')); });

export async function getAll<T>(db: IDBDatabase, store: StoreName): Promise<T[]> { return reqP<T[]>(db.transaction(store).objectStore(store).getAll()); }
export async function put(db: IDBDatabase, store: StoreName, value: unknown): Promise<void> { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); await done(tx); }
export async function del(db: IDBDatabase, store: StoreName, key: string): Promise<void> { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); await done(tx); }
export async function getOne<T>(db: IDBDatabase, store: StoreName, key: string): Promise<T | undefined> { return reqP<T | undefined>(db.transaction(store).objectStore(store).get(key)); }

export async function loadPrefs(db: IDBDatabase): Promise<UserPreferences> {
  const row = await getOne<{ key: string; value: Partial<UserPreferences> }>(db, 'prefs', 'prefs');
  return { ...DEFAULT_PREFS, ...(row?.value ?? {}) };
}
export async function savePrefs(db: IDBDatabase, p: UserPreferences): Promise<void> {
  await put(db, 'prefs', { key: 'prefs', value: p });
  mirrorPrefs(p);
}
/** The few values index.html needs before the first paint, mirrored to localStorage (best effort). */
export function mirrorPrefs(p: Pick<UserPreferences, 'theme' | 'lang' | 'motion'>): void {
  try { localStorage.setItem('flexsmith.theme', p.theme); localStorage.setItem('flexsmith.lang', p.lang); localStorage.setItem('flexsmith.motion', p.motion); } catch { /* blocked storage: the system defaults apply */ }
}
export const loadRoutines = (db: IDBDatabase) => getAll<CustomRoutine>(db, 'routines');
export const loadHistory = async (db: IDBDatabase) => (await getAll<SessionInstance>(db, 'history')).sort((a, b) => b.startedAt - a.startedAt);
export const loadFavorites = (db: IDBDatabase) => getAll<Favorite>(db, 'favorites');
export async function saveActive(db: IDBDatabase, s: PlayerState | null): Promise<void> { if (s) await put(db, 'active', { key: 'active', value: s }); else await del(db, 'active', 'active'); }
export async function loadActive(db: IDBDatabase): Promise<PlayerState | null> { return (await getOne<{ key: string; value: PlayerState }>(db, 'active', 'active'))?.value ?? null; }
/** A session that was started and never ended is only offered for resuming for this long. */
export const ACTIVE_MAX_AGE_MS = 12 * 3600 * 1000;

/** Replace the contents of several stores in ONE transaction. If anything throws, the transaction aborts and nothing changes. */
export async function replaceStores(db: IDBDatabase, data: Partial<Record<StoreName, unknown[]>>): Promise<void> {
  const names = Object.keys(data) as StoreName[]; const tx = db.transaction(names, 'readwrite');
  const finished = done(tx);
  try { for (const n of names) { const st = tx.objectStore(n); st.clear(); for (const row of data[n]!) st.put(row); } }
  catch (e) { try { tx.abort(); } catch { /* already finished */ } await finished.catch(() => undefined); throw new StorageError('write', e instanceof Error ? e.message : String(e)); }
  await finished;
}
