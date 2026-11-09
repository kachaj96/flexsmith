# Smith Motion Language

Jeden język ruchu dla Runsmith i Repsmith. Ten sam plik jest w obu repozytoriach. Zasada: ruch tłumaczy zmianę, nie ozdabia.

## Krzywe i czasy

| Nazwa | Krzywa | Do czego |
|---|---|---|
| standard | `cubic-bezier(.4, 0, .2, 1)` | rysowanie znaku, wygaszanie, przejścia ekranu |
| out | `cubic-bezier(.2, 0, 0, 1)` | pojawianie się napisu (łagodne hamowanie) |
| spring | `cubic-bezier(.2, .9, .25, 1.04)` | wejście kafla: odbicie ok. 4 %, bez kołysania |

Czasy interfejsu: 120 ms (dotyk), 220 ms (zmiana stanu), 300 ms (przejście). Efekty: tylko krycie, przesunięcie o kilka pikseli i skala 0,88 do 1. Bez obrotów logo, poświaty, agresywnych gradientów, spinnerów i przesadnego odbicia. Jasny i ciemny motyw mają ten sam ruch, zmieniają się tylko kolory.

## Animacja startu

Czas w ms od pierwszego malowania:

| Faza | Czas | Co się dzieje |
|---|---|---|
| 1. kafel | 0-420 | kafel logo na neutralnym tle, skala 88 do 100 %, krycie 0 do 1, krzywa spring |
| 2. znak | 300-1040 | białe części znaku odsłaniane maską narysowaną wzdłuż ich własnej geometrii |
| 3. napis | 940-1240 | nazwa produktu: krycie i przesunięcie o 8 px w górę |
| 4. przytrzymanie | 1240-1600 | gotowe logo stoi |
| 5. wyjście | po 1600, 260 ms | wygaszenie ekranu startowego, pod spodem jest już gotowa aplikacja |

Runsmith: litera R odsłaniana wzdłuż górnej belki, brzuszka, środkowej belki i nogi, na końcu równoległobok (ślad ruchu) od prawej do lewej. Repsmith: trzy kreski kolejno od góry do dołu, na końcu ukośna linia od lewej do prawej. Ten sam rytm, czas, krzywe, typografia i skala.

## Synchronizacja (najważniejsza zasada)

Animacja (CSS) i start aplikacji (baza, ustawienia, pierwszy ekran) to dwa niezależne procesy. Ekran główny pojawia się dopiero, gdy **oba** są gotowe: animacja skończyła cały przebieg razem z przytrzymaniem, a aplikacja jest wyrenderowana. Kontroler (`src/splash.ts` w Runsmith, `splash.js` w Repsmith) to automat stanów:

```
playing -> waiting -> leaving -> done
```

- Szybki start nie skraca animacji: aplikacja czeka pod ekranem startowym (jest `inert`, więc nic nie reaguje i czytnik ekranu jej nie widzi).
- Wolny start: skończone logo stoi, animacja nie jest powtarzana ani zapętlana. Po 5 s komunikat „Wczytywanie trwa dłużej niż zwykle…”, po 12 s przycisk „Spróbuj ponownie”.
- Błąd startu: animacja dokańcza się, potem ekran startowy znika i widać komunikat błędu z przyciskiem ponowienia. Ekran nigdy nie wisi bez wyjścia (dodatkowo zegar awaryjny liczy tylko czas, gdy strona jest widoczna).
- Koniec animacji to zdarzenie znacznika `.sp-end` (trwa tyle co cała oś czasu). Jeśli skrypt załaduje się po jej końcu, pytamy `getAnimations()`, nie czekamy na zdarzenie, które już było.
- Ukryta karta wstrzymuje animację i wznawia ją po powrocie, więc użytkownik widzi całość.
- Gra tylko przy prawdziwym uruchomieniu. Flaga `smith.splash` w `sessionStorage` (ustawiana po zakończeniu) powoduje, że odświeżenie w tej samej sesji pomija ekran. Zmiana zakładki i powrót z tła nie przeładowują strony, więc nic się nie powtarza. Po zabiciu procesu przez Androida to jest nowy start i animacja gra.
- `prefers-reduced-motion`: bez animacji. Gotowe logo i napis są widoczne od pierwszej klatki, trzymane 600 ms, potem krótkie (120 ms) przejście krycia.

## Android

- Android 12+: systemowy ekran startowy ma tylko kolor tła (`windowSplashScreenBackground`) i pustą ikonę (`splash_icon_empty`), więc nie ma drugiego logo ani błysku. Logo rysuje animowany ekran w WebView, na tym samym tle.
- Wcześniejsze wersje Androida: `android:background` motywu startowego (ten sam kolor).
- Okno pod WebView ma kolor tła aplikacji (`windowBackground`), więc przed pierwszym malowaniem nie ma białego ani czarnego błysku. Kolory tła w `values/` i `values-night/` pochodzą z tokenów (`#F4F5F6`, `#0B0E11`).
