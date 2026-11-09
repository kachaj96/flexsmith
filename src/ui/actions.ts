import { EXERCISES, exerciseById } from '../content/exercises';
import { TEMPLATES } from '../content/sessions';
import type { Area, Equip, Intent, Limit } from '../content/types';
import { addStep, createRoutine, duplicate, fromTemplate, moveStep, removeStep, restoreRoutine, setStepDuration, setStepSides, softDelete, rename, MAX_STEPS } from '../domain/routine';
import { adaptSteps, recommend } from '../domain/recommend';
import type { CustomRoutine } from '../domain/types';
import { DEFAULT_PREFS } from '../domain/types';
import { loc, t } from '../i18n';
import { saveTextFile } from '../platform/files';
import { applyMerge, exportBackup, planImport, validateBackup, writeBackupData, type BackupData } from '../storage/backup';
import { del, loadFavorites, loadHistory, loadPrefs, loadRoutines, put, savePrefs, saveActive } from '../storage/db';
import { libraryList, pickList, sessList } from './views';
import { playAction, isPlaying, startPlay, resumeSaved } from './play';
import { redrawEditor, render, renderOverlays, toast } from './render';
import { resolveSource, routineById, store, newUI, type Page } from './state';

/* All data-a handlers. The DOM is the only source of the arguments (data-id, data-sid, data-k...), the store is the only state. */
const ui = () => store.ui;
const persistPrefs = async (): Promise<void> => { try { await savePrefs(store.db, store.prefs); } catch { toast(t('bk.err.write')); } };
const putRoutine = async (r: CustomRoutine): Promise<void> => { try { await put(store.db, 'routines', r); } catch { toast(t('bk.err.write')); } store.routines = [...store.routines.filter(x => x.id !== r.id), r]; };
const editing = (): CustomRoutine | undefined => { const p = ui().page; return p && p.t === 'edit' ? routineById(p.id) : undefined; };
const arrToggle = <T,>(a: T[], v: T): T[] => (a.includes(v) ? a.filter(x => x !== v) : [...a, v]);

export function goBack(): boolean {
  const u = ui();
  if (u.sheet) { u.sheet = null; render(); return true; }
  if (u.page) { u.page = u.page.t === 'ex' || u.page.t === 'session' ? u.page.from : null; render(); return true; }
  return false;
}
function startFrom(kind: 'template' | 'custom', id: string, adapt: boolean): void {
  const s = resolveSource(kind, id, store.prefs.lang); if (!s) return;
  let steps = s.steps;
  if (adapt && s.template) { const a = adaptSteps(s.template.steps, store.prefs); steps = a.steps; if (a.changes.length) toast(t('why.swapped', { n: a.changes.filter(c => c.kind === 'swapped').length }) + ' ' + t('why.dropped', { n: a.changes.filter(c => c.kind === 'dropped').length })); }
  if (!steps.length) { toast(t('mine.emptySteps')); return; }
  startPlay({ kind, id }, s.name, steps);
}

const A: Record<string, (id: string, el: HTMLElement) => void | Promise<void>> = {
  tab: id => { const u = ui(); u.tab = id as typeof u.tab; u.page = null; u.sheet = null; render(false); },
  back: () => { goBack(); },
  openSession: (id, el) => { const from = ui().page; ui().page = { t: 'session', kind: el.dataset.kind === 'custom' ? 'custom' : 'template', id, from: null }; void from; render(); },
  openEx: id => { const cur = ui().page; ui().page = { t: 'ex', id, from: cur && (cur.t === 'session') ? cur : null }; render(); },
  openPage: id => { ui().page = { t: id } as Page; render(); },
  fav: async id => {
    const was = store.favs.some(f => f.id === id);
    try { if (was) await del(store.db, 'favorites', id); else await put(store.db, 'favorites', { id, at: Date.now() }); store.favs = await loadFavorites(store.db); } catch { toast(t('bk.err.write')); }
    document.querySelector('.fav')?.setAttribute('aria-pressed', String(store.favs.some(f => f.id === id)));
  },
  acc: id => { const a = document.getElementById('acc-' + id); if (!a) return; const o = a.dataset.open !== 'true'; a.dataset.open = String(o); a.querySelector('button')?.setAttribute('aria-expanded', String(o)); },
  adjust: () => { ui().sheet = { t: 'adjust' }; renderOverlays(); },
  closeSheet: () => { ui().sheet = null; render(); },
  setGoal: async id => { store.prefs.goal = id as Intent; await persistPrefs(); ui().sheet = { t: 'adjust' }; render(); },
  setTime: async id => { store.prefs.timeMin = Number(id); await persistPrefs(); ui().sheet = { t: 'adjust' }; render(); },
  setEq: async id => { store.prefs.equip = arrToggle(store.prefs.equip, id as Equip); await persistPrefs(); ui().sheet = { t: 'adjust' }; render(); },
  quick: id => { const u = ui(); u.tab = 'sessions'; u.filt = { q: '', intent: id as Intent }; render(false); },
  startRec: () => { const r = recommend(store.prefs); if (r.kind !== 'ok') return; startPlay({ kind: 'template', id: r.rec.template.id }, loc(r.rec.template.name), r.rec.steps); },
  startSession: (id, el) => startFrom(el.dataset.kind === 'custom' ? 'custom' : 'template', id, el.dataset.kind !== 'custom'),
  resumeSaved: () => { resumeSaved(); },
  discardSaved: async () => { store.saved = null; try { await saveActive(store.db, null); } catch { /* nothing to clear */ } render(); },
  fint: id => { ui().filt.intent = id as 'all' | Intent; render(); },
  ftype: id => { ui().lib.type = id as 'all'; render(); },
  ffav: () => { ui().lib.fav = !ui().lib.fav; render(); },
  setPref: async (id, el) => { (store.prefs as unknown as Record<string, string>)[el.dataset.k!] = id; await persistPrefs(); render(); },
  togPref: async (_, el) => { const k = el.dataset.k as 'sound' | 'haptic'; store.prefs[k] = !store.prefs[k]; await persistPrefs(); render(); },
  /* --- my sessions --- */
  newRoutine: async () => { const r = createRoutine(t('mine.new')); await putRoutine(r); ui().tab = 'mine'; ui().page = { t: 'edit', id: r.id }; render(); },
  editRoutine: id => { ui().page = { t: 'edit', id }; render(); },
  copyTemplate: async id => { const tp = TEMPLATES.find(x => x.id === id); if (!tp) return; const r = fromTemplate(tp, t('mine.copyOf', { n: loc(tp.name) })); await putRoutine(r); ui().tab = 'mine'; ui().page = { t: 'edit', id: r.id }; render(); },
  dupRoutine: async () => { const r = editing(); if (!r) return; const c = duplicate(r, r.name + ' (2)'); await putRoutine(c); ui().page = { t: 'edit', id: c.id }; render(); toast(t('mine.saved')); },
  delRoutine: () => { const r = editing(); if (!r) return; ui().sheet = { t: 'confirm', kind: 'routine', id: r.id, msg: t('mine.deleteQ', { n: r.name }) }; renderOverlays(); },
  confirmDelete: async () => {
    const s = ui().sheet; if (!s || s.t !== 'confirm') return; const r = routineById(s.id); ui().sheet = null; ui().page = null; if (!r) { render(); return; }
    await putRoutine(softDelete(r)); render(); toast(t('mine.deleted'), () => { void putRoutine(restoreRoutine(softDelete(r))).then(() => { ui().toast = null; render(); }); });
  },
  saveRoutine: async () => { const r = editing(); if (!r) return; const name = (document.getElementById('rn') as HTMLInputElement | null)?.value ?? r.name; await putRoutine(rename(r, name)); ui().page = null; render(); toast(t('mine.saved')); },
  stepdur: async (_, el) => { const r = editing(); if (!r) return; const s = r.steps.find(x => x.id === el.dataset.sid); const e = s && exerciseById(s.ex); if (!s || !e) return; const n = setStepDuration(r, s.id, (s.dur ?? e.dur) + Number(el.dataset.d)); await putRoutine(n); redrawEditor(r.id); },
  mv: async (_, el) => { const r = editing(); if (!r) return; await putRoutine(moveStep(r, el.dataset.sid!, Number(el.dataset.d))); redrawEditor(r.id); },
  togSides: async (_, el) => { const r = editing(); if (!r) return; const s = r.steps.find(x => x.id === el.dataset.sid); const e = s && exerciseById(s.ex); if (!s || !e) return; await putRoutine(setStepSides(r, s.id, !(s.sides ?? e.sides))); redrawEditor(r.id); },
  rmStep: async (_, el) => {
    const r = editing(); if (!r) return; const before = r; await putRoutine(removeStep(r, el.dataset.sid!)); redrawEditor(r.id);
    toast(t('mine.removed'), () => { void putRoutine({ ...before, updatedAt: Date.now() }).then(() => { redrawEditor(r.id); ui().toast = null; renderOverlays(); }); });
  },
  undo: () => { const u = ui().toast?.undo; ui().toast = null; renderOverlays(); u?.(); },
  addEx: () => { ui().sheet = { t: 'pick', q: '' }; renderOverlays(); },
  pickEx: async id => { const r = editing(); if (!r) return; if (r.steps.length >= MAX_STEPS) { toast(t('mine.max')); return; } await putRoutine(addStep(r, id)); ui().sheet = null; render(); },
  addTo: id => { if (!store.routines.some(r => !r.deletedAt)) { void A.addToNew!(id, document.body); return; } ui().sheet = { t: 'pickRoutine', ex: id }; renderOverlays(); },
  addToRoutine: async id => { const s = ui().sheet; const r = routineById(id); if (!s || s.t !== 'pickRoutine' || !r) return; await putRoutine(addStep(r, s.ex)); ui().sheet = null; renderOverlays(); toast(t('mine.addedTo', { n: r.name })); },
  addToNew: async id => { const s = ui().sheet; const ex = s && s.t === 'pickRoutine' ? s.ex : id; const r = addStep(createRoutine(t('mine.new')), ex); await putRoutine(r); ui().sheet = null; ui().tab = 'mine'; ui().page = { t: 'edit', id: r.id }; render(); },
  /* --- backup --- */
  exportBackup: async () => { try { const f = await exportBackup(store.db); const ok = await saveTextFile(`flexsmith-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(f, null, 1)); toast(t(ok ? 'bk.exportOk' : 'bk.exportFail')); } catch { toast(t('bk.exportFail')); } },
  importPick: () => { (document.getElementById('importFile') as HTMLInputElement | null)?.click(); },
  impPrefs: () => { const s = ui().sheet; if (s && s.t === 'import') { s.prefsToo = !s.prefsToo; renderOverlays(); } },
  importMerge: async () => { await doImport(false); },
  importReplace: async () => { await doImport(true); },
  /* --- onboarding --- */
  openOb: () => { ui().ob = { step: 0, draft: { ...store.prefs, equip: [...store.prefs.equip], focus: [...store.prefs.focus], limits: [...store.prefs.limits] } }; ui().page = { t: 'onboarding' }; render(); },
  obGoal: id => { ui().ob!.draft.goal = id as Intent; renderOverlays(); },
  obTime: id => { ui().ob!.draft.timeMin = Number(id); renderOverlays(); },
  obEquip: id => { const d = ui().ob!.draft; d.equip = arrToggle(d.equip, id as Equip); renderOverlays(); },
  obLevel: id => { ui().ob!.draft.level = id as 'new'; renderOverlays(); },
  obFocus: id => { const d = ui().ob!.draft; d.focus = arrToggle(d.focus, id as Area); renderOverlays(); },
  obLimit: id => { const d = ui().ob!.draft; d.limits = arrToggle(d.limits, id as Limit); renderOverlays(); },
  obRed: () => { const d = ui().ob!.draft; d.redFlag = !d.redFlag; renderOverlays(); },
  obNext: () => { const ob = ui().ob!; ob.step = Math.min(5, ob.step + 1); renderOverlays(); },
  obBack: () => { const ob = ui().ob!; ob.step = Math.max(0, ob.step - 1); renderOverlays(); },
  obSkip: async () => { const base = ui().ob ? { ...store.prefs } : { ...DEFAULT_PREFS }; store.prefs = { ...base, onboarded: true }; await persistPrefs(); ui().ob = null; ui().page = null; render(); },
  obFinish: async () => { const d = ui().ob!.draft; store.prefs = { ...d, onboarded: true }; await persistPrefs(); ui().ob = null; ui().page = null; render(false); },
};
async function doImport(replace: boolean): Promise<void> {
  const s = ui().sheet; if (!s || s.t !== 'import') return;
  const v = validateBackup(s.text); if (!v.ok) { toast(t(`bk.err.${v.error}` as 'bk.err.no-data')); return; }
  try {
    const cur: BackupData = { prefs: store.prefs, routines: store.routines.filter(r => !r.deletedAt), history: store.history, favorites: store.favs };
    const next = replace ? v.value.data : applyMerge(cur, v.value.data);
    await writeBackupData(store.db, next, s.prefsToo);
    store.prefs = await loadPrefs(store.db); store.routines = await loadRoutines(store.db); store.history = await loadHistory(store.db); store.favs = await loadFavorites(store.db);
    if (s.prefsToo) await savePrefs(store.db, store.prefs);
    ui().sheet = null; ui().page = null; render(false); toast(t('bk.done'));
  } catch { ui().sheet = null; renderOverlays(); toast(t('bk.err.write')); }   // the transaction aborted: nothing was changed
}
/** A file was chosen in the backup page. Validates first and shows what would change; nothing is written yet. */
export async function onImportFile(file: File): Promise<void> {
  let text = ''; try { text = await file.text(); } catch { toast(t('bk.err.read')); return; }
  const v = validateBackup(text); if (!v.ok) { toast(t(`bk.err.${v.error}` as 'bk.err.no-data')); return; }
  const cur: BackupData = { prefs: store.prefs, routines: store.routines.filter(r => !r.deletedAt), history: store.history, favorites: store.favs };
  const w = v.value.warnings; ui().sheet = { t: 'import', text, plan: planImport(cur, v.value.data), summary: { r: v.value.data.routines.length, h: v.value.data.history.length }, current: { r: cur.routines.length, h: cur.history.length }, migrated: v.value.migrated, dropped: w.droppedRoutines + w.droppedHistory + w.droppedSteps + w.droppedFavorites, prefsToo: false };
  renderOverlays();
}
export function onClick(ev: Event): void {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-a]'); if (!el) return;
  const a = el.dataset.a!;
  if (a.startsWith('pl') && playAction(a, el)) { ev.preventDefault(); return; }
  const f = A[a]; if (f) { ev.preventDefault(); void f(el.dataset.id ?? '', el); }
}
export function onInput(ev: Event): void {
  const el = ev.target as HTMLInputElement; const u = ui();
  if (el.id === 'sq') { u.filt.q = el.value; const q = el.value.trim().toLowerCase(); const list = document.getElementById('slist'); if (list) list.innerHTML = sessList(TEMPLATES.filter(x => (u.filt.intent === 'all' || x.intent === u.filt.intent) && (!q || loc(x.name).toLowerCase().includes(q) || loc(x.desc).toLowerCase().includes(q))).map(x => x.id)); }
  if (el.id === 'lq') { u.lib.q = el.value; const l = document.getElementById('llist'); if (l) l.innerHTML = libraryList(); }
  if (el.id === 'pq' && u.sheet?.t === 'pick') { u.sheet.q = el.value; const q = el.value.toLowerCase(); const l = document.getElementById('plist'); if (l) l.innerHTML = pickList(EXERCISES.filter(e => !q || loc(e.name).toLowerCase().includes(q))); }
  if (el.id === 'obCustom' && u.ob) { const n = Math.round(Number(el.value)); if (n >= 1 && n <= 120) u.ob.draft.timeMin = n; }
}
export function onChange(ev: Event): void { const el = ev.target as HTMLInputElement; if (el.id === 'importFile' && el.files?.[0]) { void onImportFile(el.files[0]); el.value = ''; } }
export { isPlaying, newUI };
