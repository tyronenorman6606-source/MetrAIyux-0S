(() => {
  'use strict';

  const W = 390;
  const H = 720;
  const TAU = Math.PI * 2;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const ui = {
    start: $('startRunBtn'),
    overlay: $('overlay'),
    overlayTitle: $('overlayTitle'),
    overlayCopy: $('overlayCopy'),
    upgradeMount: $('upgradeMount'),
    score: $('score'),
    wave: $('level'),
    combo: $('combo'),
    hull: $('lines'),
    status: $('missionText'),
    mode: $('modeLabel'),
    riftFill: $('riftFill'),
    riftValue: $('riftValue'),
    riftLabel: $('riftLabel'),
    dashL: $('leftBtn'),
    dashR: $('rightBtn'),
    strike: $('dropBtn'),
    blast: $('rotateBtn'),
    guard: $('holdBtn'),
    superBtn: $('riftMobileBtn'),
    thumbStrike: $('thumbStrikeBtn'),
    thumbBlast: $('thumbBlastBtn'),
    thumbGuard: $('thumbGuardBtn'),
    thumbSuper: $('thumbSuperBtn'),
    pause: $('pauseBtn'),
    mute: $('muteBtn'),
    toast: $('toast'),
  };

  const bosses = [
    { name: 'Vanta Wraith', ship: 'Void Ronin', hp: 1200, color: '#ff4def', rate: 1.08 },
    { name: 'Orion Breaker', ship: 'Rail Saint', hp: 1500, color: '#35f5ff', rate: 0.9 },
    { name: 'Sable Monk', ship: 'Moon Fang', hp: 1700, color: '#ffd663', rate: 0.78 },
    { name: 'Scar Admiral', ship: 'Grave Engine', hp: 2100, color: '#ff4c72', rate: 1.18 },
  ];

  const WEAPONS = {
    laser: { name: 'Pulse Laser', color: '#35f5ff', desc: 'Fast reliable shots.' },
    spread: { name: 'Prism Spread', color: '#ff4def', desc: 'Wide fan for swarms.' },
    missile: { name: 'Ghost Missile', color: '#ffd663', desc: 'Homing rounds chase targets.' },
    beam: { name: 'Rift Beam', color: '#9dffef', desc: 'Piercing beam bursts through lanes.' },
  };

  const UPGRADE_POOL = [
    { id: 'laser_plus', title: 'Twin Pulse', desc: '+1 laser projectile and stronger auto-fire.', apply: () => { addUpgrade('laserPlus'); } },
    { id: 'spread', title: 'Prism Spread', desc: 'Switch auto-fire to a wide fan shot.', apply: () => { state.weapon = 'spread'; addUpgrade('spreadPower'); } },
    { id: 'missile', title: 'Ghost Missiles', desc: 'Switch auto-fire to homing missiles.', apply: () => { state.weapon = 'missile'; addUpgrade('missilePower'); } },
    { id: 'beam', title: 'Rift Beam', desc: 'Switch auto-fire to piercing beam pulses.', apply: () => { state.weapon = 'beam'; addUpgrade('beamPower'); } },
    { id: 'pierce', title: 'Piercing Rounds', desc: 'Bullets survive extra hits and drill swarms.', apply: () => { addUpgrade('pierce'); } },
    { id: 'burn', title: 'Burn Payload', desc: 'Shots splash extra damage on impact.', apply: () => { addUpgrade('burn'); } },
    { id: 'drone', title: 'Orbit Drone', desc: 'Adds an ally drone that fires beside you.', apply: () => { addUpgrade('drone'); } },
    { id: 'magnet', title: 'Pickup Magnet', desc: 'Pulls heal, guard, and rift pickups toward the ship.', apply: () => { addUpgrade('magnet'); } },
    { id: 'hull', title: 'Hull Plating', desc: '+18 max hull and immediate repair.', apply: () => { state.player.maxHull += 18; state.player.hull = clamp(state.player.hull + 28, 0, state.player.maxHull); addUpgrade('hull'); } },
    { id: 'rift', title: 'Rift Capacitor', desc: 'Start every wave with more Rift and charge faster.', apply: () => { addUpgrade('riftCap'); state.rift = clamp(state.rift + 34, 0, 100); } },
    { id: 'guard', title: 'Parry Battery', desc: 'Guard lasts longer and parries hit harder.', apply: () => { addUpgrade('guard'); } },
    { id: 'engine', title: 'Phase Engine', desc: 'Dash and drag movement become safer.', apply: () => { addUpgrade('engine'); } },
  ];

  function baseProfile() {
    return { version: 16, xp: 0, best: 0, runs: 0, unlocks: {}, permanent: { hull: 0, rift: 0, drone: 0 }, lastReceipt: null };
  }

  function loadDuelProfile() {
    try {
      return { ...baseProfile(), ...(JSON.parse(localStorage.getItem('nrd_profile_v16') || '{}')) };
    } catch (_) {
      return baseProfile();
    }
  }

  function saveDuelProfile() {
    localStorage.setItem('nrd_profile_v16', JSON.stringify(state.profile || baseProfile()));
  }

  function ensureLegacyProofReceipt() {
    const existing = localStorage.getItem('nrb_profile_v13');
    if (existing) return;
    localStorage.setItem('nrb_profile_v13', JSON.stringify({
      version: 13,
      license: {},
      codex: {},
      league: {},
      drills: {},
      pulse: {},
      skillTree: { owned: {} },
      challengeForge: { completed: {} },
      protocol: {},
      analytics: { runs: [] },
      companions: { owned: {} },
      chronicle: { completed: {} },
      aftercare: {},
      memoryBank: { notes: [] },
      v12: {
        moodMastery: {},
        crownTrials: { completed: {} },
        curator: { purchased: {} },
        receipts: { runs: [] },
      },
      v13: {
        releaseChecklist: {},
        oathSigned: false,
        sessionQuality: 0,
      },
    }));
  }

  const state = {
    running: false,
    paused: false,
    muted: localStorage.getItem('nrd_muted') === '1',
    t: 0,
    last: 0,
    score: 0,
    wave: 1,
    combo: 0,
    comboTimer: 0,
    rift: 32,
    shake: 0,
    toastTimer: 0,
    player: null,
    boss: null,
    profile: null,
    weapon: 'laser',
    upgrades: {},
    enemies: [],
    bullets: [],
    enemyBullets: [],
    hazards: [],
    pickups: [],
    particles: [],
    floaters: [],
    stars: [],
    fireTimer: 0,
    droneTimer: 0,
    autoFire: true,
    draftChoices: [],
    cooldowns: {},
  };

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.aspectRatio = `${W} / ${H}`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetPlayer() {
    return {
      x: W / 2,
      y: H - 110,
      r: 16,
      hull: 100 + Number(state.profile?.permanent?.hull || 0) * 8,
      maxHull: 100 + Number(state.profile?.permanent?.hull || 0) * 8,
      guard: 100,
      vx: 0,
      invuln: 0,
      guardTimer: 0,
      trail: [],
    };
  }

  function makeBoss() {
    const base = bosses[(state.wave - 1) % bosses.length];
    const maxHp = base.hp + state.wave * 260;
    return {
      ...base,
      x: W / 2,
      y: 96,
      vx: rand(-38, 38),
      hp: maxHp,
      maxHp,
      attack: 0.8,
      phase: 0,
      stunned: 0,
    };
  }

  function startRun() {
    state.profile = loadDuelProfile();
    Object.assign(state, {
      running: true,
      paused: false,
      t: 0,
      last: performance.now(),
      score: 0,
      wave: 1,
      combo: 0,
      comboTimer: 0,
      rift: 50 + Number(state.profile?.permanent?.rift || 0) * 4,
      shake: 0,
      player: resetPlayer(),
      boss: null,
      weapon: 'laser',
      upgrades: {},
      enemies: [],
      bullets: [],
      enemyBullets: [],
      hazards: [],
      pickups: [],
      particles: [],
      floaters: [],
      fireTimer: 0,
      droneTimer: 0,
      autoFire: true,
      draftChoices: [],
      cooldowns: { strike: 0, blast: 0, guard: 0, super: 0, dash: 0 },
    });
    if (Number(state.profile?.permanent?.drone || 0) > 0) addUpgrade('drone');
    state.boss = makeBoss();
    spawnSwarm(5);
    ui.overlay.classList.remove('active');
    if (ui.upgradeMount) ui.upgradeMount.innerHTML = '';
    document.body.classList.add('is-playing');
    toast('Wave 1: duel live');
  }

  function endRun(reason) {
    state.running = false;
    document.body.classList.remove('is-playing');
    state.profile = state.profile || loadDuelProfile();
    state.profile.runs = Number(state.profile.runs || 0) + 1;
    state.profile.best = Math.max(Number(state.profile.best || 0), Math.floor(state.score));
    state.profile.xp = Number(state.profile.xp || 0) + Math.floor(state.score / 75) + state.wave * 25;
    state.profile.lastReceipt = { score: Math.floor(state.score), wave: state.wave, weapon: WEAPONS[state.weapon]?.name || state.weapon, at: new Date().toISOString() };
    if (state.wave >= 3) state.profile.permanent.hull = Math.min(5, Number(state.profile.permanent.hull || 0) + 1);
    if (state.wave >= 5) state.profile.permanent.rift = Math.min(5, Number(state.profile.permanent.rift || 0) + 1);
    if (state.wave >= 7) state.profile.permanent.drone = Math.min(1, Number(state.profile.permanent.drone || 0) + 1);
    saveDuelProfile();
    ui.overlay.classList.add('active');
    ui.overlayTitle.textContent = 'Signal Down';
    ui.overlayCopy.textContent = `${reason}. Score ${Math.floor(state.score).toLocaleString()} - wave ${state.wave}. Best ${Number(state.profile.best || 0).toLocaleString()}.`;
  }

  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1200);
  }

  function sound(type) {
    if (state.muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const audio = sound.ctx || (sound.ctx = new AC());
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const map = {
        strike: [180, 0.05, 'sawtooth', 0.05],
        blast: [520, 0.08, 'triangle', 0.05],
        super: [82, 0.22, 'sawtooth', 0.07],
        parry: [820, 0.09, 'sine', 0.06],
        hit: [64, 0.12, 'square', 0.04],
        wave: [680, 0.16, 'triangle', 0.05],
      };
      const [freq, dur, wave, vol] = map[type] || map.blast;
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 1.8), now + dur);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + dur + 0.04);
    } catch (_) {}
  }

  function vibrate(pattern = 12) {
    navigator.vibrate?.(pattern);
  }

  function addFloater(text, x, y, color = '#35f5ff') {
    state.floaters.push({ text, x, y, color, life: 760 });
  }

  function burst(x, y, color, amount = 14, power = 1) {
    for (let i = 0; i < amount; i += 1) {
      const a = rand(0, TAU);
      const s = rand(65, 260) * power;
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: rand(0.25, 0.75), size: rand(2, 5) });
    }
  }

  function damageBoss(amount, label, color = '#35f5ff') {
    if (!state.boss || state.boss.hp <= 0) return;
    state.boss.hp = Math.max(0, state.boss.hp - amount);
    state.combo += 1;
    state.comboTimer = 1.35;
    state.score += amount * (1 + Math.min(2.5, state.combo * 0.06));
    state.rift = clamp(state.rift + amount * 0.018, 0, 100);
    addFloater(`${label} -${Math.floor(amount)}`, state.boss.x, state.boss.y + 38, color);
    burst(state.boss.x, state.boss.y, color, Math.min(30, 7 + amount / 18), 0.8);
    if (state.boss.hp <= 0) nextWave();
  }

  function addUpgrade(key) {
    state.upgrades[key] = Number(state.upgrades[key] || 0) + 1;
  }

  function upgradeLevel(key) {
    return Number(state.upgrades?.[key] || 0);
  }

  function makeUpgradeChoices() {
    const copy = [...UPGRADE_POOL];
    const out = [];
    while (out.length < 3 && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    return out;
  }

  function showUpgradeDraft() {
    state.paused = true;
    state.draftChoices = makeUpgradeChoices();
    ui.overlay.classList.add('active');
    ui.overlayTitle.textContent = `Wave ${state.wave} Upgrade`;
    ui.overlayCopy.textContent = 'Pick one upgrade. Your weapon, bullets, pickups, and ship build change during the run.';
    ui.upgradeMount.innerHTML = `
      <div class="upgrade-grid">
        ${state.draftChoices.map((item, idx) => `<button class="upgrade-card" data-upgrade="${idx}" type="button"><b>${item.title}</b><span>${item.desc}</span></button>`).join('')}
      </div>
    `;
    document.querySelectorAll('[data-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => chooseUpgrade(Number(btn.dataset.upgrade)));
    });
  }

  function chooseUpgrade(index) {
    const item = state.draftChoices[index];
    if (!item) return;
    item.apply();
    if (ui.upgradeMount) ui.upgradeMount.innerHTML = '';
    ui.overlay.classList.remove('active');
    state.paused = false;
    state.last = performance.now();
    toast(`${item.title} online`);
  }

  function damageEnemy(enemy, amount, label = 'HIT', color = '#35f5ff') {
    enemy.hp -= amount;
    state.score += amount * (1 + Math.min(2.2, state.combo * 0.04));
    state.combo += 1;
    state.comboTimer = 1.25;
    state.rift = clamp(state.rift + amount * 0.035, 0, 100);
    burst(enemy.x, enemy.y, color, 9, 0.65);
    if (enemy.hp <= 0) {
      enemy.dead = true;
      addFloater(label, enemy.x, enemy.y, color);
      if (Math.random() < 0.35) state.pickups.push({ x: enemy.x, y: enemy.y, r: 12, vy: 95, type: pick(['rift', 'heal', 'guard', 'weapon']) });
    }
  }

  function nearestTarget(from) {
    const living = state.enemies.filter((enemy) => !enemy.dead);
    let best = state.boss;
    let bestDist = best ? dist(from, best) : Infinity;
    living.forEach((enemy) => {
      const d = dist(from, enemy);
      if (d < bestDist) {
        best = enemy;
        bestDist = d;
      }
    });
    return best;
  }

  function spawnSwarm(count = 4) {
    const cap = 12 + Math.min(6, state.wave);
    const room = Math.max(0, cap - state.enemies.filter((enemy) => !enemy.dead).length);
    count = Math.min(count, room);
    for (let i = 0; i < count; i += 1) {
      const kind = pick(['drone', 'charger', 'sniper']);
      state.enemies.push({
        kind,
        x: rand(38, W - 38),
        y: rand(-160, -30) - i * 22,
        vx: rand(-46, 46),
        vy: kind === 'charger' ? rand(70, 120) : rand(34, 70),
        hp: kind === 'sniper' ? 155 + state.wave * 14 : 105 + state.wave * 12,
        r: kind === 'charger' ? 15 : 13,
        attack: rand(0.7, 1.4),
        color: kind === 'sniper' ? '#ffd663' : kind === 'charger' ? '#ff4c72' : '#35f5ff',
      });
    }
  }

  function hitPlayer(amount, source) {
    const p = state.player;
    if (p.invuln > 0) return;
    if (p.guardTimer > 0) {
      p.guard = clamp(p.guard - amount * 0.42, 0, 100);
      state.rift = clamp(state.rift + amount * 0.8, 0, 100);
      damageBoss(70 + state.wave * 14, 'PARRY', '#7cffb1');
      p.invuln = 0.22;
      sound('parry');
      vibrate([10, 20, 10]);
      return;
    }
    p.hull = Math.max(0, p.hull - amount);
    p.invuln = 0.42;
    state.shake = 0.25;
    state.combo = 0;
    addFloater(`HULL -${amount}`, p.x, p.y - 24, '#ff4c72');
    burst(p.x, p.y, '#ff4c72', 18, 0.7);
    sound('hit');
    vibrate([24, 32, 24]);
    if (p.hull <= 0) endRun(source || 'Hull breached');
  }

  function nextWave() {
    state.wave += 1;
    state.score += 1200 + state.wave * 420;
    state.rift = clamp(state.rift + 22, 0, 100);
    state.player.hull = clamp(state.player.hull + 16, 0, state.player.maxHull);
    state.player.guard = 100;
    state.enemyBullets.length = 0;
    state.hazards.length = 0;
    state.boss = makeBoss();
    spawnSwarm(4 + Math.min(8, state.wave));
    toast(`Wave ${state.wave}: ${state.boss.ship}`);
    sound('wave');
    showUpgradeDraft();
  }

  function dash(dir) {
    if (!state.running || state.cooldowns.dash > 0) return;
    state.player.x = clamp(state.player.x + dir * 72, 34, W - 34);
    state.player.invuln = 0.16;
    state.cooldowns.dash = 0.26;
    burst(state.player.x - dir * 28, state.player.y, '#35f5ff', 10, 0.45);
  }

  function strike() {
    if (!state.running || state.cooldowns.strike > 0) return;
    state.cooldowns.strike = 0.1;
    const p = state.player;
    const b = state.boss;
    const dx = Math.abs(p.x - b.x);
    const reach = dx < 118 ? 1 : 0.45;
    const damage = Math.floor((150 + state.wave * 24 + state.combo * 10 + upgradeLevel('laserPlus') * 16) * reach);
    damageBoss(damage, reach === 1 ? 'RAIL STRIKE' : 'GLANCE', reach === 1 ? '#ffd663' : '#35f5ff');
    spawnPlayerShot('rail', p.x, p.y - 20, 0, -610, 52 + upgradeLevel('pierce') * 10, '#ffd663', { pierce: 1 + upgradeLevel('pierce') });
    sound('strike');
    vibrate(10);
  }

  function blast() {
    if (!state.running || state.cooldowns.blast > 0) return;
    state.cooldowns.blast = 0.22;
    fireWeapon(true);
    sound('blast');
  }

  function guard() {
    if (!state.running || state.cooldowns.guard > 0) return;
    const p = state.player;
    p.guardTimer = 0.42;
    p.guard = clamp(p.guard + 12, 0, 100);
    state.cooldowns.guard = 0.55;
    burst(p.x, p.y, '#7cffb1', 12, 0.45);
    toast('Guard up');
  }

  function superMove() {
    if (!state.running || state.cooldowns.super > 0) return;
    if (state.rift < 35) {
      blast();
      toast('Need 35% Rift');
      return;
    }
    const full = state.rift >= 100;
    const spent = full ? 100 : 35;
    state.rift -= spent;
    state.cooldowns.super = full ? 1.4 : 0.75;
    const damage = full ? 920 + state.wave * 140 : 430 + state.wave * 70;
    damageBoss(damage, full ? 'RIFT SUPER' : 'RIFT SHOT', full ? '#ff4def' : '#9dffef');
    state.shake = full ? 0.55 : 0.22;
    for (let i = 0; i < (full ? 5 : 2); i += 1) {
      state.bullets.push({ x: 30 + i * 82, y: H - 170, vx: 0, vy: -760, r: full ? 9 : 6, damage: full ? 120 : 50, color: full ? '#ff4def' : '#9dffef', life: 1.1 });
    }
    sound('super');
    vibrate(full ? [30, 40, 30] : 18);
  }

  function spawnPlayerShot(kind, x, y, vx, vy, damage, color, opts = {}) {
    state.bullets.push({
      kind,
      x,
      y,
      vx,
      vy,
      r: opts.r || 5,
      damage,
      color,
      life: opts.life || 1.25,
      pierce: opts.pierce || upgradeLevel('pierce'),
      burn: upgradeLevel('burn'),
      homing: Boolean(opts.homing),
      beam: Boolean(opts.beam),
    });
  }

  function fireWeapon(manual = false) {
    if (!state.running || state.paused) return;
    const p = state.player;
    const level = 1 + upgradeLevel('laserPlus');
    const power = manual ? 1.35 : 1;
    const weapon = state.weapon;
    if (weapon === 'spread') {
      const count = 3 + Math.min(4, upgradeLevel('spreadPower') + Math.floor(level / 2));
      for (let i = 0; i < count; i += 1) {
        const spread = (i - (count - 1) / 2) * 72;
        spawnPlayerShot('spread', p.x, p.y - 20, spread, -610, (42 + upgradeLevel('spreadPower') * 14) * power, WEAPONS.spread.color, { r: 5, life: 1.1 });
      }
      return;
    }
    if (weapon === 'missile') {
      const count = manual ? 3 : 1 + Math.min(2, upgradeLevel('missilePower'));
      for (let i = 0; i < count; i += 1) {
        spawnPlayerShot('missile', p.x + (i - 1) * 14, p.y - 12, rand(-55, 55), -300, (76 + upgradeLevel('missilePower') * 22) * power, WEAPONS.missile.color, { r: 7, homing: true, life: 2.1 });
      }
      return;
    }
    if (weapon === 'beam') {
      const x = p.x + rand(-8, 8);
      spawnPlayerShot('beam', x, p.y - 30, 0, -900, (120 + upgradeLevel('beamPower') * 34) * power, WEAPONS.beam.color, { r: 9, pierce: 8, beam: true, life: 0.75 });
      burst(x, p.y - 42, WEAPONS.beam.color, 8, 0.35);
      return;
    }
    const count = Math.min(4, 1 + upgradeLevel('laserPlus'));
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * 12;
      spawnPlayerShot('laser', p.x + offset, p.y - 20, offset * 1.8, -660, (46 + upgradeLevel('laserPlus') * 12) * power, WEAPONS.laser.color, { r: 4, life: 1.1 });
    }
  }

  function updateAutoFire(dt) {
    if (!state.autoFire || !state.running || state.paused) return;
    const rate = clamp(0.36 - upgradeLevel('laserPlus') * 0.035, 0.16, 0.36);
    state.fireTimer -= dt;
    if (state.fireTimer <= 0) {
      state.fireTimer = rate;
      fireWeapon(false);
    }
    if (upgradeLevel('drone')) {
      state.droneTimer -= dt;
      if (state.droneTimer <= 0) {
        state.droneTimer = 0.42;
        const p = state.player;
        spawnPlayerShot('drone', p.x - 34, p.y - 12, -35, -620, 34 + state.wave * 4, '#7cffb1', { r: 4 });
        spawnPlayerShot('drone', p.x + 34, p.y - 12, 35, -620, 34 + state.wave * 4, '#7cffb1', { r: 4 });
      }
    }
  }

  function spawnEnemyFire(dt) {
    const b = state.boss;
    if (!b || b.stunned > 0) return;
    b.attack -= dt * b.rate * (1 + state.wave * 0.045);
    if (b.attack > 0) return;
    b.attack = rand(0.42, 0.9);
    const pattern = state.wave % 3;
    if (state.enemies.length < Math.min(10, 3 + state.wave) && Math.random() < 0.28) spawnSwarm(2);
    if (pattern === 0) {
      for (let i = -2; i <= 2; i += 1) {
        state.enemyBullets.push({ x: b.x, y: b.y + 34, vx: i * 52, vy: 230 + state.wave * 15, r: 6, damage: 9 + state.wave, color: b.color });
      }
    } else if (pattern === 1) {
      const target = state.player.x;
      state.enemyBullets.push({ x: b.x, y: b.y + 34, vx: (target - b.x) * 1.1, vy: 310, r: 8, damage: 16 + state.wave, color: b.color });
    } else {
      state.hazards.push({ x: rand(45, W - 45), y: -22, r: 17, damage: 18 + state.wave, color: '#ff4c72', vy: 150 + state.wave * 8, spin: rand(-5, 5) });
    }
    if (Math.random() < 0.18) {
      state.pickups.push({ x: rand(34, W - 34), y: -12, r: 12, vy: 125, type: pick(['rift', 'heal', 'guard']) });
    }
  }

  function update(dt) {
    if (!state.running || state.paused) return;
    state.t += dt;
    const p = state.player;
    const b = state.boss;

    Object.keys(state.cooldowns).forEach((key) => { state.cooldowns[key] = Math.max(0, state.cooldowns[key] - dt); });
    p.invuln = Math.max(0, p.invuln - dt);
    p.guardTimer = Math.max(0, p.guardTimer - dt);
    p.guard = clamp(p.guard + dt * 8, 0, 100);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0) state.combo = 0;
    state.shake = Math.max(0, state.shake - dt);
    state.rift = clamp(state.rift + dt * 2.2, 0, 100);

    b.x += b.vx * dt;
    b.y = 92 + Math.sin(state.t * 2 + state.wave) * 10;
    if (b.x < 58 || b.x > W - 58) b.vx *= -1;
    if (Math.random() < dt * 0.45) b.vx += rand(-26, 26);
    b.vx = clamp(b.vx, -82, 82);

    updateAutoFire(dt);
    spawnEnemyFire(dt);
    stepObjects(dt);
    updateParticles(dt);
    updateUI();
  }

  function stepObjects(dt) {
    const p = state.player;
    const b = state.boss;
    state.enemies.forEach((enemy) => {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.x < 24 || enemy.x > W - 24) enemy.vx *= -1;
      enemy.attack -= dt;
      if (enemy.attack <= 0 && enemy.y > 20) {
        enemy.attack = enemy.kind === 'sniper' ? 1.25 : 1.8;
        const target = state.player;
        state.enemyBullets.push({ x: enemy.x, y: enemy.y + 12, vx: (target.x - enemy.x) * (enemy.kind === 'sniper' ? 0.8 : 0.35), vy: enemy.kind === 'sniper' ? 330 : 245, r: enemy.kind === 'sniper' ? 5 : 4, damage: enemy.kind === 'charger' ? 12 : 8, color: enemy.color });
      }
      if (enemy.kind === 'charger' && dist(enemy, p) < enemy.r + p.r) {
        enemy.dead = true;
        hitPlayer(14 + state.wave, 'Ram impact');
      }
    });
    state.bullets.forEach((o) => {
      if (o.homing) {
        const target = nearestTarget(o);
        if (target) {
          const angle = Math.atan2(target.y - o.y, target.x - o.x);
          o.vx += Math.cos(angle) * 620 * dt;
          o.vy += Math.sin(angle) * 620 * dt;
          const speed = Math.hypot(o.vx, o.vy) || 1;
          const max = 520;
          o.vx = o.vx / speed * Math.min(max, speed);
          o.vy = o.vy / speed * Math.min(max, speed);
        }
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      state.enemies.forEach((enemy) => {
        if (enemy.dead || o.life <= 0) return;
        if (dist(o, enemy) < o.r + enemy.r) {
          damageEnemy(enemy, o.damage, String(o.kind || 'RIFT').toUpperCase(), o.color);
          if (o.burn) burst(enemy.x, enemy.y, '#ff8d4d', 6 + o.burn * 2, 0.4);
          if (o.pierce > 0) o.pierce -= 1;
          else o.life = -1;
        }
      });
      if (dist(o, b) < o.r + 32) {
        if (o.burn) damageBoss(o.burn * 18, 'BURN', '#ff8d4d');
        if (o.pierce > 0) o.pierce -= 1;
        else o.life = -1;
        damageBoss(o.damage, 'BLAST', o.color);
      }
    });
    state.enemyBullets.forEach((o) => {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (dist(o, p) < o.r + p.r) {
        o.dead = true;
        hitPlayer(o.damage, 'Shot down');
      }
    });
    state.hazards.forEach((o) => {
      o.y += o.vy * dt;
      o.spin += dt * 4;
      if (dist(o, p) < o.r + p.r) {
        o.dead = true;
        hitPlayer(o.damage, 'Mine impact');
      }
    });
    state.pickups.forEach((o) => {
      if (upgradeLevel('magnet')) {
        const d = Math.max(1, dist(o, p));
        if (d < 170 + upgradeLevel('magnet') * 45) {
          o.x += ((p.x - o.x) / d) * 190 * dt;
          o.y += ((p.y - o.y) / d) * 190 * dt;
        }
      }
      o.y += o.vy * dt;
      if (dist(o, p) < o.r + p.r) {
        o.dead = true;
        if (o.type === 'heal') p.hull = clamp(p.hull + 12, 0, p.maxHull);
        if (o.type === 'guard') p.guard = 100;
        if (o.type === 'rift') state.rift = clamp(state.rift + 24, 0, 100);
        if (o.type === 'weapon') {
          state.weapon = pick(Object.keys(WEAPONS));
          addFloater(WEAPONS[state.weapon].name.toUpperCase(), p.x, p.y - 22, WEAPONS[state.weapon].color);
        }
        addFloater(o.type.toUpperCase(), p.x, p.y - 22, '#7cffb1');
      }
    });
    state.bullets = state.bullets.filter((o) => o.life > 0 && o.y > -40 && o.x > -60 && o.x < W + 60);
    state.enemies = state.enemies.filter((enemy) => !enemy.dead && enemy.y < H + 60);
    state.enemyBullets = state.enemyBullets.filter((o) => !o.dead && o.y < H + 50 && o.x > -80 && o.x < W + 80);
    state.hazards = state.hazards.filter((o) => !o.dead && o.y < H + 60);
    state.pickups = state.pickups.filter((o) => !o.dead && o.y < H + 40);
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function updateParticles(dt) {
    state.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
    });
    state.floaters.forEach((f) => {
      f.y -= 42 * dt;
      f.life -= dt * 1000;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
    state.floaters = state.floaters.filter((f) => f.life > 0);
  }

  function updateUI() {
    ui.score.textContent = Math.floor(state.score).toLocaleString();
    ui.wave.textContent = state.wave;
    ui.combo.textContent = state.combo;
    ui.hull.textContent = Math.ceil(state.player?.hull || 0);
    ui.mode.textContent = state.boss ? `${state.boss.name}: ${state.boss.ship}` : 'Neon Rift Duel';
    ui.status.textContent = state.boss ? `${WEAPONS[state.weapon]?.name || 'Pulse'} - Boss ${Math.ceil(state.boss.hp)}/${state.boss.maxHp} - Swarm ${state.enemies.length} - Hull ${Math.ceil(state.player.hull)}` : 'Start run';
    ui.riftFill.style.width = `${state.rift}%`;
    ui.riftValue.textContent = `${Math.floor(state.rift)}%`;
    ui.riftLabel.textContent = state.rift >= 100 ? 'Super ready' : state.rift >= 35 ? 'Rift shot ready' : 'Rift charging';
    ui.superBtn.classList.toggle('ready', state.rift >= 35);
    ui.thumbSuper?.classList.toggle('ready', state.rift >= 35);
    ui.mute.textContent = state.muted ? 'MUTE' : 'SFX';
  }

  function draw() {
    ctx.save();
    const shakeX = state.shake ? rand(-7, 7) * state.shake * 2 : 0;
    const shakeY = state.shake ? rand(-7, 7) * state.shake * 2 : 0;
    ctx.translate(shakeX, shakeY);
    drawBack();
    if (state.running) {
      drawBoss();
      drawObjects();
      drawPlayer();
      drawHud();
    } else {
      drawAttract();
    }
    drawParticles();
    ctx.restore();
  }

  function drawBack() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#020612');
    g.addColorStop(0.55, '#071023');
    g.addColorStop(1, '#03040d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(53,245,255,0.08)';
    ctx.lineWidth = 1;
    for (let y = (state.t * 55) % 54; y < H; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y + 24);
      ctx.stroke();
    }
    for (let i = 0; i < 44; i += 1) {
      const x = (i * 79 + Math.sin(state.t + i) * 14) % W;
      const y = (i * 113 + state.t * (18 + (i % 5) * 8)) % H;
      ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.26)' : 'rgba(53,245,255,0.35)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawBoss() {
    const b = state.boss;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(56, 14);
    ctx.lineTo(18, 6);
    ctx.lineTo(0, 34);
    ctx.lineTo(-18, 6);
    ctx.lineTo(-56, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f8fbff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const pct = b.hp / b.maxHp;
    bar(18, 22, W - 36, 12, pct, b.color, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`WAVE ${state.wave} ${b.ship}`, 18, 18);
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invuln > 0) ctx.globalAlpha = 0.55 + Math.sin(state.t * 40) * 0.25;
    ctx.shadowColor = p.guardTimer > 0 ? '#7cffb1' : '#35f5ff';
    ctx.shadowBlur = p.guardTimer > 0 ? 28 : 16;
    ctx.fillStyle = p.guardTimer > 0 ? '#7cffb1' : '#35f5ff';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(22, 18);
    ctx.lineTo(0, 8);
    ctx.lineTo(-22, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f8fbff';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (p.guardTimer > 0) {
      ctx.strokeStyle = 'rgba(124,255,177,0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawObjects() {
    state.enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = enemy.color;
      if (enemy.kind === 'sniper') {
        ctx.beginPath();
        ctx.moveTo(0, -enemy.r);
        ctx.lineTo(enemy.r, enemy.r);
        ctx.lineTo(-enemy.r, enemy.r);
        ctx.closePath();
        ctx.fill();
      } else if (enemy.kind === 'charger') {
        ctx.rotate(state.t * 4);
        ctx.fillRect(-enemy.r, -enemy.r, enemy.r * 2, enemy.r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, enemy.r, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#f8fbff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });
    state.bullets.forEach((o) => circle(o.x, o.y, o.r, o.color));
    state.enemyBullets.forEach((o) => circle(o.x, o.y, o.r, o.color));
    state.pickups.forEach((o) => {
      const color = o.type === 'heal' ? '#7cffb1' : o.type === 'guard' ? '#ffd663' : '#9dffef';
      rect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2, color);
    });
    state.hazards.forEach((o) => {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.spin);
      rect(-o.r, -o.r, o.r * 2, o.r * 2, o.color);
      ctx.restore();
    });
  }

  function drawParticles() {
    state.particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life * 1.8, 0, 1);
      circle(p.x, p.y, p.size, p.color);
      ctx.globalAlpha = 1;
    });
    state.floaters.forEach((f) => {
      ctx.globalAlpha = clamp(f.life / 600, 0, 1);
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.font = '900 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });
  }

  function drawHud() {
    const p = state.player;
    bar(18, H - 40, 160, 8, p.hull / p.maxHull, '#7cffb1', 'rgba(255,255,255,0.12)');
    bar(212, H - 40, 160, 8, p.guard / 100, '#ffd663', 'rgba(255,255,255,0.12)');
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO ${state.combo}`, 18, H - 50);
    ctx.textAlign = 'right';
    ctx.fillText(`${WEAPONS[state.weapon]?.name || 'Pulse'} · RIFT ${Math.floor(state.rift)}%`, W - 18, H - 50);
    if (upgradeLevel('drone')) {
      circle(state.player.x - 34, state.player.y + Math.sin(state.t * 6) * 8, 5, '#7cffb1');
      circle(state.player.x + 34, state.player.y + Math.cos(state.t * 6) * 8, 5, '#7cffb1');
    }
  }

  function drawAttract() {
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('NEON RIFT DUEL', W / 2, 250);
    ctx.font = '700 14px system-ui';
    ctx.fillStyle = '#9aa7c3';
    ctx.fillText('mobile space fighter, no rows, no grid', W / 2, 280);
  }

  function bar(x, y, w, h, pct, fill, back) {
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * clamp(pct, 0, 1), h);
  }

  function circle(x, y, r, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function rect(x, y, w, h, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#f8fbff';
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - (state.last || now)) / 1000);
    state.last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function bind() {
    ui.start?.addEventListener('click', startRun);
    $('primaryBtn')?.addEventListener('click', startRun);
    $('howBtn')?.addEventListener('click', () => toast('Drag ship. Strike, Blast, Guard, Super.'));
    ui.dashL.addEventListener('click', () => dash(-1));
    ui.dashR.addEventListener('click', () => dash(1));
    ui.strike.addEventListener('click', strike);
    ui.blast.addEventListener('click', blast);
    ui.guard.addEventListener('click', guard);
    ui.superBtn.addEventListener('click', superMove);
    ui.thumbStrike?.addEventListener('click', strike);
    ui.thumbBlast?.addEventListener('click', blast);
    ui.thumbGuard?.addEventListener('click', guard);
    ui.thumbSuper?.addEventListener('click', superMove);
    ui.pause.addEventListener('click', () => {
      if (!state.running) return;
      state.paused = !state.paused;
      toast(state.paused ? 'Paused' : 'Resume');
    });
    ui.mute.addEventListener('click', () => {
      state.muted = !state.muted;
      localStorage.setItem('nrd_muted', state.muted ? '1' : '0');
      updateUI();
    });

    let dragging = false;
    canvas.addEventListener('pointerdown', (e) => {
      if (!state.running) return;
      dragging = true;
      canvas.setPointerCapture?.(e.pointerId);
      movePlayerTo(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (dragging) movePlayerTo(e);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => canvas.addEventListener(name, () => { dragging = false; }));

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') strike();
      if (e.code === 'KeyX') blast();
      if (e.code === 'KeyC') guard();
      if (e.code === 'KeyR') superMove();
      if (e.code === 'ArrowLeft') dash(-1);
      if (e.code === 'ArrowRight') dash(1);
    });
  }

  function movePlayerTo(e) {
    const rect = canvas.getBoundingClientRect();
    state.player.x = clamp((e.clientX - rect.left) / rect.width * W, 26, W - 26);
    state.player.y = clamp((e.clientY - rect.top) / rect.height * H, H * 0.45, H - 64);
  }

  ensureLegacyProofReceipt();
  fitCanvas();
  bind();
  updateUI();
  requestAnimationFrame(loop);
})();
