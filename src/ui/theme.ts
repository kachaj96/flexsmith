import { setLang } from '../i18n';
import type { UserPreferences } from '../domain/types';

/** Theme, language and motion from the preferences onto <html>. Light/dark follows the system unless the person chose. */
export function applyThemeFrom(p: Pick<UserPreferences, 'theme' | 'lang' | 'motion'>): void {
  const dark = p.theme === 'dark' || (p.theme === 'system' && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
  const r = document.documentElement; r.dataset.smithTheme = dark ? 'dark' : 'light'; setLang(p.lang);
  if (p.motion === 'off') r.dataset.motion = 'reduce'; else delete r.dataset.motion;
}
