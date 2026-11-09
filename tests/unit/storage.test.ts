import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { DB_NAME, getAll, loadActive, loadFavorites, loadHistory, loadPrefs, loadRoutines, openDb, put, saveActive, savePrefs } from '../../src/storage/db';
import { applyMerge, exportBackup, planImport, validateBackup, writeBackupData, type BackupData } from '../../src/storage/backup';
import { DEFAULT_PREFS, SCHEMA, type CustomRoutine, type SessionInstance } from '../../src/domain/types';
import { addStep, createRoutine } from '../../src/domain/routine';
import { createPlayer } from '../../src/domain/player';

const inst = (id: string, at: number): SessionInstance => ({ id, source: { kind: 'template', id: 'prerun' }, name: 'Przed biegiem', startedAt: at, endedAt: at + 1000, plannedSec: 265, activeSec: 250, status: 'completed', steps: [{ ex: 'march', side: null, plannedSec: 30, doneSec: 30, outcome: 'done' }], checkIn: { comfort: 'ok', note: 'dobrze', modified: false } });
let db: IDBDatabase;
beforeEach(async () => { (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory(); db = await openDb(); });

describe('storage', () => {
  it('uses its own database and defaults', async () => { expect(db.name).toBe(DB_NAME); expect(DB_NAME).toBe('flexsmith'); expect(await loadPrefs(db)).toEqual(DEFAULT_PREFS); });
  it('keeps preferences, routines, history, favourites and the active session across a reopen', async () => {
    await savePrefs(db, { ...DEFAULT_PREFS, lang: 'en', goal: 'mob' });
    const r = addStep(createRoutine('Moja'), 'march'); await put(db, 'routines', r); await put(db, 'history', inst('h1', 1000)); await put(db, 'favorites', { id: 'rocks', at: 1 });
    await saveActive(db, createPlayer({ kind: 'template', id: 'prerun' }, 'x', [{ ex: 'march' }], { mono: 0, wall: 5 }));
    db.close(); db = await openDb();
    expect((await loadPrefs(db)).lang).toBe('en'); expect((await loadRoutines(db))[0]!.name).toBe('Moja'); expect((await loadHistory(db)).length).toBe(1); expect((await loadFavorites(db))[0]!.id).toBe('rocks');
    expect((await loadActive(db))!.name).toBe('x'); await saveActive(db, null); expect(await loadActive(db)).toBeNull();
  });
  it('history is returned newest first', async () => { await put(db, 'history', inst('a', 1000)); await put(db, 'history', inst('b', 3000)); await put(db, 'history', inst('c', 2000)); expect((await loadHistory(db)).map(h => h.id)).toEqual(['b', 'c', 'a']); });
});

describe('backup', () => {
  const data = (): BackupData => ({ prefs: { ...DEFAULT_PREFS, onboarded: true, goal: 'wind', timeMin: 15, equip: ['mat', 'roller'] }, routines: [addStep(createRoutine('Moja', 1000), 'march', 1000)], history: [inst('h1', 5000)], favorites: [{ id: 'rocks', at: 1 }] });
  it('round trip: export, validate, import into an empty database gives the same data', async () => {
    const d = data(); await savePrefs(db, d.prefs); await writeBackupData(db, d, false);
    const file = JSON.stringify(await exportBackup(db)); const v = validateBackup(file); if (!v.ok) throw new Error(v.error);
    db.close(); (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory(); db = await openDb();
    await writeBackupData(db, v.value.data, true);
    expect(await loadPrefs(db)).toEqual(d.prefs); expect(await loadRoutines(db)).toEqual(d.routines); expect(await loadHistory(db)).toEqual(d.history); expect(await loadFavorites(db)).toEqual(d.favorites);
  });
  it('the file says what it is: app, schema, date', async () => { const f = await exportBackup(db, new Date('2026-11-09T10:00:00Z')); expect(f).toMatchObject({ app: 'flexsmith', schema: SCHEMA, exportedAt: '2026-11-09T10:00:00.000Z' }); });
  it('deleted routines are not exported', async () => { const r: CustomRoutine = { ...createRoutine('gone'), deletedAt: 5 }; await put(db, 'routines', r); expect((await exportBackup(db)).data.routines.length).toBe(0); });
  it('rejects what is not a Flexsmith backup, with a reason', () => {
    expect(validateBackup('nope')).toEqual({ ok: false, error: 'not-json' });
    expect(validateBackup('[1]')).toEqual({ ok: false, error: 'not-object' });
    expect(validateBackup(JSON.stringify({ app: 'runsmith', schema: 1, data: {} }))).toEqual({ ok: false, error: 'wrong-app' });
    expect(validateBackup(JSON.stringify({ app: 'repsmith', schema: 1, data: {} }))).toEqual({ ok: false, error: 'wrong-app' });
    expect(validateBackup(JSON.stringify({ app: 'flexsmith', schema: 99, data: {} }))).toEqual({ ok: false, error: 'newer-schema' });
    expect(validateBackup(JSON.stringify({ app: 'flexsmith', schema: 'x', data: {} }))).toEqual({ ok: false, error: 'bad-schema' });
    expect(validateBackup(JSON.stringify({ app: 'flexsmith', schema: 1 }))).toEqual({ ok: false, error: 'no-data' });
  });
  it('drops malformed entries and steps that point at unknown exercises, and counts them', () => {
    const d = data(); const file = { app: 'flexsmith', schema: 1, data: { ...d, routines: [...d.routines, { id: 7 }, { id: 'r2', name: 'x', steps: [{ id: 's', ex: 'march' }, { id: 't', ex: 'unknown' }] }], history: [...d.history, { id: 'broken' }], favorites: [...d.favorites, { id: 'nope' }] } };
    const v = validateBackup(JSON.stringify(file)); if (!v.ok) throw new Error(v.error);
    expect(v.value.warnings).toEqual({ droppedRoutines: 1, droppedHistory: 1, droppedSteps: 1, droppedFavorites: 1 });
    expect(v.value.data.routines.find(r => r.id === 'r2')!.steps.length).toBe(1);
  });
  it('bad preference values fall back to defaults instead of breaking the app', () => {
    const v = validateBackup(JSON.stringify({ app: 'flexsmith', schema: 1, data: { prefs: { goal: 'x', timeMin: 'a', lang: 'de', equip: ['mat', 'jetpack'] }, routines: [], history: [], favorites: [] } })); if (!v.ok) throw new Error(v.error);
    expect(v.value.data.prefs).toMatchObject({ goal: 'prep', timeMin: 10, lang: 'pl', equip: ['mat'] });
  });
  it('migrates the file the interactive prototype exported', () => {
    const proto = { app: 'flexsmith', schema: 1, data: { lang: 'en', theme: 'dark', favs: ['rocks', 'march'], hist: [{ id: 'h1', at: 1000, name: 'Przed biegiem', sid: 'prerun', done: false, actual: 8, planned: 390, comfort: 'mid', modified: true, note: 'ok' }], routines: [{ id: 'r1', n: 'Poranny start', steps: [{ ex: 'catcow' }, { ex: 'rocks', dur: 10 }] }] } };
    const v = validateBackup(JSON.stringify(proto)); if (!v.ok) throw new Error(v.error);
    expect(v.value.migrated).toBe(true); expect(v.value.data.prefs).toMatchObject({ lang: 'en', theme: 'dark' }); expect(v.value.data.favorites.map(f => f.id)).toEqual(['rocks', 'march']);
    expect(v.value.data.routines[0]).toMatchObject({ name: 'Poranny start' }); expect(v.value.data.routines[0]!.steps[1]).toMatchObject({ ex: 'rocks', dur: 10 });
    expect(v.value.data.history[0]).toMatchObject({ status: 'partial', activeSec: 8, plannedSec: 390, checkIn: { comfort: 'strong', modified: true, note: 'ok' } });
  });
  it('a failed import leaves the original data untouched (one transaction, all or nothing)', async () => {
    const d = data(); await writeBackupData(db, d, false);
    const poisoned = { ...d, history: [...d.history, { noId: true } as unknown as SessionInstance] };   // a row without a key makes put() throw inside the transaction
    await expect(writeBackupData(db, poisoned, false)).rejects.toThrow();
    expect(await loadRoutines(db)).toEqual(d.routines); expect(await loadHistory(db)).toEqual(d.history); expect((await getAll(db, 'favorites')).length).toBe(1);
  });
  it('the confirmation can say what would change; merge keeps the newer routine and never duplicates history', () => {
    const cur = data(); const inc: BackupData = { ...data(), routines: [{ ...cur.routines[0]!, name: 'Nowsza', updatedAt: 9000 }, { ...createRoutine('Nowa', 2000) }], history: [inst('h1', 5000), inst('h2', 6000)] };
    expect(planImport(cur, inc)).toMatchObject({ addRoutines: 1, overwriteRoutines: 1, addHistory: 1, overwriteHistory: 1 });
    const m = applyMerge(cur, inc); expect(m.routines.find(r => r.id === cur.routines[0]!.id)!.name).toBe('Nowsza'); expect(m.history.map(h => h.id).sort()).toEqual(['h1', 'h2']);
  });
});
