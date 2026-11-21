// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// The bike data table, the start and result cards, and the tip after each attempt.

function bikeInfo() {
  const c = prep(bike);
  const bp = (b) => Math.round(deg(balancePoint(bike, b)));
  $('dblTxt').textContent =
    `Na motocyklu ${bike.name} odchylenie od BP rośnie dwukrotnie mniej więcej co ${fmt(doubling(bike), 2)} s, jeśli nic nie zrobisz.`;
  $('specTitle').textContent = 'Dane: ' + bike.name;
  const rows = [
    ['Masa z kierowcą', `${c.M} kg`],
    ['Rozstaw osi', `${fmt(bike.L, 2)} m`],
    ['Środek ciężkości: przed tylną osią / nad asfaltem', `${Math.round(c.b0 * 100)} / ${Math.round(bike.h * 100)} cm`],
    ['Promień tylnego koła', `${Math.round(bike.rr * 100)} cm`],
    ['Balance point: ciało w środku / z tyłu / z przodu', `${bp(0)}° / ${bp(-1)}° / ${bp(1)}°`],
    ['Ogon dotyka asfaltu od', `${Math.round(deg(c.tail))}°`],
    ['Moc', `${bike.P} kW`],
    ['Najmocniejsze przyspieszenie na niskiej prędkości', `${fmt(bike.aMax)} m/s²`],
    [
      'Przód rusza z ziemi od przyspieszenia (ciało w środku / z tyłu)',
      `${fmt(liftLimit(bike, 0))} / ${fmt(liftLimit(bike, -1))} m/s²`,
    ],
    ['Najmocniejszy tylny hamulec na kole', `${fmt(bike.brk)} m/s²`],
    ['Widelec od ugięcia pod ciężarem do pełnego wybicia', `${Math.round(bike.ext * 100)} cm`],
    ['Przesunięcie ciała na siedzeniu', `±${Math.round(bike.dx * 100)} cm`],
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
    <p class="meta">BP ${Math.round(deg(balancePoint(bike, 0)))}° · tempo ${pct(cfg.tempo)}${rec ? ` · rekord ${fmt(rec)} m` : ''}</p>
    <p>Rozpędź się i poderwij przód gazem z ciałem do tyłu, a potem trzymaj motocykl jak najbliżej <b>balance pointu</b>. Próba zaczyna się, gdy przód wstanie ponad ${LIFT_DEG}°, a wcześniejsze podskoki nie kończą gry. Wynikiem jest dystans na tylnym kole. Próba kończy się, gdy przód dotknie asfaltu albo motocykl przewróci się do tyłu. Przycierki tyłem są dozwolone, ale ten odcinek nie wlicza się do dystansu.</p>
    ${weak ? '<p class="hint">Na samym gazie przód tego motocykla ledwo rusza. Przesuń ciało do tyłu albo napompuj przód: krótko przyhamuj tyłem i od razu dodaj gazu.</p>' : ''}
    <p class="keys"><kbd>↑</kbd> gaz · <kbd>↓</kbd> tylny hamulec · <kbd>←</kbd> <kbd>→</kbd> ciało</p>
    <p>${cfg.tempo < 1 ? `Tempo ${pct(cfg.tempo)}: czas płynie wolniej, fizyka zostaje ta sama. ` : ''}100% to czas rzeczywisty.</p>
    <button class="btn go" id="goBtn">Start (Spacja)</button>
  </div>`;
  $('goBtn').addEventListener('click', start);
}

function tipFor(r) {
  if (r.reason === 'late')
    return 'Przesuń ciało do tyłu i otwórz gaz do końca. Gdy przód ruszy w górę, od razu przymykaj manetkę, zanim dojdzie do balance pointu. Możesz też napompować przód: krótko przyhamuj tyłem, puść hamulec i od razu dodaj gazu.';
  if (r.reason === 'loop') {
    if (r.brk < 0.3)
      return 'Ogon uderzył w asfalt za szybko i motocykl przewrócił się przez niego, a tylny hamulec prawie nie pracował. Trzymaj stopę na hamulcu i naciśnij go, zanim przód przejdzie przez BP. Wtedy ogon najwyżej przyciera.';
    return 'Hamulec przyszedł za późno i ogon uderzył w asfalt za szybko. Za balance pointem środek ciężkości jest tuż przed ogonem, więc mocne uderzenie przerzuca motocykl. Naciśnij hamulec wcześniej, wtedy ogon tylko przyciera.';
  }
  if (r.reason === 'tail')
    return 'Motocykl usiadł na ogonie i stracił prędkość. Gdy ogon dotknie asfaltu, od razu naciśnij tylny hamulec i przesuń ciało do przodu, póki jeszcze jedziesz. Hamowanie ściąga przód w dół i zdejmuje motocykl z ogona.';
  if (r.meanDev < -8)
    return `Przód był średnio ${fmt(-r.meanDev, 0)}° pod balance pointem. Tak nisko przód trzyma się tylko na przyspieszaniu, a ono kiedyś się kończy. Podnieś przód bliżej BP, wtedy wystarczy odrobina gazu.`;
  if (r.brkAtEnd > 0.3)
    return 'Przód spadł przy wciśniętym hamulcu. Po korekcie hamulcem od razu go puść i dodaj trochę gazu.';
  if (r.vMax * 3.6 > 70)
    return 'Prędkość rosła, aż zabrakło mocy na trzymanie przodu. Bliżej BP gazu potrzeba mało i prędkość przestaje rosnąć.';
  if (r.bpPct >= 40)
    return 'Dobrze trzymasz okolice BP. Teraz pracuj nad mniejszymi ruchami manetką: krótko i mało zamiast pełnych otwarć.';
  return 'Przód spadł, bo zabrakło gazu. Gdy przód zaczyna opadać, dodaj gazu od razu, zanim spadnie o kilka stopni.';
}

const END_TITLE = {
  loop: 'Przewrotka przez ogon',
  tail: 'Motocykl utknął na ogonie',
  down: 'Przód na ziemi',
  late: 'Przód nie poszedł w górę',
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
      ? '<p>Przód spadł twardo. W realu takie lądowanie męczy widelec i wybija z rytmu.</p>'
      : '';
  $('overlay').hidden = false;
  $('overlay').innerHTML = `<div class="card">
    <h2>${END_TITLE[r.reason]}</h2>
    <div class="stats">
      <div class="stat"><div class="k">Dystans</div><div class="v${isRec ? ' rec' : ''}">${fmt(r.dist)} m</div></div>
      <div class="stat"><div class="k">Czas</div><div class="v">${fmt(r.time)} s</div></div>
      <div class="stat"><div class="k">Strefa BP</div><div class="v">${fmt(r.bpPct, 0)}%</div></div>
    </div>
    <p class="meta">maks. ${fmt(deg(r.maxTh), 0)}° · maks. ${fmt(r.vMax * 3.6, 0)} km/h · rekord ${best[k] ? fmt(best[k]) + ' m' : '–'} · tempo ${pct(cfg.tempo)}</p>
    ${isRec ? '<p><b>Nowy rekord.</b></p>' : ''}
    <p class="tip">${tipFor(r)}</p>
    ${hard}
    <button class="btn go" id="goBtn">Jeszcze raz (Spacja)</button>
  </div>`;
  $('goBtn').addEventListener('click', start);
}
