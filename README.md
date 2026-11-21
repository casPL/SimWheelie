# SimWheelie

A browser wheelie trainer. Ride on the back wheel and keep the bike as close to its balance point as you
can: the score is the distance covered on the back wheel. Five bikes, from a 12" pit bike to a GSX-R 1000,
with the same data as [SimGP8](https://github.com/casPL/SimGP8).

[Opis po polsku](#po-polsku) jest niżej.

## Playing

The game is a single HTML file and needs nothing but a browser. Download
[dist/simwheelie.html](dist/simwheelie.html) and open it. The interface is in Polish.

- <kbd>↑</kbd> or <kbd>W</kbd>: throttle. <kbd>↓</kbd> or <kbd>S</kbd>: rear brake. <kbd>←</kbd> <kbd>→</kbd>
  or <kbd>A</kbd> <kbd>D</kbd>: body back and forward on the seat. <kbd>Space</kbd> starts an attempt,
  <kbd>P</kbd> pauses. On a phone the buttons sit under the picture, and on top of it in landscape.
- An attempt starts once the front rises past 20°. Lower hops do not end it, so they can be used to pick up
  speed and to pump the fork. The front has to come up within 150 m.
- Tail scrapes are allowed, but the distance stops while the tail is on the asphalt. The attempt ends when
  the front wheel touches down, when the bike goes over the tail, or when it sits on the tail with no speed
  left.
- Tempo 50% or 35% slows the clock down and leaves the physics as it is. Records are kept for each bike and
  tempo.

The fonts come from Google Fonts; offline, the browser falls back to its own.

## What it models

- Pitch as a rotation about the rear axle with the base free to move: the drive force, the inertia of the
  engine and the rear wheel, and the reaction to every change of pitch rate push the bike forward or back
  as it rotates.
- The balance point, BP = atan(b / (h − r)), from the centre of mass of the bike and rider. It moves as the
  rider slides on the seat, and the slide itself pitches the bike too, much more on a light bike.
- Throttle response and engine power, a grip limit for the rear tyre, the rear brake, air drag and rolling
  resistance.
- A sprung and damped front fork. A dab of the rear brake dives the front, and throttle on the rebound
  lifts it with less throttle than from a steady roll; on the light bikes with soft forks this is easy to
  feel.
- A sprung tail that scrapes the asphalt with friction. Whether the bike goes over the tail is decided by
  the energy it brings to the first touch.
- A bumpy road and the rear suspension over it.
- A telemetry chart of the last 12 s: pitch against the balance point, throttle, brake and body position.

## Building

Node.js 18 or newer, no dependencies:

```sh
node build.js     # writes dist/simwheelie.html
npm test          # what the physics promises, and recorded rides
npm run format    # Prettier, the only development dependency
```

## Source layout

```text
src/js/           the game; build.js joins the files in order, and they share one scope
  core … physics    the physics, which also runs without a browser (see test/)
  app … main        the interface
src/page.html     the markup
src/style.css     styles
src/shell.html    the document the build fills in
test/             tests, with the recorded rides
```

## Licence

SimWheelie is free software: you can redistribute it and/or modify it under the terms of the GNU General
Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
option) any later version. It comes with no warranty. See [LICENSE](LICENSE).

## Author

Maciej Kasprzyk, Instagram [@cas8pl](https://www.instagram.com/cas8pl/)

## Po polsku

SimWheelie to trening jazdy na tylnym kole w przeglądarce. Trzeba utrzymać motocykl jak najbliżej balance
pointu, a wynikiem jest dystans przejechany na tylnym kole. Pięć motocykli, od pitbike'a 12" po GSX-R 1000,
z tymi samymi danymi co w [SimGP8](https://github.com/casPL/SimGP8).

Gra to jeden plik HTML, wystarczy przeglądarka: pobierz [dist/simwheelie.html](dist/simwheelie.html)
i otwórz go. Sterowanie: <kbd>↑</kbd> gaz, <kbd>↓</kbd> tylny hamulec, <kbd>←</kbd> <kbd>→</kbd> ciało do
tyłu i do przodu, <kbd>Spacja</kbd> start, <kbd>P</kbd> pauza. Na telefonie przyciski są na ekranie.

Model obejmuje obrót motocykla wokół osi tylnego koła z bezwładnością silnika i koła, balance point zależny
od pozycji ciała na siedzeniu, moc silnika i przyczepność tylnej opony, tylny hamulec, sprężysty widelec
(krótkie przyhamowanie tyłem i gaz na wybiciu podrywają przód przy mniejszym gazie), przycierki ogonem
z tarciem, przewrotkę przez ogon zależną od energii przy pierwszym dotknięciu, nierówną nawierzchnię
i telemetrię z ostatnich 12 sekund.

Budowanie: `node build.js` (Node.js 18 lub nowszy, bez zależności), testy: `npm test`.

Licencja: GNU GPL w wersji 3 lub nowszej (plik [LICENSE](LICENSE)). Autor: Maciej Kasprzyk,
Instagram [@cas8pl](https://www.instagram.com/cas8pl/).
