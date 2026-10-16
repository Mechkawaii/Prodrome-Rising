/* Lecteur de musiques 16 bits : remplace le synthé temps réel. calme ↔ combat en fondu enchaîné */
Object.assign(Music, {
  buf: {}, pend: {}, src: null, key: null, want2: null, g2: null, vol2: .8,
  ensure() { const c = Sound.ctx; if (!c) return false; if (!this.g2) { this.g2 = c.createGain(); this.g2.gain.value = this.vol2 * Opts.mus; this.g2.connect(c.destination); } return true; },
  setVol() { try { if (this.g2) this.g2.gain.setTargetAtTime(this.vol2 * Opts.mus, Sound.ctx.currentTime, .03); } catch (e) { } },
  start() { if (!Sound.on || this.playing || !this.ensure()) return; this.playing = true; this.play(this.want2 || 's1n'); },
  stop() { this.playing = false; this.key = null; this.fadeOld(.6); },
  sync() { if (Sound.on) this.start(); else this.stop(); },
  mood(floor, type, depth, fight) {
    const f = Math.max(1, Math.min(6, floor || 1));
    let k;
    if (type === 'boss') k = 'boss';
    else if (type === 'shop' || type === 'heal' || type === 'item' || type === 'vault') k = 'shop';
    else k = fight ? 'c' + f : 's' + f + 'n';
    this.want2 = k; if (this.playing) this.play(k);
  },
  load(k) {
    if (this.buf[k]) return Promise.resolve(this.buf[k]);
    if (this.pend[k]) return this.pend[k];
    return this.pend[k] = new Promise((ok, ko) => {
      try {
        const s = atob(MDATA[k]), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
        Sound.ctx.decodeAudioData(u.buffer, b => { this.buf[k] = b; ok(b); }, ko);
      } catch (e) { ko(e); }
    });
  },
  fadeOld(t) {
    const o = this.src; this.src = null; if (!o) return; const c = Sound.ctx;
    try { o.g.gain.cancelScheduledValues(c.currentTime); o.g.gain.setValueAtTime(o.g.gain.value, c.currentTime); o.g.gain.linearRampToValueAtTime(0, c.currentTime + t); o.s.stop(c.currentTime + t + .05); } catch (e) { }
  },
  play(k) {
    if (k === this.key || !MDATA[k]) return;
    this.key = k;
    this.load(k).then(b => {
      if (!this.playing || this.key !== k) return;
      const c = Sound.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.loop = true;
      const first = !this.src; this.fadeOld(first ? .1 : 1.2);
      g.gain.setValueAtTime(.0001, c.currentTime); g.gain.linearRampToValueAtTime(1, c.currentTime + (first ? .5 : 1.2));
      s.connect(g); g.connect(this.g2); s.start(); this.src = { s, g };
    }).catch(() => { if (this.key === k) this.key = null; });
  }
});
