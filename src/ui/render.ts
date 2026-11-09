import { applyThemeFrom } from './theme';
import { editorBody, navHtml, navIndex, pageAbout, pageBackup, pageEdit, pageEx, pageHist, pageOnboarding, pageSession, sheetHtml, TAB_VIEWS } from './views';
import { store } from './state';
import { t } from '../i18n';
import { esc } from './dom';

/* One render path: the main tab view and the bottom navigation, then overlays (page, sheet, toast). The player is its own overlay (play.ts). */
let first = true; let prevTab: number | undefined;
export function render(keepScroll = true): void {
  applyThemeFrom(store.prefs);
  const root = store.root; const old = root.querySelector<HTMLElement>('#main'); const y = keepScroll && old ? old.scrollTop : 0;
  root.querySelectorAll('#main,.nav').forEach(n => n.remove());
  const main = document.createElement('div'); main.className = 'scroll'; main.id = 'main'; main.innerHTML = TAB_VIEWS[store.ui.tab]!();
  root.prepend(main); root.insertAdjacentHTML('beforeend', navHtml()); main.scrollTop = y;
  const idx = navIndex(); const pill = document.getElementById('pill');
  if (pill) { if (!first && prevTab !== undefined && prevTab !== idx) { place(prevTab, false); void pill.offsetWidth; place(idx, true); } else place(idx, false); }
  first = false; prevTab = idx;
  renderOverlays();
}
function place(idx: number, animate: boolean): void {
  const nav = document.querySelector<HTMLElement>('.nav'); const pill = document.getElementById('pill'); const b = nav?.querySelectorAll<HTMLElement>('button')[idx]; if (!nav || !pill || !b) return;
  pill.style.transition = animate ? '' : 'none'; pill.style.width = `${b.offsetWidth}px`; pill.style.transform = `translateX(${b.offsetLeft}px)`;
}
export const placeNav = (): void => place(navIndex(), false);
export function pageHtml(): string {
  const p = store.ui.page; if (!p) return '';
  switch (p.t) { case 'ex': return pageEx(p.id); case 'session': return pageSession(p.kind, p.id); case 'edit': return pageEdit(p.id); case 'hist': return pageHist(); case 'about': return pageAbout(); case 'backup': return pageBackup(); case 'onboarding': return pageOnboarding(); }
}
/* A page or a sheet that is only redrawn (a choice was tapped) keeps its scroll position and does NOT replay the entrance animation:
   replaying it faded the page in from transparent, which showed the screen underneath for a moment. */
let shownPage = ''; let shownSheet = '';
const pageKey = (): string => { const p = store.ui.page; return p ? `${p.t}:${'id' in p ? p.id : ''}` : ''; };
export function renderOverlays(): void {
  const root = store.root;
  const oldPage = root.querySelector<HTMLElement>('.page'); const pageY = oldPage?.querySelector<HTMLElement>('.scroll')?.scrollTop ?? 0;
  const oldSheet = root.querySelector<HTMLElement>('.sheet'); const sheetY = oldSheet?.scrollTop ?? 0;
  root.querySelectorAll('.page,.sheet,.scrim,.toast').forEach(n => n.remove());
  const ph = pageHtml(); const pk = pageKey(); const samePage = !!ph && pk === shownPage && !!oldPage;
  if (ph) { const el = document.createElement('div'); el.className = samePage ? 'page still' : 'page'; el.setAttribute('role', 'region'); el.innerHTML = ph; root.append(el); if (samePage) { const sc = el.querySelector<HTMLElement>('.scroll'); if (sc) sc.scrollTop = pageY; } }
  shownPage = ph ? pk : '';
  const sh = sheetHtml(); const sk = store.ui.sheet?.t ?? ''; const sameSheet = !!sh && sk === shownSheet && !!oldSheet;
  if (sh) { const sc = document.createElement('div'); sc.className = 'scrim'; if (sameSheet) sc.style.animation = 'none'; sc.dataset.a = 'closeSheet'; root.append(sc); const el = document.createElement('div'); el.className = sameSheet ? 'sheet still' : 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.innerHTML = sh; root.append(el); if (sameSheet) el.scrollTop = sheetY; }
  shownSheet = sh ? sk : '';
  const tt = store.ui.toast;
  if (tt) { const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.innerHTML = `<span class="grow">${esc(tt.msg)}</span>${tt.undo ? `<button data-a="undo">${t('common.undo')}</button>` : ''}`; root.append(el); }
}
let timer = 0;
export function toast(msg: string, undo?: () => void): void {
  store.ui.toast = { msg, ...(undo ? { undo } : {}) }; renderOverlays(); clearTimeout(timer);
  timer = window.setTimeout(() => { store.ui.toast = null; store.root.querySelector('.toast')?.remove(); }, 5000);
}
export function redrawEditor(rid: string): void {
  const b = editorBody(rid); const s = document.getElementById('steps'); if (s) s.innerHTML = b.steps;
  const tot = document.getElementById('tot'); if (tot) tot.textContent = b.total; const c = document.getElementById('calc'); if (c) c.textContent = b.calc;
}
