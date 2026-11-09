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
export function renderOverlays(): void {
  const root = store.root; root.querySelectorAll('.page,.sheet,.scrim,.toast').forEach(n => n.remove());
  const ph = pageHtml();
  if (ph) { const el = document.createElement('div'); el.className = 'page'; el.setAttribute('role', 'region'); el.innerHTML = ph; root.append(el); }
  const sh = sheetHtml();
  if (sh) { const sc = document.createElement('div'); sc.className = 'scrim'; sc.dataset.a = 'closeSheet'; root.append(sc); const el = document.createElement('div'); el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.innerHTML = sh; root.append(el); }
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
