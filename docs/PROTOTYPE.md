# Prototyp wizualny do akceptacji

Plik: `prototype/flexsmith-prototype.html` (jeden plik, fonty osadzone, bez sieci).

## Uruchomienie

- Otwórz plik w przeglądarce (dwuklik albo `file://.../prototype/flexsmith-prototype.html`). Na szerokim ekranie widać ramkę telefonu, na wąskim pełny ekran.
- `?nosplash=1` w adresie pomija animację startu.
- Źródło: `prototype/index.src.html`. Zbudowanie z fontami: `node prototype/build.mjs`.
- Test dymny i zrzuty: `node prototype/smoke.mjs <katalog>` (`NODE_PATH=<node_modules z playwright> node prototype/smoke.mjs`, Chromium).

## Co jest prawdziwe, a co nie

Prawdziwe (działa i zapisuje się w `localStorage`, klucz `flexsmith.proto`): rekomendacja sesji z uzasadnieniem, odtwarzacz z czasem ze znaczników (pauza, wznowienie, luka zegara, strony L/P, pomiń, wstecz, ±10 s, zamiennik, zakończ wcześniej), zapis do historii (ukończona/przerwana, faktyczny i planowany czas, komfort, notatka), biblioteka z filtrami i ulubionymi, edytor własnych sesji (czas, kolejność, usuń z cofnięciem, dodaj z biblioteki, duplikuj, usuń z potwierdzeniem, wyliczenie czasu), motyw, PL/EN, redukcja ruchu, eksport JSON, animacja startu.

Nieprawdziwe lub uproszczone: 16 ćwiczeń i 8 sesji to materiał do przeglądu (produkcja: 35-50 ćwiczeń, min. 12 sesji, manifest QA). Treść EN jest pełna tylko w prototypie na te 16 pozycji. Zamiast demonstracji ruchu jest ramka. Przeciąganie w edytorze zastąpione przyciskami góra/dół. Onboarding to arkusz "Dopasuj". Import JSON i widoki v1.5 nie istnieją.
