# Flexsmith: instrukcja dla Claude Code

Trzecia aplikacja rodziny Smith (mobilność, rozciąganie, rolowanie, offline). Niezależna od Runsmith i Repsmith: własne repo, `applicationId`, baza, klucze i podpis. Nie zmieniaj rodzeństwa.

## Styl pracy
- Rozmowa po polsku, bezpośrednio, bez wstępów, bez długich myślników. Błędy i ryzyka wprost: obserwacja, przyczyna, skutek.
- Prawda przed wygodą: "działa" tylko po uruchomieniu w tej sesji. Podawaj, co sprawdzone, a czego nie (`docs/NOT-VERIFIED.md`).
- Gałąź `main` jest domyślna. Pracuj na gałęzi sesji, nie pushuj na `main`, nie merguj bez zgody.
- Treści ćwiczeń: nic niezweryfikowanego nie jest oznaczone jako zweryfikowane. Żadnych obietnic medycznych (rolowanie nie "rozbija powięzi", rozciąganie nie "usuwa kwasu mlekowego").
- Nie ma Android SDK w kontenerze. APK buduje CI.

## Stos i komendy
Capacitor 8 + TypeScript + Vite, bez frameworka UI (HTML jako tekst w `src/ui/views.ts`, delegacja zdarzeń w `src/ui/actions.ts`). Testy: vitest + Playwright. `npm test`, `npm run e2e` (buduje), `npm run icons`, `npm run cap:sync`. Playwright w kontenerze: `CHROMIUM_PATH=/opt/pw-browsers/chromium/chrome-linux/chrome` (zależnie od wersji).
- Logo i ekran startowy: `scripts/brand.mjs` to jedyne źródło geometrii, `node scripts/gen-icons.mjs` pisze z niego `design/`, ikony Androida, `src/brand-art.ts` i grafikę splasha w `index.html`. Nie edytuj ich ręcznie. Reguły startu: `docs/MOTION.md`.
- Treści: `src/content/` (ID stałe, PL/EN). Po zmianie `node --experimental-strip-types scripts/gen-content-qa.mjs`. Nic nie jest `reviewed` bez źródeł.
- Odtwarzacz: logika w `src/domain/player.ts` (czyste funkcje czasu), UI w `src/ui/play.ts`. Nie licz czasu z `setInterval`.
- Dodanie pola do danych użytkownika: opcjonalne, `SCHEMA` i migracja w `src/storage/backup.ts`, test okrągłej drogi.

## Izolacja
- `applicationId` `dev.kachaj96.flexsmith`, IndexedDB `flexsmith`, localStorage tylko `flexsmith.*`, pole `app: "flexsmith"` w kopii JSON.
- Osobny klucz podpisu (`FLEXSMITH_*`). Nigdy kluczy rodzeństwa.
