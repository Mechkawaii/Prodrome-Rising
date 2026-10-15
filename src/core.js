/* ===== CORE : constantes, outils, entrées, audio ===== */
const W = 320, H = 180, T = 16, COLS = 20, ROWS = 11;
const TAU = Math.PI * 2;
let _seed = (Date.now() ^ 0x9e3779b9) >>> 0;
function rnd() { // mulberry32
  _seed = (_seed + 0x6D2B79F5) >>> 0;
  let t = _seed; t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const seedRng = n => { _seed = n >>> 0; }, getSeed = () => _seed;
const rr = (a, b) => a + rnd() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const strip = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’]/g, "'").toUpperCase();
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const shade = (h, f) => { const [r, g, b] = hex2rgb(h); return f < 0 ? rgb2hex(r * (1 + f), g * (1 + f), b * (1 + f)) : rgb2hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); };
const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---------- Entrées ---------- */
const Input = {
  left: 0, right: 0, jump: 0, fire: 0, ult: 0, shield: 0, repair: 0, pause: 0, dash: 0,
  jumpPressed: 0, ultPressed: 0, shieldPressed: 0, repairPressed: 0, dashPressed: 0,
  mx: 0, my: 0, mouse: false, _prev: {},
  held: {},
  set(k, v) {
    if (v && !this.held[k]) { this[k + 'Pressed'] = 1; }
    this.held[k] = v; this[k] = v ? 1 : 0;
  },
  endFrame() { this.jumpPressed = this.ultPressed = this.shieldPressed = this.repairPressed = this.dashPressed = 0; },
  reset() { for (const k in this.held) this.set(k, 0); this.endFrame(); }
};
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', Space: 'jump',
  KeyJ: 'fire', KeyX: 'fire', KeyK: 'ult', KeyE: 'ult', ShiftLeft: 'shield', KeyL: 'shield', KeyR: 'repair', KeyF: 'repair', KeyC: 'dash', KeyV: 'dash'
};

/* ---------- Audio (synthèse WebAudio) ---------- */
const Sound = {
  ctx: null, on: true,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { this.ctx = new AC(); } } catch (e) { }
  },
  tone(f0, f1, dur, type, vol, delay) {
    if (!this.on || !this.ctx) return;
    try {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { }
  },
  noise(dur, vol, f) {
    if (!this.on || !this.ctx) return;
    try {
      const c = this.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = f || 1200; g.gain.value = vol || 0.08;
      s.buffer = b; s.connect(fl); fl.connect(g); g.connect(c.destination); s.start();
    } catch (e) { }
  },
  play(n) {
    switch (n) {
      case 'shoot': this.tone(720, 260, 0.07, 'square', 0.025); break;
      case 'shootH': this.tone(300, 90, 0.12, 'sawtooth', 0.04); break;
      case 'hit': this.tone(220, 120, 0.05, 'square', 0.03); break;
      case 'kill': this.noise(0.16, 0.07, 1800); this.tone(180, 50, 0.16, 'sawtooth', 0.04); break;
      case 'hurt': this.tone(200, 50, 0.3, 'sawtooth', 0.09); this.noise(0.2, 0.08, 800); break;
      case 'jump': this.tone(260, 520, 0.1, 'square', 0.03); break;
      case 'jump2': this.tone(380, 700, 0.1, 'square', 0.03); break;
      case 'pick': this.tone(520, 1040, 0.09, 'triangle', 0.06); this.tone(780, 1560, 0.1, 'triangle', 0.05, 0.08); break;
      case 'ult': this.tone(120, 900, 0.4, 'sawtooth', 0.07); this.noise(0.3, 0.06, 2500); break;
      case 'boom': this.noise(0.35, 0.12, 900); this.tone(110, 35, 0.3, 'sine', 0.1); break;
      case 'dash': this.noise(0.12, 0.05, 3000); this.tone(500, 900, 0.08, 'sine', 0.03); break;
      case 'crit': this.tone(900, 1500, 0.06, 'square', 0.035); break;
      case 'coin': this.tone(1200, 1800, 0.05, 'square', 0.03); break;
      case 'door': this.tone(300, 600, 0.12, 'triangle', 0.05); this.tone(450, 900, 0.14, 'triangle', 0.05, 0.1); break;
      case 'shield': this.tone(500, 900, 0.15, 'sine', 0.06); break;
      case 'warn': this.tone(880, 880, 0.06, 'square', 0.03); break;
      case 'boss': this.tone(90, 60, 0.8, 'sawtooth', 0.09); this.tone(135, 90, 0.8, 'sawtooth', 0.06); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.18, 'square', 0.05, i * 0.13)); break;
      case 'lose': [330, 262, 196, 130].forEach((f, i) => this.tone(f, f * 0.9, 0.25, 'sawtooth', 0.06, i * 0.18)); break;
    }
  }
};

/* ---------- Police pixel 3x5 (majuscules ASCII) ---------- */
const FONT = {
  'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111', 'F': '111100110100100',
  'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010', 'K': '101101110101101', 'L': '100100100100111',
  'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010', 'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101',
  'S': '011100010001110', 'T': '111010010010010', 'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101',
  'Y': '101101010010010', 'Z': '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '.': '000000000000010', ',': '000000000010100', ':': '000010000010000', '!': '010010010000010', '?': '110001010000010', '-': '000000111000000',
  '+': '000010111010000', '/': '001001010100100', '%': '101001010100101', "'": '010010000000000', '(': '010100100100010', ')': '010001001001010',
  '*': '000101010101000', 'x': '000101010101000', '=': '000111000111000', '>': '100010001010100', '<': '001010100010001', ' ': '000000000000000'
};
function drawText(ctx, s, x, y, col, sc, align) {
  sc = sc || 1; s = strip(s);
  const w = s.length * 4 * sc - sc;
  if (align === 'c') x -= w >> 1; else if (align === 'r') x -= w;
  ctx.fillStyle = col || '#fff';
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] || FONT['?'];
    for (let k = 0; k < 15; k++) if (g[k] === '1') ctx.fillRect(Math.round(x + (i * 4 + k % 3) * sc), Math.round(y + ((k / 3) | 0) * sc), sc, sc);
  }
  return w;
}
const textW = (s, sc) => strip(s).length * 4 * (sc || 1) - (sc || 1);

/* ---------- Musique : 8 morceaux (WebAudio, séquenceur) ---------- */
const hz = n => 55 * Math.pow(2, n / 12);
const CH = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], sus: [0, 5, 7], dim: [0, 3, 6], m9: [0, 3, 7, 14] };
const lcgSeq = seed => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
// notes en demi-tons au-dessus de La1 (55 Hz) ; pat = 16 pas ; A/B = 8 mesures chacune
const TRACKS = [
  { id: 'faubourg', tempo: 108, seed: 11, // synthwave classique, La mineur
    prog: [[[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M'], [0, 'm'], [-4, 'M'], [-5, 'M'], [-5, 'M']], [[-4, 'M'], [3, 'M'], [-2, 'M'], [0, 'm'], [-4, 'M'], [-7, 'm'], [-5, 'M'], [-5, 'M']]],
    bass: ['1.1.1.1.1.1.1.2.', '1.2.1.2.1.2.1.2.'], bassW: 'square', arp: [[0, 1, 2, 1, 0, 2, 1, 2], [0, 2, 1, 2, 1, 2, 0, 1]], arpW: 'square', arpOct: 4,
    kick: ['x.......x.x.....', 'x...x...x...x...'], snare: '....x.......x...', hat: ['.x.x.x.x.x.x.x.x', 'xxxxxxxxxxxxxxxx'], lead: 'triangle', dens: .55, pad: 'triangle' },
  { id: 'pluie', tempo: 86, seed: 23, swing: .22, // lo-fi pluvieux, accords de septième
    prog: [[[-7, 'm7'], [-9, 'M7'], [-14 + 12, 'm7'], [0, 'M'], [-7, 'm7'], [-9, 'M7'], [-2, 'M7'], [0, 'sus']], [[-9, 'M7'], [-7, 'm7'], [-9, 'M7'], [0, 'M'], [-14 + 12, 'm7'], [-9, 'M7'], [-7, 'm7'], [0, 'M']]],
    bass: ['1.......1.....2.', '1.....1...2.....'], bassW: 'sine', arp: [[0, 2, 3, 2, 1, 2, 3, 1], [3, 2, 1, 2, 0, 1, 2, 3]], arpW: 'triangle', arpOct: 4,
    kick: ['x.......x.......', 'x.....x.x.......'], snare: '....x.......x...', hat: ['x.x.x.x.x.x.x.x.', 'x.xxx.x.x.xxx.x.'], lead: 'sine', dens: .4, pad: 'sine', soft: 1 },
  { id: 'metro', tempo: 124, seed: 37, // 4 temps au sol, Mi mineur, basse en contretemps
    prog: [[[-5, 'm'], [3 - 12, 'M'], [-3, 'M'], [-6, 'm'], [-5, 'm'], [3 - 12, 'M'], [-2, 'M'], [-3, 'M']], [[3 - 12, 'M'], [-3, 'M'], [-5, 'm'], [-6, 'm'], [3 - 12, 'M'], [-2, 'M'], [-3, 'M'], [-5, 'm']]],
    bass: ['.1.1.1.1.1.1.1.2', '.1.1.2.1.1.1.2.1'], bassW: 'sawtooth', arp: [[0, 1, 2, 0, 1, 2, 1, 0], [2, 1, 0, 1, 2, 1, 0, 2]], arpW: 'square', arpOct: 4, arpGain: .012,
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: ['..x...x...x...x.', '.xx.xxx..xx.xxxo'], lead: 'sawtooth', dens: .5, pad: 'triangle', leadGain: .02 },
  { id: 'fonderie', tempo: 98, seed: 41, // lourd, industriel, Do mineur
    prog: [[[3, 'm'], [3 - 4, 'M'], [3 - 2, 'M'], [-4 + 12 - 9, 'm'], [3, 'm'], [3 - 4, 'M'], [3 - 5, 'M'], [3 - 6, 'dim']], [[3, 'm'], [3, 'm'], [3 - 4, 'M'], [3 - 2, 'M'], [3 - 7, 'm'], [3 - 4, 'M'], [3 - 6, 'dim'], [3 - 5, 'M']]],
    bass: ['1..1..1...1.1...', '1..1..1..1.1.1.2'], bassW: 'square', arp: null, kick: ['x..x..x...x.x...', 'x..x..x.x..x..x.'], snare: ['....x.......x...', '....x.......x..x'], hat: ['x...x...x...x...', 'x.x.x.x.x.x.x.xo'], lead: 'square', dens: .4, pad: 'sawtooth', padG: .008, clang: 1 },
  { id: 'citadelle', tempo: 136, seed: 53, // rapide, arpèges 16es, Ré phrygien
    prog: [[[-7, 'm'], [-6, 'M'], [-7, 'm'], [-9, 'M'], [-7, 'm'], [-6, 'M'], [-4, 'M'], [-5, 'M']], [[-7, 'm'], [-9, 'M'], [-6, 'M'], [-7, 'm'], [-4, 'M'], [-6, 'M'], [-5, 'M'], [-5, 'M']]],
    bass: ['1.11.11.1.11.11.', '1.11.11.1.11.1.2'], bassW: 'sawtooth', arp: [[0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2], [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 2, 1]], arpW: 'square', arpOct: 8, arpEvery: 1, arpGain: .011,
    kick: ['x..x..x.x..x..x.', 'x.x.x.x.x.x.x.x.'], snare: '....x.......x...', hat: ['xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx'], lead: 'sawtooth', dens: .6, pad: 'triangle', leadGain: .018 },
  { id: 'reacteur', tempo: 116, seed: 67, // étrange, lydien, accords suspendus
    prog: [[[-2, 'M'], [0, 'sus'], [-4, 'M7'], [-5, 'sus'], [-2, 'M'], [0, 'sus'], [3, 'M'], [-5, 'dim']], [[-4, 'M7'], [-2, 'M'], [0, 'sus'], [-5, 'sus'], [3, 'M'], [-4, 'M7'], [-5, 'dim'], [-2, 'M']]],
    bass: ['1..1..2.1..1.2..', '1.2..1..1.2..1.2'], bassW: 'triangle', arp: [[0, 2, 1, 2, 0, 1, 2, 1], [1, 0, 2, 0, 1, 2, 0, 2]], arpW: 'triangle', arpOct: 8, arpGain: .02,
    kick: ['x..x....x.x.....', 'x..x..x.x.x...x.'], snare: ['....x.......x...', '....x..x....x..x'], hat: ['..x...x...x...x.', 'x.x.x.x.x.x.x.xx'], lead: 'square', dens: .45, pad: 'sine', leadGain: .02 },
  { id: 'egout', tempo: 78, seed: 91, // souterrains : lent, goutte à goutte, pédale grave
    prog: [[[0, 'm'], [0, 'm'], [-4, 'M7'], [0, 'm'], [0, 'm'], [-2, 'sus'], [-4, 'M7'], [-5, 'm7']], [[-2, 'm'], [-2, 'm'], [0, 'm9'], [-4, 'M7'], [0, 'm'], [-7, 'm'], [-5, 'm7'], [-5, 'sus']]],
    bass: ['1.......1.......', '1.......1...2...'], bassW: 'sine', arp: [[0, 2, 1, 3, 0, 2, 1, 3], [3, 1, 2, 0, 3, 1, 2, 0]], arpW: 'triangle', arpOct: 8, arpGain: .022, arpEvery: 2,
    kick: ['x...............', 'x.......x.......'], snare: ['................', '..........x.....'], hat: ['..x...x...x...x.', 'x.x.x.x.x.x.x.x.'], lead: 'sine', dens: .3, pad: 'sine', soft: 1, clang: 1 },
  { id: 'jungle', tempo: 128, seed: 97, swing: .12, // jungle : percussions tribales, 8es syncopées
    prog: [[[-2, 'm7'], [-2, 'm7'], [-7, 'M'], [-9, 'M'], [-2, 'm7'], [-2, 'm7'], [0, 'M'], [-5, 'M']], [[-7, 'M'], [-9, 'M'], [-2, 'm7'], [-2, 'm7'], [-7, 'M'], [0, 'M'], [-5, 'M'], [-2, 'm7']]],
    bass: ['1..1..1.1..1..1.', '1.11..1.1.1.1.2.'], bassW: 'triangle', arp: [[0, 2, 1, 2, 3, 2, 1, 0], [1, 3, 0, 2, 1, 3, 2, 0]], arpW: 'square', arpOct: 4, arpGain: .013,
    kick: ['x..x..x...x.x...', 'x..x..x.x.x.x..x'], snare: ['....x.......x...', '....x..x....x..x'], hat: ['x.xxx.xxx.xxx.xx', 'xxxxxxxxxxxxxxxx'], lead: 'triangle', dens: .55, pad: 'triangle', leadGain: .03 },
  { id: 'brasier', tempo: 142, seed: 103, // brasier : agressif, Fa# mineur
    prog: [[[-3, 'm'], [-3, 'm'], [-7, 'M'], [-5, 'M'], [-3, 'm'], [-3, 'm'], [-1, 'M'], [-2, 'M']], [[-7, 'M'], [-5, 'M'], [-3, 'm'], [-1, 'M'], [-7, 'M'], [-5, 'M'], [-2, 'M'], [-2, 'M']]],
    bass: ['1.1.1.1.1.1.1.11', '1.11.11.1.11.1.2'], bassW: 'sawtooth', arp: [[0, 1, 2, 1, 2, 1, 0, 1], [0, 2, 1, 2, 0, 2, 1, 2]], arpW: 'sawtooth', arpOct: 4, arpGain: .011,
    kick: ['x...x...x...x...', 'x..xx..xx..xx..x'], snare: ['....x.......x...', '....x..x....x.xx'], hat: ['x.x.x.x.x.x.x.xx', 'xxxxxxxxxxxxxxxx'], lead: 'square', dens: .6, pad: 'sawtooth', padG: .008, leadGain: .022 },
  { id: 'boutique', tempo: 92, seed: 71, swing: .15, calm: 1, // calme, bossa-jazz, Do majeur
    prog: [[[3 - 12, 'M7'], [0, 'm7'], [-7 + 12 - 12, 'm7'], [-2, 'M']].concat([[3 - 12, 'M7'], [0, 'm7'], [-7, 'm7'], [-2, 'M']]), [[0, 'm7'], [-7, 'm7'], [3 - 12, 'M7'], [-2, 'M'], [0, 'm7'], [-7, 'm7'], [-2, 'M'], [3 - 12, 'M7']]],
    bass: ['1.....2...1...2.', '1..2....1.....2.'], bassW: 'sine', arp: [[0, 2, 3, 2, 1, 3, 2, 1], [3, 1, 2, 0, 3, 2, 1, 2]], arpW: 'triangle', arpOct: 4,
    kick: ['x.......x.......', 'x.....x.x.......'], snare: '', hat: ['x.x.x.x.x.x.x.x.', 'x.xxx.xxx.xxx.xx'], lead: 'sine', dens: .5, pad: 'sine', soft: 1 },
  { id: 'boss', tempo: 152, seed: 83, boss: 1, // implacable, galop, Si diminué
    prog: [[[0, 'm'], [0, 'm'], [-4, 'M'], [-5, 'M'], [0, 'm'], [1, 'M'], [-5, 'M'], [-6, 'dim']], [[0, 'm'], [-4, 'M'], [1, 'M'], [-5, 'M'], [0, 'm'], [-6, 'dim'], [-5, 'M'], [-5, 'M']]],
    bass: ['1.11.11.1.11.11.', '1111111111111112'], bassW: 'sawtooth', arp: [[0, 1, 2, 1, 0, 1, 2, 1], [0, 2, 1, 2, 0, 2, 1, 2]], arpW: 'sawtooth', arpOct: 8, arpGain: .012,
    kick: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.xx.xx.x.'], snare: ['....x.......x...', '..x.x.x...x.x.xx'], hat: ['xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx'], lead: 'sawtooth', dens: .65, pad: 'sawtooth', padG: .01, leadGain: .02 }
];
const TRACK_BY = id => TRACKS.findIndex(t => t.id === id);
const FLOOR_TRACKS = [['faubourg', 'pluie'], ['metro', 'fonderie'], ['egout', 'reacteur'], ['jungle', 'pluie'], ['brasier', 'citadelle'], ['reacteur', 'citadelle']];
const Music = {
  playing: false, step: 0, next: 0, tempo: 108, cur: -1, want: 0, trans: 0, mel: null, timer: null, nb: null, gain: null,
  ensure() {
    const c = Sound.ctx; if (!c) return false; if (this.gain) return true;
    this.gain = c.createGain(); this.gain.gain.value = .5; this.gain.connect(c.destination);
    const n = c.sampleRate, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.nb = b; return true;
  },
  start() {
    if (!Sound.on || this.playing || !this.ensure()) return;
    this.playing = true; this.next = Sound.ctx.currentTime + .08; this.timer = setInterval(() => this.sched(), 40);
  },
  stop() { this.playing = false; if (this.timer) clearInterval(this.timer); this.timer = null; },
  sync() { if (Sound.on) this.start(); else this.stop(); },
  // choisit le morceau selon l'étage et le type de salle ; le changement se fait à la mesure suivante
  mood(floor, type, depth) {
    const f = Math.max(1, Math.min(6, floor || 1));
    let id;
    if (type === 'boss') id = 'boss';
    else if (type === 'shop' || type === 'heal' || type === 'item' || type === 'vault') id = 'boutique';
    else id = FLOOR_TRACKS[f - 1][(depth || 0) & 1];
    this.want = TRACK_BY(id); this.trans = type === 'boss' ? [0, -2, 3, 5, -4, 1][f - 1] : [0, 0, 0, 3, 0, -3][f - 1]; this.fl = f;
    if (this.cur < 0) this.load(this.want);
  },
  load(i) {
    this.cur = i; const T = TRACKS[i]; this.tempo = T.tempo; this.step = 0; this.mel = this.genMel(T);
  },
  genMel(T) {
    const R = lcgSeq(T.seed * 977), out = []; let idx = 3;
    for (let bar = 0; bar < 16; bar++) {
      const row = []; const motif = bar > 0 && bar % 4 === 2 ? out[bar - 2] : null;
      for (let q = 0; q < 8; q++) {
        if (motif) { row.push(motif[q]); continue; }
        const r = R(); if (r > T.dens * (q % 4 === 0 ? 1.6 : .8)) row.push(-1);
        else { idx = Math.max(0, Math.min(6, idx + (R() < .5 ? -1 : 1) * (R() < .7 ? 1 : 2))); row.push(idx); }
      }
      out.push(row);
    }
    return out;
  },
  sched() {
    const c = Sound.ctx; if (!c || !this.playing || c.state !== 'running') return;
    if (this.next < c.currentTime - .3) this.next = c.currentTime + .05;
    let n = 0;
    while (this.next < c.currentTime + .2 && n++ < 8) {
      if ((this.step & 15) === 0 && this.want !== this.cur && this.want >= 0) this.load(this.want);
      const T = TRACKS[this.cur]; this.seq(this.step, this.next, T);
      this.next += 15 / this.tempo; this.step = (this.step + 1) & 255;
    }
  },
  n(f, t, d, type, v, f1) {
    try {
      const c = Sound.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + d + .02);
    } catch (e) { }
  },
  nz(t, d, v, hp) {
    try {
      const c = Sound.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.nb; f.type = 'highpass'; f.frequency.value = hp; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      s.connect(f); f.connect(g); g.connect(this.gain); s.start(t, Math.random() * .5, d + .02);
    } catch (e) { }
  },
  seq(st, t0, T) {
    const bar = (st >> 4) & 15, s = st & 15, sec = bar < 8 ? 0 : 1, ch = T.prog[sec][bar & 7];
    const root = hz((((ch[0] + this.trans) % 12) + 12) % 12), tones = CH[ch[1]], nt = tones.length, sd = 15 / this.tempo;
    const t = T.swing && (s & 1) ? t0 + sd * T.swing : t0;
    const fq = (base, semi) => base * Math.pow(2, semi / 12);
    const P = x => Array.isArray(x) ? x[sec] : x;
    const brk = bar === 14 || bar === 15, fill = (bar & 3) === 3, last = bar === 15, soft = T.soft ? .6 : 1;
    // nappe
    if (s === 0 && (bar & 1) === 0 || (s === 0 && T.pad === 'triangle')) for (const k of tones) this.n(fq(root * 4, k), t, sd * (T.pad === 'sine' ? 28 : 15), T.pad || 'triangle', (T.padG || .016) * soft * (T.pad === 'sine' ? 1.3 : 1));
    // basse
    const bp = P(T.bass);
    if (!brk) { const ch2 = bp[s]; if (ch2 !== '.') this.n(root * 2 * (ch2 === '2' ? 2 : 1), t, sd * (T.bassW === 'sine' ? 3 : 1.6), T.bassW, (T.bassW === 'sine' ? .09 : .04) * soft); }
    else if (s === 0 || s === 8) this.n(root * 2, t, sd * 7, T.bassW, .035 * soft);
    // arpège
    if (T.arp) {
      const pat = P(T.arp), every = T.arpEvery || 2, idxs = pat.length === 16 ? pat[s] : pat[s & 7];
      if ((pat.length === 16 || s % every === 0 || every === 1) && !(brk && s % 4)) {
        const oct = (s >= 8 ? 12 : 0) + (sec && (bar & 1) ? 12 : 0);
        const base = root * (T.arpOct || 4);
        this.n(fq(base, tones[idxs % nt] + oct), t, sd * (every === 1 ? 1.1 : 1.8), T.arpW, (T.arpGain || .016) * soft * (brk ? .7 : 1));
      }
    }
    // mélodie
    if (!brk && bar >= 2 && s % 2 === 0) {
      const d = this.mel[bar][s >> 1];
      if (d >= 0) this.n(fq(root * 8, tones[d % nt] + 12 * Math.floor(d / nt) - 12 * (T.lead === 'sine' ? 0 : 0)), t, sd * (T.lead === 'sine' ? 4.5 : 2.6), T.lead, (T.leadGain || .028) * soft);
    }
    // batterie
    if (!brk && !T.calm || (T.calm && !brk)) {
      const k = P(T.kick), sn = P(T.snare), h = P(T.hat);
      if (k[s] === 'x') this.n(T.calm ? 120 : 150, t, T.calm ? .1 : .14, 'sine', T.calm ? .12 : .2, 45);
      if (sn && sn[s] === 'x') { this.nz(t, .12, T.calm ? .03 : .08, 1500); this.n(190, t, .08, 'triangle', .05); }
      if (fill && s >= 12 && !T.calm) this.nz(t, .06, .06, 2500);
      if (h[s] === 'x') this.nz(t, .025, (T.calm ? .015 : .03), 7500); else if (h[s] === 'o') this.nz(t, .12, .035, 6000);
      if (T.clang && s % 8 === 0 && sec) { this.n(420, t, .25, 'square', .012, 380); this.nz(t, .05, .05, 900); }
    } else if (last && s >= 8) { this.nz(t, .09, .02 + (s - 8) * .008, 3000 - (s - 8) * 200); if (s === 15) this.n(150, t, .2, 'sine', .22, 40); }
  }
};
