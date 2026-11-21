// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The bike data table, the start and result cards, and the tip after each attempt.

function bikeInfo() {
  const c = prep(bike);
  const bp = (b) => Math.round(deg(balancePoint(bike, b)));
  $('dblTxt').textContent =
    i18n`Na motocyklu ${bike.name} odchylenie od BP rośnie dwukrotnie mniej więcej co ${fmt(doubling(bike), 2)} s, jeśli nic nie zrobisz.`;
  $('specTitle').textContent = i18n`Dane: ${bike.name}`;
  const rows = [
    [i18n`Masa z kierowcą`, `${c.M} kg`],
    [i18n`Rozstaw osi`, `${fmt(bike.L, 2)} m`],
    [
      i18n`Środek ciężkości: przed tylną osią / nad asfaltem`,
      `${Math.round(c.b0 * 100)} / ${Math.round(bike.h * 100)} cm`,
    ],
    [i18n`Promień tylnego koła`, `${Math.round(bike.rr * 100)} cm`],
    [i18n`Balance point: ciało w środku / z tyłu / z przodu`, `${bp(0)}° / ${bp(-1)}° / ${bp(1)}°`],
    [i18n`Ogon dotyka asfaltu od`, `${Math.round(deg(c.tail))}°`],
    [i18n`Moc`, `${bike.P} kW`],
    [i18n`Najmocniejsze przyspieszenie na niskiej prędkości`, `${fmt(bike.aMax)} m/s²`],
    [
      i18n`Przód rusza z ziemi od przyspieszenia (ciało w środku / z tyłu)`,
      `${fmt(liftLimit(bike, 0))} / ${fmt(liftLimit(bike, -1))} m/s²`,
    ],
    [i18n`Najmocniejszy tylny hamulec na kole`, `${fmt(bike.brk)} m/s²`],
    [i18n`Widelec od ugięcia pod ciężarem do pełnego wybicia`, `${Math.round(bike.ext * 100)} cm`],
    [i18n`Przesunięcie ciała na siedzeniu`, `±${Math.round(bike.dx * 100)} cm`],
  ];
  $('spec').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  drawBpDemo();
}

function clearRun(next) {
  S = newState();
  trace = [];
  traceT = 0;
  crash = null;
  parts = [];
  phase = next;
  paused = false;
  invalidate();
}

function reset() {
  clearRun('ready');
  showReady();
}

function start() {
  clearRun('ride');
  $('overlay').hidden = true;
  sound.resume();
  if (LANDPADS.matches) $('play').scrollIntoView({ block: 'end', behavior: 'smooth' });
}

function showReady() {
  const rec = best[bestKey()];
  const weak = bike.aMax < liftLimit(bike, 0) * 1.04;
  $('overlay').hidden = false;
  $('overlay').innerHTML = `<div class="card">
    <h2>${bike.name}</h2>
    <p class="meta">BP ${Math.round(deg(balancePoint(bike, 0)))}° · ${i18n`tempo ${pct(cfg.tempo)}`}${rec ? ' · ' + i18n`rekord ${fmt(rec)} m` : ''}</p>
    <p>${i18n`Rozpędź się i poderwij przód gazem z ciałem do tyłu, a potem trzymaj motocykl jak najbliżej <b>balance pointu</b>. Próba zaczyna się, gdy przód wstanie ponad ${LIFT_DEG}°, a wcześniejsze podskoki nie kończą gry. Wynikiem jest dystans na tylnym kole. Próba kończy się, gdy przód dotknie asfaltu albo motocykl przewróci się do tyłu. Przycierki tyłem są dozwolone, ale ten odcinek nie wlicza się do dystansu.`}</p>
    ${weak ? `<p class="hint">${i18n`Na samym gazie przód tego motocykla ledwo rusza. Przesuń ciało do tyłu albo napompuj przód: krótko przyhamuj tyłem i od razu dodaj gazu.`}</p>` : ''}
    <p class="keys">${i18n`<kbd>↑</kbd> gaz · <kbd>↓</kbd> tylny hamulec · <kbd>←</kbd> <kbd>→</kbd> ciało`}</p>
    <p>${cfg.tempo < 1 ? i18n`Tempo ${pct(cfg.tempo)}: czas płynie wolniej, fizyka zostaje ta sama.` + ' ' : ''}${i18n`100% to czas rzeczywisty.`}</p>
    <button class="btn go" id="goBtn">${i18n`Start (Spacja)`}</button>
  </div>`;
  $('goBtn').addEventListener('click', start);
}

function tipFor(r) {
  if (r.reason === 'late')
    return i18n`Przesuń ciało do tyłu i otwórz gaz do końca. Gdy przód ruszy w górę, od razu przymykaj manetkę, zanim dojdzie do balance pointu. Możesz też napompować przód: krótko przyhamuj tyłem, puść hamulec i od razu dodaj gazu.`;
  if (r.reason === 'loop') {
    if (r.brk < 0.3)
      return i18n`Ogon uderzył w asfalt za szybko i motocykl przewrócił się przez niego, a tylny hamulec prawie nie pracował. Trzymaj stopę na hamulcu i naciśnij go, zanim przód przejdzie przez BP. Wtedy ogon najwyżej przyciera.`;
    return i18n`Hamulec przyszedł za późno i ogon uderzył w asfalt za szybko. Za balance pointem środek ciężkości jest tuż przed ogonem, więc mocne uderzenie przerzuca motocykl. Naciśnij hamulec wcześniej, wtedy ogon tylko przyciera.`;
  }
  if (r.reason === 'tail')
    return i18n`Motocykl usiadł na ogonie i stracił prędkość. Gdy ogon dotknie asfaltu, od razu naciśnij tylny hamulec i przesuń ciało do przodu, póki jeszcze jedziesz. Hamowanie ściąga przód w dół i zdejmuje motocykl z ogona.`;
  if (r.meanDev < -8)
    return i18n`Przód był średnio ${fmt(-r.meanDev, 0)}° pod balance pointem. Tak nisko przód trzyma się tylko na przyspieszaniu, a ono kiedyś się kończy. Podnieś przód bliżej BP, wtedy wystarczy odrobina gazu.`;
  if (r.brkAtEnd > 0.3)
    return i18n`Przód spadł przy wciśniętym hamulcu. Po korekcie hamulcem od razu go puść i dodaj trochę gazu.`;
  if (r.vMax * 3.6 > 70)
    return i18n`Prędkość rosła, aż zabrakło mocy na trzymanie przodu. Bliżej BP gazu potrzeba mało i prędkość przestaje rosnąć.`;
  if (r.bpPct >= 40)
    return i18n`Dobrze trzymasz okolice BP. Teraz pracuj nad mniejszymi ruchami manetką: krótko i mało zamiast pełnych otwarć.`;
  return i18n`Przód spadł, bo zabrakło gazu. Gdy przód zaczyna opadać, dodaj gazu od razu, zanim spadnie o kilka stopni.`;
}

const END_TITLE = {
  loop: i18n`Przewrotka przez ogon`,
  tail: i18n`Motocykl utknął na ogonie`,
  down: i18n`Przód na ziemi`,
  late: i18n`Przód nie poszedł w górę`,
};

function finish() {
  phase = 'over';
  invalidate();
  const r = {
    reason: S.done,
    dist: S.wDist,
    time: S.wTime,
    bpPct: S.wTime > 0 ? (100 * S.bpTime) / S.wTime : 0,
    maxTh: S.maxTh,
    meanDev: S.wTime > 0 ? deg(S.sumDev / S.wTime) : 0,
    vMax: S.vMax,
    brk: S.brkHist,
    brkAtEnd: S.brk,
    impact: S.impact,
  };
  if (r.reason === 'loop') {
    crash = { om: Math.max(1.5, S.om), v: S.v };
    flash = 1;
    sound.crash();
  } else if (r.reason === 'down' && r.impact > 1.5) {
    shake = Math.min(0.4, r.impact * 0.08);
  }
  const k = bestKey();
  const isRec = r.reason !== 'late' && r.dist >= 1 && r.dist > (best[k] || 0);
  if (isRec) {
    best[k] = Math.round(r.dist * 10) / 10;
    store.set('simwheelie-best', best);
  }
  const hard =
    r.reason === 'down' && r.impact > 2.5
      ? `<p>${i18n`Przód spadł twardo. W realu takie lądowanie męczy widelec i wybija z rytmu.`}</p>`
      : '';
  const record = best[k] ? `${fmt(best[k])} m` : '–';
  $('overlay').hidden = false;
  $('overlay').innerHTML = `<div class="card">
    <h2>${END_TITLE[r.reason]}</h2>
    <div class="stats">
      <div class="stat"><div class="k">${i18n`Dystans`}</div><div class="v${isRec ? ' rec' : ''}">${fmt(r.dist)} m</div></div>
      <div class="stat"><div class="k">${i18n`Czas`}</div><div class="v">${fmt(r.time)} s</div></div>
      <div class="stat"><div class="k">${i18n`Strefa BP`}</div><div class="v">${fmt(r.bpPct, 0)}%</div></div>
    </div>
    <p class="meta">${i18n`maks. ${fmt(deg(r.maxTh), 0)}° · maks. ${fmt(r.vMax * 3.6, 0)} km/h · rekord ${record} · tempo ${pct(cfg.tempo)}`}</p>
    ${isRec ? `<p><b>${i18n`Nowy rekord.`}</b></p>` : ''}
    <p class="tip">${tipFor(r)}</p>
    ${hard}
    <button class="btn go" id="goBtn">${i18n`Jeszcze raz (Spacja)`}</button>
  </div>`;
  $('goBtn').addEventListener('click', start);
}
