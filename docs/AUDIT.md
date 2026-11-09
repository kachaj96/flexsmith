# Flexsmith: audyt repozytoriów i notatka architektoniczna (2026-11-09)

Status: audyt i prototyp zaakceptowane (2026-11-09), logo zmienione na wariant 2, v1.0 zaimplementowane (zobacz `README.md`, `docs/NOT-VERIFIED.md`, `docs/CONTENT-QA.md`).

## 1. Ustalenia z audytu

**Układ repozytoriów.** Zadanie zakładało, że Runsmith i Repsmith są w tym samym repo. Nie są: Flexsmith (`kachaj96/flexsmith`) było puste, a obie aplikacje są w osobnych repozytoriach.

| Aplikacja | Repo | Stos | Dane | Identyfikatory |
|---|---|---|---|---|
| Runsmith | `kachaj96/runsmith` | Capacitor 8, TypeScript, Vite, własny `h()` DOM, vitest + Playwright (Node) | IndexedDB `running`, klucze `running.*` w localStorage | `dev.kachaj96.running` |
| Repsmith | `kachaj96/repsmith` | Capacitor 8, czysty JS bez bundlera (`www/` to kopia plików), testy node + Playwright (Python) | IndexedDB `repsmith` (magazyn `kv`), `repsmith.*` | `dev.kachaj96.repsmith` |
| Flexsmith | `kachaj96/flexsmith` | patrz sekcja 2 | patrz sekcja 2 | patrz sekcja 2 |

**Smith Design System v1** znaleziono w `smith-design-system-v1/` w obu repo (pliki identyczne, sprawdzone `diff -r`): specyfikacja, `smith-tokens-v1.css`, `smith-icons.json`. Obie aplikacje mapują `--smith-*` na własne tokeny (Runsmith: `design/tokens.json` do `tokens.css`; Repsmith: `app.css`). Nawigacja, nagłówek marki, karty, przyciski, ruch (spring, 120/220/300 ms) i reguły kontrastu są wspólne.

**Wspólne elementy rodziny, które Flexsmith ma przejąć:** tokeny i krzywe ruchu, Manrope i Inter (lokalne pliki OFL, bez sieci), zestaw ikon (24 px, linia 2), nagłówek `[znak] Nazwa`, dolna nawigacja z pigułką aktywnej zakładki, karty 22 px, kontrolki 12 px, cele dotyku 44 px, animacja startu (`docs/MOTION.md` w obu repo: ekran główny dopiero po zakończeniu animacji i gotowości aplikacji), zasady dostępności i `prefers-reduced-motion`.

**Czego nie ma i trzeba zrobić:** brak wspólnego pakietu kodu (każda apka ma własne kopie), brak szablonu aplikacji Smith. To uzasadnia decyzję z dyskusji: Flexsmith kopiuje potrzebne pliki, a wspólne repo (`smith-core`) powstanie po trzeciej apce, czyli teraz warto je zaplanować, nie wymuszać go w v1.0.

## 2. Decyzje architektoniczne dla Flexsmith

1. **Osobne repo, osobna aplikacja.** Flexsmith buduje się samodzielnie. Nie wymaga żadnej zmiany w Runsmith ani Repsmith. Żaden import między repozytoriami.
2. **Stos jak Runsmith:** Capacitor 8 + TypeScript + Vite, bez frameworka UI, vitest + Playwright. Powód: dużo logiki domenowej (silnik rekomendacji, odtwarzacz, migracje, kopia zapasowa), która dobrze się testuje w TypeScript; Runsmith ma sprawdzony zestaw (CI, ponawianie Gradle, kontrast, tokeny). Repsmith (bez bundlera) odpada, bo utrudnia typowane testy domeny.
3. **Identyfikatory i dane, rozdzielone od rodzeństwa:**
   - Android `applicationId`: `dev.kachaj96.flexsmith`
   - IndexedDB: `flexsmith` (nigdy `running` ani `repsmith`)
   - localStorage: wyłącznie prefiks `flexsmith.`
   - pole `app` w kopii JSON: `"flexsmith"`, importer odrzuca pliki innych aplikacji
   - klucz podpisu: osobny, w sekretach tego repo (`FLEXSMITH_*`). **Nie używamy kluczy Runsmith ani Repsmith.**
4. **Smith DS v1:** kopia `smith-design-system-v1/` w tym repo plus test zgodności tokenów (jak w Runsmith). Produktowy akcent: patrz sekcja 3.
5. **Dane:** treści (ćwiczenia, sesje) jako dane wersjonowane w repo (`src/content/`), z ID stałymi i tekstami PL/EN. Dane użytkownika (ustawienia, własne sesje, historia, ulubione) w IndexedDB. Rozdzielone: definicje treści, rekomendacje, stan odtwarzacza, prezentacja. Własne sesje odwołują się do ćwiczeń po ID, nie po indeksie.
6. **Odtwarzacz:** czas liczony ze znaczników czasu (`performance.now()` i zegar ściany jako zabezpieczenie), nie z łańcucha `setInterval`. Przy powrocie z tła stan jest uzgadniany z zegarem. Stan sesji zapisywany po każdej zmianie fazy, więc przerwana sesja daje uczciwe wznowienie (system może zabić proces: wtedy wznawiamy od ostatniej zapisanej fazy, nie udajemy, że licznik biegł).
7. **v1.5 (kontrakty, bez implementacji):** interfejsy `TrainingContextProvider` (opt-in, tylko odczyt typów i obszarów ciała treningów), `SyncAdapter`, `ProgramDefinition/Enrollment`, `Assessment`. W v1.0 tylko typy i testy kontraktowe z fałszywymi dostawcami, nic nie jest pokazane użytkownikowi jako działające.

## 3. Kolor i marka

- Logo: zatwierdzony wariant 2, kafel `#6C5AA2`, biała litera F z dwóch części (liść i korpus). Ten kolor ma 5,8:1 z bielą i 5,3:1 na tle, więc w jasnym motywie kafel i akcent interfejsu to jeden kolor. Ciemny motyw: akcent `#B3A6E6` (7,9:1 na powierzchni), tekst na akcencie `#14102A`. `scripts/validate-contrast.mjs` liczy 41 par z prawdziwych wartości (w `npm test`).
- Pierwsza ikona (figura z kółkiem, `#8071B4`) została zastąpiona. Mastery zostały w `design/master/` jako historia, nigdzie nie są używane.
- Typy sesji (dynamiczna, mobilność, statyczna, rolowanie) mają zawsze etykietę tekstową i inny kształt znacznika. Kolor jest tylko dodatkiem.
- Ikony: masters w `design/master/`. Warstwa adaptacyjna, monochromatyczna i mipmapy powstaną generatorem (jak `scripts/brand.mjs` w Runsmith), po weryfikacji strefy bezpiecznej 66 dp. Master ma okrągłą głowę i trzy kreski: w strefie 66 dp mieści się, ale sprawdzimy to renderem na maskach, nie na słowo.

## 4. Ryzyka

| Ryzyko | Skutek | Środek |
|---|---|---|
| Treści ćwiczeń: błąd anatomiczny, zbyt mocna obietnica ("rolowanie rozbija powięź") | szkoda dla użytkownika, utrata zaufania | manifest QA per ćwiczenie (źródło, status: zweryfikowane / do przeglądu), nic niezweryfikowanego nie jest oznaczone jako zweryfikowane, zakaz sformułowań medycznych, test na zakazane frazy |
| Brak własnych demonstracji ruchu | pusta ramka w odtwarzaczu | w v1.0 tekst + kroki jako pełnoprawny fallback, lista braków w manifeście, wektorowe sekwencje robione sukcesywnie (nie zgadujemy pozy ikonami) |
| Timer w tle i po uśpieniu | zły czas, zgubiona sesja | czas ze znaczników, zapis stanu po fazie, testy symulujące lukę zegara |
| Rozjazd wspólnych plików (tokeny, splash) | dryf rodziny | testy zgodności z kopią Smith DS, `smith-core` po stabilizacji |
| Pomyłka identyfikatorów (np. import kopii Runsmith) | zepsute dane | walidacja pola `app`, osobna baza i klucze, testy odrzucenia |
| Rozmiar APK przy wideo | duży plik | brak wideo w pakiecie v1.0, treści jako tekst i wektor |
| Brak Android SDK w kontenerze | nie zbudujemy lokalnie | APK buduje CI (jak w rodzeństwie), telefon właściciela jest jedynym prawdziwym urządzeniem |

## 5. Jak się buduje bez zmian w rodzeństwie

Repo `flexsmith` ma własne `package.json`, `vite.config.ts`, `capacitor.config.ts`, `android/` i `.github/workflows/ci.yml`. Z rodzeństwa kopiujemy pliki (tokeny, fonty, szablon CI, wzorzec splasha), nic nie importujemy. Nie dotykamy repozytoriów `runsmith` ani `repsmith`: ich testy i buildy nie zależą od tego repo. Test regresji "rodzeństwo nietknięte" to: ich CI na ich gałęziach bez zmian.
