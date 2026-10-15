/* ===== DONNÉES : héros (fiches), objets, ennemis, biomes, salles ===== */
const lobVel = (dx, dy, t, g) => ({ vx: dx / t, vy: dy / t - 0.5 * g * t });

const HEROES = [
  {
    id: 'johanna', name: 'Johanna', code: 'MKW_RAIDEN', cls: 'Grenadier', col: '#ffd23a', hp: 3, cd: 34,
    classTxt: 'Tirs lobés : ses grenades passent par-dessus les obstacles et explosent en zone.',
    ultName: 'Correction de trajectoire', ultTxt: 'Pendant 8 s, tous ses tirs sont autoguidés et toujours critiques.',
    motto: '« Le courage n\'est pas l\'absence de peur mais de la vaincre. »',
    fire(g, p, a) {
      if (p.buff.traj > 0) { g.shootP(p, a.ang, { speed: 3.4, dmg: 1.6, color: '#ffd23a', homing: .14, crit: true, life: 90 }); g.sfx('shoot'); return; }
      const t = a.target, dx = t ? t.cx - p.cx : p.face * 90, dy = t ? t.cy - p.cy : -6;
      const T0 = clamp(Math.hypot(dx, dy) / 3, 26, 74), gr = .14, v = lobVel(dx, dy, T0, gr);
      g.shootP(p, 0, { kind: 'grenade', vx: v.vx, vy: v.vy, grav: gr, life: T0 + 40, r: 3, dmg: 2.6, explode: 22, color: '#ffd23a', bounce: 0 });
      g.sfx('shootH');
    },
    ult(g, p) { p.buff.traj = 480; g.text(p.cx, p.y - 10, 'AUTOGUIDE', '#ffd23a'); g.sfx('ult'); }
  },
  {
    id: 'banado', name: 'Banado', code: 'MKW_UZUME', cls: 'Technicien', col: '#38a8ff', hp: 4, cd: 13,
    classTxt: 'Un seul bouclier (il revend le reste) : il se répare tout seul en 9 s après avoir été brisé.',
    ultName: 'Cœur mécanique', ultTxt: 'Restaure 2 PV et +2 armure.',
    motto: '« Dévouement et sacrifice. »',
    armorCap: 1, init(p) { p.armor = 1; p.armorMax = 1; p.autoShieldT = 0; },
    fire(g, p, a) { g.shootP(p, a.ang, { speed: 3.6, dmg: 1, color: '#38a8ff', life: 70 }); g.sfx('shoot'); },
    update(g, p) { if (p.armor < p.armorMax) { if (++p.autoShieldT > 540) { p.autoShieldT = 0; p.armor++; g.text(p.cx, p.y - 8, '+ARMURE', '#38a8ff'); g.sfx('shield'); } } else p.autoShieldT = 0; },
    ult(g, p) { g.heal(p, 2); p.armor = Math.min(p.armorMax, p.armor + 2); g.fx(p.cx, p.cy, 24, '#38a8ff', 2); g.sfx('ult'); }
  },
  {
    id: 'fuyu', name: 'Fuyu', code: 'MKW_FUJIN', cls: 'Pyrotechnicien', col: '#ff4a3a', hp: 3, cd: 20,
    classTxt: 'Gerbe de flammes sur 3 directions qui enflamme les ennemis. Renaît une fois avec 2 PV.',
    ultName: 'Réveil enflammé', ultTxt: 'Nova de braise : dégâts et brûlure sur tout l\'écran. Si Fuyu tombe, il se relève une fois (2 PV).',
    motto: '« Même un combat de plusieurs siècles débute par un simple coup de feu. »',
    init(p) { p.revive = 1; },
    fire(g, p, a) {
      for (const d of [-.38, 0, .38]) g.shootP(p, a.ang + d, { speed: 3, dmg: .8, life: 15, r: 4, pierce: 99, burn: 150, color: '#ff7a2a', kind: 'flame' });
      g.sfx('shootH');
    },
    ult(g, p) { g.nova(p.cx, p.cy, '#ff6a2a', 5 * p.st.dmg, { burn: 240 }); g.sfx('ult'); }
  },
  {
    id: 'meimei', name: 'Mei Mei', code: 'MKW_AMATERASU', cls: 'Éclaireur', col: '#b6ff4a', hp: 3, cd: 12,
    classTxt: 'Rapide comme l\'éclair : très mobile, et elle esquive deux fois de suite (deux charges d\'esquive).',
    ultName: 'Disruption visuelle', ultTxt: 'Rend tous les Mechkawaii invisibles 7 s : les Prodromes ne peuvent plus la prendre pour cible.',
    motto: '',
    init(p) { p.st.pierce = 1; p.st.spd *= 1.12; p.dashMax = 2; p.dash = 2; },
    fire(g, p, a) { g.shootP(p, a.ang + rr(-.04, .04), { speed: 3.8, dmg: .95, color: '#b6ff4a', life: 70 }); g.sfx('shoot'); },
    ult(g, p) { p.buff.ghost = 420; g.sfx('ult'); g.fx(p.cx, p.cy, 24, '#b6ff4a', 2.5); g.text(p.cx, p.y - 10, 'INVISIBLE', '#b6ff4a'); }
  },
  {
    id: 'yamabato', name: 'Yamabato', code: 'MKW_RYUJIN', cls: 'Voltigeur', col: '#ff7ad9', hp: 2, cd: 15,
    classTxt: 'Ignore les plateformes pleines et plane en maintenant le saut. Tirs doubles.',
    ultName: 'Tempête de tir', ultTxt: 'Pendant 6 s : cadence triplée et tirs en éventail.',
    motto: '« Le carnage c\'est la solution. »', flies: true,
    init(p) { p.phase = true; p.hover = 100; },
    fire(g, p, a) {
      const rap = p.buff.storm > 0;
      if (rap) { for (const d of [-.2, 0, .2]) g.shootP(p, a.ang + d, { speed: 3.8, dmg: .8, color: '#ff7ad9', life: 60 }); }
      else { g.shootP(p, a.ang - .05, { speed: 3.6, dmg: .9, color: '#ff7ad9', life: 70 }); g.shootP(p, a.ang + .05, { speed: 3.6, dmg: .9, color: '#ff7ad9', life: 70 }); }
      g.sfx('shoot');
    },
    ult(g, p) { p.buff.storm = 360; g.text(p.cx, p.y - 10, 'TEMPETE', '#ff7ad9'); g.sfx('ult'); }
  },
  {
    id: 'duke', name: 'Duke', code: 'MKW_SARUTA-HIKO', cls: 'Démineur', col: '#b06bff', hp: 3, cd: 38,
    classTxt: 'Lance des mines qui se camouflent et explosent au contact des ennemis (4 max).',
    ultName: 'Lancer de mine', ultTxt: 'Une pluie de 6 mines piégées couvre la salle.',
    motto: '« Pas de corps-à-corps : poser, partir, regarder. »',
    fire(g, p, a) {
      if (g.mines.filter(m => m.friendly).length >= 4) g.mines.shift();
      const t = a.target, dx = t ? t.cx - p.cx : p.face * 70, dy = t ? t.cy - p.cy : 0;
      const T0 = clamp(Math.hypot(dx, dy) / 2.6, 22, 60), gr = .16, v = lobVel(dx, dy, T0, gr);
      g.shootP(p, 0, { kind: 'minebomb', vx: v.vx, vy: v.vy, grav: gr, life: 200, r: 3, dmg: 3, color: '#b06bff', bounce: 0 });
      g.sfx('shootH');
    },
    ult(g, p) {
      for (let i = 0; i < 6; i++) { const x = 30 + i * 52 + rr(-12, 12); g.mines.push({ x, y: 159, t: 0, dmg: 3.5 * p.st.dmg, r: 28, friendly: true, armed: 1 }); }
      g.fx(p.cx, p.cy, 20, '#b06bff', 2); g.sfx('ult');
    }
  },
  {
    id: 'khurt', name: 'Khurt', code: 'MKW_TSUKUYOMI', cls: 'Tireur d\'élite', col: '#b36bff', hp: 2, cd: 46,
    classTxt: 'Tir où il veut : balle perforante à très longue portée. Pas de critique, de gros dégâts.',
    ultName: 'Balle cryogénique', ultTxt: 'Une balle de 6 dégâts qui gèle la cible 4 s.',
    motto: '« Un seul tir, un seul souffle. »', sniper: true,
    init(p) { p.st.crit = 0; },
    fire(g, p, a) { g.shootP(p, a.ang, { speed: 7, dmg: 3.4, color: '#e0c4ff', life: 80, r: 2, pierce: 2, kind: 'sniper' }); g.sfx('shootH'); },
    ult(g, p) { const a = g.aim(p); g.shootP(p, a.ang, { speed: 6.5, dmg: 6, color: '#8ee8ff', life: 90, r: 3, pierce: 0, freeze: 240, kind: 'sniper' }); g.sfx('ult'); }
  },
  {
    id: 'faline', name: 'Faline', code: 'MKW_HACHIMAN', cls: 'Cartographe', col: '#ff9a2a', hp: 3, cd: 13,
    classTxt: 'Quand on la touche, 40 % de chances de se fondre dans le décor et d\'esquiver.',
    ultName: 'Mise à jour de coordonnées', ultTxt: 'Échange sa position avec l\'ennemi le plus proche, lui inflige 3 dégâts et l\'étourdit.',
    motto: '« Toute carte est une promesse de retour. »',
    init(p) { p.dodge = .4; },
    fire(g, p, a) { g.shootP(p, a.ang + (p.alt = !p.alt) * .05 - .025, { speed: 3.6, dmg: .95, color: '#ff9a2a', life: 70 }); g.sfx('shoot'); },
    ult(g, p) {
      const e = g.nearestEnemy(p.cx, p.cy);
      if (e) { const ex = e.x, ey = e.y; e.x = p.x - (e.w - p.w) / 2; e.y = p.y - (e.h - p.h); p.x = ex + (e.w - p.w) / 2; p.y = ey + (e.h - p.h); g.hurtEnemy(e, 3 * p.st.dmg, p); e.stun = 100; g.fx(e.cx, e.cy, 12, '#ff9a2a', 2); }
      p.inv = Math.max(p.inv, 40); g.fx(p.cx, p.cy, 18, '#ff9a2a', 2); g.sfx('ult');
    }
  },
  {
    id: 'rasmus', name: 'Rasmus', code: 'MKW_INARI', cls: 'Bombardier', col: '#2ad8c0', hp: 3, cd: 62,
    classTxt: 'Déploie un drone qui balaie toute la ligne de sa cible, alliés exclus.',
    ultName: 'Largage de ravitaillement', ultTxt: 'Le drone largue +1 PV, un bouclier et une clé de réparation.',
    motto: '« De là-haut, tout paraît plus simple. »',
    fire(g, p, a) {
      const t = a.target, y = t ? t.cy : p.cy, dir = (t ? (t.cx > p.cx ? 1 : -1) : p.face);
      g.strikes.push({ y, t: 0, dir, dmg: 3.4 * p.st.dmg, done: 0, x: dir > 0 ? -10 : W + 10 });
      g.sfx('warn');
    },
    ult(g, p) { g.heal(p, 1); p.armor = Math.min(p.armorMax, p.armor + 1); g.pickups.push({ type: 'cell', x: p.cx - 4, y: p.y - 6, vy: -2, bob: 0 }); g.fx(p.cx, p.cy - 10, 20, '#2ad8c0', 2); g.text(p.cx, p.y - 10, 'RAVITAILLEMENT', '#2ad8c0'); g.sfx('pick'); }
  },
  {
    id: 'rhoney', name: 'Rhoney', code: 'MKW_OMOIKANE', cls: 'Armurier', col: '#ffd23a', hp: 4, cd: 36,
    classTxt: 'Armure lourde : 3 points au départ (jusqu\'à 6), +1 à chaque salle nettoyée.',
    ultName: 'Armure de Plastofer', ultTxt: '+3 armure, onde de choc qui repousse et efface les tirs ennemis.',
    motto: '« Une bonne armure ne se juge pas, elle se porte. »', roomArmor: 1,
    init(p) { p.armor = 3; p.armorMax = 6; },
    fire(g, p, a) { for (let i = -2; i <= 2; i++) g.shootP(p, a.ang + i * .13, { speed: 3 + rr(-.2, .2), dmg: .85, color: '#ffe38a', life: 22, r: 2 }); g.sfx('shootH'); },
    ult(g, p) { p.armor = Math.min(p.armorMax, p.armor + 3); g.nova(p.cx, p.cy, '#ffd23a', 2 * p.st.dmg, { kb: 4, clear: true }); g.sfx('ult'); }
  }
];
const HERO = {}; HEROES.forEach(h => HERO[h.id] = h);

/* ---------- Objets ---------- */
const ITEMS = [
  { id: 'turbo', name: 'Extrudeur Turbo', desc: 'Cadence de tir +25 %.', col: '#ff9a2a', g: 0, apply: p => p.st.rate *= 1.25 },
  { id: 'cart', name: 'Cartouches PLAstofer', desc: 'Dégâts +30 %.', col: '#ff4a3a', g: 1, apply: p => p.st.dmg *= 1.3 },
  { id: 'spore', name: 'Spore d\'Izanami', desc: 'Tirs légèrement autoguidés.', col: '#7dffb0', g: 2, apply: p => p.st.homing = Math.max(p.st.homing, .05) },
  { id: 'coeur', name: 'Cœur d\'Izanami', desc: '+1 PV maximum et soin complet.', col: '#ff5cc8', g: 3, apply: (p, g) => { p.maxhp++; p.hp = p.maxhp; } },
  { id: 'semelle', name: 'Semelles à ressort', desc: 'Vitesse de course +15 %.', col: '#38a8ff', g: 0, apply: p => p.st.spd *= 1.15 },
  { id: 'propul', name: 'Propulseur dorsal', desc: '+1 saut en l\'air.', col: '#37e0ff', g: 1, apply: p => p.st.jumps++ },
  { id: 'perf', name: 'Cellules perforantes', desc: 'Les tirs traversent 1 ennemi de plus.', col: '#b36bff', g: 2, apply: p => p.st.pierce++ },
  { id: 'ric', name: 'Rebond de PLAstofer', desc: 'Les tirs ricochent 2 fois sur les murs.', col: '#ffd23a', g: 3, apply: p => p.st.bounce += 2 },
  { id: 'expl', name: 'Charge explosive', desc: 'Les tirs explosent à l\'impact.', col: '#ff6a2a', g: 0, apply: p => p.st.explode = Math.max(p.st.explode, 14) },
  { id: 'drone', name: 'Drone Prodrome piraté', desc: 'Un drone compagnon tire sur les ennemis.', col: '#5dff6a', g: 1, apply: p => p.st.drone++ },
  { id: 'regen', name: 'Armure régénérante', desc: '+1 armure à chaque salle nettoyée.', col: '#38a8ff', g: 2, apply: p => p.st.regenShield++ },
  { id: 'cond', name: 'Condensateur', desc: 'Le coup unique se charge 50 % plus vite.', col: '#ffe38a', g: 3, apply: p => p.st.ultRate *= 1.5 },
  { id: 'cles', name: 'Trousse de clés', desc: '+1 clé de caisse (rare !).', col: '#cfd8dc', g: 0, apply: p => p.keys += 1 },
  { id: 'lentille', name: 'Lentille de visée', desc: 'Critiques +15 %.', col: '#ff5cc8', g: 1, apply: p => p.st.crit += .15 },
  { id: 'ion', name: 'Détonateur ionique', desc: 'Les tirs repoussent les ennemis.', col: '#8ee8ff', g: 2, apply: p => p.st.kb += 1.6 },
  { id: 'blindage', name: 'Plaques de blindage', desc: '+2 armure maximum et +2 armure.', col: '#cfd2e4', g: 1, apply: p => { p.armorMax += 2; p.armor = Math.min(p.armorMax, p.armor + 2); } },
  { id: 'chassis', name: 'Châssis renforcé', desc: '+2 PV maximum et soin de 2 PV.', col: '#ff5cc8', g: 3, apply: (p, g) => { p.maxhp += 2; g.heal(p, 2); } },
  { id: 'megacond', name: 'Supercondensateur', desc: 'Coup unique chargé à +60 % et charge +25 % plus rapide.', col: '#ffe38a', g: 0, apply: p => { p.ult = Math.min(100, p.ult + 60); p.st.ultRate *= 1.25; } },
  { id: 'thermo', name: 'Visée thermique', desc: 'Critiques +10 %, dégâts +10 %.', col: '#ff4a3a', g: 2, apply: p => { p.st.crit += .1; p.st.dmg *= 1.1; } },
  { id: 'bouclier', name: 'Pack d\'armure', desc: '+1 armure maximum et +2 armure.', col: '#38a8ff', g: 1, apply: p => { p.armorMax += 1; p.armor = Math.min(p.armorMax, p.armor + 2); } },
  { id: 'aimant', name: 'Aimant à boulons', desc: 'Attire boulons, cœurs, armure et énergie de plus loin.', col: '#ffd23a', g: 2, apply: p => p.st.magnet++ },
  { id: 'vamp', name: 'Siphon de PV', desc: 'Restaure 1 PV toutes les quelques victimes.', col: '#ff5cc8', g: 0, apply: p => p.st.vamp = (p.st.vamp || 0) + 1 },
  { id: 'contre', name: 'Contre-mesure', desc: 'Une onde de choc repousse tout quand tu es touché.', col: '#8ee8ff', g: 3, apply: p => p.st.thorn = 1 },
  { id: 'lourdes', name: 'Munitions lourdes', desc: 'Dégâts +50 %, cadence -10 %.', col: '#ff9a2a', g: 2, apply: p => { p.st.dmg *= 1.5; p.st.rate *= .9; } },
  { id: 'gel', name: 'Gel d\'urgence', desc: 'Invulnérable plus longtemps après un coup.', col: '#b6ff4a', g: 1, apply: p => p.st.inv = (p.st.inv || 0) + 1 },
  { id: 'gaz', name: 'Gaz d\'Izanami', desc: 'Un nuage toxique blesse les ennemis proches.', col: '#9dff6a', g: 3, apply: p => p.st.gas++ }
];

/* ---------- Armes (remplacent l'arme de classe) ---------- */
const WEAPONS = [
  { id: 'w_pulse', name: 'Fusil à impulsions', desc: 'Arme : tir très rapide, léger. Remplace ton arme.', col: '#8ee8ff', g: 0, weapon: true, cd: 9,
    fire(g, p, a) { g.shootP(p, a.ang + rr(-.05, .05), { speed: 4.2, dmg: .55, color: '#8ee8ff', life: 50 }); g.sfx('shoot'); } },
  { id: 'w_fan', name: 'Éventail plasma', desc: 'Arme : 3 tirs en éventail. Remplace ton arme.', col: '#ff5cc8', g: 1, weapon: true, cd: 24,
    fire(g, p, a) { for (const d of [-.24, 0, .24]) g.shootP(p, a.ang + d, { speed: 3.4, dmg: .85, color: '#ff5cc8', life: 55 }); g.sfx('shoot'); } },
  { id: 'w_flame', name: 'Lance-flammes', desc: 'Arme : jet de flammes court qui enflamme. Remplace ton arme.', col: '#ff8a2a', g: 2, weapon: true, cd: 5,
    fire(g, p, a) { g.shootP(p, a.ang + rr(-.14, .14), { speed: 2.4, dmg: .4, life: 15, r: 4, pierce: 99, burn: 120, color: '#ff7a2a', kind: 'flame' }); if (g.frame % 3 === 0) g.sfx('shoot'); } },
  { id: 'w_rail', name: 'Fusil rail', desc: 'Arme : tir lent qui traverse tout. Remplace ton arme.', col: '#e0c4ff', g: 3, weapon: true, cd: 58,
    fire(g, p, a) { g.shootP(p, a.ang, { speed: 7, dmg: 4.5, pierce: 99, life: 45, r: 2.5, color: '#e0c4ff' }); g.sfx('shootH'); g.shake(1); } },
  { id: 'w_missile', name: 'Missiles guidés', desc: 'Arme : missiles autoguidés explosifs. Remplace ton arme.', col: '#ffb347', g: 0, weapon: true, cd: 42,
    fire(g, p, a) { g.shootP(p, a.ang, { speed: 2.3, dmg: 1.8, homing: .12, explode: 20, life: 100, r: 3, color: '#ffb347' }); g.sfx('shootH'); } },
  { id: 'w_bounce', name: 'Mitrailleuse rebond', desc: 'Arme : balles qui ricochent 3 fois. Remplace ton arme.', col: '#ffe38a', g: 1, weapon: true, cd: 11,
    fire(g, p, a) { g.shootP(p, a.ang + rr(-.1, .1), { speed: 3.6, dmg: .5, bounce: 3, life: 75, color: '#ffe38a' }); g.sfx('shoot'); } },
  { id: 'w_pump', name: 'Fusil à pompe', desc: 'Arme : gerbe de 5 plombs à courte portée. Remplace ton arme.', col: '#ff6a2a', g: 2, weapon: true, cd: 36,
    fire(g, p, a) { for (let i = -2; i <= 2; i++) g.shootP(p, a.ang + i * .12 + rr(-.03, .03), { speed: 3.2 + rr(-.3, .3), dmg: .7, color: '#ffb347', life: 24, r: 2 }); g.sfx('shootH'); } }
];
WEAPONS.forEach(w => { w.apply = (p, g) => { p.weapon = w; p.items = p.items.filter(o => !o.weapon || o === w); }; });

/* ---------- Ennemis (Prodromes) ---------- */
const ENEMY = {
  genbu: { name: 'Genbu', hp: 8, w: 12, h: 14, spd: .5, desc: 'Technicien : protège ses alliés' },
  goryo: { name: 'Goryo', hp: 9, w: 12, h: 14, spd: .35, desc: 'Grenadier' },
  goki: { name: 'Goki', hp: 10, w: 12, h: 14, spd: .9, desc: 'Pyrotechnicien' },
  gaoro: { name: 'Gaoro', hp: 6, w: 12, h: 14, spd: .6, desc: 'Éclaireur' },
  gyuki: { name: 'Gyuki', hp: 7, w: 12, h: 12, spd: .8, desc: 'Voltigeur', fly: true },
  shojo: { name: 'Shojo', hp: 7, w: 12, h: 14, spd: .55, desc: 'Démineur' },
  sojobo: { name: 'Sojobo', hp: 7, w: 12, h: 14, spd: .4, desc: 'Cartographe' },
  senpoku: { name: 'Senpoku', hp: 8, w: 12, h: 12, spd: .5, desc: 'Bombardier', fly: true },
  samebito: { name: 'Samebito', hp: 7, w: 12, h: 14, spd: .35, desc: 'Tireur d\'élite : vise longuement, balle à fragmentation' },
  sankai: { name: 'Sankai', hp: 15, w: 14, h: 15, spd: .35, desc: 'Armurier' },
  nezumi: { name: 'Nezumi', hp: 5, w: 10, h: 9, spd: 1.1, desc: 'Rôdeur des égouts : bondit sur toi' },
  koumori: { name: 'Koumori', hp: 5, w: 11, h: 9, spd: .8, desc: 'Chauve-souris mécanique : pique en piqué', fly: true },
  tsuta: { name: 'Tsuta', hp: 11, w: 12, h: 12, spd: 0, desc: 'Plante-tourelle : crache des spores en cloche' }
};
const FLOOR_POOL = [
  ['genbu', 'gaoro', 'goki', 'shojo', 'genbu', 'gaoro'],
  ['genbu', 'goki', 'gaoro', 'goryo', 'gyuki', 'shojo', 'sojobo', 'goryo', 'samebito', 'samebito'],
  ['nezumi', 'nezumi', 'koumori', 'koumori', 'genbu', 'shojo', 'gaoro', 'goryo', 'samebito'],
  ['tsuta', 'tsuta', 'gyuki', 'gaoro', 'nezumi', 'sojobo', 'samebito', 'goki', 'koumori'],
  ['goki', 'goryo', 'gyuki', 'sojobo', 'senpoku', 'sankai', 'shojo', 'gaoro', 'sankai', 'samebito', 'samebito', 'tsuta'],
  ['sankai', 'goryo', 'senpoku', 'samebito', 'goki', 'sojobo', 'tsuta', 'koumori', 'gyuki', 'sankai', 'samebito', 'nezumi']
];
const BOSSES = [
  { id: 'sankai', name: 'Sankai', title: 'Armurier', hp: 95, scale: 3, w: 30, h: 38, col: '#cfc8ee' },
  { id: 'senpoku', name: 'Senpoku', title: 'Bombardier', hp: 115, scale: 3, w: 30, h: 34, col: '#9fb3d6' },
  { id: 'genbu', name: 'Genbu', title: 'Gardien des profondeurs', hp: 135, scale: 3, w: 30, h: 38, col: '#8dff5a' },
  { id: 'gaoro', name: 'Gaoro', title: 'Chasseur de la canopée', hp: 145, scale: 3, w: 30, h: 36, col: '#ff9a4a' },
  { id: 'goki', name: 'Goki', title: 'Brasier ambulant', hp: 165, scale: 3, w: 32, h: 38, col: '#ff7a2a' },
  { id: 'goryo', name: 'Goryo', title: 'Rayon orbital', hp: 200, scale: 3, w: 30, h: 38, col: '#d8d2f0' }
];

/* ---------- Biomes ---------- */
const BIOMES = [
  { name: 'Faubourgs envahis', sky: ['#1a1126', '#6b3350', '#e8935a'], neon: '#ff8a5c', tile: '#2c2630', tile2: '#42394a', far: '#3a2a40', near: '#251a2e', win: '#ffd9a0', moon: '#ffe9d0', fire: 0, stars: .1 },
  { name: 'Métro occupé', sky: ['#080c1e', '#1d2c4a', '#4f6f8c'], neon: '#6fd8ff', tile: '#202733', tile2: '#323d4e', far: '#22304a', near: '#141c2e', win: '#bfe8ff', moon: '#e8f4ff', fire: 1, stars: .4 },
  { name: 'Nids souterrains', kind: 'tunnel', sky: ['#04060a', '#0d1620', '#1b2d36'], neon: '#4fffd0', tile: '#1c2228', tile2: '#2d3840', far: '#141e27', near: '#0b1219', win: '#7fffe0', moon: null, fire: 0, stars: 0 },
  { name: 'Jungle contaminée', kind: 'jungle', sky: ['#06140e', '#14402a', '#6bb05a'], neon: '#b6ff4a', tile: '#1f2b1d', tile2: '#314529', far: '#0f2c1b', near: '#0a1d11', win: '#e8ff9a', moon: '#f0ffd0', fire: 0, stars: .25 },
  { name: 'Infrastructures critiques', fleet: 1, sky: ['#0a0508', '#3a1218', '#a33a2a'], neon: '#7dff6a', tile: '#271c1e', tile2: '#3d2c2e', far: '#3a1a1c', near: '#210f12', win: '#ffb27a', moon: '#ffd2b0', fire: 1, stars: .6 },
  { name: 'Vaisseau mère', kind: 'citadel', sky: ['#0b0518', '#2a0f4a', '#7a2a9a'], neon: '#ff5cf0', tile: '#221832', tile2: '#38284e', far: '#2a1646', near: '#180c2e', win: '#ff9af0', moon: '#e8c8ff', fire: 0, stars: .5 }
];

/* ---------- Salles (9 lignes x 18 colonnes, intérieur) ---------- */
const TEMPLATES = [
  ['..................', '..................', '..................', '..................', '..................', '..................', '..................', '..................', '......##....##....'],
  ['..................', '..................', '..................', '..................', '....====..====....', '..................', '..==..........==..', '..................', '........##........'],
  ['..................', '..................', '..................', '.......====.......', '..................', '...===......===...', '..................', '.......####.......', '.......####.......'],
  ['..................', '..................', '..===........===..', '..................', '......=======.....', '..................', '==..............==', '..................', '..................'],
  ['..................', '..................', '..................', '..................', '..................', '.......====.......', '...#..........#...', '...#..........#...', '...##........##...'],
  ['##..............##', '..................', '..................', '....====..====....', '..................', '.........==.......', '..................', '..===........===..', '..................'],
  ['..................', '..................', '..................', '..................', '..................', '.......======.....', '.....==......==...', '...==..........==.', '..................'],
  ['..................', '..................', '...====......====.', '..................', '..................', '.....====..====...', '..................', '==..............==', '..................'],
  ['..................', '..................', '..................', '......########....', '..................', '..................', '..==..........==..', '..................', '......#....#......'],
  ['..................', '..................', '..................', '..................', '...==....==....==.', '..................', '..................', '....#........#....', '....#........#....']
];
const BOSS_ROOM = ['..................', '..................', '..................', '..................', '..................', '..===........===..', '..................', '..................', '..................'];
const FLAT_ROOM = ['..................', '..................', '..................', '..................', '..................', '..................', '..................', '..................', '..................'];

/* ---------- Difficulté, synergies ---------- */
const DIFFS = {
  easy: { name: 'Facile', hp: .75, aggr: .8, bul: .88, bonus: 1, n: 0 },
  normal: { name: 'Normal', hp: 1, aggr: 1, bul: 1, bonus: 0, n: 0 },
  hard: { name: 'Difficile', hp: 1.8, aggr: 1.5, bul: 1.35, bonus: -2, n: 1 }
};
/* ---------- Niveaux : améliorations de châssis (3 au choix à chaque niveau) ---------- */
const RANKS = [[1, 'RECRUE', '#cdb8ee'], [3, 'SOLDAT', '#6fd8ff'], [5, 'VETERAN', '#7dff6a'], [7, 'ELITE', '#ffd23a'], [9, 'LEGENDE', '#ff5cc8']];
const UPGRADES = [
  { id: 'u_dmg', name: 'Calibre supérieur', desc: 'Dégâts +12 %.', col: '#ff6a2a', apply: p => p.st.dmg *= 1.12 },
  { id: 'u_rate', name: 'Gâchette nerveuse', desc: 'Cadence de tir +10 %.', col: '#ffd23a', apply: p => p.st.rate *= 1.1 },
  { id: 'u_spd', name: 'Servos nerveux', desc: 'Vitesse de déplacement +8 %.', col: '#6fd8ff', apply: p => p.st.spd *= 1.08 },
  { id: 'u_hp', name: 'Châssis étoffé', desc: '+1 PV maximum et soigne 1 PV.', col: '#ff5cc8', apply: (p, g) => { p.maxhp++; g.heal(p, 1); } },
  { id: 'u_arm', name: 'Plaques additionnelles', desc: '+1 armure maximum et +1 armure.', col: '#37e0ff', apply: p => { p.armorMax++; p.armor = Math.min(p.armorMax, p.armor + 1); } },
  { id: 'u_crit', name: 'Visée affinée', desc: 'Critiques +7 %.', col: '#ffe38a', apply: p => p.st.crit += .07 },
  { id: 'u_ult', name: 'Réacteur de coup unique', desc: 'Le coup unique se charge +20 % plus vite.', col: '#ffd23a', apply: p => p.st.ultRate *= 1.2 },
  { id: 'u_dash', name: 'Propulseurs jumeaux', desc: '+1 charge d\'esquive.', col: '#ffffff', ok: p => p.dashMax < 3, apply: p => { p.dashMax++; p.dash++; } },
  { id: 'u_mag', name: 'Bobine magnétique', desc: 'Les objets sont attirés de plus loin.', col: '#ffd23a', ok: p => p.st.magnet < 3, apply: p => p.st.magnet++ },
  { id: 'u_jump', name: 'Jambes à ressort', desc: '+1 saut en l\'air.', col: '#7dff6a', ok: p => p.st.jumps < 3, apply: p => p.st.jumps++ },
  { id: 'u_heal', name: 'Réparation de campagne', desc: 'Soigne 3 PV et +2 armure.', col: '#ff5cc8', apply: (p, g) => { g.heal(p, 3); p.armor = Math.min(p.armorMax, p.armor + 2); } },
  { id: 'u_key', name: 'Passe-partout', desc: '+1 clé de caisse.', col: '#e8eef0', ok: p => p.keys < 3, apply: p => p.keys++ }
];
const SYNERGIES = [
  { id: 's_surcharge', name: 'Surcharge', req: ['turbo', 'cart'], desc: 'Dégâts +15 %, cadence +10 %.', apply: p => { p.st.dmg *= 1.15; p.st.rate *= 1.1; } },
  { id: 's_fantome', name: 'Rafale fantôme', req: ['perf', 'ric'], desc: '+1 perforation, +1 ricochet.', apply: p => { p.st.pierce++; p.st.bounce++; } },
  { id: 's_choc', name: 'Onde de choc', req: ['expl', 'ion'], desc: 'Explosions plus larges, recul accru.', apply: p => { p.st.explode += 6; p.st.kb += 1; } },
  { id: 's_essaim', name: 'Essaim', req: ['drone', 'spore'], desc: '+1 drone.', apply: p => p.st.drone++ },
  { id: 's_forteresse', name: 'Forteresse', req: ['regen', 'bouclier'], desc: '+1 bouclier à chaque salle de plus.', apply: p => p.st.regenShield++ },
  { id: 's_sang', name: 'Sang-froid', req: ['vamp', 'chassis'], desc: '+1 PV maximum et soin de 1 PV.', apply: (p, g) => { p.maxhp++; g.heal(p, 1); } },
  { id: 's_toxique', name: 'Zone toxique', req: ['gaz', 'contre'], desc: 'Le nuage toxique s\'étend.', apply: p => p.st.gas++ },
  { id: 's_surtension', name: 'Surtension', req: ['cond', 'megacond'], desc: 'Coup unique +30 %.', apply: p => p.ult = Math.min(100, p.ult + 30) },
  { id: 's_lynx', name: 'Œil de lynx', req: ['lentille', 'thermo'], desc: 'Critiques +15 %.', apply: p => p.st.crit += .15 },
  { id: 's_apesanteur', name: 'Apesanteur', req: ['semelle', 'propul'], desc: '+1 saut en l\'air.', apply: p => p.st.jumps++ }
];
