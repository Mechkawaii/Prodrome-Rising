/* ===== SPRITES : pixel art procédural (tampons RGBA purs, testables sans navigateur) ===== */
class Spr {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); this._c = null; this._wc = null; }
  px(x, y, col) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex2rgb(col), i = (y * this.w + x) * 4;
    this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255;
  }
  rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col); }
  at(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  outline(col) {
    const [r, g, b] = hex2rgb(col), add = [];
    for (let y = -1; y <= this.h; y++) for (let x = -1; x <= this.w; x++) {
      if (this.at(x, y)) continue;
      if (this.at(x - 1, y) || this.at(x + 1, y) || this.at(x, y - 1) || this.at(x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => { if (x >= 0 && y >= 0 && x < this.w && y < this.h) { const i = (y * this.w + x) * 4; this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255; } });
    return this;
  }
  canvas() {
    if (this._c) return this._c;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    const x = c.getContext('2d'); if (!x || !x.putImageData) return c;
    x.putImageData(new ImageData(new Uint8ClampedArray(this.d), this.w, this.h), 0, 0);
    return this._c = c;
  }
  white() {
    if (this._wc) return this._wc;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    const x = c.getContext('2d'); if (!x || !x.putImageData) return c;
    const d = new Uint8ClampedArray(this.d); for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255; }
    x.putImageData(new ImageData(d, this.w, this.h), 0, 0);
    return this._wc = c;
  }
}

/* ---------- Mechkawaii : apparences ---------- */
const LOOK = {
  johanna: { sp: 'raccoon', P: '#2f3566', Q: '#dfe2fa', A: '#2b2f63', T: '#2b2f63', V: '#e0c48c', Ar: '#b0793f', H: '#8b8a9c', B: '#252850', E: '#1b1424', G: '#f2d62e' },
  banado: { sp: 'badger', P: '#f1f1f7', Q: '#dcdce8', A: '#8a8fa8', T: '#8a8fa8', Ar: '#b5243c', H: '#9aa0b8', B: '#e4e4f0', E: '#1b1424', G: '#38a8ff', S: '#c9283f' },
  fuyu: { sp: 'fox', P: '#f2872f', Q: '#ffd9a6', A: '#4b7a45', T: '#4b7a45', Ar: '#b5243c', H: '#e8b890', B: '#2f5a35', E: '#2a1010', G: '#ff4a3a' },
  meimei: { sp: 'cat', P: '#8c8c9a', Q: '#a9a9b8', A: '#1c1c26', T: '#1c1c26', Ar: '#24242f', H: '#d6ff3a', B: '#23232d', E: '#ff8a3a', G: '#b6ff4a' },
  yamabato: { sp: 'bird', P: '#8d8a99', Q: '#c4c0cf', A: '#c9a24a', T: '#c9a24a', Ar: '#d8b860', H: '#8d8a99', B: '#7a5a28', E: '#e63a2a', G: '#37e0ff', C: '#ff7ad9' },
  duke: { sp: 'boar', P: '#7a5338', Q: '#a67c58', A: '#59607a', B: '#2e3347', E: '#1b1424', G: '#b06bff' },
  khurt: { sp: 'wolf', P: '#8e8ea2', Q: '#c6c6d6', A: '#3c2d5e', B: '#241a3a', E: '#d29bff', G: '#b36bff', H: '#42306b' },
  faline: { sp: 'deer', P: '#c99b68', Q: '#f4e3c7', A: '#5f8f99', B: '#35545c', E: '#2a1a10', G: '#ff9a2a', N: '#8a5a38' },
  rasmus: { sp: 'owl', P: '#7b6a58', Q: '#eadfca', A: '#3b4b5c', B: '#25303b', E: '#ffd23a', G: '#2ad8c0' },
  rhoney: { sp: 'pangolin', P: '#6c6d7c', Q: '#b9bacb', A: '#8e90a6', B: '#4c4e60', E: '#1b1424', G: '#ffd23a' }
};

function drawHero(S, fr, L) {
  const by = fr === 2 ? 1 : 0, O = L;
  const legA = L.B, legB = shade(L.B, -.25);
  // jambes
  if (fr === 0) { S.rect(5, 13, 3, 3, legA); S.rect(8, 13, 3, 3, legB); }
  else if (fr === 1) { S.rect(4, 13, 3, 3, legA); S.rect(9, 13, 3, 2, legB); }
  else if (fr === 2) { S.rect(6, 13, 2, 3, legA); S.rect(8, 13, 2, 3, legB); }
  else { S.rect(5, 13, 3, 2, legA); S.rect(8, 13, 3, 2, legB); }
  // tronc (court : grosse tête)
  const T = L.T || L.A, AR = L.Ar || L.A;
  S.rect(5, 10, 6, 3, T); S.rect(5, 10, 6, 1, shade(T, .3)); S.rect(9, 11, 2, 2, shade(T, -.25));
  if (L.V) { S.rect(6, 10, 3, 3, L.V); S.rect(6, 10, 3, 1, shade(L.V, .25)); }
  S.rect(7, 11, 2, 1, L.G); S.px(7, 11, shade(L.G, .6));
  // bras
  S.rect(3, 10, 2, 3, AR); S.rect(11, 10, 2, 3, shade(AR, -.25));
  S.rect(3, 12, 2, 1, L.H || L.P); S.rect(11, 12, 2, 1, shade(L.H || L.P, -.25));
  // tête (grosse, 12 de large)
  const y0 = 2 + by;
  S.rect(2, y0, 12, 8, L.P);
  S.rect(2, y0, 12, 1, shade(L.P, .25));
  S.rect(12, y0 + 1, 2, 7, shade(L.P, -.22));
  S.rect(3, y0 + 5, 10, 3, L.Q); S.rect(3, y0 + 5, 10, 1, shade(L.Q, .1));
  speciesDraw(S, L, y0);
  // visage (si non redéfini)
  if (!['owl', 'raccoon'].includes(L.sp)) {
    S.rect(5, y0 + 3, 2, 2, L.E); S.rect(9, y0 + 3, 2, 2, L.E);
    S.px(5, y0 + 3, '#fff'); S.px(9, y0 + 3, '#fff');
  }
  if (L.sp !== 'bird' && L.sp !== 'boar' && L.sp !== 'raccoon') S.rect(7, y0 + 5, 2, 1, '#2a1a22');
  S.outline('#150d20');
}

function speciesDraw(S, L, y0) {
  const P = L.P, Q = L.Q, Y = y0 - 2; // Y = haut de tête - 2 -> oreilles
  switch (L.sp) {
    case 'cat': case 'fox':
      [[3, Y + 2], [3, Y + 1], [4, Y + 1], [3, Y], [4, Y + 2], [5, Y + 2]].forEach(([x, y]) => S.px(x, y, P));
      [[12, Y + 2], [12, Y + 1], [11, Y + 1], [12, Y], [11, Y + 2], [10, Y + 2]].forEach(([x, y]) => S.px(x, y, P));
      S.px(4, Y + 2, L.sp === 'cat' ? L.G : Q); S.px(11, Y + 2, L.sp === 'cat' ? L.G : Q);
      if (L.sp === 'fox') { S.rect(3, y0 + 5, 2, 1, '#fff6e6'); S.rect(11, y0 + 5, 2, 1, '#fff6e6'); S.rect(4, y0 + 3, 8, 1, '#3a1d12'); S.rect(9, y0 + 3, 3, 2, '#ff4a8a'); S.px(9, y0 + 3, '#ffd0e4'); /* lunettes */ }
      if (L.sp === 'cat') { S.rect(2, y0 + 1, 12, 1, '#2f6b3a'); S.rect(6, y0, 4, 1, L.G); S.px(7, y0, '#eaffd0'); S.rect(5, y0 + 3, 2, 2, L.E); S.rect(9, y0 + 3, 2, 2, L.E); S.px(5, y0 + 3, '#fff'); S.px(9, y0 + 3, '#fff'); S.px(7, y0 + 5, '#ff9ab0'); }
      break;
    case 'raccoon':
      S.rect(2, Y + 1, 3, 2, P); S.rect(11, Y + 1, 3, 2, P); S.px(3, Y + 2, '#a7acd8'); S.px(12, Y + 2, '#a7acd8'); S.px(2, Y + 1, shade(P, .3)); S.px(13, Y + 1, shade(P, .3));
      S.rect(3, y0 + 3, 4, 4, L.Q); S.rect(9, y0 + 3, 4, 4, L.Q); S.rect(6, y0 + 5, 4, 3, L.Q);
      S.rect(5, y0 + 4, 2, 2, '#6a2e1c'); S.rect(9, y0 + 4, 2, 2, '#6a2e1c'); S.px(5, y0 + 4, '#ff9a4a'); S.px(9, y0 + 4, '#ff9a4a'); S.px(6, y0 + 5, L.E); S.px(10, y0 + 5, L.E);
      S.rect(7, y0 + 6, 2, 1, '#2a1a22'); break;
    case 'badger':
      S.rect(2, Y + 1, 3, 2, P); S.rect(11, Y + 1, 3, 2, P); S.px(3, Y + 2, '#d9a3ac'); S.px(12, Y + 2, '#d9a3ac');
      S.rect(7, y0 + 1, 2, 3, L.S); S.px(6, y0 + 2, L.S); S.px(9, y0 + 2, L.S); S.rect(2, y0 + 3, 2, 2, '#2b6cff'); S.px(2, y0 + 3, '#8fb8ff');
      S.rect(5, y0 + 6, 6, 1, '#e8c76a'); break;
    case 'bird':
      S.rect(2, y0, 12, 2, '#8a6a2a'); S.px(3, y0, '#c9a24a'); S.px(12, y0, '#c9a24a'); S.px(2, y0 + 3, '#ff7ad9'); S.px(13, y0 + 3, '#ff7ad9');
      S.rect(7, Y, 2, 3, L.C); S.px(6, Y + 1, L.C); S.px(9, Y + 1, L.C); S.px(5, Y + 2, L.C); S.px(10, Y + 2, L.C);
      S.rect(7, y0 + 4, 2, 2, '#ffb31f'); S.rect(1, 9, 2, 4, L.Q); S.rect(13, 9, 2, 4, shade(L.Q, -.2)); S.rect(0, 10, 2, 3, L.C); S.rect(14, 10, 2, 3, L.C);
      break;
    case 'boar':
      S.rect(4, Y + 1, 8, 2, L.B); S.px(5, Y, L.B); S.px(7, Y, L.B); S.px(9, Y, L.B); S.px(11, Y, L.B);
      S.rect(6, y0 + 4, 4, 3, L.Q); S.px(7, y0 + 5, '#2a1a22'); S.px(8, y0 + 5, '#2a1a22');
      S.px(4, y0 + 6, '#fff'); S.px(11, y0 + 6, '#fff'); S.px(4, y0 + 7, '#fff'); S.px(11, y0 + 7, '#fff'); break;
    case 'wolf':
      S.rect(2, Y + 1, 12, 4, L.H); S.px(3, Y, L.H); S.px(4, Y, L.H); S.px(11, Y, L.H); S.px(12, Y, L.H); S.px(2, Y + 5, L.H); S.px(13, Y + 5, L.H);
      S.rect(4, y0 + 2, 8, 5, L.P); S.rect(4, y0 + 5, 8, 2, L.Q); break;
    case 'deer':
      [[4, Y + 2], [4, Y + 1], [3, Y], [5, Y - 1 < 0 ? 0 : Y]].forEach(([x, y]) => S.px(x, y, L.N));
      [[11, Y + 2], [11, Y + 1], [12, Y], [10, Y - 1 < 0 ? 0 : Y]].forEach(([x, y]) => S.px(x, y, L.N));
      S.px(3, Y + 2, P); S.px(12, Y + 2, P); S.px(2, y0 + 2, P); S.px(13, y0 + 2, P); S.rect(7, y0 + 5, 2, 1, '#3a2018'); break;
    case 'owl':
      [[3, Y + 2], [3, Y + 1], [4, Y + 1], [4, Y + 2]].forEach(([x, y]) => S.px(x, y, P));
      [[12, Y + 2], [12, Y + 1], [11, Y + 1], [11, Y + 2]].forEach(([x, y]) => S.px(x, y, P));
      S.px(2, Y, '#9aa'); S.px(13, Y, '#9aa'); S.px(2, Y + 1, '#9aa'); S.px(13, Y + 1, '#9aa'); /* antennes */
      S.rect(4, y0 + 1, 4, 4, L.Q); S.rect(8, y0 + 1, 4, 4, L.Q);
      S.rect(5, y0 + 2, 2, 2, L.E); S.rect(9, y0 + 2, 2, 2, L.E); S.px(6, y0 + 3, '#1b1424'); S.px(9, y0 + 3, '#1b1424');
      S.rect(7, y0 + 4, 2, 2, '#ffb31f'); break;
    case 'pangolin':
      S.rect(4, Y + 1, 3, 2, P); S.rect(9, Y + 1, 3, 2, P);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { if ((i + j) % 2 === 0) S.rect(3 + i * 2, y0 + j, 2, 1, L.Q); }
      S.rect(4, y0 + 3, 8, 2, '#ffd23a'); S.rect(5, y0 + 3, 2, 2, L.E); S.rect(9, y0 + 3, 2, 2, L.E); S.px(5, y0 + 3, '#fff'); S.px(9, y0 + 3, '#fff'); break;
  }
}

/* ---------- Prodromes ---------- */
function drawPro(S, fr, type) {
  const base = { head: '#3d3753', hi: '#7a73a3', dk: '#2a2540', body: '#4b4569', arm: '#2f2a46', leg: '#2a2540', G: '#5dff6a' };
  let c = Object.assign({}, base);
  const by = fr === 2 ? 1 : 0;
  if (type === 'nezumi') { c.head = '#6a5a4c'; c.body = '#54463a'; c.hi = '#9a8a76'; c.dk = '#38302a'; c.arm = '#3a322a'; c.leg = '#3a322a'; c.G = '#ff4a4a'; }
  if (type === 'koumori') { c.head = '#3a3050'; c.body = '#2e2640'; c.hi = '#7a6aa8'; c.dk = '#1e1830'; c.arm = '#2a2240'; c.leg = '#2a2240'; c.G = '#ff7ad9'; }
  if (type === 'tsuta') { c.head = '#2f6b3a'; c.body = '#2a5a30'; c.hi = '#6bd05a'; c.dk = '#1c4424'; c.arm = '#245028'; c.leg = '#1c4424'; c.G = '#ffd23a'; }
  if (type === 'gaoro' || type === 'gyuki') { c.head = '#262333'; c.body = '#2d2a3d'; c.hi = '#4e4a6b'; c.dk = '#0d0c14'; c.arm = '#14131c'; c.leg = '#14131c'; }
  if (type === 'goryo') { c.head = '#262333'; c.body = '#2d2a3d'; c.hi = '#4e4a6b'; c.dk = '#0d0c14'; c.arm = '#14131c'; c.leg = '#14131c'; }
  if (type === 'sankai') { c.head = '#555065'; c.body = '#6c6682'; c.hi = '#aaa5c9'; }
  if (type === 'senpoku') { c.head = '#383e50'; c.body = '#464d63'; }
  if (type === 'samebito') { c.head = '#4a5560'; c.body = '#59666f'; c.hi = '#a5b4bf'; }
  if (type === 'shojo') { c.head = '#4a3f3a'; c.body = '#5a4a44'; c.hi = '#8a766c'; }
  // jambes
  if (type === 'gyuki' || type === 'senpoku') {
    S.rect(5, 13, 6, 1, c.leg); S.rect(6, 14, 4, 1, fr % 2 ? '#ffb347' : '#ff7a2a'); S.rect(7, 15, 2, 1, '#fff2a0');
  } else if (fr === 1) { S.rect(4, 13, 3, 3, c.leg); S.rect(9, 13, 3, 2, c.leg); }
  else if (fr === 2) { S.rect(6, 13, 2, 3, c.leg); S.rect(8, 13, 2, 3, c.leg); }
  else { S.rect(5, 13, 3, 3, c.leg); S.rect(8, 13, 3, 3, c.leg); }
  if (type === 'gaoro') { S.rect(4, 13, 3, 3, c.leg); S.rect(9, 13, 3, 3, c.leg); }
  // tronc court, grosse tête
  S.rect(5, 10, 6, 3, c.body); S.rect(5, 10, 6, 1, c.hi); S.rect(9, 11, 2, 2, c.dk);
  if (type === 'goryo') { S.rect(6, 10, 4, 1, c.G); S.rect(7, 10, 2, 3, c.G); S.rect(6, 12, 4, 1, shade(c.G, -.4)); }
  else { S.rect(7, 11, 2, 1, c.G); S.px(7, 11, '#d8ffd8'); }
  S.rect(3, 10, 2, 3, c.arm); S.rect(11, 10, 2, 3, c.arm); S.rect(3, 13, 2, 1, type === 'goryo' ? c.G : '#7a73a3'); S.rect(11, 13, 2, 1, type === 'goryo' ? c.G : '#7a73a3');
  // tête
  const y0 = 2 + by;
  S.rect(2, y0, 12, 8, c.head); S.rect(2, y0, 12, 1, c.hi); S.rect(12, y0 + 1, 2, 7, c.dk);
  S.rect(5, y0 + 3, 2, 3, c.G); S.rect(9, y0 + 3, 2, 3, c.G); S.px(5, y0 + 3, '#e6ffe6'); S.px(9, y0 + 3, '#e6ffe6');
  S.rect(6, y0 + 7, 4, 1, '#16122a'); S.px(7, y0 + 7, c.hi); S.px(9, y0 + 7, c.hi);
  const Y = y0 - 2;
  switch (type) {
    case 'genbu': S.rect(5, Y, 1, 2, c.hi); S.rect(10, Y, 1, 2, c.hi); S.px(5, Y, c.G); S.px(10, Y, c.G); S.rect(13, 10, 2, 1, '#cfd8dc'); S.rect(14, 9, 1, 3, '#cfd8dc'); S.rect(5, y0 + 1, 6, 1, '#27d3ff'); break;
    case 'goryo': [[3, Y + 1], [5, Y + 1], [8, Y], [10, Y + 1], [12, Y + 1], [1, y0 + 2], [14, y0 + 2], [3, Y], [12, Y], [1, y0 + 4], [14, y0 + 4]].forEach(([x, y]) => S.px(x, y, c.hi)); S.rect(2, Y + 2, 12, 1, c.hi); S.px(8, Y - 1 < 0 ? 0 : Y - 1, c.hi); break;
    case 'goki': S.px(3, Y + 1, '#ddd'); S.px(3, Y, '#ddd'); S.px(12, Y + 1, '#ddd'); S.px(12, Y, '#ddd'); S.rect(1, y0 + 1, 1, 3, c.G); S.rect(14, y0 + 1, 1, 3, c.G); S.rect(6, 11, 4, 1, '#ff6a2a'); break;
    case 'gaoro': S.rect(1, 9, 3, 3, c.hi); S.rect(12, 9, 3, 3, c.hi); S.px(4, Y + 1, '#ddd'); S.px(11, Y + 1, '#ddd'); S.px(8, Y + 1, '#ddd'); S.rect(6, y0 + 1, 1, 1, c.G); S.rect(8, y0 + 1, 1, 1, c.G); S.rect(10, y0 + 1, 1, 1, c.G); break;
    case 'gyuki': S.rect(5, y0 + 2, 6, 6, c.head); S.rect(6, y0 + 3, 4, 4, c.G); S.rect(7, y0 + 4, 2, 2, '#eaffea'); S.px(5, Y + 2, '#fff'); S.px(6, Y + 1, '#fff'); S.px(7, Y, '#fff'); S.px(8, Y, '#fff'); S.px(9, Y, c.hi); S.px(10, Y + 1, c.hi); break;
    case 'shojo': S.rect(5, y0 + 3, 2, 2, c.head); S.rect(9, y0 + 3, 2, 2, c.head); [[5, y0 + 3], [6, y0 + 4], [6, y0 + 3], [5, y0 + 4], [9, y0 + 3], [10, y0 + 4], [10, y0 + 3], [9, y0 + 4]].forEach(([x, y], i) => S.px(x, y, (i % 4 === 0 || i % 4 === 1) ? c.G : '#16122a')); S.px(4, Y + 1, '#aaa'); S.px(6, Y, '#aaa'); S.px(9, Y + 1, '#aaa'); S.px(11, Y, '#aaa'); S.px(7, 12, '#ff4a4a'); break;
    case 'sojobo': S.px(3, Y + 1, '#aaa'); S.px(3, Y, '#aaa'); S.px(12, Y + 1, '#aaa'); S.px(12, Y, '#aaa'); S.px(2, Y - (Y > 0 ? 1 : 0), c.G); S.px(13, Y - (Y > 0 ? 1 : 0), c.G); S.rect(2, y0 + 2, 1, 3, '#cfd8dc'); S.rect(13, y0 + 2, 1, 3, '#cfd8dc'); S.rect(5, y0 + 2, 6, 1, '#27d3ff'); break;
    case 'samebito': S.rect(4, Y, 1, 3, c.hi); S.px(4, Y, '#ff4a4a'); S.rect(2, 11, 14, 1, '#e6eef2'); S.rect(13, 10, 1, 3, '#a5b4bf'); S.px(15, 10, '#ff4a4a'); S.rect(6, y0 + 2, 4, 1, '#16122a'); break;
    case 'senpoku': S.rect(1, 0, 14, 1, '#aab4c0'); S.px(7, 1, '#aab4c0'); S.px(8, 1, '#aab4c0'); S.rect(1, 9, 1, 3, '#aab4c0'); S.rect(14, 9, 1, 3, '#aab4c0'); S.rect(7, 12, 2, 1, '#ff4a4a'); break;
    case 'nezumi': S.rect(2, Y + 1, 3, 3, c.head); S.rect(11, Y + 1, 3, 3, c.head); S.px(3, Y + 2, '#d9a3ac'); S.px(12, Y + 2, '#d9a3ac'); S.rect(14, 12, 2, 1, '#d9a3ac'); break;
    case 'koumori': S.rect(0, 5, 3, 6, c.hi); S.rect(13, 5, 3, 6, c.hi); S.rect(0, 8, 2, 4, c.dk); S.rect(14, 8, 2, 4, c.dk); S.px(3, Y + 1, c.head); S.px(3, Y, c.head); S.px(12, Y + 1, c.head); S.px(12, Y, c.head); break;
    case 'tsuta': S.rect(5, Y, 2, 3, c.hi); S.rect(9, Y, 2, 3, c.hi); S.rect(7, Y - 1 < 0 ? 0 : Y - 1, 2, 3, '#ff5cc8'); S.rect(1, 9, 2, 5, c.hi); S.rect(13, 9, 2, 5, c.hi); S.rect(4, 13, 8, 3, c.dk); break;
    case 'sankai': S.rect(1, 8, 3, 4, c.hi); S.rect(12, 8, 3, 4, c.hi); S.rect(3, 12, 10, 1, c.hi); S.px(4, Y + 1, c.hi); S.px(6, Y + 1, c.hi); S.px(9, Y + 1, c.hi); S.px(11, Y + 1, c.hi); S.rect(7, y0 + 1, 2, 1, c.hi); S.rect(5, 10, 1, 2, c.dk); break;
  }
  S.outline('#0f0a1e');
}

/* ---------- Atlas ---------- */
const HEROES_IDS = ['johanna', 'banado', 'fuyu', 'meimei', 'yamabato', 'duke', 'khurt', 'faline', 'rasmus', 'rhoney'];
const PRO_IDS = ['genbu', 'goryo', 'goki', 'gaoro', 'gyuki', 'shojo', 'sojobo', 'senpoku', 'sankai', 'samebito', 'nezumi', 'koumori', 'tsuta'];
/* ---------- Portraits pixel-art tirés des modèles 3D (56×56) ---------- */
const PORTS = {
  johanna: 'data:image/png;base64,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',
  banado: 'data:image/png;base64,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',
  fuyu: 'data:image/png;base64,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',
  meimei: 'data:image/png;base64,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',
  yamabato: 'data:image/png;base64,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'
};
const Atlas = { hero: {}, pro: {}, port: {} };
function buildAtlas() {
  if (typeof Image !== 'undefined') for (const id in PORTS) { const im = new Image(); im.src = PORTS[id]; Atlas.port[id] = im; }
  HEROES_IDS.forEach(id => { Atlas.hero[id] = [0, 1, 2, 3].map(f => { const s = new Spr(16, 16); drawHero(s, f, LOOK[id]); return s; }); });
  PRO_IDS.forEach(id => { Atlas.pro[id] = [0, 1, 2, 3].map(f => { const s = new Spr(16, 16); drawPro(s, f, id); return s; }); });
}

/* ---------- Icônes (patterns) ---------- */
const ICONS = {
  heart: ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
  key: ['.xxx...', 'x...x..', 'x...x..', '.xxxxxx', '....x.x', '....x.x'],
  shield: ['xxxxxxx', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
  armor: ['.xxxxx.', 'xxxxxxx', 'xx.x.xx', 'xxxxxxx', '.xxxxx.', '..x.x..'],
  star: ['...x...', '..xxx..', 'xxxxxxx', '.xxxxx.', '.xx.xx.', 'xx...xx'],
  bolt: ['...xx..', '..xx...', '.xxxx..', '...xx..', '..xx...', '..x....'],
  drone: ['x.....x', 'xxxxxxx', '..xxx..', '.xxxxx.', '..x.x..', '.......']
};
function drawIcon(ctx, name, x, y, col) {
  const p = ICONS[name]; ctx.fillStyle = col;
  for (let j = 0; j < p.length; j++) for (let i = 0; i < p[j].length; i++) if (p[j][i] === 'x') ctx.fillRect(x + i, y + j, 1, 1);
}

/* ---------- Portrait du Général Sheepard (radio CRT) ---------- */
const SHEEP = { cv: null, c: null };
function sheepBase(t, talk) {
  if (!SHEEP.cv) { SHEEP.cv = document.createElement('canvas'); SHEEP.cv.width = SHEEP.cv.height = 48; SHEEP.c = SHEEP.cv.getContext('2d'); }
  const c = SHEEP.c, R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const E = (cx, cy, rx, ry, col) => { c.fillStyle = col; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + .01))); c.fillRect(cx - w, cy + y, w * 2 + 1, 1); } };
  const K = '#0d0d12', W = '#f2f2ff', W2 = '#b9c1dc', G1 = '#6b7f38', G2 = '#4a5a26', B = '#cbbf9d', P = '#d98ab4';
  R(0, 0, 48, 48, '#0b2a28');
  // socle
  E(25, 44, 17, 3, K); E(25, 43, 16, 2, '#8f8f94'); E(25, 40, 13, 3, K); E(25, 39, 12, 2, '#2b2b30');
  // casque / sac vert + oreille beige
  R(3, 5, 29, 32, K); R(4, 6, 27, 30, G2); R(4, 6, 27, 9, G1); R(6, 9, 3, 1, K); R(16, 8, 2, 1, K); R(5, 16, 5, 14, '#3f4d20');
  E(5, 27, 4, 9, K); E(5, 27, 3, 8, B); R(3, 24, 1, 6, '#e5dcc0');
  // tête
  E(28, 27, 14, 11, K); E(28, 27, 13, 10, W); E(28, 33, 11, 3, W2); E(29, 31, 12, 4, W);
  // laine
  for (const [x, y, r] of [[15, 13, 5], [22, 10, 5], [29, 9, 5], [34, 12, 4], [11, 18, 4], [11, 24, 3], [18, 8, 3]]) E(x, y, r + 1, r + 1, K);
  for (const [x, y, r] of [[15, 13, 5], [22, 10, 5], [29, 9, 5], [34, 12, 4], [11, 18, 4], [11, 24, 3], [18, 8, 3]]) E(x, y, r, r, W);
  for (const [x, y] of [[13, 12], [21, 8], [28, 7], [33, 11], [9, 18]]) R(x, y, 2, 1, W2);
  // collier / cache-oreille vert sous la tête
  R(11, 31, 10, 9, K); R(12, 32, 8, 7, G2); R(12, 32, 8, 2, G1); R(15, 33, 1, 5, K);
  // lunettes
  R(13, 14, 29, 4, K); R(14, 15, 27, 2, '#1d1d24');
  R(14, 17, 12, 9, K); R(28, 16, 13, 9, K); R(15, 18, 10, 7, '#13131a'); R(29, 17, 11, 7, '#13131a');
  // reflet graphique animé
  const gl = Math.floor(t / 3) % 14;
  c.fillStyle = '#5a5a68';
  for (const [ox, oy] of [[16, 23], [18, 21], [19, 22], [21, 19], [22, 20], [24, 18], [30, 22], [32, 20], [33, 21], [35, 18], [37, 19], [38, 17]]) c.fillRect(ox, oy, 1, 1);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(15 + gl, 18, 1, 6); c.fillRect(29 + (gl % 11), 17, 1, 6);
  // traits d'expression et museau
  R(31, 28, 4, 1, K); R(32, 29, 2, 1, K);
  E(40, 29, 3, 2, K); E(40, 29, 2, 1, P); R(39, 28, 1, 1, '#f3b6d6');
  // bouche
  if (talk) { const o = Math.floor(t / 4) % 3; if (o) { R(33, 33, 6, 1 + o, K); R(34, 34, 4, o, '#4a1426'); } else { R(32, 33, 7, 1, K); } }
  else { R(31, 33, 1, 1, K); R(32, 34, 5, 1, K); R(37, 33, 2, 1, K); R(39, 32, 1, 1, K); }
  return SHEEP.cv;
}
function drawSheepard(ctx, t, talk, open) {
  const b = sheepBase(t, talk), c = ctx;
  c.clearRect(0, 0, 48, 48);
  if (open < 1) { for (let i = 0; i < 520; i++) { const v = 60 + Math.random() * 195 | 0; c.fillStyle = 'rgb(' + (v * .5 | 0) + ',' + v + ',' + (v * .75 | 0) + ')'; c.fillRect(Math.random() * 48 | 0, Math.random() * 48 | 0, 2, 1); } c.globalAlpha = open * open; }
  const glitch = Math.random() < .05, gy = Math.random() * 44 | 0, gh = 3 + Math.random() * 8 | 0, gd = (Math.random() * 6 | 0) - 3;
  for (let y = 0; y < 48; y++) {
    let dx = Math.round(Math.sin(y * .35 + t * .12) * .6);
    if (glitch && y >= gy && y < gy + gh) dx += gd;
    c.drawImage(b, 0, y, 48, 1, dx, y, 48, 1);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'multiply'; c.fillStyle = '#c4ffe6'; c.fillRect(0, 0, 48, 48);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(0,12,8,.22)'; for (let y = 0; y < 48; y += 2) c.fillRect(0, y, 48, 1);
  c.fillStyle = 'rgba(190,255,225,.13)'; c.fillRect(0, ((t * .6) % 70) - 10, 48, 7);
  c.fillStyle = 'rgba(190,255,225,.35)'; for (let i = 0; i < 26; i++) c.fillRect(Math.random() * 48 | 0, Math.random() * 48 | 0, 1, 1);
}
