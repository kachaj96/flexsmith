import { exerciseById } from '../content/exercises';
import type { StepLike } from '../domain/estimate';
import { adjust, back, complete, createPlayer, finish, msLeft, pause, restore, resume, skip, swap, tick, toInstance, type Clock, type PlayerState } from '../domain/player';
import { alternativesFor } from '../domain/recommend';
import { newId } from '../domain/routine';
import { loc, locList, t, type Key } from '../i18n';
import { put, saveActive } from '../storage/db';
import { esc, ico } from './dom';
import { store } from './state';
import { ExTypeTag } from './tags';

/* The guided player UI. All timing lives in domain/player.ts (pure, tested): this file only feeds it the two clocks from rAF,
   visibilitychange and every action, draws the state, and saves a snapshot at every change of phase or status. */
interface Ctl { s: PlayerState; raf: number; anim: boolean; swaps: number; lock: WakeLockSentinel | null; notice: string; saveErr: boolean }
let ctl: Ctl | null = null;
let hooks: { onClose: () => void; toast: (m: string) => void } = { onClose: () => undefined, toast: () => undefined };
export const setPlayHooks = (h: typeof hooks): void => { hooks = h; };
export const isPlaying = (): boolean => !!ctl;
const clock = (): Clock => ({ mono: performance.now(), wall: Date.now() });
const host = (): HTMLElement => { let el = document.getElementById('player'); if (!el) { el = document.createElement('div'); el.id = 'player'; el.setAttribute('role', 'region'); store.root.append(el); } return el; };

function persist(): void { if (!ctl) return; if (ctl.s.status === 'finished') return; void saveActive(store.db, ctl.s).catch(() => { if (ctl) ctl.saveErr = true; }); }
async function lock(on: boolean): Promise<void> {
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<WakeLockSentinel> } }).wakeLock; if (!wl) return;
    if (on && ctl && !ctl.lock) ctl.lock = await wl.request('screen');
    if (!on && ctl?.lock) { await ctl.lock.release(); ctl.lock = null; }
  } catch { /* not available or refused: the session works without it */ }
}
function cue(): void {
  if (store.prefs.haptic && navigator.vibrate) navigator.vibrate(60);
  if (store.prefs.sound) { try { const A = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; const a = new A(); const o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); g.gain.value = 0.04; o.frequency.value = 660; o.start(); o.stop(a.currentTime + 0.12); } catch { /* no audio */ } }
}

export function startPlay(source: { kind: 'template' | 'custom'; id: string }, name: string, steps: StepLike[]): boolean {
  const s = createPlayer(source, name, steps, clock()); if (!s) return false;
  ctl = { s, raf: 0, anim: true, swaps: 0, lock: null, notice: '', saveErr: false }; store.saved = null; persist(); void lock(true); draw(); loop(); return true;
}
export function resumeSaved(): boolean {
  const snap = store.saved; if (!snap) return false;
  ctl = { s: restore(snap, clock()), raf: 0, anim: true, swaps: 0, lock: null, notice: t('pl.resumed'), saveErr: false }; store.saved = null; draw(); loop(); return true;
}

function apply(next: PlayerState, opts: { redraw?: boolean } = {}): void {
  if (!ctl) return; const before = ctl.s; ctl.s = next;
  const phaseChanged = next.i !== before.i || next.status !== before.status; const auto = phaseChanged && next.status === 'running' && next.i > before.i;
  if (phaseChanged) { ctl.anim = true; ctl.notice = ''; if (auto) cue(); persist(); if (next.status === 'finished') { cancelAnimationFrame(ctl.raf); void lock(false); drawFinish(); return; } }
  if (opts.redraw || phaseChanged) draw(); else paint();
}
function loop(): void { if (!ctl) return; cancelAnimationFrame(ctl.raf); ctl.raf = requestAnimationFrame(() => { if (!ctl || ctl.s.status === 'finished') return; apply(tick(ctl.s, clock())); loop(); }); }
/** App went to the background and came back, or the screen was unlocked: reconcile with the clocks right away. */
export function onVisibility(): void {
  if (!ctl || ctl.s.status === 'finished') return;
  if (document.hidden) { ctl.s = tick(ctl.s, clock()); persist(); return; }
  apply(tick(ctl.s, clock())); void lock(ctl.s.status === 'running');
}

const sideLabel = (side: 'L' | 'R' | null): string => (side === 'L' ? t('pl.left') : side === 'R' ? t('pl.right') : '');
function paint(): void {
  if (!ctl) return; const p = ctl.s.phases[ctl.s.i]!; if (p.mode !== 'time') return;
  const l = msLeft(ctl.s, clock()) / 1000; const tl = document.getElementById('tl'); if (tl) tl.textContent = String(Math.ceil(l));
  const fg = document.getElementById('rfg'); if (fg) fg.setAttribute('stroke-dashoffset', (490.1 * (1 - l / Math.max(1, p.val))).toFixed(1));
}
function draw(): void {
  if (!ctl) return; const s = ctl.s; const p = s.phases[s.i]!; const e = exerciseById(p.ex)!; const n = s.phases.length; const next = s.phases[s.i + 1]; const nx = next && exerciseById(next.ex);
  const running = s.status === 'running'; const el = host();
  el.setAttribute('aria-label', s.name);
  el.innerHTML = `<div class="pl-top"><button class="ib" data-a="plMin" aria-label="${t('pl.minimise')}" data-testid="pl-min">${ico('close')}</button><div style="text-align:center"><div class="cap">${esc(s.name)}</div><div style="font:700 14px var(--smith-font-display)" data-testid="pl-step">${t('pl.step', { i: s.i + 1, n })}</div></div><div style="width:44px"></div></div>
  <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${s.i}"><i style="width:${(s.i / n) * 100}%"></i></div>
  <div class="pl-body"><div class="${ctl.anim ? 'pl-step' : ''}" style="display:flex;flex-direction:column;gap:12px">
    <div style="text-align:center;margin-top:10px">${ExTypeTag(e.type)}<h1 style="font-size:26px;margin:8px 0 0" data-testid="pl-name">${esc(loc(e.name))}</h1></div>
    ${p.side ? `<span class="side" data-testid="pl-side">${t('pl.side')}: ${sideLabel(p.side)}</span>` : ''}
    ${ctl.notice ? `<div class="notice info">${ico('info')}<div>${esc(ctl.notice)}</div></div>` : ''}
    ${p.mode === 'time' ? `<div class="ring" role="timer"><svg viewBox="0 0 176 176" aria-hidden="true"><circle class="bg" cx="88" cy="88" r="78"/><circle class="fg" id="rfg" cx="88" cy="88" r="78" stroke-dasharray="490.1" stroke-dashoffset="0"/></svg><div class="val"><b id="tl" data-testid="pl-time">${Math.ceil(msLeft(s, clock()) / 1000)}</b><span>${t('pl.secLeft')}</span></div></div>`
      : `<div class="ring"><svg viewBox="0 0 176 176" aria-hidden="true"><circle class="bg" cx="88" cy="88" r="78"/></svg><div class="val"><b data-testid="pl-reps">${p.val}</b><span>${t('pl.repsTarget')}</span></div></div>`}
    <div class="card" style="padding:12px 14px"><div style="font-size:15px">${esc(loc(e.how))}</div><ol class="steps" style="margin-top:8px;font-size:14px;color:var(--smith-text-secondary)">${locList(e.steps).map(x => `<li>${esc(x)}</li>`).join('')}</ol><div class="cap" style="margin-top:8px">${esc(t('pl.stopHint'))}</div></div>
    ${nx ? `<div class="cap" style="text-align:center">${t('pl.nextUp')}: <b>${esc(loc(nx.name))}${next!.side ? ' · ' + sideLabel(next!.side) : ''}</b></div>` : ''}
  </div></div>
  <div class="ctl"><button class="sidebtn" data-a="plPrev" aria-label="${t('pl.prev')}" data-testid="pl-prev">${ico('skipb')}${t('pl.prev')}</button>
    ${p.mode === 'time' ? `<button class="big" data-a="plPause" aria-label="${running ? t('pl.pause') : t('pl.resume')}" data-testid="pl-pause">${running ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>'}</button>`
      : `<button class="big" data-a="plDone" aria-label="${t('pl.done')}" data-testid="pl-done"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`}
    <button class="sidebtn" data-a="plNext" aria-label="${t('pl.next')}" data-testid="pl-next">${t('pl.next')}${ico('skip')}</button></div>
  <div class="ctl2"><button class="btn sec" data-a="plAdj" data-d="-${p.mode === 'time' ? 10 : 1}" aria-label="${t('pl.adjust')}">−${p.mode === 'time' ? '10 ' + t('common.sec') : '1'}</button><button class="btn sec" data-a="plAdj" data-d="${p.mode === 'time' ? 10 : 1}" aria-label="${t('pl.adjust')}">+${p.mode === 'time' ? '10 ' + t('common.sec') : '1'}</button><button class="btn sec" data-a="plSwap" data-testid="pl-swap">${ico('swap')}${t('pl.swap')}</button><button class="btn ghost" data-a="plFinish" data-testid="pl-finish">${t('pl.finish')}</button></div>
  <div class="sr" aria-live="polite">${esc(loc(e.name))} ${sideLabel(p.side)}</div>`;
  ctl.anim = false; paint();
}
function drawFinish(): void {
  if (!ctl) return; const s = ctl.s; const inst = toInstance(s, 'tmp'); const complete = inst.status === 'completed'; const el = host();
  el.innerHTML = `<div class="pl-top"><div style="width:44px"></div><b style="font:700 17px var(--smith-font-display)" data-testid="pl-result">${t(complete ? 'pl.complete' : 'pl.partial')}</b><div style="width:44px"></div></div><div class="pl-body" style="text-align:center">
    ${complete ? `<svg class="check" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="36" pathLength="1"/><path d="M26 43l11 11 21-24" pathLength="1"/></svg>` : ''}
    <div class="card row" style="justify-content:center;gap:28px"><div><div class="met" data-testid="pl-actual">${fmt(inst.activeSec)}</div><div class="cap">${t('pl.actual')}</div></div><div><div class="met" style="color:var(--smith-text-secondary)" data-testid="pl-planned">${fmt(inst.plannedSec)}</div><div class="cap">${t('pl.planned')}</div></div></div>
    ${s.modified || s.results.some(r => r.outcome === 'swapped' || r.swappedFrom) ? `<p class="cap">${t('pl.modified')}</p>` : ''}
    <div style="text-align:left"><b>${t('pl.comfort')}</b><div class="seg" id="cm">${([['ok', 'pl.cOk'], ['strong', 'pl.cStrong'], ['discomfort', 'pl.cBad']] as [string, Key][]).map(([k, l]) => `<button class="chip" aria-pressed="false" data-a="plCmf" data-id="${k}">${t(l)}</button>`).join('')}</div>
    <div class="notice" id="discomfort" hidden>${ico('warn')}<div>${t('pl.discomfortNote')}</div></div>
    <label class="cap" for="nt">${t('pl.note')}</label><input class="field" id="nt" maxlength="200"></div></div>
    <button class="btn pri" data-a="plSave" data-testid="pl-save">${t('common.save')}</button>`;
}
const fmt = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** Handles the player's data-a actions. Returns true when it consumed the action. */
export function playAction(a: string, el: HTMLElement): boolean {
  if (!ctl) return false; const now = clock(); const s = ctl.s;
  switch (a) {
    case 'plPause': apply(s.status === 'running' ? pause(s, now) : resume(s, now), { redraw: true }); persist(); void lock(ctl.s.status === 'running'); return true;
    case 'plNext': apply(skip(s, now)); return true;
    case 'plDone': apply(complete(s, now)); return true;
    case 'plPrev': apply(back(s, now), { redraw: true }); ctl.anim = true; persist(); return true;
    case 'plAdj': apply(adjust(s, Number(el.dataset.d), now), { redraw: true }); persist(); return true;
    case 'plSwap': {
      const cur = s.phases[s.i]!; const used = s.phases.map(p => p.ex);
      const alts = alternativesFor(cur.ex, store.prefs, used);
      if (!alts.length) { hooks.toast(t('pl.noAlt')); return true; }
      const pick = alts[ctl.swaps++ % alts.length]!; apply(swap(s, pick.id, now), { redraw: true }); persist(); hooks.toast(t('pl.swapped', { n: loc(pick.name) })); return true;
    }
    case 'plFinish': apply(finish(s, now)); if (ctl.s.status !== 'finished') { /* already handled */ } return true;
    case 'plMin': { const sn = pause(s, now); ctl.s = sn; void saveActive(store.db, sn); store.saved = sn; close(); hooks.onClose(); return true; }
    case 'plCmf': { document.querySelectorAll<HTMLElement>('#cm .chip').forEach(b => b.setAttribute('aria-pressed', b === el ? 'true' : 'false')); const d = document.getElementById('discomfort'); if (d) d.hidden = el.dataset.id !== 'discomfort'; return true; }
    case 'plSave': { void savePlay(); return true; }
  }
  return false;
}
async function savePlay(): Promise<void> {
  if (!ctl) return; const sel = document.querySelector<HTMLElement>('#cm .chip[aria-pressed="true"]'); const note = (document.getElementById('nt') as HTMLInputElement | null)?.value.trim() ?? '';
  const inst = toInstance(ctl.s, newId('h')); const comfort = (sel?.dataset.id as 'ok' | 'strong' | 'discomfort' | undefined) ?? null;
  inst.checkIn = { comfort, note, modified: ctl.s.modified || ctl.s.results.some(r => !!r.swappedFrom) };
  try { await put(store.db, 'history', inst); store.history = [inst, ...store.history]; await saveActive(store.db, null); store.saved = null; }
  catch { hooks.toast(t('bk.err.write')); return; }
  close(); hooks.onClose();
}
function close(): void { if (!ctl) return; cancelAnimationFrame(ctl.raf); void lock(false); ctl = null; document.getElementById('player')?.remove(); }
export const closePlayer = close;
export const currentName = (): string => ctl?.s.name ?? '';
export const playState = (): PlayerState | null => ctl?.s ?? null;
