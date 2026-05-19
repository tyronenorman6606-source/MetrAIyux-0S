(() => {
  'use strict';

  const SAVE_KEY = 'skyearcade.sovereignVault.v1';
  const BACKUP_KEY = 'skyearcade.sovereignVault.backup.v1';
  const VERSION = '1.8.0';
  const app = document.getElementById('app');
  const cardTemplate = document.getElementById('card-template');
  let activeCleanup = null;
  let activeGameId = null;
  let activeRunAwards = new Set();
  let activeRunMeta = { level: 1, source: 'quickplay' };
  let deferredInstallPrompt = null;

  const achievements = {
    firstLaunch: ['Vault Opened', 'Open the Sovereign Vault.'],
    firstWin: ['First Crown', 'Win any game in the vault.'],
    skyeaceWin: ['Ace Ascendant', 'Win a SkyeAce battle.'],
    uptimeWin: ['Zero Downtime', 'Survive Uptime War.'],
    dnsWin: ['Route Sovereign', 'Solve DNS Dominion.'],
    releaseWin: ['Production Crowned', 'Ship a release in SceptR.'],
    reliquaryWin: ['Artifact Secured', 'Escape the Reliquary.'],
    koatsuWin: ['Pressure Awakened', 'Defeat the pressure boss.'],
    leadsWin: ['Closer Bloodline', 'Hit the Lead Hunter revenue goal.'],
    caseWin: ['Desk Under Control', 'Clear the NorthStar desk.'],
    osWin: ['Desktop Initiate', 'Complete SkyeOS Desktop Quest.'],
    vantaWin: ['Operator Crown', 'Keep every VantaCore client alive.'],
    tripleCrown: ['Triple Crown', 'Win any three games in the vault.'],
    fullVault: ['Full Vault Conqueror', 'Win all ten vault games on this browser.'],
    saveExporter: ['Archive Keeper', 'Export or import a vault save.'],
    contractClear: ['Contract Crown', 'Complete today\'s three-game vault contract.'],
    fiveWins: ['Five-Win Heat', 'Record five total wins across the vault.'],
    recordKeeper: ['Record Keeper', 'Set or improve any best-record stat.'],
    gauntletClear: ['Gauntlet Crown', 'Win all five games in a Vault Gauntlet route.'],
    pressureCrown: ['Pressure Mode Crown', 'Win any game while Pressure Mode is enabled.'],
    masteryFirst: ['First Mastery Sigil', 'Win the same game three times.'],
    loreKeeper: ['Lore Vault Unsealed', 'Unlock five lore codex cards.'],
    firstRelic: ['First Relic Forged', 'Buy any Vault Relic from the Armory.'],
    fullArmory: ['Armory Complete', 'Own every Vault Relic.'],
    tenMastery: ['Tenfold Mastery', 'Earn mastery sigils in all ten vault games.'],
    gauntletPressureClear: ['Pressure Gauntlet Crown', 'Complete a Vault Gauntlet while Pressure Mode is enabled.'],
    crownTrialClear: ['Crown Trial Ascendant', 'Clear all ten games in one Crown Trial run.'],
    crownTrialSovereign: ['Sovereign Crown Trial', 'Clear a Crown Trial on Sovereign difficulty.'],
    tutorialScholar: ['Vault Scholar', 'View every game tutorial once.'],
    bossSlayer: ['Boss Slayer', 'Defeat any named vault boss.'],
    bossCleanSweep: ['Boss Clean Sweep', 'Defeat all ten named vault bosses.'],
    runHistorian: ['Run Historian', 'Record twenty local run-history entries.'],
    shareCrafter: ['Share Card Forged', 'Generate a victory share card.'],
    saveRecovered: ['Reliquary Recovery', 'Recover a vault save from the local backup slot.'],
    nightmareCrown: ['Nightmare Crown', 'Win any game on Nightmare difficulty.'],
    sovereignCrown: ['Sovereign Crown', 'Win any game on Sovereign difficulty.'],
    campaignStep: ['Campaign Route Opened', 'Advance the cinematic Vault Map campaign.'],
    campaignClear: ['Vault Map Conqueror', 'Clear the tenth campaign node.'],
    levelPackFirst: ['Level Pack Crown', 'Clear any staged level pack mission.'],
    levelPackFull: ['Ten Door Level One Sweep', 'Clear level one across all ten vault doors.'],
    cosmeticFirst: ['First Cosmetic Forged', 'Buy any cosmetic from the Vault Shop.'],
    cosmeticEquipped: ['Signature Equipped', 'Equip a cosmetic visual signature.'],
    saveSlotUsed: ['Save Slot Locked', 'Store progress into any named save slot.'],
    analyticsOpened: ['Vault Analyst', 'Open the Vault Analytics console.'],
    onboardingComplete: ['Profile Initiated', 'Complete the local first-launch setup.'],
    streakThree: ['Three-Day Return', 'Open the vault on three consecutive days.'],
    streakSeven: ['Seven-Day Sovereign', 'Open the vault on seven consecutive days.'],
    weeklyConquestClear: ['Weekly Conquest Crown', 'Complete every weekly conquest target.'],
    firstPrestige: ['Prestige Crown I', 'Ascend the vault into Crown Rank 1.'],
    prestigeThree: ['Triple Prestige Crown', 'Reach Crown Rank 3.'],
    commandCenterOpened: ['Command Center Online', 'Use the Vault Command Center.'],
    dailyRewardClaimed: ['Daily Reliquary Claimed', 'Claim a daily local reward chest.'],
    bridgeEvent: ['Bridge Signal Fired', 'Emit a local vault event for upstream platform integration.'],
    engagementEngine: ['Irreplaceable Engine', 'Touch streaks, weekly conquest, command center, and prestige systems.']
  };

  const games = [
    {
      id: 'skyeace', number: '01', title: 'SkyeAce: Battle Spades Arena', genre: 'Card Battler', accent: 'rgba(248,233,161,.48)', logo: 'assets/game-logos/skyeace.svg',
      summary: 'Spades-style trick combat with HP, suits, arena pressure, and real win/loss rounds.',
      meta: 'Cards · HP · Saved streak', start: startSkyeAce
    },
    {
      id: 'uptime', number: '02', title: 'SoveReign13: Uptime War', genre: 'Cyber Tower Defense', accent: 'rgba(103,232,249,.42)', logo: 'assets/game-logos/uptime.svg',
      summary: 'Place nodes, shoot bot waves, protect the origin core, and survive production pressure.',
      meta: 'Canvas · Waves · Towers', start: startUptimeWar
    },
    {
      id: 'dns', number: '03', title: 'Veyra3.1: DNS Dominion', genre: 'Routing Puzzle', accent: 'rgba(110,231,183,.44)', logo: 'assets/game-logos/dns.svg',
      summary: 'Build a live traffic route from domain to origin while avoiding latency hazards.',
      meta: 'Puzzle · BFS validation', start: startDnsDominion
    },
    {
      id: 'scepter', number: '04', title: 'SceptR: Release Commander', genre: 'Deploy Roguelike', accent: 'rgba(251,146,60,.46)', logo: 'assets/game-logos/scepter.svg',
      summary: 'Draw command cards, fight build errors, repair stability, and ship production.',
      meta: 'Cards · Stages · Boss', start: startScepter
    },
    {
      id: 'reliquary', number: '05', title: 'Reliquary: Artifact Runner', genre: 'Extraction Grid Crawl', accent: 'rgba(192,132,252,.46)', logo: 'assets/game-logos/reliquary.svg',
      summary: 'Recover artifacts from a collapsing vault and reach the rollback gate alive.',
      meta: 'Grid · Extraction · HP', start: startReliquary
    },
    {
      id: 'koatsu', number: '06', title: 'Kōatsu Seija: Pressure Awakened', genre: 'Side-Scrolling Combat', accent: 'rgba(255,77,125,.48)', logo: 'assets/game-logos/koatsu.svg',
      summary: 'Run, jump, strike, collect pressure shards, and break the mirror boss.',
      meta: 'Canvas · Combat · Boss', start: startKoatsu
    },
    {
      id: 'leads', number: '07', title: 'Skyes Over London: Lead Hunter', genre: 'Agency Roguelite', accent: 'rgba(59,130,246,.42)', logo: 'assets/game-logos/leads.svg',
      summary: 'Prospect, qualify, close, fulfill, hire AEs, manage stress, and hit the revenue goal.',
      meta: 'Turns · Money · Reputation', start: startLeadHunter
    },
    {
      id: 'caseDesk', number: '08', title: 'NorthStar: Case Desk', genre: 'Ops Matching Game', accent: 'rgba(250,204,21,.42)', logo: 'assets/game-logos/caseDesk.svg',
      summary: 'Match documents to client cases before deadlines wreck trust.',
      meta: 'Timer · Matching · Trust', start: startCaseDesk
    },
    {
      id: 'desktopQuest', number: '09', title: 'SkyeOS: Desktop Quest', genre: 'Desktop Adventure', accent: 'rgba(168,85,247,.45)', logo: 'assets/game-logos/desktopQuest.svg',
      summary: 'Boot the luxury desktop, open apps, solve terminal/file/browser missions, unlock the module.',
      meta: 'Apps · Missions · Puzzles', start: startDesktopQuest
    },
    {
      id: 'vanta', number: '10', title: 'VantaCore: Operator Wars', genre: 'Automation Strategy', accent: 'rgba(45,212,191,.43)', logo: 'assets/game-logos/vanta.svg',
      summary: 'Configure operators, handle business chaos, protect clients, and prevent churn.',
      meta: 'Turns · Assignment · Churn', start: startVantaCore
    }
  ];


  const difficultyTiers = {
    normal: { name: 'Normal', rank: 0, reward: 1, copy: 'Standard rules for clean playable runs.' },
    pressure: { name: 'Pressure', rank: 1, reward: 1.15, copy: 'Harder resources, tighter limits, better rewards.' },
    nightmare: { name: 'Nightmare', rank: 2, reward: 1.35, copy: 'Punishing starts, faster collapse windows, strong rewards.' },
    sovereign: { name: 'Sovereign', rank: 3, reward: 1.65, copy: 'The full crown route. Brutal rules, maximum reward weight.' }
  };

  const bossBook = {
    skyeace: { name: 'The Blind Dealer', copy: 'Reads the table and punishes careless trump timing.' },
    uptime: { name: 'The Blackout Swarm', copy: 'Floods the origin with pressure-wave outages.' },
    dns: { name: 'The Latency Serpent', copy: 'Coils around routes and eats spare moves.' },
    scepter: { name: 'The 404 Hydra', copy: 'Each broken deploy head returns hotter than before.' },
    reliquary: { name: 'The Deletion Warden', copy: 'Turns backup vaults into extraction traps.' },
    koatsu: { name: 'The Mirror', copy: 'Forces the awakened form to fight its own pressure.' },
    leads: { name: 'The Ghost Client', copy: 'Consumes outreach time while refusing closure.' },
    caseDesk: { name: 'The Deadline Court', copy: 'Weaponizes paperwork, trust, and late filings.' },
    desktopQuest: { name: 'The Kernel Phantom', copy: 'Hides inside the operating surface and corrupts missions.' },
    vanta: { name: 'The Churn Engine', copy: 'Turns unresolved chaos into client loss.' }
  };

  const tutorials = {
    skyeace: ['Pick the strongest card exchange.', 'Spades add trump power and extra damage.', 'Focus Draw upgrades weak cards into pressure cards.', 'Win by breaking Rival House HP before yours collapses.'],
    uptime: ['Click grid cells to place defense nodes.', 'Start waves only when you have enough coverage.', 'Upgrade nodes near enemy lanes.', 'Protect the origin core through every wave.'],
    dns: ['Build a connected route from DOMAIN to ORIGIN.', 'Avoid hazard tiles unless the move trade is worth it.', 'Trace Safe Lane clears one safer corridor.', 'Finish before your move budget collapses.'],
    scepter: ['Use command cards to reduce deploy errors.', 'Watch heat and stability together.', 'Vent heat or rollback before collapse.', 'Ship all stages to crown production.'],
    reliquary: ['Move through the vault grid with direction buttons.', 'Collect all artifacts before entering the gate.', 'Use Scanner Pulse to reveal hazards.', 'Escape alive after securing the required relics.'],
    koatsu: ['Move, jump, and strike through pressure waves.', 'Collect shards to strengthen the run record.', 'Avoid enemy contact and boss pressure.', 'Break the boss HP to awaken the crown.'],
    leads: ['Prospect creates pipeline.', 'Qualify improves close quality.', 'Close converts pipeline into money.', 'Fulfill controls stress before it breaks operations.'],
    caseDesk: ['Select a client case first.', 'Choose the matching document type.', 'Wrong matches damage trust.', 'Clear the target queue before the deadline.'],
    desktopQuest: ['Open each desktop app from the dock.', 'Complete terminal, files, and browser missions.', 'Use mail as the status checklist.', 'Complete all missions to unlock the module.'],
    vanta: ['Read the incident type.', 'Assign the matching operator lane.', 'Upgrade operators with earned tokens.', 'Keep churn below the limit through turn ten.']
  };


  const campaignRoute = games.map((game, index) => ({
    gameId: game.id,
    node: index + 1,
    gate: index === 0 ? 'Entry Gate' : `${index} prior crown${index > 1 ? 's' : ''}`,
    doctrine: [
      'Learn the table before forcing the crown.',
      'Hold the origin while the swarm tests your routing.',
      'Trace clean routes under pressure.',
      'Ship production while the release room heats up.',
      'Recover the artifact before collapse becomes permanent.',
      'Turn pressure into awakened movement.',
      'Close the business loop without burning fulfillment.',
      'Clear the desk before trust bleeds out.',
      'Boot the system and prove every app has purpose.',
      'Keep the operators alive through client chaos.'
    ][index] || game.summary
  }));

  const levelPacks = Object.fromEntries(games.map((game, index) => [game.id, Array.from({ length: 5 }, (_, levelIndex) => ({
    level: levelIndex + 1,
    title: ['Initiation', 'Pressure Gate', 'Boss Current', 'Night Run', 'Sovereign Seal'][levelIndex],
    modifier: ['Baseline rules.', 'Tighter resources.', 'Boss-grade pressure.', 'Nightmare-grade pacing.', 'Sovereign-grade reward.'][levelIndex],
    unlockWins: levelIndex === 0 ? 0 : levelIndex
  }))]));

  const cosmetics = [
    { id: 'obsidianGold', name: 'Obsidian Gold Aura', cost: 90, tag: 'Theme', desc: 'Warms the vault with gold edge-lighting and crown sparks.', className: 'cosmetic-obsidian-gold' },
    { id: 'violetStorm', name: 'Violet Storm Pulse', cost: 120, tag: 'Theme', desc: 'Adds electric violet storm pressure to panels and game stages.', className: 'cosmetic-violet-storm' },
    { id: 'cyanTrace', name: 'Cyan Trace Grid', cost: 110, tag: 'Theme', desc: 'Adds routing-grid sheen for Veyra and SoveReign energy.', className: 'cosmetic-cyan-trace' },
    { id: 'pressureBloom', name: 'Pressure Bloom Trail', cost: 140, tag: 'Signature', desc: 'Adds awakened pressure blooms to campaign and victory surfaces.', className: 'cosmetic-pressure-bloom' },
    { id: 'reliquaryGlass', name: 'Reliquary Glass Seal', cost: 160, tag: 'Signature', desc: 'Adds archival glass highlights to cards, relics, and overlays.', className: 'cosmetic-reliquary-glass' }
  ];

  const relics = [
    {
      id: 'aceMantle',
      name: 'Ace Mantle',
      cost: 120,
      tag: 'SkyeAce',
      desc: 'SkyeAce starts with more HP, more Focus Draw pressure, and stronger spade hits.'
    },
    {
      id: 'originAegis',
      name: 'Origin Aegis',
      cost: 150,
      tag: 'Uptime',
      desc: 'Uptime War starts with extra energy and a tougher origin core.'
    },
    {
      id: 'veyraCompass',
      name: 'Veyra Compass',
      cost: 100,
      tag: 'DNS',
      desc: 'DNS Dominion gains extra moves and cheaper Trace Safe Lane usage.'
    },
    {
      id: 'reliquaryBeacon',
      name: 'Reliquary Beacon',
      cost: 120,
      tag: 'Extraction',
      desc: 'Reliquary runs start with an extra HP and another Scanner Pulse.'
    },
    {
      id: 'operatorMomentum',
      name: 'Operator Momentum',
      cost: 180,
      tag: 'Vault-wide',
      desc: 'All crowns pay more XP and coins; Lead Hunter starts with stronger operator rhythm.'
    }
  ];

  const defaultState = () => ({
    version: VERSION,
    profile: 'Operator',
    xp: 0,
    coins: 0,
    wins: 0,
    settings: { motion: true, sound: false, pressure: false, difficulty: 'normal', tutorials: true },
    achievements: {},
    gameSaves: {},
    contracts: { date: '', targets: [], completed: {} },
    gauntlet: { active: false, date: '', route: [], index: 0, wins: 0, completedAt: 0 },
    crownTrial: { active: false, route: [], index: 0, lives: 0, relicId: '', pendingChoice: false, completedAt: 0, collapsedAt: 0, modifiers: [] },
    armory: {},
    bossChallenge: '',
    bossWins: {},
    tutorialsSeen: {},
    runHistory: [],
    recent: [],
    campaign: { unlocked: 1, completed: {}, selectedLevel: 1, onboardingComplete: false, analyticsOpenedAt: 0 },
    cosmetics: {},
    equippedCosmetic: '',
    saveSlots: {},
    streak: { lastDay: '', current: 0, best: 0, rewardClaimed: '' },
    weeklyConquest: { week: '', targets: [], completed: {} },
    prestige: { rank: 0, history: [] },
    commandCenterOpenedAt: 0,
    pwa: { installed: false, promptSeenAt: 0 }
  });

  let state = loadState();
  ensureDailyContract(false);
  ensureV16State();

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...parsed,
        settings: normalizeSettings(parsed.settings || {}),
        achievements: parsed.achievements || {},
        gameSaves: parsed.gameSaves || {},
        contracts: parsed.contracts || { date: '', targets: [], completed: {} },
        gauntlet: parsed.gauntlet || { active: false, date: '', route: [], index: 0, wins: 0, completedAt: 0 },
        crownTrial: parsed.crownTrial || { active: false, route: [], index: 0, lives: 0, relicId: '', pendingChoice: false, completedAt: 0, collapsedAt: 0, modifiers: [] },
        armory: parsed.armory || {},
        bossChallenge: parsed.bossChallenge || '',
        bossWins: parsed.bossWins || {},
        tutorialsSeen: parsed.tutorialsSeen || {},
        runHistory: Array.isArray(parsed.runHistory) ? parsed.runHistory.slice(0, 20) : [],
        recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, 5) : [],
        campaign: normalizeCampaign(parsed.campaign || {}, parsed.gameSaves || {}),
        cosmetics: parsed.cosmetics || {},
        equippedCosmetic: parsed.equippedCosmetic || '',
        saveSlots: parsed.saveSlots || {}
      };
    } catch (error) {
      console.warn('Save load failed, attempting backup recovery.', error);
      const backup = loadBackupState();
      return backup || defaultState();
    }
  }

  function normalizeSettings(settings = {}) {
    const clean = { ...defaultState().settings, ...settings };
    if (!difficultyTiers[clean.difficulty]) clean.difficulty = clean.pressure ? 'pressure' : 'normal';
    clean.pressure = clean.difficulty !== 'normal';
    clean.tutorials = clean.tutorials !== false;
    return clean;
  }

  function loadBackupState() {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed, version: VERSION, settings: normalizeSettings(parsed.settings || {}), campaign: normalizeCampaign(parsed.campaign || {}, parsed.gameSaves || {}) };
    } catch { return null; }
  }

  function persist() {
    try {
      const current = localStorage.getItem(SAVE_KEY);
      if (current) localStorage.setItem(BACKUP_KEY, current);
      state.version = VERSION;
      state.settings = normalizeSettings(state.settings || {});
      state.campaign = normalizeCampaign(state.campaign || {}, state.gameSaves || {});
      state.cosmetics = state.cosmetics || {};
      state.saveSlots = state.saveSlots || {};
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (error) { console.warn('Save failed', error); }
  }



  function normalizeCampaign(campaign = {}, gameSaves = {}) {
    const completed = campaign.completed && typeof campaign.completed === 'object' ? campaign.completed : {};
    const saves = gameSaves || {};
    const unlockedFromWins = Math.max(1, Math.min(games.length, games.filter((game, index) => index === 0 || ((saves[games[index - 1]?.id] || {}).wins || 0) > 0).length));
    const unlocked = clamp(Number(campaign.unlocked || unlockedFromWins || 1), 1, games.length);
    return {
      unlocked,
      completed,
      selectedLevel: clamp(Number(campaign.selectedLevel || 1), 1, 5),
      onboardingComplete: Boolean(campaign.onboardingComplete),
      analyticsOpenedAt: Number(campaign.analyticsOpenedAt || 0)
    };
  }

  function ensureV16State() {
    state.campaign = normalizeCampaign(state.campaign || {}, state.gameSaves || {});
    state.cosmetics = state.cosmetics || {};
    state.saveSlots = state.saveSlots || {};
    state.equippedCosmetic = state.equippedCosmetic || '';
    state.streak = { ...defaultState().streak, ...(state.streak || {}) };
    state.weeklyConquest = normalizeWeeklyConquest(state.weeklyConquest || {});
    state.prestige = { ...defaultState().prestige, ...(state.prestige || {}) };
    if (!Array.isArray(state.prestige.history)) state.prestige.history = [];
    state.commandCenterOpenedAt = Number(state.commandCenterOpenedAt || 0);
    state.pwa = { ...defaultState().pwa, ...(state.pwa || {}) };
    return state;
  }

  function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function daysBetween(fromKey, toKey) {
    if (!fromKey || !toKey) return 99;
    const from = new Date(`${fromKey}T00:00:00Z`).getTime();
    const to = new Date(`${toKey}T00:00:00Z`).getTime();
    return Math.round((to - from) / 86400000);
  }

  function weekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  function seededHash(text) {
    return String(text).split('').reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0);
  }

  function normalizeWeeklyConquest(weekly = {}) {
    const key = weekKey();
    if (weekly.week !== key || !Array.isArray(weekly.targets) || !weekly.targets.length) {
      return { week: key, targets: buildWeeklyTargets(key), completed: {} };
    }
    return { week: key, targets: weekly.targets, completed: weekly.completed || {} };
  }

  function buildWeeklyTargets(key = weekKey()) {
    const ordered = [...games].sort((a, b) => seededHash(`${key}:${a.id}`) - seededHash(`${key}:${b.id}`));
    return ordered.slice(0, 5).map((game, index) => ({ gameId: game.id, required: index >= 3 ? 2 : 1 }));
  }

  function updatePlayStreak() {
    ensureV16State();
    const today = dayKey();
    if (state.streak.lastDay === today) return false;
    const gap = daysBetween(state.streak.lastDay, today);
    state.streak.current = gap === 1 ? Number(state.streak.current || 0) + 1 : 1;
    state.streak.best = Math.max(Number(state.streak.best || 0), state.streak.current);
    state.streak.lastDay = today;
    if (state.streak.current >= 3) grant('streakThree');
    if (state.streak.current >= 7) grant('streakSeven');
    persist();
    return true;
  }

  function claimDailyReward() {
    ensureV16State();
    updatePlayStreak();
    const today = dayKey();
    if (state.streak.rewardClaimed === today) { toast('Daily Reliquary already claimed', 'Come back tomorrow for the next local reward chest.'); return; }
    const rank = Number(state.prestige?.rank || 0);
    const payout = 35 + Math.min(120, Number(state.streak.current || 1) * 7) + rank * 15;
    state.coins += payout;
    state.xp += Math.round(payout * 0.7);
    state.streak.rewardClaimed = today;
    grant('dailyRewardClaimed');
    checkEngagementEngine();
    persist();
    audioFx('shop');
    toast('Daily Reliquary claimed', `+${payout} Vault Coins added locally.`);
    renderStatsOnly();
    renderCommandCenterPanel();
    renderPrestigePanel();
  }

  function weeklyProgress() {
    const weekly = ensureWeeklyConquest(false);
    return weekly.targets.map(target => ({ ...target, done: Number(weekly.completed?.[target.gameId] || 0), game: getGame(target.gameId) }));
  }

  function ensureWeeklyConquest(save = true) {
    state.weeklyConquest = normalizeWeeklyConquest(state.weeklyConquest || {});
    if (save) persist();
    return state.weeklyConquest;
  }

  function markWeeklyWin(gameId) {
    const weekly = ensureWeeklyConquest(false);
    const target = weekly.targets.find(item => item.gameId === gameId);
    if (!target) return;
    const next = Math.min(target.required, Number(weekly.completed?.[gameId] || 0) + 1);
    weekly.completed = { ...(weekly.completed || {}), [gameId]: next };
    const done = weekly.targets.filter(item => Number(weekly.completed?.[item.gameId] || 0) >= item.required).length;
    toast('Weekly Conquest progress', `${done}/${weekly.targets.length} weekly targets complete.`);
    if (done >= weekly.targets.length) grant('weeklyConquestClear');
    checkEngagementEngine();
    persist();
  }

  function canPrestige() {
    const allWon = games.every(game => ((state.gameSaves[game.id] || {}).wins || 0) > 0);
    return allWon && state.wins >= 25 && state.coins >= 250;
  }

  function ascendPrestige() {
    ensureV16State();
    if (!canPrestige()) { toast('Prestige locked', 'Win all ten games, reach 25 total wins, and hold 250 Vault Coins.'); return; }
    state.coins -= 250;
    state.prestige.rank = Number(state.prestige.rank || 0) + 1;
    state.prestige.history = [{ at: Date.now(), wins: state.wins, difficulty: difficultyInfo().name }, ...(state.prestige.history || [])].slice(0, 10);
    state.xp += 500 + state.prestige.rank * 100;
    grant('firstPrestige');
    if (state.prestige.rank >= 3) grant('prestigeThree');
    checkEngagementEngine();
    persist();
    audioFx('win');
    victoryBurst(`CROWN RANK ${state.prestige.rank}`);
    toast('Prestige ascended', `Crown Rank ${state.prestige.rank} is now permanent on this browser.`);
    render();
  }

  function checkEngagementEngine() {
    if (state.achievements.dailyRewardClaimed && state.achievements.weeklyConquestClear && state.commandCenterOpenedAt && Number(state.prestige?.rank || 0) > 0) grant('engagementEngine');
  }

  function emitVaultEvent(type, detail = {}) {
    const payload = { type, version: VERSION, at: Date.now(), profile: state?.profile || 'Operator', ...detail };
    try { window.dispatchEvent(new CustomEvent('skyearcade:vault-event', { detail: payload })); } catch {}
    try { window.SkyeArcadeBridge?.onVaultEvent?.(payload); } catch {}
    if (type !== 'state-saved') grant('bridgeEvent');
    return payload;
  }

  function runLevel() {
    const level = Number(activeRunMeta?.level || state.campaign?.selectedLevel || 1);
    return clamp(level || 1, 1, 5);
  }

  function levelInfo(gameId = activeGameId, level = runLevel()) {
    const pack = levelPacks[gameId] || levelPacks[games[0].id];
    return pack.find(item => item.level === level) || pack[0];
  }

  function cosmeticClass() {
    const cosmetic = cosmetics.find(item => item.id === state.equippedCosmetic);
    return cosmetic ? cosmetic.className : '';
  }

  function campaignUnlockedIndex() {
    ensureV16State();
    const completedCount = games.filter(game => state.campaign.completed?.[game.id] || ((state.gameSaves[game.id] || {}).wins || 0) > 0).length;
    const unlocked = clamp(Math.max(state.campaign.unlocked || 1, completedCount + 1), 1, games.length);
    state.campaign.unlocked = unlocked;
    return unlocked;
  }

  function levelUnlocked(gameId, level) {
    const wins = (state.gameSaves[gameId] || {}).wins || 0;
    const info = levelInfo(gameId, level);
    return wins >= (info.unlockWins || 0);
  }

  function selectLevel(level) {
    ensureV16State();
    state.campaign.selectedLevel = clamp(Number(level || 1), 1, 5);
    persist();
    renderCampaignPanel();
    renderStatsOnly();
    toast('Level pack armed', `Level ${state.campaign.selectedLevel} will apply to launched games.`);
  }

  function markLevelComplete(gameId) {
    ensureV16State();
    const level = runLevel();
    const save = state.gameSaves[gameId] || {};
    const levels = { ...(save.levels || {}), [level]: { at: Date.now(), difficulty: difficultyInfo().name } };
    setGameSave(gameId, { levels, bestLevel: Math.max(Number(save.bestLevel || 0), level) }, { quiet: true });
    grant('levelPackFirst');
    const levelOneSweep = games.every(game => Boolean((state.gameSaves[game.id] || {}).levels?.[1]) || ((state.gameSaves[game.id] || {}).wins || 0) > 0);
    if (levelOneSweep) grant('levelPackFull');
  }

  function markCampaignProgress(gameId) {
    ensureV16State();
    const index = games.findIndex(game => game.id === gameId);
    if (index < 0) return;
    if (index + 1 <= campaignUnlockedIndex()) {
      state.campaign.completed = { ...(state.campaign.completed || {}), [gameId]: { at: Date.now(), level: runLevel(), difficulty: difficultyInfo().name } };
      state.campaign.unlocked = clamp(Math.max(state.campaign.unlocked || 1, index + 2), 1, games.length);
      grant('campaignStep');
      if (games.every(game => state.campaign.completed?.[game.id])) grant('campaignClear');
      persist();
    }
  }

  function buyCosmetic(id) {
    const cosmetic = cosmetics.find(item => item.id === id);
    if (!cosmetic) return;
    if (state.cosmetics?.[id]) { equipCosmetic(id); return; }
    if (state.coins < cosmetic.cost) { toast('Not enough Vault Coins', `${cosmetic.name} needs ${cosmetic.cost} coins.`); return; }
    state.coins -= cosmetic.cost;
    state.cosmetics = { ...(state.cosmetics || {}), [id]: { at: Date.now() } };
    state.equippedCosmetic = id;
    grant('cosmeticFirst');
    grant('cosmeticEquipped');
    persist();
    audioFx('shop');
    toast('Cosmetic forged', `${cosmetic.name} is now equipped.`);
    render();
  }

  function equipCosmetic(id) {
    if (id && !state.cosmetics?.[id]) return;
    state.equippedCosmetic = id || '';
    if (id) grant('cosmeticEquipped');
    persist();
    audioFx('shop');
    toast('Signature updated', id ? `${cosmetics.find(item => item.id === id)?.name} equipped.` : 'Default vault signature restored.');
    render();
  }

  function completeOnboarding() {
    const profile = document.getElementById('onboardingName')?.value?.trim();
    const level = Number(document.getElementById('onboardingLevel')?.value || 1);
    const cosmetic = document.querySelector('[name="onboardingCosmetic"]:checked')?.value || '';
    if (profile) state.profile = profile.slice(0, 28);
    ensureV16State();
    state.campaign.onboardingComplete = true;
    state.campaign.selectedLevel = clamp(level, 1, 5);
    if (cosmetic) {
      state.cosmetics = { ...(state.cosmetics || {}), [cosmetic]: { at: Date.now(), starter: true } };
      state.equippedCosmetic = cosmetic;
    }
    persist();
    grant('onboardingComplete');
    toast('Local profile initiated', 'No account created. This browser now holds the vault profile.');
    render();
  }

  function saveToSlot(slot) {
    ensureV16State();
    const key = String(slot || '1');
    state.saveSlots[key] = { at: Date.now(), label: `Slot ${key}`, snapshot: JSON.stringify({ ...state, saveSlots: undefined }) };
    persist();
    grant('saveSlotUsed');
    toast('Save slot locked', `Stored current vault state in Slot ${key}.`);
    renderSaveSlotsPanel();
    renderStatsOnly();
  }

  function loadFromSlot(slot) {
    ensureV16State();
    const saved = state.saveSlots?.[slot];
    if (!saved?.snapshot) { toast('Slot empty', `Slot ${slot} has no saved state.`); return; }
    try {
      const imported = JSON.parse(saved.snapshot);
      const slots = state.saveSlots;
      state = {
        ...defaultState(),
        ...imported,
        version: VERSION,
        settings: normalizeSettings(imported.settings || {}),
        campaign: normalizeCampaign(imported.campaign || {}, imported.gameSaves || {}),
        cosmetics: imported.cosmetics || {},
        equippedCosmetic: imported.equippedCosmetic || '',
        saveSlots: slots
      };
      persist();
      toast('Save slot loaded', `Slot ${slot} restored. Save slots were preserved.`);
      render();
    } catch { toast('Slot failed', 'The selected save slot could not be parsed.'); }
  }

  function clearSlot(slot) {
    ensureV16State();
    delete state.saveSlots[String(slot)];
    persist();
    toast('Save slot cleared', `Slot ${slot} emptied.`);
    renderSaveSlotsPanel();
    renderStatsOnly();
  }

  function openAnalytics() {
    ensureV16State();
    state.campaign.analyticsOpenedAt = Date.now();
    persist();
    grant('analyticsOpened');
    renderAnalyticsPanel();
    renderEngagementPanels();
    toast('Vault Analytics opened', 'Local-only stats console refreshed.');
  }

  function currentDifficulty() {
    state.settings = normalizeSettings(state.settings || {});
    return state.settings.difficulty || 'normal';
  }

  function difficultyInfo() {
    return difficultyTiers[currentDifficulty()] || difficultyTiers.normal;
  }

  function challengeLevel() {
    return (difficultyInfo().rank || 0) + Math.floor((runLevel() - 1) / 2);
  }

  function isPressureMode() {
    return currentDifficulty() !== 'normal';
  }

  function rewardMultiplier() {
    return (difficultyInfo().reward || 1) * (1 + ((runLevel() - 1) * 0.06)) * (1 + (Number(state.prestige?.rank || 0) * 0.05));
  }

  function isBossRun(gameId) {
    return state.bossChallenge === gameId;
  }

  function bossLabel(gameId) {
    const boss = bossBook[gameId];
    return boss ? boss.name : 'Vault Boss';
  }

  function crownTrialTarget() {
    const trial = normalizeCrownTrial();
    return trial.route[trial.index] || trial.route[0];
  }

  function runContext(gameId) {
    const cosmetic = cosmetics.find(item => item.id === state.equippedCosmetic)?.name;
    return `${difficultyInfo().name} · Level ${runLevel()}${isBossRun(gameId) ? ' · Boss: ' + bossLabel(gameId) : ''}${state.crownTrial?.active ? ' · Crown Trial' : ''}${cosmetic ? ' · ' + cosmetic : ''}`;
  }

  function audioFx(kind) {
    if (!state.settings.sound) return;
    const map = {
      open: [[330, .045, 'sine'], [495, .055, 'triangle']],
      win: [[660, .08, 'triangle'], [990, .12, 'triangle']],
      loss: [[190, .09, 'sawtooth'], [120, .16, 'sine']],
      boss: [[92, .18, 'sawtooth'], [462, .08, 'square']],
      relic: [[520, .06, 'triangle'], [780, .09, 'triangle']],
      share: [[440, .05, 'sine'], [880, .08, 'triangle']],
      shop: [[392, .05, 'triangle'], [784, .07, 'sine']],
      campaign: [[246, .07, 'sine'], [622, .08, 'triangle']]
    };
    (map[kind] || map.open).forEach((note, i) => setTimeout(() => playTone(note[0], note[1], note[2]), i * 90));
  }


  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function seededContractTargets(date = todayKey()) {
    const ids = games.map(game => game.id);
    let seed = 0;
    for (const ch of date) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = [...ids];
    const picks = [];
    while (picks.length < 3 && pool.length) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const index = seed % pool.length;
      picks.push(pool.splice(index, 1)[0]);
    }
    return picks;
  }


  function seededGauntletRoute(date = todayKey()) {
    const ids = games.map(game => game.id);
    let seed = 13;
    for (const ch of `${date}:gauntlet`) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
    const pool = [...ids];
    const route = [];
    while (route.length < 5 && pool.length) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      route.push(pool.splice(seed % pool.length, 1)[0]);
    }
    return route;
  }

  function normalizeGauntlet() {
    if (!state.gauntlet || !Array.isArray(state.gauntlet.route)) {
      state.gauntlet = { active: false, date: '', route: [], index: 0, wins: 0, completedAt: 0 };
    }
    if (state.gauntlet.route.length === 0) state.gauntlet.route = seededGauntletRoute(todayKey());
    state.gauntlet.index = clamp(Number(state.gauntlet.index || 0), 0, state.gauntlet.route.length);
    state.gauntlet.wins = clamp(Number(state.gauntlet.wins || 0), 0, state.gauntlet.route.length);
    return state.gauntlet;
  }

  function startGauntlet() {
    state.gauntlet = { active: true, date: todayKey(), route: seededGauntletRoute(todayKey()), index: 0, wins: 0, completedAt: 0 };
    persist();
    toast('Vault Gauntlet armed', 'Win the five doors in order to claim the Gauntlet Crown.');
    renderGauntletPanel();
    renderArmoryPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCrownTrialPanel();
    renderBossPanel();
    renderRunHistoryPanel();
    renderCards();
    openGame(state.gauntlet.route[0]);
  }

  function markGauntletProgress(gameId) {
    const gauntlet = normalizeGauntlet();
    if (!gauntlet.active || gauntlet.completedAt) return;
    const target = gauntlet.route[gauntlet.index];
    if (target !== gameId) {
      toast('Gauntlet unchanged', `Current target is ${getGame(target).title.replace(/:.*/, '')}.`);
      return;
    }
    gauntlet.index += 1;
    gauntlet.wins = gauntlet.index;
    if (gauntlet.index >= gauntlet.route.length) {
      gauntlet.active = false;
      gauntlet.completedAt = Date.now();
      grant('gauntletClear');
      if (isPressureMode()) grant('gauntletPressureClear');
      toast('Gauntlet complete', 'Five ordered crowns secured.');
    } else {
      const next = getGame(gauntlet.route[gauntlet.index]);
      toast('Gauntlet advanced', `Next door: ${next.number} · ${next.title.replace(/:.*/, '')}.`);
    }
    persist();
    renderGauntletPanel();
  }

  function ensureDailyContract(shouldPersist = true) {
    const key = todayKey();
    if (!state.contracts || state.contracts.date !== key || !Array.isArray(state.contracts.targets) || state.contracts.targets.length !== 3) {
      state.contracts = { date: key, targets: seededContractTargets(key), completed: {} };
      if (shouldPersist) persist();
    }
    return state.contracts;
  }

  function getGame(id) {
    return games.find(game => game.id === id) || games[0];
  }

  function recordSummary(gameId) {
    const save = state.gameSaves[gameId] || {};
    const map = {
      skyeace: save.streak ? `Streak ${save.streak}` : '',
      uptime: save.bestWave ? `Best wave ${save.bestWave}` : '',
      dns: save.bestRouteScore ? `Best route ${save.bestRouteScore}` : '',
      scepter: save.bestStage ? `Best stage ${save.bestStage}` : '',
      reliquary: save.bestArtifacts ? `Artifacts ${save.bestArtifacts}/3` : '',
      koatsu: save.bestShards ? `Shards ${save.bestShards}` : '',
      leads: save.bestMoney ? `Best $${save.bestMoney}` : '',
      caseDesk: save.bestScore ? `Best ${save.bestScore}/12` : '',
      desktopQuest: save.complete ? 'Module unlocked' : '',
      vanta: save.bestTrust ? `Trust ${save.bestTrust}` : ''
    };
    const base = map[gameId] || '';
    const bestLevel = Number((state.gameSaves[gameId] || {}).bestLevel || 0);
    return [base, bestLevel ? `Level ${bestLevel}` : ''].filter(Boolean).join(' · ');
  }


  const loreCards = {
    skyeace: ['Ace Crown Doctrine', 'A table is only random until the operator learns pressure, suit order, and timing.'],
    uptime: ['Origin Heartbeat', 'Every node is a promise: traffic moves, shields fire, and the core survives the wave.'],
    dns: ['Veyra Route Psalm', 'The cleanest route is not the flashiest route. It is the route that lands under stress.'],
    scepter: ['Release Rite', 'A real deploy is command, heat, rollback discipline, and proof after the smoke clears.'],
    reliquary: ['Rollback Relic', 'Artifacts matter because a sovereign system must be able to recover itself.'],
    koatsu: ['Pressure Awakened', 'Pressure did not create the crown. It revealed what was already divine.'],
    leads: ['Closer Ledger', 'Lead flow becomes power when prospecting, qualification, closing, and fulfillment stay in rhythm.'],
    caseDesk: ['NorthStar Precision', 'Trust survives when documents, deadlines, and client intent stay matched.'],
    desktopQuest: ['SkyeOS Boot Rune', 'The desktop is not decoration. It is a mission surface with consequence.'],
    vanta: ['Operator Doctrine', 'Automation earns its crown only when it protects the client during chaos.']
  };

  function unlockedLoreCount() {
    return games.filter(game => ((state.gameSaves[game.id] || {}).wins || 0) > 0).length;
  }

  function masteryCount() {
    return games.filter(game => ((state.gameSaves[game.id] || {}).wins || 0) >= 3).length;
  }

  function pressureLabel() {
    return `${difficultyInfo().name} Mode`;
  }

  function ownedRelics() {
    return relics.filter(relic => state.armory && state.armory[relic.id]);
  }

  function hasRelic(id) {
    return Boolean(state.armory && state.armory[id]);
  }

  function buyRelic(id) {
    const relic = relics.find(item => item.id === id);
    if (!relic) return;
    if (hasRelic(id)) {
      toast('Relic already forged', `${relic.name} is already active.`);
      return;
    }
    if (state.coins < relic.cost) {
      toast('Not enough Vault Coins', `${relic.name} needs ${relic.cost} coins.`);
      return;
    }
    state.coins -= relic.cost;
    state.armory = { ...(state.armory || {}), [id]: { at: Date.now() } };
    persist();
    grant('firstRelic');
    if (ownedRelics().length >= relics.length) grant('fullArmory');
    audioFx('relic');
    toast('Vault Relic forged', `${relic.name} is now active across the vault.`);
    renderStatsOnly();
    renderArmoryPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCrownTrialPanel();
    renderBossPanel();
    renderRunHistoryPanel();
    renderCards();
    renderAchievements();
  }


  function setRecord(gameId, key, value, compare = 'max') {
    const save = state.gameSaves[gameId] || {};
    const previous = Number(save[key] || 0);
    const next = compare === 'min'
      ? (previous ? Math.min(previous, value) : value)
      : Math.max(previous, value);
    if (next !== previous) {
      grant('recordKeeper');
      setGameSave(gameId, { [key]: next }, { quiet: true });
    }
    return next;
  }

  function markContractComplete(gameId) {
    const contract = ensureDailyContract(false);
    if (!contract.targets.includes(gameId) || contract.completed[gameId]) return;
    contract.completed[gameId] = Date.now();
    const done = contract.targets.filter(id => contract.completed[id]).length;
    persist();
    toast('Contract progress', `${done}/3 contract games crowned today.`);
    if (done >= contract.targets.length) grant('contractClear');
  }

  function recommendNextGame() {
    const contract = ensureDailyContract(false);
    const pendingContract = contract.targets.find(id => !contract.completed[id]);
    if (pendingContract) return pendingContract;
    return games.find(game => !((state.gameSaves[game.id] || {}).wins > 0))?.id || games[0].id;
  }

  function setGameSave(id, data = {}, options = {}) {
    const previous = state.gameSaves[id] || {};
    const candidate = { ...previous, ...data };
    const scrub = value => {
      const copy = { ...value };
      delete copy.updatedAt;
      return JSON.stringify(copy);
    };
    const changed = options.touch || scrub(previous) !== scrub(candidate);
    if (!changed) return;
    const now = Date.now();
    setGameSave.lastWrites = setGameSave.lastWrites || {};
    if (options.throttleMs && now - (setGameSave.lastWrites[id] || 0) < options.throttleMs) {
      state.gameSaves[id] = candidate;
      return;
    }
    setGameSave.lastWrites[id] = now;
    state.gameSaves[id] = { ...candidate, updatedAt: now };
    persist();
    if (!options.quiet) renderStatsOnly();
  }

  function grant(code) {
    if (!achievements[code] || state.achievements[code]) return;
    state.achievements[code] = { at: Date.now() };
    state.xp += 25;
    state.coins += 13;
    persist();
    toast(`Achievement unlocked`, achievements[code][0]);
    renderStatsOnly();
    renderAchievements();
    renderCodex();
    renderArmoryPanel();
  }

  function recordRun(gameId, won, detail = {}) {
    const game = getGame(gameId);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: Date.now(),
      gameId,
      gameTitle: game.title,
      won: Boolean(won),
      difficulty: difficultyInfo().name,
      level: runLevel(),
      cosmetic: cosmetics.find(item => item.id === state.equippedCosmetic)?.name || '',
      boss: isBossRun(gameId) ? bossLabel(gameId) : '',
      crownTrial: Boolean(state.crownTrial && state.crownTrial.active),
      relics: ownedRelics().map(relic => relic.name),
      detail: String(detail.reason || detail.score || detail.bonus || '')
    };
    state.runHistory = [entry, ...(state.runHistory || [])].slice(0, 20);
    if (state.runHistory.length >= 20) grant('runHistorian');
    persist();
    return entry;
  }

  function markBossDefeated(gameId) {
    if (!isBossRun(gameId)) return;
    state.bossWins = { ...(state.bossWins || {}), [gameId]: { at: Date.now(), difficulty: difficultyInfo().name } };
    state.bossChallenge = '';
    grant('bossSlayer');
    if (games.every(game => state.bossWins?.[game.id])) grant('bossCleanSweep');
    toast('Boss defeated', `${bossLabel(gameId)} has been sealed.`);
    persist();
  }

  function challengeBoss(gameId) {
    state.bossChallenge = gameId;
    state.settings.difficulty = currentDifficulty() === 'normal' ? 'pressure' : currentDifficulty();
    state.settings.pressure = true;
    persist();
    audioFx('boss');
    toast('Boss trial armed', `${bossLabel(gameId)} is waiting inside ${getGame(gameId).title.replace(/:.*/, '')}.`);
    renderStatsOnly();
    renderBossPanel();
    openGame(gameId, true);
  }

  function normalizeCrownTrial() {
    if (!state.crownTrial || !Array.isArray(state.crownTrial.route)) {
      state.crownTrial = { active: false, route: [], index: 0, lives: 0, relicId: '', pendingChoice: false, completedAt: 0, collapsedAt: 0, modifiers: [] };
    }
    if (!state.crownTrial.route.length) state.crownTrial.route = games.map(game => game.id);
    state.crownTrial.index = clamp(Number(state.crownTrial.index || 0), 0, state.crownTrial.route.length);
    state.crownTrial.lives = clamp(Number(state.crownTrial.lives || 0), 0, 9);
    if (!Array.isArray(state.crownTrial.modifiers)) state.crownTrial.modifiers = [];
    return state.crownTrial;
  }

  function startCrownTrial() {
    const owned = ownedRelics();
    const relicId = owned[0]?.id || '';
    const baseLives = currentDifficulty() === 'sovereign' ? 2 : currentDifficulty() === 'nightmare' ? 3 : 4;
    state.crownTrial = {
      active: true,
      route: games.map(game => game.id),
      index: 0,
      lives: baseLives,
      relicId,
      pendingChoice: false,
      completedAt: 0,
      collapsedAt: 0,
      modifiers: relicId ? [`Opened with ${relics.find(r => r.id === relicId)?.name}`] : ['No opening relic selected']
    };
    persist();
    audioFx('open');
    toast('Crown Trial started', 'Clear all ten vault doors in sequence before the run collapses.');
    renderCrownTrialPanel();
    openGame(state.crownTrial.route[0], true);
  }

  function chooseCrownTrialBoon(kind) {
    const trial = normalizeCrownTrial();
    if (!trial.pendingChoice) return;
    if (kind === 'blessing') {
      trial.lives = clamp(trial.lives + 1, 0, 9);
      trial.modifiers.push('Blessing: +1 life');
      toast('Blessing chosen', 'Crown Trial gained one life.');
    } else {
      const payout = 45 + challengeLevel() * 15;
      state.coins += payout;
      state.xp += payout;
      trial.modifiers.push(`Curse: +${payout} XP/coins, no extra life`);
      toast('Curse chosen', `You took ${payout} XP and coins instead of safety.`);
    }
    trial.pendingChoice = false;
    persist();
    renderStatsOnly();
    renderCrownTrialPanel();
  }

  function markCrownTrialWin(gameId) {
    const trial = normalizeCrownTrial();
    if (!trial.active || trial.completedAt || trial.collapsedAt) return;
    const target = trial.route[trial.index];
    if (target !== gameId) return;
    trial.index += 1;
    if (trial.index >= trial.route.length) {
      trial.active = false;
      trial.completedAt = Date.now();
      trial.pendingChoice = false;
      grant('crownTrialClear');
      if (currentDifficulty() === 'sovereign') grant('crownTrialSovereign');
      victoryBurst('CROWN TRIAL COMPLETE');
      toast('Crown Trial complete', 'All ten vault doors cleared in sequence.');
    } else {
      trial.pendingChoice = true;
      toast('Crown Trial advanced', 'Choose a blessing or curse before opening the next door.');
    }
    persist();
    renderCrownTrialPanel();
  }

  function markRunLoss(gameId, reason = 'Run lost') {
    if (activeRunAwards.has(gameId)) return;
    activeRunAwards.add(gameId);
    recordRun(gameId, false, { reason });
    emitVaultEvent('game-lost', { gameId, reason });
    audioFx('loss');
    if (isBossRun(gameId)) {
      toast('Boss trial failed', `${bossLabel(gameId)} remains undefeated.`);
      state.bossChallenge = '';
    }
    const trial = normalizeCrownTrial();
    if (trial.active && !trial.completedAt && !trial.collapsedAt && trial.route[trial.index] === gameId) {
      trial.lives -= 1;
      trial.modifiers.push(`Loss: ${getGame(gameId).title.replace(/:.*/, '')}`);
      if (trial.lives <= 0) {
        trial.active = false;
        trial.collapsedAt = Date.now();
        trial.pendingChoice = false;
        toast('Crown Trial collapsed', 'No lives remain. Start a new Crown Trial when ready.');
      } else {
        toast('Crown Trial life lost', `${trial.lives} lives remain. Retry the current door.`);
      }
    }
    persist();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCrownTrialPanel();
    renderBossPanel();
    renderRunHistoryPanel();
  }

  function awardWin(gameId, achievementCode, bonus = 100) {
    if (activeRunAwards.has(gameId)) return;
    activeRunAwards.add(gameId);
    const save = state.gameSaves[gameId] || {};
    const finalBonus = Math.round(bonus * rewardMultiplier() * (hasRelic('operatorMomentum') ? 1.2 : 1));
    state.wins += 1;
    state.xp += finalBonus;
    state.coins += Math.round(finalBonus / 3) + (hasRelic('operatorMomentum') ? 13 : 0);
    recordRun(gameId, true, { bonus: finalBonus });
    victoryBurst('CROWN SECURED');
    grant('firstWin');
    grant(achievementCode);
    if (currentDifficulty() === 'nightmare') grant('nightmareCrown');
    if (currentDifficulty() === 'sovereign') grant('sovereignCrown');
    const nextWins = (save.wins || 0) + 1;
    setGameSave(gameId, { wins: nextWins });
    markLevelComplete(gameId);
    markCampaignProgress(gameId);
    markBossDefeated(gameId);
    markContractComplete(gameId);
    markWeeklyWin(gameId);
    markGauntletProgress(gameId);
    markCrownTrialWin(gameId);
    if (isPressureMode()) grant('pressureCrown');
    if (nextWins >= 3) grant('masteryFirst');
    if (masteryCount() >= games.length) grant('tenMastery');
    if (state.wins >= 5) grant('fiveWins');
    const wonGames = games.filter(game => (state.gameSaves[game.id] || {}).wins > 0).length;
    if (wonGames >= 3) grant('tripleCrown');
    if (unlockedLoreCount() >= 5) grant('loreKeeper');
    if (wonGames >= games.length) grant('fullVault');
    emitVaultEvent('game-won', { gameId, bonus: finalBonus, wins: state.wins, crownRank: Number(state.prestige?.rank || 0) });
    renderOnboardingPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderContractPanel();
    renderGauntletPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCrownTrialPanel();
    renderBossPanel();
    renderRunHistoryPanel();
    renderAchievements();
    renderCodex();
  }

  function toast(title, message) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const item = document.createElement('div');
    item.className = 'toast';
    item.innerHTML = `<b>${escapeHtml(title)}</b><span>${escapeHtml(message)}</span>`;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 3600);
  }

  function playTone(freq = 440, duration = 0.055, type = 'sine') {
    if (!state.settings.sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + duration + 0.02);
      setTimeout(() => ctx.close().catch(() => {}), (duration + 0.08) * 1000);
    } catch {}
  }

  function victoryBurst(label = 'VICTORY') {
    const overlay = document.querySelector('#gameOverlay.active .game-window') || document.body;
    const burst = document.createElement('div');
    burst.className = 'victory-burst';
    burst.innerHTML = `<strong>${escapeHtml(label)}</strong>${Array.from({ length: 26 }, (_, i) => `<i style="--i:${i};--r:${rand(90, 260)}px"></i>`).join('')}`;
    overlay.appendChild(burst);
    audioFx('win');
    setTimeout(() => burst.remove(), 1500);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pct(value, max) { return `${clamp(Math.round((value / max) * 100), 0, 100)}%`; }


  function renderEngagementPanels() {
    renderCommandCenterPanel();
    renderWeeklyPanel();
    renderPrestigePanel();
    renderMilestonePanel();
  }

  function render() {
    ensureV16State();
    document.body.classList.toggle('reduced-motion', !state.settings.motion);
    document.body.classList.remove(...cosmetics.map(item => item.className));
    const activeCosmeticClass = cosmeticClass();
    if (activeCosmeticClass) document.body.classList.add(activeCosmeticClass);
    app.innerHTML = `
      <section class="hero">
        <div class="panel hero-main">
          <div class="main-logo-banner"><img src="assets/sovereign-vault-main-logo.png" alt="Sovereign Vault SkyeArcade logo" /></div>
          <span class="kicker">Sovereign Game Vault · v${VERSION}</span>
          <h1>Ten games. One empire. No permission required.</h1>
          <p>SkyeArcade is now a browser game platform layer: ten playable game cores, campaign map, staged level packs, local save slots, earned cosmetics, weekly conquest, prestige ranks, analytics, PWA support, bridge events, and no auth requirement.</p>
          <div class="hero-actions">
            <button class="btn btn--primary" id="continueBtn">Continue Latest</button>
            <button class="btn" id="randomBtn">Open Random Game</button>
            <button class="btn btn--ghost" id="exportBtn">Export Save JSON</button>
            <button class="btn btn--ghost" id="importBtn">Import Save JSON</button>
            <button class="btn btn--ghost" id="installBtn">Install PWA</button>
          </div>
        </div>
        <aside class="panel stats-panel" id="statsPanel"></aside>
      </section>

      <section class="panel onboarding-panel" id="onboardingPanel"></section>
      <section class="panel campaign-panel" id="campaignPanel"></section>
      <section class="panel shop-panel" id="shopPanel"></section>
      <section class="panel save-slots-panel" id="saveSlotsPanel"></section>
      <section class="panel analytics-panel" id="analyticsPanel"></section>
      <section class="panel command-center-panel" id="commandCenterPanel"></section>
      <section class="panel weekly-panel" id="weeklyPanel"></section>
      <section class="panel prestige-panel" id="prestigePanel"></section>
      <section class="panel milestone-panel" id="milestonePanel"></section>

      <section class="panel contract-panel" id="contractPanel"></section>
      <section class="panel gauntlet-panel" id="gauntletPanel"></section>
      <section class="panel armory-panel" id="armoryPanel"></section>
      <section class="panel crown-panel" id="crownTrialPanel"></section>
      <section class="panel boss-panel" id="bossPanel"></section>
      <section class="panel history-panel" id="runHistoryPanel"></section>

      <section>
        <div class="section-head">
          <div>
            <h2>Playable vault doors</h2>
            <p>Every card launches a distinct vertical slice with actual mechanics.</p>
          </div>
          <button class="btn btn--danger" id="wipeBtn">Reset Vault Save</button>
        </div>
        <div class="vault-grid" id="vaultGrid"></div>
      </section>

      <section>
        <div class="section-head">
          <div>
            <h2>Achievement ledger</h2>
            <p>Shared proof of progress across all ten games.</p>
          </div>
        </div>
        <div class="achievements" id="achievementGrid"></div>
      </section>

      <section>
        <div class="section-head">
          <div>
            <h2>Lore codex</h2>
            <p>Win a vault door to unlock its doctrine card. Three wins marks mastery.</p>
          </div>
        </div>
        <div class="codex-grid" id="codexGrid"></div>
      </section>

      <div class="game-overlay" id="gameOverlay" role="dialog" aria-modal="true" aria-label="Game window">
        <div class="game-window">
          <div class="game-topbar">
            <div class="game-title-line">
              <b id="gameWindowTitle">Game</b>
              <span id="gameWindowSub">Playable core</span>
            </div>
            <div class="game-actions">
              <button class="btn" id="restartGameBtn">Restart</button>
              <button class="btn" id="closeGameBtn">Close</button>
            </div>
          </div>
          <div class="game-body" id="gameHost"></div>
        </div>
      </div>
    `;

    renderStatsOnly();
    renderOnboardingPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCommandCenterPanel();
    renderWeeklyPanel();
    renderPrestigePanel();
    renderMilestonePanel();
    renderOnboardingPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderContractPanel();
    renderGauntletPanel();
    renderArmoryPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCrownTrialPanel();
    renderBossPanel();
    renderRunHistoryPanel();
    renderCards();
    renderAchievements();
    renderCodex();
    wireShell();
    grant('firstLaunch');
  }

  function renderStatsOnly() {
    const panel = document.getElementById('statsPanel');
    if (!panel) return;
    const unlocked = Object.keys(state.achievements).length;
    panel.innerHTML = `
      <div class="logo-sigil" aria-hidden="true"></div>
      <div class="input-row">
        <input id="profileInput" value="${escapeHtml(state.profile)}" maxlength="28" aria-label="Profile name" />
        <button class="btn" id="saveProfileBtn">Save</button>
      </div>
      <div class="profile-grid">
        <div class="stat"><b>${state.xp}</b><span>XP</span></div>
        <div class="stat"><b>${state.coins}</b><span>Vault Coins</span></div>
        <div class="stat"><b>${state.wins}</b><span>Total Wins</span></div>
        <div class="stat"><b>${unlocked}/${Object.keys(achievements).length}</b><span>Achievements</span></div>
        <div class="stat"><b>${ownedRelics().length}/${relics.length}</b><span>Vault Relics</span></div>
        <div class="stat"><b>${difficultyInfo().name}</b><span>Difficulty</span></div>
        <div class="stat"><b>${state.campaign?.selectedLevel || 1}</b><span>Selected Level</span></div>
        <div class="stat"><b>${Object.keys(state.saveSlots || {}).length}/3</b><span>Save Slots</span></div>
        <div class="stat"><b>${Number(state.prestige?.rank || 0)}</b><span>Crown Rank</span></div>
        <div class="stat"><b>${Number(state.streak?.current || 0)}</b><span>Day Streak</span></div>
      </div>
      <label class="field-label">Difficulty Tier
        <select id="difficultySelect" class="select-control">
          ${Object.entries(difficultyTiers).map(([id, tier]) => `<option value="${id}" ${currentDifficulty() === id ? 'selected' : ''}>${tier.name}</option>`).join('')}
        </select>
      </label>
      <div class="toggle-row">
        <label class="toggle"><input id="motionToggle" type="checkbox" ${state.settings.motion ? 'checked' : ''}/> Motion FX</label>
        <label class="toggle"><input id="soundToggle" type="checkbox" ${state.settings.sound ? 'checked' : ''}/> Sound flag</label>
        <label class="toggle"><input id="tutorialToggle" type="checkbox" ${state.settings.tutorials ? 'checked' : ''}/> Tutorials</label>
      </div>
      <div class="save-tools">
        <button class="btn btn--ghost" id="recoverBackupBtn">Recover Backup</button>
        <button class="btn btn--ghost" id="downloadBackupBtn">Download Backup</button>
      </div>
    `;
    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
      const value = document.getElementById('profileInput').value.trim();
      state.profile = value || 'Operator';
      persist();
      toast('Profile saved', state.profile);
      renderStatsOnly();
    });
    document.getElementById('motionToggle')?.addEventListener('change', event => {
      state.settings.motion = Boolean(event.target.checked);
      persist();
      document.body.classList.toggle('reduced-motion', !state.settings.motion);
    });
    document.getElementById('soundToggle')?.addEventListener('change', event => {
      state.settings.sound = Boolean(event.target.checked);
      persist();
      toast('Sound setting saved', state.settings.sound ? 'Enabled flag. Browser audio is intentionally minimal.' : 'Disabled.');
    });
    document.getElementById('difficultySelect')?.addEventListener('change', event => {
      state.settings.difficulty = event.target.value;
      state.settings.pressure = state.settings.difficulty !== 'normal';
      persist();
      toast('Difficulty saved', `${difficultyInfo().name}: ${difficultyInfo().copy}`);
      renderStatsOnly();
      renderCards();
      renderGauntletPanel();
      renderCrownTrialPanel();
    });
    document.getElementById('tutorialToggle')?.addEventListener('change', event => {
      state.settings.tutorials = Boolean(event.target.checked);
      persist();
      toast('Tutorial setting saved', state.settings.tutorials ? 'Tutorial panels enabled.' : 'Tutorial panels hidden.');
    });
    document.getElementById('recoverBackupBtn')?.addEventListener('click', recoverBackup);
    document.getElementById('downloadBackupBtn')?.addEventListener('click', downloadBackup);
  }



  function renderOnboardingPanel() {
    const panel = document.getElementById('onboardingPanel');
    if (!panel) return;
    ensureV16State();
    if (state.campaign.onboardingComplete) {
      panel.innerHTML = '';
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';
    panel.innerHTML = `
      <div>
        <span class="kicker">First Launch · Local Profile</span>
        <h2>Initiate the vault without auth.</h2>
        <p>This creates a browser-local profile only. It does not create an account, call a backend, or add an auth layer.</p>
      </div>
      <div class="onboarding-grid">
        <label class="field-label">Operator Name<input id="onboardingName" value="${escapeHtml(state.profile)}" maxlength="28" /></label>
        <label class="field-label">Starting Level<select id="onboardingLevel" class="select-control">${[1,2,3,4,5].map(n => `<option value="${n}">${n} · ${escapeHtml(levelInfo(games[0].id, n).title)}</option>`).join('')}</select></label>
        <div class="starter-cosmetics">${cosmetics.slice(0,3).map((item, index) => `<label class="starter-card"><input type="radio" name="onboardingCosmetic" value="${escapeHtml(item.id)}" ${index === 0 ? 'checked' : ''}/><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.tag)}</span></label>`).join('')}</div>
        <button class="btn btn--primary" id="completeOnboardingBtn">Enter Sovereign Vault</button>
      </div>
    `;
    panel.querySelector('#completeOnboardingBtn')?.addEventListener('click', completeOnboarding);
  }

  function renderCampaignPanel() {
    const panel = document.getElementById('campaignPanel');
    if (!panel) return;
    ensureV16State();
    const unlocked = campaignUnlockedIndex();
    const completed = games.filter(game => state.campaign.completed?.[game.id]).length;
    const selected = state.campaign.selectedLevel || 1;
    panel.innerHTML = `
      <div class="story-copy">
        <span class="kicker">Vault Map · v1.6</span>
        <h2>${completed}/10 campaign nodes crowned.</h2>
        <p>The anthology now has a connected campaign route. Nodes unlock in order, and level packs alter real game pressure through the shared challenge system.</p>
        <div class="level-selector">
          ${[1,2,3,4,5].map(level => `<button class="btn ${selected === level ? 'btn--primary' : ''}" data-select-level="${level}">L${level}</button>`).join('')}
        </div>
      </div>
      <div class="campaign-map">
        ${campaignRoute.map((node, index) => {
          const game = getGame(node.gameId);
          const isUnlocked = index < unlocked;
          const done = Boolean(state.campaign.completed?.[game.id]);
          const level = selected;
          const levelOk = levelUnlocked(game.id, level);
          return `<div class="map-node ${done ? 'complete' : ''} ${isUnlocked ? 'unlocked' : 'locked'}">
            <span>${done ? '✅' : isUnlocked ? '▶' : '☐'} Node ${node.node} · ${escapeHtml(game.number)}</span>
            <b>${escapeHtml(game.title.replace(/:.*/, ''))}</b>
            <p>${escapeHtml(node.doctrine)}</p>
            <em>${escapeHtml(levelInfo(game.id, level).title)} · ${levelOk ? 'available' : 'locked until more wins'}</em>
            <button class="btn ${isUnlocked && levelOk ? 'btn--primary' : ''}" data-campaign-play="${escapeHtml(game.id)}" ${isUnlocked && levelOk ? '' : 'disabled'}>Play Campaign Node</button>
          </div>`;
        }).join('')}
      </div>
    `;
    panel.querySelectorAll('[data-select-level]').forEach(button => button.addEventListener('click', () => selectLevel(button.dataset.selectLevel)));
    panel.querySelectorAll('[data-campaign-play]').forEach(button => button.addEventListener('click', () => { audioFx('campaign'); openGame(button.dataset.campaignPlay, false, { level: state.campaign.selectedLevel || 1, source: 'campaign' }); }));
  }

  function renderShopPanel() {
    const panel = document.getElementById('shopPanel');
    if (!panel) return;
    ensureV16State();
    const equipped = cosmetics.find(item => item.id === state.equippedCosmetic);
    panel.innerHTML = `
      <div>
        <span class="kicker">Vault Shop · Earned Cosmetics</span>
        <h2>${equipped ? escapeHtml(equipped.name) : 'Default signature'} equipped.</h2>
        <p>Cosmetics are bought with Vault Coins only. No payments, no backend, no account dependency.</p>
        <div class="hero-actions"><button class="btn" id="clearCosmeticBtn">Use Default Signature</button></div>
      </div>
      <div class="shop-grid">
        ${cosmetics.map(item => {
          const owned = Boolean(state.cosmetics?.[item.id]);
          const active = state.equippedCosmetic === item.id;
          return `<div class="shop-card ${owned ? 'owned' : ''} ${active ? 'active' : ''}">
            <span>${escapeHtml(item.tag)} · ${owned ? active ? 'EQUIPPED' : 'OWNED' : `${item.cost} coins`}</span>
            <b>${escapeHtml(item.name)}</b>
            <p>${escapeHtml(item.desc)}</p>
            <button class="btn ${owned ? '' : 'btn--primary'}" data-cosmetic="${escapeHtml(item.id)}" ${!owned && state.coins < item.cost ? 'disabled' : ''}>${owned ? active ? 'Equipped' : 'Equip' : 'Buy'}</button>
          </div>`;
        }).join('')}
      </div>
    `;
    panel.querySelector('#clearCosmeticBtn')?.addEventListener('click', () => equipCosmetic(''));
    panel.querySelectorAll('[data-cosmetic]').forEach(button => button.addEventListener('click', () => buyCosmetic(button.dataset.cosmetic)));
  }

  function renderSaveSlotsPanel() {
    const panel = document.getElementById('saveSlotsPanel');
    if (!panel) return;
    ensureV16State();
    panel.innerHTML = `
      <div>
        <span class="kicker">Local Save Slots</span>
        <h2>Three named browser slots for experiments.</h2>
        <p>Slots preserve local snapshots. Loading a slot restores progress while keeping the slot ledger intact.</p>
      </div>
      <div class="slot-grid">
        ${[1,2,3].map(slot => {
          const saved = state.saveSlots?.[slot];
          return `<div class="slot-card ${saved ? 'filled' : ''}">
            <span>Slot ${slot}</span>
            <b>${saved ? new Date(saved.at).toLocaleString() : 'Empty'}</b>
            <p>${saved ? 'Snapshot available for rollback/testing.' : 'No snapshot stored yet.'}</p>
            <div class="slot-actions"><button class="btn btn--primary" data-save-slot="${slot}">Save</button><button class="btn" data-load-slot="${slot}" ${saved ? '' : 'disabled'}>Load</button><button class="btn btn--ghost" data-clear-slot="${slot}" ${saved ? '' : 'disabled'}>Clear</button></div>
          </div>`;
        }).join('')}
      </div>
    `;
    panel.querySelectorAll('[data-save-slot]').forEach(button => button.addEventListener('click', () => saveToSlot(button.dataset.saveSlot)));
    panel.querySelectorAll('[data-load-slot]').forEach(button => button.addEventListener('click', () => loadFromSlot(button.dataset.loadSlot)));
    panel.querySelectorAll('[data-clear-slot]').forEach(button => button.addEventListener('click', () => clearSlot(button.dataset.clearSlot)));
  }

  function renderAnalyticsPanel() {
    const panel = document.getElementById('analyticsPanel');
    if (!panel) return;
    ensureV16State();
    const winsByGame = games.map(game => ({ game, wins: (state.gameSaves[game.id] || {}).wins || 0, bestLevel: (state.gameSaves[game.id] || {}).bestLevel || 0 }));
    const favorite = [...winsByGame].sort((a, b) => b.wins - a.wins)[0];
    const losses = (state.runHistory || []).filter(row => !row.won).length;
    const bossDefeats = Object.keys(state.bossWins || {}).length;
    panel.innerHTML = `
      <div>
        <span class="kicker">Vault Analytics · Local Only</span>
        <h2>${state.wins} wins, ${losses} recent losses, ${bossDefeats}/10 bosses sealed.</h2>
        <p>Stats are generated from localStorage. No telemetry, no server calls, no hidden tracking.</p>
        <button class="btn btn--primary" id="refreshAnalyticsBtn">Open / Refresh Analytics</button>
      </div>
      <div class="analytics-grid">
        <div class="stat"><b>${favorite?.game?.title.replace(/:.*/, '') || 'None'}</b><span>Favorite Door</span></div>
        <div class="stat"><b>${masteryCount()}/10</b><span>Mastery Sigils</span></div>
        <div class="stat"><b>${ownedRelics().length}/${relics.length}</b><span>Relics Forged</span></div>
        <div class="stat"><b>${Object.keys(state.cosmetics || {}).length}/${cosmetics.length}</b><span>Cosmetics Owned</span></div>
        ${winsByGame.map(row => `<div class="analytics-row"><span>${escapeHtml(row.game.number)} · ${escapeHtml(row.game.title.replace(/:.*/, ''))}</span><b>${row.wins} wins</b><em>Best L${row.bestLevel || 0}</em></div>`).join('')}
      </div>
    `;
    panel.querySelector('#refreshAnalyticsBtn')?.addEventListener('click', openAnalytics);
  }


  function renderCommandCenterPanel() {
    const panel = document.getElementById('commandCenterPanel');
    if (!panel) return;
    ensureV16State();
    const nextId = recommendNextGame();
    const next = getGame(nextId);
    const pendingWeekly = weeklyProgress().find(item => item.done < item.required);
    const trial = normalizeCrownTrial();
    panel.innerHTML = `
      <div>
        <span class="kicker">Vault Command Center</span>
        <h2>One tap to the next useful move.</h2>
        <p>Local-first retention engine: streak, weekly conquest, Crown Trial, analytics, and the recommended next door. Still no auth or backend.</p>
      </div>
      <div class="command-grid">
        <button class="command-card" id="openRecommendedBtn"><span>Recommended</span><b>${escapeHtml(next.title.replace(/:.*/, ''))}</b><em>${escapeHtml(recordSummary(next.id) || next.genre)}</em></button>
        <button class="command-card" id="claimDailyBtn"><span>Daily Chest</span><b>${state.streak.rewardClaimed === dayKey() ? 'Claimed Today' : 'Claim Reward'}</b><em>Streak ${Number(state.streak.current || 0)} · Best ${Number(state.streak.best || 0)}</em></button>
        <button class="command-card" id="openWeeklyBtn"><span>Weekly</span><b>${pendingWeekly ? getGame(pendingWeekly.gameId).title.replace(/:.*/, '') : 'Conquest Clear'}</b><em>${weeklyProgress().filter(item => item.done >= item.required).length}/${weeklyProgress().length} targets complete</em></button>
        <button class="command-card" id="openTrialBtn"><span>Crown Trial</span><b>${trial.active ? getGame(crownTrialTarget()).title.replace(/:.*/, '') : 'Start Sequence'}</b><em>${trial.active ? `${trial.lives} lives remain` : 'Ten doors, one run'}</em></button>
      </div>
    `;
    const used = () => { state.commandCenterOpenedAt = Date.now(); grant('commandCenterOpened'); checkEngagementEngine(); persist(); };
    panel.querySelector('#openRecommendedBtn')?.addEventListener('click', () => { used(); openGame(nextId); });
    panel.querySelector('#claimDailyBtn')?.addEventListener('click', () => { used(); claimDailyReward(); });
    panel.querySelector('#openWeeklyBtn')?.addEventListener('click', () => { used(); const target = pendingWeekly?.gameId || nextId; openGame(target); });
    panel.querySelector('#openTrialBtn')?.addEventListener('click', () => { used(); if (trial.active) openGame(crownTrialTarget(), true, { source: 'crownTrial' }); else startCrownTrial(); });
  }

  function renderWeeklyPanel() {
    const panel = document.getElementById('weeklyPanel');
    if (!panel) return;
    ensureV16State();
    const progress = weeklyProgress();
    const done = progress.filter(item => item.done >= item.required).length;
    panel.innerHTML = `
      <div>
        <span class="kicker">Weekly Conquest · ${escapeHtml(state.weeklyConquest.week)}</span>
        <h2>Five target doors. Rotates locally each week.</h2>
        <p>Win the listed games before the local week changes. No server, no login, no waiting on provider services.</p>
      </div>
      <div class="weekly-grid">
        ${progress.map(item => `<div class="weekly-card ${item.done >= item.required ? 'complete' : ''}">
          <span>${item.done >= item.required ? '✅ Complete' : '☐ Target'}</span>
          <b>${escapeHtml(item.game.title.replace(/:.*/, ''))}</b>
          <p>${item.done}/${item.required} crown${item.required > 1 ? 's' : ''} this week.</p>
          <button class="btn btn--primary" data-weekly-open="${item.gameId}">${item.done >= item.required ? 'Replay' : 'Open Target'}</button>
        </div>`).join('')}
      </div>
      <div class="progress-rail"><i style="width:${pct(done, progress.length)}"></i></div>
    `;
    panel.querySelectorAll('[data-weekly-open]').forEach(button => button.addEventListener('click', () => openGame(button.dataset.weeklyOpen)));
  }

  function renderPrestigePanel() {
    const panel = document.getElementById('prestigePanel');
    if (!panel) return;
    ensureV16State();
    const allWon = games.filter(game => ((state.gameSaves[game.id] || {}).wins || 0) > 0).length;
    const ready = canPrestige();
    panel.innerHTML = `
      <div>
        <span class="kicker">Crown Prestige</span>
        <h2>Permanent local Crown Rank.</h2>
        <p>Prestige does not add auth or wipe your vault. It creates a permanent browser-side rank and improves reward weight.</p>
      </div>
      <div class="prestige-card ${ready ? 'ready' : ''}">
        <span>Current Crown Rank</span>
        <b>${Number(state.prestige?.rank || 0)}</b>
        <p>Requirement: all ten games won, 25 total wins, and 250 Vault Coins. Progress: ${allWon}/10 doors · ${state.wins}/25 wins · ${state.coins}/250 coins.</p>
        <button class="btn btn--primary" id="prestigeBtn" ${ready ? '' : 'disabled'}>${ready ? 'Ascend Prestige' : 'Prestige Locked'}</button>
      </div>
    `;
    panel.querySelector('#prestigeBtn')?.addEventListener('click', ascendPrestige);
  }

  function renderMilestonePanel() {
    const panel = document.getElementById('milestonePanel');
    if (!panel) return;
    const rows = games.map(game => {
      const wins = Number((state.gameSaves[game.id] || {}).wins || 0);
      return `<div class="milestone-row"><span>${escapeHtml(game.title.replace(/:.*/, ''))}</span><b>${Math.min(wins, 3)}/3 mastery</b><div class="progress-rail"><i style="width:${pct(Math.min(wins,3), 3)}"></i></div></div>`;
    }).join('');
    const bossDone = Object.keys(state.bossWins || {}).length;
    const weeklyDone = weeklyProgress().filter(item => item.done >= item.required).length;
    panel.innerHTML = `
      <div>
        <span class="kicker">Milestone Matrix</span>
        <h2>What makes it sticky.</h2>
        <p>Mastery, bosses, weekly conquest, Crown Rank, and save resilience are visible without needing accounts.</p>
      </div>
      <div class="milestone-grid">
        <div class="milestone-summary"><b>${masteryCount()}/10</b><span>Mastered Doors</span></div>
        <div class="milestone-summary"><b>${bossDone}/10</b><span>Bosses Sealed</span></div>
        <div class="milestone-summary"><b>${weeklyDone}/5</b><span>Weekly Targets</span></div>
        <div class="milestone-summary"><b>${Number(state.prestige?.rank || 0)}</b><span>Crown Rank</span></div>
      </div>
      <div class="mastery-list">${rows}</div>
    `;
  }

  function renderContractPanel() {
    const panel = document.getElementById('contractPanel');
    if (!panel) return;
    const contract = ensureDailyContract(false);
    const done = contract.targets.filter(id => contract.completed[id]).length;
    const targetCards = contract.targets.map(id => {
      const game = getGame(id);
      const complete = Boolean(contract.completed[id]);
      return `<button class="contract-target ${complete ? 'complete' : ''}" data-contract-game="${escapeHtml(id)}">
        <span>${complete ? '✅' : '☐'} ${escapeHtml(game.number)}</span>
        <b>${escapeHtml(game.title.replace(/:.*/, ''))}</b>
        <em>${escapeHtml(recordSummary(id) || game.genre)}</em>
      </button>`;
    }).join('');
    const recent = (state.recent || []).map(id => getGame(id)).filter(Boolean).slice(0, 3);
    panel.innerHTML = `
      <div class="contract-copy">
        <span class="kicker">Daily Vault Contract · ${escapeHtml(contract.date)}</span>
        <h2>Win these three doors to claim today’s Contract Crown.</h2>
        <p>This is the first meta-layer: the vault now gives the player a reason to rotate through different games instead of only replaying one favorite.</p>
        <div class="hero-actions">
          <button class="btn btn--primary" id="contractContinue">Open Next Contract Door</button>
          <button class="btn" id="recommendedBtn">Open Best Next Game</button>
        </div>
      </div>
      <div>
        <div class="contract-meter"><span style="--value:${pct(done, contract.targets.length)}"></span></div>
        <div class="contract-grid">${targetCards}</div>
        <div class="mini-records">${recent.length ? recent.map(game => `<span>${escapeHtml(game.number)} · ${escapeHtml(recordSummary(game.id) || 'recent')}</span>`).join('') : '<span>No recent doors yet.</span>'}</div>
      </div>
    `;
    panel.querySelector('#contractContinue')?.addEventListener('click', () => openGame(contract.targets.find(id => !contract.completed[id]) || contract.targets[0]));
    panel.querySelector('#recommendedBtn')?.addEventListener('click', () => openGame(recommendNextGame()));
    panel.querySelectorAll('[data-contract-game]').forEach(button => button.addEventListener('click', () => openGame(button.dataset.contractGame)));
  }


  function renderGauntletPanel() {
    const panel = document.getElementById('gauntletPanel');
    if (!panel) return;
    const gauntlet = normalizeGauntlet();
    const activeTarget = gauntlet.route[gauntlet.index] || gauntlet.route[0];
    const route = gauntlet.route.map((id, index) => {
      const game = getGame(id);
      const stateLabel = gauntlet.completedAt || index < gauntlet.index ? '✅' : index === gauntlet.index && gauntlet.active ? '▶' : '☐';
      return `<button class="gauntlet-step ${index < gauntlet.index ? 'complete' : ''} ${index === gauntlet.index && gauntlet.active ? 'active' : ''}" data-gauntlet-game="${escapeHtml(id)}"><span>${stateLabel} ${escapeHtml(game.number)}</span><b>${escapeHtml(game.title.replace(/:.*/, ''))}</b></button>`;
    }).join('');
    panel.innerHTML = `
      <div>
        <span class="kicker">Vault Gauntlet · ${escapeHtml(pressureLabel())}</span>
        <h2>${gauntlet.active ? 'Five ordered crowns are live.' : gauntlet.completedAt ? 'Gauntlet crown secured.' : 'Start a five-door ordered run.'}</h2>
        <p>v1.3 adds a real cross-game streak mode. Win the current target, advance to the next door, and finish all five to unlock the Gauntlet Crown.</p>
        <div class="hero-actions">
          <button class="btn btn--primary" id="startGauntletBtn">${gauntlet.active ? 'Restart Gauntlet' : 'Start Vault Gauntlet'}</button>
          <button class="btn" id="openGauntletTarget" ${gauntlet.completedAt ? 'disabled' : ''}>Open Current Target</button>
        </div>
      </div>
      <div>
        <div class="contract-meter"><span style="--value:${pct(gauntlet.index, gauntlet.route.length || 5)}"></span></div>
        <div class="gauntlet-route">${route}</div>
        <div class="mini-records"><span>Mastery sigils: ${masteryCount()}</span><span>Lore unlocked: ${unlockedLoreCount()}/10</span><span>${escapeHtml(pressureLabel())}</span></div>
      </div>
    `;
    panel.querySelector('#startGauntletBtn')?.addEventListener('click', startGauntlet);
    panel.querySelector('#openGauntletTarget')?.addEventListener('click', () => openGame(activeTarget));
    panel.querySelectorAll('[data-gauntlet-game]').forEach(button => button.addEventListener('click', () => openGame(button.dataset.gauntletGame)));
  }


  function renderArmoryPanel() {
    const panel = document.getElementById('armoryPanel');
    if (!panel) return;
    const owned = ownedRelics().length;
    panel.innerHTML = `
      <div class="armory-copy">
        <span class="kicker">Vault Armory · v1.5</span>
        <h2>Forge persistent relics that change actual runs.</h2>
        <p>Vault Coins now matter. Relics are saved locally and modify live mechanics like HP, energy, trace cost, scanner charges, and crown payouts.</p>
        <div class="mini-records"><span>${owned}/${relics.length} relics owned</span><span>${state.coins} coins available</span><span>${hasRelic('operatorMomentum') ? 'Momentum payouts active' : 'Standard payouts'}</span></div>
      </div>
      <div class="armory-grid">
        ${relics.map(relic => {
          const ownedRelic = hasRelic(relic.id);
          const canBuy = state.coins >= relic.cost && !ownedRelic;
          return `<div class="relic-card ${ownedRelic ? 'owned' : ''}">
            <span>${escapeHtml(relic.tag)} · ${ownedRelic ? 'ACTIVE' : `${relic.cost} coins`}</span>
            <b>${escapeHtml(relic.name)}</b>
            <p>${escapeHtml(relic.desc)}</p>
            <button class="btn ${ownedRelic ? '' : 'btn--primary'}" data-buy-relic="${escapeHtml(relic.id)}" ${ownedRelic || !canBuy ? 'disabled' : ''}>${ownedRelic ? 'Forged' : 'Forge Relic'}</button>
          </div>`;
        }).join('')}
      </div>
    `;
    panel.querySelectorAll('[data-buy-relic]').forEach(button => button.addEventListener('click', () => buyRelic(button.dataset.buyRelic)));
  }


  function renderCrownTrialPanel() {
    const panel = document.getElementById('crownTrialPanel');
    if (!panel) return;
    const trial = normalizeCrownTrial();
    const target = crownTrialTarget();
    const route = trial.route.map((id, index) => {
      const game = getGame(id);
      const label = trial.completedAt || index < trial.index ? '✅' : index === trial.index && trial.active ? '▶' : '☐';
      return `<button class="gauntlet-step ${index < trial.index ? 'complete' : ''} ${index === trial.index && trial.active ? 'active' : ''}" data-crown-game="${escapeHtml(id)}"><span>${label} ${escapeHtml(game.number)}</span><b>${escapeHtml(game.title.replace(/:.*/, ''))}</b></button>`;
    }).join('');
    panel.innerHTML = `
      <div>
        <span class="kicker">Crown Trials · v1.5</span>
        <h2>${trial.active ? 'All ten vault doors are chained.' : trial.completedAt ? 'Crown Trial ascended.' : trial.collapsedAt ? 'Last Crown Trial collapsed.' : 'Clear all ten games in sequence.'}</h2>
        <p>A true anthology campaign: start with one relic, win every game in order, choose blessing or curse rewards between doors, and keep enough lives to survive the full vault.</p>
        <div class="hero-actions">
          <button class="btn btn--primary" id="startCrownTrialBtn">${trial.active ? 'Restart Crown Trial' : 'Start Crown Trial'}</button>
          <button class="btn" id="openCrownTarget" ${!trial.active || trial.pendingChoice ? 'disabled' : ''}>Open Current Trial Door</button>
        </div>
      </div>
      <div>
        <div class="contract-meter"><span style="--value:${pct(trial.index, trial.route.length || 10)}"></span></div>
        <div class="mini-records"><span>Lives: ${trial.lives}</span><span>Target: ${target ? escapeHtml(getGame(target).title.replace(/:.*/, '')) : 'None'}</span><span>${escapeHtml(pressureLabel())}</span></div>
        ${trial.pendingChoice ? `<div class="choice-row"><button class="btn btn--primary" id="chooseBlessing">Blessing: +1 Life</button><button class="btn" id="chooseCurse">Curse: XP + Coins</button></div>` : ''}
        <div class="gauntlet-route crown-route">${route}</div>
        <div class="log small-log">${(trial.modifiers || []).slice(-6).map(escapeHtml).map(item => `<div>${item}</div>`).join('') || '<div>No Crown Trial modifiers yet.</div>'}</div>
      </div>
    `;
    panel.querySelector('#startCrownTrialBtn')?.addEventListener('click', startCrownTrial);
    panel.querySelector('#openCrownTarget')?.addEventListener('click', () => openGame(target));
    panel.querySelector('#chooseBlessing')?.addEventListener('click', () => chooseCrownTrialBoon('blessing'));
    panel.querySelector('#chooseCurse')?.addEventListener('click', () => chooseCrownTrialBoon('curse'));
    panel.querySelectorAll('[data-crown-game]').forEach(button => button.addEventListener('click', () => openGame(button.dataset.crownGame)));
  }

  function renderBossPanel() {
    const panel = document.getElementById('bossPanel');
    if (!panel) return;
    const defeated = Object.keys(state.bossWins || {}).length;
    panel.innerHTML = `
      <div>
        <span class="kicker">Named Bosses · v1.5</span>
        <h2>${defeated}/10 vault bosses sealed.</h2>
        <p>Each boss challenge arms a harder version of its game and records a separate boss defeat ledger. Boss mode clears when you win or lose.</p>
      </div>
      <div class="boss-grid">
        ${games.map(game => {
          const boss = bossBook[game.id];
          const done = Boolean(state.bossWins?.[game.id]);
          return `<div class="boss-card ${done ? 'defeated' : ''}"><span>${done ? '✅ Defeated' : '☐ Waiting'} · ${escapeHtml(game.number)}</span><b>${escapeHtml(boss.name)}</b><p>${escapeHtml(boss.copy)}</p><button class="btn ${done ? '' : 'btn--primary'}" data-boss="${escapeHtml(game.id)}">${done ? 'Rechallenge' : 'Challenge Boss'}</button></div>`;
        }).join('')}
      </div>
    `;
    panel.querySelectorAll('[data-boss]').forEach(button => button.addEventListener('click', () => challengeBoss(button.dataset.boss)));
  }

  function renderRunHistoryPanel() {
    const panel = document.getElementById('runHistoryPanel');
    if (!panel) return;
    const rows = (state.runHistory || []).slice(0, 20);
    panel.innerHTML = `
      <div>
        <span class="kicker">Vault Journal · Run History</span>
        <h2>Last ${rows.length}/20 local runs.</h2>
        <p>Saved locally with difficulty, relic context, boss state, Crown Trial participation, and win/loss result.</p>
        <div class="hero-actions"><button class="btn btn--primary" id="shareLatestBtn" ${rows.find(r => r.won) ? '' : 'disabled'}>Generate Latest Victory Card</button><button class="btn" id="clearHistoryBtn">Clear Journal</button></div>
      </div>
      <div class="history-list">
        ${rows.length ? rows.map((entry, index) => `<div class="history-row ${entry.won ? 'won' : 'lost'}"><span>${entry.won ? '✅ Win' : '☐ Loss'} · ${new Date(entry.at).toLocaleString()}</span><b>${escapeHtml(entry.gameTitle.replace(/:.*/, ''))}</b><em>${escapeHtml(entry.difficulty)} · Level ${entry.level || 1}${entry.cosmetic ? ' · ' + escapeHtml(entry.cosmetic) : ''}${entry.boss ? ' · ' + escapeHtml(entry.boss) : ''}${entry.crownTrial ? ' · Crown Trial' : ''}</em><button class="btn btn--ghost" data-share-index="${index}" ${entry.won ? '' : 'disabled'}>Share Card</button></div>`).join('') : '<div class="history-row"><span>No runs recorded yet.</span><b>Open a vault door to start history.</b><em>Wins and losses are tracked locally.</em></div>'}
      </div>
    `;
    panel.querySelector('#shareLatestBtn')?.addEventListener('click', () => {
      const index = rows.findIndex(row => row.won);
      if (index >= 0) generateShareCard(index);
    });
    panel.querySelector('#clearHistoryBtn')?.addEventListener('click', () => { state.runHistory = []; persist(); renderRunHistoryPanel(); toast('Journal cleared', 'Local run history emptied.'); });
    panel.querySelectorAll('[data-share-index]').forEach(button => button.addEventListener('click', () => generateShareCard(Number(button.dataset.shareIndex))));
  }

  function renderCards() {
    const grid = document.getElementById('vaultGrid');
    grid.innerHTML = '';
    games.forEach(game => {
      const node = cardTemplate.content.firstElementChild.cloneNode(true);
      node.style.setProperty('--accent', game.accent);
      const contract = ensureDailyContract(false);
      if (contract.targets.includes(game.id)) node.classList.add('contract-door');
      if (contract.completed[game.id]) node.classList.add('contract-complete');
      if (state.campaign?.completed?.[game.id]) node.classList.add('campaign-complete');
      node.querySelector('.game-card__number').textContent = game.number;
      const logoImg = node.querySelector('.game-card__logo img');
      if (logoImg) { logoImg.src = game.logo; logoImg.alt = `${game.title} emblem`; }
      node.querySelector('.game-card__title').textContent = game.title;
      node.querySelector('.game-card__genre').textContent = game.genre;
      node.querySelector('.game-card__summary').textContent = game.summary;
      const wins = (state.gameSaves[game.id] || {}).wins || 0;
      if (wins >= 3) node.classList.add('mastery-door');
      const record = recordSummary(game.id);
      node.querySelector('.game-card__meta').textContent = `${game.meta} · Wins ${wins}${wins >= 3 ? ' · Mastery' : ''}${record ? ` · ${record}` : ''}`;
      node.addEventListener('pointermove', event => {
        const rect = node.getBoundingClientRect();
        node.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
        node.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      });
      node.addEventListener('click', () => openGame(game.id));
      grid.appendChild(node);
    });
  }

  function renderAchievements() {
    const grid = document.getElementById('achievementGrid');
    grid.innerHTML = Object.entries(achievements).map(([code, [title, desc]]) => `
      <div class="achievement ${state.achievements[code] ? 'unlocked' : ''}">
        <b>${state.achievements[code] ? '✅ ' : '☐ '}${escapeHtml(title)}</b>
        <span>${escapeHtml(desc)}</span>
      </div>
    `).join('');
  }


  function renderCodex() {
    const grid = document.getElementById('codexGrid');
    if (!grid) return;
    grid.innerHTML = games.map(game => {
      const wins = (state.gameSaves[game.id] || {}).wins || 0;
      const [title, body] = loreCards[game.id] || [game.title, game.summary];
      return `<div class="codex-card ${wins > 0 ? 'unlocked' : ''} ${wins >= 3 ? 'mastered' : ''}">
        <span>${wins > 0 ? '✅ Unlocked' : '☐ Locked'}${wins >= 3 ? ' · Mastery Sigil' : ''}</span>
        <b>${escapeHtml(title)}</b>
        <p>${wins > 0 ? escapeHtml(body) : 'Win this vault door once to unlock its doctrine card.'}</p>
      </div>`;
    }).join('');
  }

  function wireShell() {
    document.getElementById('continueBtn').addEventListener('click', () => {
      const latest = Object.entries(state.gameSaves).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))[0];
      openGame(latest ? latest[0] : games[0].id);
    });
    document.getElementById('randomBtn').addEventListener('click', () => openGame(sample(games).id));
    document.getElementById('installBtn')?.addEventListener('click', async () => {
      if (!deferredInstallPrompt) { toast('Install not available yet', 'Use the browser install button after deployment, or open from HTTPS for PWA install support.'); return; }
      state.pwa.promptSeenAt = Date.now();
      persist();
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      toast('Install prompt handled', 'Browser PWA install flow completed or dismissed.');
    });
    document.getElementById('exportBtn').addEventListener('click', async () => {
      const text = JSON.stringify(state, null, 2);
      grant('saveExporter');
      emitVaultEvent('save-exported', { bytes: text.length });
      try {
        await navigator.clipboard.writeText(text);
        toast('Save copied', 'Vault save JSON is on your clipboard.');
      } catch {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'skyearcade-save.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
    document.getElementById('importBtn').addEventListener('click', () => {
      const raw = prompt('Paste SkyeArcade save JSON to import into this browser.');
      if (!raw) return;
      try {
        const incoming = JSON.parse(raw);
        state = {
          ...defaultState(),
          ...incoming,
          version: VERSION,
          settings: normalizeSettings(incoming.settings || {}),
          achievements: incoming.achievements || {},
          gameSaves: incoming.gameSaves || {},
          contracts: incoming.contracts || { date: '', targets: [], completed: {} },
          gauntlet: incoming.gauntlet || { active: false, date: '', route: [], index: 0, wins: 0, completedAt: 0 },
          crownTrial: incoming.crownTrial || { active: false, route: [], index: 0, lives: 0, relicId: '', pendingChoice: false, completedAt: 0, collapsedAt: 0, modifiers: [] },
          armory: incoming.armory || {},
          bossChallenge: incoming.bossChallenge || '',
          bossWins: incoming.bossWins || {},
          tutorialsSeen: incoming.tutorialsSeen || {},
          runHistory: Array.isArray(incoming.runHistory) ? incoming.runHistory.slice(0, 20) : [],
          recent: Array.isArray(incoming.recent) ? incoming.recent.slice(0, 5) : [],
          campaign: normalizeCampaign(incoming.campaign || {}, incoming.gameSaves || {}),
          cosmetics: incoming.cosmetics || {},
          equippedCosmetic: incoming.equippedCosmetic || '',
          saveSlots: incoming.saveSlots || {}
        };
        ensureDailyContract(false);
        persist();
        grant('saveExporter');
        emitVaultEvent('save-imported', { wins: state.wins, coins: state.coins });
        toast('Save imported', 'Vault state restored into this browser.');
        render();
      } catch {
        toast('Import failed', 'That did not parse as valid vault save JSON.');
      }
    });
    document.getElementById('wipeBtn').addEventListener('click', () => {
      const ok = confirm('Reset the local SkyeArcade save on this browser?');
      if (!ok) return;
      state = defaultState();
      persist();
      toast('Vault reset', 'Local save cleared.');
      render();
    });
    document.getElementById('closeGameBtn').addEventListener('click', closeGame);
    document.getElementById('restartGameBtn').addEventListener('click', () => activeGameId && openGame(activeGameId, true));
  }

  function openGame(id, restart = false, options = {}) {
    const game = games.find(item => item.id === id) || games[0];
    updatePlayStreak();
    const requestedLevel = clamp(Number(options.level || state.campaign?.selectedLevel || 1), 1, 5);
    const safeLevel = levelUnlocked(game.id, requestedLevel) ? requestedLevel : 1;
    if (activeCleanup) activeCleanup();
    activeCleanup = null;
    activeGameId = game.id;
    activeRunAwards = new Set();
    activeRunMeta = { level: safeLevel, source: options.source || 'quickplay' };
    state.recent = [game.id, ...(state.recent || []).filter(item => item !== game.id)].slice(0, 5);
    try { history.replaceState(null, '', `#${game.id}`); } catch {}
    setGameSave(game.id, {}, { touch: true, quiet: true });
    const overlay = document.getElementById('gameOverlay');
    const host = document.getElementById('gameHost');
    overlay.classList.add('active');
    document.getElementById('gameWindowTitle').textContent = game.title;
    document.getElementById('gameWindowSub').textContent = `${game.genre} · ${restart ? 'Fresh run' : 'Playable core'} · ${levelInfo(game.id, safeLevel).title} · ${runContext(game.id)}`;
    audioFx(isBossRun(game.id) ? 'boss' : 'open');
    emitVaultEvent('game-opened', { gameId: game.id, level: safeLevel, difficulty: difficultyInfo().name, source: activeRunMeta.source });
    host.innerHTML = '';
    activeCleanup = game.start(host, { restart });
    renderCards();
  }

  function closeGame() {
    if (activeCleanup) activeCleanup();
    activeCleanup = null;
    activeGameId = null;
    document.getElementById('gameOverlay')?.classList.remove('active');
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
    renderOnboardingPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderContractPanel();
    renderGauntletPanel();
    renderArmoryPanel();
    renderCampaignPanel();
    renderShopPanel();
    renderSaveSlotsPanel();
    renderAnalyticsPanel();
    renderEngagementPanels();
    renderCrownTrialPanel();
    renderBossPanel();
    renderRunHistoryPanel();
    renderCards();
    renderAchievements();
    renderCodex();
    renderStatsOnly();
  }

  function stage(host, title, hudHtml = '') {
    const gameId = activeGameId;
    const tips = gameId && tutorials[gameId] ? tutorials[gameId] : [];
    const tutorialHtml = state.settings.tutorials && tips.length ? `
      <details class="tutorial-card" open>
        <summary>How to Win · ${escapeHtml(getGame(gameId).title.replace(/:.*/, ''))}</summary>
        <ol>${tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ol>
      </details>` : '';
    const bossHtml = gameId && isBossRun(gameId) ? `<div class="boss-alert"><b>Boss Trial:</b> ${escapeHtml(bossLabel(gameId))} · harder rules are active.</div>` : '';
    const li = levelInfo(gameId, runLevel());
    host.innerHTML = `<div class="game-stage ${escapeHtml(cosmeticClass())}"><div class="hud">${hudHtml}<span class="pill">Difficulty <b>${escapeHtml(difficultyInfo().name)}</b></span><span class="pill">Level <b>${runLevel()} · ${escapeHtml(li.title)}</b></span></div>${tutorialHtml}<div class="level-alert"><b>Level Pack:</b> ${escapeHtml(li.title)} · ${escapeHtml(li.modifier)}</div>${bossHtml}<div class="notice" id="notice">${escapeHtml(title)}</div><div id="gameContent"></div></div>`;
    if (gameId && state.settings.tutorials) {
      state.tutorialsSeen = { ...(state.tutorialsSeen || {}), [gameId]: Date.now() };
      if (games.every(game => state.tutorialsSeen?.[game.id])) grant('tutorialScholar');
      persist();
    }
    return {
      root: host.querySelector('.game-stage'),
      notice: host.querySelector('#notice'),
      content: host.querySelector('#gameContent')
    };
  }

  function recoverBackup() {
    const backup = loadBackupState();
    if (!backup) { toast('No backup found', 'No local backup slot is available in this browser.'); return; }
    state = { ...defaultState(), ...backup, version: VERSION, settings: normalizeSettings(backup.settings || {}) };
    persist();
    grant('saveRecovered');
    toast('Backup recovered', 'The local Reliquary backup slot restored your vault state.');
    render();
  }

  function downloadBackup() {
    const text = localStorage.getItem(BACKUP_KEY) || JSON.stringify(state, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skyearcade-reliquary-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    grant('saveExporter');
  }

  function generateShareCard(historyIndex = 0) {
    const entry = (state.runHistory || [])[historyIndex] || (state.runHistory || []).find(row => row.won);
    if (!entry || !entry.won) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 1200, 630);
    g.addColorStop(0, '#05030b');
    g.addColorStop(.52, '#140b2e');
    g.addColorStop(1, '#2b2108');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = 'rgba(248,233,161,.16)';
    ctx.beginPath(); ctx.arc(1010, 110, 250, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(248,233,161,.72)';
    ctx.lineWidth = 4;
    ctx.strokeRect(54, 54, 1092, 522);
    ctx.fillStyle = '#f8e9a1';
    ctx.font = '900 42px system-ui, sans-serif';
    ctx.fillText('SKYEARCADE · SOVEREIGN VAULT', 88, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 74px system-ui, sans-serif';
    ctx.fillText('CROWN SECURED', 88, 235);
    ctx.font = '800 38px system-ui, sans-serif';
    ctx.fillText(entry.gameTitle.replace(/:.*/, ''), 88, 306);
    ctx.fillStyle = '#cfc3db';
    ctx.font = '500 28px system-ui, sans-serif';
    ctx.fillText(`Difficulty: ${entry.difficulty} · Level ${entry.level || 1}${entry.boss ? ' · Boss: ' + entry.boss : ''}`, 88, 370);
    ctx.fillText(`Relics: ${entry.relics.length ? entry.relics.join(', ') : 'None'}`, 88, 416);
    ctx.fillText(`Profile: ${state.profile} · ${new Date(entry.at).toLocaleString()}`, 88, 462);
    ctx.fillStyle = '#f8e9a1';
    ctx.font = '900 116px system-ui, sans-serif';
    ctx.fillText('SV', 900, 420);
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skyearcade-victory-card.png';
    a.click();
    audioFx('share');
    grant('shareCrafter');
    toast('Share card generated', 'Victory card exported as a PNG.');
  }

  function setNotice(ctx, text) { ctx.notice.textContent = text; }
  function impact(root, x, y) {
    const node = document.createElement('span');
    node.className = 'impact';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    root.appendChild(node);
    playTone(rand(180, 520), .045, 'square');
    setTimeout(() => node.remove(), 720);
  }

  function startSkyeAce(host) {
    const ctx = stage(host, 'Choose a card. Higher power wins the exchange. Spades are trump damage.');
    const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    const symbols = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
    const labels = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const makeCard = () => {
      const value = rand(2, 14);
      const suit = sample(suits);
      return { value, suit, label: labels[value - 2], power: value + (suit === 'spades' ? 3 : 0) };
    };
    const pressure = isPressureMode() || isBossRun('skyeace');
    const tier = challengeLevel() + (isBossRun('skyeace') ? 1 : 0);
    const playerMax = (pressure ? 36 : 42) - tier * 2 + (hasRelic('aceMantle') ? 6 : 0);
    const rivalMax = 42 + tier * 6;
    let game = { playerHp: playerMax, rivalHp: rivalMax, round: 1, hand: Array.from({ length: 5 }, makeCard), locked: false, focus: pressure ? (hasRelic('aceMantle') ? 1 : 0) : (hasRelic('aceMantle') ? 2 : 1), streak: (state.gameSaves.skyeace || {}).streak || 0 };

    function renderGame() {
      ctx.content.innerHTML = `
        <div class="grid-2" style="margin-top:14px">
          <div class="micro-card ${game.playerHp < 16 ? 'shake' : ''}">
            <h3>${escapeHtml(state.profile)}</h3>
            <div class="bar" aria-label="Player HP"><span style="--value:${pct(game.playerHp, playerMax)}"></span></div>
            <p>HP ${game.playerHp}/${playerMax} · Streak ${game.streak} · ${escapeHtml(pressureLabel())}</p>
          </div>
          <div class="micro-card ${game.rivalHp < 16 ? 'shake' : ''}">
            <h3>Rival House</h3>
            <div class="bar" aria-label="Rival HP"><span style="--value:${pct(game.rivalHp, rivalMax)}"></span></div>
            <p>HP ${game.rivalHp}/${rivalMax} · Round ${game.round}</p>
          </div>
        </div>
        <div class="card-row" id="hand"></div>
        <div class="controls"><button class="btn btn--primary" id="focusDraw" ${game.focus <= 0 || game.locked ? 'disabled' : ''}>Focus Draw (${game.focus})</button></div>
        <div class="log" id="battleLog"></div>
      `;
      const hand = ctx.content.querySelector('#hand');
      game.hand.forEach((card, index) => {
        const btn = document.createElement('button');
        btn.className = `play-card ${card.suit}`;
        btn.innerHTML = `<span class="rank">${card.label}</span><span>${card.suit === 'spades' ? 'TRUMP' : card.suit.toUpperCase()}</span><span class="suit">${symbols[card.suit]}</span>`;
        btn.disabled = game.locked;
        btn.addEventListener('click', () => play(index, btn));
        hand.appendChild(btn);
      });
      ctx.content.querySelector('#focusDraw')?.addEventListener('click', focusDraw);
    }

    function focusDraw() {
      if (game.locked || game.focus <= 0) return;
      game.focus -= 1;
      game.hand = game.hand
        .sort((a, b) => a.power - b.power)
        .map((card, index) => index < 2 ? { value: rand(10, 14), suit: 'spades', label: labels[rand(8, 12)], power: rand(13, 18) } : card)
        .sort(() => Math.random() - .5);
      setNotice(ctx, 'Focus Draw burned once: weak cards converted into pressure spades.');
      renderGame();
    }

    function log(text) {
      const node = ctx.content.querySelector('#battleLog');
      if (!node) return;
      const line = document.createElement('div');
      line.textContent = text;
      node.prepend(line);
    }

    function play(index, btn) {
      if (game.locked) return;
      game.locked = true;
      btn.classList.add('card-slam');
      const player = game.hand[index];
      const rival = makeCard();
      const diff = player.power - rival.power;
      const damage = Math.max(3, Math.abs(diff) + (player.suit === 'spades' ? (hasRelic('aceMantle') ? 4 : 2) : 0));
      const rect = ctx.root.getBoundingClientRect();
      impact(ctx.root, rect.width * Math.random() * .7 + 80, 180 + Math.random() * 220);
      if (diff >= 0) {
        game.rivalHp = clamp(game.rivalHp - damage, 0, rivalMax);
        setNotice(ctx, `${player.label}${symbols[player.suit]} beat ${rival.label}${symbols[rival.suit]}. Rival takes ${damage}.`);
      } else {
        game.playerHp = clamp(game.playerHp - (pressure ? damage + 2 : damage), 0, playerMax);
        setNotice(ctx, `${rival.label}${symbols[rival.suit]} countered ${player.label}${symbols[player.suit]}. You take ${damage}.`);
      }
      game.hand[index] = makeCard();
      game.round += 1;
      log(`Round ${game.round - 1}: ${player.label}${symbols[player.suit]} vs ${rival.label}${symbols[rival.suit]} · ${diff >= 0 ? 'hit' : 'counter'} ${damage}`);
      setGameSave('skyeace', { streak: game.streak, lastRound: game.round });
      if (game.rivalHp <= 0 || game.playerHp <= 0) {
        const won = game.rivalHp <= 0;
        game.streak = won ? game.streak + 1 : 0;
        setRecord('skyeace', 'streak', game.streak);
        if (won) awardWin('skyeace', 'skyeaceWin', 120);
        else markRunLoss('skyeace', 'Player HP fell in the arena.');
        setNotice(ctx, won ? 'Arena won. The Ace Crown is yours.' : 'You were cut down. Restart and reclaim the table.');
      }
      setTimeout(() => { game.locked = game.rivalHp <= 0 || game.playerHp <= 0; renderGame(); }, 520);
    }

    renderGame();
    return () => {};
  }

  function startUptimeWar(host) {
    const pressure = isPressureMode() || isBossRun('uptime');
    const tier = challengeLevel() + (isBossRun('uptime') ? 1 : 0);
    const targetWaves = 5 + tier;
    const startEnergy = Math.max(38, 80 - tier * 10) + (hasRelic('originAegis') ? 20 : 0);
    const startCore = Math.max(10, 20 - tier * 2) + (hasRelic('originAegis') ? 4 : 0);
    const ctx = stage(host, 'Click inside the arena to place defense nodes. Start waves and protect the origin core.', `<span class="pill">Mode <b id="modeLabel">Place Node</b></span><span class="pill">Energy <b id="energyLabel">${startEnergy}</b></span><span class="pill">Wave <b id="waveLabel">0/${targetWaves}</b></span><span class="pill">Core <b id="coreLabel">${startCore}</b></span>`);
    ctx.content.innerHTML = `<canvas class="game-canvas" width="1000" height="520" id="uptimeCanvas"></canvas><div class="controls"><button class="btn btn--primary" id="startWave">Start Wave</button><button class="btn" id="placeMode">Place Node</button><button class="btn" id="upgradeMode">Upgrade Node</button><button class="btn btn--primary" id="overclockCore">Overclock Core $35</button></div>`;
    const canvas = ctx.content.querySelector('#uptimeCanvas');
    const c = canvas.getContext('2d');
    const modeLabel = ctx.root.querySelector('#modeLabel');
    const energyLabel = ctx.root.querySelector('#energyLabel');
    const waveLabel = ctx.root.querySelector('#waveLabel');
    const coreLabel = ctx.root.querySelector('#coreLabel');
    const towers = [];
    const enemies = [];
    const shots = [];
    const cell = 72;
    let energy = startEnergy, wave = 0, core = startCore, overclock = 0, running = true, mode = 'place', spawning = false, last = performance.now(), win = false, lose = false;

    function startWave() {
      if (spawning || win || lose) return;
      wave += 1;
      spawning = true;
      let count = 5 + wave * 3;
      let spawned = 0;
      const interval = setInterval(() => {
        if (!running || spawned >= count) { clearInterval(interval); spawning = false; return; }
        enemies.push({ x: 970, y: 74 + rand(0, 4) * 84, hp: 18 + wave * (pressure ? 7 : 5), maxHp: 18 + wave * (pressure ? 7 : 5), speed: .32 + wave * (pressure ? .048 : .035) });
        spawned += 1;
      }, 540);
    }

    function draw() {
      c.clearRect(0, 0, canvas.width, canvas.height);
      const grad = c.createRadialGradient(500, 190, 50, 500, 260, 640);
      grad.addColorStop(0, 'rgba(139,92,246,.22)');
      grad.addColorStop(1, 'rgba(5,3,11,.1)');
      c.fillStyle = grad;
      c.fillRect(0, 0, canvas.width, canvas.height);
      for (let x = 80; x <= 800; x += cell) {
        for (let y = 45; y <= 410; y += 84) {
          c.strokeStyle = 'rgba(255,255,255,.08)';
          c.strokeRect(x, y, 56, 56);
        }
      }
      c.fillStyle = 'rgba(248,233,161,.16)';
      c.fillRect(18, 38, 38, 424);
      c.fillStyle = '#f8e9a1';
      c.font = '700 18px system-ui';
      c.fillText('ORIGIN', 8, 28);
      towers.forEach(t => {
        c.save();
        c.translate(t.x, t.y);
        c.fillStyle = t.level > 1 ? '#f8e9a1' : '#67e8f9';
        c.shadowColor = t.level > 1 ? '#f8e9a1' : '#67e8f9';
        c.shadowBlur = 18;
        c.beginPath();
        c.arc(0, 0, 18 + t.level * 3, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,.42)';
        c.stroke();
        c.restore();
      });
      enemies.forEach(e => {
        c.fillStyle = '#ff4d7d';
        c.shadowColor = '#ff4d7d';
        c.shadowBlur = 12;
        c.beginPath();
        c.roundRect(e.x - 18, e.y - 16, 36, 32, 10);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = 'rgba(255,255,255,.18)';
        c.fillRect(e.x - 20, e.y - 26, 40, 5);
        c.fillStyle = '#6ee7b7';
        c.fillRect(e.x - 20, e.y - 26, 40 * e.hp / e.maxHp, 5);
      });
      shots.forEach(s => {
        c.strokeStyle = '#f8e9a1';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(s.x, s.y);
        c.lineTo(s.tx, s.ty);
        c.stroke();
      });
    }

    function tick(now) {
      if (!running) return;
      const dt = Math.min(32, now - last);
      last = now;
      shots.length = 0;
      overclock = Math.max(0, overclock - dt);
      enemies.forEach(e => { e.x -= e.speed * dt * (overclock > 0 ? .68 : 1); });
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].x < 58) {
          core -= 1;
          enemies.splice(i, 1);
          ctx.root.classList.add('shake');
          setTimeout(() => ctx.root.classList.remove('shake'), 280);
        }
      }
      towers.forEach(t => {
        t.cool = Math.max(0, t.cool - dt);
        if (t.cool > 0) return;
        const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) < 180 + t.level * 34 + (overclock > 0 ? 28 : 0));
        if (target) {
          target.hp -= 7 + t.level * 4 + (overclock > 0 ? 4 : 0);
          shots.push({ x: t.x, y: t.y, tx: target.x, ty: target.y });
          t.cool = Math.max(180, 620 - t.level * 80);
          if (target.hp <= 0) energy += 5;
        }
      });
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0) enemies.splice(i, 1);
      if (core <= 0 && !lose) { lose = true; setNotice(ctx, 'Core breached. Restart and harden the grid.'); markRunLoss('uptime', 'Origin core breached.'); }
      if (wave >= targetWaves && enemies.length === 0 && !spawning && !win && !lose) { win = true; setNotice(ctx, 'All waves defeated. SoveReign13 stayed online.'); awardWin('uptime', 'uptimeWin', 160); }
      updateHud();
      draw();
      requestAnimationFrame(tick);
    }

    function updateHud() {
      modeLabel.textContent = mode === 'place' ? 'Place Node' : 'Upgrade Node';
      energyLabel.textContent = energy;
      waveLabel.textContent = `${wave}/${targetWaves}`;
      coreLabel.textContent = overclock > 0 ? `${core} ⚡` : core;
      setRecord('uptime', 'bestWave', wave);
    }

    function clickCanvas(event) {
      if (win || lose) return;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (canvas.height / rect.height);
      const gx = 80 + Math.round((x - 80) / cell) * cell + 28;
      const gy = 45 + Math.round((y - 45) / 84) * 84 + 28;
      if (gx < 80 || gx > 880 || gy < 45 || gy > 460) return;
      const existing = towers.find(t => Math.hypot(t.x - gx, t.y - gy) < 12);
      if (mode === 'place') {
        if (existing || energy < 20) return;
        towers.push({ x: gx, y: gy, level: 1, cool: 0 });
        energy -= 20;
      } else if (existing && energy >= 25) {
        existing.level += 1;
        energy -= 25;
      }
      updateHud();
      draw();
    }

    canvas.addEventListener('click', clickCanvas);
    ctx.content.querySelector('#startWave').addEventListener('click', startWave);
    ctx.content.querySelector('#placeMode').addEventListener('click', () => { mode = 'place'; updateHud(); });
    ctx.content.querySelector('#upgradeMode').addEventListener('click', () => { mode = 'upgrade'; updateHud(); });
    ctx.content.querySelector('#overclockCore').addEventListener('click', () => {
      const overclockCost = hasRelic('originAegis') ? 25 : 35;
      if (energy < overclockCost || win || lose) return;
      energy -= overclockCost; overclock = 5000;
      setNotice(ctx, 'Core overclock active: enemies slowed and node damage boosted for five seconds.');
      updateHud();
    });
    updateHud();
    requestAnimationFrame(tick);
    return () => { running = false; canvas.removeEventListener('click', clickCanvas); };
  }

  function startDnsDominion(host) {
    const ctx = stage(host, 'Click tiles to build a packet route from DOMAIN to ORIGIN. Avoid hazard latency.');
    let level = (state.gameSaves.dns || {}).level || 1;
    const pressure = isPressureMode() || isBossRun('dns');
    const tier = challengeLevel() + (isBossRun('dns') ? 1 : 0);
    let moves = (pressure ? 14 : 18) + (hasRelic('veyraCompass') ? 2 : 0);
    const size = 7;
    let grid = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    function newPuzzle() {
      moves = Math.max(pressure ? 6 : 10, (pressure ? 17 : 20) - level - tier) + (hasRelic('veyraCompass') ? 2 : 0);
      grid = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => ({ x, y, path: false, hazard: Math.random() < (pressure ? .18 : .13) + level * .01 })));
      // Hardening: every puzzle now has at least one guaranteed safe route lane.
      // The player still has to build it, but random hazard generation can no longer create an impossible board.
      for (let x = 0; x < size; x += 1) grid[3][x].hazard = false;
      grid[3][0].path = true;
      grid[3][6].path = true;
      renderPuzzle();
    }

    function connected() {
      const seen = new Set(['0,3']);
      const q = [[0,3]];
      while (q.length) {
        const [x,y] = q.shift();
        if (x === 6 && y === 3) return true;
        for (const [dx,dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const key = `${nx},${ny}`;
          if (seen.has(key)) continue;
          const cell = grid[ny][nx];
          if (!cell.path || cell.hazard) continue;
          seen.add(key); q.push([nx,ny]);
        }
      }
      return false;
    }

    function renderPuzzle() {
      const activePaths = grid.flat().filter(t => t.path).length;
      ctx.content.innerHTML = `
        <div class="hud" style="margin-top:14px"><span class="pill">Level <b>${level}</b></span><span class="pill">Moves <b>${moves}</b></span><span class="pill">Route Tiles <b>${activePaths}</b></span></div>
        <div class="tile-grid" id="dnsGrid" style="grid-template-columns:repeat(${size},54px)"></div>
        <div class="controls"><button class="btn btn--primary" id="checkRoute">Send Packet</button><button class="btn" id="traceRoute">Trace Safe Lane</button><button class="btn" id="newRoute">New Puzzle</button></div>
      `;
      const node = ctx.content.querySelector('#dnsGrid');
      grid.flat().forEach(tile => {
        const b = document.createElement('button');
        const isStart = tile.x === 0 && tile.y === 3;
        const isEnd = tile.x === 6 && tile.y === 3;
        b.className = `tile ${tile.path ? 'path' : ''} ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${tile.hazard ? 'hazard' : ''}`;
        b.textContent = isStart ? 'D' : isEnd ? 'O' : tile.hazard ? '⚠' : tile.path ? '◆' : '·';
        b.disabled = isStart || isEnd;
        b.addEventListener('click', () => {
          if (moves <= 0) return;
          tile.path = !tile.path;
          moves -= 1;
          renderPuzzle();
        });
        node.appendChild(b);
      });
      ctx.content.querySelector('#checkRoute').addEventListener('click', () => {
        if (connected()) {
          const score = Math.max(25, 130 - (activePaths * 4) + moves * 5);
          setNotice(ctx, `Packet delivered. Route latency score: ${score}. Level ${level + 1} unlocked.`);
          level += 1;
          state.xp += score;
          state.coins += 17;
          setGameSave('dns', { level }, { quiet: true });
          setRecord('dns', 'bestRouteScore', score);
          if (level >= 4) awardWin('dns', 'dnsWin', 130);
          renderStatsOnly();
          renderAchievements();
          setTimeout(newPuzzle, 900);
        } else {
          setNotice(ctx, moves <= 0 ? 'Route failed and moves are gone. Open a new puzzle.' : 'Packet dropped. Route is not connected or crosses hazard latency.');
          if (moves <= 0) markRunLoss('dns', 'DNS route failed with no moves left.');
        }
      });
      ctx.content.querySelector('#traceRoute').addEventListener('click', () => {
        const traceCost = hasRelic('veyraCompass') ? 1 : 2;
        if (moves < traceCost) return;
        for (let x = 0; x < size; x += 1) grid[3][x].path = true;
        moves = Math.max(0, moves - traceCost);
        setNotice(ctx, `Trace pulse spent ${traceCost} move${traceCost === 1 ? '' : 's'} and highlighted the guaranteed safe lane.`);
        renderPuzzle();
      });
      ctx.content.querySelector('#newRoute').addEventListener('click', newPuzzle);
    }

    newPuzzle();
    return () => {};
  }

  function startScepter(host) {
    const ctx = stage(host, 'Command the release. Use cards to damage errors and keep stability above zero.');
    const cards = [
      ['npm ci', 12, 0, 'Clean install hits dependency bugs.'],
      ['Patch Env', 8, 6, 'Fix secrets drift and recover stability.'],
      ['Purge Cache', 10, 3, 'Burn stale assets.'],
      ['Smoke Test', 7, 9, 'Verify behavior and stabilize.'],
      ['Rollback Trap', 16, -2, 'Heavy hit, but stressful.'],
      ['Pin Runtime', 11, 4, 'Stop version chaos.']
    ];
    const enemies = ['Missing Env Var', 'Package Lock Ghoul', '404 Hydra', 'Timeout Wraith', 'Cache Demon'];
    const pressure = isPressureMode() || isBossRun('scepter');
    const tier = challengeLevel() + (isBossRun('scepter') ? 1 : 0);
    let run = { stage: 1, stability: Math.max(18, (pressure ? 30 : 35) - tier * 3) + (hasRelic('operatorMomentum') ? 5 : 0), enemy: enemies[0], enemyHp: 30, maxHp: 30, heat: pressure ? 2 : 0, rollback: !pressure, hand: [], log: [pressure ? 'Pressure Mode armed. No free rollback in this room.' : 'Release room armed. Choose commands carefully.'], finished: false };
    function drawHand() { run.hand = Array.from({ length: 4 }, () => sample(cards)); }
    function nextEnemy() {
      run.enemy = enemies[Math.min(run.stage - 1, enemies.length - 1)];
      run.maxHp = 25 + run.stage * (pressure ? 15 : 12) + tier * 4;
      run.enemyHp = run.maxHp;
      drawHand();
    }
    function renderRun() {
      ctx.content.innerHTML = `
        <div class="grid-2" style="margin-top:14px">
          <div class="micro-card"><h3>Release Stability</h3><div class="bar"><span style="--value:${pct(run.stability, 45)}"></span></div><p>${run.stability}/45 stability · Heat ${run.heat}/12</p></div>
          <div class="micro-card"><h3>${escapeHtml(run.enemy)}</h3><div class="bar"><span style="--value:${pct(run.enemyHp, run.maxHp)}"></span></div><p>Stage ${run.stage}/5 · ${run.enemyHp}/${run.maxHp} HP</p></div>
        </div>
        <div class="grid-4" id="commandCards" style="margin-top:14px"></div>
        <div class="controls"><button class="btn" id="redraw">Redraw Commands (-5 stability)</button><button class="btn btn--primary" id="emergencyRollback" ${run.rollback ? '' : 'disabled'}>Emergency Rollback</button></div>
        <div class="log" id="scepterLog">${run.log.map(escapeHtml).map(t=>`<div>${t}</div>`).join('')}</div>
      `;
      const row = ctx.content.querySelector('#commandCards');
      run.hand.forEach((card, index) => {
        const b = document.createElement('button');
        b.className = 'micro-card';
        b.innerHTML = `<h3>${escapeHtml(card[0])}</h3><p>${escapeHtml(card[3])}</p><span class="pill">Damage <b>${card[1]}</b></span> <span class="pill">Stability <b>${card[2] >= 0 ? '+' : ''}${card[2]}</b></span>`;
        b.disabled = run.finished;
        b.addEventListener('click', () => playCard(index));
        row.appendChild(b);
      });
      ctx.content.querySelector('#redraw').addEventListener('click', () => { if (run.finished) return; run.stability -= 5; run.heat = clamp(run.heat - 2, 0, 12); drawHand(); log('Commands redrawn. Stability paid. Heat vented.'); renderRun(); checkLose(); });
      ctx.content.querySelector('#emergencyRollback')?.addEventListener('click', () => {
        if (run.finished || !run.rollback) return;
        run.rollback = false;
        run.stability = clamp(run.stability + 18, 0, 45);
        run.heat = clamp(run.heat + 5, 0, 12);
        log('Emergency rollback restored stability but spiked heat.');
        setNotice(ctx, 'Rollback fired. Stability restored; heat increased.');
        renderRun();
      });
    }
    function log(text) {
      run.log.unshift(text);
      run.log = run.log.slice(0, 8);
    }
    function playCard(index) {
      if (run.finished) return;
      const card = run.hand[index];
      run.enemyHp = clamp(run.enemyHp - card[1], 0, run.maxHp);
      run.stability = clamp(run.stability + card[2], 0, 45);
      run.heat = clamp(run.heat + rand(1, 4), 0, 12);
      const retaliation = rand(3, 8) + run.stage + Math.floor(run.heat / 4) + tier;
      if (run.enemyHp > 0) run.stability = clamp(run.stability - retaliation, 0, 45);
      setNotice(ctx, `${card[0]} executed. ${run.enemy} took ${card[1]}. ${run.enemyHp > 0 ? `Retaliation hit stability for ${retaliation}. Heat ${run.heat}/12.` : 'Error defeated.'}`);
      if (run.enemyHp <= 0) {
        if (run.stage >= 5) { run.finished = true; setNotice(ctx, 'Production release shipped. SceptR holds the crown.'); awardWin('scepter', 'releaseWin', 155); }
        else { run.stage += 1; run.heat = Math.max(0, run.heat - 4); log(`Stage cleared. Heat vented to ${run.heat}/12.`); nextEnemy(); }
      } else {
        drawHand();
      }
      setRecord('scepter', 'bestStage', run.stage);
      log(`${card[0]} → ${card[1]} damage.`);
      renderRun();
      checkLose();
    }
    function checkLose() { if (run.stability <= 0 && !run.failed) { run.failed = true; run.finished = true; setNotice(ctx, 'Release collapsed. Restart and command cleaner.'); markRunLoss('scepter', 'Release stability collapsed.'); } }
    drawHand(); nextEnemy(); renderRun();
    return () => {};
  }

  function startReliquary(host) {
    const ctx = stage(host, 'Recover three artifacts, then reach the rollback gate. Use arrows, WASD, or buttons.');
    ctx.content.innerHTML = `<canvas class="game-canvas" width="760" height="520" id="vaultCanvas"></canvas><div class="controls"><button class="btn" data-move="0,-1">↑</button><button class="btn" data-move="-1,0">←</button><button class="btn" data-move="1,0">→</button><button class="btn" data-move="0,1">↓</button><button class="btn btn--primary" id="scanVault">Scanner Pulse</button></div>`;
    const canvas = ctx.content.querySelector('#vaultCanvas');
    const c = canvas.getContext('2d');
    const size = 8, tile = 58;
    const pressure = isPressureMode() || isBossRun('reliquary');
    const tier = challengeLevel() + (isBossRun('reliquary') ? 1 : 0);
    let player = { x: 0, y: 0, hp: Math.max(3, (pressure ? 5 : 6) - tier) + (hasRelic('reliquaryBeacon') ? 1 : 0), art: 0, turns: 0, scanner: (pressure ? 1 : 2) + (hasRelic('reliquaryBeacon') ? 1 : 0) };
    let artifacts = [{ x: 2, y: 1 }, { x: 5, y: 3 }, { x: 3, y: 6 }];
    const reserved = (x, y) => (x === 0 && y === 0) || (x === 7 && y === 7) || artifacts.some(a => a.x === x && a.y === y);
    let hazards = [];
    while (hazards.length < ((pressure ? 16 : 12) + tier * 2)) {
      const h = { x: rand(1, 7), y: rand(0, 7) };
      if (!reserved(h.x, h.y) && !hazards.some(old => old.x === h.x && old.y === h.y)) hazards.push(h);
    }
    let done = false;
    function draw() {
      c.clearRect(0,0,canvas.width,canvas.height);
      c.fillStyle = 'rgba(5,3,11,.75)'; c.fillRect(0,0,canvas.width,canvas.height);
      c.font = '800 18px system-ui'; c.fillStyle = '#f8e9a1'; c.fillText(`HP ${player.hp} · Artifacts ${player.art}/3 · Turns ${player.turns} · Scans ${player.scanner}`, 28, 34);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        c.strokeStyle = 'rgba(255,255,255,.11)'; c.strokeRect(28 + x*tile, 58 + y*tile, tile-6, tile-6);
      }
      c.fillStyle = '#6ee7b7'; c.fillRect(28+7*tile+8, 58+7*tile+8, tile-22, tile-22);
      c.fillStyle = '#ff4d7d'; hazards.forEach(h => c.fillRect(28+h.x*tile+12, 58+h.y*tile+12, tile-30, tile-30));
      c.fillStyle = '#f8e9a1'; artifacts.forEach(a => { c.beginPath(); c.arc(28+a.x*tile+26, 58+a.y*tile+26, 16, 0, Math.PI*2); c.fill(); });
      c.fillStyle = '#8b5cf6'; c.beginPath(); c.arc(28+player.x*tile+26, 58+player.y*tile+26, 20, 0, Math.PI*2); c.fill();
    }
    function move(dx, dy) {
      if (done) return;
      player.x = clamp(player.x + dx, 0, 7); player.y = clamp(player.y + dy, 0, 7); player.turns += 1;
      const artifactIndex = artifacts.findIndex(a => a.x === player.x && a.y === player.y);
      if (artifactIndex >= 0) { artifacts.splice(artifactIndex, 1); player.art += 1; setNotice(ctx, `Artifact recovered. ${3 - player.art} remain.`); }
      if (hazards.some(h => h.x === player.x && h.y === player.y)) { player.hp -= 1; setNotice(ctx, `Deletion storm hit. HP ${player.hp}.`); }
      hazards = hazards.map(h => {
        if (Math.random() >= .38) return h;
        const next = { x: clamp(h.x + rand(-1, 1), 0, 7), y: clamp(h.y + rand(-1, 1), 0, 7) };
        return reserved(next.x, next.y) ? h : next;
      });
      if (player.hp <= 0) { done = true; setNotice(ctx, 'Vault consumed you. Restart the extraction.'); markRunLoss('reliquary', 'Vault hazards consumed the runner.'); }
      if (player.x === 7 && player.y === 7 && player.art >= 3) { done = true; setNotice(ctx, 'Extraction complete. Reliquary artifacts secured.'); awardWin('reliquary', 'reliquaryWin', 145); }
      setRecord('reliquary', 'bestArtifacts', player.art);
      draw();
    }
    function key(e) { const m = { ArrowUp:[0,-1], w:[0,-1], ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0], ArrowDown:[0,1], s:[0,1] }[e.key]; if (m) { e.preventDefault(); move(m[0], m[1]); } }
    ctx.content.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => { const [dx,dy]=b.dataset.move.split(',').map(Number); move(dx,dy); }));
    ctx.content.querySelector('#scanVault').addEventListener('click', () => {
      if (done || player.scanner <= 0) return;
      player.scanner -= 1;
      hazards = hazards.filter(h => Math.hypot(h.x - player.x, h.y - player.y) > 1.45);
      setNotice(ctx, `Scanner pulse cleared nearby deletion storms. ${player.scanner} scans remain.`);
      draw();
    });
    window.addEventListener('keydown', key); draw();
    return () => window.removeEventListener('keydown', key);
  }

  function startKoatsu(host) {
    const ctx = stage(host, 'Move, jump, and strike. Collect pressure shards before the mirror boss breaks you.');
    ctx.content.innerHTML = `<canvas class="game-canvas" width="1000" height="520" id="koatsuCanvas"></canvas><div class="controls"><button class="btn" data-key="left">←</button><button class="btn" data-key="jump">Jump</button><button class="btn btn--primary" data-key="attack">Strike</button><button class="btn" data-key="right">→</button></div>`;
    const canvas = ctx.content.querySelector('#koatsuCanvas'); const c = canvas.getContext('2d');
    const pressure = isPressureMode() || isBossRun('koatsu');
    const tier = challengeLevel() + (isBossRun('koatsu') ? 1 : 0);
    let p = { x: 90, y: 390, vx: 0, vy: 0, hp: Math.max(4, (pressure ? 7 : 8) - tier), shards: 0, attacking: 0 };
    const bossMax = (pressure ? 38 : 30) + tier * 7;
    let boss = { x: 820, y: 380, hp: bossMax };
    let enemies = Array.from({ length: (pressure ? 8 : 6) + tier } , (_, i) => ({ x: 250 + i * 100, y: 390, hp: 5, dir: i % 2 ? 1 : -1 }));
    let keys = {}; let running = true, won = false, lost = false;
    function loop() {
      if (!running) return;
      if (won || lost) { draw(); requestAnimationFrame(loop); return; }
      p.vx = (keys.left ? -4 : 0) + (keys.right ? 4 : 0);
      if (keys.jump && p.y >= 390) p.vy = -12;
      if (keys.attack) { p.attacking = 8; keys.attack = false; }
      p.vy += .65; p.x = clamp(p.x + p.vx, 20, 940); p.y = clamp(p.y + p.vy, 80, 390); if (p.y >= 390) p.vy = 0;
      if (p.attacking > 0) p.attacking -= 1;
      enemies.forEach(e => { e.x += e.dir * 1.1; if (e.x < 210 || e.x > 760) e.dir *= -1; if (Math.abs(e.x-p.x)<34 && Math.abs(e.y-p.y)<42) { p.hp -= .015; } if (p.attacking && Math.abs(e.x-p.x)<70 && Math.abs(e.y-p.y)<58) { e.hp -= .2; } });
      enemies = enemies.filter(e => { if (e.hp <= 0) { p.shards += 1; setRecord('koatsu', 'bestShards', p.shards); return false; } return true; });
      if (Math.abs(boss.x-p.x)<88 && p.attacking && p.shards >= 3) boss.hp -= .24;
      if (Math.abs(boss.x-p.x)<64) p.hp -= .025;
      if (boss.hp <= 0 && !won) { won = true; setNotice(ctx, 'Mirror boss shattered. Pressure Awakened.'); awardWin('koatsu', 'koatsuWin', 170); }
      if (p.hp <= 0 && !lost) { lost = true; setNotice(ctx, 'Pressure crushed the run. Restart and awaken cleaner.'); markRunLoss('koatsu', 'Pressure crushed the run.'); }
      draw(); requestAnimationFrame(loop);
    }
    function draw() {
      c.clearRect(0,0,1000,520);
      const g = c.createLinearGradient(0,0,1000,520); g.addColorStop(0,'rgba(255,77,125,.16)'); g.addColorStop(.52,'rgba(139,92,246,.22)'); g.addColorStop(1,'rgba(5,3,11,.9)'); c.fillStyle=g; c.fillRect(0,0,1000,520);
      c.fillStyle='rgba(255,255,255,.08)'; for(let i=0;i<18;i++) c.fillRect(i*68-20, 430 + Math.sin(i)*7, 42, 4);
      c.fillStyle='#f8e9a1'; c.font='900 18px system-ui'; c.fillText(`HP ${Math.ceil(p.hp)} · Shards ${p.shards}/3 · Boss ${Math.ceil(boss.hp)}`, 26, 34);
      c.fillStyle='#ff4d7d'; enemies.forEach(e=>{ c.beginPath(); c.arc(e.x,e.y,20,0,Math.PI*2); c.fill(); });
      c.fillStyle='#b794ff'; c.fillRect(boss.x-34,boss.y-58,68,78); c.fillStyle='rgba(255,255,255,.22)'; c.fillRect(boss.x-32,boss.y-72,64,7); c.fillStyle='#6ee7b7'; c.fillRect(boss.x-32,boss.y-72,64*boss.hp/bossMax,7);
      c.fillStyle='#f8e9a1'; c.beginPath(); c.arc(p.x,p.y,24,0,Math.PI*2); c.fill(); if (p.attacking) { c.strokeStyle='#fff'; c.lineWidth=5; c.beginPath(); c.arc(p.x+38,p.y,34,-.7,.7); c.stroke(); }
    }
    function keydown(e){ if(['ArrowLeft','a'].includes(e.key)) keys.left=true; if(['ArrowRight','d'].includes(e.key)) keys.right=true; if(['ArrowUp','w',' '].includes(e.key)) keys.jump=true; if(['x','Enter'].includes(e.key)) keys.attack=true; }
    function keyup(e){ if(['ArrowLeft','a'].includes(e.key)) keys.left=false; if(['ArrowRight','d'].includes(e.key)) keys.right=false; if(['ArrowUp','w',' '].includes(e.key)) keys.jump=false; }
    ctx.content.querySelectorAll('[data-key]').forEach(b => { b.addEventListener('pointerdown', () => keys[b.dataset.key] = true); b.addEventListener('pointerup', () => keys[b.dataset.key] = false); b.addEventListener('pointerleave', () => keys[b.dataset.key] = false); });
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); loop();
    return () => { running=false; window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); };
  }

  function startLeadHunter(host) {
    const pressure = isPressureMode() || isBossRun('leads');
    const tier = challengeLevel() + (isBossRun('leads') ? 1 : 0);
    const maxDays = Math.max(9, (pressure ? 13 : 14) - tier);
    const moneyGoal = (pressure ? 6500 : 5000) + tier * 900;
    const ctx = stage(host, `Build the agency in ${maxDays} days. Hit $${moneyGoal.toLocaleString()} without stress reaching 100.`);
    let sim = { day: 1, leads: 3 + (hasRelic('operatorMomentum') ? 2 : 0), qualified: 0, clients: 0, money: 500, rep: 40, stress: (pressure ? 18 : 10) + tier * 4, ae: hasRelic('operatorMomentum') ? 1 : 0, log: [], finished: false };
    function act(type) {
      if (sim.finished || sim.day > maxDays || sim.stress >= 100) return;
      if (type === 'prospect') { const gain = rand(3, 7) + sim.ae; sim.leads += gain; sim.stress += 5; push(`Prospected ${gain} leads.`); }
      if (type === 'qualify') { const move = Math.min(sim.leads, rand(2, 5) + sim.ae); sim.leads -= move; sim.qualified += move; sim.stress += 4; push(`Qualified ${move} prospects.`); }
      if (type === 'close') { const close = Math.min(sim.qualified, rand(1, 3)); sim.qualified -= close; sim.clients += close; sim.money += close * rand(650, 1200); sim.rep += close * 4; sim.stress += 8; push(`Closed ${close} clients.`); }
      if (type === 'fulfill') { const done = Math.min(sim.clients, rand(1, 4)); sim.money += done * 260; sim.rep += done * 3; sim.stress = clamp(sim.stress - 12, 0, 100); push(`Fulfilled ${done} accounts.`); }
      if (type === 'hire') { if (sim.money >= 900) { sim.money -= 900; sim.ae += 1; sim.stress += 3; push('Hired an AE.'); } else push('Not enough money to hire.'); }
      sim.day += 1;
      if (sim.money >= moneyGoal) { sim.finished = true; setNotice(ctx, 'Revenue goal hit. Lead Hunter crowned.'); awardWin('leads', 'leadsWin', 150); }
      else if (sim.day > maxDays) { sim.finished = true; setNotice(ctx, 'Campaign ended. Goal missed. Restart with a tighter sequence.'); markRunLoss('leads', 'Campaign ended below revenue goal.'); }
      if (sim.stress >= 100) { sim.finished = true; setNotice(ctx, 'Stress broke operations. Restart and fulfill faster.'); markRunLoss('leads', 'Agency stress broke operations.'); }
      setRecord('leads', 'bestMoney', sim.money);
      renderSim();
    }
    function push(t){ sim.log.unshift(`Day ${sim.day}: ${t}`); sim.log = sim.log.slice(0, 8); }
    function renderSim() {
      ctx.content.innerHTML = `
        <div class="grid-4" style="margin-top:14px">
          ${[['Day',`${sim.day}/${maxDays}`],['Money',`$${sim.money}`],['Leads',sim.leads],['Qualified',sim.qualified],['Clients',sim.clients],['Rep',sim.rep],['Stress',`${sim.stress}%`],['AEs',sim.ae]].map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}
        </div>
        <div class="controls"><button class="btn" data-act="prospect">Prospect</button><button class="btn" data-act="qualify">Qualify</button><button class="btn btn--primary" data-act="close">Close</button><button class="btn" data-act="fulfill">Fulfill</button><button class="btn" data-act="hire">Hire AE $900</button></div>
        <div class="log">${sim.log.map(escapeHtml).map(t=>`<div>${t}</div>`).join('')}</div>
      `;
      ctx.content.querySelectorAll('[data-act]').forEach(b => { b.disabled = sim.finished; b.addEventListener('click', () => act(b.dataset.act)); });
    }
    renderSim(); return () => {};
  }

  function startCaseDesk(host) {
    const ctx = stage(host, 'Select a case, then select the matching document. Clear the target queue before the timer expires.');
    const docs = ['1099', 'Invoice', 'ID', 'Receipt', 'W9', 'Bank'];
    const pressure = isPressureMode() || isBossRun('caseDesk');
    const tier = challengeLevel() + (isBossRun('caseDesk') ? 1 : 0);
    const targetScore = (pressure ? 14 : 12) + tier;
    let cases = [], selected = null, score = 0, trust = Math.max(58, (pressure ? 84 : 100) - tier * 7) + (hasRelic('operatorMomentum') ? 6 : 0), time = Math.max(42, (pressure ? 64 : 75) - tier * 5) + (hasRelic('operatorMomentum') ? 6 : 0), timer = null, finished = false;
    function newCases() { cases = Array.from({ length: 4 }, (_, i) => ({ id: i + Date.now(), need: sample(docs), client: sample(['Nova LLC','Tiger Ops','Golden Gate','Astra Lane','Crown Yard','Blue Mesa']) })); }
    function renderDesk() {
      ctx.content.innerHTML = `
        <div class="hud" style="margin-top:14px"><span class="pill">Score <b>${score}/${targetScore}</b></span><span class="pill">Trust <b>${trust}</b></span><span class="pill">Timer <b>${time}s</b></span></div>
        <div class="grid-4">${cases.map(c=>`<button class="micro-card ${selected === c.id ? 'selected-case' : ''}" data-case="${c.id}"><h3>${escapeHtml(c.client)}</h3><p>Needs: ${escapeHtml(c.need)}</p></button>`).join('')}</div>
        <div class="controls">${docs.map(d=>`<button class="btn" data-doc="${d}">${d}</button>`).join('')}</div>
      `;
      ctx.content.querySelectorAll('[data-case]').forEach(b => { b.disabled = finished; b.addEventListener('click', () => { selected = Number(b.dataset.case); setNotice(ctx, 'Case selected. Choose its matching document.'); }); });
      ctx.content.querySelectorAll('[data-doc]').forEach(b => { b.disabled = finished; b.addEventListener('click', () => matchDoc(b.dataset.doc)); });
    }
    function matchDoc(doc) {
      if (finished) return;
      if (!selected) { setNotice(ctx, 'Select a case first.'); return; }
      const i = cases.findIndex(c => c.id === selected);
      if (i < 0) return;
      if (cases[i].need === doc) { score += 1; cases.splice(i, 1); cases.push({ id: Date.now()+Math.random(), need: sample(docs), client: sample(['Nova LLC','Tiger Ops','Golden Gate','Astra Lane','Crown Yard','Blue Mesa']) }); setNotice(ctx, 'Correct match. Trust preserved.'); }
      else { trust -= 12; setNotice(ctx, `Wrong document. ${cases[i].client} still needs ${cases[i].need}.`); }
      selected = null;
      if (score >= targetScore) { finished = true; clearInterval(timer); setNotice(ctx, 'Desk cleared. NorthStar stays precise.'); awardWin('caseDesk', 'caseWin', 135); }
      if (trust <= 0) { finished = true; clearInterval(timer); setNotice(ctx, 'Trust collapsed. Restart the desk.'); markRunLoss('caseDesk', 'Client trust collapsed.'); }
      setRecord('caseDesk', 'bestScore', score);
      renderDesk();
    }
    newCases(); renderDesk();
    timer = setInterval(() => { time -= 1; if (time <= 0 && !finished) { finished = true; clearInterval(timer); setNotice(ctx, 'Deadline missed. Restart and move sharper.'); markRunLoss('caseDesk', 'Deadline missed.'); } renderDesk(); }, 1000);
    return () => clearInterval(timer);
  }

  function startDesktopQuest(host) {
    const ctx = stage(host, 'Complete three desktop missions: terminal command, file clue, and browser verification.');
    let completed = { terminal: false, files: false, browser: false };
    let open = 'terminal';
    function renderDesktop() {
      const all = Object.values(completed).every(Boolean);
      ctx.content.innerHTML = `
        <div class="desktop">
          <div class="os-window">
            <h3>${open === 'terminal' ? 'Terminal' : open === 'files' ? 'Files' : open === 'browser' ? 'Browser' : 'Mail'}</h3>
            <div class="os-output" id="osOutput">${screenText()}</div>
            <div class="controls">${controls()}</div>
          </div>
          <div class="dock"><button class="app-icon" data-open="terminal">⌘</button><button class="app-icon" data-open="files">▣</button><button class="app-icon" data-open="browser">◉</button><button class="app-icon" data-open="mail">✉</button></div>
        </div>`;
      ctx.content.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { open = b.dataset.open; renderDesktop(); }));
      ctx.content.querySelectorAll('[data-do]').forEach(b => b.addEventListener('click', () => { completed[b.dataset.do] = true; setNotice(ctx, `${b.dataset.do} mission complete.`); if (Object.values(completed).every(Boolean)) { setNotice(ctx, 'SkyeOS module unlocked. Desktop Quest complete.'); awardWin('desktopQuest', 'osWin', 140); } renderDesktop(); }));
      if (all) setGameSave('desktopQuest', { complete: true });
    }
    function screenText() {
      if (open === 'terminal') return completed.terminal ? 'Command accepted: vault.init --crown\nSystem route open.' : 'Mission: run the correct init command.\nHint: vault.init --crown';
      if (open === 'files') return completed.files ? 'File clue logged: /vault/crown.key' : 'Mission: inspect the Crown Key file.\nVisible file: crown.key';
      if (open === 'browser') return completed.browser ? 'Verification accepted: local-first online.' : 'Mission: verify the portal status.\nStatus endpoint returns: LOCAL-FIRST';
      return `Inbox:\n1. Finish terminal init. ${completed.terminal ? '✅' : '☐'}\n2. Inspect crown.key. ${completed.files ? '✅' : '☐'}\n3. Verify portal status. ${completed.browser ? '✅' : '☐'}`;
    }
    function controls() {
      if (open === 'terminal' && !completed.terminal) return '<button class="btn btn--primary" data-do="terminal">Run vault.init --crown</button>';
      if (open === 'files' && !completed.files) return '<button class="btn btn--primary" data-do="files">Open crown.key</button>';
      if (open === 'browser' && !completed.browser) return '<button class="btn btn--primary" data-do="browser">Verify LOCAL-FIRST</button>';
      return '<span class="pill">Mission checked</span>';
    }
    renderDesktop(); return () => {};
  }

  function startVantaCore(host) {
    const ctx = stage(host, 'Assign operators to business incidents. Keep churn below 5 through 10 turns.');
    const pressure = isPressureMode() || isBossRun('vanta');
    const tier = challengeLevel() + (isBossRun('vanta') ? 1 : 0);
    const churnLimit = Math.max(2, (pressure ? 4 : 5) - Math.floor(tier / 2));
    let sim = { turn: 1, churn: 0, trust: Math.max(44, (pressure ? 64 : 70) - tier * 5), tokens: Math.max(1, (pressure ? 2 : 3) - Math.floor(tier / 2)), ops: { Calls: 1, Followup: 1, Dispatch: 1, Billing: 1 }, log: [] };
    const incidents = [
      ['Missed Call Storm', 'Calls', 16], ['Lead Forgot Quote', 'Followup', 14], ['Crew Late', 'Dispatch', 15], ['Invoice Dispute', 'Billing', 13], ['Angry Repeat Client', 'Followup', 18]
    ];
    let current = sample(incidents);
    function resolve(skill) {
      if (sim.turn > 10 || sim.churn >= churnLimit) return;
      const correct = skill === current[1];
      if (correct) { sim.trust += sim.ops[skill] * 7; sim.tokens += 1; push(`Resolved ${current[0]} with ${skill}.`); }
      else { sim.trust -= current[2]; sim.churn += 1; push(`Wrong operator. ${current[0]} needed ${current[1]}.`); }
      sim.turn += 1;
      current = sample(incidents);
      if (sim.turn > 10 && sim.churn < churnLimit) { setNotice(ctx, 'All clients stayed alive. VantaCore operators held the line.'); awardWin('vanta', 'vantaWin', 155); }
      if (sim.churn >= churnLimit) { setNotice(ctx, 'Churn breached the limit. Restart and assign smarter.'); markRunLoss('vanta', 'Churn breached the limit.'); }
      setRecord('vanta', 'bestTrust', sim.trust);
      renderOps();
    }
    function upgrade(skill) { if (sim.turn > 10 || sim.churn >= churnLimit || sim.tokens <= 0) return; sim.ops[skill] += 1; sim.tokens -= 1; push(`Upgraded ${skill}.`); renderOps(); }
    function push(t){ sim.log.unshift(`Turn ${sim.turn}: ${t}`); sim.log = sim.log.slice(0, 8); }
    function renderOps() {
      ctx.content.innerHTML = `
        <div class="grid-4" style="margin-top:14px"><div class="stat"><b>${sim.turn}/10</b><span>Turn</span></div><div class="stat"><b>${sim.churn}/${churnLimit}</b><span>Churn</span></div><div class="stat"><b>${sim.trust}</b><span>Trust</span></div><div class="stat"><b>${sim.tokens}</b><span>Upgrade Tokens</span></div></div>
        <div class="micro-card" style="margin-top:14px"><h3>${escapeHtml(current[0])}</h3><p>Choose the operator lane that should handle this incident.</p></div>
        <div class="grid-4" style="margin-top:14px">${Object.keys(sim.ops).map(k=>`<div class="micro-card"><h3>${k}</h3><p>Level ${sim.ops[k]}</p><button class="btn btn--primary" data-resolve="${k}">Assign</button> <button class="btn" data-upgrade="${k}">Upgrade</button></div>`).join('')}</div>
        <div class="log">${sim.log.map(escapeHtml).map(t=>`<div>${t}</div>`).join('')}</div>
      `;
      ctx.content.querySelectorAll('[data-resolve]').forEach(b => b.addEventListener('click', () => resolve(b.dataset.resolve)));
      ctx.content.querySelectorAll('[data-upgrade]').forEach(b => b.addEventListener('click', () => upgrade(b.dataset.upgrade)));
    }
    renderOps(); return () => {};
  }


  window.SkyeArcadeVault = {
    version: VERSION,
    getState: () => JSON.parse(JSON.stringify(state)),
    exportSave: () => JSON.stringify(state),
    importSave: raw => {
      const incoming = typeof raw === 'string' ? JSON.parse(raw) : raw;
      state = { ...defaultState(), ...incoming, version: VERSION, settings: normalizeSettings(incoming.settings || {}) };
      ensureDailyContract(false);
      ensureV16State();
      persist();
      emitVaultEvent('external-save-imported', { wins: state.wins });
      render();
      return true;
    },
    openGame: id => openGame(id),
    claimDailyReward,
    startCrownTrial
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.getElementById('installBtn')?.removeAttribute('disabled');
  });

  window.addEventListener('appinstalled', () => {
    ensureV16State();
    state.pwa.installed = true;
    persist();
    emitVaultEvent('pwa-installed', {});
    toast('SkyeArcade installed', 'The vault is now available as an installed PWA.');
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeGameId) closeGame();
  });

  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (id && games.some(game => game.id === id)) openGame(id);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  render();
  const initialId = location.hash.replace('#', '');
  if (initialId && games.some(game => game.id === initialId)) openGame(initialId);
})();
