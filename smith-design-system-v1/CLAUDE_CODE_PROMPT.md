# PROMPT DO CLAUDE CODE — UJEDNOLICENIE RUNSMITH + REPSMITH

Masz dostęp do repozytorium GitHub, w którym znajdują się aplikacje **Runsmith** (bieganie) i **Repsmith** (siłownia). Twoim zadaniem jest **wdrożenie Smith Design System v1.0**, tak aby wizualnie i interakcyjnie wyglądały jak dwie aplikacje jednej rodziny, z zachowaniem ich odrębnych funkcji i kolorów.

**Dokument odniesienia:** `SMITH_DESIGN_SYSTEM_V1.md` oraz `smith-tokens-v1.css` załączone do tego zadania. Jeśli ich nie ma w repo, umieść je w sensownym katalogu `design/smith/` (lub istniejącym odpowiedniku) i zastosuj jako specyfikację. Referencyjny CSS to zestaw **tokenów**, a nie gotowy plik do bezrefleksyjnego nadpisania stylów. Jeżeli dostarczę dodatkowo podgląd HTML, traktuj go jako wizualną demonstrację, nie kod produkcyjny.

## CEL I NADRZĘDNA REGUŁA

Stwórz **jedną rodzinę interfejsów** z dwoma osobnymi produktami:
- **Runsmith:** turkus `#1D6B73` light / `#5FB8BF` dark, osobny biegowy glyph, własne planowanie biegowe, kalendarz, starty A/B/C i adaptacje treningowe.
- **Repsmith:** miedź `#A84B24` light / morelowy `#FF9F70` dark, osobny siłowy glyph, własne ćwiczenia, serie, obciążenia, RPE, plany i historię.

Oba produkty mają mieć wspólne: Manrope/Inter, tła, surface, typografię, brand header, style kart, przycisków, formularzy, dialogów, bottom navigation, ikon, stanów i animacji.

**BEZWZGLĘDNY ZAKAZ REGRESJI:** żadna zmiana nie może usuwać lub istotnie ograniczać potrzebnej funkcji, workflow, widocznych danych, zapisanych treningów, planów, historii, backupów ani możliwości nawigowania. Jeżeli nie możesz bezpiecznie ujednolicić konkretnego elementu, **zachowaj działający element, pomiń tę konkretną zmianę UI i opisz powód w raporcie**. Nie zatrzymuj przez to pozostałych bezpiecznych zmian.

## FAZA 0 — BEZPIECZNY AUDYT REPO (obowiązkowo najpierw)

1. Sprawdź `git status`, branch, niezacommitowane zmiany; **nie resetuj** i nie nadpisuj pracy użytkownika. Zrób bezpieczny checkpoint według przyjętego workflow (nowy branch lub inny nieinwazyjny sposób).
2. Ustal faktyczną strukturę repo i katalogi obu aplikacji. Sprawdź czy to monorepo, dwa osobne projekty, czy jedna aplikacja generująca dwa buildy. Nie zgaduj na podstawie nazw HTML.
3. Zidentyfikuj źródła CSS/JS/komponentów, build scripts i konfiguracje Android/Capacitor. Sprawdź, czy HTML to źródło, czy artefakt bundlera. **Nie edytuj minified output, jeśli istnieje źródło.**
4. Zidentyfikuj wszystkie istniejące funkcje, krytyczne ścieżki, lokalne bazy, identyfikatory pakietów i klucze ustawień; przygotuj rejestr funkcji, których nie wolno naruszyć.
5. Zrób zrzuty ekranu / screenshot baseline obu aplikacji w light/dark (Home, Plan(s), Progress, Calendar/History, More/Settings, formularze, aktywna sesja, dialog, empty state).
6. Uruchom dostępne testy bazowe i sprawdź, czy zależności/builder działają. Błędy istniejące przed zmianą odróżniaj od nowych.
7. Zapisz zwięzły plan migracji i listę ryzyk. Potem realizuj zmiany; nie kończ na planie.

## FAZA 1 — WSPÓLNE ŹRÓDŁO WIZUALNE

Wybierz najmniej ryzykowny sposób współdzielenia Smith Design System:

- Jeśli obie aplikacje korzystają z tego samego stacku/bundlera, rozważ `packages/smith-ui` / `shared/smith` (tokens + podstawowe komponenty).
- Jeśli to osobne statyczne aplikacje lub odrębne buildy, użyj jednego źródła tokenów i mechanizmu generującego/copującego do ich własnych buildów; **każdy build musi działać samodzielnie, także offline**.
- Nie dodawaj nowego frameworka dla samego redesignu. Wykorzystaj obecny stack i zależności.
- Dodaj aliasy starych zmiennych CSS zamiast masowej wymiany. Uważaj na różnice `--panel`/`--ink` (Runsmith) i `--surface`/`--text` (Repsmith).
- Wprowadź wspólną bazę light/dark z osobnymi wariantami akcentu per produkt, zgodnie z dostarczoną specyfikacją.
- Fonty (Manrope i Inter) pobieraj wyłącznie z istniejących legalnych zasobów repo. Nie kopiuj ich do raportu ani nie wstawiaj do zewnętrznych artefaktów.
- Zachowaj dotychczasowe klucze motywu i preferencji, a jeśli migracja jest konieczna, zaimplementuj i przetestuj migrację.

## FAZA 2 — NAJBARDZIEJ ROZPOZNAWALNE ELEMENTY RODZINY

### A. Brand header

- W obu aplikacjach wdroż spójny nagłówek z `BrandMark` + nazwą produktu (Runsmith / Repsmith).
- Repsmith już ma dobry wzorzec; **dołóż analogiczny lockup do Runsmith** bez obcinania miejsca na zawartość, safe area czy istniejące akcje.
- Nie klonuj logo — zachowaj odrębne glyphs, ale ujednolić optyczną skalę, grubość linii, pochylenie, kafelek i odległość od nazwy.
- `ScreenTitle` nie jest zamiennikiem `BrandHeader`: „Dziś” lub „Plan” pozostają opisem aktualnego widoku.

### B. Bottom navigation

- Jeden standard wizualny i dostępnościowy paska: identyczne rozmiary ikon, grubość linii, etykiety, interakcja dotykowa, blur, tło, active pill, focus i safe area.
- **ZACHOWAJ RÓŻNE zakładki**:
  - Runsmith: Dziś / Kalendarz / Plan / Progres / Więcej.
  - Repsmith: Dziś / Plany / Postęp / Historia / Ćwiczenia.
- Preferowany active state: czytelna pigułka w kolorze `accent-soft` + wyraźny kolor tekstu/ikony, inspirowana obecnym Runsmith.
- Nie zmieniaj routingu, kolejności zakładek lub gestów bez testów. Zadbaj o max-width paska i contentu przy 320, 360, 390, 430 i 768 px.

### C. Wspólne komponenty

W miarę możliwości utwórz/ujednolić:
- `SmithCard`, `SmithPrimaryButton`, `SmithSecondaryButton`, `SmithScreenHeading`, `SmithMetric`.
- `SmithInput`, `SmithSelect`, `SmithChip`, `SmithEmptyState`, `SmithNotice`.
- `SmithModal/Sheet`, `SmithSettingsRow`, `SmithProgress`.

Nie przerabiaj każdej domenowej karty na identyczny layout. Te komponenty mają **wspólne proporcje i zachowanie**, ale zawierają różne dane.

## FAZA 3 — TYPOGRAFIA, DARK MODE, STANY, ANIMACJE

1. Wspólna skala Manrope dla nagłówków i liczb oraz Inter dla treści. Korzystaj z `font-variant-numeric: tabular-nums` dla danych treningowych.
2. Spójne paddingi, radiusy, cienie i neutralne kolory. Nie wprowadzaj dekoracyjnego glassmorphismu na każdej karcie — selektywnie w nawigacji / sheetach.
3. Dostępne focus states, touched/pressed, hover gdy sensowne, disabled, loading, error, warning i success.
4. 44–48 px dotykowe minimum; tekst powinien działać przy zoomie i długich polskich nazwach.
5. Wspólny system ruchu: `120/220/300ms`, spring `cubic-bezier(.2,.9,.25,1.04)`, bounce `cubic-bezier(.3,1.4,.5,1)` tam gdzie uzasadnione.
6. Zaimplementuj kartę expand/collapse, transition między widokami i feedback zapisania/ukończenia, **jeśli to bezpieczne**. Respektuj `prefers-reduced-motion: reduce`.
7. Nie ukrywaj akcji za efektownymi animacjami lub nowymi gestami. Wydajność i dostępność są ważniejsze niż „wow”.

## FAZA 4 — WYRAŹNA ODRĘBNOŚĆ APLIKACJI

### Runsmith — zachować, nie upraszczać

- Historyczne i aktywne plany 5K / 10K / HM / M / base, liczba dni, ręczny wybór, kreator, tryb z historią i bez historii.
- Kalendarz, aktywności, strefy tętna/tempa, RPE, race A/B/C, adaptacja planu, after/before, potwierdzanie zmian, backups i ich ostrzeżenia.
- Nie zmieniaj obliczeń obciążenia, długości Long Run ani struktury tygodnia w ramach zadania wizualnego.

### Repsmith — zachować, nie upraszczać

- Start treningu, lista ćwiczeń, serie, ciężary, top set/backoff, RPE, plany, progres, historia, edycja, backup i wszystkie obecne skróty.
- Nie zmieniaj silnika ćwiczeń, algorytmów planów, formatu przechowywania ani danych w ramach zadania wizualnego.

### Szczególny przypadek

Jeśli Runsmith ma więcej kart na Home, a Repsmith mniej: **nie usuwaj kart tylko po to, by ekrany były symetryczne**. Ujednolić strukturę samej karty i hierarchię akcji. Analogicznie nie dodawaj na siłę Repsmith „Race”, ani Runsmith „Sets”.

## FAZA 5 — WALIDACJA I OCHRONA FUNKCJI

- Testy typów/theme/tokenów i (gdy możliwe) kontrastu WCAG AA: zwykły tekst ≥4.5:1, duży ≥3:1; kontrolki nie mogą znikać na jasnym i ciemnym tle.
- Screenshot regression BOTH apps: light/dark, 320 / 360 / 390 / 430 / 768 px, Home, Plans/Plan, Progress, Calendar/History, More/Settings, formularze, aktywne treningi, modale, empty state.
- Testy bottom-nav, back button, scroll, header, safe area, keyboard focus i reduced motion.
- Testy CRUD i trwałości danych na urządzeniu lub w środowisku z prawdziwą pamięcią (IndexedDB/localStorage), **nie wyciągaj fałszywego wniosku z ograniczeń headless sandboxa**.
- Sprawdź ważne ścieżki zarówno Runsmith, jak i Repsmith; nie tylko stronę startową.
- Uruchom testy modułów zmienionych po każdym etapie. Pełną regresję przeprowadź przed finalnym buildem; unikaj kosztownej pełnej regresji po każdej drobnej zmianie CSS.
- Build każdej aplikacji osobno; jeśli repo wspiera Android/Capacitor, przygotuj instalowalne APK po weryfikacji. **Nie fałszuj sukcesu** — bez konfiguracji release signing przygotuj co najwyżej debug APK i oznacz to w raporcie. Nie zmieniaj `applicationId` ani kluczy signing.

## OCHRONA DANYCH, GIT I BUDOWANIA

- Nie resetuj IndexedDB, localStorage, backupów, historii, profili ani aktywnych planów.
- Nie zmieniaj schematów baz danych, jeśli można uniknąć. Jeśli nie — migracja + test wstecz + rollback.
- Nie usuwaj istniejących komponentów ani ekranów potrzebnych do działania produktu.
- Nie rób masowego refactoru tylko dlatego, że oba projekty są w jednym repo.
- Nie zastępuj istniejących ikon lub etykiet ikonami emoji.
- Nie dodawaj zależności bez konieczności.
- Nie nadpisuj niepowiązanych zmian innych osób i nie wymuszaj push na chronionych branchach.
- Preferuj serię małych, logicznych commitów i PR-ready dokumentację, jeśli workflow repo na to pozwala.

## DOKUMENTACJA I FINALNY RAPORT

Na końcu przedstaw:

1. **Mapa repo:** gdzie znajdują się obie aplikacje i który kod jest współdzielony.
2. **Design tokens i komponenty:** co jest rzeczywiście wspólne, a co product-specific.
3. **Zmiany per aplikacja:** szczegółowo Runsmith vs Repsmith.
4. **Screen comparison:** przed/po w obu motywach, główne ekrany (ścieżki do screenshotów).
5. **Regresja:** jakie ścieżki zostały sprawdzone, co jest niezweryfikowane i jakie istniejące błędy wykryto.
6. **Skipped changes:** każda pominięta zmiana UI, ryzyko i bezpieczna alternatywa.
7. **Build status:** prawdziwy wynik builda / apk, dokładne ścieżki i ewentualne ograniczenia.
8. **Remaining work:** tylko faktyczne pozostałe zadania.

## DEFINITION OF DONE

Zadanie kończy się dopiero, gdy obie aplikacje mają spójne widoczne brand lockups, wspólną geometrię / typografię / neutralne powierzchnie / bottom nav / stany / motion, zachowując własne kolory i wszystkie potrzebne funkcje. Działające buildy oraz testy muszą to potwierdzać. Nie deklaruj „100%” jeśli któregoś workflow nie przetestowano.

**Rozpocznij od audytu repo i baseline. Następnie wdrażaj etapami. Nie kończ na samej specyfikacji ani na mockupie, chyba że wykryjesz ryzyko utraty danych lub nieodwracalnej operacji wymagającej mojej zgody.**
