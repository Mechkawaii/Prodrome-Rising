/* ===== RENDER : décors néon, entités, effets, HUD ===== */
const glowCache = {};
function getGlow(col) {
  if (glowCache[col]) return glowCache[col];
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  const [r, gg, b] = hex2rgb(col);
  g.addColorStop(0, `rgba(${r},${gg},${b},0.9)`); g.addColorStop(.35, `rgba(${r},${gg},${b},0.35)`); g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return glowCache[col] = c;
}
function drawGlow(ctx, x, y, r, col, a) {
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(getGlow(col), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function iconS(ctx, name, x, y, col, s) {
  const p = ICONS[name]; ctx.fillStyle = col;
  for (let j = 0; j < p.length; j++) for (let i = 0; i < p[j].length; i++) if (p[j][i] === 'x') ctx.fillRect(x + i * s, y + j * s, s, s);
}
function blit(ctx, spr, x, y, flip, white, alpha, sw, sh) {
  const c = white ? spr.white() : spr.canvas(); if (!c) return;
  const w = sw || spr.w, h = sh || spr.h;
  if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
  if (flip) { ctx.save(); ctx.translate(Math.round(x) + w, Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0, w, h); ctx.restore(); }
  else ctx.drawImage(c, Math.round(x), Math.round(y), w, h);
  ctx.globalAlpha = 1;
}
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function mix3(stops, t) {
  const n = stops.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i;
  const a = hex2rgb(stops[i]), b = hex2rgb(stops[i + 1]);
  return rgb2hex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

/* ---------- Décors des secteurs spéciaux ---------- */
function backdrop(x, B, R, near) {
  const col = near ? B.near : B.far, dk = shade(col, -.5), lt = shade(col, .35);
  if (B.kind === 'tunnel') {
    if (!near) {
      for (let i = -1; i < 6; i++) { const ax = i * 66 + (R() * 8 | 0); x.fillStyle = col; x.fillRect(ax, 30, 12, 130); x.fillRect(ax + 54, 30, 12, 130); x.beginPath(); x.arc(ax + 33, 62, 33, Math.PI, 0); x.fill(); x.fillStyle = dk; x.beginPath(); x.arc(ax + 33, 66, 22, Math.PI, 0); x.fillRect(ax + 11, 66, 44, 94); x.fill(); x.fillStyle = lt; x.globalAlpha = .4; for (let k = 0; k < 5; k++) x.fillRect(ax + 2, 40 + k * 22, 8, 1); x.globalAlpha = 1; }
      x.fillStyle = B.neon; x.globalAlpha = .25; x.fillRect(0, 150, W, 1); x.globalAlpha = 1;
    } else {
      for (let k = 0; k < 4; k++) { const px = 20 + k * 80 + (R() * 30 | 0); x.fillStyle = col; x.fillRect(px, 0, 7, 160); x.fillStyle = lt; x.fillRect(px + 1, 0, 1, 160); x.fillStyle = dk; for (let q = 20; q < 150; q += 38) x.fillRect(px - 1, q, 9, 3); }
      x.fillStyle = col; x.fillRect(0, 22, W, 6); x.fillStyle = lt; x.fillRect(0, 23, W, 1);
      for (let k = 0; k < 6; k++) { const lx = 30 + k * 52 + (R() * 12 | 0); x.fillStyle = '#0a0f14'; x.fillRect(lx, 28, 1, 8); x.fillStyle = B.win; x.fillRect(lx - 1, 36, 3, 2); x.globalAlpha = .08; x.beginPath(); x.moveTo(lx, 38); x.lineTo(lx - 22, 158); x.lineTo(lx + 22, 158); x.fill(); x.globalAlpha = 1; }
      x.fillStyle = B.neon; x.globalAlpha = .7; for (let k = 0; k < 7; k++) x.fillRect(R() * W | 0, 30 + R() * 110 | 0, 1, 3); x.globalAlpha = 1;
      x.fillStyle = 'rgba(79,255,208,.07)'; x.fillRect(0, 148, W, 12);
    }
  } else if (B.kind === 'jungle') {
    if (!near) {
      for (let k = 0; k < 8; k++) { const tx = k * 42 + (R() * 14 | 0), tw = 8 + R() * 6 | 0; x.fillStyle = col; x.fillRect(tx, 20, tw, 140); x.fillStyle = dk; x.fillRect(tx + tw - 3, 20, 3, 140); x.fillStyle = lt; x.globalAlpha = .5; x.fillRect(tx, 20, 1, 140); x.globalAlpha = 1; for (let q = 0; q < 4; q++) { x.fillStyle = col; x.beginPath(); x.arc(tx + tw / 2 + (R() - .5) * 30, 14 + R() * 30, 12 + R() * 9, 0, TAU); x.fill(); } }
    } else {
      x.fillStyle = col; for (let q = 0; q < 12; q++) { x.beginPath(); x.arc(R() * W, R() * 20, 12 + R() * 14, 0, TAU); x.fill(); }
      for (let k = 0; k < 14; k++) { const vx = R() * W | 0, vl = 20 + R() * 70 | 0; x.fillStyle = dk; x.fillRect(vx, 0, 1, vl); x.fillStyle = shade(B.neon, -.45); for (let q = 6; q < vl; q += 9) { x.fillRect(vx - 2, q, 2, 3); x.fillRect(vx + 1, q + 3, 2, 3); } }
      for (let k = 0; k < 10; k++) { const bx = R() * W | 0, bh = 6 + R() * 16 | 0; x.fillStyle = col; x.beginPath(); x.moveTo(bx - 8, 160); x.lineTo(bx, 160 - bh); x.lineTo(bx + 8, 160); x.fill(); x.fillStyle = lt; x.globalAlpha = .4; x.fillRect(bx, 160 - bh, 1, bh); x.globalAlpha = 1; }
      x.fillStyle = B.neon; for (let k = 0; k < 16; k++) { x.globalAlpha = .3 + R() * .6; x.fillRect(R() * W | 0, 30 + R() * 110 | 0, 1, 1); } x.globalAlpha = 1;
      x.fillStyle = 'rgba(182,255,74,.06)'; x.fillRect(0, 130, W, 30);
    }
  } else { // citadelle
    if (!near) {
      for (let k = 0; k < 9; k++) { const bx = k * 38 + (R() * 8 | 0), bh = 70 + R() * 70 | 0; x.fillStyle = col; x.fillRect(bx, 160 - bh, 26, bh); x.fillStyle = dk; x.fillRect(bx + 20, 160 - bh, 6, bh); x.fillStyle = B.neon; x.globalAlpha = .4; for (let q = 0; q < 5; q++) x.fillRect(bx + 3, 160 - bh + 8 + q * 14, 14, 1); x.globalAlpha = 1; x.fillStyle = lt; x.fillRect(bx + 12, 160 - bh - 8, 2, 8); }
    } else {
      x.fillStyle = col; x.fillRect(0, 18, W, 8); x.fillStyle = lt; x.fillRect(0, 19, W, 1); x.fillStyle = B.neon; x.globalAlpha = .6; x.fillRect(0, 24, W, 1); x.globalAlpha = 1;
      for (let k = 0; k < 5; k++) { const px = 12 + k * 66 + (R() * 20 | 0); x.fillStyle = col; x.fillRect(px, 26, 9, 134); x.fillStyle = dk; x.fillRect(px + 6, 26, 3, 134); x.fillStyle = B.neon; x.globalAlpha = .55; x.fillRect(px + 3, 40, 1, 100); x.globalAlpha = 1; }
      x.fillStyle = B.neon; for (let k = 0; k < 10; k++) { x.globalAlpha = .4; x.fillRect(R() * W | 0, 40 + R() * 100 | 0, 2, 1); } x.globalAlpha = 1;
    }
  }
}

/* ---------- Décor statique (mis en cache par salle) ---------- */
function buildStatic(g) {
  const rows = g.room.rows || ROWS, cv = document.createElement('canvas'); cv.width = W; cv.height = rows * T;
  const x = cv.getContext('2d'), B = g.biome, R = lcg(g.floor * 977 + g.room.i * 131 + 7);
  const bands = 24;
  for (let i = 0; i < bands; i++) { x.fillStyle = mix3(B.sky, i / (bands - 1)); x.fillRect(0, Math.floor(i * H / bands), W, Math.ceil(H / bands) + 1); }
  // étoiles
  for (let i = 0; i < 70; i++) { const sx = R() * W | 0, sy = R() * 90 | 0, a = R(); if (a < B.stars + .1) { x.fillStyle = a < .1 ? '#ffffff' : 'rgba(255,255,255,.55)'; x.fillRect(sx, sy, 1, 1); } }
  // lune d'Erret
  if (B.moon) {
  const mx = 40 + R() * 240 | 0, my = 28 + R() * 20 | 0;
  x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(mx, my, 22, 0, TAU); x.fill();
  x.fillStyle = B.moon; x.beginPath(); x.arc(mx, my, 12, 0, TAU); x.fill();
  x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.arc(mx + 4, my + 2, 9, 0, TAU); x.fill();
  }
  if (B.fleet) { // flotte Gasu en orbite
    for (let k = 0; k < 3; k++) { const fx = 30 + R() * 260 | 0, fy = 20 + R() * 60 | 0, w = 24 + R() * 30 | 0; x.fillStyle = '#06130c'; x.fillRect(fx, fy, w, 5); x.fillRect(fx + 4, fy - 3, w - 8, 3); x.fillStyle = '#5dff6a'; for (let q = 0; q < w; q += 5) x.fillRect(fx + q + 1, fy + 2, 1, 1); }
    x.fillStyle = 'rgba(93,255,106,.07)'; for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(R() * W, 40 + R() * 80, 28 + R() * 30, 0, TAU); x.fill(); }
  }
  // skyline en ruines (lointain, proche)
  const city = (col, minH, maxH, winP, lit, nearL) => {
    let cx0 = -6;
    const dk = shade(col, -.55);
    while (cx0 < W) {
      const bw = 14 + R() * 24 | 0, bh = minH + R() * (maxH - minH) | 0, top = 160 - bh;
      let d = R() * 8; const tops = [];
      for (let i = 0; i < bw; i++) { d += (R() - .5) * 3.2; if (R() < .06) d += 6 + R() * 8; d = clamp(d, 0, bh * .45); tops.push(d | 0); }
      x.fillStyle = col;
      for (let i = 0; i < bw; i++) x.fillRect(cx0 + i, top + tops[i], 1, bh - tops[i]);
      // brèches : pans de mur arrachés
      for (let k = 0; k < (nearL ? 2 : 1); k++) if (R() < .7) { const hx = cx0 + 2 + R() * Math.max(1, bw - 10) | 0, hy = top + 8 + R() * Math.max(1, bh - 30) | 0, hw = 5 + R() * 6 | 0, hh = 6 + R() * 8 | 0; x.fillStyle = dk; x.fillRect(hx, hy, hw, hh); x.fillStyle = col; x.fillRect(hx, hy + hh - 1, hw, 1); }
      // fenêtres
      for (let wy = top + 12; wy < 154; wy += 6) for (let wx = cx0 + 3; wx < cx0 + bw - 3; wx += 5) {
        const ti = top + tops[Math.min(bw - 1, wx - cx0)]; if (wy < ti + 4) continue;
        if (R() < winP) { x.fillStyle = lit; x.globalAlpha = .5; x.fillRect(wx, wy, 2, 2); x.globalAlpha = 1; }
        else if (R() < .35) { x.fillStyle = dk; x.fillRect(wx, wy, 2, 3); }
      }
      // armatures tordues, antennes
      x.fillStyle = dk;
      for (let k = 0; k < 3; k++) if (R() < .6) { const rx = cx0 + 1 + (R() * (bw - 2) | 0), ry = top + tops[rx - cx0], rl = 3 + R() * 7 | 0; x.fillRect(rx, ry - rl, 1, rl); if (R() < .5) x.fillRect(rx + 1, ry - rl, 2, 1); }
      // dalle effondrée en biais
      if (R() < .35) { const sx = cx0 + bw - 2, sy = top + tops[bw - 1]; x.fillStyle = col; for (let i = 0; i < 12; i++) x.fillRect(sx + i, sy + i * .6, 2, 3); }
      // enseigne néon brisée
      if (nearL && R() < .3) { x.fillStyle = B.neon; x.globalAlpha = .6; const nx = cx0 + 2 + R() * 6 | 0, ny = top + tops[nx - cx0] + 14 + R() * 20 | 0; x.fillRect(nx, ny, 6, 1); x.fillRect(nx, ny, 1, 4); x.fillRect(nx + 3, ny + 2, 3, 1); x.globalAlpha = 1; }
      cx0 += bw + (R() * 3 | 0) - 2;
    }
  };
  if (B.kind) backdrop(x, B, R, 0); else city(B.far, 40, 100, .06, B.win, false);
  // fumée et brume
  for (let k = 0; k < 4; k++) { const sx = 20 + R() * 280 | 0; for (let q = 0; q < 14; q++) { x.fillStyle = 'rgba(30,24,34,' + (0.1 - q * .005) + ')'; x.beginPath(); x.arc(sx + Math.sin(q / 2 + k) * 6, 110 - q * 7, 6 + q * 1.4, 0, TAU); x.fill(); } }
  if (B.kind) backdrop(x, B, R, 1); else city(B.near, 24, 70, .12, B.win, true);
  // brume au sol
  { const gr = x.createLinearGradient(0, 120, 0, 160); gr.addColorStop(0, 'rgba(120,100,130,0)'); gr.addColorStop(1, 'rgba(120,100,130,.16)'); x.fillStyle = gr; x.fillRect(0, 120, W, 40); }
  // feux dans les décombres
  if (B.fire) for (let k = 0; k < 3; k++) { const fx = 24 + R() * 270 | 0; x.fillStyle = 'rgba(255,120,40,.12)'; x.beginPath(); x.arc(fx, 156, 16, 0, TAU); x.fill(); x.fillStyle = '#ff9a2a'; x.fillRect(fx - 2, 156, 4, 2); x.fillStyle = '#ffd23a'; x.fillRect(fx - 1, 154, 2, 3); }
  // tas de gravats au premier plan
  for (let k = 0; k < 12; k++) { const rx = R() * W | 0, rw = 10 + R() * 22 | 0, rh = 4 + R() * 9 | 0; for (let i = 0; i < rw; i++) { const hh = Math.round(rh * (1 - Math.abs(i / rw - .5) * 2) + R() * 1.5); x.fillStyle = R() < .15 ? shade(B.tile2, .1) : shade(B.near, .12); x.fillRect(rx + i, 160 - hh, 1, hh); } }
  // voiture calcinée
  if (R() < .6) { const vx = 30 + R() * 250 | 0; x.fillStyle = '#0d0910'; x.fillRect(vx, 152, 22, 5); x.fillRect(vx + 5, 148, 12, 4); x.fillStyle = B.win; x.globalAlpha = .25; x.fillRect(vx + 7, 149, 3, 2); x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(vx + 3, 156, 4, 3); x.fillRect(vx + 15, 156, 4, 3); }
  // voile de contraste
  x.fillStyle = 'rgba(8,4,18,.28)'; x.fillRect(0, 0, W, H);
  if (rows > ROWS) x.drawImage(cv, 0, 0, W, H, 0, H, W, H);
  // tuiles
  const t = g.room.tiles;
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
    const v = t[r * COLS + c], px = c * T, py = r * T;
    if (v === 1 || v === 2 || v === 5) {
      x.fillStyle = v === 2 ? shade(B.tile, -.25) : B.tile; x.fillRect(px, py, T, T);
      x.fillStyle = B.tile2; x.fillRect(px, py + 7, T, 1); x.fillRect(px + ((r % 2) ? 4 : 11), py, 1, 8); x.fillRect(px + ((r % 2) ? 11 : 4), py + 8, 1, 8);
      if (R() < .5) { x.fillStyle = shade(B.tile, -.4); let cx_ = px + 2 + (R() * 11 | 0), cy_ = py + (R() * 4 | 0); for (let q = 0; q < 8; q++) { x.fillRect(cx_, cy_, 1, 1); cx_ += R() < .5 ? 1 : 0; cy_ += 1; if (cy_ >= py + T) break; } }
      if (R() < .12) { x.fillStyle = '#8a4a2a'; x.fillRect(px + 3 + (R() * 8 | 0), py + (R() * 10 | 0), 1, 5); }
      const above = r > 0 ? t[(r - 1) * COLS + c] : 2;
      if (above !== 1 && above !== 2) { x.fillStyle = shade(B.tile2, .45); x.fillRect(px, py, T, 1); x.fillStyle = B.neon; x.globalAlpha = .3; x.fillRect(px, py + 1, T, 1); x.globalAlpha = .12; x.fillRect(px, py - 2, T, 2); x.globalAlpha = 1; }
      const left = c > 0 ? t[r * COLS + c - 1] : 2, right = c < COLS - 1 ? t[r * COLS + c + 1] : 2;
      if (v === 1) { x.fillStyle = B.neon; x.globalAlpha = .5; if (left === 0 || left === 3) x.fillRect(px, py, 1, T); if (right === 0 || right === 3) x.fillRect(px + T - 1, py, 1, T); x.globalAlpha = 1; }
      if (v === 5) { x.fillStyle = shade(B.tile, .55); let cx_ = px + 3, cy_ = py; for (let q = 0; q < 16; q++) { x.fillRect(cx_, cy_, 1, 1); cx_ += (q % 3 === 0) ? (R() < .5 ? -1 : 1) : 0; cy_ += 1; if (cy_ >= py + T) break; } x.fillStyle = shade(B.tile, -.5); x.fillRect(px + 8, py + 2, 1, 6); x.fillRect(px + 9, py + 7, 3, 1); }
      if (v === 2 && r === rows - 1) { x.fillStyle = B.neon; x.globalAlpha = .12; x.fillRect(px, py + 4, T, 1); x.globalAlpha = 1; }
    } else if (v === 3) {
      x.fillStyle = B.tile2; x.fillRect(px, py, T, 4); x.fillStyle = B.tile; x.fillRect(px, py + 3, T, 1);
      x.fillStyle = B.neon; x.fillRect(px, py, T, 1); x.globalAlpha = .25; x.fillRect(px, py - 2, T, 2); x.globalAlpha = 1;
      if (c % 2 === 0) { x.fillStyle = shade(B.tile2, .3); x.fillRect(px + 2, py + 1, 2, 2); }
    }
  }
  return cv;
}

/* ---------- Rendu principal ---------- */
function renderGame(ctx, g, big) {
  const p = g.p, B = g.biome;
  if (g.staticDirty || !g.staticCv) { g.staticCv = buildStatic(g); g.staticDirty = false; }
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (g.shakeT > 0) ctx.translate(Math.round(rr(-1, 1) * g.shakeT * Opts.shake), Math.round(rr(-1, 1) * g.shakeT * Opts.shake));
  const camY = Math.round(g.camY || 0); ctx.translate(0, -camY);
  ctx.drawImage(g.staticCv, 0, 0);
  const fr = g.frame, room = g.room;

  // Génématrice dans la salle de soin
  if (room.type === 'heal') {
    const gx = 150, gy = 110, pulse = .5 + .5 * Math.sin(fr / 14);
    ctx.fillStyle = '#0d0818'; ctx.fillRect(gx, gy, 20, 48); ctx.fillStyle = '#1b1130'; ctx.fillRect(gx + 2, gy + 2, 16, 44);
    ctx.fillStyle = B.neon; ctx.fillRect(gx, gy, 20, 1); ctx.fillRect(gx, gy, 1, 48); ctx.fillRect(gx + 19, gy, 1, 48);
    ctx.fillStyle = '#ff5cc8'; ctx.globalAlpha = .5 + pulse * .5; ctx.fillRect(gx + 5, gy + 10, 10, 3); ctx.fillRect(gx + 5, gy + 18, 10, 3); ctx.fillRect(gx + 5, gy + 26, 10, 3); ctx.globalAlpha = 1;
    drawGlow(ctx, gx + 10, gy + 20, 26, '#ff5cc8', .25 + pulse * .2);
  }
  if (room.type === 'shop') {
    const pulse = .6 + .4 * Math.sin(fr / 12);
    ctx.fillStyle = '#ffe38a'; ctx.globalAlpha = .5; ctx.fillRect(110, 20, 1, 12); ctx.fillRect(208, 20, 1, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = '#12081f'; ctx.fillRect(100, 30, 120, 26); ctx.fillStyle = '#ffe38a'; ctx.globalAlpha = .6 + pulse * .4; ctx.fillRect(100, 30, 120, 1); ctx.fillRect(100, 55, 120, 1); ctx.fillRect(100, 30, 1, 26); ctx.fillRect(219, 30, 1, 26); ctx.globalAlpha = 1;
    drawGlow(ctx, 160, 43, 60, '#ffe38a', .12 + pulse * .1);
    drawText(ctx, 'ATELIER', 160, 36, '#ffe38a', 2, 'c'); drawText(ctx, 'SAUTE SUR UN OBJET', 160, 49, '#cdb8ee', 1, 'c');
  }
  if (room.type === 'vault') drawText(ctx, 'CACHE SECRETE', 160, 40, '#8ee8ff', 2, 'c');
  if (room.type === 'challenge' && !room.cleared) drawText(ctx, 'DEFI', 160, 40, '#ff6a8a', 2, 'c');
  if (room.tp) drawTP(ctx, room, g);
  // portes
  const doorCol = room.locked ? '#ff3a6a' : '#5dff6a';
  const dls = [], ex = room.exits;
  const okd = k => ex[k] !== null && !g.rooms[ex[k]].hidden;
  if (okd('L')) dls.push({ side: 0, row: 8, nr: g.rooms[ex.L], pre: '' });
  if (okd('R')) dls.push({ side: 1, row: 8, nr: g.rooms[ex.R], pre: '' });
  if (ex.L2 !== undefined && okd('L2')) dls.push({ side: 0, row: 8 + ROWS, nr: g.rooms[ex.L2], pre: '' });
  if (ex.R2 !== undefined && okd('R2')) dls.push({ side: 1, row: 8 + ROWS, nr: g.rooms[ex.R2], pre: '' });
  if (okd('U')) dls.push({ side: 1, row: 3, nr: g.rooms[ex.U], pre: 'HAUT ' });
  if (okd('D')) dls.push({ side: 0, row: 3, nr: g.rooms[ex.D], pre: 'BAS ' });
  for (const dd of dls) {
    const side = dd.side, dx = side ? W - T : 0, dy = dd.row * T;
    if (room.locked) {
      ctx.fillStyle = '#2a0f1d'; ctx.fillRect(dx, dy, T, 2 * T);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = doorCol; ctx.globalAlpha = .5 + .4 * Math.sin(fr / 6 + k); ctx.fillRect(dx + 2 + k * 3, dy, 1, 2 * T); }
      ctx.globalAlpha = 1; drawGlow(ctx, dx + T / 2, dy + T, 22, doorCol, .35);
    } else {
      const a = .4 + .3 * Math.sin(fr / 10);
      ctx.fillStyle = doorCol; ctx.globalAlpha = a; for (let k = 0; k < 3; k++) { const ax = dx + (side ? 3 + k * 3 : 10 - k * 3); ctx.fillRect(ax, dy + 12, 1, 8); ctx.fillRect(ax + (side ? 1 : -1), dy + 13, 1, 6); }
      ctx.globalAlpha = 1; drawGlow(ctx, dx + T / 2, dy + T, 20, doorCol, .22);
    }
    const LB = { start: ['DEPART', '#cdb8ee'], combat: ['COMBAT', '#ff6a8a'], item: ['OBJET', '#ffd23a'], heal: ['SOIN', '#ff5cc8'], boss: ['BOSS', '#ff3a6a'], shop: ['BOUTIQUE', '#ffe38a'], vault: ['CACHE', '#8ee8ff'], challenge: ['DEFI', '#ff9a4a'] }[dd.nr.type];
    drawText(ctx, dd.pre + (dd.nr.visited ? LB[0] : '???'), side ? W - 2 : (dy - 9 - camY < 78 && dy - 9 - camY > -10 ? 80 : 2), dy - 9, '#7a6a98', 1, side ? 'r' : 'l');
  }

  // mines
  for (const m of g.mines) { const arm = m.t > 30; ctx.fillStyle = arm ? 'rgba(176,107,255,.35)' : '#b06bff'; ctx.fillRect(m.x - 3, m.y - 1, 6, 3); ctx.fillRect(m.x - 1, m.y - 3, 2, 2); if (arm && fr % 40 < 4) { ctx.fillStyle = '#fff'; ctx.fillRect(m.x, m.y - 3, 1, 1); } }
  for (const m of g.emines) { const arm = m.t > 40; ctx.fillStyle = '#16122a'; ctx.fillRect(m.x - 4, m.y - 2, 8, 4); ctx.fillStyle = arm ? (fr % 20 < 10 ? '#ff4a4a' : '#7a1d1d') : '#555'; ctx.fillRect(m.x - 1, m.y - 3, 2, 2); ctx.fillRect(m.x - 3, m.y - 1, 6, 2); }

  // pickups
  for (const k of g.pickups) drawPickup(ctx, k, fr, g);

  // ennemis
  for (const e of g.enemies) drawEnemy(ctx, e, g);

  // leurre
  if (g.decoy) { const h = Atlas.hero[g.def.id][0]; ctx.globalAlpha = .55 + .2 * Math.sin(fr / 3); blit(ctx, h, g.decoy.x - 12, g.decoy.y - 14, g.p.face < 0, false, 1, 24, 24); ctx.globalAlpha = 1; drawGlow(ctx, g.decoy.x, g.decoy.y, 16, '#b6ff4a', .4); }

  // joueur
  if (g.state !== 'dead') {
    const frm = !p.onGround ? 3 : Math.abs(p.vx) > .3 ? (1 + ((p.anim / 6) | 0) % 2) : 0;
    const spr = Atlas.hero[g.def.id][frm];
    { const tier = p.level >= 9 ? 3 : p.level >= 7 ? 3 : p.level >= 5 ? 2 : p.level >= 3 ? 1 : 0;
      if (tier > 0) { drawGlow(ctx, p.cx, p.cy, 16 + tier * 5, g.def.col, .10 + tier * .07 + .03 * Math.sin(fr / 10));
        if (tier >= 2) for (let k = 0; k < tier + 1; k++) { const a = fr / 22 + k * TAU / (tier + 1); ctx.fillStyle = g.def.col; ctx.fillRect(Math.round(p.cx + Math.cos(a) * 15), Math.round(p.cy + Math.sin(a) * 6 - 3), 2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(p.cx + Math.cos(a) * 15), Math.round(p.cy + Math.sin(a) * 6 - 3), 1, 1); }
        if (p.level >= 9) { ctx.fillStyle = g.def.col; ctx.globalAlpha = .35; ctx.fillRect(Math.round(p.cx - 1), Math.round(p.y - 14 - (fr % 16)), 2, 6); ctx.globalAlpha = 1; } } }
    if (p.st.gas) drawGlow(ctx, p.cx, p.cy, 34 + p.st.gas * 10, '#9dff6a', .16 + .05 * Math.sin(fr / 8));
    const blink = p.inv > 0 && (fr >> 2) % 2 === 0;
    if (!blink) blit(ctx, spr, p.cx - 12, p.y + p.h - 24, p.face < 0, p.flash > 0, p.buff.ghost > 0 ? .35 : 1, 24, 24);
    if (p.armor > 0) { ctx.strokeStyle = '#38a8ff'; ctx.globalAlpha = .25 + Math.min(.4, p.armor * .08); ctx.beginPath(); ctx.arc(p.cx, p.cy, 14, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (p.buff.traj > 0 || p.buff.storm > 0) drawGlow(ctx, p.cx, p.cy, 18, g.def.col, .35 + .15 * Math.sin(fr / 4));
    if (p.st.drone) for (let k = 0; k < p.st.drone; k++) { const a = fr / 20 + k * 2; iconS(ctx, 'drone', Math.round(p.cx - 4 + Math.cos(a) * 18), Math.round(p.cy - 26 + Math.sin(a * 2) * 3), '#5dff6a', 1); }
    if (g.def.sniper && !Input.mouse) { const t = g.nearestEnemy(p.cx, p.cy); if (t) { ctx.strokeStyle = 'rgba(224,196,255,.28)'; ctx.beginPath(); ctx.moveTo(p.cx, p.cy); ctx.lineTo(t.cx, t.cy); ctx.stroke(); } }
  }

  // frappes de drone
  for (const s of g.strikes) {
    if (s.t < 18) { ctx.fillStyle = 'rgba(42,216,192,.5)'; for (let x = 0; x < W; x += 8) ctx.fillRect(x, s.y, 4, 1); iconS(ctx, 'drone', Math.round(s.x - 3), Math.round(s.y - 8), '#2ad8c0', 1); }
    else { const a = 1 - (s.t - 18) / 10; ctx.fillStyle = '#c9fff6'; ctx.globalAlpha = Math.max(0, a); ctx.fillRect(0, s.y - 3, W, 6); ctx.fillStyle = '#2ad8c0'; ctx.fillRect(0, s.y - 5, W, 10); ctx.globalAlpha = 1; }
  }
  // dangers
  for (const h of g.hazards) {
    const active = h.t >= h.warn, col = h.col || '#ff3a3a';
    if (!active) { ctx.fillStyle = col; ctx.globalAlpha = (fr % 6 < 3) ? .55 : .25; if (h.w >= W) ctx.fillRect(0, h.y + 3, W, 2); else ctx.fillRect(h.x + 6, 0, 2, H); ctx.globalAlpha = 1; }
    else { ctx.fillStyle = '#fff'; ctx.fillRect(h.x, h.y, h.w, h.h); ctx.fillStyle = col; ctx.globalAlpha = .7; ctx.fillRect(h.x - 2, h.y - 2, h.w + 4, h.h + 4); ctx.globalAlpha = 1; drawGlow(ctx, h.x + h.w / 2, h.y + h.h / 2, h.w >= W ? 40 : 28, col, .3); }
  }
  // balles
  for (const b of g.bullets) {
    drawGlow(ctx, b.x, b.y, b.r * 4 + (b.kind === 'sniper' ? 4 : 0), b.color, .55);
    if (b.kind === 'sniper') { ctx.fillStyle = b.color; ctx.fillRect(Math.round(b.x - b.vx * .8), Math.round(b.y - b.vy * .8), 1, 1); ctx.fillRect(Math.round(b.x - b.vx * .4), Math.round(b.y - b.vy * .4), 2, 2); }
    ctx.fillStyle = b.color; ctx.fillRect(Math.round(b.x - b.r), Math.round(b.y - b.r), b.r * 2, b.r * 2);
    ctx.fillStyle = b.crit ? '#fff3a0' : '#fff'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 2, 2);
  }
  for (const b of g.ebullets) {
    drawGlow(ctx, b.x, b.y, b.r * 4, b.color, .5);
    ctx.fillStyle = '#12081f'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 1, 1);
  }
  // nova
  for (const n of g.novas) { ctx.strokeStyle = n.col; ctx.globalAlpha = clamp(1 - n.r / n.max, .1, 1); ctx.lineWidth = n.vis ? 2 : 4; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1; if (!n.vis) drawGlow(ctx, n.x, n.y, n.r, n.col, .12); }
  // particules
  for (const q of g.parts) { ctx.globalAlpha = clamp(q.life / 14, 0, 1); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.sz, q.sz); }
  ctx.globalAlpha = 1;
  // textes flottants
  if (Opts.ptxt) for (const t of g.texts) { const w = textW(t.str); drawText(ctx, t.str, t.x - w / 2 + 1, t.y + 1, '#12081f'); drawText(ctx, t.str, t.x - w / 2, t.y, t.col); }
  if (g.flashT > 0) { ctx.fillStyle = '#fff'; ctx.globalAlpha = g.flashT / 14; ctx.fillRect(0, camY, W, H); ctx.globalAlpha = 1; }
  ctx.restore();
  drawHUD(ctx, g);
}

function drawPickup(ctx, k, fr, g) {
  const by = Math.round(Math.sin(k.bob) * 1.5);
  if (k.type === 'heart') { drawGlow(ctx, k.x + 4, k.y + 4, 12, '#ff5cc8', .4); iconS(ctx, 'heart', k.x, k.y + by, '#ff5cc8', 1); }
  else if (k.type === 'shield') { drawGlow(ctx, k.x + 4, k.y + 4, 12, '#37e0ff', .4); iconS(ctx, 'shield', k.x, k.y + by, '#37e0ff', 1); }
  else if (k.type === 'key') { drawGlow(ctx, k.x + 4, k.y + 4, 12, '#cfd8dc', .3); iconS(ctx, 'key', k.x, k.y + by, '#e8eef0', 1); }
  else if (k.type === 'cell') { drawGlow(ctx, k.x + 4, k.y + 4, 12, '#ffe38a', .45); iconS(ctx, 'bolt', k.x, k.y + by, '#ffe38a', 1); }
  else if (k.type === 'crate') {
    const x = Math.round(k.x), y = Math.round(k.y) - 2, can = g.p.keys > 0;
    drawGlow(ctx, x + 4, y + 6, 16, can ? '#ffd23a' : '#8a7a9a', k.near ? .7 : .3);
    ctx.fillStyle = '#4a3320'; ctx.fillRect(x - 3, y + 2, 14, 10); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 3, y + 2, 14, 2); ctx.fillStyle = '#6a4424'; ctx.fillRect(x - 3, y + 6, 14, 1);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(x + 2, y + 5, 4, 4); ctx.fillStyle = '#4a3320'; ctx.fillRect(x + 3, y + 6, 2, 2);
    ctx.fillStyle = '#150d20'; ctx.fillRect(x - 4, y + 1, 1, 12); ctx.fillRect(x + 11, y + 1, 1, 12); ctx.fillRect(x - 3, y + 12, 14, 1); ctx.fillRect(x - 3, y + 1, 14, 1);
    if (k.near) drawText(ctx, can ? 'SAUT : OUVRIR' : 'CLE REQUISE', x + 4, y - 8, can ? '#ffe38a' : '#ff6a8a', 1, 'c');
  }
  else if (k.type === 'coin') {
    const x = Math.round(k.x), y = Math.round(k.y), f = Math.floor(k.bob) % 4;
    drawGlow(ctx, x + 2, y + 2, 7, '#ffd23a', .35);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(x, y + 1, 5, 3); ctx.fillRect(x + 1, y, 3, 5); ctx.fillStyle = '#8a5a10'; ctx.fillRect(x + 2, y + 2, 1, 1);
    if (f === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y + 1, 1, 1); }
  }
  else if (k.type === 'portal') {
    const cx = k.x + 8, cy = k.y + 16; drawGlow(ctx, cx, cy, 30, '#ff5cc8', .5);
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? '#ff5cc8' : '#8a4dff'; ctx.globalAlpha = .9 - i * .15; ctx.beginPath(); ctx.ellipse(cx, cy, 6 + i * 3, 14 + i * 2, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, cy - 1 + Math.round(Math.sin(fr / 6) * 6), 2, 2);
  }
  else if (k.type === 'item' || k.type === 'choice' || k.type === 'shop') {
    const col = (k.type === 'item' || (k.type === 'shop' && (k.kind === 'item' || k.kind === 'weapon'))) ? k.item.col : (k.type === 'shop' ? (k.kind === 'surprod' ? '#37e0ff' : k.kind === 'key' ? '#e8eef0' : '#ff5cc8') : (k.opt === 'repair' ? '#ff5cc8' : '#37e0ff')), cx = k.x + 4, cy = k.y - 2 + by;
    ctx.fillStyle = '#0d0818'; ctx.fillRect(cx - 9, k.y + 10, 18, 4); ctx.fillStyle = g.biome.neon; ctx.fillRect(cx - 9, k.y + 10, 18, 1);
    if ((k.type === 'item' || (k.type === 'shop' && k.kind === 'item')) && k.item && !k.item.weapon) { const it = k.item, ks = it.any ? ['*'] : it.cat2 ? [it.cat, it.cat2] : [it.cat]; ks.forEach((q, j) => { ctx.fillStyle = q === '*' ? '#e8eef0' : SLOTCOL[q]; const w = 18 / ks.length; ctx.fillRect(Math.round(cx - 9 + j * w), k.y + 10, Math.ceil(w), 2); }); }
    drawGlow(ctx, cx, cy, 20, col, k.near ? .8 : .5);
    const rows = [2, 4, 6, 8, 10, 8, 6, 4, 2];
    for (let j = 0; j < rows.length; j++) { ctx.fillStyle = j < 4 ? shade(col, .3) : col; ctx.fillRect(cx - rows[j] / 2, cy - 4 + j, rows[j], 1); }
    { // nom de l'objet (toujours visible hors boutique) + invite à valider par un saut
      const nm = k.type === 'shop' ? (k.kind === 'item' || k.kind === 'weapon' ? k.item.name : k.kind === 'heart' ? 'Pack reparation' : k.kind === 'key' ? 'Cle de caisse' : k.kind === 'surprod' ? 'Surproduction' : 'Reparation express') : k.type === 'choice' ? (k.opt === 'repair' ? 'Reparation' : 'Surproduction') : k.item.name;
      let ln = [];
      if (k.type !== 'shop' || k.near) {
        const ws = strip(nm).split(' '); let cur = '';
        for (const w of ws) { if ((cur + ' ' + w).trim().length <= 12) cur = (cur + ' ' + w).trim(); else { if (cur) ln.push(cur); cur = w; } }
        if (cur) ln.push(cur); ln = ln.slice(0, 3).map(t => t.length > 12 ? t.slice(0, 11) + '.' : t);
        ln.forEach((t, j) => { const yy = k.y - 9 - (ln.length - 1 - j) * 6; drawText(ctx, t, Math.round(k.x + 4) + 1, yy + 1, '#12081f', 1, 'c'); drawText(ctx, t, Math.round(k.x + 4), yy, k.near ? '#ffffff' : shade(col, .25), 1, 'c'); });
      }
      if (k.near && k.type !== 'shop') drawText(ctx, 'SAUT : PRENDRE', Math.round(k.x + 4), k.y - 11 - ln.length * 6, '#ffe38a', 1, 'c');
    }
    ctx.fillStyle = '#fff';
    if (k.type === 'shop') { const can = g.p.coins >= k.price; drawText(ctx, String(k.price), k.x + 4, k.y - 17, can ? '#ffe38a' : '#8a7a9a', 1, 'c'); }
    if (k.type === 'choice' || (k.type === 'shop' && k.kind !== 'item' && k.kind !== 'weapon')) { if (k.opt === 'repair' || k.kind === 'heart' || k.kind === 'repair') { ctx.fillRect(cx - 1, cy - 2, 2, 5); ctx.fillRect(cx - 3, cy, 6, 1); } else if (k.kind === 'key') { ctx.fillRect(cx - 2, cy - 2, 3, 3); ctx.fillRect(cx, cy + 1, 1, 3); ctx.fillRect(cx + 1, cy + 2, 2, 1); } else { ctx.fillRect(cx - 2, cy - 2, 4, 3); ctx.fillRect(cx - 1, cy + 1, 2, 1); } }
    else { const gl = k.item.g; if (gl === 0) { ctx.fillRect(cx - 1, cy - 2, 2, 5); ctx.fillRect(cx - 2, cy, 5, 1); } else if (gl === 1) { ctx.fillRect(cx - 2, cy - 2, 1, 1); ctx.fillRect(cx + 1, cy - 2, 1, 1); ctx.fillRect(cx - 1, cy - 1, 2, 2); ctx.fillRect(cx - 2, cy + 1, 1, 1); ctx.fillRect(cx + 1, cy + 1, 1, 1); } else if (gl === 2) { ctx.fillRect(cx - 2, cy - 2, 4, 4); ctx.fillStyle = col; ctx.fillRect(cx - 1, cy - 1, 2, 2); } else { ctx.fillRect(cx - 1, cy - 1, 2, 2); } }
  }
}

function drawEnemy(ctx, e, g) {
  const fr = g.frame;
  if (e.spawnT > 0) {
    const t = e.spawnT / 40; ctx.strokeStyle = '#5dff6a'; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(e.cx, e.cy, 3 + t * 14, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    drawGlow(ctx, e.cx, e.cy, 16, '#5dff6a', .3 + (1 - t) * .3);
    if (fr % 4 < 2) { const s = e.boss ? null : Atlas.pro[e.type][0]; if (s) blit(ctx, s, e.cx - 12, e.y + e.h - 24, e.face < 0, false, .35, 24, 24); }
    return;
  }
  const frm = e.fly ? ((fr / 8) | 0) % 2 + 1 : Math.abs(e.vx) > .2 && e.onGround ? 1 + ((e.t / 8) | 0) % 2 : e.onGround ? 0 : 3;
  const spr = Atlas.pro[e.type][frm], white = e.flash > 0 || (e.st === 'windup' && fr % 6 < 3);
  if (e.boss) {
    const s = e.boss.scale, bw = 16 * s, bx = e.cx - bw / 2, by = e.y + e.h - bw + 2;
    drawGlow(ctx, e.cx, e.cy, 46, e.boss.col, .22); drawGlow(ctx, e.cx, e.cy, 36, '#5dff6a', .12);
    blit(ctx, spr, bx, by, e.face < 0, white, 1, bw, bw);
    if (e.freeze > 0) { ctx.fillStyle = 'rgba(142,232,255,.35)'; ctx.fillRect(e.x, e.y, e.w, e.h); }
    return;
  }
  if (e.st === 'aim') { ctx.strokeStyle = e.fragShot ? '#ffe38a' : '#ff4a4a'; ctx.globalAlpha = .3 + .5 * (1 - e.aimT / 55); ctx.beginPath(); ctx.moveTo(e.cx, e.cy); ctx.lineTo(e.cx + Math.cos(e.aimA) * 300, e.cy + Math.sin(e.aimA) * 300); ctx.stroke(); ctx.globalAlpha = 1; }
  if (e.elite) drawGlow(ctx, e.cx, e.cy, 18, '#ffd23a', .45 + .15 * Math.sin(fr / 5));
  blit(ctx, spr, e.cx - 12, e.y + e.h - 24, e.face < 0, white, 1, 24, 24);
  if (e.shieldHp > 0) { ctx.strokeStyle = '#37e0ff'; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(e.cx, e.cy, 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; drawGlow(ctx, e.cx, e.cy, 12, '#37e0ff', .25); }
  if (e.freeze > 0) { ctx.fillStyle = 'rgba(142,232,255,.4)'; ctx.fillRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2); ctx.strokeStyle = '#d6f6ff'; ctx.strokeRect(e.x - .5, e.y - .5, e.w + 1, e.h + 1); }
  if (e.stun > 0) { drawText(ctx, '*', e.cx - 1, e.y - 8, '#ffe38a'); }
  if (e.st === 'windup') drawText(ctx, '!', e.cx - 1, e.y - 9, '#ff4a4a');
  if (e.hp < e.maxhp && e.maxhp >= 8) { ctx.fillStyle = '#12081f'; ctx.fillRect(e.x - 1, e.y - 6, e.w + 2, 3); ctx.fillStyle = e.elite ? '#ffd23a' : '#5dff6a'; ctx.fillRect(e.x, e.y - 5, Math.max(0, Math.round(e.w * e.hp / e.maxhp)), 1); }
}

function drawHUD(ctx, g) {
  const p = g.p;
  // cœurs
  for (let i = 0; i < p.maxhp; i++) { iconS(ctx, 'heart', 5 + i * 17, 5, '#12081f', 2); iconS(ctx, 'heart', 5 + i * 17 + 0, 5, i < p.hp ? '#ff5cc8' : '#3a2552', 2); }
  // plaques d'armure
  { let hx = 5, hy = 5 + 15;
    for (let i = 0; i < p.armorMax; i++) { ctx.fillStyle = '#0c1a2e'; ctx.fillRect(hx + i * 10, hy, 9, 7); ctx.fillStyle = i < p.armor ? '#37e0ff' : '#1e3550'; ctx.fillRect(hx + i * 10 + 1, hy + 1, 7, 5); if (i < p.armor) { ctx.fillStyle = '#c8f6ff'; ctx.fillRect(hx + i * 10 + 1, hy + 1, 7, 1); } } }
  // ressources
  let y = 30; ctx.fillStyle = 'rgba(13,8,24,.6)'; ctx.fillRect(3, y - 2, 70, 11);
  iconS(ctx, 'key', 5, y, '#e8eef0', 1); drawText(ctx, 'x' + p.keys, 14, y + 1, '#e8f6ff');
  { const cx = 36; ctx.fillStyle = '#ffd23a'; ctx.fillRect(cx, y + 1, 5, 3); ctx.fillRect(cx + 1, y, 3, 5); ctx.fillStyle = '#8a5a10'; ctx.fillRect(cx + 2, y + 2, 1, 1); drawText(ctx, 'x' + p.coins, cx + 8, y + 1, '#ffe38a'); }
  for (let i = 0; i < p.dashMax; i++) { ctx.fillStyle = i < p.dash ? '#ffffff' : '#3a2552'; ctx.fillRect(3 + i * 8, 52, 6, 3); }
  { const rk = RANKS.filter(q => q[0] <= p.level).pop();
    drawText(ctx, 'NV ' + p.level, 3, 58, rk[2]); drawText(ctx, rk[1], 26, 58, shade(rk[2], -.1));
    ctx.fillStyle = '#12081f'; ctx.fillRect(3, 65, 54, 4); ctx.fillStyle = '#2a1a44'; ctx.fillRect(4, 66, 52, 2); ctx.fillStyle = rk[2]; ctx.fillRect(4, 66, Math.round(52 * p.xp / p.xpNext), 2); }
  if (p.weapon) drawText(ctx, p.weapon.name, 3, 72, p.weapon.col);
  // barre de coup unique
  const full = p.ult >= 100, bw = 62; y = 41;
  ctx.fillStyle = '#12081f'; ctx.fillRect(3, y, bw + 2, 7);
  ctx.fillStyle = '#3a2552'; ctx.fillRect(4, y + 1, bw, 5);
  ctx.fillStyle = full ? (g.frame % 20 < 10 ? '#fff' : g.def.col) : g.def.col; ctx.fillRect(4, y + 1, Math.round(bw * p.ult / 100), 5);
  drawText(ctx, full ? 'PRET' : Math.floor(p.ult) + '%', 70, y + 1, full ? '#fff' : '#cdb8ee');
  // minimap : grille de salles reliées
  const gw = g.grid.w, gh = g.grid.h, pw = 9, ph = 7, mgx = W - gw * pw - 3, mgy = 3, cur = g.room;
  const known = i => { const q = g.rooms[i]; if (q.visited) return true; if (q.hidden) return false; for (const k in q.exits) { const o = q.exits[k]; if (o !== null && g.rooms[o].visited) return true; } return false; };
  const cxy = q => [mgx + q.gx * pw, mgy + q.gy * ph];
  for (const q of g.rooms) {
    if (!known(q.i)) continue;
    const [x, y] = cxy(q);
    ctx.fillStyle = '#7a6a98'; ctx.globalAlpha = .7;
    if (q.exits.R !== null && known(q.exits.R)) ctx.fillRect(x + 7, y + 2, 3, 1);
    if (q.exits.D !== null && known(q.exits.D)) ctx.fillRect(x + 3, y + 5, 1, 3);
    if (q.exits.R2 != null && known(q.exits.R2)) ctx.fillRect(x + 7, y + ph + 2, 3, 1);
    ctx.globalAlpha = 1;
  }
  for (const q of g.rooms) {
    if (!known(q.i)) continue;
    const [x, y] = cxy(q);
    const col = !q.visited ? '#4a3d6e' : q.type === 'boss' ? '#ff3a6a' : q.type === 'item' ? '#ffd23a' : q.type === 'heal' ? '#ff5cc8' : q.type === 'shop' ? '#ffe38a' : q.type === 'vault' ? '#8ee8ff' : q.type === 'challenge' ? '#ff9a4a' : q.type === 'start' ? '#8a7ab0' : q.cleared ? '#5a4a80' : '#c04060';
    ctx.fillStyle = '#12081f'; ctx.fillRect(x - 1, y - 1, 9, 7);
    const th = q.rows > ROWS ? ph + 5 : 5;
    if (q.rows > ROWS) { ctx.fillStyle = '#12081f'; ctx.fillRect(x - 1, y + 5, 9, ph - 4); }
    ctx.globalAlpha = q.visited ? 1 : .55; ctx.fillStyle = col; ctx.fillRect(x, y, 7, th); ctx.globalAlpha = 1;
    if (q.rows > ROWS) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + 5, 7, 2); }
    if (q.tp && q.visited) { ctx.fillStyle = q.tp.active ? '#38e8ff' : '#3a5a7a'; ctx.fillRect(x + 5, y, 2, 2); }
    if (q.visited) { const lt = roomLoot(g, q); if (lt.h) { ctx.fillStyle = '#ff3a5a'; ctx.fillRect(x, y + th - 2, 2, 2); } if (lt.s) { ctx.fillStyle = '#4aa8ff'; ctx.fillRect(x + 5, y + th - 2, 2, 2); } }
    if (q === cur) { ctx.fillStyle = '#fff'; const hy = q.rows > ROWS ? Math.min(th - 4, Math.max(0, Math.round((p.cy / (q.rows * T)) * th) - 1)) : 1; ctx.fillRect(x + 2, y + hy, 3, 3); }
  }
  drawText(ctx, 'SECTEUR ' + g.floor + '/6', W - 4, mgy + gh * ph + 1, '#cdb8ee', 1, 'r');
  // barre de boss
  const boss = g.enemies.find(e => e.boss && e.spawnT <= 0);
  if (boss) {
    const bw2 = 180, x = (W - bw2) / 2;
    ctx.fillStyle = '#12081f'; ctx.fillRect(x - 2, 164, bw2 + 4, 10);
    ctx.fillStyle = '#3a1020'; ctx.fillRect(x, 166, bw2, 6);
    ctx.fillStyle = '#ff3a6a'; ctx.fillRect(x, 166, Math.round(bw2 * Math.max(0, boss.hp) / boss.maxhp), 6);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, 166, Math.round(bw2 * Math.max(0, boss.hp) / boss.maxhp), 1);
    drawText(ctx, boss.boss.name + ' - ' + boss.boss.title, W / 2, 156, '#ffd9e6', 1, 'c');
  }
}


/* ---------- Grande carte ---------- */
function drawBigMap(cx, g, sel) {
  const CW = 640, CH = 360, gw = g.grid.w, gh = g.grid.h;
  cx.imageSmoothingEnabled = false; cx.fillStyle = '#0d0818'; cx.fillRect(0, 0, CW, CH);
  cx.fillStyle = '#2a1f45'; for (let i = 0; i < 90; i++) cx.fillRect((i * 97) % CW, (i * 53) % CH, 1, 1);
  const GX = 14, GY = 12;
  const bw = Math.floor(Math.min((CW - 40) / gw - GX, ((CH - 92) / gh - GY) / .62)), bh = Math.round(bw * .62);
  const cw = bw + GX, chh = bh + GY, ox = Math.round((CW - (gw * cw - GX)) / 2), oy = 34 + Math.round((CH - 92 - (gh * chh - GY)) / 2);
  const known = i => { const q = g.rooms[i]; if (q.visited) return true; if (q.hidden) return false; for (const k in q.exits) { const o = q.exits[k]; if (o != null && g.rooms[o].visited) return true; } return false; };
  const NAME = { start: 'DEPART', combat: 'COMBAT', item: 'OBJET', heal: 'SOIN', boss: 'BOSS', shop: 'ATELIER', vault: 'CACHE', challenge: 'DEFI' };
  const COL = { boss: '#ff3a6a', item: '#ffd23a', heal: '#ff5cc8', shop: '#ffe38a', vault: '#8ee8ff', challenge: '#ff9a4a', start: '#8a7ab0' };
  drawText(cx, 'CARTE - ' + g.biome.name.toUpperCase(), CW / 2, 10, '#ffffff', 2, 'c');
  const pos = q => [ox + q.gx * cw, oy + q.gy * chh];
  const dot = (x, y) => { cx.fillStyle = '#0d0818'; cx.fillRect(x - 3, y - 3, 7, 7); cx.fillStyle = '#38b6ff'; cx.fillRect(x - 2, y - 2, 5, 5); cx.fillRect(x - 3, y - 1, 7, 3); cx.fillRect(x - 1, y - 3, 3, 7); cx.fillStyle = '#bfe8ff'; cx.fillRect(x - 1, y - 1, 1, 1); };
  // liaisons (portes gauche/droite) : trait + points bleus aux deux passages
  for (const q of g.rooms) {
    if (!known(q.i)) continue; const [x, y] = pos(q);
    for (const [k, dy] of [['R', 0], ['R2', chh]]) {
      const o = q.exits[k]; if (o == null || !known(o)) continue; const r2 = g.rooms[o], [x2] = pos(r2);
      const ly = y + dy + bh / 2, slot = (q.gy + (dy ? 1 : 0)) - r2.gy, ly2 = pos(r2)[1] + slot * chh + bh / 2;
      cx.fillStyle = '#7a6a98'; cx.fillRect(x + bw, Math.round(ly) - 1, x2 - x - bw, 3);
      dot(x + bw, Math.round(ly)); dot(x2, Math.round(ly2));
    }
  }
  g._mapRects = [];
  for (const q of g.rooms) {
    if (!known(q.i)) continue; const [x, y] = pos(q), tall = q.rows > ROWS, th = tall ? chh + bh : bh;
    g._mapRects.push({ i: q.i, x: x - 3, y: y - 3, w: bw + 6, h: th + 6 });
    const base = !q.visited ? '#3a3058' : (COL[q.type] || (q.cleared ? '#5a4a80' : '#c04060'));
    cx.fillStyle = '#12081f'; cx.fillRect(x - 2, y - 2, bw + 4, th + 4);
    cx.globalAlpha = q.visited ? 1 : .5; cx.fillStyle = base; cx.fillRect(x, y, bw, th); cx.globalAlpha = 1;
    cx.fillStyle = 'rgba(0,0,0,.28)'; cx.fillRect(x, y + th - 3, bw, 3);
    if (tall) { cx.fillStyle = 'rgba(255,255,255,.28)'; for (let k = 1; k < 4; k++) cx.fillRect(x + 4 + (k % 2) * (bw - 18), y + Math.round(th * k / 4), 14, 2); cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(x, y + bh, bw, 2); }
    drawText(cx, !q.visited ? (tall ? 'VERTICAL' : '?') : tall ? 'VERTICAL' : (NAME[q.type] || ''), x + bw / 2, y + 3, q.visited ? '#0d0818' : '#8a7ab0', 1, 'c');
    if (q.cleared && q.type === 'combat') drawText(cx, 'OK', x + bw / 2, y + bh - 9, '#0d0818', 1, 'c');
    if (q.tp && q.visited) { const ac = q.tp.active, tx = x + bw - 9, ty = y + th - 9; cx.fillStyle = '#0d0818'; cx.fillRect(tx - 1, ty - 1, 9, 9); cx.fillStyle = ac ? '#38e8ff' : '#4a6a8a'; cx.fillRect(tx + 2, ty, 3, 7); cx.fillRect(tx, ty, 7, 2); }
    if (q.visited) { const lt = roomLoot(g, q); let ox = x + 3; const oy = y + th - 12;
      if (lt.h) { cx.fillStyle = '#0d0818'; cx.fillRect(ox - 1, oy - 1, 10, 9); cx.fillStyle = '#ff3a5a'; cx.fillRect(ox, oy, 3, 3); cx.fillRect(ox + 4, oy, 3, 3); cx.fillRect(ox, oy + 2, 7, 2); cx.fillRect(ox + 1, oy + 4, 5, 1); cx.fillRect(ox + 2, oy + 5, 3, 1); ox += 11; }
      if (lt.s) { cx.fillStyle = '#0d0818'; cx.fillRect(ox - 1, oy - 1, 10, 9); cx.fillStyle = '#4aa8ff'; cx.fillRect(ox, oy, 7, 4); cx.fillRect(ox + 1, oy + 4, 5, 2); cx.fillRect(ox + 2, oy + 6, 3, 1); } }
    if (sel && q.tp && q.tp.active && q !== g.room) { cx.strokeStyle = g.frame % 30 < 18 ? '#38e8ff' : '#ffffff'; cx.lineWidth = 2; cx.strokeRect(x - 3, y - 3, bw + 6, th + 6); }
    if (q === g.room) { if (g.frame % 40 < 28) { cx.fillStyle = '#fff'; const hy = tall ? Math.min(th - 8, Math.max(0, Math.round(g.p.cy / (q.rows * T) * th) - 3)) : bh / 2 - 1; cx.fillRect(x + bw / 2 - 3, y + hy, 7, 7); cx.fillStyle = '#12081f'; cx.fillRect(x + bw / 2 - 1, y + hy + 2, 3, 3); } }
  }
  // légende
  let lx = 12; const ly = CH - 30;
  for (const [k, c] of [['DEPART', '#8a7ab0'], ['COMBAT', '#c04060'], ['OBJET', '#ffd23a'], ['SOIN', '#ff5cc8'], ['ATELIER', '#ffe38a'], ['CACHE', '#8ee8ff'], ['DEFI', '#ff9a4a'], ['BOSS', '#ff3a6a']]) { cx.fillStyle = c; cx.fillRect(lx, ly, 6, 6); drawText(cx, k, lx + 9, ly, '#cdb8ee', 1); lx += 9 + textW(k) + 9; }
  dot(18, CH - 12); drawText(cx, 'PASSAGE', 28, CH - 15, '#9a8abb', 1); cx.fillStyle = '#38e8ff'; cx.fillRect(74, CH - 15, 3, 7); cx.fillRect(72, CH - 15, 7, 2); drawText(cx, 'BORNE ACTIVE', 84, CH - 15, '#9a8abb', 1); cx.fillStyle = '#ff3a5a'; cx.fillRect(160, CH - 15, 6, 6); drawText(cx, 'PV A RAMASSER', 170, CH - 15, '#9a8abb', 1); cx.fillStyle = '#4aa8ff'; cx.fillRect(246, CH - 15, 6, 6); drawText(cx, 'BOUCLIER', 256, CH - 15, '#9a8abb', 1);
  drawText(cx, 'SALLE VERTICALE = PLUSIEURS ETAGES', CW - 12, CH - 15, '#9a8abb', 1, 'r');
}


/* ---------- Borne de téléportation ---------- */
function drawTP(ctx, room, g) {
  const t = room.tp, fr = g.frame, x = t.x, fy = 160, on = t.active, lk = t.lock > 0, dim = room.locked;
  const col = on ? '#38e8ff' : lk ? '#ff4a5a' : '#ffb347';
  ctx.globalAlpha = dim ? .5 : 1;
  // plateforme de téléportation
  ctx.fillStyle = '#0d0818'; ctx.fillRect(x + 14, fy - 4, 28, 4); ctx.fillStyle = '#2b2150'; ctx.fillRect(x + 15, fy - 3, 26, 3);
  ctx.fillStyle = on ? col : '#4a3d6e'; ctx.fillRect(x + 15, fy - 4, 26, 1);
  if (on) {
    const a = .3 + .12 * Math.sin(fr / 8); ctx.globalAlpha = (dim ? .5 : 1) * a; ctx.fillStyle = col; ctx.fillRect(x + 19, fy - 30, 18, 26);
    ctx.globalAlpha = (dim ? .5 : 1) * .8; for (let k = 0; k < 3; k++) { const yy = fy - 6 - ((fr * .6 + k * 9) % 26); ctx.fillRect(x + 19, Math.round(yy), 18, 1); }
    ctx.globalAlpha = dim ? .5 : 1; drawGlow(ctx, x + 28, fy - 14, 22, col, .35);
  }
  // borne (écran + clavier)
  ctx.fillStyle = '#0d0818'; ctx.fillRect(x - 1, fy - 21, 14, 21); ctx.fillStyle = '#2b2150'; ctx.fillRect(x, fy - 20, 12, 20);
  ctx.fillStyle = '#06141a'; ctx.fillRect(x + 1, fy - 18, 10, 8);
  ctx.fillStyle = col;
  if (on) { ctx.fillRect(x + 3, fy - 16, 6, 1); ctx.fillRect(x + 3, fy - 14, 4, 1); ctx.fillRect(x + 3, fy - 12, 6, 1); }
  else if (lk) { ctx.fillRect(x + 3, fy - 17, 1, 1); ctx.fillRect(x + 7, fy - 17, 1, 1); ctx.fillRect(x + 4, fy - 15, 3, 1); ctx.fillRect(x + 3, fy - 13, 1, 1); ctx.fillRect(x + 7, fy - 13, 1, 1); }
  else { ctx.globalAlpha = (dim ? .5 : 1) * (fr % 40 < 24 ? 1 : .35); ctx.fillRect(x + 3, fy - 16, 3, 1); ctx.fillRect(x + 3, fy - 13, 5, 1); ctx.globalAlpha = dim ? .5 : 1; }
  ctx.fillStyle = '#4a3d6e'; ctx.fillRect(x + 1, fy - 8, 10, 3); ctx.fillStyle = col; ctx.fillRect(x + 2, fy - 7, 2, 1); ctx.fillRect(x + 6, fy - 7, 2, 1);
  ctx.globalAlpha = 1; drawGlow(ctx, x + 6, fy - 14, 14, col, t.near ? .55 : .22);
  if (t.near && !dim) {
    const msg = on ? 'SAUT : TELEPORTER' : lk ? 'VERROUILLE ' + Math.ceil(t.lock / 60) + 'S' : 'SAUT : PIRATER LA BORNE';
    drawText(ctx, msg, x + 28 + 1, fy - 37, '#12081f', 1, 'c'); drawText(ctx, msg, x + 28, fy - 38, on ? '#9ff4ff' : lk ? '#ff6a8a' : '#ffd9a0', 1, 'c');
  }
}

function roomLoot(g, q) {
  const L = q === g.room ? g.pickups : q.pickups; let h = 0, s = 0;
  if (L) for (const o of L) { if (o.type === 'heart') h++; else if (o.type === 'shield') s++; }
  return { h, s };
}
