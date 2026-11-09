# Nie sprawdzone w prawdziwym środowisku

Testy (vitest, Chromium) przeszły w kontenerze bez telefonu i bez Android SDK. Wiersz znika po sprawdzeniu na prawdziwym urządzeniu, z datą.

| Obszar | Co nie było sprawdzone |
|---|---|
| Instalacja | Instalacja APK, start, ikona launchera, ekran startowy na prawdziwym telefonie. APK debug zbudowało CI, otwiera się jako archiwum zip, ale nie było uruchomione |
| Ikona | Maski producentów (okrąg, squircle, kropla) i motyw ikon Androida 13+ (warstwa monochromatyczna). Sprawdzone tylko na symulowanych maskach w Chromium |
| Ekran startowy | Przejście systemowego ekranu Androida 12+ do animacji w WebView bez błysku, płynność na słabym telefonie, zimny start po zabiciu procesu (czy sessionStorage jest wtedy pusty) |
| Odtwarzacz | Zachowanie licznika przy zablokowanym ekranie i po uśpieniu urządzenia na prawdziwym telefonie. Logikę uzgadniania zegarów testują testy jednostkowe (zegar ścienny i monotoniczny, cofnięcie czasu, długa nieobecność, restart procesu) i symulacja przerwy w Chromium. Wake Lock (ekran włączony) zależy od WebView |
| Sygnały | Dźwięk i wibracja (domyślnie wyłączone) na prawdziwym urządzeniu |
| Treści | **Wszystkie 40 ćwiczeń i 13 sesji to wersje robocze, nie zweryfikowane przez specjalistę** (`docs/content-qa.json`). Brak zweryfikowanych demonstracji ruchu: 0 z 40, zastępuje je opis krok po kroku |
| Dane | Że IndexedDB przetrwa aktualizację APK i restart telefonu (przy kluczu debug aktualizacja wymaga odinstalowania) |
| Kopia | Zapis pliku i okno „Udostępnij” na Androidzie, wybór pliku do importu w WebView |
| Dostępność | TalkBack, powiększenie czcionki systemu |
| Tablet | Układ na prawdziwym tablecie (sprawdzone 768 px w Chromium) |
