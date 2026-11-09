# Flexsmith v1.5: plan i kontrakty (nic z tego nie działa w v1.0)

W v1.0 jest tylko `src/domain/contracts.ts` (same typy) i `tests/unit/contracts.test.ts`. Aplikacja ich nie woła, interfejs nie pokazuje niczego z v1.5.

## 1. Kontekst treningowy z Runsmith i Repsmith (opt-in)
- Co: nadchodzące i wykonane treningi, ich rodzaj (bieg, siła) i szeroki obszar ciała. Kontrakt: `TrainingContext`, `TrainingContextProvider`. Bez surowych danych treningu.
- Domyślnie wyłączone. Włączenie jest decyzją użytkownika, osobną dla każdej aplikacji.
- **Same repozytoria nie dzielą danych zainstalowanych aplikacji.** Flexsmith nigdy nie czyta prywatnej pamięci innej aplikacji.
- Jak może to działać (do zbadania, bez założeń): jawny eksport z drugiej aplikacji (plik lub udostępnienie) zgodny z kontraktem, albo opcjonalny backend z kontem. Nie wybieram teraz, bo to wymaga decyzji o koncie i prywatności.

## 2. Synchronizacja między aplikacjami
Wymagania: świadoma zgoda, zakresy (`read-upcoming`, `read-completed`), widoczne źródło i znacznik czasu, rozwiązywanie konfliktów, odwołanie zgody (`SyncAdapter.revoke`). Zakaz: ciche łączenie kont, czytanie cudzej pamięci. Kandydaci: Android Intents z jawnym potwierdzeniem, ContentProvider z uprawnieniem, opcjonalny serwer.

## 3. Programy 4-8 tygodni
`ProgramDefinition` (tygodnie, sesje z szablonów, przesunięcia dni, oceny bazowe) i `ProgramEnrollment` (postęp, pauza). Progresja z wyraźnymi regułami (czas lub zakres rosną o mały krok, nigdy bez limitu). Zakładka „Programy” pojawi się dopiero wtedy, gdy będzie miała treść (do tego czasu jest „Moje”).

## 4. Powtarzalne oceny zakresu ruchu
`AssessmentDefinition`/`AssessmentResult`: konkretne zadania (np. kolano do ściany w cm), wartości wpisywane przez użytkownika, jasne ograniczenia. **Bez wspólnego „wyniku mobilności”.** Wynik jest informacją, nie diagnozą.

## 5. Rekomendacje z kontekstem
Ten sam silnik (`recommend`) z dodatkowym wejściem `TrainingContext`, z wyjaśnieniem w jednym zdaniu i pełnym zachowaniem bez danych. Ewentualne AI tylko za deterministyczną warstwą walidacji (reguły sprzętu, poziomu, ograniczeń i czasu), nigdy obok niej.

## 6. Większa biblioteka
Po przeglądzie jakości: zasilanie `docs/content-qa.json`, demonstracje wektorowe własne lub na licencji, wersjonowanie treści.

## Zakres i ryzyka
Największe ryzyko to wejście w konto i prywatność (punkty 1-2). Sugeruję zacząć od 3, 4 i 6 (bez sieci), a 1-2 dopiero po decyzji o kanale wymiany danych.
