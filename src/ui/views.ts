import { EXERCISES, exerciseById } from '../content/exercises';
import { TEMPLATES } from '../content/sessions';
import type { Area, Equip, Exercise, ExType, Intent, Limit } from '../content/types';
import { estimate, fmtClock, minutes, TRANSITION_SEC, type StepLike } from '../domain/estimate';
import { recommend, type Recommendation } from '../domain/recommend';
import { getLang, loc, locList, t, type Key } from '../i18n';
import { ico, esc } from './dom';
import { equipOf, isFav, liveRoutines, resolveSource, routineById, store } from './state';
import { ExTypeTag, intentTagType } from './tags';
import type { SessionInstance } from '../domain/types';
import { PART_PATHS, RADIUS, TILE } from '../brand-art';

/* The logo from the generated brand-art.ts (scripts/brand.mjs): the tile with the white mark, and the mark alone in the accent colour. */
const MARK = `<rect width="1024" height="1024" rx="${RADIUS}" fill="${TILE}"/>${PART_PATHS.map(d => `<path fill="#fff" d="${d}"/>`).join('')}`;
const GLYPH = PART_PATHS.map(d => `<path fill="var(--smith-accent)" d="${d}"/>`).join('');

export const VERSION = '1.0.1';
const NAV: [string, Key][] = [['today', 'nav.today'], ['sessions', 'nav.sessions'], ['mine', 'nav.mine'], ['lib', 'nav.lib'], ['more', 'nav.more']];
const INTENTS: Intent[] = ['prep', 'wind', 'mob', 'roll', 'gen'];
const TYPES: ExType[] = ['dynamic', 'mobility', 'static', 'control', 'roll'];
const EQUIPS: Equip[] = ['mat', 'roller', 'miniband', 'longband', 'ball'];
const AREAS: Area[] = ['ankles', 'calves', 'hips', 'glutes', 'hams', 'quads', 'thoracic', 'shoulders', 'core', 'wrists', 'feet', 'full'];
const LIMITS: Limit[] = ['knee', 'ankle', 'hip', 'back', 'shoulder', 'wrist'];
const equipName = (e: Equip): string => t(`equip.${e}` as Key);
const areaName = (a: Area): string => t(`area.${a}` as Key);

export const header = (right = ''): string => `<div class="hdr"><div class="lockup"><svg class="mk" viewBox="0 0 1024 1024" aria-hidden="true">${MARK}</svg><b>Flexsmith</b></div><div style="display:flex">${right}</div></div>`;
const topbar = (title: string, right = ''): string => `<div class="hdr" style="padding:max(8px,env(safe-area-inset-top)) 16px 0"><button class="ib" data-a="back" aria-label="${t('common.back')}">${ico('back')}</button><b class="grow" style="font:700 17px var(--smith-font-display)">${esc(title)}</b><div style="display:flex">${right}</div></div>`;
const metaOf = (e: Exercise): string => `${e.dur} ${e.mode === 'time' ? t('common.sec') : t('common.reps')}${e.sides ? ' · ' + t('common.perSide') : ''}`;
const chip = (label: string, on: boolean, a: string, id = '', extra = ''): string => `<button class="chip" aria-pressed="${on}" data-a="${a}" ${id ? `data-id="${esc(id)}"` : ''} ${extra}>${label}</button>`;

/* ---------- the sentence that explains a recommendation: only facts the user stated ---------- */
export function whyText(rec: Recommendation, capMin: number): string {
  const b = rec.basis; const equip = b.equip.length ? b.equip.map(equipName).join(', ').toLowerCase() : equipName('none').toLowerCase();
  const parts = [t('why.base', { goal: t(`intent.goal.${b.goal}` as Key), min: b.timeMin, equip: `${equip}, ${t('why.level', { level: t(`level.${b.level}` as Key).toLowerCase() })}` })];
  if (rec.focusHits.length) parts.push(t('why.areas', { areas: rec.focusHits.map(areaName).join(', ').toLowerCase() }));
  const sw = rec.changes.filter(c => c.kind === 'swapped').length, dr = rec.changes.filter(c => c.kind === 'dropped' && c.why !== 'time').length, tr = rec.changes.filter(c => c.kind === 'dropped' && c.why === 'time').length;
  if (sw) parts.push(t('why.swapped', { n: sw })); if (dr) parts.push(t('why.dropped', { n: dr })); if (tr) parts.push(t('why.trimmed', { n: tr }));
  if (!rec.fitsTime) parts.push(t('why.over', { min: minutes(rec.totalSec), cap: capMin }));
  return parts.join(' ');
}

/* ---------- tabs ---------- */
export function viewToday(): string {
  const p = store.prefs; const res = recommend(p);
  const date = new Date().toLocaleDateString(getLang() === 'pl' ? 'pl-PL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const wk = store.history.filter(h => Date.now() - h.startedAt < 7 * 864e5); const wm = wk.reduce((a, h) => a + h.activeSec, 0);
  let rec = '';
  if (res.kind === 'ok') {
    const r = res.rec;
    rec = `<div class="row"><div class="grow"><div class="cap">${t(`intent.${r.basis.goal}` as Key)}</div><div style="font:800 24px/1.2 var(--smith-font-display);margin-top:2px">${esc(loc(r.template.name))}</div></div><div style="text-align:right"><div class="met">${minutes(r.totalSec)}</div><div class="cap">${t('common.min')}</div></div></div>
    <p class="cap" style="margin:10px 0 14px;font-size:14px;line-height:20px" data-testid="why">${esc(whyText(r, p.timeMin))}</p>
    <button class="btn pri" data-a="startRec">${ico('play')}${t('today.start')}</button>`;
  } else if (res.kind === 'redflag') rec = `<div class="notice">${ico('warn')}<div>${t('today.redflag')}</div></div>`;
  else rec = `<div class="notice info">${ico('info')}<div>${t(res.reason === 'limits' ? 'today.noneLimits' : 'today.noneMatch')}</div></div>`;
  const saved = store.saved;
  const savedSrc = saved ? resolveSource(saved.source.kind, saved.source.id, getLang()) : null;
  return `${header(`<button class="ib" data-a="tab" data-id="more" aria-label="${t('common.settings')}">${ico('settings')}</button>`)}
  <h1>${t('today.title')}</h1><p class="sub">${esc(date)}</p>
  ${saved ? `<div class="card fade-in" style="background:var(--smith-accent-soft);margin-bottom:12px" data-testid="resume-card"><div class="cap">${t('today.continue')}</div><div style="font:700 17px var(--smith-font-display)">${esc(savedSrc?.name ?? saved.name)}</div><p class="cap" style="margin:4px 0 12px">${t('pl.step', { i: saved.i + 1, n: saved.phases.length })} · ${t('today.resumeNote')}</p><div class="row"><button class="btn pri" data-a="resumeSaved">${t('today.resume')}</button><button class="btn sec" data-a="discardSaved">${t('today.discard')}</button></div></div>` : ''}
  <div class="card fade-in">${rec}${res.kind !== 'redflag' ? `<div style="text-align:center;margin-top:6px"><button class="btn ghost" data-a="adjust">${t('today.adjust')}: ${t(`intent.goal.${p.goal}` as Key)} · ${p.timeMin} ${t('common.min')}</button></div>` : `<div style="text-align:center;margin-top:6px"><button class="btn ghost" data-a="openOb">${t('more.prefs')}</button></div>`}</div>
  <h2>${t('today.quick')}</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${(['prep', 'wind', 'mob'] as Intent[]).map(k => `<button class="li" style="margin:0;flex-direction:column;align-items:flex-start;gap:4px" data-a="quick" data-id="${k}"><span class="t">${t(`intent.${k}` as Key)}</span><span class="m">${t(`intent.desc.${k}` as Key)}</span></button>`).join('')}<button class="li" style="margin:0;flex-direction:column;align-items:flex-start;gap:4px" data-a="tab" data-id="sessions"><span class="t">${t('today.explore')}</span><span class="m">${t('unit.sessions', { n: TEMPLATES.length })}</span></button></div>
  <h2>${t('today.week')}</h2>
  <div class="card"><div class="met" data-testid="week-n">${wk.length}</div><div class="cap">${wk.length ? t('today.weekN', { n: wk.length, m: Math.round(wm / 60) }) : t('today.weekNone')}</div></div>
  ${store.history.length ? `<h2>${t('today.recent')}</h2>${store.history.slice(0, 3).map(histRow).join('')}` : ''}`;
}
export const histRow = (h: SessionInstance): string => {
  const d = new Date(h.startedAt).toLocaleDateString(getLang() === 'pl' ? 'pl-PL' : 'en-GB', { day: 'numeric', month: 'short' });
  const sk = h.steps.filter(s => s.outcome === 'skipped').length, sw = h.steps.filter(s => s.outcome === 'swapped').length;
  const extra = [sk ? t('hist.skippedN', { n: sk }) : '', sw ? t('hist.swappedN', { n: sw }) : '', h.checkIn?.modified ? t('pl.modified') : ''].filter(Boolean).join(' · ');
  return `<div class="li hist-row" style="cursor:default" data-testid="hist-row"><div class="grow"><div class="t">${esc(h.name)}</div><div class="m">${d} · ${t('pl.actual')} ${fmtClock(h.activeSec)} / ${t('pl.planned')} ${fmtClock(h.plannedSec)}${extra ? ' · ' + esc(extra) : ''}${h.checkIn?.note ? ' · ' + esc(h.checkIn.note) : ''}</div></div><span class="tag"><i style="--c:${h.status === 'completed' ? 'var(--smith-positive)' : 'var(--smith-warning)'}"></i>${t(h.status === 'completed' ? 'pl.complete' : 'pl.partial')}</span></div>`;
};
export const sessCard = (kind: 'template' | 'custom', id: string): string => {
  const s = resolveSource(kind, id, getLang()); if (!s) return '';
  const eq = equipOf(s.steps);
  return `<button class="li" data-a="openSession" data-kind="${kind}" data-id="${id}"><div class="grow"><div class="t">${esc(s.name)}</div><div class="m">${minutes(sessionSec(s.steps))} ${t('common.min')} · ${t('unit.exercises', { n: s.steps.length })} · ${esc(eq.length ? eq.map(equipName).join(', ') : equipName('none'))}</div>${s.intent ? `<div style="margin-top:6px">${ExTypeTag(intentTagType(s.intent))}</div>` : ''}</div>${ico('chev')}</button>`;
};
const sessionSec = (steps: StepLike[]): number => estimate(steps).totalSec;
export function viewSessions(): string {
  const f = store.ui.filt; const q = f.q.trim().toLowerCase();
  const list = TEMPLATES.filter(x => (f.intent === 'all' || x.intent === f.intent) && (!q || loc(x.name).toLowerCase().includes(q) || loc(x.desc).toLowerCase().includes(q)));
  return `${header()}<h1>${t('ses.title')}</h1><p class="sub"></p>
  <div class="search"><span>${ico('search')}</span><input class="field" id="sq" type="search" placeholder="${t('common.search')}" value="${esc(f.q)}" aria-label="${t('common.search')}"></div>
  <div class="chips" role="group" style="margin-top:10px">${chip(t('common.all'), f.intent === 'all', 'fint', 'all')}${INTENTS.map(k => chip(t(`intent.${k}` as Key), f.intent === k, 'fint', k)).join('')}</div>
  <div id="slist">${sessList(list.map(x => x.id)) }</div>`;
}
export const sessList = (ids: string[]): string => ids.map(id => sessCard('template', id)).join('') || `<div class="empty">${t('common.empty')}</div>`;
export function viewMine(): string {
  const list = liveRoutines();
  return `${header(`<button class="ib" data-a="newRoutine" aria-label="${t('mine.new')}">${ico('plus')}</button>`)}<h1>${t('mine.title')}</h1><p class="sub"></p>
  ${list.length ? list.map(r => `<button class="li" data-a="editRoutine" data-id="${r.id}"><div class="grow"><div class="t">${esc(r.name)}</div><div class="m">${fmtClock(estimate(r.steps).totalSec)} · ${t('unit.exercises', { n: r.steps.length })}</div></div>${ico('chev')}</button>`).join('') : `<div class="empty">${t('mine.empty')}</div>`}
  <button class="btn pri" data-a="newRoutine" style="margin-top:8px">${ico('plus')}${t('mine.new')}</button>`;
}
export function libraryList(): string {
  const f = store.ui.lib; const q = f.q.trim().toLowerCase();
  const list = EXERCISES.filter(e => (f.type === 'all' || e.type === f.type) && (!f.fav || isFav(e.id)) && (!q || loc(e.name).toLowerCase().includes(q) || areaName(e.area).toLowerCase().includes(q)));
  return list.map(e => `<button class="li" data-a="openEx" data-id="${e.id}"><div class="grow"><div class="t">${esc(loc(e.name))}</div><div class="m">${esc(areaName(e.area))} · ${esc(metaOf(e))} · ${esc(equipName(e.equip))}</div><div style="margin-top:6px">${ExTypeTag(e.type)}</div></div>${isFav(e.id) ? `<span style="color:var(--smith-accent)" aria-label="${t('ex.fav')}">${ico('heart').replace('class="ico"', 'class="ico" style="fill:currentColor"')}</span>` : ''}${ico('chev')}</button>`).join('') || `<div class="empty">${t('common.empty')}</div>`;
}
const recentExercises = (): Exercise[] => { const seen: string[] = []; for (const h of store.history) for (const s of h.steps) if (!seen.includes(s.ex)) seen.push(s.ex); return seen.slice(0, 6).map(exerciseById).filter((e): e is Exercise => !!e); };
export function viewLib(): string {
  const f = store.ui.lib; const rec = f.q || f.type !== 'all' || f.fav ? [] : recentExercises();
  return `${header()}<h1>${t('lib.title')}</h1><p class="sub"></p>
  <div class="search"><span>${ico('search')}</span><input class="field" id="lq" type="search" placeholder="${t('common.search')}" value="${esc(f.q)}" aria-label="${t('common.search')}"></div>
  <div class="chips" style="margin-top:10px">${chip(t('common.all'), f.type === 'all', 'ftype', 'all')}${TYPES.map(k => chip(t(`type.${k}` as Key), f.type === k, 'ftype', k)).join('')}${chip(t('lib.favs'), f.fav, 'ffav')}</div>
  ${rec.length ? `<div class="cap" style="margin:0 0 6px">${t('lib.recent')}</div><div class="chips" style="margin-top:0">${rec.map(e => `<button class="chip" data-a="openEx" data-id="${e.id}">${esc(loc(e.name))}</button>`).join('')}</div>` : ''}
  <div id="llist">${libraryList()}</div>`;
}
export function viewMore(): string {
  const p = store.prefs;
  const seg = (key: 'theme' | 'lang' | 'motion', opts: [string, string][]) => `<div class="seg" role="group">${opts.map(([v, l]) => chip(l, p[key] === v, 'setPref', v, `data-k="${key}"`)).join('')}</div>`;
  const tog = (key: 'sound' | 'haptic', label: string) => `<div class="row" style="min-height:52px"><div class="grow">${label}</div><button class="chip" role="switch" aria-checked="${p[key]}" aria-pressed="${p[key]}" data-a="togPref" data-k="${key}">${p[key] ? t('common.on') : t('common.off')}</button></div>`;
  return `${header()}<h1>${t('more.title')}</h1><p class="sub">${t('more.local')}</p>
  <div class="card"><b>${t('more.theme')}</b>${seg('theme', [['system', t('more.sys')], ['light', t('more.light')], ['dark', t('more.dark')]])}<b>${t('more.lang')}</b>${seg('lang', [['pl', 'Polski'], ['en', 'English']])}<b>${t('more.motion')}</b>${seg('motion', [['system', t('more.motionSys')], ['off', t('more.motionOff')]])}${tog('sound', t('more.sound'))}<p class="cap" style="margin:0 0 4px">${t('more.soundNote')}</p>${tog('haptic', t('more.haptic'))}</div>
  <button class="li" style="margin-top:12px" data-a="openOb"><span class="grow t">${t('more.prefs')}</span>${ico('chev')}</button>
  <button class="li" data-a="openPage" data-id="hist"><span class="grow t">${t('more.history')}</span>${ico('chev')}</button>
  <button class="li" data-a="openPage" data-id="backup"><span class="grow t">${t('more.backup')}</span>${ico('chev')}</button>
  <button class="li" data-a="openPage" data-id="about"><span class="grow t">${t('more.about')}</span>${ico('chev')}</button>`;
}
export const TAB_VIEWS: Record<string, () => string> = { today: viewToday, sessions: viewSessions, mine: viewMine, lib: viewLib, more: viewMore };
export const navHtml = (): string => `<nav class="nav" aria-label="${t('nav.label')}"><span class="pill" id="pill"></span>${NAV.map(([k, l]) => `<button data-a="tab" data-id="${k}" data-testid="nav-${k}" ${k === store.ui.tab ? 'aria-current="page"' : ''}>${ico(k)}<span>${t(l)}</span></button>`).join('')}</nav>`;
export const navIndex = (): number => NAV.findIndex(n => n[0] === store.ui.tab);

/* ---------- pages ---------- */
const acc = (id: string, title: string, body: string, open = false): string => `<div class="acc" data-open="${open}" id="acc-${id}"><button data-a="acc" data-id="${id}" aria-expanded="${open}">${title}${ico('chev', 'ico chev')}</button><div class="body"><div><div class="inner">${body}</div></div></div></div>`;
export function pageEx(id: string): string {
  const e = exerciseById(id); if (!e) return '';
  return `${topbar(t(`type.${e.type}` as Key), `<button class="fav" data-a="fav" data-id="${e.id}" aria-pressed="${isFav(e.id)}" aria-label="${t('ex.fav')}">${ico('heart', '')}</button>`)}<div class="scroll">
  <h1 style="font-size:28px">${esc(loc(e.name))}</h1><div class="row wrap" style="margin:6px 0 14px">${ExTypeTag(e.type)}<span class="cap">${esc(areaName(e.area))} · ${esc(metaOf(e))} · ${esc(equipName(e.equip))}</span></div>
  <div class="media" data-testid="media-fallback">${e.media ? '' : `<svg viewBox="0 0 1024 1024" aria-hidden="true">${GLYPH}</svg>`}<span class="lab">${t('ex.noMedia')}</span></div>
  <p style="margin:14px 0 0">${esc(loc(e.how))}</p>
  ${acc('instr', t('ex.instr'), `<ol class="steps">${locList(e.steps).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`, true)}
  ${acc('err', t('ex.mistakes'), `<ul class="steps">${locList(e.mistakes).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
  ${acc('var', t('ex.variants'), `<p style="margin:0"><b>${t('ex.easier')}:</b> ${esc(loc(e.easier))}</p><p style="margin:6px 0 0"><b>${t('ex.harder')}:</b> ${esc(loc(e.harder))}</p>`)}
  <div class="notice" style="margin-top:14px">${ico('warn')}<div><b>${t('ex.caution')}.</b> ${esc(loc(e.caution))} ${t('ex.stopPain')}</div></div>
  ${e.qa.status === 'needs-review' ? `<div class="notice info" style="margin-top:10px" data-testid="review-note">${ico('info')}<div><b>${t('ex.review')}.</b> ${t('ex.reviewNote')}</div></div>` : ''}
  <button class="btn sec" style="width:100%;margin-top:14px" data-a="addTo" data-id="${e.id}">${ico('plus')}${t('ex.addTo')}</button></div>`;
}
export function pageSession(kind: 'template' | 'custom', id: string): string {
  const s = resolveSource(kind, id, getLang()); if (!s) return '';
  const e = estimate(s.steps); const need = equipOf(s.steps).filter(q => !store.prefs.equip.includes(q));
  return `${topbar(s.name)}<div class="scroll"><h1 style="font-size:28px">${esc(s.name)}</h1><p class="sub">${esc(s.desc)}</p>
  <div class="card row" style="gap:20px"><div><div class="met">${minutes(e.totalSec)}</div><div class="cap">${t('common.min')}</div></div><div><div class="met">${s.steps.length}</div><div class="cap">${t('ses.steps').toLowerCase()}</div></div><div class="grow cap">${esc(equipOf(s.steps).length ? equipOf(s.steps).map(equipName).join(', ') : equipName('none'))}</div></div>
  ${need.length ? `<div class="notice" style="margin-top:12px">${ico('info')}<div>${t('ses.needs', { e: need.map(equipName).join(', ') })}</div></div>` : ''}
  <h2>${t('ses.steps')}</h2>${s.steps.map((x, i) => { const ex = exerciseById(x.ex); if (!ex) return ''; const v = x.dur ?? ex.dur; const sides = x.sides ?? ex.sides;
    return `<button class="li" data-a="openEx" data-id="${ex.id}" style="min-height:60px"><span class="n" style="width:28px;height:28px;border-radius:50%;background:var(--smith-surface-muted);display:grid;place-items:center;font:700 13px var(--smith-font-display);flex:none">${i + 1}</span><div class="grow"><div class="t" style="font-size:15px">${esc(loc(ex.name))}</div><div class="m">${v} ${ex.mode === 'time' ? t('common.sec') : t('common.reps')}${sides ? ' · ' + t('common.perSide') : ''}</div></div>${ExTypeTag(ex.type)}</button>`; }).join('')}
  <div class="notice info" style="margin:6px 0 14px" data-testid="calc">${ico('info')}<div>${t('ses.calc', { p: e.phases, work: fmtClock(e.workSec), n: e.transitions, t: TRANSITION_SEC })} = <b>${fmtClock(e.totalSec)}</b>. ${t('ses.counts', { s: 4 })}</div></div>
  <button class="btn pri" data-a="startSession" data-kind="${kind}" data-id="${id}">${ico('play')}${t('ses.start')}</button>
  <button class="btn sec" style="width:100%;margin-top:10px" data-a="${kind === 'custom' ? 'editRoutine' : 'copyTemplate'}" data-id="${id}">${kind === 'custom' ? t('mine.title') : t('ses.copy')}</button></div>`;
}
const stepRow = (s: { id: string; ex: string; dur?: number; sides?: boolean }, i: number, n: number): string => {
  const e = exerciseById(s.ex); if (!e) return ''; const v = s.dur ?? e.dur; const unit = e.mode === 'time' ? t('common.sec') : t('common.reps'); const stepv = e.mode === 'time' ? 5 : 1; const sides = s.sides ?? e.sides;
  return `<div class="step" data-testid="step" data-sid="${s.id}" style="flex-wrap:wrap"><span class="n">${i + 1}</span><div class="grow"><div style="font:700 15px var(--smith-font-display)">${esc(loc(e.name))}</div></div>
  <button class="mini" data-a="mv" data-sid="${s.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="${t('mine.up')}">${ico('up')}</button><button class="mini" data-a="mv" data-sid="${s.id}" data-d="1" ${i === n - 1 ? 'disabled' : ''} aria-label="${t('mine.down')}">${ico('down')}</button><button class="mini" data-a="rmStep" data-sid="${s.id}" aria-label="${t('common.delete')}">${ico('trash')}</button>
  <div class="row" style="width:100%;padding-left:36px;justify-content:space-between"><button class="chip sm" role="switch" aria-checked="${sides}" aria-pressed="${sides}" data-a="togSides" data-sid="${s.id}">${t('mine.sides')}</button><div class="stepper" role="group" aria-label="${t('mine.duration')}"><button data-a="stepdur" data-sid="${s.id}" data-d="-${stepv}" aria-label="-">−</button><span>${v} ${unit}</span><button data-a="stepdur" data-sid="${s.id}" data-d="${stepv}" aria-label="+">+</button></div></div></div>`;
};
export const editorBody = (rid: string): { steps: string; total: string; calc: string } => {
  const r = routineById(rid); if (!r) return { steps: '', total: '', calc: '' }; const e = estimate(r.steps);
  return { steps: r.steps.map((s, i) => stepRow(s, i, r.steps.length)).join('') || `<div class="empty">${t('mine.emptySteps')}</div>`, total: fmtClock(e.totalSec), calc: t('ses.calc', { p: e.phases, work: fmtClock(e.workSec), n: e.transitions, t: TRANSITION_SEC }) };
};
export function pageEdit(id: string): string {
  const r = routineById(id); if (!r) return '';
  const b = editorBody(id);
  return `${topbar(t('mine.title'), `<button class="ib" data-a="dupRoutine" aria-label="${t('mine.duplicate')}">${ico('copy')}</button><button class="ib" data-a="delRoutine" aria-label="${t('common.delete')}" style="color:var(--smith-danger)">${ico('trash')}</button>`)}<div class="scroll">
  <label class="cap" for="rn">${t('mine.name')}</label><input class="field" id="rn" value="${esc(r.name)}" maxlength="60" style="margin-bottom:14px">
  <div class="card row" style="gap:16px;margin-bottom:12px"><div><div class="met" id="tot" data-testid="total">${b.total}</div><div class="cap">${t('mine.total')}</div></div><div class="grow cap" id="calc">${b.calc}</div></div>
  <div id="steps">${b.steps}</div>
  <button class="btn sec" style="width:100%;margin-top:6px" data-a="addEx">${ico('plus')}${t('mine.add')}</button>
  <button class="btn pri" style="margin-top:14px" data-a="saveRoutine">${t('common.save')}</button>
  <button class="btn sec" style="width:100%;margin-top:10px" data-a="startSession" data-kind="custom" data-id="${r.id}" ${r.steps.length ? '' : 'disabled'}>${ico('play')}${t('ses.start')}</button></div>`;
}
export const pageHist = (): string => `${topbar(t('hist.title'))}<div class="scroll">${store.history.length ? `<p class="cap">${t('hist.weekly', { n: store.history.filter(h => Date.now() - h.startedAt < 7 * 864e5).length })}</p>${store.history.map(histRow).join('')}` : `<div class="empty">${t('hist.empty')}</div>`}</div>`;
export const pageBackup = (): string => `${topbar(t('bk.title'))}<div class="scroll"><p class="sub">${t('bk.note')}</p><div class="cap" style="margin-bottom:10px">${t('bk.schema', { v: 1 })}</div>
  <button class="btn pri" data-a="exportBackup">${ico('download')}${t('bk.export')}</button>
  <button class="btn sec" style="width:100%;margin-top:10px" data-a="importPick">${ico('upload')}${t('bk.import')}</button>
  <input type="file" id="importFile" accept="application/json,.json" hidden aria-label="${t('bk.import')}"></div>`;
export const pageAbout = (): string => `${topbar(t('about.title'))}<div class="scroll"><div class="card" style="text-align:center"><svg class="mk" viewBox="0 0 1024 1024" style="width:72px;height:72px" aria-hidden="true">${MARK}</svg><div style="font:800 24px var(--smith-font-display);margin-top:8px">Flexsmith</div><div class="cap">${t('app.tagline')} · ${t('about.version', { v: VERSION })}</div></div>
  <div class="notice" style="margin-top:12px">${ico('warn')}<div>${t('about.disclaimer')}</div></div>
  <div class="notice info" style="margin-top:10px">${ico('info')}<div>${t('about.content', { e: EXERCISES.length, s: TEMPLATES.length })}</div></div>
  <p class="cap" style="margin-top:12px">${t('about.privacy')}</p><p class="cap">${t('about.family')}</p><p class="cap">${t('about.author')}</p></div>`;
const OB_STEPS = 6;
export function pageOnboarding(): string {
  const ob = store.ui.ob!; const d = ob.draft; const i = ob.step;
  const goal = `<h2>${t('ob.goal')}</h2><div class="seg">${INTENTS.map(k => chip(t(`intent.${k}` as Key), d.goal === k, 'obGoal', k)).join('')}</div>`;
  const time = `<h2>${t('ob.time')}</h2><div class="seg">${[5, 10, 15, 20, 30].map(m => chip(t('ob.minutes', { n: m }), d.timeMin === m, 'obTime', String(m))).join('')}</div><label class="cap" for="obCustom">${t('ob.custom')}</label><input class="field num" id="obCustom" type="number" inputmode="numeric" min="1" max="120" value="${[5, 10, 15, 20, 30].includes(d.timeMin) ? '' : d.timeMin}">`;
  const equip = `<h2>${t('ob.equip')}</h2><p class="cap">${t('ob.equipNote')}</p><div class="seg">${EQUIPS.map(k => chip(equipName(k), d.equip.includes(k), 'obEquip', k)).join('')}</div>`;
  const level = `<h2>${t('ob.level')}</h2><div role="group">${(['new', 'regular', 'experienced'] as const).map(k => `<button class="choice" aria-pressed="${d.level === k}" data-a="obLevel" data-id="${k}"><b>${t(`level.${k}` as Key)}</b><span>${t(`level.desc.${k}` as Key)}</span></button>`).join('')}</div>`;
  const focus = `<h2>${t('ob.focus')}</h2><p class="cap">${t('ob.focusNote')}</p><div class="seg">${AREAS.filter(a => a !== 'full').map(k => chip(areaName(k), d.focus.includes(k), 'obFocus', k)).join('')}</div>`;
  const limits = `<h2>${t('ob.limits')}</h2><p class="cap">${t('ob.limitsNote')}</p><div class="seg">${LIMITS.map(k => chip(t(`limit.${k}` as Key), d.limits.includes(k), 'obLimit', k)).join('')}</div>
    <h2 style="margin-top:20px">${t('ob.redTitle')}</h2><button class="toggle-wide" role="checkbox" aria-checked="${d.redFlag}" data-a="obRed" data-testid="ob-red"><span class="box" aria-hidden="true">${d.redFlag ? '✓' : ''}</span><span>${t('ob.redflag')}</span></button><p class="cap" style="margin:8px 0 0">${t('ob.redflagNote')}</p>`;
  const body = [goal, time, equip, level, focus, limits][i];
  return `<div class="hdr" style="padding:max(8px,env(safe-area-inset-top)) 16px 0"><b class="grow" style="font:800 20px var(--smith-font-display)">${t('ob.title')}</b><button class="btn ghost" data-a="obSkip">${t('ob.skip')}</button></div><div class="scroll">
  <div class="ob-dots" aria-hidden="true">${Array.from({ length: OB_STEPS }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div><p class="cap">${t('ob.step', { i: i + 1, n: OB_STEPS })}</p>${body}
  <p class="cap" style="margin-top:14px">${t('ob.later')}</p>
  <div class="row" style="margin-top:14px">${i > 0 ? `<button class="btn sec" data-a="obBack">${t('common.back')}</button>` : ''}<button class="btn pri grow" data-a="${i === OB_STEPS - 1 ? 'obFinish' : 'obNext'}" data-testid="ob-next">${i === OB_STEPS - 1 ? t('ob.finish') : t('common.next')}</button></div></div>`;
}

/* ---------- sheets ---------- */
export function sheetHtml(): string {
  const s = store.ui.sheet; if (!s) return ''; const p = store.prefs;
  if (s.t === 'adjust') return `<h3>${t('today.adjust')}</h3><b class="seg-title">${t('ob.goal')}</b><div class="seg">${INTENTS.map(k => chip(t(`intent.${k}` as Key), p.goal === k, 'setGoal', k)).join('')}</div>
    <b class="seg-title">${t('ob.time')}</b><div class="seg">${[5, 10, 15, 20, 30].map(m => chip(t('ob.minutes', { n: m }), p.timeMin === m, 'setTime', String(m))).join('')}</div>
    <b class="seg-title">${t('ob.equip')}</b><div class="seg">${EQUIPS.map(k => chip(equipName(k), p.equip.includes(k), 'setEq', k)).join('')}</div><button class="btn pri" data-a="closeSheet">${t('common.done')}</button>`;
  if (s.t === 'confirm') return `<h3>${t('common.delete')}</h3><p>${esc(s.msg)}</p><button class="btn danger" style="width:100%" data-a="confirmDelete">${t('common.delete')}</button><button class="btn sec" style="width:100%;margin-top:10px" data-a="closeSheet">${t('common.cancel')}</button>`;
  if (s.t === 'pick') { const q = s.q.toLowerCase(); const list = EXERCISES.filter(e => !q || loc(e.name).toLowerCase().includes(q) || areaName(e.area).toLowerCase().includes(q));
    return `<h3>${t('mine.add')}</h3><input class="field" id="pq" type="search" placeholder="${t('common.search')}" value="${esc(s.q)}" aria-label="${t('common.search')}" style="margin:8px 0"><div id="plist">${pickList(list)}</div>`; }
  if (s.t === 'pickRoutine') return `<h3>${t('mine.pick')}</h3>${liveRoutines().map(r => `<button class="li" data-a="addToRoutine" data-id="${r.id}">${esc(r.name)}</button>`).join('')}<button class="btn sec" style="width:100%" data-a="addToNew">${t('mine.new')}</button>`;
  if (s.t === 'import') return `<h3>${t('bk.confirm')}</h3><p>${t('bk.confirmBody', { r: s.summary.r, h: s.summary.h, cr: s.current.r, ch: s.current.h })}</p>
    ${s.plan.overwriteRoutines || s.plan.overwriteHistory ? `<p class="cap">${t('bk.collide', { r: s.plan.overwriteRoutines, h: s.plan.overwriteHistory })}</p>` : ''}
    ${s.migrated ? `<div class="notice info">${ico('info')}<div>${t('bk.migrated')}</div></div>` : ''}${s.dropped ? `<div class="notice" style="margin-top:8px">${ico('warn')}<div>${t('bk.dropped', { n: s.dropped })}</div></div>` : ''}
    <div class="row" style="margin:10px 0"><button class="chip" role="switch" aria-checked="${s.prefsToo}" aria-pressed="${s.prefsToo}" data-a="impPrefs">${t('bk.prefsToo')}</button></div>
    <button class="btn pri" style="width:100%" data-a="importMerge" data-testid="imp-merge">${t('bk.merge')}</button><p class="cap">${t('bk.mergeNote')}</p>
    <button class="btn danger" style="width:100%" data-a="importReplace" data-testid="imp-replace">${t('bk.replace')}</button><p class="cap">${t('bk.replaceNote')}</p>
    <button class="btn sec" style="width:100%" data-a="closeSheet">${t('common.cancel')}</button>`;
  return '';
}
export const pickList = (list: Exercise[]): string => list.map(e => `<button class="li" data-a="pickEx" data-id="${e.id}" style="min-height:56px"><div class="grow"><div class="t" style="font-size:15px">${esc(loc(e.name))}</div><div class="m">${esc(areaName(e.area))} · ${esc(metaOf(e))}</div></div>${ExTypeTag(e.type)}</button>`).join('') || `<div class="empty">${t('common.empty')}</div>`;
