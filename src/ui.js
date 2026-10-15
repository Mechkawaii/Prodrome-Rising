/* ===== UI : écrans, contrôles, boucle principale ===== */
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let game = null, running = false, paused = false, sel = 'johanna', acc = 0, last = 0, started = false;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { } };
  const dd = new Date(), TODAY = dd.getFullYear() * 10000 + (dd.getMonth() + 1) * 100 + dd.getDate();
  let best = lsGet('mkw-abyss-best', 0), wins = lsGet('mkw-ruins-wins', {}), ach = lsGet('mkw-ruins-ach', {});
  let diffId = lsGet('mkw-ruins-diff', 'normal'), dailyMode = false, lastFloor = 0;
  if (!DIFFS[diffId]) diffId = 'normal';
  const ACH = [
    { id: 'first', name: 'Première casse', desc: 'Détruis un Prodrome.', t: g => g.kills >= 1 },
    { id: 'kills50', name: 'Démolisseur', desc: 'Détruis 50 Prodromes en une partie.', t: g => g.kills >= 50 },
    { id: 'boss1', name: 'Chef abattu', desc: 'Bats un boss.', t: g => g.stats.bossKills >= 1 },
    { id: 'win', name: 'Libérateur', desc: 'Termine les 3 secteurs.', t: g => g.state === 'win' },
    { id: 'flawless', name: 'Intouchable', desc: 'Bats un boss sans perdre de PV dans le secteur.', t: g => g.stats.flawless },
    { id: 'rich', name: 'Chasseur de boulons', desc: 'Possède 40 boulons.', t: g => g.p.coins >= 40 },
    { id: 'buyer', name: 'Bon client', desc: 'Fais 3 achats.', t: g => g.stats.purchases >= 3 },
    { id: 'collector', name: 'Collectionneur', desc: 'Équipe 8 modules.', t: g => g.stats.mods >= 8 },
    { id: 'armed', name: 'Armé jusqu\'aux dents', desc: 'Équipe une arme.', t: g => !!g.p.weapon },
    { id: 'syn', name: 'Synergie', desc: 'Active une synergie d\'objets.', t: g => g.stats.syn >= 1 },
    { id: 'secret', name: 'Fouineur', desc: 'Entre dans une cache ou un défi.', t: g => g.stats.secret >= 1 },
    { id: 'dash', name: 'Éclair', desc: 'Esquive 40 fois en une partie.', t: g => g.stats.dashes >= 40 },
    { id: 'daily', name: 'Run du jour', desc: 'Gagne un run du jour.', t: g => g.state === 'win' && g.daily }
  ];

  buildAtlas();

  /* ---------- Sélection du héros ---------- */
  function thumb(id) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(Atlas.hero[id][0].canvas(), 0, 0);
    return c;
  }
  function heartsStr(n) { return '♥'.repeat(n); }
  const grid = $('heroGrid');
  HEROES.forEach(h => {
    const b = document.createElement('button');
    b.className = 'hero'; b.dataset.id = h.id; b.style.setProperty('--c', h.col);
    b.appendChild(thumb(h.id));
    const n = document.createElement('span'); n.textContent = h.name; b.appendChild(n);
    if (wins[h.id]) b.classList.add('won');
    b.onclick = () => select(h.id);
    grid.appendChild(b);
  });
  function select(id) {
    sel = id;
    const h = HERO[id];
    grid.querySelectorAll('.hero').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    const d = $('heroInfo');
    d.style.setProperty('--c', h.col);
    d.innerHTML = '<div class="hn">' + h.name + ' <small>' + h.code + ' · ' + h.cls + '</small></div>' +
      '<div class="hp">' + heartsStr(h.hp) + '</div>' +
      '<p><b>Action de classe</b> ' + h.classTxt + '</p>' +
      '<p><b>Coup unique · ' + h.ultName + '</b> ' + h.ultTxt + '</p>' +
      (h.motto ? '<p class="mt">' + h.motto + (h.provisional ? ' <em>· fiche provisoire</em>' : '') + '</p>' : '');
  }
  select('johanna');

  /* ---------- Écrans ---------- */
  const SCR = ['title', 'select', 'over', 'achScr', 'optScr'];
  function show(id) { SCR.forEach(s => $(s).hidden = s !== id); if (id === 'title') refreshTitle(); }
  function refreshTitle() {
      $('btnContinue').hidden = !lsGet('mkw-ruins-save', null);
    const n = ACH.filter(a => ach[a.id]).length;
    $('btnAch').textContent = 'Succès ' + n + '/' + ACH.length;
    $('dailyLbl').textContent = 'Même carte pour tous · ' + String(TODAY).replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1');
  }
  function openSelect(daily) {
    dailyMode = daily; $('modeLbl').textContent = daily ? 'Run du jour · ' + String(TODAY).replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1') : 'Nouvelle partie';
    show('select');
  }
  document.querySelectorAll('#diffSeg button').forEach(b => {
    b.onclick = () => { diffId = b.dataset.d; lsSet('mkw-ruins-diff', diffId); markDiff(); };
  });
  function markDiff() { document.querySelectorAll('#diffSeg button').forEach(b => b.classList.toggle('on', b.dataset.d === diffId)); }
  markDiff();
  $('btnPlay').onclick = () => { audio(); openSelect(false); };
  $('btnDaily').onclick = () => { audio(); openSelect(true); };
  $('btnContinue').onclick = () => { audio(); const s = lsGet('mkw-ruins-save', null); if (s) start(s); };
  $('btnAch').onclick = () => { renderAch(); show('achScr'); };
  $('btnAchBack').onclick = () => show('title');
  /* ---------- Options ---------- */
  let optFrom = 'title', rstArm = 0;
  const saveOpts = () => lsSet('mkw-opts', Opts);
  function uizVal() { if (Opts.uiz > 0) return Opts.uiz; const w = $('stage').clientWidth || 640; return Math.max(1, Math.min(2.2, Math.round(w / 760 * 20) / 20)); }
  function applyOpts() { const r = document.documentElement; r.style.setProperty('--uiz', uizVal()); r.style.setProperty('--padA', Opts.pad); r.style.setProperty('--padS', Opts.padS); r.classList.toggle('nocrt', !Opts.crt); Music.setVol(); }
  function syncOpts() {
    $('oMus').value = Math.round(Opts.mus * 100); $('vMus').textContent = Math.round(Opts.mus * 100) + ' %';
    $('oSfx').value = Math.round(Opts.sfx * 100); $('vSfx').textContent = Math.round(Opts.sfx * 100) + ' %';
    $('oPad').value = Math.round(Opts.pad * 100); $('vPad').textContent = Math.round(Opts.pad * 100) + ' %';
    $('oPadS').value = Math.round(Opts.padS * 100); $('vPadS').textContent = Math.round(Opts.padS * 100) + ' %'; $('oAim').value = String(Opts.aim); $('oCrt').value = String(Opts.crt);
    $('oUiz').value = String(Opts.uiz || 0); $('oShake').value = String(Opts.shake); $('oTxt').value = String(Opts.ptxt); $('oVib').value = String(Opts.vib);
    $('oReset').textContent = 'Effacer la progression'; rstArm = 0;
  }
  function openOpts(from) { optFrom = from; syncOpts(); $('optScr').hidden = false; if (from === 'title') SCR.forEach(s => { if (s !== 'optScr') $(s).hidden = true; }); }
  $('btnOpt').onclick = () => openOpts('title');
  $('btnOptBack').onclick = () => { $('optScr').hidden = true; if (optFrom === 'title') show('title'); };
  $('oMus').oninput = e => { Opts.mus = e.target.value / 100; $('vMus').textContent = e.target.value + ' %'; Sound.init(); Music.sync(); Music.setVol(); saveOpts(); };
  $('oSfx').oninput = e => { Opts.sfx = e.target.value / 100; $('vSfx').textContent = e.target.value + ' %'; saveOpts(); };
  $('oSfx').onchange = () => { Sound.init(); Sound.play('pick'); };
  $('oPad').oninput = e => { Opts.pad = e.target.value / 100; $('vPad').textContent = e.target.value + ' %'; applyOpts(); saveOpts(); };
  $('oPadS').oninput = e => { Opts.padS = e.target.value / 100; $('vPadS').textContent = e.target.value + ' %'; applyOpts(); saveOpts(); };
  $('oUiz').onchange = e => { Opts.uiz = +e.target.value; saveOpts(); applyOpts(); };
  addEventListener('resize', () => applyOpts());
  $('oAim').onchange = e => { Opts.aim = +e.target.value; saveOpts(); };
  $('oCrt').onchange = e => { Opts.crt = +e.target.value; applyOpts(); saveOpts(); };
  $('oShake').onchange = e => { Opts.shake = +e.target.value; saveOpts(); };
  $('oTxt').onchange = e => { Opts.ptxt = +e.target.value; saveOpts(); };
  $('oVib').onchange = e => { Opts.vib = +e.target.value; saveOpts(); };
  $('oReset').onclick = () => {
    if (!rstArm) { rstArm = 1; $('oReset').textContent = 'Sûr ? Touche encore pour effacer'; setTimeout(() => { rstArm = 0; $('oReset').textContent = 'Effacer la progression'; }, 4000); return; }
    try { Object.keys(localStorage).filter(k => k.indexOf('mkw-') === 0 && k !== 'mkw-opts').forEach(k => localStorage.removeItem(k)); } catch (e) { }
    location.reload();
  };
  applyOpts();
  $('btnGo').onclick = () => { audio(); start(); };
  $('btnBack').onclick = () => show('title');
  $('btnAgain').onclick = () => { audio(); start(); };
  $('btnChange').onclick = () => { openSelect(dailyMode); };
  $('btnPause').onclick = () => { if (inv && inv.pause) { closeInv(); return; } if (choosing || radio || mapOpen || hack || inv) return; audio(); setPause(true); };
  let choosing = null;
  function showLevel() {
    const g = game; if (!g || choosing) return;
    choosing = g.levelChoices(); paused = true; Input.reset(); releaseAll();
    $('lvlTitle').textContent = 'NIVEAU ' + g.p.level; $('lvlSub').textContent = 'Choisis une amélioration' + (g.pendingLevel > 1 ? ' (' + g.pendingLevel + ' en attente)' : '');
    const box = $('lvlOpts'); box.innerHTML = '';
    choosing.forEach((u, i) => { const b = document.createElement('button'); b.className = 'up'; b.style.setProperty('--c', u.col); b.innerHTML = '<i>' + (i + 1) + '</i><b>' + u.name + '</b>' + u.desc; b.onclick = () => pickUp(i); box.appendChild(b); });
    $('lvlBox').hidden = false;
  }
  function pickUp(i) {
    if (!choosing || !choosing[i]) return; const u = choosing[i]; choosing = null;
    game.applyUp(u); $('lvlBox').hidden = true; paused = !!radio; last = 0; Input.reset(); Music.sync();
    if (game.pendingLevel > 0) setTimeout(showLevel, 200);
  }
  /* ---------- Radio du Général Sheepard ---------- */
  let radio = null; const radioQ = [], rctx = $('rPort').getContext('2d'); rctx.imageSmoothingEnabled = false;
  const RADIO = {
    intro: ['Ici le Général Sheepard. Les Prodromes sont plus nombreux que jamais. Ils ont envahi la planète, jusqu\'à nos infrastructures les plus sensibles.', 'Les Mechkawaii sont notre dernière ligne de défense. {h}, tu reprends chaque secteur, un par un... jusqu\'au vaisseau mère.', 'Pas de repli, pilote. Bonne chance.'],
    f1: ['Secteur 1 : les faubourgs. Premiers contacts hostiles. Sankai, leur armurier, tient le carrefour. Nettoie la zone.'],
    f2: ['Faubourgs repris. Beau travail. Le métro est occupé : Senpoku bombarde les quais. Garde la tête froide.'],
    f3: ['Nos relevés montrent des nids sous la ville. Visibilité réduite. Genbu garde l\'entrée, planqué derrière son bouclier.'],
    f4: ['Les Prodromes ont contaminé la jungle. Gaoro chasse en meute. Reste mobile, {h}.'],
    f5: ['Zone critique : réacteur et tours de communication. Si elles tombent, tout tombe. Goki va tout faire sauter, alors fais vite.'],
    f6: ['Le voilà : le vaisseau mère. Goryo y commande l\'invasion. Tout repose sur toi, {h}. Fais-les payer.'],
    boss: ['{b} neutralisé. Le secteur est repris. Récupère ton souffle et prends le portail.'],
    win: ['... Le vaisseau mère s\'effondre ! Tu l\'as fait, {h} !', 'L\'invasion est repoussée. La planète te doit tout, et les Mechkawaii n\'oublieront jamais ce jour.']
  };
  function say(key, extra) {
    const h = game ? game.def.name : 'pilote', b = extra || '';
    radioQ.push((RADIO[key] || []).map(t => t.replace('{h}', h).replace('{b}', b)));
    if (!radio) nextRadio();
  }
  function nextRadio() {
    const lines = radioQ.shift();
    if (!lines) { radio = null; $('radio').hidden = true; if (!paused && !choosing) { last = 0; Input.reset(); Music.sync(); } return; }
    if (!radio) { paused = true; Input.reset(); releaseAll(); }
    radio = { lines, i: 0, n: 0, t: 0 }; $('radio').hidden = false; $('rBody').textContent = ''; $('rNext').hidden = true;
    Sound.play('door');
  }
  function radioAdvance() {
    if (!radio || radio.t < 14) return;
    const L = radio.lines[radio.i];
    if (radio.n < L.length) { radio.n = L.length; return; }
    if (radio.i < radio.lines.length - 1) { radio.i++; radio.n = 0; $('rNext').hidden = true; }
    else { const wasWin = radio.win; radio = null; $('radio').hidden = true; paused = false; nextRadio(); if (!radio && wasWin) finalOk = true; }
  }
  $('radio').addEventListener('pointerdown', e => { e.preventDefault(); radioAdvance(); });
  let finalOk = false, winSaid = false, lastBoss = 0;
  function radioTick() {
    if (!radio) return;
    radio.t++;
    const talking = radio.t >= 14 && radio.n < radio.lines[radio.i].length;
    if (radio.t >= 14 && talking) {
      const o = Math.floor(radio.n); radio.n += .6;
      if (Math.floor(radio.n) !== o && Math.floor(radio.n) % 3 === 0) { try { Sound.tone(1250 + Math.random() * 300, 1200, .02, 'square', .012); } catch (e) { } }
      $('rBody').textContent = radio.lines[radio.i].slice(0, Math.floor(radio.n));
    } else if (radio.t >= 14) { $('rBody').textContent = radio.lines[radio.i]; }
    $('rNext').hidden = !(radio.t >= 14 && !talking);
    drawSheepard(rctx, radio.t, talking, Math.min(1, radio.t / 14));
  }
  /* ---------- Grande carte ---------- */
  let mapOpen = false, mapSel = false, hack = null, inv = null; const mctx = $('mapCv').getContext('2d');
  function toggleMap(v, sel) {
    if (!running || !game || choosing || radio || hack || inv) return;
    v = v === undefined ? !mapOpen : v; if (v === mapOpen) return; mapOpen = v; mapSel = !!(v && sel); $('mapBox').hidden = !v;
    $('mapHint').textContent = mapSel ? 'TELEPORTATION · touche une salle avec borne active' : 'CARTE · touche pour fermer';
    if (v) { paused = true; Input.reset(); releaseAll(); drawBigMap(mctx, game, mapSel); } else { paused = false; last = 0; Input.reset(); Music.sync(); }
  }
  $('btnMap').onclick = () => { audio(); toggleMap(); };
  $('mapBox').addEventListener('pointerdown', e => {
    e.preventDefault();
    if (mapSel && game && game._mapRects) {
      const r = $('mapCv').getBoundingClientRect(), x = (e.clientX - r.left) * 640 / r.width, y = (e.clientY - r.top) * 360 / r.height;
      const h = game._mapRects.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
      const t = h && game.rooms[h.i];
      if (t && t.tp && t.tp.active && t !== game.rooms[game.ri]) { toggleMap(false); game.teleportTo(h.i); return; }
    }
    toggleMap(false);
  });
  /* ---------- Mini-jeu de piratage (Simon) ---------- */
  const HK = [['▲', '#ffd23a', 'ArrowUp'], ['◀', '#3dd6ff', 'ArrowLeft'], ['▶', '#ff5fa8', 'ArrowRight'], ['▼', '#6dff7a', 'ArrowDown']];
  function openHack() {
    const g = game; if (!g || hack || choosing || radio || mapOpen || inv) return;
    const n = 3 + Math.ceil(g.floor / 2), seq = []; for (let i = 0; i < n; i++) seq.push((Math.random() * 4) | 0);
    hack = { seq, pos: 0, tries: 3, show: 0, phase: 'show', t: 0 };
    paused = true; Input.reset(); releaseAll();
    const pad = $('hackPad'); pad.innerHTML = '';
    HK.forEach((k, i) => { const b = document.createElement('button'); b.className = 'hk'; b.style.setProperty('--c', k[1]); b.textContent = k[0]; b.onclick = () => hackPress(i); pad.appendChild(b); });
    $('hackBox').hidden = false; hackReplay();
  }
  function hackLit(i, on) { const b = $('hackPad').children[i]; if (b) b.classList.toggle('lit', on); }
  function hackMsg(t, c) { const m = $('hackMsg'); m.textContent = t; m.style.color = c || ''; }
  function hackReplay() {
    const h = hack; h.phase = 'show'; h.pos = 0; hackMsg('MEMORISE LA SEQUENCE · essais ' + h.tries); $('hackProg').textContent = '';
    h.seq.forEach((v, i) => { setTimeout(() => { if (hack !== h) return; hackLit(v, true); Sound.play('hit'); }, 600 + i * 650); setTimeout(() => { if (hack !== h) return; hackLit(v, false); }, 600 + i * 650 + 400); });
    setTimeout(() => { if (hack !== h) return; h.phase = 'in'; hackMsg('A TOI · répète la séquence', '#9dffd6'); }, 600 + h.seq.length * 650);
  }
  function hackPress(i) {
    const h = hack; if (!h || h.phase !== 'in') return;
    hackLit(i, true); setTimeout(() => hackLit(i, false), 150);
    if (h.seq[h.pos] === i) {
      h.pos++; $('hackProg').textContent = '■'.repeat(h.pos) + '□'.repeat(h.seq.length - h.pos);
      if (h.pos >= h.seq.length) { h.phase = 'done'; hackMsg('ACCES ACCORDE', '#6dff7a'); setTimeout(() => closeHack(true), 700); }
    } else {
      h.tries--; h.phase = 'wait';
      if (h.tries <= 0) { hackMsg('ECHEC · BORNE VERROUILLEE', '#ff5a5a'); setTimeout(() => closeHack(false), 900); }
      else { hackMsg('ERREUR · essais restants ' + h.tries, '#ff5a5a'); setTimeout(() => { if (hack === h) hackReplay(); }, 800); }
    }
  }
  function closeHack(ok) {
    const g = game; hack = null; $('hackBox').hidden = true; paused = false; last = 0; Input.reset(); Music.sync();
    if (!g) return; const r = g.rooms[g.ri];
    if (ok) g.tpActivate(); else if (r && r.tp) { r.tp.lock = 1200; g.text(g.player.cx, g.player.y - 8, 'VERROUILLE', '#ff5a5a'); }
  }
  /* ---------- Inventaire ---------- */
  const catName = { def: 'BLINDAGE', atk: 'ATTAQUE', mod: 'MODULES', ano: 'ANOMALIES' };
  function openInv(req, pause) {
    if (!running || !game || choosing || radio || hack || mapOpen || inv) return false;
    inv = { req, sel: null, pause: !!pause }; paused = true; Input.reset(); releaseAll(); $('invBox').hidden = false; renderInv(); return true;
  }
  function closeInv() {
    if (!inv) return; const req = inv.req; inv = null; $('invBox').hidden = true;
    if (req && game && game.uiReq === req) game.uiReq = null;
    paused = !!radio; last = 0; Input.reset(); Music.sync();
  }
  function chips(it) { const ks = it.any ? ['*'] : it.cat2 ? [it.cat, it.cat2] : [it.cat]; return ks.map(k => '<i class="chip" style="--c:' + (k === '*' ? '#e8eef0' : SLOTCOL[k]) + '">' + (k === '*' ? 'INCOLORE' : catName[k]) + '</i>').join(''); }
  function drawPortrait() {
    const cv = $('invPort'), x = cv.getContext('2d'), d = game.def, spr = Atlas.hero[d.id][0]; x.imageSmoothingEnabled = false; x.clearRect(0, 0, 112, 112);
    const gr = x.createRadialGradient(56, 62, 6, 56, 62, 70); gr.addColorStop(0, d.col + '66'); gr.addColorStop(1, '#0b0716'); x.fillStyle = gr; x.fillRect(0, 0, 112, 112);
    x.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 112; i += 4) x.fillRect(0, i, 112, 1);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(56, 100, 30, 6, 0, 0, 7); x.fill();
    blit(x, spr, 8, 6, false, false, 1, 96, 96);
    x.strokeStyle = d.col; x.lineWidth = 2; x.strokeRect(1, 1, 110, 110);
  }
  function renderInv() {
    const g = game, p = g.p, d = g.def, req = inv.req, st = p.st, nm = req ? req.it : null, nkeys = nm ? g.modKeys(nm) : null;
    drawPortrait(); renderStats();
    const pc = x => Math.round(x * 100) + ' %';
    $('invInfo').innerHTML = '<b class="nm" style="color:' + d.col + '">' + d.name.toUpperCase() + '</b><span class="cl">' + d.cls + ' · Niv. ' + p.level + '</span><span class="tx">' + d.classTxt + '</span><span class="tx" style="color:#ffd23a">★ ' + d.ultName + ' — <u>' + d.ultTxt + '</u></span>' + '';
    const box = $('invSlots'); box.innerHTML = '';
    for (const [k, label, col] of SLOTS) {
      const e = p.slots[k], el = document.createElement('button'); el.className = 'slot' + (inv.sel === k ? ' sel' : '') + (e && e.keys.length > 1 ? ' dual' : '');
      el.style.setProperty('--c', col);
      const willHit = nkeys && nkeys.includes(k), anyMode = nm && nm.any;
      if (willHit && e) el.classList.add('hit'); if (willHit && !e) el.classList.add('free'); if (anyMode) el.classList.add('pick');
      el.innerHTML = '<small>' + label + '</small>' + (e ? '<b style="color:' + e.it.col + '">' + e.it.name + '</b><span>' + e.it.desc + '</span>' + (e.keys.length > 1 ? '<em>⛓ occupe ' + e.keys.map(q => catName[q]).join(' + ') + '</em>' : '') : '<span class="empty">— vide —</span>') + (willHit && e ? '<em class="warn">sera remplacé</em>' : '');
      el.onclick = () => {
        if (req && anyMode) { const r = req; game.uiReq = null; g.resolveEquip(r.it, [k], r.commit); closeInv(); return; }
        if (!req) { inv.sel = inv.sel === k ? null : k; renderInv(); }
      };
      box.appendChild(el);
    }
    let btns = '';
    if (req) {
      $('invNew').innerHTML = '<small>NOUVEAU MODULE</small><b style="color:' + nm.col + '">' + nm.name + '</b><span>' + nm.desc + '</span><div>' + chips(nm) + '</div>' + (nm.any ? '<em>Touche l\'emplacement où l\'installer.</em>' : (nkeys.length > 1 ? '<em>Occupe deux emplacements.</em>' : ''));
      if (!nm.any) btns += '<button class="btn" id="invOk">Remplacer</button>';
      btns += '<button class="btn alt" id="invNo">Laisser</button>';
    } else {
      $('invNew').innerHTML = inv.sel && p.slots[inv.sel] ? '<small>SÉLECTION</small><b style="color:' + p.slots[inv.sel].it.col + '">' + p.slots[inv.sel].it.name + '</b><span>' + p.slots[inv.sel].it.desc + '</span><div>' + chips(p.slots[inv.sel].it) + '</div>' : '<small>INVENTAIRE</small><span>Touche un module pour le sélectionner, puis « Retirer » pour le poser au sol. Les modules à double emplacement occupent deux cases.</span>';
      if (inv.sel && p.slots[inv.sel]) btns += '<button class="btn alt" id="invDrop">Retirer</button>';
      btns += inv.pause ? '<button class="btn" id="invClose">Reprendre</button><button class="btn alt" id="invOpt">Options</button><button class="btn alt" id="invQuit">Quitter</button>' : '<button class="btn" id="invClose">Fermer</button>';
    }
    $('invBtns').innerHTML = btns;
    if ($('invOk')) $('invOk').onclick = () => { const r = req; game.uiReq = null; g.resolveEquip(r.it, nkeys, r.commit); closeInv(); };
    if ($('invNo')) $('invNo').onclick = () => closeInv();
    if ($('invDrop')) $('invDrop').onclick = () => { g.removeModule(inv.sel); inv.sel = null; renderInv(); };
    if ($('invClose')) $('invClose').onclick = () => closeInv();
    if ($('invOpt')) $('invOpt').onclick = () => openOpts('pause');
    if ($('invQuit')) $('invQuit').onclick = () => { closeInv(); running = false; show('title'); };
  }
  $('hackX').onclick = () => { if (hack) closeHack(null); };
  function setPause(v) { if (v) { if (!inv && !paused) openInv(null, true); } else if (inv && inv.pause) closeInv(); }
  function renderStats() {
    const g = game, p = g.p, st = p.st, d = g.def, pc = x => Math.round(x * 100) + ' %';
    const rk = RANKS.filter(q => q[0] <= p.level).pop(), tl = (k, v) => '<div><small>' + k + '</small><b>' + v + '</b></div>';
    $('invStatsTop').innerHTML = '<div class="lv" style="--c:' + rk[2] + '"><b>NIV. ' + p.level + '</b><span class="rk">' + rk[1] + '</span><span class="xb"><i style="width:' + Math.round(100 * p.xp / p.xpNext) + '%"></i></span><small>' + p.xp + ' / ' + p.xpNext + ' XP</small></div>' +
      '<div class="tiles">' + tl('PV', Math.max(0, Math.ceil(p.hp)) + '/' + p.maxhp) + tl('ARMURE', p.armor + '/' + p.armorMax) + tl('DÉGÂTS', pc(st.dmg)) + tl('CADENCE', pc(st.rate)) + tl('VITESSE', pc(st.spd)) + tl('CRITIQUE', pc(st.crit)) + tl('SAUTS', st.jumps) + tl('ARME', p.weapon ? p.weapon.name : 'De base') + tl('CLÉS', p.keys) + tl('PIÈCES', p.coins) + tl('SECTEUR', g.floor + '/6') + '</div>';
    const names = [].concat(p.items.map(i => '<span style="color:' + (i.col || '#fff') + '">• ' + i.name + '</span>'), p.ups.map(id => { const u = UPGRADES.find(q => q.id === id); return u ? '<span style="color:' + u.col + '">▸ ' + u.name + '</span>' : ''; }));
    $('invList').innerHTML = names.length ? '<h3>OBJETS &amp; AMÉLIORATIONS</h3>' + names.join('') : '';
  }
  function audio() { Sound.init(); Music.sync(); }
  function renderAch() {
    $('achList').innerHTML = ACH.map(a => '<li class="' + (ach[a.id] ? 'ok' : '') + '"><b>' + (ach[a.id] ? '★ ' : '☆ ') + a.name + '</b><span>' + a.desc + '</span></li>').join('');
  }

  /* ---------- Sauvegarde (point de contrôle à chaque secteur) ---------- */
  function saveRun() {
    const g = game, p = g.p; if (!g || g.state !== 'play') return;
    lsSet('mkw-ruins-save', { hero: g.def.id, diff: g.diffId, daily: g.daily, floor: g.floor, hp: p.hp, maxhp: p.maxhp, coins: p.coins, keys: p.keys, armor: p.armor, armorMax: p.armorMax, ult: p.ult,
      level: p.level, xp: p.xp, xpNext: p.xpNext, ups: p.ups, items: p.items.map(i => i.id), slots: { def: p.slots.def && p.slots.def.it.id, atk: p.slots.atk && p.slots.atk.it.id, mod: p.slots.mod && p.slots.mod.it.id, ano: p.slots.ano && p.slots.ano.it.id }, weapon: p.weapon ? p.weapon.id : null, kills: g.kills, score: Math.round(g.score), stats: g.stats });
  }
  function restore(s) {
    const g = game, p = g.p;
    while (g.floor < s.floor) g.newFloor();
    if (s.slots) {
      const done = new Set();
      for (const k of ['def', 'atk', 'mod', 'ano']) { const id = s.slots[k]; if (!id || done.has(id)) continue; done.add(id); const it = ITEMS.find(i => i.id === id); if (!it) continue; const keys = it.any ? [k] : g.modKeys(it); if (keys.every(q => !p.slots[q])) g.equipTo(it, keys); }
    } else for (const id of s.items) { const it = ITEMS.find(i => i.id === id); if (!it) continue; const ks = it.any ? ['def', 'atk', 'mod', 'ano'].filter(q => !p.slots[q]).slice(0, 1) : g.modKeys(it); if (ks.length && ks.every(q => !p.slots[q])) g.equipTo(it, ks); }
    for (const id of (s.ups || [])) { const up = UPGRADES.find(i => i.id === id); if (up) { p.ups.push(id); up.apply(p, g); } }
    if (s.level) { p.level = s.level; p.xp = s.xp || 0; p.xpNext = s.xpNext || 9; }
    g.checkSyn(); g.toast = null;
    if (s.weapon) p.weapon = WEAPONS.find(w => w.id === s.weapon) || null; else { const w = (s.items || []).map(id => WEAPONS.find(q => q.id === id)).filter(Boolean)[0]; if (w) p.weapon = w; }
    p.maxhp = s.maxhp; p.hp = s.hp; p.coins = s.coins; p.keys = s.keys; p.armor = s.armor == null ? 1 : s.armor; p.armorMax = s.armorMax || 3; p.ult = s.ult;
    g.kills = s.kills; g.score = Math.round(s.score); Object.assign(g.stats, s.stats, { hurtFloor: false });
    g.banner = 'Partie reprise'; g.bannerT = 120;
  }

  function start(save) {
    if (save) { diffId = save.diff; dailyMode = !!save.daily; }
    game = new Game(save ? save.hero : sel, { diff: diffId, daily: dailyMode ? TODAY : 0 });
    if (save) restore(save);
    lastFloor = 0;
    Input.reset(); running = true; paused = false; acc = 0; last = 0;
    $('lvlBox').hidden = true; choosing = null; radio = null; hack = null; inv = null; $('invBox').hidden = true; $('hackBox').hidden = true; mapOpen = false; mapSel = false; $('mapBox').hidden = true; radioQ.length = 0; $('radio').hidden = true; finalOk = false; winSaid = false; lastBoss = 0; $('hud').hidden = false;
    SCR.forEach(s => $(s).hidden = true);
    setShown = false;
  }
  let setShown = false;
  function endScreen(win) {
    if (setShown) return; setShown = true;
    const g = game; lsDel('mkw-ruins-save');
    let rec;
    if (g.daily) { const k = 'mkw-ruins-daily-' + g.daily; rec = Math.round(Math.max(lsGet(k, 0), g.score)); lsSet(k, rec); }
    else { if (g.score > best) { best = Math.round(g.score); lsSet('mkw-abyss-best', best); } rec = best; }
    if (win) { wins[g.def.id] = (wins[g.def.id] || 0) + 1; lsSet('mkw-ruins-wins', wins); const cardEl = grid.querySelector('[data-id="' + g.def.id + '"]'); if (cardEl) cardEl.classList.add('won'); }
    checkAch();
    $('overTitle').textContent = win ? 'Éclat de victoire' : 'Mechkawaii hors service';
    $('overTitle').className = win ? 'win' : 'lose';
    $('overTxt').textContent = win ? 'Le vaisseau mère est détruit. L\'invasion est repoussée. — Gén. Sheepard' : '« Repli, pilote. Les Mechkawaii tiennent encore. Retourne au front. » — Gén. Sheepard';
    $('overStats').innerHTML = '<span>Secteur <b>' + g.floor + '/6</b></span><span>Prodromes <b>' + g.kills + '</b></span><span>Score <b>' + Math.round(g.score) + '</b></span><span>' + (g.daily ? 'Record du jour' : 'Record') + ' <b>' + Math.round(rec) + '</b></span><span>' + DIFFS[g.diffId].name + '</span>';
    show('over'); Music.stop();
    Sound.play(win ? 'win' : 'lose');
  }
  /* succès */
  let achQueue = [], achT = 0;
  function checkAch() {
    const g = game; if (!g) return;
    for (const a of ACH) if (!ach[a.id]) { let ok = false; try { ok = a.t(g); } catch (e) { } if (ok) { ach[a.id] = 1; lsSet('mkw-ruins-ach', ach); achQueue.push(a); } }
  }
  function tickAch() {
    const el = $('achToast');
    if (achT > 0) { if (--achT === 0) el.hidden = true; return; }
    if (achQueue.length) { const a = achQueue.shift(); el.innerHTML = '<b>★ Succès · ' + a.name + '</b><span>' + a.desc + '</span>'; el.hidden = false; achT = 200; Sound.play('pick'); }
  }

  /* ---------- Clavier / souris ---------- */
  addEventListener('keydown', e => {
    if (radio) { if (!['F5', 'F12'].includes(e.code)) { if (['Enter', 'Space', 'KeyZ', 'KeyX', 'KeyJ', 'KeyK', 'Escape', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); radioAdvance(); } return; } }
    if (inv) { if (['Escape', 'KeyI', 'Tab', 'KeyP'].includes(e.code)) { e.preventDefault(); closeInv(); } return; }
    if (e.code === 'KeyI' && running && !paused && !radio && !choosing) { e.preventDefault(); openInv(null, true); return; }
    if (hack) { const hm = { ArrowUp: 0, KeyW: 0, Digit1: 0, ArrowLeft: 1, KeyA: 1, Digit2: 1, ArrowRight: 2, KeyD: 2, Digit3: 2, ArrowDown: 3, KeyS: 3, Digit4: 3 }[e.code]; if (hm !== undefined) { e.preventDefault(); hackPress(hm); } else if (e.code === 'Escape') closeHack(null); return; }
    if (mapOpen) { if (['KeyM', 'Escape', 'Enter', 'Space', 'Tab'].includes(e.code)) { e.preventDefault(); toggleMap(false); } return; }
    if (e.code === 'KeyM' && running && !paused) { e.preventDefault(); toggleMap(true); return; }
    if (choosing && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { pickUp(+e.code.slice(5) - 1); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') { if (choosing) return; if (running) setPause(true); return; }
    if (e.code === 'Enter') { if (!$('title').hidden) $('btnPlay').click(); else if (!$('select').hidden) $('btnGo').click(); else if (!$('over').hidden) $('btnAgain').click(); return; }
    const k = KEYMAP[e.code]; if (!k || !running) return;
    e.preventDefault(); audio(); Input.set(k, 1);
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) Input.set(k, 0); });
  addEventListener('blur', () => { Input.reset(); releaseAll(); if (running && !paused && game && game.state === 'play') setPause(true); });
  function toGame(e) {
    const r = cv.getBoundingClientRect();
    Input.mx = (e.clientX - r.left) / r.width * W; Input.my = (e.clientY - r.top) / r.height * H;
  }
  cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { Input.mouse = true; toGame(e); } });
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && running && !paused) { audio(); Input.mouse = true; toGame(e); Input.set('fire', 1); } });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse') Input.set('fire', 0); });
  addEventListener('keydown', () => { if (Input.mouse) { /* clavier prend la main sur la visée */ } });
  cv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- Contrôles tactiles (zones testées à chaque événement : jamais de bouton coincé) ---------- */
  const btns = [...document.querySelectorAll('[data-k]')].map(b => ({ b, k: b.dataset.k, on: false, touch: false, mouse: false }));
  function applyBtn(o) {
    const want = o.touch || o.mouse;
    if (want) { o.b.classList.add('d'); if (!o.on) { o.on = true; Input.mouse = false; audio(); } if (!Input.held[o.k]) Input.set(o.k, 1); }
    else if (o.on) { o.on = false; o.b.classList.remove('d'); Input.set(o.k, 0); }
  }
  function syncTouches(list) {
    for (const o of btns) {
      const r = o.b.getBoundingClientRect(); let hit = false;
      for (let i = 0; i < list.length; i++) { const t = list[i]; if (t.clientX >= r.left - 8 && t.clientX <= r.right + 8 && t.clientY >= r.top - 8 && t.clientY <= r.bottom + 8) { hit = true; break; } }
      o.touch = hit; applyBtn(o);
    }
  }
  function releaseAll() { for (const o of btns) { o.touch = false; o.mouse = false; applyBtn(o); } }
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(ev => addEventListener(ev, e => {
    syncTouches(e.touches);
    if (e.target && e.target.closest && e.target.closest('[data-k]')) e.preventDefault();
  }, { passive: false }));
  btns.forEach(o => {
    o.b.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; e.preventDefault(); o.mouse = true; applyBtn(o); });
    o.b.addEventListener('contextmenu', e => e.preventDefault());
  });
  addEventListener('pointerup', e => { if (e.pointerType !== 'touch') { for (const o of btns) { o.mouse = false; applyBtn(o); } } });
  addEventListener('pointercancel', e => { if (e.pointerType !== 'touch') releaseAll(); });
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  /* ---------- Overlays HUD ---------- */
  const elToast = $('toast'), elBanner = $('banner'), elTip = $('tip'), elKb = $('kbhint');
  let lastToast = null, lastBanner = '';
  function updateHud() {
    const g = game;
    const t = g.toast;
    if (t !== lastToast) {
      lastToast = t;
      if (t) { elToast.innerHTML = '<b style="color:' + t.col + '">' + t.title + '</b><span>' + t.desc + '</span>'; elToast.hidden = false; elToast.classList.remove('in'); void elToast.offsetWidth; elToast.classList.add('in'); }
      else elToast.hidden = true;
    }
    const showB = g.bannerT > 0 && g.banner && g.state === 'play';
    if (showB) { if (lastBanner !== g.banner) { lastBanner = g.banner; elBanner.textContent = g.banner; } elBanner.hidden = false; elBanner.style.opacity = Math.min(1, g.bannerT / 30); }
    else { elBanner.hidden = true; lastBanner = ''; }
    let tip = null;
    for (const k of g.pickups) if (k.near && (k.type === 'item' || k.type === 'choice' || k.type === 'shop') && (k.item || k.opt || k.kind)) { tip = k; break; }
    if (tip) {
      const it = tip.item, price = tip.type === 'shop' ? '<span style="color:#ffe38a">▲ Acheter · ' + tip.price + ' boulons (tu as ' + g.p.coins + ')</span>' : '';
      const TXT = { repair: ['#ff5cc8', 'Réparation express', '+2 PV.'], surprod: ['#37e0ff', 'Surproduction', '+2 armure.'], heart: ['#ff5cc8', 'Pack de réparation', '+2 PV.'], key: ['#e8eef0', 'Clé de caisse', 'Ouvre une caisse de loot. Rare !'] };
      const kk = tip.kind || tip.opt, T = TXT[kk];
      const txt = it ? '<b style="color:' + it.col + '">' + it.name + '</b><span>' + it.desc + '</span>' + price : T ? '<b style="color:' + T[0] + '">' + T[1] + '</b><span>' + T[2] + '</span>' + price : '';
      if (elTip.dataset.s !== txt) { elTip.innerHTML = txt; elTip.dataset.s = txt; }
      elTip.hidden = false;
    } else { elTip.hidden = true; elTip.dataset.s = ''; }
  }

  /* ---------- Boucle ---------- */
  const STEP = 1000 / 60;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    let dt = Math.min(100, ts - last); last = ts;
    for (const o of btns) if ((o.touch || o.mouse) && !Input.held[o.k]) Input.set(o.k, 1);
    radioTick();
    if (running && game) {
      if (!paused) {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 5) { game.step(); acc -= STEP; n++; }
        if (acc > STEP * 5) acc = 0;
        if (game.floor !== lastFloor) { const first = !lastFloor; lastFloor = game.floor; saveRun(); if (first && game.floor === 1 && !game.stats.bossKills) say('intro'); say('f' + game.floor); }
        if (game.stats.bossKills > lastBoss) { lastBoss = game.stats.bossKills; if (game.state === 'play') say('boss', BOSSES[Math.min(5, game.floor - 1)].name); }
        if (game.pendingLevel > 0 && game.state === 'play' && !choosing && !radio) showLevel();
        if (game.uiReq) { const q = game.uiReq; if (typeof q === 'object') { if (!choosing && !radio && !hack && !mapOpen && !inv) { game.uiReq = null; openInv(q); } } else { game.uiReq = null; if (q === 'hack') openHack(); else if (q === 'tp') toggleMap(true, true); } }
        if (game.frame % 30 === 0) checkAch();
        tickAch();
        if (game.state === 'dead' && game.endT > 100) endScreen(false);
        else if (game.state === 'win' && game.endT > 100 && !winSaid) { winSaid = true; say('win'); if (radio) radio.win = true; }
        else if (game.state === 'win' && finalOk) endScreen(true);
      }
      renderGame(ctx, game);
      if (mapOpen) drawBigMap(mctx, game, mapSel);
      updateHud();
    } else if (game) { renderGame(ctx, game); }
  }
  // fond d'écran titre : étoiles animées légères
  requestAnimationFrame(frame);
  $('best').textContent = best ? 'Record ' + Math.round(best) : '';
  document.addEventListener('visibilitychange', () => { const c = Sound.ctx; if (!c) return; if (document.hidden) { c.suspend(); } else c.resume(); });
  const fsEl = document.documentElement, canFs = !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen);
  if (canFs) {
    $('btnFs').hidden = false;
    $('btnFs').onclick = () => { try { const f = document.fullscreenElement || document.webkitFullscreenElement; const p = f ? (document.exitFullscreen || document.webkitExitFullscreen).call(document) : (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl); if (p && p.catch) p.catch(() => { }); } catch (e) { } };
  /* anti-zoom iOS : double tap, pincement, gestes */
  { let lastEnd = 0; const nz = e => { if (e.cancelable) e.preventDefault(); };
    document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastEnd < 350) nz(e); lastEnd = n; }, { passive: false });
    document.addEventListener('dblclick', nz, { passive: false });
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, nz, { passive: false });
    document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) nz(e); }, { passive: false }); }
  }
  const touch = matchMedia('(pointer:coarse)').matches;
  document.body.classList.toggle('touch', touch);
  show('title');
  window.__mkw = { get game() { return game; }, start, select, Input, saveRun, ach, get diffId() { return diffId; } };
})();
