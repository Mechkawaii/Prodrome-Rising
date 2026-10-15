/* ===== GAME : monde, physique, combat, IA ===== */
class Ent {
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
}
class Player extends Ent {
  constructor(def) {
    super();
    Object.assign(this, {
      x: 40, y: 140, w: 12, h: 20, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jbuf: 0, jumpsLeft: 1,
      hp: def.hp + 2, maxhp: def.hp + 2, keys: 0, armor: 1, armorMax: 3, inv: 0, cd: 0, ult: 0,
      buff: { traj: 0, storm: 0, ghost: 0 }, anim: 0, hover: 0, phase: false, dodge: 0, alt: false, items: [], flash: 0,
      st: { dmg: 1.15, rate: 1, spd: 1, pierce: 0, bounce: 0, homing: 0, explode: 0, crit: .1, jumps: 1, kb: 0, ultRate: 1, regenShield: 0, drone: 0, gas: 0, magnet: 0 },
      isPlayer: true, droneT: 0, gasT: 0, coins: 0, level: 1, xp: 0, xpNext: 9, ups: [], weapon: null, dashMax: 1, dash: 1, dashCd: 0, dashT: 0, dashDir: 1
    });
    if (def.init) def.init(this);
  }
}
class Enemy extends Ent {
  constructor(type, x, y, hpMul) {
    super();
    const d = ENEMY[type];
    Object.assign(this, { type, x, y, w: Math.round(d.w * 1.25), h: Math.round(d.h * 1.4), vx: 0, vy: 0, hp: d.hp * hpMul, maxhp: d.hp * hpMul, t: rr(0, 60) | 0, st: 0, face: -1, stun: 0, freeze: 0, burn: 0, shieldHp: 0, flash: 0, spawnT: 40, fly: !!d.fly, onGround: false, spd: d.spd, armor: type === 'sankai' ? .75 : 1, boss: null, elite: false, id: Enemy.n++ });
  }
}
Enemy.n = 0;

class Game {
  constructor(heroId, opts) {
    opts = opts || {};
    this.diffId = opts.diff || 'normal'; this.diff = DIFFS[this.diffId]; this.daily = opts.daily || 0;
    this.stats = { hurtFloor: false, flawless: false, bossKills: 0, purchases: 0, dashes: 0, syn: 0, secret: 0 }; this.syn = new Set();
    this.def = HERO[heroId];
    this.p = new Player(this.def); this.p.hp = this.p.maxhp = Math.max(1, this.p.maxhp + this.diff.bonus);
    this.floor = 0; this.frame = 0; this.kills = 0; this.state = 'play'; this.endT = 0; this.hitstop = 0;
    this.bullets = []; this.ebullets = []; this.enemies = []; this.parts = []; this.texts = []; this.pickups = [];
    this.mines = []; this.emines = []; this.strikes = []; this.hazards = []; this.novas = [];
    this.decoy = null; this.shakeT = 0; this.toast = null; this.flashT = 0; this.bannerT = 0; this.banner = '';
    this.sfxq = []; this.score = 0; this.roomsCleared = 0; this.pendingLevel = 0;
    this.newFloor();
  }
  sfx(n) { Sound.play(n); }

  /* ---------- Étages et salles ---------- */
  newFloor() {
    this.floor++; this.stats.hurtFloor = false;
    const savedSeed = getSeed(); if (this.daily) seedRng(this.daily * 7919 + this.floor * 104729);
    // ---- carte : cellules sur une grille, arbre couvrant + boucles ----
    const GW = [8, 9, 9, 10, 10, 11][this.floor - 1], GH = [2, 2, 3, 3, 3, 3][this.floor - 1], target = [9, 11, 13, 13, 15, 15][this.floor - 1], tallWant = [1, 1, 2, 2, 3, 3][this.floor - 1];
    const key = (x, y) => x + y * 20;
    // nœuds : une salle normale occupe 1 case, une salle verticale en occupe 2 (x,y) et (x,y+1).
    // Toutes les liaisons sont latérales (portes gauche/droite) : on ne change d'étage que dans une salle verticale.
    const cells = [{ x: 0, y: ri(0, GH - 1), tall: false }], at = new Map([[key(cells[0].x, cells[0].y), 0]]);
    let links = [], guard = 0, tallLeft = tallWant;
    const rowsOf = c => c.tall ? [c.y, c.y + 1] : [c.y];
    while (cells.length < target && guard++ < 1500) {
      const ci = ri(0, cells.length - 1), c = cells[ci], side = rnd() < .62 ? 1 : -1, row = pick(rowsOf(c)), nx = c.x + side;
      if (nx < 0 || nx >= GW || at.has(key(nx, row))) continue;
      let tall = false, ny = row;
      if (tallLeft > 0 && cells.length >= 2 && rnd() < .6) {
        const opts = []; if (row + 1 < GH && !at.has(key(nx, row + 1))) opts.push(row); if (row - 1 >= 0 && !at.has(key(nx, row - 1))) opts.push(row - 1);
        if (opts.length) { tall = true; ny = pick(opts); tallLeft--; }
      }
      const idx = cells.length; cells.push({ x: nx, y: ny, tall }); at.set(key(nx, ny), idx); if (tall) at.set(key(nx, ny + 1), idx);
      links.push(side === 1 ? { a: ci, b: idx, y: row } : { a: idx, b: ci, y: row });
    }
    const n = cells.length, tree = links.length, tdeg = Array(n).fill(0);
    for (const l of links) { tdeg[l.a]++; tdeg[l.b]++; }
    // boucles : cases voisines de deux salles différentes
    for (let a = 0; a < n; a++) for (const r of rowsOf(cells[a])) {
      const b = at.get(key(cells[a].x + 1, r));
      if (b !== undefined && b !== a && !links.some(l => l.a === a && l.b === b && l.y === r) && rnd() < .35) links.push({ a, b, y: r });
    }
    const bfs = () => { const dist = Array(n).fill(-1); dist[0] = 0; const q = [0]; while (q.length) { const u = q.shift(); for (const l of links) { const v = l.a === u ? l.b : l.b === u ? l.a : -1; if (v >= 0 && dist[v] < 0) { dist[v] = dist[u] + 1; q.push(v); } } } return dist; };
    let dist = bfs();
    const nb = i => links.filter(l => l.a === i || l.b === i).map(l => l.a === i ? l.b : l.a);
    let leaves = [...Array(n).keys()].filter(i => i !== 0 && tdeg[i] === 1 && !cells[i].tall && nb(i).every(o => !cells[o].tall));
    if (!leaves.length) leaves = [...Array(n).keys()].filter(i => i !== 0 && tdeg[i] === 1 && !cells[i].tall);
    if (!leaves.length) leaves = [...Array(n).keys()].filter(i => i !== 0 && !cells[i].tall);
    const maxD = Math.max(...leaves.map(i => dist[i])), boss = pick(leaves.filter(i => dist[i] === maxD));
    links = links.filter((l, i) => i < tree || (l.a !== boss && l.b !== boss));
    dist = bfs();
    const deg = Array(n).fill(0); for (const l of links) { deg[l.a]++; deg[l.b]++; }
    const types = Array(n).fill('combat'); types[0] = 'start'; types[boss] = 'boss';
    const pre = nb(boss).find(v => v >= 0);
    const seq = pre === 0 ? ['heal'] : []; if (pre !== 0 && pre !== undefined && !cells[pre].tall) types[pre] = 'heal';
    seq.push('item', 'shop', rnd() < .5 ? 'challenge' : 'vault'); if (this.floor >= 2) seq.push('item'); if (this.floor >= 3) seq.push(rnd() < .5 ? 'challenge' : 'vault'); if (this.floor >= 5) seq.push('vault', 'challenge');
    const cand = [...Array(n).keys()].filter(i => i !== 0 && i !== boss && types[i] === 'combat' && !cells[i].tall);
    const tallN = cells.filter(c => c.tall).length;
    seq.length = Math.max(0, Math.min(seq.length, cand.length - Math.max(0, 3 - tallN)));
    // les caches secrètes sont cachées : uniquement sur de vrais culs-de-sac (jamais sur un passage obligé)
    let vaultN = seq.filter(t => t === 'vault').length; const rest = seq.filter(t => t !== 'vault');
    const leafPool = shuffle(cand.filter(i => deg[i] === 1)), used = new Set();
    for (let k = 0; k < vaultN && leafPool.length; k++) { const i = leafPool.shift(); types[i] = 'vault'; used.add(i); vaultN--; }
    for (let k = 0; k < vaultN; k++) rest.push('challenge');
    const order = leafPool.concat(shuffle(cand.filter(i => deg[i] > 1)));
    rest.forEach((t, k) => { if (order[k] !== undefined) types[order[k]] = t; });
    const rooms = cells.map((c, i) => { const r = c.tall ? this.makeTallRoom(i, dist[i]) : this.makeRoom(types[i], i, dist[i]); r.gx = c.x; r.gy = c.y; return r; });
    for (const l of links) {
      const A = rooms[l.a], B = rooms[l.b], sa = cells[l.a].tall ? l.y - cells[l.a].y : 0, sb = cells[l.b].tall ? l.y - cells[l.b].y : 0;
      A.exits[sa ? 'R2' : 'R'] = l.b; B.exits[sb ? 'L2' : 'L'] = l.a;
    }
    for (const r of rooms) if (r.type === 'vault') r.hidden = true;
    for (const r of rooms) this.setDoors(r, rooms);
    { // bornes de téléportation : départ (déjà active), salle de soin avant le boss, quelques salles de combat
      const combats = shuffle(rooms.filter(r => r.type === 'combat' && !r.tall)), nC = [1, 1, 2, 2, 2, 2][this.floor - 1];
      for (const r of rooms.filter(r => r.type === 'start' || r.type === 'heal').concat(combats.slice(0, nC))) { const sp = this.tpSpot(r); if (sp !== null) r.tp = { x: sp, active: r.type === 'start', lock: 0, near: false }; }
    }
    this.grid = { w: GW, h: GH };
    if (this.daily) seedRng(savedSeed + 977);
    this.rooms = rooms; this.biome = BIOMES[this.floor - 1];
    this.p.ult = Math.min(100, this.p.ult + 50);
    this.loadRoom(0, 1);
    this.banner = this.biome.name; this.bannerT = 160;
  }
  setDoors(room, rooms) {
    const t = room.tiles, e = room.exits, dt = k => (e[k] !== null && e[k] !== undefined && rooms && rooms[e[k]].type === 'vault') ? 5 : 4;
    const offs = room.rows > ROWS ? [0, ROWS] : [0];
    offs.forEach((o, h) => {
      const kl = h ? 'L2' : 'L', kr = h ? 'R2' : 'R';
      if (e[kl] !== null && e[kl] !== undefined) for (const r of [8, 9]) t[(r + o) * COLS] = dt(kl);
      if (e[kr] !== null && e[kr] !== undefined) for (const r of [8, 9]) t[(r + o) * COLS + COLS - 1] = dt(kr);
      for (const r of [7, 8, 9]) for (const c of [1, 2, COLS - 2, COLS - 3]) { const q = (r + o) * COLS + c; if (t[q] === 1 || t[q] === 3) t[q] = 0; }
    });
    if (e.U !== null) this.stairs(room, 1, dt('U'));
    if (e.D !== null) this.stairs(room, 0, dt('D'));
    this.calcPts(room);
  }
  stairs(room, side, tt) {
    const t = room.tiles, mir = c => side ? c : COLS - 1 - c;
    for (let r = 2; r <= 9; r++) for (let c = 12; c <= 18; c++) t[r * COLS + mir(c)] = 0;
    for (const c of [13, 14, 15]) t[7 * COLS + mir(c)] = 3;
    for (const c of [16, 17, 18]) t[5 * COLS + mir(c)] = 3;
    t[3 * COLS + mir(19)] = tt || 4; t[4 * COLS + mir(19)] = tt || 4;
  }
  // mur fissuré : un tir ou une explosion l'ouvre et révèle la salle cachée
  breakWall(c, r) {
    const room = this.room, t = room.tiles; if (t[r * COLS + c] !== 5) return;
    room.crack = room.crack || {}; const key = c; room.crack[key] = (room.crack[key] || 0) + 1;
    this.fx(c * T + 8, r * T + 8, 4, '#b8a48a', 1.2); this.sfx('hit');
    if (room.crack[key] < 3) return;
    for (let rr2 = 0; rr2 < room.rows; rr2++) if (t[rr2 * COLS + c] === 5) { t[rr2 * COLS + c] = 4; this.fx(c * T + 8, rr2 * T + 8, 14, '#d8c8a8', 2.5); }
    for (const k in room.exits) { const o = room.exits[k]; if (o !== null && this.rooms[o].hidden) this.rooms[o].hidden = false; }
    this.staticDirty = true; this.shake(5); this.sfx('boom');
    this.toast = { title: 'Passage secret !', desc: 'Un mur s\'effondre, une cache s\'ouvre.', col: '#8ee8ff', t: 200 };
  }
  calcPts(room) {
    const tiles = room.tiles; room.spawnPts = []; room.air = [];
    for (let r = 1; r < room.rows - 1; r++) for (let c = 1; c < COLS - 1; c++) {
      const below = tiles[(r + 1) * COLS + c], here = tiles[r * COLS + c], above = tiles[(r - 1) * COLS + c];
      if (here === 0 && above === 0 && (below === 1 || below === 2 || below === 3) && c > 1 && c < COLS - 2) room.spawnPts.push([c * T + 2, r * T + T - 14]);
      if (here === 0 && above === 0 && (r % ROWS) < 7 && c > 2 && c < COLS - 3) room.air.push([c * T + 2, r * T + 2]);
    }
  }
  makeRoom(type, i, depth) {
    let tpl = (type === 'combat' || type === 'challenge') ? pick(TEMPLATES) : type === 'boss' ? BOSS_ROOM : FLAT_ROOM;
    const flip = rnd() < .5; if (flip) tpl = tpl.map(r => r.split('').reverse().join(''));
    const tiles = new Uint8Array(COLS * ROWS);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      let t = 0;
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) t = 2;
      else { const ch = tpl[r - 1][c - 1]; t = ch === '#' ? 1 : ch === '=' ? 3 : 0; }
      tiles[r * COLS + c] = t;
    }
    const room = { type, i, depth, rows: ROWS, gx: 0, gy: 0, exits: { L: null, R: null, U: null, D: null }, tiles, cleared: type === 'start' || type === 'shop' || type === 'vault', visited: false, wave: 0, waves: type === 'combat' ? 2 : type === 'challenge' ? 4 : 0, locked: false, pickups: null, spawnPts: [], air: [], entered: 0, rewardGiven: false, boss: false };
    room.tpl = tpl; return room;
  }
  // salle verticale : deux salles empilées, reliées par un puits de plateformes
  makeTallRoom(i, depth) {
    const rows = ROWS * 2, tiles = new Uint8Array(COLS * rows), mirror = rnd() < .5;
    const room = this.makeRoom('combat', i, depth), A = pick(TEMPLATES), Bt = pick(TEMPLATES);
    const cc = c => mirror ? COLS - 1 - c : c;
    for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
      let t = 0;
      if (r === 0 || r === rows - 1 || c === 0 || c === COLS - 1) t = 2;
      else if (r < ROWS - 1) { const ch = A[r - 1][c - 1]; t = ch === '#' ? 1 : ch === '=' ? 3 : 0; }
      else if (r === ROWS - 1) t = 1;
      else if (r > ROWS) { const ch = Bt[r - ROWS - 1][c - 1]; t = ch === '#' ? 1 : ch === '=' ? 3 : 0; }
      tiles[r * COLS + c] = t;
    }
    const set = (r, c, v) => { tiles[r * COLS + cc(c)] = v; };
    for (let r = 6; r <= 9; r++) for (let c = 2; c <= 10; c++) set(r, c, 0);
    for (let r = ROWS; r <= rows - 4; r++) for (let c = 2; c <= 11; c++) set(r, c, 0);
    for (let c = 3; c <= 6; c++) set(ROWS - 1, c, 0);
    for (let c = 7; c <= 10; c++) set(18, c, 3);
    for (let c = 3; c <= 6; c++) set(15, c, 3);
    for (let c = 6; c <= 9; c++) set(12, c, 3);
    room.rows = rows; room.tiles = tiles; room.tall = true; room.waves = 3; room.spawnTimer = 0;
    room.exits = { L: null, R: null, L2: null, R2: null, U: null, D: null };
    return room;
  }
  groundY(x, y) { const t = this.room.tiles, c = clamp(Math.floor(x / T), 0, COLS - 1); for (let r = Math.max(0, Math.floor(y / T)); r < this.room.rows; r++) { const v = t[r * COLS + c]; if (v === 1 || v === 2 || v === 3 || v === 5) return r * T; } return this.room.rows * T; }
  loadRoom(i, from, ledge, half) {
    // sauvegarde de la salle quittée
    if (this.room) { this.room.pickups = this.pickups; }
    this.room = this.rooms[i]; this.ri = i; Music.mood(this.floor, this.room.type, this.room.depth, (this.room.type === 'combat' || this.room.type === 'challenge') && !this.room.cleared); const r = this.room, p = this.p;
    r.visited = true;
    this.bullets = []; this.ebullets = []; this.enemies = []; this.hazards = []; this.emines = []; this.strikes = []; this.novas = []; this.decoy = null;
    this.mines = this.mines.filter(m => false);
    this.pickups = r.pickups || [];
    const hy = (half && r.rows > ROWS) ? ROWS * T : 0;
    if (from === 3) { p.x = ledge ? 282 : 26; p.y = 80 - p.h; }
    else if (from === 1) { p.x = T + 6; p.y = hy + 160 - p.h; }
    else if (from === 2) { p.x = W - T - 16; p.y = hy + 160 - p.h; }
    else if (from === 4 && r.tp) { p.x = r.tp.x + 20; p.y = 160 - p.h; }
    this.camY = clamp(p.y + p.h / 2 - H / 2, 0, r.rows * T - H);
    p.vx = 0; p.vy = 0; Input.endFrame();
    this.staticDirty = true;
    if (!r.entered) {
      r.entered = 1;
      if (r.type === 'item') this.setupItemRoom(r, false);
      else if (r.type === 'heal') this.setupHealRoom(r);
      else if (r.type === 'shop') this.setupShop(r);
      else if (r.type === 'vault') { this.stats.secret++; this.setupVault(r); }
      else if (r.type === 'challenge') { this.stats.secret++; r.spawnTimer = 45; r.locked = true; r.hit = false; this.banner = 'Défi : 4 vagues d\'élites !'; this.bannerT = 120; }
      else if (r.type === 'combat') { r.spawnTimer = 45; r.locked = true; }
      else if (r.type === 'boss') { r.locked = true; r.bossTimer = 90; this.banner = ''; }
    }
    if ((r.type === 'combat' || r.type === 'challenge') && !r.cleared) r.locked = true;
    if (r.type === 'boss' && !r.cleared) r.locked = true;
    this.locked = r.locked;
    if (r.type === 'boss' && !r.cleared && r.bossTimer == null) r.bossTimer = 60;
  }
  setupItemRoom(r, boss) {
    const owned = new Set(this.p.items.map(i => i.id).concat(this.def.armorCap ? ['blindage', 'bouclier'] : []));
    const pool = shuffle(ITEMS.filter(i => !owned.has(i.id)).concat(WEAPONS.filter(w => this.p.weapon !== w && rnd() < .5)));
    const xs = [96, 152, 208];
    for (let k = 0; k < 3 && k < pool.length; k++) this.pickups.push({ type: 'item', item: pool[k], x: xs[k], y: 160 - 14, group: boss ? 'b' : 'i' + r.i, bob: rnd() * 6 });
  }
  setupVault(r) {
    this.dropCoins(W / 2, 100, 4);
    this.pickups.push({ type: 'cell', x: 110, y: 160 - 8, bob: 0 }, { type: 'key', x: 200, y: 160 - 8, bob: 0 }, { type: 'crate', x: 150, y: 160 - 14, bob: 0 });
    if (this.p.hp < this.p.maxhp) this.pickups.push({ type: 'heart', x: 154, y: 160 - 8, bob: 0 });
  }
  setupShop(r) {
    const owned = new Set(this.p.items.map(i => i.id).concat(this.def.armorCap ? ['blindage', 'bouclier'] : [])), pool = shuffle(ITEMS.filter(i => !owned.has(i.id)));
    const wp = shuffle(WEAPONS.filter(w => this.p.weapon !== w))[0];
    const st = [];
    for (let k = 0; k < 2 && k < pool.length; k++) st.push({ kind: 'item', item: pool[k], price: ri(9, 15) });
    if (wp && rnd() < .5) st.push({ kind: 'weapon', item: wp, price: ri(13, 18) });
    st.push({ kind: 'heart', price: 5 }); st.push({ kind: 'key', price: 9 });
    st.forEach((s, k) => this.pickups.push(Object.assign({ type: 'shop', x: 154 - (st.length - 1) * 24 + k * 48 - 8 + 8, y: 160 - 14, bob: rnd() * 6 }, s)));
  }
  setupHealRoom(r) {
    this.pickups.push({ type: 'choice', opt: 'repair', x: 118, y: 160 - 14, group: 'h' + r.i, bob: 0 });
    this.pickups.push({ type: 'choice', opt: 'surprod', x: 192, y: 160 - 14, group: 'h' + r.i, bob: 2 });
  }

  /* ---------- Collisions de tuiles ---------- */
  tileAt(c, r) { if (r < 0 || r >= this.room.rows) return 2; if (c < 0 || c >= COLS) return 0; return this.room.tiles[r * COLS + c]; }
  hardSolid(c, r, e) {
    const t = this.tileAt(c, r);
    if (t === 2 || t === 5) return true; if (t === 4) return this.room.locked;
    if (t === 1) return !(e && e.phase);
    return false;
  }
  moveEnt(e, noGrav) {
    e.x += e.vx;
    let x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - .001) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - .001) / T);
    for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) if (this.hardSolid(c, r, e)) {
      if (e.vx > 0) e.x = c * T - e.w; else if (e.vx < 0) e.x = (c + 1) * T; e.vx = 0; e.hitWall = true;
    }
    const prevB = e.y + e.h; e.y += e.vy; e.onGround = false;
    x0 = Math.floor(e.x / T); x1 = Math.floor((e.x + e.w - .001) / T); y0 = Math.floor(e.y / T); y1 = Math.floor((e.y + e.h - .001) / T);
    for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) {
      const t = this.tileAt(c, r);
      let s = this.hardSolid(c, r, e);
      if (!s && e.vy > 0 && (t === 3 || (t === 1 && e.phase)) && prevB <= r * T + .01) s = true;
      if (s) { if (e.vy > 0) { e.y = r * T - e.h; e.onGround = true; } else if (e.vy < 0) e.y = (r + 1) * T; e.vy = 0; }
    }
  }
  solidPt(x, y) { const t = this.tileAt(Math.floor(x / T), Math.floor(y / T)); return t === 1 || t === 2 || t === 5 || (t === 4 && this.room.locked); }

  /* ---------- Outils de combat ---------- */
  aliveEnemies() { return this.enemies.filter(e => e.spawnT <= 0 && e.hp > 0); }
  nearestEnemy(x, y, maxD) {
    let b = null, bd = maxD || 1e9;
    for (const e of this.enemies) { if (e.spawnT > 0 || e.hp <= 0) continue; const d = Math.hypot(e.cx - x, e.cy - y); if (d < bd) { bd = d; b = e; } }
    return b;
  }
  aim(p) {
    let target = null, tx, ty;
    if (Input.mouse) { tx = Input.mx; ty = Input.my + (this.camY || 0); target = { cx: tx, cy: ty }; }
    else { target = Opts.aim ? this.nearestEnemy(p.cx, p.cy) : null; if (target) { tx = target.cx; ty = target.cy; } else { tx = p.cx + p.face * 100; ty = p.cy; } }
    return { ang: Math.atan2(ty - p.cy, tx - p.cx), target, tx, ty };
  }
  shootP(p, ang, o) {
    const st = p.st, sp = o.speed || 3;
    const b = {
      x: p.cx, y: p.cy - 1, vx: o.vx !== undefined ? o.vx : Math.cos(ang) * sp, vy: o.vy !== undefined ? o.vy : Math.sin(ang) * sp,
      r: o.r || 2, dmg: (o.dmg || 1) * st.dmg, life: o.life || 60, grav: o.grav || 0, pierce: (o.pierce || 0) + st.pierce, bounce: (o.bounce || 0) + st.bounce,
      homing: Math.max(o.homing || 0, st.homing), explode: o.explode || st.explode, color: o.color || '#fff', kind: o.kind || 'b', burn: o.burn || 0, freeze: o.freeze || 0,
      crit: o.crit !== undefined ? o.crit : rnd() < st.crit, hit: new Set(), kb: st.kb, trail: 0
    };
    if (p.buff.traj > 0 && o.kind !== 'grenade') b.crit = true;
    this.bullets.push(b); return b;
  }
  ebul(x, y, ang, sp, o) {
    o = o || {};
    this.ebullets.push({ x, y, vx: Math.cos(ang) * sp * .7 * this.diff.bul, vy: Math.sin(ang) * sp * .7 * this.diff.bul, r: o.r || 2.5, dmg: o.dmg || 1, life: o.life || 240, grav: o.grav || 0, bounce: o.bounce || 0, kind: o.kind || 'b', explode: o.explode || 0, color: o.color || '#8dff5a', nowall: o.nowall });
  }
  fx(x, y, n, col, sp) { sp = sp || 2; for (let i = 0; i < n; i++) { const a = rnd() * TAU, s = rr(.3, 1) * sp; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .3, life: ri(14, 32), max: 32, col, sz: rnd() < .3 ? 2 : 1, grav: .05 }); } }
  text(x, y, str, col) { this.texts.push({ x, y, str, col: col || '#fff', life: 50 }); }
  shake(n) { this.shakeT = Math.max(this.shakeT, n); }
  heal(p, n) { const h = Math.min(p.maxhp - p.hp, n); p.hp += h; if (h > 0) this.text(p.cx, p.y - 6, '+' + h + ' PV', '#ff5cc8'); this.fx(p.cx, p.cy, 10, '#ff5cc8', 1.5); }
  explode(x, y, r, dmg, friendly, col) {
    this.fx(x, y, 14 + (r / 3 | 0), col || '#ffb347', 2.5); this.shake(3); this.sfx('boom');
    this.novas.push({ x, y, r: 2, max: r, col: col || '#ffb347', dmg: 0, vis: true, spd: 3 });
    if (friendly) { const c0 = Math.floor((x - r) / T), c1 = Math.floor((x + r) / T), r0 = Math.floor((y - r) / T), r1 = Math.floor((y + r) / T); for (let cc = c0; cc <= c1; cc++) for (let rr2 = r0; rr2 <= r1; rr2++) if (this.tileAt(cc, rr2) === 5 && Math.hypot(cc * T + 8 - x, rr2 * T + 8 - y) < r + 8) { this.breakWall(cc, rr2); this.breakWall(cc, rr2); this.breakWall(cc, rr2); } }
    if (friendly) { for (const e of this.enemies) if (e.spawnT <= 0 && e.hp > 0 && Math.hypot(e.cx - x, e.cy - y) < r + e.w / 2) this.hurtEnemy(e, dmg, this.p); }
    else { const p = this.p; if (Math.hypot(p.cx - x, p.cy - y) < r + 5) this.hurtPlayer(dmg); }
  }
  nova(x, y, col, dmg, o) { this.novas.push(Object.assign({ x, y, r: 4, max: 340, col, dmg, hit: new Set(), spd: 6, burn: 0, kb: 0, clear: true }, o || {})); this.shake(5); this.flashT = 6; }

  hurtEnemy(e, dmg, src, o) {
    if (e.spawnT > 0 || e.hp <= 0) return false;
    o = o || {};
    if (e.shieldHp > 0) { e.shieldHp--; this.fx(e.cx, e.cy, 8, '#37e0ff', 1.5); this.sfx('shield'); return false; }
    dmg *= e.armor;
    if (o.crit) { this.text(e.cx, e.y - 4, (Math.round(dmg * 10) / 10) + '!', '#ffd23a'); this.hitstop = Math.max(this.hitstop, 2); this.shake(2); this.sfx('crit'); }
    else if (dmg >= 1.4) this.text(e.cx, e.y - 4, String(Math.round(dmg * 10) / 10), '#fff');
    e.hp -= dmg; e.flash = 4; if (o.burn) e.burn = Math.max(e.burn, o.burn); if (o.freeze) e.freeze = o.freeze;
    const p = this.p; p.ult = Math.min(100, p.ult + dmg * 1.3 * p.st.ultRate);
    this.sfx('hit'); this.score += Math.round(dmg);
    if (e.hp <= 0) this.killEnemy(e);
    return true;
  }
  killEnemy(e) {
    const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1);
    this.kills++; this.score += e.boss ? 500 : 10; this.hitstop = 3; this.addXp(e.boss ? 12 : e.elite ? 3 : 1);
    if (this.p.st.vamp && this.kills % Math.max(4, 12 - this.p.st.vamp * 3) === 0) this.heal(this.p, 1);
    this.fx(e.cx, e.cy, e.boss ? 60 : 16, '#5dff6a', e.boss ? 4 : 2.5); this.fx(e.cx, e.cy, 8, '#fff', 2); this.sfx('kill'); this.shake(e.boss ? 10 : 2);
    this.p.ult = Math.min(100, this.p.ult + 6 * this.p.st.ultRate);
    if (e.type === 'shojo' && !e.boss) { this.explode(e.cx, e.cy, 30, 1, false, '#ff7a2a'); }
    if (e.boss) { this.ebullets = []; this.hazards = []; this.emines = []; for (const o of this.enemies.slice()) this.killEnemy(o); this.bossDead(e); return; }
    this.dropCoins(e.cx, e.cy, e.elite ? 2 : rnd() < .2 ? 1 : 0);
    const r = rnd();
    if (r < .035) this.pickups.push({ type: 'heart', x: e.cx - 4, y: e.y, vy: -2, bob: 0 });
    else if (r < .15) this.pickups.push({ type: 'shield', x: e.cx - 4, y: e.y, vy: -2, bob: 0 });
    else if (r < .165 && this.floor > 1) this.pickups.push({ type: 'cell', x: e.cx - 4, y: e.y, vy: -2, bob: 0 });
    if (e.elite) { if (this.room.type !== 'challenge' && rnd() < .3) this.pickups.push({ type: 'heart', x: e.cx - 4, y: e.y, vy: -2, bob: 0 }); if (rnd() < .3) this.pickups.push({ type: 'key', x: e.cx - 4, y: e.y, vy: -2, bob: 0 }); }
  }
  hurtPlayer(dmg, sx) {
    const p = this.p; if (p.inv > 0 || this.state !== 'play') return false;
    if (p.dodge && rnd() < p.dodge) { p.inv = 40; this.text(p.cx, p.y - 8, 'ESQUIVE', '#ff9a2a'); this.fx(p.cx, p.cy, 14, '#ff9a2a', 2); this.sfx('shield'); return false; }
    if (p.armor > 0) {
      this.room.hit = true;
      const ab = Math.min(p.armor, Math.max(1, Math.ceil(dmg))); p.armor -= ab; dmg -= ab; this.fx(p.cx, p.cy, 12, '#37e0ff', 2); this.sfx('shield'); this.shake(3); this.text(p.cx, p.y - 8, 'ARMURE', '#37e0ff');
      if (dmg <= 0) { p.inv = 70; if (sx !== undefined) { p.vx = Math.sign(p.cx - sx) * 1.2; } return true; }
    }
    this.stats.hurtFloor = true; this.room.hit = true; try { if (Opts.vib && navigator.vibrate) navigator.vibrate(35); } catch (e) { } p.hp -= dmg; p.inv = 120 + (p.st.inv || 0) * 40; if (p.st.thorn && p.hp > 0) this.nova(p.cx, p.cy, '#8ee8ff', 3 * p.st.dmg, { kb: 3 }); p.flash = 8; this.shake(6); this.sfx('hurt'); this.fx(p.cx, p.cy, 14, '#ff4a6a', 2.5); this.flashT = 4;
    if (sx !== undefined) { p.vx = Math.sign(p.cx - sx) * 2.2; p.vy = -2.4; }
    if (p.hp <= 0) {
      if (p.revive) { p.revive = 0; p.hp = 2; p.inv = 150; this.nova(p.cx, p.cy, '#ff6a2a', 6 * p.st.dmg, { burn: 240 }); this.text(p.cx, p.y - 10, 'REVEIL ENFLAMME', '#ff6a2a'); this.sfx('ult'); }
      else { p.hp = 0; this.state = 'dead'; this.endT = 0; this.sfx('lose'); this.fx(p.cx, p.cy, 40, this.def.col, 3); }
    }
    return true;
  }

  /* ---------- Vagues ---------- */
  spawnWave() {
    const r = this.room, f = this.floor, pool = FLOOR_POOL[f - 1];
    let n = Math.min(f >= 5 ? 7 : f >= 3 ? 6 : 5, 1 + f + (r.depth >> 2)); if (r.wave > 0) n = Math.max(2, n - 1); n += this.diff.n; if (r.type === 'challenge') n = 3 + (r.wave >= 2 ? 1 : 0) + (f >= 4 ? 1 : 0) + this.diff.n;
    const hpMul = (1 + (f - 1) * .38 + r.depth * .045) * .6 * this.diff.hp, chal = r.type === 'challenge';
    for (let k = 0; k < n; k++) {
      const type = pick(pool), d = ENEMY[type]; let x, y;
      for (let tries = 0; tries < 12; tries++) {
        { const L0 = d.fly ? r.air : r.spawnPts, L1 = r.rows > ROWS ? L0.filter(q => Math.abs(q[1] - this.p.cy) < 120) : L0, sp = pick(L1.length ? L1 : L0); x = sp[0]; y = sp[1]; }
        if (Math.hypot(x - this.p.x, y - this.p.y) > 90) break;
      }
      const e = new Enemy(type, x, y, hpMul); e.spd *= 1 + (f - 1) * .06; e.spawnT = 30 + k * 8; if (!d.fly) e.y -= e.h - 14;
      if (chal || (r.depth >= 2 && rnd() < .06 + f * .035)) { e.elite = true; e.hp *= 1.7; e.maxhp = e.hp; }
      this.enemies.push(e);
    }
  }
  spawnBoss() {
    const B = BOSSES[this.floor - 1], e = new Enemy(B.id, W / 2 - 15, 60, 1);
    e.w = B.w; e.h = B.h; e.boss = B; e.hp = e.maxhp = Math.round(B.hp * .5 * this.diff.hp); e.spawnT = 30; e.fly = B.id === 'senpoku'; e.bt = 0; e.armor = B.id === 'sankai' ? .8 : 1; e.spd = { goryo: .28, genbu: .45, gaoro: .9, goki: .6 }[B.id] || .5;
    this.enemies.push(e); this.sfx('boss'); this.shake(8); this.banner = B.name + ' - ' + B.title; this.bannerT = 140;
  }
  bossDead(e) {
    this.stats.bossKills++; if (!this.stats.hurtFloor) this.stats.flawless = true;
    this.room.cleared = true; this.room.locked = false; this.locked = false;
    this.fx(e.cx, e.cy, 80, '#fff', 5);
    if (this.floor >= 6) { this.state = 'win'; this.endT = 0; this.sfx('win'); return; }
    this.dropCoins(e.cx, e.cy, 6);
    this.setupItemRoom(this.room, true);
    this.pickups.push({ type: 'portal', x: W / 2 - 8, y: 160 - 32, bob: 0 });
    this.pickups.push({ type: 'heart', x: W / 2 - 40, y: 100, vy: -1, bob: 0 });
    this.banner = 'Prodrome vaincu !'; this.bannerT = 150;
  }
  dropCoins(x, y, n) { for (let i = 0; i < n; i++) this.pickups.push({ type: 'coin', x: x - 2, y: y - 2, vx: rr(-1.4, 1.4), vy: -rr(2, 3.6), age: 0, bob: rnd() * 6 }); }
  tpSpot(room) {
    const t = room.tiles, ok = [];
    for (let c = 3; c <= COLS - 6; c++) {
      let good = true;
      for (let cc = c; cc < c + 3 && good; cc++) { for (let r = 5; r <= 9; r++) if (t[r * COLS + cc] !== 0) good = false; const f = t[10 * COLS + cc]; if (f !== 1 && f !== 2) good = false; }
      if (room.type === 'heal' && c * 16 + 48 > 100 && c * 16 < 215) good = false;
      if (good) ok.push(c * 16);
    }
    return ok.length ? pick(ok) : null;
  }
  updateTP() {
    const r = this.room, tp = r.tp, p = this.p; if (!tp) return;
    if (tp.lock > 0) tp.lock--;
    tp.near = !r.locked && Math.abs(p.cx - (tp.x + 14)) < 22 && p.y + p.h > 150;
    if (tp.near && Input.jumpPressed) {
      if (tp.active) { const n = this.rooms.filter(q => q.tp && q.tp.active && q !== r).length; if (n) this.uiReq = 'tp'; else this.text(p.cx, p.y - 8, 'AUCUNE AUTRE BORNE', '#8a7ab0'); }
      else if (tp.lock > 0) { this.text(p.cx, p.y - 8, 'VERROUILLE', '#ff6a8a'); this.sfx('warn'); }
      else this.uiReq = 'hack';
    }
  }
  tpActivate() {
    const tp = this.room.tp; if (!tp) return; tp.active = true; this.sfx('win'); this.fx(tp.x + 26, 146, 26, '#38e8ff', 3); this.addXp(1);
    this.toast = { title: 'Borne piratée', desc: 'Téléportation disponible depuis cette salle.', col: '#38e8ff', t: 220 };
  }
  teleportTo(i) {
    const to = this.rooms[i]; if (!to || !to.tp || !to.tp.active || i === this.ri) return false;
    this.fx(this.p.cx, this.p.cy, 20, '#38e8ff', 3); this.loadRoom(i, 4); this.flashT = 14; this.sfx('ult'); this.fx(this.p.cx, this.p.cy, 20, '#38e8ff', 3);
    this.banner = 'Téléportation'; this.bannerT = 70; return true;
  }
  // point d'appui valide (sol ou plateforme) près d'une abscisse, dans l'étage où se trouve le joueur
  standSpot(prefX) {
    const r = this.room, p = this.p; if (!r.spawnPts || !r.spawnPts.length) return null;
    let pts = r.spawnPts.filter(q => Math.abs(q[1] - p.y) < 110 && q[0] > 28 && q[0] < W - 40); if (!pts.length) pts = r.spawnPts;
    pts = pts.slice().sort((a, b) => Math.abs(a[0] - prefX) - Math.abs(b[0] - prefX));
    return pts[Math.min(pts.length - 1, ri(0, 2))];
  }
  clearRoom() {
    const r = this.room, p = this.p; r.cleared = true; r.locked = false; this.locked = false; this.roomsCleared++; Music.mood(this.floor, r.type, r.depth, false);
    this.sfx('door'); this.shake(2); this.addXp(2);
    if (r.type === 'combat') {
      if (p.st.regenShield) p.armor = Math.min(p.armorMax, p.armor + p.st.regenShield);
      if (this.def.roomArmor) p.armor = Math.min(p.armorMax, p.armor + this.def.roomArmor);
      const tallR = r.rows > ROWS, dx = tallR ? clamp(p.cx, 28, W - 40) : W / 2, dy = tallR ? p.cy - 22 : 90;
      this.dropCoins(dx, dy - 10, ri(1, 2));
      const k = rnd();
      if (p.hp < p.maxhp && k < .35) this.pickups.push({ type: 'heart', x: dx - 4, y: dy, vy: -1, bob: 0 });
      else if (k < .72) this.pickups.push({ type: 'shield', x: dx - 4, y: dy, vy: -1, bob: 0 });
      if (rnd() < .10) this.pickups.push({ type: 'key', x: dx + 6, y: dy, vy: -1, bob: 0 });
      if (rnd() < .20) { const q = this.standSpot(ri(60, 250)); if (q) this.pickups.push({ type: 'crate', x: q[0], y: q[1], bob: rnd() * 6 }); }
      if (rnd() < .3) { const owned = new Set(p.items.map(o => o.id).concat(this.def.armorCap ? ['blindage', 'bouclier'] : [])), pl = ITEMS.filter(o => !owned.has(o.id)); const q = this.standSpot(W / 2 - 40); if (pl.length && q) this.pickups.push({ type: 'item', item: pick(pl), x: q[0], y: q[1], group: 'f' + r.i, bob: 0 }); }
      if (r.depth % 2 === 1 || rnd() < .25) this.pickups.push({ type: 'cell', x: clamp(dx + 20, 24, W - 32), y: dy, vy: -1, bob: 0 });
    } else if (r.type === 'challenge') {
      this.dropCoins(W / 2, 80, 3); this.setupItemRoom(r, false); this.banner = 'Défi réussi !'; this.bannerT = 120;
      if (!r.hit) {
        this.banner = 'DÉFI PARFAIT ! Récompense bonus'; this.bannerT = 160; this.dropCoins(W / 2, 70, 5); this.addXp(4); this.sfx('win'); this.fx(W / 2, 90, 40, '#ffd23a', 4);
        this.pickups.push({ type: 'heart', x: W / 2 - 30, y: 80, vy: -1, bob: 0 }, { type: 'shield', x: W / 2 + 22, y: 80, vy: -1, bob: 0 }, { type: 'key', x: W / 2 + 36, y: 80, vy: -1, bob: 0 });
        const q = this.standSpot(W / 2 + 50); if (q) this.pickups.push({ type: 'crate', x: q[0], y: q[1], bob: 0 });
      }
    }
  }
  addXp(n) {
    const p = this.p; if (p.level >= 30) return; p.xp += n;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext; p.level++; p.xpNext = 8 + p.level * 3; this.pendingLevel++;
      this.flashT = 6; this.sfx('ult'); this.fx(p.cx, p.cy, 30, this.def.col, 3);
      const rk = RANKS.find(r => r[0] === p.level);
      this.text(p.cx, p.y - 14, rk ? 'GRADE : ' + rk[1] : 'NIVEAU ' + p.level, rk ? rk[2] : '#ffe38a');
      if (rk) { this.banner = 'Nouveau grade : ' + rk[1]; this.bannerT = 130; }
    }
  }
  levelChoices() {
    const p = this.p, pool = shuffle(UPGRADES.filter(u => (!u.ok || u.ok(p)) && !(this.def.armorCap && u.id === 'u_arm')));
    return pool.slice(0, 3);
  }
  applyUp(u) { const p = this.p; p.ups.push(u.id); u.apply(p, this); this.pendingLevel = Math.max(0, this.pendingLevel - 1); this.sfx('pick'); this.fx(p.cx, p.cy, 18, u.col, 2.5); this.toast = { title: u.name, desc: u.desc, col: u.col, t: 160 }; }
  openCrate(k) {
    const p = this.p, x = k.x + 4, y = k.y;
    this.fx(x, y, 24, '#ffd23a', 3); this.sfx('pick'); this.shake(3); this.stats.crates = (this.stats.crates || 0) + 1;
    const owned = new Set(p.items.map(o => o.id).concat(this.def.armorCap ? ['blindage', 'bouclier'] : [])), pl = ITEMS.filter(o => !owned.has(o.id)), r = rnd();
    if (r < .38 && pl.length) { const it = pick(pl); this.pickups.push({ type: 'item', item: it, x: x - 4, y: 160 - 14, group: 'c' + this.frame, bob: 0 }); this.text(x, y - 10, 'OBJET !', '#ffd23a'); }
    else if (r < .5) { const ws = WEAPONS.filter(w => p.weapon !== w); if (ws.length) { this.pickups.push({ type: 'item', item: pick(ws), x: x - 4, y: 160 - 14, group: 'c' + this.frame, bob: 0 }); this.text(x, y - 10, 'ARME !', '#ffd23a'); } else this.dropCoins(x, y, 10); }
    else if (r < .68) { this.dropCoins(x, y, ri(3, 5)); this.text(x, y - 10, 'BOULONS !', '#ffd23a'); }
    else if (r < .82) { for (let i = 0; i < 2; i++) this.pickups.push({ type: 'shield', x: x - 10 + i * 12, y: y - 6, vy: -2.4, bob: 0 }); this.text(x, y - 10, 'ARMURE !', '#37e0ff'); }
    else { this.pickups.push({ type: 'heart', x: x - 10, y: y - 6, vy: -2.4, bob: 0 }); this.pickups.push({ type: 'heart', x: x + 2, y: y - 6, vy: -2.4, bob: 0 }); this.pickups.push({ type: 'cell', x: x + 14, y: y - 6, vy: -2.4, bob: 0 }); this.text(x, y - 10, 'REPARATION !', '#ff5cc8'); }
  }
  giveItem(it) {
    const p = this.p; p.items.push(it); it.apply(p, this);
    this.toast = { title: it.name, desc: it.desc, col: it.col, t: 240 };
    this.sfx('pick'); this.fx(p.cx, p.cy, 20, it.col, 2.5); this.flashT = 4;
    this.checkSyn();
  }
  checkSyn() {
    const have = new Set(this.p.items.map(i => i.id).concat(this.def.armorCap ? ['blindage', 'bouclier'] : []));
    for (const s of SYNERGIES) if (!this.syn.has(s.id) && s.req.every(r => have.has(r))) {
      this.syn.add(s.id); s.apply(this.p, this); this.stats.syn++;
      this.toast = { title: 'Synergie : ' + s.name, desc: s.desc, col: '#ffe38a', t: 280 }; this.sfx('ult'); this.fx(this.p.cx, this.p.cy, 26, '#ffe38a', 3);
    }
  }

  /* ---------- Boucle principale ---------- */
  step() {
    if (this.hitstop > 0) { this.hitstop--; Input.endFrame(); return; }
    this.frame++;
    const p = this.p;
    if (this.state !== 'play') { this.endT++; this.updateFx(); Input.endFrame(); return; }
    this.updatePlayer();
    this.updateTP();
    this.updateRoomLogic();
    this.updateEnemies();
    this.updateBullets();
    this.updateMisc();
    this.updateFx();
    // transitions
    {
      const r = this.room, side = p.cx < -2 ? 0 : p.cx > W + 2 ? 1 : -1;
      if (side >= 0) {
        const tall = r.rows > ROWS, hh = tall && p.cy >= ROWS * T ? 1 : 0, high = !tall && p.cy < 112;
        const k = tall ? (side === 0 ? (hh ? 'L2' : 'L') : (hh ? 'R2' : 'R')) : side === 0 ? (high ? 'D' : 'L') : (high ? 'U' : 'R'), to = r.exits[k];
        if (to !== null && to !== undefined) {
          const dest = this.rooms[to], half = dest.rows > ROWS ? clamp(r.gy + hh - dest.gy, 0, 1) : 0;
          if (high) this.loadRoom(to, 3, side === 1 ? 0 : 1); else this.loadRoom(to, side === 1 ? 1 : 2, 0, half);
        }
        else { p.x = side ? W - p.w - 2 : 2; p.vx = 0; }
      }
    }
    { const rr0 = this.room, tcy = clamp(p.y + p.h / 2 - H / 2, 0, rr0.rows * T - H); this.camY = (this.camY || 0) + (tcy - (this.camY || 0)) * .14; }
    if (this.toast && --this.toast.t <= 0) this.toast = null;
    if (this.bannerT > 0) this.bannerT--;
    Input.endFrame();
  }

  updatePlayer() {
    const p = this.p, def = this.def;
    if (p.inv > 0) p.inv--; if (p.flash > 0) p.flash--;
    for (const k in p.buff) if (p.buff[k] > 0) p.buff[k]--;
    const dir = Input.right - Input.left, spd = 1.55 * p.st.spd;
    p.vx += (dir * spd - p.vx) * (p.onGround ? .38 : .22);
    if (dir) p.face = dir;
    // saut
    if (p.onGround) { p.coyote = 6; p.jumpsLeft = p.st.jumps; p.hover = 100; } else if (p.coyote > 0) p.coyote--;
    if (Input.jumpPressed) p.jbuf = 7; else if (p.jbuf > 0) p.jbuf--;
    if (p.jbuf > 0) {
      if (p.coyote > 0) { p.vy = -5.5; p.coyote = 0; p.jbuf = 0; this.sfx('jump'); this.fx(p.cx, p.y + p.h, 4, '#ffffff', 1); }
      else if (p.jumpsLeft > 0) { p.vy = -5; p.jumpsLeft--; p.jbuf = 0; this.sfx('jump2'); this.fx(p.cx, p.y + p.h, 8, this.biome.neon, 1.5); }
    }
    if (!Input.jump && p.vy < -2.2) p.vy *= .84;
    p.vy = Math.min(p.vy + .3, 7);
    if (def.flies && Input.jump && p.vy > .5 && p.hover > 0 && !p.onGround) { p.vy = .6; p.hover--; if (this.frame % 4 === 0) this.fx(p.cx, p.y + p.h, 1, '#ff7ad9', .8); }
    if (p.dash < p.dashMax) { if (++p.dashCd >= 70) { p.dashCd = 0; p.dash++; } }
    if (Input.dashPressed && p.dash > 0 && p.dashT <= 0) {
      p.dash--; p.dashCd = 0; p.dashT = 9; p.dashDir = (Input.right - Input.left) || p.face; p.inv = Math.max(p.inv, 20);
      this.stats.dashes++; this.sfx('dash'); this.fx(p.cx, p.cy, 8, '#ffffff', 1.5);
    }
    if (p.dashT > 0) { p.dashT--; p.vx = p.dashDir * 4.4; p.vy = 0; if (this.frame % 2 === 0) this.fx(p.cx, p.cy, 2, def.col, .8); }
    p.hitWall = false; this.moveEnt(p);
    if (p.y > this.room.rows * T + 20) { p.y = 100; }
    p.anim++;
    // armes
    if (p.cd > 0) p.cd--;
    const a = this.aim(p);
    if (Input.fire && p.cd <= 0) {
      const fw = p.weapon || def; fw.fire(this, p, a);
      p.cd = (fw.cd / p.st.rate) * (p.buff.storm > 0 ? .33 : 1);
      if (!Input.mouse && a.target) p.face = a.target.cx >= p.cx ? 1 : -1;
    }
    if (Input.ultPressed) {
      if (p.ult >= 100) { p.ult = 0; def.ult(this, p); this.shake(4); } else this.text(p.cx, p.y - 8, 'CHARGE ' + Math.floor(p.ult) + '%', '#ffe38a');
    }
    if (def.armorCap && p.armorMax !== def.armorCap) { p.armorMax = def.armorCap; p.armor = Math.min(p.armor, p.armorMax); }
    if (def.update) def.update(this, p);
    // drone & gaz
    if (p.st.drone) {
      p.droneT++;
      if (p.droneT % 42 === 0) { const e = this.nearestEnemy(p.cx, p.cy); if (e) { const dx = p.cx + Math.cos(this.frame / 20) * 18, dy = p.cy - 16 + Math.sin(this.frame / 20) * 4; const ang = Math.atan2(e.cy - dy, e.cx - dx); for (let k = 0; k < p.st.drone; k++) this.bullets.push({ x: dx, y: dy, vx: Math.cos(ang) * 3.4, vy: Math.sin(ang) * 3.4, r: 2, dmg: .8 * p.st.dmg, life: 70, grav: 0, pierce: 0, bounce: 0, homing: 0, explode: 0, color: '#5dff6a', kind: 'b', burn: 0, freeze: 0, crit: false, hit: new Set(), kb: 0 }); } }
    }
    if (p.st.gas) {
      p.gasT++;
      if (p.gasT % 30 === 0) { const rad = 34 + p.st.gas * 10; for (const e of this.enemies) if (e.spawnT <= 0 && Math.hypot(e.cx - p.cx, e.cy - p.cy) < rad) this.hurtEnemy(e, .45 * p.st.gas * p.st.dmg, p); }
    }
  }

  updateRoomLogic() {
    const r = this.room, p = this.p;
    if ((r.type === 'combat' || r.type === 'challenge') && r.locked) {
      if (r.spawnTimer > 0) { if (--r.spawnTimer === 0) { this.spawnWave(); } }
      else if (this.enemies.length === 0) {
        r.wave++;
        if (r.wave >= r.waves) this.clearRoom(); else { r.spawnTimer = 50; this.sfx('warn'); }
      }
    }
    if (r.type === 'boss' && r.locked && !r.boss) { if (--r.bossTimer <= 0) { r.boss = true; this.spawnBoss(); } }
    // ramassage
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      if (k.type === 'coin') {
        k.age++; k.bob += .15; k.vy += .16; k.x += k.vx; k.y += k.vy; k.vx *= .97;
        if (k.x < 12) { k.x = 12; k.vx = Math.abs(k.vx); } if (k.x > W - 20) { k.x = W - 20; k.vx = -Math.abs(k.vx); }
        { const gy0 = this.room.rows > ROWS ? this.groundY(k.x + 2, k.y - 2) : 160; if (k.y > gy0 - 6) { k.y = gy0 - 6; k.vy = k.vy > 1.5 ? -k.vy * .4 : 0; k.vx *= .8; } }
        const dx = p.cx - (k.x + 2), dy = p.cy - (k.y + 2), dd = Math.hypot(dx, dy);
        if (k.age > 18 && dd < 48 + p.st.magnet * 22) { k.x += dx / dd * (2.6 + p.st.magnet * .6); k.y += dy / dd * (2.6 + p.st.magnet * .6); k.vy = 0; }
        if (dd < 12) { p.coins++; this.pickups.splice(i, 1); this.sfx('coin'); }
        continue;
      }
      k.bob += .08;
      const mag = (k.type === 'heart' && p.hp < p.maxhp) || (k.type === 'shield' && p.armor < p.armorMax) || k.type === 'key' || k.type === 'cell';
      if (mag) {
        const dx = p.cx - (k.x + 4), dy = p.cy - (k.y + 4), dd = Math.hypot(dx, dy) || 1, R = 46 + p.st.magnet * 22;
        if (dd < R && (k.age = (k.age || 0) + 1) > 14) { const sp = 1.4 + (R - dd) / R * 2.6; k.x += dx / dd * sp; k.y += dy / dd * sp; k.vy = undefined; }
        else if (k.vy !== undefined) { k.vy += .12; k.y += k.vy; const g0 = this.room.rows > ROWS ? this.groundY(k.x + 4, k.y - 4) : 160; if (k.y > g0 - 8) { k.y = g0 - 8; k.vy = undefined; } }
        k.near = Math.hypot(dx, dy) < 14;
        if (!k.near) continue;
      } else if (k.vy !== undefined) { k.vy += .12; k.y += k.vy; const g0 = this.room.rows > ROWS ? this.groundY(k.x + 4, k.y - 4) : 160; if (k.y > g0 - 8) { k.y = g0 - 8; k.vy = undefined; } }
      if (!mag) { const near = Math.abs(k.x + 4 - p.cx) < 14 && Math.abs(k.y + 4 - p.cy) < 16; k.near = near; if (!near) continue; }
      if (k.type === 'shop') {
        if (Input.jumpPressed) {
          if (k.kind === 'heart' && p.hp >= p.maxhp) this.text(p.cx, p.y - 8, 'PV PLEINS', '#fff');
          else if (p.coins < k.price) { this.text(p.cx, p.y - 8, 'PAS ASSEZ', '#ff6a8a'); this.sfx('warn'); }
          else {
            p.coins -= k.price; this.pickups.splice(i, 1);
            this.stats.purchases++;
            if (k.kind === 'repair') { this.heal(p, 2); this.sfx('pick'); this.toast = { title: 'Réparation express', desc: '+2 PV.', col: '#ff5cc8', t: 160 }; }
            else if (k.kind === 'surprod') { p.armor = Math.min(p.armorMax, p.armor + 2); this.sfx('pick'); this.toast = { title: 'Surproduction', desc: '+2 armure.', col: '#37e0ff', t: 160 }; }
            else if (k.kind === 'key') { p.keys++; this.sfx('pick'); this.toast = { title: 'Clé de caisse', desc: 'Ouvre une caisse de loot.', col: '#e8eef0', t: 160 }; }
            else if (k.kind === 'heart') { this.heal(p, 2); this.sfx('pick'); this.toast = { title: 'Pack de réparation', desc: '+2 PV.', col: '#ff5cc8', t: 160 }; }
            else this.giveItem(k.item);
            this.fx(k.x + 4, k.y, 14, '#ffe38a', 2); break;
          }
        }
      }
      else if (k.type === 'heart') { if (p.hp < p.maxhp) { this.heal(p, 1); this.pickups.splice(i, 1); this.sfx('pick'); } }
      else if (k.type === 'shield') { if (p.armor < p.armorMax) { p.armor++; this.pickups.splice(i, 1); this.sfx('pick'); this.text(p.cx, p.y - 6, '+ARMURE', '#37e0ff'); } }
      else if (k.type === 'key') { p.keys++; this.pickups.splice(i, 1); this.sfx('pick'); this.text(p.cx, p.y - 6, '+CLE', '#cfd8dc'); }
      else if (k.type === 'crate') { if (Input.jumpPressed) { if (p.keys > 0) { p.keys--; this.pickups.splice(i, 1); this.openCrate(k); break; } else { this.text(p.cx, p.y - 8, 'CLE REQUISE', '#ff6a8a'); this.sfx('warn'); } } }
      else if (k.type === 'cell') { p.ult = Math.min(100, p.ult + 35); this.pickups.splice(i, 1); this.sfx('pick'); this.text(p.cx, p.y - 6, '+ENERGIE', '#ffe38a'); }
      else if (k.type === 'item') {
        if (Input.jumpPressed) { this.giveItem(k.item); const g = k.group; this.pickups = this.pickups.filter(o => !(o.group === g)); this.fx(k.x, k.y, 16, '#fff', 2); break; }
      }
      else if (k.type === 'choice') {
        if (!Input.jumpPressed) continue;
        if (k.opt === 'repair') { this.heal(p, 2); this.toast = { title: 'Réparation express', desc: '+2 PV.', col: '#ff5cc8', t: 220 }; }
        else { p.armor = Math.min(p.armorMax, p.armor + 2); this.toast = { title: 'Surproduction', desc: '+2 armure.', col: '#37e0ff', t: 220 }; }
        this.sfx('pick'); const gg = k.group; this.pickups.splice(this.pickups.indexOf(k), 1);
        for (const o of this.pickups) if (o.group === gg && o.type === 'choice') { o.type = 'shop'; o.kind = o.opt; o.price = 8; o.group = null; }
        this.fx(k.x, k.y, 16, '#fff', 2); break;
      }
      else if (k.type === 'portal') { this.sfx('door'); this.newFloor(); return; }
    }
  }

  /* ---------- Ennemis ---------- */
  updateEnemies() {
    const p = this.p, ghost = p.buff.ghost > 0 && !this.decoy;
    const tgt = this.decoy ? { cx: this.decoy.x, cy: this.decoy.y, x: this.decoy.x - 5, y: this.decoy.y - 7, w: 10, h: 14 } : ghost ? { cx: 160 + Math.sin(this.frame / 70) * 110, cy: 110, x: 155 + Math.sin(this.frame / 70) * 110, y: 103, w: 10, h: 14 } : p;
    for (const e of this.enemies.slice()) {
      if (e.flash > 0) e.flash--;
      if (e.spawnT > 0) { e.spawnT--; continue; }
      if (e.burn > 0) { e.burn--; if (e.burn % 30 === 0) { this.hurtEnemy(e, .6, p); this.fx(e.cx, e.cy, 3, '#ff7a2a', 1); } if (e.hp <= 0) continue; }
      if (e.freeze > 0) { e.freeze--; e.vx *= .8; if (!e.fly) { e.vy = Math.min(e.vy + .3, 7); this.moveEnt(e); } continue; }
      if (e.stun > 0) { e.stun--; if (!e.fly) { e.vx *= .8; e.vy = Math.min(e.vy + .3, 7); this.moveEnt(e); } continue; }
      e.t++; e.face = tgt.cx > e.cx ? 1 : -1;
      if (e.boss) this.bossAI(e, tgt); else this.enemyAI(e, tgt);
      if (!e.fly) { e.vy = Math.min(e.vy + .3, 7); }
      e.hitWall = false; this.moveEnt(e);
      e.x = clamp(e.x, 2, W - e.w - 2);
      if (e.fly) { e.y = clamp(e.y, T + 2, (this.room.rows - 1) * T - e.h - 2); }
      // contact
      if (aabb(e, p) && !(e.st === 'windup')) this.hurtPlayer(this.floor >= 5 ? 2 : 1, e.cx);
    }
    if (this.decoy) { this.decoy.t--; if (this.decoy.t <= 0) { this.explode(this.decoy.x, this.decoy.y, 42, 3 * p.st.dmg, true, '#b6ff4a'); this.decoy = null; } }
  }
  walkToward(e, tgt, sp) {
    const dx = tgt.cx - e.cx; e.vx += (Math.sign(dx) * sp - e.vx) * .2;
    if (e.onGround && ((e.hitWall) || (tgt.y + tgt.h < e.y - 18 && Math.abs(dx) < 70 && rnd() < .03))) { e.vy = -5.2; }
  }
  enemyAI(e, tgt) {
    const dx = tgt.cx - e.cx, dy = tgt.cy - e.cy, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const f = this.floor, aggr = (1 + (f - 1) * .1) * .6 * this.diff.aggr;
    switch (e.type) {
      case 'genbu': {
        if (d > 80) this.walkToward(e, tgt, e.spd); else if (d < 45) this.walkToward(e, { cx: e.cx - dx * 2, y: 0, h: 0 }, e.spd); else e.vx *= .8;
        if (e.t % Math.floor(110 / aggr) === 0 && d < 200) this.ebul(e.cx, e.cy, ang, 1.5, { color: '#8dff5a' });
        if (e.t % 260 === 130) { const a = this.enemies.filter(o => o !== e && o.spawnT <= 0 && !o.shieldHp && !o.boss); if (a.length) { const o = pick(a); o.shieldHp = 1; this.fx(o.cx, o.cy, 10, '#37e0ff', 1.5); this.sfx('shield'); } else e.shieldHp = 1; }
        break;
      }
      case 'samebito': {
        if (e.st === 'aim') e.vx *= .5;
        else if (d < 90) this.walkToward(e, { cx: e.cx - dx * 2, y: 0, h: 0 }, e.spd * 1.5); else if (d > 190) this.walkToward(e, tgt, e.spd); else e.vx *= .8;
        if (e.st === 'aim') {
          e.aimA = ang;
          if (--e.aimT <= 0) {
            e.st = 0;
            if (e.fragShot) this.ebullets.push({ x: e.cx, y: e.cy, vx: Math.cos(ang) * 2.2 * this.diff.bul, vy: Math.sin(ang) * 2.2 * this.diff.bul, r: 3, dmg: 1, life: 55, grav: 0, bounce: 0, kind: 'frag', color: '#ffe38a' });
            else this.ebul(e.cx, e.cy, ang, 5.2, { r: 2.5, color: '#ff9a9a', life: 90 });
            this.sfx('shootH');
          }
        } else if (e.t % Math.floor(190 / aggr) === 60 && d < 270) { e.st = 'aim'; e.aimT = 55; e.fragShot = rnd() < .35; e.aimA = ang; this.sfx('warn'); }
        break;
      }
      case 'goryo': {
        if (d < 80) this.walkToward(e, { cx: e.cx - dx * 2, y: 0, h: 0 }, e.spd * 1.4); else if (d > 150) this.walkToward(e, tgt, e.spd); else e.vx *= .8;
        if (e.t % Math.floor(140 / aggr) === 0) { const T0 = clamp(d / 2.4, 30, 80), gr = .14, v = lobVel(dx, dy, T0, gr); this.ebullets.push({ x: e.cx, y: e.cy, vx: v.vx, vy: v.vy, r: 3, dmg: 1, life: 200, grav: gr, bounce: 0, kind: 'egrenade', explode: 22, color: '#ffb347' }); this.sfx('warn'); }
        break;
      }
      case 'goki': {
        if (e.st === 'windup') { e.vx *= .7; if (--e.wt <= 0) { e.st = 0; for (const o of [-.35, 0, .35]) this.ebul(e.cx, e.cy, Math.atan2(dy, dx) + o, 2.4, { life: 14, r: 4, color: '#ff7a2a', kind: 'flame' }); this.sfx('shootH'); e.cdn = 70; } break; }
        this.walkToward(e, tgt, e.spd * 1.7 * (1 + (f - 1) * .1));
        e.cdn = (e.cdn || 0) - 1;
        if (d < 40 && e.cdn <= 0 && Math.abs(dy) < 24) { e.st = 'windup'; e.wt = 18; }
        break;
      }
      case 'gaoro': {
        if (e.st === 'windup') { e.vx *= .6; if (--e.wt <= 0) { e.st = 'dash'; e.wt = 26; e.vx = Math.sign(dx) * 3.3 * aggr; this.sfx('shootH'); } break; }
        if (e.st === 'dash') { e.vx = Math.sign(e.vx || e.face) * 3.3 * aggr; if (--e.wt <= 0 || e.hitWall) { e.st = 0; e.cdn = 50; } break; }
        this.walkToward(e, tgt, e.spd); e.cdn = (e.cdn || 0) - 1;
        if (e.cdn <= 0 && d < 150 && e.onGround) { e.st = 'windup'; e.wt = 22; this.sfx('warn'); }
        break;
      }
      case 'gyuki': {
        const gx = tgt.cx + Math.sin(e.t / 50) * 70, gy = clamp(tgt.cy - 46 + Math.cos(e.t / 37) * 14, 24, 130);
        e.vx += (clamp(gx - e.cx, -1, 1) * e.spd - e.vx) * .08; e.vy += (clamp(gy - e.cy, -1, 1) * e.spd - e.vy) * .08;
        if (e.t % Math.floor(115 / aggr) === 0) for (const o of [-.22, 0, .22]) this.ebul(e.cx, e.cy, ang + o, 1.7, { color: '#c4ff6a' });
        break;
      }
      case 'shojo': {
        this.walkToward(e, tgt, e.spd);
        if (e.t % 170 === 100 && e.onGround) this.emines.push({ x: e.cx, y: e.y + e.h - 3, t: 0, r: 26, dmg: 1 });
        break;
      }
      case 'sojobo': {
        e.vx *= .8;
        if (e.st === 'windup') { if (--e.wt <= 0) { e.st = 0; this.fx(e.cx, e.cy, 12, '#5dff6a', 2); const sp = pick(this.room.spawnPts); e.x = sp[0]; e.y = sp[1]; this.fx(e.cx, e.cy, 12, '#5dff6a', 2); const a2 = Math.atan2(tgt.cy - e.cy, tgt.cx - e.cx); for (const o of [-.3, 0, .3]) this.ebul(e.cx, e.cy, a2 + o, 1.8, { color: '#27d3ff' }); this.sfx('shoot'); } break; }
        if (e.t % Math.floor(150 / aggr) === 0) { e.st = 'windup'; e.wt = 20; this.sfx('warn'); }
        break;
      }
      case 'senpoku': {
        const gx = tgt.cx + Math.sin(e.t / 70) * 110, gy = 40 + Math.sin(e.t / 55) * 12;
        e.vx += (clamp(gx - e.cx, -1, 1) * e.spd - e.vx) * .06; e.vy += (clamp(gy - e.cy, -1, 1) * e.spd - e.vy) * .08;
        if (e.t % Math.floor(210 / aggr) === 120) { this.hazards.push({ x: 0, y: clamp(tgt.cy - 4, 24, 150), w: W, h: 8, warn: 42, life: 14, dmg: 1, t: 0 }); this.sfx('warn'); }
        break;
      }
      case 'nezumi': {
        this.walkToward(e, tgt, e.spd * 1.2);
        if (e.onGround && e.t % 100 === 55 && d < 140) { e.vy = -4.4; e.vx = Math.sign(dx) * 2.3 * aggr; }
        break;
      }
      case 'koumori': {
        if (e.st === 'dive') { if (--e.wt <= 0 || e.hitWall) e.st = 0; }
        else {
          const gx = tgt.cx + Math.sin(e.t / 40) * 60, gy = clamp(tgt.cy - 62, 24, 110);
          e.vx += (clamp(gx - e.cx, -1, 1) * e.spd - e.vx) * .08; e.vy += (clamp(gy - e.cy, -1, 1) * e.spd - e.vy) * .08;
          if (e.t % 150 === 90) { e.st = 'dive'; e.wt = 36; e.vx = Math.cos(ang) * 2.7 * aggr; e.vy = Math.sin(ang) * 2.7 * aggr; this.sfx('warn'); }
        }
        break;
      }
      case 'tsuta': {
        e.vx = 0;
        if (e.t % Math.floor(125 / aggr) === 60 && d < 240) { for (let i = -1; i <= 1; i++) this.ebullets.push({ x: e.cx, y: e.cy - 4, vx: Math.sign(dx || 1) * clamp(Math.abs(dx) / 55, .7, 2.4) * (1 + i * .22), vy: -2.3, r: 3, dmg: 1, life: 170, grav: .1, bounce: 0, kind: 'spore', color: '#b6ff4a' }); this.sfx('shoot'); }
        break;
      }
      case 'sankai': {
        this.walkToward(e, tgt, e.spd);
        if (e.t % Math.floor(160 / aggr) === 80 && d < 220) { this.ebul(e.cx, e.cy, ang, 1.9, { bounce: 2, r: 3, color: '#cfc8ee', life: 300 }); this.sfx('shoot'); }
        break;
      }
    }
  }
  bossAI(e, tgt) {
    const ph = e.hp < e.maxhp * .5 ? 2 : 1, dx = tgt.cx - e.cx, dy = tgt.cy - e.cy, ang = Math.atan2(dy, dx), id = e.boss.id;
    e.bt++;
    const gap = Math.floor((id === 'goryo' ? 150 : 135) / (ph === 2 ? 1.35 : 1));
    if (id === 'sankai') {
      if (e.slam && e.onGround) { e.slam = 0; this.shake(7); this.sfx('boom'); for (const s of [-1, 1]) this.ebullets.push({ x: e.cx + s * 12, y: 160 - 5, vx: s * 2.3, vy: 0, r: 4, dmg: 1, life: 130, grav: 0, bounce: 0, kind: 'wave', color: '#cfc8ee', nowall: 0 }); }
      if (!e.slam) this.walkToward(e, tgt, e.spd * (ph === 2 ? 1.5 : 1)); else e.vx *= .95;
      if (e.bt % gap === gap - 1) {
        const k = e.pat = ((e.pat | 0) + 1) % 3;
        if (k === 0) { for (let i = -2; i <= 2; i++) this.ebul(e.cx, e.cy, ang + i * .22, 1.9, { bounce: 2, r: 3, color: '#cfc8ee', life: 320 }); this.sfx('shootH'); }
        else if (k === 1) { if (this.enemies.length < 4) for (let i = 0; i < 2; i++) { const sp = pick(this.room.spawnPts), g2 = new Enemy('gaoro', sp[0], sp[1], 1.1); g2.spawnT = 30; this.enemies.push(g2); } this.sfx('warn'); }
        else { e.vy = -6.2; e.slam = 1; e.onGround = false; }
      }
    } else if (id === 'senpoku') {
      const gx = tgt.cx + Math.sin(e.bt / 80) * 100, gy = 46 + Math.sin(e.bt / 45) * 14;
      e.vx += (clamp(gx - e.cx, -1, 1) * e.spd * (ph === 2 ? 1.4 : 1) - e.vx) * .06; e.vy += (clamp(gy - e.cy, -1, 1) * e.spd - e.vy) * .08;
      if (e.bt % gap === gap - 1) {
        const k = e.pat = ((e.pat | 0) + 1) % 3;
        if (k === 0) { const n = ph === 2 ? 3 : 2; for (let i = 0; i < n; i++) this.hazards.push({ x: 0, y: clamp(tgt.cy - 4 + (i - (n - 1) / 2) * 38 + rr(-6, 6), 24, 150), w: W, h: 8, warn: 52, life: 16, dmg: 1, t: 0 }); this.sfx('warn'); }
        else if (k === 1) { e.rain = ph === 2 ? 9 : 6; }
        else { if (this.enemies.length < 3) { const g2 = new Enemy('gyuki', e.cx, e.cy + 10, 1.2); g2.spawnT = 24; this.enemies.push(g2); } for (let i = -1; i <= 1; i++) this.ebul(e.cx, e.cy, ang + i * .25, 1.9, { color: '#c4ff6a' }); this.sfx('shoot'); }
      }
      if (e.rain > 0 && e.bt % 12 === 0) { e.rain--; this.ebullets.push({ x: rr(20, W - 20), y: 14, vx: 0, vy: 1.2, r: 3, dmg: 1, life: 200, grav: .05, bounce: 0, kind: 'bomb', explode: 20, color: '#ff7a5a' }); }
    } else if (id === 'genbu') {
      if (Math.abs(dx) > 95) this.walkToward(e, tgt, e.spd); else if (Math.abs(dx) < 50) this.walkToward(e, { cx: e.cx - dx * 2, y: 0, h: 0 }, e.spd); else e.vx *= .85;
      if (e.bt % 300 === 150 && !(e.shieldHp > 0)) { e.shieldHp = 3; this.fx(e.cx, e.cy, 12, '#37e0ff', 2); this.sfx('shield'); }
      if (e.bt % gap === gap - 1) {
        const k = e.pat = ((e.pat | 0) + 1) % 3;
        if (k === 0) { const n = ph === 2 ? 7 : 5; for (let i = 0; i < n; i++) this.ebul(e.cx, e.cy, ang + (i - (n - 1) / 2) * .2, 1.8, { color: '#8dff5a', r: 3 }); this.sfx('shootH'); }
        else if (k === 1) { if (this.enemies.length < 4) for (let i = 0; i < 2; i++) { const sp = pick(this.room.spawnPts), g2 = new Enemy(ph === 2 ? 'koumori' : 'nezumi', sp[0], ph === 2 ? 60 : sp[1], 1.1); g2.spawnT = 30; g2.shieldHp = 1; this.enemies.push(g2); } this.sfx('warn'); }
        else { const n = ph === 2 ? 5 : 3; for (let i = 0; i < n; i++) this.hazards.push({ x: clamp(tgt.cx - 7 + (i - (n - 1) / 2) * 48 + rr(-8, 8), 8, W - 22), y: 0, w: 14, h: H, warn: 52, life: 18, dmg: 1, t: 0, col: '#8dff5a' }); this.sfx('warn'); }
      }
    } else if (id === 'gaoro') {
      if (e.slam && e.onGround) { e.slam = 0; this.shake(6); this.sfx('boom'); for (const s of [-1, 1]) this.ebullets.push({ x: e.cx + s * 12, y: 160 - 5, vx: s * 2.6, vy: 0, r: 4, dmg: 1, life: 120, grav: 0, bounce: 0, kind: 'wave', color: '#ff9a4a' }); }
      if (e.dashT > 0) { e.vx = e.dashDir * 4.2; if (--e.dashT <= 0 || e.hitWall) { e.dashT = 0; e.vx = 0; if (e.dashN > 0) { e.dashN--; e.wait = 16; } } }
      else if (e.wait > 0) { e.vx *= .7; if (--e.wait <= 0 && e.dashN >= 0 && e.dashing) { e.dashDir = Math.sign(dx) || 1; e.dashT = 26; this.sfx('shootH'); if (e.dashN <= 0) e.dashing = 0; } }
      else if (!e.slam) this.walkToward(e, tgt, e.spd);
      if (e.bt % gap === gap - 1) {
        const k = e.pat = ((e.pat | 0) + 1) % 3;
        if (k === 0) { e.dashN = ph === 2 ? 2 : 1; e.dashing = 1; e.wait = 24; this.sfx('warn'); }
        else if (k === 1) { e.vy = -6.4; e.vx = Math.sign(dx) * 1.4; e.slam = 1; e.onGround = false; }
        else { for (let i = -1; i <= 1; i++) this.ebullets.push({ x: e.cx, y: e.cy, vx: Math.cos(ang) * 2.0 + i * .5, vy: -2.4 + Math.sin(ang), r: 3, dmg: 1, life: 200, grav: .12, bounce: 1, kind: 'spore', color: '#ff9a4a' }); if (this.enemies.length < 4) { const sp = pick(this.room.spawnPts), g2 = new Enemy('tsuta', sp[0], sp[1] - 4, 1.1); g2.spawnT = 30; this.enemies.push(g2); } this.sfx('warn'); }
      }
    } else if (id === 'goki') {
      if (e.flame > 0) { e.vx *= .9; if (e.bt % 3 === 0) { this.ebul(e.cx, e.cy, ang + rr(-.16, .16), 2.6, { life: 22, r: 4, color: '#ff7a2a', kind: 'flame' }); } e.flame--; }
      else if (e.dashT > 0) { e.vx = e.dashDir * 3.6; if (e.bt % 6 === 0) this.emines.push({ x: e.cx, y: e.y + e.h - 3, t: 0, r: 22, dmg: 1 }); if (--e.dashT <= 0 || e.hitWall) { e.dashT = 0; e.vx = 0; } }
      else this.walkToward(e, tgt, e.spd * (ph === 2 ? 1.4 : 1));
      if (e.rain > 0 && e.bt % 10 === 0) { e.rain--; this.ebullets.push({ x: rr(20, W - 20), y: 14, vx: 0, vy: 1.2, r: 3, dmg: 1, life: 200, grav: .05, bounce: 0, kind: 'bomb', explode: 20, color: '#ff7a2a' }); }
      if (e.bt % gap === gap - 1) {
        const k = e.pat = ((e.pat | 0) + 1) % 3;
        if (k === 0) { e.flame = ph === 2 ? 70 : 48; this.sfx('warn'); }
        else if (k === 1) { e.rain = ph === 2 ? 11 : 7; this.sfx('warn'); }
        else { e.dashDir = Math.sign(dx) || 1; e.dashT = 34; this.sfx('shootH'); }
      }
    } else { // goryo
      if (Math.abs(dx) > 70) this.walkToward(e, tgt, e.spd); else e.vx *= .85;
      if (e.bt % gap === gap - 1) {
        const k = e.pat = ((e.pat | 0) + 1) % 3;
        if (k === 0) { const n = ph === 2 ? 5 : 3; for (let i = 0; i < n; i++) { const tx = tgt.cx + (i - (n - 1) / 2) * 44, T0 = clamp(Math.abs(tx - e.cx) / 2.2, 34, 80), gr = .14, v = lobVel(tx - e.cx, tgt.cy - e.cy, T0, gr); this.ebullets.push({ x: e.cx, y: e.cy, vx: v.vx, vy: v.vy, r: 3, dmg: 1, life: 220, grav: gr, bounce: 0, kind: 'egrenade', explode: 22, color: '#ffb347' }); } this.sfx('shootH'); }
        else if (k === 1) { const n = ph === 2 ? 5 : 3; for (let i = 0; i < n; i++) this.hazards.push({ x: clamp(tgt.cx - 7 + (i - (n - 1) / 2) * 52 + rr(-8, 8), 8, W - 22), y: 0, w: 14, h: H, warn: 56, life: 18, dmg: 1, t: 0, col: '#ff4a6a' }); this.sfx('warn'); }
        else { if (this.enemies.length < 3) for (let i = 0; i < 2; i++) { const sp = pick(this.room.air), g2 = new Enemy(ph === 2 ? 'gyuki' : 'goki', sp[0], sp[1], 1.1); g2.spawnT = 30; this.enemies.push(g2); } for (let i = -1; i <= 1; i++) this.ebul(e.cx, e.cy, ang + i * .2, 2, { color: '#c4ff6a' }); this.sfx('warn'); }
      }
    }
  }

  /* ---------- Projectiles ---------- */
  updateBullets() {
    const p = this.p;
    // balles du joueur
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life--;
      if (b.homing) { const e = this.nearestEnemy(b.x, b.y, 150); if (e && !b.grav) { const sp = Math.hypot(b.vx, b.vy), a0 = Math.atan2(b.vy, b.vx), a1 = Math.atan2(e.cy - b.y, e.cx - b.x); let da = a1 - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const a = a0 + clamp(da, -b.homing, b.homing); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; } }
      if (b.grav) b.vy += b.grav;
      const steps = Math.ceil(Math.hypot(b.vx, b.vy) / 3); let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        b.x += b.vx / steps; b.y += b.vy / steps;
        if (b.x < -4 || b.x > W + 4 || b.y < -4 || b.y > this.room.rows * T + 4) { dead = true; break; }
        if (this.solidPt(b.x, b.y)) {
          this.breakWall(Math.floor(b.x / T), Math.floor(b.y / T));
          if (b.kind === 'minebomb') { this.mines.push({ x: b.x, y: b.y - 2, t: 0, dmg: b.dmg, r: 28, friendly: true }); dead = true; break; }
          if (b.kind === 'grenade') { this.explode(b.x, b.y, b.explode, b.dmg, true, '#ffd23a'); dead = true; break; }
          if (b.bounce > 0) {
            b.bounce--; const px = b.x - b.vx / steps, py = b.y - b.vy / steps;
            if (!this.solidPt(b.x, py)) b.vx *= -1; else if (!this.solidPt(px, b.y)) b.vy *= -1; else { b.vx *= -1; b.vy *= -1; }
            b.x = px; b.y = py; continue;
          }
          if (b.explode) this.explode(b.x, b.y, b.explode, b.dmg * .5, true);
          this.fx(b.x, b.y, 3, b.color, 1); dead = true; break;
        }
        if (b.kind === 'minebomb') continue;
        for (const e of this.enemies) {
          if (e.spawnT > 0 || e.hp <= 0 || b.hit.has(e.id)) continue;
          if (b.x > e.x - b.r && b.x < e.x + e.w + b.r && b.y > e.y - b.r && b.y < e.y + e.h + b.r) {
            b.hit.add(e.id);
            if (b.kind === 'grenade') { this.explode(b.x, b.y, b.explode, b.dmg, true, '#ffd23a'); dead = true; break; }
            const dmg = b.dmg * (b.crit ? 2 : 1);
            this.hurtEnemy(e, dmg, p, { burn: b.burn, freeze: b.freeze, crit: b.crit });
            if (b.crit) this.text(e.cx, e.y - 4, 'CRIT', '#ffe38a');
            if (b.kb) { e.vx += Math.sign(b.vx) * b.kb; if (!e.fly) e.vy -= .5; }
            this.fx(b.x, b.y, 3, b.color, 1.5);
            if (b.explode && b.kind !== 'flame') this.explode(b.x, b.y, b.explode, b.dmg * .5, true);
            if (b.pierce > 0) { b.pierce--; } else { dead = true; break; }
          }
        }
      }
      if (b.life <= 0 && !dead) { if (b.kind === 'grenade') this.explode(b.x, b.y, b.explode, b.dmg, true, '#ffd23a'); dead = true; }
      if (dead) this.bullets.splice(i, 1);
    }
    // balles ennemies
    for (let i = this.ebullets.length - 1; i >= 0; i--) {
      const b = this.ebullets[i]; b.life--; if (b.grav) b.vy += b.grav;
      const steps = Math.ceil(Math.hypot(b.vx, b.vy) / 3); let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        b.x += b.vx / steps; b.y += b.vy / steps;
        if (b.x < -6 || b.x > W + 6 || b.y < -6 || b.y > this.room.rows * T + 6) { dead = true; break; }
        if (b.kind !== 'wave' && this.solidPt(b.x, b.y)) {
          if (b.bounce > 0) { b.bounce--; const px = b.x - b.vx / steps, py = b.y - b.vy / steps; if (!this.solidPt(b.x, py)) b.vx *= -1; else if (!this.solidPt(px, b.y)) b.vy *= -1; else { b.vx *= -1; b.vy *= -1; } b.x = px; b.y = py; continue; }
          if (b.explode) this.explode(b.x, b.y, b.explode, b.dmg, false, '#ffb347');
          dead = true; break;
        }
        if (this.decoy && Math.hypot(b.x - this.decoy.x, b.y - this.decoy.y) < 10) { dead = true; this.fx(b.x, b.y, 4, '#b6ff4a', 1); break; }
        if (b.x > p.x - b.r && b.x < p.x + p.w + b.r && b.y > p.y - b.r && b.y < p.y + p.h + b.r && p.inv <= 0) {
          if (b.explode) this.explode(b.x, b.y, b.explode, b.dmg, false, '#ffb347'); else this.hurtPlayer(b.dmg, b.x);
          dead = true; break;
        }
      }
      if (b.life <= 0 && !dead) { if (b.explode) this.explode(b.x, b.y, b.explode, b.dmg, false, '#ffb347'); if (b.kind === 'frag') this.fragBurst(b); dead = true; }
      if (dead) this.ebullets.splice(i, 1);
    }
  }

  fragBurst(b) { this.sfx('boom'); this.fx(b.x, b.y, 10, '#ffe38a', 2); const a0 = rr(0, TAU); for (let k = 0; k < 6; k++) this.ebul(b.x, b.y, a0 + k * TAU / 6, 2.3, { r: 2, color: '#ffe38a', life: 60 }); }

  updateMisc() {
    const p = this.p;
    // mines alliées
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i]; m.t++;
      if (m.t < 30) continue;
      for (const e of this.enemies) if (e.spawnT <= 0 && e.hp > 0 && Math.abs(e.cx - m.x) < 12 + e.w / 2 && Math.abs(e.cy - m.y) < 14) { this.explode(m.x, m.y, m.r, m.dmg, true, '#b06bff'); this.mines.splice(i, 1); break; }
    }
    // mines ennemies
    for (let i = this.emines.length - 1; i >= 0; i--) {
      const m = this.emines[i]; m.t++;
      if (m.t > 700) { this.emines.splice(i, 1); continue; }
      if (m.t > 40 && Math.abs(p.cx - m.x) < 12 && Math.abs(p.cy - m.y) < 14) { this.explode(m.x, m.y, m.r, m.dmg, false, '#ff7a2a'); this.emines.splice(i, 1); }
    }
    // frappes de drone
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i]; s.t++;
      if (s.t < 18) s.x += s.dir * 6;
      if (s.t === 18 && !s.done) {
        s.done = 1; this.shake(4); this.sfx('boom');
        for (const e of this.enemies) if (e.spawnT <= 0 && e.hp > 0 && e.y < s.y + 6 && e.y + e.h > s.y - 6) this.hurtEnemy(e, s.dmg, p);
        this.ebullets = this.ebullets.filter(b => Math.abs(b.y - s.y) > 7);
        for (let x = 0; x < W; x += 10) this.fx(x, s.y, 1, '#2ad8c0', 1.5);
      }
      if (s.t > 28) this.strikes.splice(i, 1);
    }
    // dangers verticaux/horizontaux
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.t++;
      if (h.t === h.warn && h.t > 1) this.shake(3);
      if (h.t >= h.warn && h.t < h.warn + h.life && aabb(h, p)) this.hurtPlayer(h.dmg, p.cx - 1);
      if (h.t > h.warn + h.life) this.hazards.splice(i, 1);
    }
    // nova
    for (let i = this.novas.length - 1; i >= 0; i--) {
      const n = this.novas[i]; n.r += n.spd || 5;
      if (!n.vis) {
        for (const e of this.enemies) if (e.spawnT <= 0 && e.hp > 0 && !n.hit.has(e.id) && Math.hypot(e.cx - n.x, e.cy - n.y) <= n.r) { n.hit.add(e.id); this.hurtEnemy(e, n.dmg, p, { burn: n.burn }); if (n.kb) { e.vx += Math.sign(e.cx - n.x) * n.kb; e.vy -= 2; } }
        if (n.clear) this.ebullets = this.ebullets.filter(b => Math.hypot(b.x - n.x, b.y - n.y) > n.r);
      }
      if (n.r >= n.max) this.novas.splice(i, 1);
    }
    if (p.shake) p.shake = 0;
  }

  updateFx() {
    for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.x += q.vx; q.y += q.vy; q.vy += q.grav || 0; q.vx *= .97; if (--q.life <= 0) this.parts.splice(i, 1); }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.y -= .35; if (--t.life <= 0) this.texts.splice(i, 1); }
    if (this.shakeT > 0) this.shakeT *= .86; if (this.shakeT < .3) this.shakeT = 0;
    if (this.flashT > 0) this.flashT--;
  }
}
