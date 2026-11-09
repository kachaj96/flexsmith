import { withoutDangling } from './domain/routine';
import { isNative } from './platform/files';
import { ACTIVE_MAX_AGE_MS, loadActive, loadFavorites, loadHistory, loadPrefs, loadRoutines, mirrorPrefs, saveActive } from './storage/db';
import { goBack, onChange, onClick, onInput } from './ui/actions';
import { closePlayer, isPlaying, onVisibility, playAction, setPlayHooks } from './ui/play';
import { render, toast, placeNav } from './ui/render';
import { initStore, store } from './ui/state';

/** Loads everything from storage, draws the first view and wires the events. Resolves when the first view is in the DOM. */
export async function startApp(root: HTMLElement, db: IDBDatabase): Promise<void> {
  const [prefs, routines, history, favs, active] = await Promise.all([loadPrefs(db), loadRoutines(db), loadHistory(db), loadFavorites(db), loadActive(db)]);
  const s = initStore({ db, root, prefs, routines: routines.map(withoutDangling), history, favs });
  mirrorPrefs(prefs);
  // an unfinished session is offered for resuming for a limited time; an older one is dropped
  if (active && active.status !== 'finished' && Date.now() - active.wallLast < ACTIVE_MAX_AGE_MS) s.saved = active;
  else if (active) await saveActive(db, null).catch(() => undefined);
  if (!prefs.onboarded) { s.ui.ob = { step: 0, draft: { ...prefs, equip: [...prefs.equip], focus: [...prefs.focus], limits: [...prefs.limits] } }; s.ui.page = { t: 'onboarding' }; }
  setPlayHooks({ onClose: () => { s.ui.tab = 'today'; s.ui.page = null; render(false); }, toast: m => toast(m) });
  render(false);
  root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', placeNav);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !isPlaying()) goBack(); });
  if (isNative()) {
    const { App } = await import('@capacitor/app');
    void App.addListener('backButton', () => {
      if (isPlaying()) { const el = document.createElement('button'); el.dataset.a = 'plMin'; playAction('plMin', el); return; }
      if (goBack()) return;
      if (store.ui.tab !== 'today') { store.ui.tab = 'today'; render(false); return; }
      void App.exitApp();
    });
  }
  void closePlayer;
}
