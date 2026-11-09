import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { startApp } from './app';
import { StorageError, openDb } from './storage/db';
import { startSplash } from './splash';
import { applyThemeFrom } from './ui/theme';
import { setLang, t } from './i18n';
import { esc } from './ui/dom';

function showFatal(root: HTMLElement, detail: string): void {
  root.innerHTML = `<div class="scroll"><div class="notice" role="alert" style="margin-top:24px"><div><b>${t('err.title')}.</b> ${esc(t('err.open', { detail }))}<div style="margin-top:12px"><button class="btn pri" id="retry" type="button">${t('common.retry')}</button></div></div></div></div>`;
  document.getElementById('retry')?.addEventListener('click', () => location.reload());
}

async function boot(): Promise<void> {
  const splash = startSplash();   // the start animation runs on its own; the app is shown when it and this init are both done
  const root = document.getElementById('app')!;
  try {
    let lang: 'pl' | 'en' = 'pl'; try { if (localStorage.getItem('flexsmith.lang') === 'en') lang = 'en'; } catch { /* default */ }
    setLang(lang); applyThemeFrom({ theme: 'system', lang, motion: 'system' });
    let db: IDBDatabase;
    try { db = await openDb(); }
    catch (e) { showFatal(root, e instanceof StorageError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : String(e)); splash.settle('failed'); return; }
    await startApp(root, db);
    splash.settle('ready');
  } catch (e) {
    showFatal(root, e instanceof Error ? e.message : String(e));   // an unexpected failure must not leave the start screen up for ever
    splash.settle('failed');
  }
}
void boot();
