// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Maciej Kasprzyk
//
// Engine, tail scrape and crash sounds, synthesised with Web Audio. Off until switched on.

const sound = (() => {
  let ac = null,
    n = null;
  function build() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const out = ac.createGain();
    out.gain.value = 0;
    out.connect(ac.destination);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.connect(out);
    const o1 = ac.createOscillator();
    const o2 = ac.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    const g2 = ac.createGain();
    g2.gain.value = 0.5;
    o1.connect(lp);
    o2.connect(g2).connect(lp);
    o1.start();
    o2.start();
    const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource();
    ns.buffer = nb;
    ns.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.9;
    const gs = ac.createGain();
    gs.gain.value = 0;
    ns.connect(bp).connect(gs).connect(ac.destination);
    ns.start();
    n = { out, lp, o1, o2, gs };
  }
  return {
    toggle(on) {
      try {
        if (on && !ac) build();
        if (ac) on ? ac.resume() : ac.suspend();
      } catch (e) {}
    },
    resume() {
      if (cfg.sound && ac) ac.resume().catch(() => {});
    },
    update(st, riding) {
      if (!cfg.sound || !n) return;
      const t = ac.currentTime;
      const e = bike.look === 'e';
      let f, vol, cut;
      if (e) {
        f = 140 + 70 * st.v;
        vol = riding ? 0.02 + 0.05 * st.thr + 0.004 * st.v : 0;
        cut = 2400;
      } else {
        f = Math.min(260, 26 + 8 * st.v + 30 * st.thr);
        vol = riding ? 0.05 + 0.1 * st.thr : 0;
        cut = 500 + 1600 * st.thr;
      }
      const wave = e ? 'triangle' : 'sawtooth';
      if (n.o1.type !== wave) n.o1.type = wave;
      n.o1.frequency.setTargetAtTime(f, t, 0.03);
      n.o2.frequency.setTargetAtTime(e ? f * 2.01 : f / 2, t, 0.03);
      n.lp.frequency.setTargetAtTime(cut, t, 0.05);
      n.out.gain.setTargetAtTime(vol, t, 0.06);
      const scrape = riding && st.scrape && st.v > 0.5 ? Math.min(0.14, 0.04 + 0.012 * st.v) : 0;
      n.gs.gain.setTargetAtTime(scrape, t, 0.03);
    },
    crash() {
      if (!cfg.sound || !ac) return;
      try {
        const len = ac.sampleRate * 0.5;
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
        const src = ac.createBufferSource();
        const g = ac.createGain();
        g.gain.value = 0.25;
        src.buffer = buf;
        src.connect(g).connect(ac.destination);
        src.start();
      } catch (e) {}
    },
  };
})();
