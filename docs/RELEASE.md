# Wydanie i podpis APK Flexsmith

## Stan na teraz

**Flexsmith nie ma jeszcze własnego klucza podpisu.** CI buduje więc `flexsmith-<wersja>-debug.apk`. Taki APK instaluje się normalnie, ale każdy kolejny build ma inny podpis, więc **aktualizacja wymaga odinstalowania poprzedniego**, a to kasuje dane aplikacji (historię, własne sesje). Dla prawdziwych danych potrzebny jest stały klucz.

## Jednorazowa konfiguracja (robisz ty)

Klucz jest osobny dla każdej aplikacji. **Nie używaj kluczy Runsmith ani Repsmith.**

1. Wygeneruj klucz (Java 17+): `keytool -genkeypair -v -keystore flexsmith.jks -alias flexsmith -keyalg RSA -keysize 2048 -validity 10000`
   Zrób kopię pliku i haseł poza komputerem. Utrata klucza oznacza brak aktualizacji bez odinstalowania. `.gitignore` blokuje `*.jks`.
2. `base64 -w0 flexsmith.jks` (macOS: `base64 -i flexsmith.jks`).
3. W repo: Settings, Secrets and variables, Actions. Cztery sekrety: `FLEXSMITH_KEYSTORE_BASE64`, `FLEXSMITH_KEYSTORE_PASSWORD`, `FLEXSMITH_KEY_ALIAS` (`flexsmith`), `FLEXSMITH_KEY_PASSWORD`.

## Wydanie

Podbij `version` w `package.json` (kod wersji w Gradle liczy się z niej), zielone CI, `git tag v<wersja> && git push origin v<wersja>`. Bez sekretów powstaje tylko APK debug jako artefakt przebiegu.

## Czego nie wolno zmieniać

`applicationId` `dev.kachaj96.flexsmith`. Zmiana oznacza nową aplikację na telefonie.
