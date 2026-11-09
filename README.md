# Flexsmith v1.0

Trzecia aplikacja rodziny Smith (obok Runsmith i Repsmith): mobilność, przygotowanie do ruchu, rozciąganie i opcjonalne rolowanie. Offline, dane tylko na urządzeniu, bez kont, sieci i AI. Hasło: **Move better. Every day.**

Odpowiada na pytanie „co rozsądnie zrobić dziś, w tym celu, w tym czasie, z tym sprzętem”. To ogólna aplikacja ruchowa, nie diagnoza ani rehabilitacja.

## Co jest w v1.0
- Dziś: zalecana sesja z jednozdaniowym uzasadnieniem (tylko fakty, które podałeś), szybki start, kontynuacja przerwanej sesji, faktyczne podsumowanie tygodnia.
- Sesje: 13 gotowych, wyszukiwanie i filtry, szczegóły z wyliczeniem czasu, kopia do własnej.
- Odtwarzacz: czas liczony ze znaczników (nie z łańcucha `setInterval`), pauza, strony lewa/prawa, pomiń, wstecz, ±10 s, zamiennik, zakończ wcześniej, sygnał i wibracja (wyłączone domyślnie), ekran włączony w trakcie, odpowiedzialne wznawianie po zamknięciu aplikacji, krótki check-in bez diagnoz.
- Moje: własne sesje (dodawanie z biblioteki, kolejność, czas, strony, duplikat, usuń z cofnięciem, wyliczenie czasu).
- Biblioteka: 40 ćwiczeń (dynamiczne, mobilność, statyczne, siła w zakresie, rolowanie), filtry, ulubione, ostatnio użyte, opis krok po kroku.
- Więcej: motyw, język PL/EN, ograniczenie ruchu, preferencje (cel, czas, sprzęt, poziom, obszary, ograniczenia), historia, kopia JSON (eksport, import z podglądem zmian, tryby połącz i zastąp), O aplikacji.
- Ekran startowy: animacja logo (spójna z Runsmith i Repsmith), ekran główny dopiero po jej zakończeniu i gotowości aplikacji.

## Uczciwy stan treści
Wszystkie ćwiczenia i sesje to **wersje robocze do przeglądu** (`docs/content-qa.json`), bez źródeł, i tak są oznaczone w aplikacji. Zweryfikowanych demonstracji ruchu jest 0 z 40, zamiast nich jest opis krok po kroku. Zobacz `docs/CONTENT-QA.md` i `docs/NOT-VERIFIED.md`.

## Stos i komendy
Capacitor 8 + TypeScript + Vite, bez frameworka UI. IndexedDB `flexsmith`. Testy: vitest i Playwright (Chromium).
- `npm test`: kontrast, treści, vitest (jednostkowe).
- `npm run e2e`: build i testy w przeglądarce (`SHOTS=<katalog>` zapisuje zrzuty).
- `npm run icons`: logo i ikony z `scripts/brand.mjs`.
- `npm run cap:sync`: build i kopia do `android/`. APK buduje CI (`docs/RELEASE.md`).

## Struktura
`src/content` (ćwiczenia, sesje), `src/domain` (czyste funkcje: czas, rekomendacje, odtwarzacz, własne sesje, typy v1.5), `src/storage` (baza, kopia), `src/ui` (widoki, akcje, odtwarzacz), `src/i18n`, `design/` (logo), `smith-design-system-v1/`, `docs/`.

## Izolacja od rodzeństwa
`applicationId` `dev.kachaj96.flexsmith`, baza `flexsmith`, klucze `flexsmith.*`, pole `app: "flexsmith"` w kopii, osobny klucz podpisu. Runsmith i Repsmith nie są zmieniane.
