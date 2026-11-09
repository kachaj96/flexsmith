import type { Lang, Loc } from '../content/types';
import { en } from './en';
import { pl, type Key } from './pl';

export type { Key };
const dicts: Record<Lang, Record<Key, string>> = { pl, en };
let lang: Lang = 'pl';
export const setLang = (l: Lang): void => { lang = l; if (typeof document !== 'undefined') document.documentElement.lang = l; };
export const getLang = (): Lang => lang;
export const t = (key: Key, vars: Record<string, string | number> = {}): string => dicts[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
export const loc = (o: Loc): string => o[lang];
export const locList = (o: { pl: string[]; en: string[] }): string[] => o[lang];
