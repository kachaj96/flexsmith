# Jakość treści ćwiczeń

Treść (ćwiczenia, sesje) jest w `src/content/`. Manifest QA: `docs/content-qa.json` (generowany: `node --experimental-strip-types scripts/gen-content-qa.mjs`, test pilnuje, że jest aktualny).

## Stan v1.0 (prawda)
- 40 ćwiczeń i 13 sesji napisanych na potrzeby aplikacji. **Wszystkie mają status `needs-review`.** Nie ma w nich źródeł (`sources: []`) i nie są oznaczane jako zweryfikowane w aplikacji (ekran ćwiczenia pokazuje „Treść w trakcie przeglądu”, O aplikacji liczy je jako robocze).
- Demonstracje ruchu: **0 z 40**. Zamiast nich pełny opis krok po kroku, typowe błędy, łatwiej/trudniej i uwaga bezpieczeństwa. Brak mediów nie blokuje użycia.
- Treści nie kopiują cudzych tekstów, zdjęć ani wideo.

## Zasady
- Ostrożne sformułowania: bez obietnic usuwania toksyn, rozbijania tkanek, poprawy postawy, leczenia bólu ani zapobiegania kontuzjom. Skrypt `scripts/validate-content.mjs` (w `npm test`) wyłapuje zakazane frazy.
- Rolowanie jest opcjonalne i ma ostrzeżenia (nie po stawach, kościach, szyi, lędźwiach).
- Rozciąganie statyczne nie jest wstawiane do sesji „przygotuj” (test).
- Każde ćwiczenie ma uwagę „przy ostrym bólu przerwij”.

## Jak oznaczyć ćwiczenie jako zweryfikowane
1. Osoba z odpowiednim przygotowaniem (np. fizjoterapeuta, trener) przegląda opis, kroki, błędy i uwagi.
2. W `qa` ćwiczenia: `status: 'reviewed'`, `sources: [adresy wiarygodnych organizacji]`, `note` (kto, kiedy).
3. `node --experimental-strip-types scripts/gen-content-qa.mjs`, zaktualizuj liczby w teście manifestu.
4. Źródła zostają w danych wewnętrznych, na ekranie tylko na prośbę („Dlaczego to ćwiczenie”, v1.5).

## Media
`MediaAsset` (id, rodzaj, `availableOffline`, `license`, `attribution`, `version`) jest w modelu. Brak wideo w paczce: APK pozostaje mały. Wektorowe sekwencje własne lub licencjonowane klipy trzeba dodać i opisać licencję.
