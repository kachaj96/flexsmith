# Smith Design System v1: wdrożenie (Runsmith 0.9.1, Repsmith 0.11.1)

Ten plik jest taki sam w obu repo. Specyfikacja: `SMITH_DESIGN_SYSTEM_V1.md`, wartości: `smith-tokens-v1.css`.

## Mapa
- Runsmith: repo `kachaj96/running` (na GitHub `repsmith-app`), TypeScript + Vite + Capacitor 8, `dev.kachaj96.running`.
- Repsmith: repo `kachaj96/repsmith`, czysty JS bez bundlera (PWA) + Capacitor 8, `dev.kachaj96.repsmith`.
- Nic nie jest współdzielone w runtime: osobne repo, osobne stosy. Wspólne jest źródło wartości (ten katalog, identyczny w obu repo) i test, który porównuje z nim tokeny aplikacji.

## Tokeny
| Smith | Runsmith (`design/tokens.json`) | Repsmith (`app.css`) |
|---|---|---|
| bg / surface / surface-muted / surface-elevated | bg / panel / panel2 / panel3 | bg / surface / field / raised |
| text / text-secondary | ink / muted | text / muted |
| border-subtle / border-strong | line / line3 | line / edge |
| positive, danger, warning (+ soft) | ok, bad, warn (+ soft) | ok, error, warn (+ soft) |
| accent / accent-soft / on-accent | accent / accent-soft / accent-ink | accent / accent-soft / on-accent |
| glass, scrim, shadow | glass, scrim, shadow | glass, scrim, shadow |

Każda aplikacja ma aliasy `--smith-*` wskazujące na własne zmienne (stare nazwy działają). Testy: Runsmith `tests/unit/smith.test.ts`, Repsmith `tests/unit/smith_test.js`. Zmiana wartości w referencji bez zmiany w aplikacji (albo odwrotnie) wywraca test.

## Wspólne komponenty (klasy CSS, nie biblioteka)
| Smith | Runsmith | Repsmith |
|---|---|---|
| AppHeader (lockup) | `.brandbar` (nowy w 0.9.1) | `.topbar .brand` |
| BottomNav | `.nav`, `.nav-item`, `.nav-pill` | `.nav`, `.nav-inner button.on` (pigułka od 0.11.1) |
| ScreenHeading | `.page-head h1` | `h1`, `h1.mid` |
| Card | `.card` | `.card`, `.info`, `.ex-card` |
| Primary / Secondary button | `.btn.pri` / `.btn` | `.btn.primary` / `.btn` |
| Metric | `.bignum` + `.unit` | `.headline .big`, `.stat .v` |
| Chip | `.chip`, `.typechip` | `.chip`, `.tag` |
| Input | `.input` | `input, select, textarea` |
| Sheet / Modal | `dialog.sheet` | `.scrim .sheet` |
| Notice | `.notice`, `.banner` | `.banner`, `.savebar` |
| Progress | `.wo-bar`, `.pp-bar` | `.progress`, `.bar` |

Wspólne liczby: kontrolka 12 px, karta 22 px, arkusz 24 px, pigułka 999 px, przycisk główny 52 px, cel dotyku min. 44 px, ikony nawigacji 22 px, etykiety 13 px, tytuł ekranu 34 px, nazwa w nagłówku 20 px, znak 28 px, treść max 560 px, wciśnięcie skala 0,985, ruch 120/220/300 ms ze sprężyną `cubic-bezier(.2,.9,.25,1.04)` (w nowszych WebView `linear()` o tym samym przebiegu), `prefers-reduced-motion` wyłącza animacje.

Odrębne: akcent (turkus / miedź-morela), znak (pochylone R / kreski powtórzeń), zakładki (Dziś/Kalendarz/Plan/Progres/Więcej vs Dziś/Plany/Postęp/Historia/Ćwiczenia), kolory typów biegu w Runsmith.

## Kontrola
- Runsmith: `WIDTHS=320,360,390,430,768 SHOTS=<katalog> node tests/e2e/run.mjs` (audyt kontrastu, rozmiarów, przepełnienia na wszystkich ekranach, oba motywy).
- Repsmith: `NODE_PATH=<node_modules z playwright> node tests/visual/shots.mjs <katalog>` (8 ekranów z danymi, 5 szerokości, oba motywy, przepełnienie, pigułka, lockup).
