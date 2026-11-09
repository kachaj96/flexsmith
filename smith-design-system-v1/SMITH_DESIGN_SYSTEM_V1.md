# Smith Design System v1.0

**Rodzina:** Runsmith (bieganie) + Repsmith (trening siłowy)  
**Status:** specyfikacja do wdrożenia i weryfikacji w repozytorium  
**Źródło:** audyt plików `Runsmith-proba.html` i `Repsmith-proba.html` dostarczonych 2026-11-08.  
**Cel:** rozpoznawalność jednej rodziny produktów **bez utraty odrębności funkcji i bez regresji**.

> **Zakres pewności:** poniżej rozdzielono wartości zaobserwowane w HTML (**ISTNIEJE**) od docelowych decyzji projektowych (**STANDARD V1**). Pliki próbne nie potwierdzają struktury repozytorium, kodu źródłowego aplikacji, działania APK ani kompletności workflow. Ustalić to w repo przed migracją.

## 0. Zasada przewodnia

**Same family, different discipline.** Podobny język wizualny, inne zadania. Użytkownik ma rozpoznać wspólną markę po 2 sekundach, ale nie może pomylić Runsmith z Repsmith.

- **Wspólne:** typografia, neutralne powierzchnie, proporcje, header/brand lockup, system kart, przyciski, pola, dialogi, dolna nawigacja, ikonografia, animacje, dostępność, stany.
- **Zmienne produktowe:** logo-glyph, kolor akcentu, nazwa, nawigacyjne zakładki, rodzaje treningów, metryki, szczegóły kart, ścieżki treningowe.
- **Nietykalne:** modele danych, działające funkcje, preferencje użytkownika, zachowanie zapisu / backupu, istniejące kluczowe ścieżki, unikatowe moduły każdej aplikacji.
- **Wspólne komponenty ≠ identyczna zawartość.** Jednolita `SmithCard` może wyświetlać dystans albo serie/RPE bez naśladowania drugiego produktu.

## 1. Obecny stan — ustalenia z obu plików

| Element | Runsmith — stan istniejący | Repsmith — stan istniejący | Wniosek V1 |
|---|---|---|---|
| Tło light | `#F4F5F6` | `#F4F5F6` | Zachować wspólny token |
| Tło dark | `#0B0E11` | `#0B0E11` | Zachować wspólny token |
| Surface light/dark | `#FFFFFF` / `#161A1F` | `#FFFFFF` / `#161A1F` | Zachować |
| Second surface | `#EEF1F3` / `#20262D` | `#EEF1F3` / `#20262D` | Zachować |
| Tekst light/dark | `#151A21` / `#E9EDF1` | `#12161B` / `#ECEFF2` | Delikatna różnica: ujednolicić na `#151A21` / `#E9EDF1` po sprawdzeniu kontrastu i screenshotów |
| Secondary text | `#56606D` / `#A3ADB8` | `#56606B` / `#A3ADB8` | Ujednolicić na `#56606D` / `#A3ADB8` |
| Akcent light | `#1D6B73` | `#A84B24` | **Zachować odrębne** |
| Akcent dark | `#5FB8BF` | `#FF9F70` | **Zachować odrębne** |
| Display/body | Manrope / Inter | Manrope / Inter | Wspólna skala i wagi |
| Motion | krzywe spring/bouncy | identyczne krzywe spring/bouncy | Jeden system ruchu |
| Shadow | bardzo zbliżony | bardzo zbliżony | Wspólne tokeny |
| Header marki | głównie nagłówek ekranu (np. „Dziś”) | widoczny glyph + „Repsmith” | Dodać w Runsmith kompaktowy brand header |
| Bottom nav | 5 sekcji, aktywna zakładka w pigułce | 5 sekcji, akcentowana ikona/etykieta | Jeden komponent, z wariantem wyraźnej aktywnej zakładki |
| Ustawienia | motyw, język, backup i inne | ustawienia dostępne z ikony w nagłówku | Ujednolicić wygląd, niekoniecznie lokalizację bez oceny flow |

## 2. Brand architecture

### 2.1 Stały brand lockup — STANDARD V1

- `BrandMark` 28×28 lub 32×32 px, identyczny kształt zewnętrznego kafelka; promień narożników proporcjonalny do rozmiaru.
- Glyph biały / kontrastowy, o podobnej grubości linii, optycznej wielkości i pochyleniu. **Nie zastępować ikon obecnymi symbolami Apple ani znakami prawnie chronionymi.**
- `BrandName`: Runsmith lub Repsmith, Manrope 700–800, 18–20 px, odstępy jak w istniejącym Repsmith.
- Header produktu stale obecny na głównych ekranach. Tytuł aktualnego widoku jako **osobna** hierarchia (np. „Dziś”, „Plan”, „Postęp”).
- Nie dublować nagłówka na kompaktowych ekranach: jeżeli header i title są zbyt wysokie, zmniejszyć pionowe odstępy, a nie usuwać ważnych akcji.
- W Repsmith zachować symbol nawiązujący do siły. W Runsmith zachować pochylone R nawiązujące do biegu. Dopasować ich optyczną grubość/skalę.
- Kolor akcentu nie może być jedyną metodą odróżniania aplikacji — zawsze glyph i nazwa.

### 2.2 Produktowe akcenty — **ISTNIEJE, zachować**

| Produkt | Light | Dark | Light soft | Dark soft | Główna asocjacja |
|---|---|---|---|---|---|
| Runsmith | `#1D6B73` | `#5FB8BF` | `#E0F0F1` | `#15292C` | Ruch, wytrzymałość |
| Repsmith | `#A84B24` | `#FF9F70` | `#FBE9E1` | `#3A2117` | Siła, obciążenie |

## 3. Design tokens — STANDARD V1

Plik `smith-tokens-v1.css` zawiera **referencyjną mapę semantyczną**. W istniejącym repo zachować dotychczasowe aliasy (`--panel`, `--surface`, `--ink`, `--text`, itd.) do czasu migracji. Nie zastępować każdego wystąpienia CSS „na ślepo”.

### 3.1 System bazowy

| Token | Light | Dark |
|---|---|---|
| `--smith-bg` | `#F4F5F6` | `#0B0E11` |
| `--smith-surface` | `#FFFFFF` | `#161A1F` |
| `--smith-surface-muted` | `#EEF1F3` | `#20262D` |
| `--smith-surface-elevated` | `#E3E7EB` | `#2A3139` |
| `--smith-text` | `#151A21` | `#E9EDF1` |
| `--smith-text-secondary` | `#56606D` | `#A3ADB8` |
| `--smith-border-subtle` | `#E4E8EC` | `#2A3139` |
| `--smith-border-strong` | `#7E8893` | `#6B7580` |
| `--smith-positive` | `#22663D` | `#7FD39F` |
| `--smith-danger` | `#B8322A` | `#FF9A8F` |
| `--smith-warning` | `#8F4F00` | `#F2B866` |
| `--smith-glass` | `rgba(248,249,250,.78)` | `rgba(20,24,29,.78)` |

Kolory statusów *nie mogą być zamieniane z kolorami kategorii treningowych*. `Race`, `Quality` czy `Long Run` to **typ** aktywności, nie błąd lub sukces.

### 3.2 Skala — **nowy standard projektowy, nie twierdzenie o obecnym kodzie**

- Spacing: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40` px. Domyślny gutter mobilny 16 px.
- Radii: kontrolka `12`, karta `20–24`, modal `24`, pill `999` px. Nie mieszać 6 podobnych radiusów w tym samym ekranie.
- Typography: `caption 12/16`, `label 13/18`, `body 15–16/22–24`, `card-title 17–18/24`, `screen-title 30–34/36–40`, `metric 28–40` px zależnie od kontekstu.
- Font: Manrope dla marek, nagłówków, liczb; Inter dla treści/formularzy. Użyj **istniejących legalnie dostarczonych fontów** w projektach. **Nie kopiuj fontów poza repo / nie dodawaj plików do publicznych artefaktów.**
- Min. touch target: 44×44 px, preferowane 48×48 px dla głównych przycisków.
- Szerokość contentu w trybie mobilnym: pełny viewport minus guttery; max-width dla widoku web/mobile-preview ustalić wspólnie po audycie aktualnych wartości (propozycja `560px`).
- Elevation: bazowe karty bez twardej ramki, ze wspólnym cieniem; obrzeże gdy konieczne dla kontrastu. Blur tylko dla warstw nawigacyjnych i modalnych, nie dla każdej karty.

### 3.3 Motion

- Tokeny: `fast=120ms`, `standard=220ms`, `deliberate=300ms`.
- Easing spring: `cubic-bezier(.2,.9,.25,1.04)`; easing bouncy: `cubic-bezier(.3,1.4,.5,1)` — **obecne w obu plikach**.
- `tap`: scale 0.985–0.99, bez „skakania”. `expand`: opacity + transform, 180–260ms. `tab`: 180–240ms. `sheet`: 220–300ms.
- Animuj *stan*, nie aktywność dekoracyjną w nieskończoność. Wpis do kalendarza, zmiana planu, ukończenie serii / biegu — tak. Wieczne pulsowanie kart — nie.
- `prefers-reduced-motion: reduce`: wyłączyć efekty złożone, zostawić natychmiastową komunikację stanu. Nie blokować kliknięć podczas animacji.
- Android: priorytet płynnego 30/60 fps i natywnego zachowania systemu. Motion nie może pogarszać dostępności.

## 4. Wspólne komponenty — STANDARD V1

| Komponent / wzorzec | Wspólna specyfikacja | Dostosowanie produktu |
|---|---|---|
| `SmithAppHeader` | lockup z lewej, akcja kontekstowa z prawej, safe-area | tekst i glyph produktu, działania prawej strony |
| `SmithBottomNav` | max 5 elementów, stała wysokość, równe obszary dotyku, ikonki outline 20–22px; zaznaczony item: soft accent pill + tekst | Runsmith: Dziś / Kalendarz / Plan / Progres / Więcej. Repsmith: Dziś / Plany / Postęp / Historia / Ćwiczenia. **Nie wymuszać identycznych zakładek.** |
| `SmithScreenHeading` | duży tytuł + opcjonalny opis / data | „Dziś” vs „Dziś trening” itd. |
| `SmithCard` | wspólny radius, padding, elevation, stany press/disabled | trening, serie, wydarzenia, recovery |
| `SmithPrimaryButton` | pełna szerokość w głównym CTA, min. 48px wysokości, brand accent | „Dodaj trening”, „Zacznij trening” |
| `SmithSecondaryButton` | neutralne pole, mocny kontrast, min. 44px | edycja / biblioteka / akcje wtórne |
| `SmithMetric` | Manrope tabular nums + jednostka i etykieta | km, min/km, tętno vs kg, powtórzenia, RPE |
| `SmithChip` | pill, nie tylko kolor, label zawsze | intensywności biegowe vs typ serii |
| `SmithInput` | identyczny focus, disabled, invalid, error text, helper | specyficzne wartości dystansu, obciążenia |
| `SmithSheet/Modal` | scrim, bezpieczny focus i ESC/back, animacja | kontekst A/B/C races vs zestawy ćwiczeń |
| `SmithEmptyState` | proste wyjaśnienie + 1 primary CTA + opcjonalny secondary | brak aktywnego planu vs brak zapisanego treningu |
| `SmithNotice` | info / warning / danger / success; bez zgadywania gotowości | backup, błędy, ostrzeżenia obciążeniowe |
| `SmithProgress` | wspólny styl toru i wypełnienia | tygodniowy dystans vs wykonane serie |
| `SmithSettingsRow` | etykieta, opis, kontrolka, focus state | ustawienia pozostają właściwe dla produktu |

### Header + navigation — referencyjny szkielet

```text
[ glyph ] Runsmith                        [ opcjonalna akcja ]

Dziś
Niedziela, 8 listopada

╭───────────────────────────────────────╮
│ Dzisiejszy trening                    │
│ 8 km · Easy                           │
│ [ Rozpocznij / Oznacz jako wykonany ] │
╰───────────────────────────────────────╯

[ Dziś ] [ Kalendarz ] [ Plan ] [ Progres ] [ Więcej ]
```

Repsmith korzysta z dokładnie tego samego szkieletu, ale jego główna karta powinna promować **trening siłowy**, nie bieg.

## 5. Wytyczne produktowe

### Runsmith

- Główny ekran: następny bieg, tydzień, plan, event/race, regeneracja, backup **tam, gdzie dotychczas jest wymagany**. Nie usuwać ważnych ostrzeżeń.
- Priorytety biegowe: `Easy / Quality / Long Run / Race / Recovery` jako osobna paleta funkcjonalna, nie branding.
- Dodawanie A/B/C race, adaptacja planu, before/after — zachować logikę i przejrzyste zatwierdzanie zmian.
- Tryby planowania z historią / bez historii i wybrana częstotliwość treningów — nienaruszalne.

### Repsmith

- Główny ekran: start treningu, logowanie serii, top set/backoff, biblioteka ćwiczeń, RPE, historia, plany — zachować.
- Nazewnictwo ćwiczeń, układ serii, skróty / gesty przy logowaniu treningu podlegają ochronie funkcjonalnej.
- Nie dodawać sztucznie Running Plan ani dodatkowych ekranów z Runsmith.

## 6. Light/dark & accessibility

- Domyślne `system`, ręczne `light`, `dark` tam, gdzie już istnieją; nie zmieniać kluczy istniejących preferencji bez migracji.
- Kontrast dla tekstu normalnego ≥4.5:1, dużego ≥3:1; dla istotnych granic i ikon ≥3:1, z wyjątkami normatywnymi. Weryfikować wartości programowo, nie zakładać.
- Focus visible na klawiaturze; realne etykiety screen-readera, prawidłowa kolejność fokusowania, `aria-current="page"` na aktywnej zakładce gdy to web.
- Wspierać 200% text zoom bez obcięcia etykiet i przycisków; bez poziomego scrolla przy 320px.
- Status nigdy nie przekazywany samym kolorem (ikona / tekst / label).
- Respektować safe areas i systemowe gesty Androida.

## 7. Wymagania architektoniczne — jedno repo

**Najpierw ustal, jak repo jest zorganizowane.** Dwa pliki HTML to nie dowód, że aplikacje współdzielą kod. Wspólne repo ułatwia egzekwowanie standardu, ale nie gwarantuje współdzielonego runtime.

**Preferowana strategia:**

1. Jeden katalog `design/smith/` (lub istniejący odpowiednik) ze specyfikacją, tokenami, screenshotami referencyjnymi i testami wizualnymi.
2. Jeżeli aplikacje dzielą bundler/stack: shared source package (np. `packages/smith-ui`) z minimalnymi komponentami i tematami.
3. Jeżeli technologicznie się różnią albo mają osobne statyczne buildy: *wspólne źródło tokenów* generujące osobne artefakty per aplikacja (bez niedziałających importów cross-folder).
4. Cienka warstwa aliasów starych tokenów zamiast masowego rename; stopniowa wymiana komponentów od shell/nav/buttons do ekranów.
5. Wspólne testy golden screenshots i kontrastu. PR powinien zawierać screenshoty obu aplikacji w obu motywach.
6. Nie przenosić danych ani identyfikatorów pakietów Android. Nie dotykać storage/API bez potrzeby.
7. Nie wdrażać nowego motywu w jednej aplikacji bez weryfikacji drugiej — zmiana wspólnego tokenu może mieć dwa skutki.

## 8. Plan migracji (minimalny blast radius)

| Etap | Zmiana | Minimalny dowód ukończenia |
|---|---|---|
| 0 | Audyt repo, lista funkcji / snapshot / test baseline | mapa aplikacji i punktów wspólnych |
| 1 | Shared tokens i product themes, bez zmiany UI | wizualny diff bliski zeru |
| 2 | Runsmith BrandHeader + wspólny nav shell | widoczna rodzina produktów, zero utraty akcji |
| 3 | Buttons, cards, headings, inputs, notices | porównanie kluczowych ekranów |
| 4 | Modal / sheet, dark mode, focus, safe areas | accessibility i mobile tests |
| 5 | Spójny motion + reduced motion | test animacji i wydajności |
| 6 | Regression + screenshot review + przygotowanie buildów | raport zmian i odchyleń |

**Zakaz masowego „find & replace” CSS w skompresowanym HTML.** Jeśli HTML jest wynikiem bundlera — edytować źródła. Jeśli jest rzeczywiście źródłem — wydzielać ostrożnie i testować.

## 9. Kryteria akceptacji (Definition of Done)

- [ ] Obie aplikacje pokazują własną nazwę i charakterystyczny glyph w spójnym nagłówku.
- [ ] Obie posiadają spójne: barwy neutralne, font scale, button/card/radius/shadow, focus/disabled/errors.
- [ ] Identyczne zasady aktywnej zakładki; zachowane **różne zestawy** zakładek.
- [ ] Brand accent Runsmith ≠ Repsmith, lecz komponenty mają tę samą geometrię.
- [ ] Obie aplikacje mają poprawne light/dark i reduced motion.
- [ ] 320/360/390/430/768 px: bez niezamierzonego overflow; bez zasłonięcia akcji przez nav/safe area.
- [ ] Krytyczne akcje w obu apkach działają przed/po; dane i backup bez migracji lub bezpieczna migracja z testami.
- [ ] Wykonano porównanie przed/po dla Home, Plan(s), settings/more, modal, formularz, ekrany rzeczywistego treningu i stany puste.
- [ ] Dla każdej pominiętej zmiany: zapisany powód i alternatywa.

## 10. Reguła podejmowania decyzji

**Zachowaj funkcję > spójność wizualna > efekt dekoracyjny.** Jeżeli zastąpienie widoku naruszy potrzebny workflow, nie zastępuj widoku. Nałóż tokeny i bezpieczne mikrokomponenty. Jeśli nawet to jest ryzykowne, zachowaj oryginał i udokumentuj wyjątek.

*Ten dokument jest specyfikacją rodziny, a nie zgodą na refactoring modeli danych, zmianę silnika planowania ani usunięcie funkcji.*
