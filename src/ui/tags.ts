import type { ExType, Intent } from '../content/types';
import { t, type Key } from '../i18n';

/** Exercise kinds are always a text label with their own marker shape: the colour is only a hint. */
const SHAPE: Record<ExType, { cls: string; c: string }> = {
  dynamic: { cls: '', c: 'var(--t-prep)' }, mobility: { cls: 'di', c: 'var(--t-mob)' }, static: { cls: 'sq', c: 'var(--t-stat)' }, control: { cls: 'ci', c: 'var(--smith-accent)' }, roll: { cls: 'tr', c: 'var(--t-roll)' },
};
export const ExTypeTag = (type: ExType): string => `<span class="tag ${SHAPE[type].cls}" style="--c:${SHAPE[type].c}"><i></i>${t(`type.${type}` as Key)}</span>`;
export const intentTagType = (i: Intent): ExType => (i === 'wind' ? 'static' : i === 'mob' ? 'mobility' : i === 'roll' ? 'roll' : i === 'gen' ? 'control' : 'dynamic');
