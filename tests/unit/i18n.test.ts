import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { pl } from '../../src/i18n/pl';
import { setLang, t } from '../../src/i18n';

describe('i18n', () => {
  it('Polish and English have exactly the same keys and no empty values', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pl).sort());
    for (const [k, v] of Object.entries(en)) expect(v.length, k).toBeGreaterThan(0);
  });
  it('placeholders match between languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
    for (const k of Object.keys(pl) as (keyof typeof pl)[]) expect(ph(en[k]), k).toBe(ph(pl[k]));
  });
  it('t() fills placeholders in the current language', () => { setLang('pl'); expect(t('unit.exercises', { n: 5 })).toBe('5 ćwiczeń'); setLang('en'); expect(t('unit.exercises', { n: 5 })).toBe('5 exercises'); setLang('pl'); });
});
