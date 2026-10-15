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
const Atlas = { hero: {}, pro: {} };
function buildAtlas() {
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
