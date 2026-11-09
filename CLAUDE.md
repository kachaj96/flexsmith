# Flexsmith: instrukcja dla Claude Code

Trzecia aplikacja rodziny Smith (mobilność, rozciąganie, rolowanie, offline). Niezależna od Runsmith i Repsmith: własne repo, `applicationId`, baza, klucze i podpis. Nie zmieniaj rodzeństwa.

## Styl pracy
- Rozmowa po polsku, bezpośrednio, bez wstępów, bez długich myślników. Błędy i ryzyka wprost: obserwacja, przyczyna, skutek.
- Prawda przed wygodą: "działa" tylko po uruchomieniu w tej sesji. Podawaj, co sprawdzone, a czego nie (`docs/NOT-VERIFIED.md`).
- Gałąź `main` jest domyślna. Pracuj na gałęzi sesji, nie pushuj na `main`, nie merguj bez zgody.
- Treści ćwiczeń: nic niezweryfikowanego nie jest oznaczone jako zweryfikowane. Żadnych obietnic medycznych (rolowanie nie "rozbija powięzi", rozciąganie nie "usuwa kwasu mlekowego").
- Nie ma Android SDK w kontenerze. APK buduje CI.

## Izolacja
- `applicationId` `dev.kachaj96.flexsmith`, IndexedDB `flexsmith`, localStorage tylko `flexsmith.*`, pole `app: "flexsmith"` w kopii JSON.
- Osobny klucz podpisu (`FLEXSMITH_*`). Nigdy kluczy rodzeństwa.
