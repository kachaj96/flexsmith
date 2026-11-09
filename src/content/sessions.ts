import type { Intent, Loc, RoutineTemplate, TemplateStep } from './types';

/* 13 curated sessions. Read-only: a user customises a copy (a CustomRoutine). `opt` marks steps that are dropped first when the time is short. */
const l = (pl: string, en: string): Loc => ({ pl, en });
const s = (ex: string, dur?: number, opt = false): TemplateStep => ({ ex, ...(dur !== undefined ? { dur } : {}), ...(opt ? { opt: true } : {}) });
const T = (id: string, intent: Intent, name: Loc, desc: Loc, steps: TemplateStep[], tags: string[]): RoutineTemplate => ({ id, intent, name, desc, steps, tags });

export const TEMPLATES: RoutineTemplate[] = [
  T('prerun', 'prep', l('Przed biegiem', 'Before a run'), l('Podnosi tętno i budzi kostki, biodra i łydki. Bez długich rozciągań statycznych.', 'Raises heart rate and wakes ankles, hips and calves. No long static stretches.'),
    [s('march'), s('swingfb'), s('rocks'), s('calfraise', undefined, true), s('lungerot', undefined, true)], ['run']),
  T('prestrength', 'prep', l('Przed siłownią', 'Before strength'), l('Biodra, odcinek piersiowy i kostki przed przysiadem lub martwym ciągiem.', 'Hips, thoracic spine and ankles before squats or deadlifts.'),
    [s('march', 20), s('h9090'), s('openbook'), s('squatprep', undefined, true), s('rocks', undefined, true)], ['strength']),
  T('warmfull', 'prep', l('Rozgrzewka całego ciała', 'Full-body warm-up'), l('Dłuższa, ogólna rozgrzewka.', 'A longer, general warm-up.'),
    [s('march'), s('armcircles'), s('swingfb'), s('swinglat', undefined, true), s('catcow'), s('lungerot'), s('rocks', undefined, true), s('calfraise', undefined, true)], ['general']),
  T('bandprep', 'prep', l('Aktywacja z gumami', 'Band activation'), l('Pośladki, plecy i barki z minibandem i taśmą, przed treningiem nóg lub biegiem.', 'Glutes, back and shoulders with a mini band and a long band, before leg work or a run.'),
    [s('clamshell'), s('glutebridge'), s('pullapart'), s('birddog', undefined, true)], ['bands']),
  T('postrun', 'wind', l('Po biegu: wyciszenie', 'After a run: wind-down'), l('Spokojne, krótkie rozciąganie łydek, bioder i tyłu uda. Dla komfortu, nie "wypłukiwania kwasu mlekowego".', 'Calm, short stretching of calves, hips and hamstrings. For comfort, not for "flushing lactic acid".'),
    [s('calfst'), s('hipflex'), s('hamst'), s('fig4', undefined, true), s('quadst', undefined, true)], ['run']),
  T('poststrength', 'wind', l('Po siłowni: wyciszenie', 'After strength: wind-down'), l('Łagodne rozciąganie klatki, bioder i ud po treningu siłowym.', 'Gentle stretching of chest, hips and thighs after strength work.'),
    [s('doorway'), s('quadst'), s('hamst'), s('fig4', undefined, true), s('crossbody', undefined, true)], ['strength']),
  T('hipmob', 'mob', l('Mobilność bioder', 'Hip mobility'), l('Rotacja i zakres w biodrach, na macie.', 'Hip rotation and range on a mat.'),
    [s('windshield'), s('h9090'), s('hipflex'), s('lungerot', undefined, true), s('fig4', undefined, true)], ['hips']),
  T('ankles', 'mob', l('Kostki i łydki', 'Ankles and calves'), l('Ruchomość kostki, siła przedniej części podudzia i spokojne rozciągnięcie łydki.', 'Ankle mobility, front-of-shin strength and a calm calf stretch.'),
    [s('anklecircles'), s('rocks'), s('tibraise'), s('calfraise', undefined, true), s('calfst', undefined, true)], ['ankle']),
  T('shouldthor', 'mob', l('Barki i odcinek piersiowy', 'Shoulders and thoracic spine'), l('Rotacja i wyprost górnej części pleców oraz kontrola barków.', 'Rotation and extension of the upper back and shoulder control.'),
    [s('catcow'), s('openbook'), s('threadneedle'), s('wallslide', undefined, true), s('doorway', undefined, true)], ['shoulders']),
  T('desk', 'gen', l('Przerwa od siedzenia', 'Desk break'), l('Pięć minut ruchu bez sprzętu i bez przebierania się.', 'Five minutes of movement with no equipment and no change of clothes.'),
    [s('march'), s('doorway'), s('calfraise', undefined, true), s('armcircles', undefined, true)], ['desk']),
  T('gentle', 'gen', l('Łagodny dzień regeneracji', 'Gentle recovery day'), l('Spokojny ruch w komfortowym zakresie, bez wysiłku.', 'Calm movement in a comfortable range, no effort.'),
    [s('catcow'), s('windshield'), s('childpose'), s('adductor', undefined, true), s('openbook', undefined, true)], ['recovery']),
  T('rolllegs', 'roll', l('Rolowanie nóg (opcjonalne)', 'Leg rolling (optional)'), l('Rolowanie łydek i ud, na końcu krótkie rozciąganie. Daje krótkotrwałe uczucie rozluźnienia, nie jest konieczne.', 'Rolling of calves and thighs with a short stretch at the end. It can feel relaxing for a while, it is not required.'),
    [s('rollcalf'), s('rollquad'), s('rollhams', undefined, true), s('calfst', 30, true)], ['run']),
  T('rollupper', 'roll', l('Rolowanie górnej części pleców (opcjonalne)', 'Upper-back rolling (optional)'), l('Łagodne rolowanie okolicy łopatek i otwarcie klatki.', 'Gentle rolling around the shoulder blades and a chest opening.'),
    [s('rollback'), s('doorway', undefined, true), s('catcow', undefined, true)], ['desk']),
];
export const templateById = (id: string): RoutineTemplate | undefined => TEMPLATES.find(t => t.id === id);
