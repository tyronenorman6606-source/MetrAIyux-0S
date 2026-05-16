(() => {
  'use strict';

  const COLS = 10;
  const ROWS = 22;
  const VISIBLE_ROWS = 20;
  const HIDDEN_ROWS = ROWS - VISIBLE_ROWS;
  const BOARD_W = 320;
  const BOARD_H = 640;
  const CELL = BOARD_W / COLS;

  const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    X: [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
  };

  const CLASSIC_POOL = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const RIFT_POOL = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'X'];

  const COLORS = {
    I: ['#83fbff', '#117cff'],
    O: ['#fff1a0', '#ffbe2d'],
    T: ['#ff8dff', '#8b48ff'],
    S: ['#82ffb7', '#00aa83'],
    Z: ['#ff8ca5', '#fb245a'],
    J: ['#8cc9ff', '#344cff'],
    L: ['#ffc66e', '#ff4dd2'],
    X: ['#ffffff', '#a56cff'],
    G: ['#3c465f', '#161b2a'],
    Q: ['#f8fbff', '#65f7ff'],
    B: ['#fff4a8', '#ff9f2d'],
    C: ['#e3b3ff', '#6d6cff'],
    SLD: ['#c8ffe0', '#20d47f'],
  };

  const MODES = {
    endurance: {
      label: 'Endurance',
      description: 'No timer. Infinite climb.',
      timeLimit: 0,
      startLevel: 1,
      gravityMult: 1,
      scoreMult: 1,
      coreBonus: 0,
      garbageEvery: 0,
    },
    blitz: {
      label: 'Blitz',
      description: '3-minute score attack.',
      timeLimit: 180,
      startLevel: 2,
      gravityMult: 0.96,
      scoreMult: 1.35,
      coreBonus: 0.02,
      garbageEvery: 0,
    },
    daily: {
      label: 'Daily Rift',
      description: 'Seeded modifier run.',
      timeLimit: 0,
      startLevel: 1,
      gravityMult: 1,
      scoreMult: 1.12,
      coreBonus: 0.03,
      garbageEvery: 0,
      daily: true,
    },
    zen: {
      label: 'Zen Flow',
      description: 'Relaxed no-hard-fail mode for long calm sessions.',
      timeLimit: 0,
      startLevel: 1,
      gravityMult: 1.28,
      scoreMult: 0.72,
      coreBonus: 0.04,
      garbageEvery: 0,
      zen: true,
    },
    onslaught: {
      label: 'Onslaught',
      description: 'Hard mode. More chaos.',
      timeLimit: 0,
      startLevel: 5,
      gravityMult: 0.72,
      scoreMult: 1.75,
      coreBonus: 0.05,
      garbageEvery: 36,
    },
  };

  const DAILY_MODIFIERS = [
    { id: 'core_storm', name: 'Core Storm', desc: 'Power cores appear more often.', coreBonus: 0.12, scoreMult: 1.05 },
    { id: 'heavy_gravity', name: 'Heavy Gravity', desc: 'Gravity is faster. Scores are richer.', gravityMult: 0.82, scoreMult: 1.34 },
    { id: 'low_orbit', name: 'Low Orbit', desc: 'Gravity is kinder. Rift charges slower.', gravityMult: 1.16, riftMult: 0.82 },
    { id: 'rich_rift', name: 'Rich Rift', desc: 'Rift charges much faster.', riftMult: 1.55, scoreMult: 1.05 },
    { id: 'scar_rain', name: 'Scar Rain', desc: 'Garbage scars pulse in from below.', garbageEvery: 44, scoreMult: 1.42 },
  ];

  const AUDIO_MOODS = {
    alpha: {
      label: 'Alpha Calm',
      beat: '8 Hz',
      intent: 'relaxed focus',
      src: 'assets/audio/alpha-calm-8hz.wav',
      desc: 'Soft binaural ambience for long relaxed runs.',
    },
    theta: {
      label: 'Theta Drift',
      beat: '4 Hz',
      intent: 'deep flow',
      src: 'assets/audio/theta-drift-4hz.wav',
      desc: 'Slower drifting bed for low-pressure sessions.',
    },
    focus: {
      label: 'Focus Gate',
      beat: '14 Hz',
      intent: 'sharp play',
      src: 'assets/audio/focus-gate-14hz.wav',
      desc: 'Brighter pulse for score-chasing and blitz attempts.',
    },
    delta: {
      label: 'Night Delta',
      beat: '2 Hz',
      intent: 'late-night calm',
      src: 'assets/audio/delta-night-2hz.wav',
      desc: 'Dark low tone for quiet no-stress play.',
    },
    spa: {
      label: 'Rift Spa',
      beat: '6 Hz',
      intent: 'ritual mode',
      src: 'assets/audio/rift-spa-6hz.wav',
      desc: 'Balanced meditation-game tone for daily ritual runs.',
    },
  };

  const ACHIEVEMENTS = {
    first_line: ['First Breach', 'Clear your first line.', 3],
    combo_5: ['Combo Machine', 'Reach a 5-combo chain.', 7],
    first_rift: ['Rift Walker', 'Activate your first rift surge.', 5],
    score_25k: ['Signal Royalty', 'Score 25,000 in one run.', 11],
    level_10: ['Orbit Breaker', 'Reach level 10.', 10],
    core_10: ['Core Hunter', 'Trigger 10 power cores in one run.', 9],
    shield_save: ['Not Today', 'Survive a top-out with a shield.', 8],
    daily_play: ['Daily Contact', 'Finish a Daily Rift run.', 6],
    onslaught_20: ['Scar Resistant', 'Clear 20 lines in Onslaught.', 12],
    mood_set: ['Tone Setter', 'Open the Mood Deck and pick a tone.', 6],
    ritual_3: ['Three-Day Signal', 'Complete daily rituals across 3 different days.', 13],
    focus_runner: ['Flow State', 'Play with mood audio enabled for a run.', 9],
    zen_20: ['Soft Orbit', 'Clear 20 lines in Zen Flow.', 10],
    quest_13: ['Contract Royalty', 'Complete 13 daily or weekly contracts.', 13],
    collector_3: ['Signal Collector', 'Own 3 cosmetic unlocks.', 11],
    season_5: ['Vault Opener', 'Reach Season Vault tier 5.', 8],
    export_save: ['Escape Pod', 'Export your profile backup.', 5],
    academy_complete: ['Academy Graduate', 'Finish every Rift Academy lesson.', 13],
    rival_first: ['Rival Breaker', 'Beat your first Rival Run target.', 10],
    rival_5: ['Circuit Bully', 'Beat 5 Rival Run targets.', 13],
    prestige_1: ['Ascended Pilot', 'Prestige for the first time.', 21],
    focus_30: ['Thirty-Minute Orbit', 'Complete a 30-minute focus ritual.', 13],
    campaign_3: ['Map Walker', 'Clear 3 campaign map nodes.', 13],
    campaign_clear: ['Protocol Finisher', 'Clear every v6 campaign map node.', 34],
    garden_seed: ['Sanctuary Seed', 'Place your first Sanctuary artifact.', 8],
    garden_crown: ['Relic Keeper', 'Own the Crown Relic sanctuary artifact.', 21],
    ritual_plan: ['Ritual Architect', 'Save your first ritual plan.', 8],
    breath_5: ['Breath Pilot', 'Use the breath coach across 5 sessions.', 13],
    relic_first: ['Relic Online', 'Unlock your first Rift Relic.', 13],
    relic_5: ['Relic Cabinet', 'Unlock 5 Rift Relics.', 21],
    mastery_3: ['Mode Specialist', 'Reach mastery level 3 in any mode.', 13],
    mastery_all: ['Gravity Scholar', 'Earn mastery in every mode.', 34],
    modifier_run: ['Lab Rat', 'Complete a run with a Run Lab modifier enabled.', 8],
    modifier_master: ['Protocol Hacker', 'Complete 13 modified runs.', 21],
    devotion_7: ['Seven-Day Orbit', 'Reach a 7-day Daily Rift streak.', 21],
    shard_250: ['Shard Banker', 'Bank 250 shards at once.', 13],
    checkin_3: ['Signal Habit', 'Claim 3 daily signal chests.', 8],
    checkin_7: ['Weeklong Signal', 'Claim 7 daily signal chests.', 21],
    focus_card_first: ['Card Cleared', 'Complete your first Focus Card.', 10],
    focus_card_13: ['Deck Devotee', 'Complete 13 Focus Cards.', 21],
    loadout_saved: ['Launch Ritualist', 'Save your first launch loadout.', 8],
    weather_5: ['Weather Runner', 'Complete 5 runs under rotating Rift Weather.', 13],
    codex_12: ['Codex Keeper', 'Discover 12 Rift Codex entries.', 13],
    codex_all_pieces: ['Piece Archivist', 'Discover every block shape in the Rift Codex.', 21],
    license_custom: ['Named Signal', 'Customize your Pilot License.', 8],
    league_silver: ['League Climber', 'Reach Silver Circuit weekly league.', 13],
    league_gold: ['Gold Circuit Pilot', 'Reach Gold Circuit weekly league.', 21],
    league_obsidian: ['Obsidian Circuit Pilot', 'Reach Obsidian weekly league.', 34],
    drill_first: ['Coachable', 'Complete your first adaptive coach drill.', 10],
    drill_13: ['Drill Devotee', 'Complete 13 adaptive coach drills.', 21],
    pulse_9: ['Pulse Runner', 'Complete 9 in-run Pulse Goals across sessions.', 13],
    skill_3: ['Matrix Builder', 'Unlock 3 Skill Matrix upgrades.', 13],
    challenge_first: ['Challenge Accepted', 'Clear your first Challenge Forge target.', 13],
    challenge_7: ['Forge Devotee', 'Clear 7 Challenge Forge targets.', 21],
    protocol_5: ['Protocol Walker', 'Clear 5 Gravity Protocol steps.', 13],
    protocol_13: ['Protocol Crowned', 'Clear every 13-step Gravity Protocol lesson.', 34],
    analytics_10: ['Run Analyst', 'Record 10 run summaries in the local analytics log.', 13],
    companion_first: ['Companion Bond', 'Complete a run with an active companion.', 10],
    companion_50: ['Signal Familiar', 'Reach 50 affinity with any companion.', 21],
    chronicle_first: ['Story Spark', 'Complete your first Rift Chronicle arc.', 13],
    chronicle_5: ['Chronicle Keeper', 'Complete 5 Rift Chronicle arcs.', 34],
    aftercare_first: ['Recovery Ritual', 'Choose a post-run recovery action.', 8],
    memory_10: ['Run Memory', 'Save 10 local run memory notes.', 13],
    mood_master_3: ['Tone Master', 'Reach Mood Mastery level 3 in any tone.', 13],
    crown_trial_first: ['Crown Trial Clear', 'Complete your first v12 Crown Trial.', 13],
    crown_trial_5: ['Crown Trial Devotee', 'Complete 5 Crown Trials.', 34],
    curator_first: ['Curated Signal', 'Unlock your first weekly Curator drop.', 10],
    receipt_10: ['Receipt Keeper', 'Record 10 v12 shareable run receipts.', 13],
    founder_score: ['Founder Grade', 'Reach 1,300 Founder Score.', 21],
    v13_release_oath: ['Release Oath', 'Sign the v13 player-first release oath.', 13],
    v13_founder_kit: ['Founder Kit', 'Claim the v13 founder cosmetics kit.', 13],
    v13_quality_100: ['Quality Signal', 'Build 100 session quality points.', 21],
    v13_checklist: ['Launch Ready', 'Clear all v13 release checklist items.', 34],
  };

  const SEASON = {
    id: 'rift-season-01',
    name: 'Rift Season One: Gold Circuit',
    tagline: 'Play daily, stack shards, unlock comfort/cosmetic rituals.',
    tiers: [
      { tier: 1, need: 0, reward: 'Neon pilot title' },
      { tier: 2, need: 240, reward: 'Gold Circuit board glow' },
      { tier: 3, need: 620, reward: 'Calm Stack quest pack' },
      { tier: 4, need: 1120, reward: 'Violet Star trail' },
      { tier: 5, need: 1840, reward: 'Rift Pass showcase frame' },
      { tier: 6, need: 2800, reward: 'Late-night Zen skin' },
      { tier: 7, need: 4000, reward: 'Founder ritual badge' },
    ],
  };

  const COSMETICS = {
    themes: {
      default: { name: 'Neon Core', cost: 0, className: 'theme-default', desc: 'Cyan, pink, and gold arcade glow.' },
      gold: { name: 'Gold Circuit', cost: 35, className: 'theme-gold', desc: 'Premium blue/gold paid-product look.' },
      violet: { name: 'Violet Drift', cost: 50, className: 'theme-violet', desc: 'Soft purple calm-night palette.' },
      emerald: { name: 'Emerald Spa', cost: 65, className: 'theme-emerald', desc: 'Green relaxation tone for Zen Flow.' },
      royal: { name: 'Royal Rift', cost: 130, className: 'theme-royal', desc: 'Prestige blue, gold, and black subscription skin.' },
      singularity: { name: 'Singularity Gold', cost: 0, className: 'theme-singularity', desc: 'v13 Founder Kit release-candidate glow.' },
    },
    boards: {
      glass: { name: 'Glass Grid', cost: 0, className: 'board-glass', desc: 'Default transparent neon grid.' },
      obsidian: { name: 'Obsidian Frame', cost: 40, className: 'board-obsidian', desc: 'Darker board for late sessions.' },
      aureate: { name: 'Aureate Frame', cost: 70, className: 'board-aureate', desc: 'Gold rim for premium presentation.' },
      crown: { name: 'Crown Frame', cost: 140, className: 'board-crown', desc: 'Founder-grade frame for prestige players.' },
      crownGlass: { name: 'Crown Glass RC', cost: 0, className: 'board-crown-glass', desc: 'v13 Founder Kit glass-and-gold board frame.' },
    },
    trails: {
      spark: { name: 'Spark Trail', cost: 0, className: 'trail-spark', desc: 'Classic rift particles.' },
      comet: { name: 'Comet Trail', cost: 45, className: 'trail-comet', desc: 'Longer bright line-clear particles.' },
      mist: { name: 'Mist Trail', cost: 60, className: 'trail-mist', desc: 'Softer particles for calm mode.' },
      halo: { name: 'Halo Trail', cost: 120, className: 'trail-halo', desc: 'Gold pulse trail for Rival Run clears.' },
      auraWave: { name: 'Aura Wave', cost: 0, className: 'trail-aura-wave', desc: 'v13 calming founder trail.' },
    },
  };

  const QUEST_POOL = [
    { id: 'lines_18', type: 'lines', target: 18, label: 'Clear 18 lines', xp: 120, shards: 4 },
    { id: 'slam_25', type: 'slam', target: 25, label: 'Slam 25 pieces', xp: 100, shards: 3 },
    { id: 'hold_10', type: 'hold', target: 10, label: 'Use Hold 10 times', xp: 95, shards: 3 },
    { id: 'surge_3', type: 'surge', target: 3, label: 'Trigger 3 Rift Surges', xp: 140, shards: 5 },
    { id: 'core_8', type: 'core', target: 8, label: 'Trigger 8 power cores', xp: 135, shards: 5 },
    { id: 'mission_4', type: 'mission', target: 4, label: 'Complete 4 run missions', xp: 160, shards: 6 },
    { id: 'daily_run', type: 'dailyRun', target: 1, label: 'Finish one Daily Rift', xp: 130, shards: 5 },
    { id: 'zen_lines', type: 'zenLines', target: 20, label: 'Clear 20 lines in Zen Flow', xp: 155, shards: 6 },
    { id: 'mood_run', type: 'moodRun', target: 1, label: 'Finish a run with Mood Audio on', xp: 120, shards: 4 },
  ];

  const WEEKLY_QUEST_POOL = [
    { id: 'week_lines_120', type: 'lines', target: 120, label: 'Clear 120 total lines this week', xp: 650, shards: 18 },
    { id: 'week_surges_13', type: 'surge', target: 13, label: 'Trigger 13 Rift Surges this week', xp: 600, shards: 16 },
    { id: 'week_cores_60', type: 'core', target: 60, label: 'Trigger 60 power cores this week', xp: 720, shards: 20 },
    { id: 'week_runs_10', type: 'run', target: 10, label: 'Complete 10 runs this week', xp: 580, shards: 14 },
    { id: 'week_quests_8', type: 'quest', target: 8, label: 'Complete 8 contracts this week', xp: 800, shards: 22 },
  ];

  const ACADEMY_LESSONS = [
    { id: 'swipe', title: 'Touch Pilot', desc: 'Use board taps, left/right swipes, down flicks, and up flick holds until the controls feel automatic.', rewardXP: 70, rewardShards: 2 },
    { id: 'stack', title: 'Calm Stack', desc: 'Practice clean columns in Zen Flow. The paid game must feel relaxed, not punishing.', rewardXP: 90, rewardShards: 3 },
    { id: 'cores', title: 'Power Core Lab', desc: 'Learn Q burst, B blade, C chrono, and S shield so power pieces become strategy.', rewardXP: 110, rewardShards: 4 },
    { id: 'rift', title: 'Rift Timing', desc: 'Bank the meter, activate RIFT before a multi-clear, and turn pressure into score.', rewardXP: 130, rewardShards: 5 },
    { id: 'ritual', title: 'Daily Ritual', desc: 'Run Daily Rift, tune a mood, complete contracts, and build a streak.', rewardXP: 150, rewardShards: 6 },
  ];

  const RIVAL_PROFILES = [
    { id: 'nova', name: 'Nova Kid', mode: 'endurance', target: 6500, rewardXP: 120, rewardShards: 5, desc: 'Starter rival. Beat a clean Endurance score.' },
    { id: 'vanta', name: 'Vanta Wraith', mode: 'blitz', target: 12000, rewardXP: 170, rewardShards: 7, desc: 'Three-minute pressure target for sharper play.' },
    { id: 'sable', name: 'Sable Monk', mode: 'zen', target: 9000, rewardXP: 160, rewardShards: 6, desc: 'Calm-score rival for relaxed sessions.' },
    { id: 'gild', name: 'Gild Circuit', mode: 'daily', target: 15000, rewardXP: 210, rewardShards: 9, desc: 'Daily Rift target that changes with the seed.' },
    { id: 'scar', name: 'Scar King', mode: 'onslaught', target: 18000, rewardXP: 260, rewardShards: 13, desc: 'Hard rival. Built for players who want pain.' },
  ];


  const CAMPAIGN_NODES = [
    { id: 'wake', title: 'Wake the Gate', mode: 'endurance', targetScore: 5000, targetLines: 8, rewardXP: 110, rewardShards: 4, desc: 'Prove you can survive the opening gravity field.' },
    { id: 'calm', title: 'Calm Circuit', mode: 'zen', targetScore: 7000, targetLines: 14, rewardXP: 150, rewardShards: 6, desc: 'Practice a softer long-session stack in Zen Flow.' },
    { id: 'spark', title: 'Spark Sprint', mode: 'blitz', targetScore: 11000, targetLines: 10, rewardXP: 180, rewardShards: 7, desc: 'Score under pressure before the timer drains.' },
    { id: 'ritual', title: 'Daily Resonance', mode: 'daily', targetScore: 12500, targetLines: 12, rewardXP: 210, rewardShards: 8, desc: 'Clear a seeded Daily Rift and turn play into ritual.' },
    { id: 'onslaught', title: 'Scar Weather', mode: 'onslaught', targetScore: 14500, targetLines: 16, rewardXP: 260, rewardShards: 10, desc: 'Survive the hard lane with rising scars.' },
    { id: 'surge', title: 'Surge Architect', mode: 'endurance', targetScore: 20000, targetLines: 22, rewardXP: 320, rewardShards: 13, desc: 'Build a score run around Rift Surge timing.' },
    { id: 'monk', title: 'Night Monk', mode: 'zen', targetScore: 22000, targetLines: 30, rewardXP: 360, rewardShards: 16, desc: 'Play a long relaxed focus run without rushing.' },
    { id: 'crown', title: 'Crown Protocol', mode: 'onslaught', targetScore: 28000, targetLines: 28, rewardXP: 500, rewardShards: 21, desc: 'Late-game prestige node. This is the serious player gate.' },
  ];

  const SANCTUARY_ITEMS = {
    prism: { name: 'Breath Prism', cost: 10, serenityPerHour: 1, desc: 'A calm starter artifact that slowly generates serenity.' },
    lotus: { name: 'Neon Lotus', cost: 22, serenityPerHour: 2, desc: 'Soft ritual growth for daily players.' },
    bell: { name: 'Gravity Bell', cost: 35, serenityPerHour: 3, desc: 'Adds a quiet focus anchor to your sanctuary.' },
    moon: { name: 'Moon Basin', cost: 55, serenityPerHour: 5, desc: 'Late-night mood engine artifact for long sessions.' },
    crown: { name: 'Crown Relic', cost: 89, serenityPerHour: 8, desc: 'Premium annual-pass style flex item.' },
  };

  const RITUAL_PLANS = {
    daily_calm: { name: 'Daily Calm', mood: 'spa', mode: 'daily', desc: 'Daily Rift plus Rift Spa audio. Built for streaks and low-friction returns.' },
    deep_focus: { name: 'Deep Focus', mood: 'alpha', mode: 'zen', desc: 'Zen Flow plus Alpha Calm for long-stack practice.' },
    score_hunt: { name: 'Score Hunt', mood: 'focus', mode: 'blitz', desc: 'Focus Gate plus Blitz for sharp competitive sessions.' },
    night_drift: { name: 'Night Drift', mood: 'delta', mode: 'zen', desc: 'Night Delta plus Zen Flow for quiet late play.' },
    hard_crown: { name: 'Hard Crown', mood: 'theta', mode: 'onslaught', desc: 'Theta Drift plus Onslaught when the player wants punishment.' },
  };

  const RIFT_RELICS = {
    prism: { name: 'Prism Lens', cost: 18, unlock: 0, coreBonus: 0.025, desc: '+2.5% power-core chance. Excellent starter relic for satisfying runs.' },
    crown: { name: 'Crown Reactor', cost: 34, unlock: 1, scoreMult: 1.04, desc: '+4% score from every clear. Built for players chasing records.' },
    tide: { name: 'Tide Anchor', cost: 42, unlock: 2, gravityMult: 1.05, desc: '5% softer gravity. Good for long relaxed phone sessions.' },
    pulse: { name: 'Pulse Mirror', cost: 55, unlock: 3, riftMult: 1.12, desc: '+12% Rift charge gain after line clears.' },
    lotus: { name: 'Lotus Battery', cost: 70, unlock: 4, shardMult: 1.12, desc: '+12% end-run shard rewards. Strong for cosmetic collectors.' },
    monarch: { name: 'Monarch Halo', cost: 130, unlock: 7, xpMult: 1.1, scoreMult: 1.02, desc: '+10% XP and +2% score. Prestige-feeling annual-pass relic.' },
  };

  const RUN_MODIFIERS = {
    none: { name: 'Clean Signal', risk: 'None', desc: 'Standard Gravity Protocol rules.', scoreMult: 1, gravityMult: 1, shardMult: 1 },
    calm_field: { name: 'Calm Field', risk: 'Comfort', desc: 'Softer gravity, lower score. Useful for long mood sessions.', scoreMult: 0.88, gravityMult: 1.16, shardMult: 1 },
    core_storm_lab: { name: 'Core Storm Lab', risk: 'Reward', desc: 'More power cores, slightly faster gravity, richer shards.', scoreMult: 1.03, gravityMult: 0.96, shardMult: 1.12, coreBonus: 0.09 },
    glass_crown: { name: 'Glass Crown', risk: 'High', desc: 'Big score boost, harsher gravity, no starter shield.', scoreMult: 1.32, gravityMult: 0.82, shardMult: 1.22, shieldOverride: 0 },
    scar_practice: { name: 'Scar Practice', risk: 'High', desc: 'Garbage pressure arrives in more modes. Rewards disciplined stacking.', scoreMult: 1.18, gravityMult: 0.93, shardMult: 1.18, garbageEvery: 38 },
  };

  const MASTERY_MODES = ['endurance', 'blitz', 'daily', 'zen', 'onslaught'];


  const RIFT_EVENTS = [
    { id: 'gold_circuit', name: 'Gold Circuit', desc: '+8% score, +4% shard payout, softer daily conversion.', scoreMult: 1.08, shardMult: 1.04, riftMult: 1.03 },
    { id: 'calm_weather', name: 'Calm Weather', desc: 'Softer gravity and more power cores for relaxed long sessions.', gravityMult: 1.08, coreBonus: 0.04, scoreMult: 0.97 },
    { id: 'core_bloom', name: 'Core Bloom', desc: 'Power-core appearance is elevated for satisfying clears.', coreBonus: 0.09, scoreMult: 1.02 },
    { id: 'rift_fever', name: 'Rift Fever', desc: 'Rift charge builds faster and score runs spike harder.', riftMult: 1.24, scoreMult: 1.05 },
    { id: 'scar_parade', name: 'Scar Parade', desc: 'Harder rift weather: scar pressure pays stronger rewards.', gravityMult: 0.95, scoreMult: 1.18, shardMult: 1.12, garbageEvery: 34 },
  ];

  const FOCUS_CARDS = [
    { id: 'score_10k', name: 'Clean Signal', target: 'Score 10,000+', rewardXP: 160, rewardShards: 5, desc: 'Good first-session card for learning score flow.' },
    { id: 'lines_16', name: 'Line Garden', target: 'Clear 16+ lines', rewardXP: 150, rewardShards: 5, desc: 'Relaxed volume card for long phone play.' },
    { id: 'surges_2', name: 'Double Rift', target: 'Trigger 2+ Rift Surges', rewardXP: 190, rewardShards: 7, desc: 'Teaches meter banking and surge timing.' },
    { id: 'combo_4', name: 'Combo Circuit', target: 'Reach combo 4+', rewardXP: 180, rewardShards: 6, desc: 'Turns clean stacking into a reward chase.' },
    { id: 'missions_3', name: 'Contract Runner', target: 'Complete 3+ missions', rewardXP: 210, rewardShards: 8, desc: 'Best card for players who like goals over raw score.' },
    { id: 'zen_12', name: 'Soft Orbit', target: 'Clear 12+ lines in Zen Flow', rewardXP: 170, rewardShards: 6, desc: 'Subscription-grade calm ritual card.' },
    { id: 'cores_5', name: 'Core Collector', target: 'Trigger 5+ power cores', rewardXP: 200, rewardShards: 7, desc: 'Makes the board feel toy-like and rewarding.' },
    { id: 'no_hold_12', name: 'Pure Stack', target: 'Clear 12+ lines without Hold', rewardXP: 240, rewardShards: 10, desc: 'Skill card for serious replay value.' },
  ];

  const LOADOUT_SLOTS = ['A', 'B', 'C'];

  const PILOT_TITLES = [
    { id: 'Rift Initiate', need: () => true, desc: 'Starter pilot identity.' },
    { id: 'Calm Stacker', need: () => Number(profile?.focus?.minutes || 0) >= 20, desc: 'Unlocked by focus minutes.' },
    { id: 'Signal Royalty', need: () => Number(profile?.bestByMode?.endurance || 0) >= 25000, desc: 'Unlocked by a serious Endurance score.' },
    { id: 'Gold Circuit', need: () => leagueTierInfo().id === 'gold' || leagueTierInfo().id === 'obsidian' || leagueTierInfo().id === 'mythic', desc: 'Unlocked by weekly league climb.' },
    { id: 'Obsidian Pilot', need: () => leagueTierInfo().id === 'obsidian' || leagueTierInfo().id === 'mythic', desc: 'Unlocked by heavy weekly scoring.' },
    { id: 'Ascended Crown', need: () => prestigeLevel() > 0, desc: 'Unlocked after prestige.' },
  ];

  const PILOT_EMBLEMS = {
    spark: { name: 'Spark', need: () => true, desc: 'Starter emblem.' },
    prism: { name: 'Prism', need: () => codexDiscoveryCount() >= 6, desc: 'Unlocked from Codex discovery.' },
    crown: { name: 'Crown', need: () => prestigeLevel() > 0, desc: 'Unlocked by Prestige Ascension.' },
    lotus: { name: 'Lotus', need: () => Number(profile?.sanctuary?.breathSessions || 0) >= 3, desc: 'Unlocked by calm sessions.' },
    obsidian: { name: 'Obsidian', need: () => leagueTierInfo().id === 'obsidian' || leagueTierInfo().id === 'mythic', desc: 'Unlocked by weekly league climb.' },
  };

  const CODEX_ENTRIES = {
    piece_I: { type: 'Piece', name: 'I-Beam', desc: 'Long clear-maker. The classic dopamine piece.' },
    piece_O: { type: 'Piece', name: 'O-Core', desc: 'Stable square signal for calm stacking.' },
    piece_T: { type: 'Piece', name: 'T-Prism', desc: 'Flexible pivot piece for high-skill rotations.' },
    piece_S: { type: 'Piece', name: 'S-Wave', desc: 'Left-leaning pressure curve.' },
    piece_Z: { type: 'Piece', name: 'Z-Wave', desc: 'Right-leaning pressure curve.' },
    piece_J: { type: 'Piece', name: 'J-Hook', desc: 'Corner-control block for recovery play.' },
    piece_L: { type: 'Piece', name: 'L-Hook', desc: 'Counter-hook for clean side wells.' },
    piece_X: { type: 'Rift Piece', name: 'X-Cross', desc: 'Rift-only chaos piece that changes the stack language.' },
    core_Q: { type: 'Power Core', name: 'Quantum Burst', desc: 'Explodes a local 3x3 cluster.' },
    core_B: { type: 'Power Core', name: 'Blade Row', desc: 'Slices a nearby row for recovery.' },
    core_C: { type: 'Power Core', name: 'Chrono Slow', desc: 'Slows gravity for calmer correction windows.' },
    core_SLD: { type: 'Power Core', name: 'Shield Core', desc: 'Grants breach protection.' },
    mode_endurance: { type: 'Mode', name: 'Endurance', desc: 'Infinite climb and primary long-session mode.' },
    mode_blitz: { type: 'Mode', name: 'Blitz', desc: 'Three-minute score pressure.' },
    mode_daily: { type: 'Mode', name: 'Daily Rift', desc: 'Seeded daily ritual run.' },
    mode_zen: { type: 'Mode', name: 'Zen Flow', desc: 'Relaxed low-pressure long-session mode.' },
    mode_onslaught: { type: 'Mode', name: 'Onslaught', desc: 'Hard pressure lane for serious replay.' },
  };

  const LEAGUE_TIERS = [
    { id: 'bronze', name: 'Bronze Circuit', need: 0, rewardXP: 0, rewardShards: 0 },
    { id: 'silver', name: 'Silver Circuit', need: 30000, rewardXP: 120, rewardShards: 5 },
    { id: 'gold', name: 'Gold Circuit', need: 85000, rewardXP: 260, rewardShards: 10 },
    { id: 'obsidian', name: 'Obsidian Circuit', need: 175000, rewardXP: 520, rewardShards: 18 },
    { id: 'mythic', name: 'Mythic Circuit', need: 325000, rewardXP: 900, rewardShards: 34 },
  ];

  const DRILL_POOL = [
    { id: 'clean_8', name: 'Clean Stack Drill', targetText: 'Clear 8 lines in any mode', check: (s) => s.lines >= 8, mode: 'zen', rewardXP: 110, rewardShards: 4 },
    { id: 'two_surge', name: 'Rift Timing Drill', targetText: 'Activate 2 Rift Surges', check: (s) => s.stats.surges >= 2, mode: 'endurance', rewardXP: 160, rewardShards: 6 },
    { id: 'core_lab', name: 'Power Core Drill', targetText: 'Trigger 4 power cores', check: (s) => s.stats.cores >= 4, mode: 'daily', rewardXP: 150, rewardShards: 5 },
    { id: 'combo_3', name: 'Combo Discipline Drill', targetText: 'Reach combo 3+', check: (s) => s.bestCombo >= 3, mode: 'endurance', rewardXP: 130, rewardShards: 5 },
    { id: 'blitz_9k', name: 'Blitz Pulse Drill', targetText: 'Score 9,000+ in Blitz', check: (s) => s.mode === 'blitz' && s.score >= 9000, mode: 'blitz', rewardXP: 180, rewardShards: 7 },
  ];

  const PULSE_GOALS = [
    { id: 'pulse_lines_3', text: 'Pulse: clear 3 lines', type: 'lines', target: 3, reward: 240 },
    { id: 'pulse_hold_2', text: 'Pulse: use Hold twice', type: 'hold', target: 2, reward: 190 },
    { id: 'pulse_slam_5', text: 'Pulse: slam 5 pieces', type: 'slam', target: 5, reward: 220 },
    { id: 'pulse_core_1', text: 'Pulse: trigger a power core', type: 'core', target: 1, reward: 300 },
    { id: 'pulse_combo_2', text: 'Pulse: reach combo 2', type: 'combo', target: 2, reward: 280, setMax: true },
  ];



  const SKILL_MATRIX = {
    steady_hands: { name: 'Steady Hands', cost: 20, desc: '+4% softer gravity across every run.' },
    core_whisper: { name: 'Core Whisper', cost: 25, desc: '+1.5% power-core chance for more satisfying clears.' },
    rift_capacitor: { name: 'Rift Capacitor', cost: 28, desc: 'Start every run with +12% Rift charge.' },
    shard_magnet: { name: 'Shard Magnet', cost: 34, desc: '+8% end-run shard payout.' },
    score_lens: { name: 'Score Lens', cost: 40, desc: '+2.5% score multiplier. Small, permanent, meaningful.' },
    lotus_guard: { name: 'Lotus Guard', cost: 45, desc: 'Zen Flow starts with an extra shield.' },
    scar_buffer: { name: 'Scar Buffer', cost: 50, desc: 'Garbage scars spawn with more holes for recovery.' },
    crown_flow: { name: 'Crown Flow', cost: 80, desc: '+7% XP payout for serious long-term players.' },
  };

  const CHALLENGE_POOL = [
    { id: 'calm_12k', name: 'Calm 12K', mode: 'zen', targetScore: 12000, minLines: 14, rewardXP: 220, rewardShards: 8, scoreMult: 0.98, shardMult: 1.1, desc: 'Zen Flow target for relaxed paid-habit players.' },
    { id: 'blitz_18k', name: 'Blitz 18K', mode: 'blitz', targetScore: 18000, minLines: 10, rewardXP: 280, rewardShards: 10, scoreMult: 1.04, shardMult: 1.12, desc: 'Short-session score chase built for phone breaks.' },
    { id: 'surge_3', name: 'Triple Surge', mode: 'endurance', targetScore: 17000, minLines: 12, minSurges: 3, rewardXP: 320, rewardShards: 12, riftMult: 1.12, desc: 'Bank meter and trigger three Rift Surges in one run.' },
    { id: 'daily_signal', name: 'Daily Signal', mode: 'daily', targetScore: 16000, minLines: 12, rewardXP: 300, rewardShards: 11, scoreMult: 1.03, desc: 'Pairs with the seeded daily modifier.' },
    { id: 'scar_crown', name: 'Scar Crown', mode: 'onslaught', targetScore: 22000, minLines: 18, rewardXP: 420, rewardShards: 16, scoreMult: 1.08, shardMult: 1.18, desc: 'Hard challenge for players who want annual-pass bragging rights.' },
    { id: 'core_bloom', name: 'Core Bloom Trial', mode: 'endurance', targetScore: 14000, minLines: 10, minCores: 5, rewardXP: 260, rewardShards: 10, coreBonus: 0.08, desc: 'A toy-like power-core run that feels premium and explosive.' },
  ];

  const PROTOCOL_STEPS = [
    { id: 'start', title: 'Signal Start', goal: 'Finish any run', check: (s) => s.stats.pieces >= 1, rewardXP: 80, rewardShards: 3 },
    { id: 'lines', title: 'Line Garden', goal: 'Clear 8+ lines', check: (s) => s.lines >= 8, rewardXP: 110, rewardShards: 4 },
    { id: 'mood', title: 'Mood Ritual', goal: 'Play with audio enabled', check: () => !profile.settings?.muted && Number(profile.settings?.musicVolume ?? 0.44) > 0, rewardXP: 130, rewardShards: 5 },
    { id: 'hold', title: 'Hold Discipline', goal: 'Use Hold 4+ times', check: (s) => s.stats.holds >= 4, rewardXP: 145, rewardShards: 5 },
    { id: 'surge', title: 'First Burn', goal: 'Activate a Rift Surge', check: (s) => s.stats.surges >= 1, rewardXP: 170, rewardShards: 6 },
    { id: 'zen', title: 'Soft Orbit', goal: 'Clear 12+ lines in Zen Flow', check: (s) => s.mode === 'zen' && s.lines >= 12, rewardXP: 190, rewardShards: 7 },
    { id: 'core', title: 'Core Bloom', goal: 'Trigger 4+ power cores', check: (s) => s.stats.cores >= 4, rewardXP: 210, rewardShards: 8 },
    { id: 'combo', title: 'Combo Breath', goal: 'Reach combo 3+', check: (s) => s.bestCombo >= 3, rewardXP: 230, rewardShards: 8 },
    { id: 'daily', title: 'Daily Gate', goal: 'Finish Daily Rift', check: (s) => s.mode === 'daily', rewardXP: 260, rewardShards: 9 },
    { id: 'score', title: 'Signal Royalty', goal: 'Score 20,000+', check: (s) => s.score >= 20000, rewardXP: 300, rewardShards: 11 },
    { id: 'league', title: 'League Push', goal: 'Add 15,000+ score to weekly league', check: (s) => s.score >= 15000, rewardXP: 340, rewardShards: 12 },
    { id: 'onslaught', title: 'Scar Lesson', goal: 'Clear 12+ lines in Onslaught', check: (s) => s.mode === 'onslaught' && s.lines >= 12, rewardXP: 390, rewardShards: 14 },
    { id: 'crown', title: 'Crown Protocol', goal: 'Score 30,000+ or beat a rival', check: (s) => s.score >= 30000 || Boolean(s.rival && s.score >= rivalryScoreTarget(s.rival)), rewardXP: 520, rewardShards: 21 },
  ];


  const RIFT_COMPANIONS = {
    spark: { name: 'Spark Mote', cost: 0, desc: 'Starter companion. +1% score and gentle first-run guidance.', scoreMult: 1.01, goal: 'Finish any run with Spark active.' },
    lotus: { name: 'Lotus Drone', cost: 45, desc: 'Zen companion. +4% shard gain in Zen Flow and calmer recovery prompts.', shardMult: 1.04, mode: 'zen', goal: 'Clear 10+ lines in Zen Flow.' },
    prism: { name: 'Prism Fox', cost: 75, desc: 'Combo companion. +2% Rift charge and extra affinity from combos.', riftMult: 1.02, goal: 'Reach combo 3+.' },
    crown: { name: 'Crown Wisp', cost: 130, desc: 'Prestige companion. +5% XP after Rank 13 and premium identity flavor.', xpMult: 1.05, needRank: 13, goal: 'Score 20000+.' },
  };


  const V12_CROWN_TRIALS = [
    { id: 'crown_awakening', name: 'Crown Awakening', goal: 'Score 13,000+ in any mode', check: (s) => s.score >= 13000, xp: 160, shards: 6 },
    { id: 'calm_hour', name: 'Calm Hour Spark', goal: 'Clear 18+ lines in Zen Flow', check: (s) => s.mode === 'zen' && s.lines >= 18, xp: 220, shards: 8 },
    { id: 'rift_furnace', name: 'Rift Furnace', goal: 'Activate 3+ Rift Surges', check: (s) => s.stats.surges >= 3, xp: 260, shards: 10 },
    { id: 'core_orchestra', name: 'Core Orchestra', goal: 'Trigger 6+ Power Cores', check: (s) => s.stats.cores >= 6, xp: 280, shards: 11 },
    { id: 'league_signal', name: 'League Signal', goal: 'Score 22,000+ while pushing League', check: (s) => s.score >= 22000, xp: 300, shards: 12 },
    { id: 'scar_prayer', name: 'Scar Prayer', goal: 'Clear 18+ lines in Onslaught', check: (s) => s.mode === 'onslaught' && s.lines >= 18, xp: 360, shards: 14 },
    { id: 'gold_flow', name: 'Gold Flow', goal: 'Reach combo 5+', check: (s) => s.bestCombo >= 5, xp: 420, shards: 16 },
    { id: 'founder_run', name: 'Founder Run', goal: 'Score 50,000+ or reach level 12', check: (s) => s.score >= 50000 || s.level >= 12, xp: 650, shards: 26 },
  ];

  const V12_CURATOR_DROPS = {
    themes: {
      aurora: { name: 'Aurora Sleep', cost: 90, className: 'theme-aurora', desc: 'Soft sleep-mode palette for calm paid sessions.' },
      inferno: { name: 'Inferno Circuit', cost: 120, className: 'theme-inferno', desc: 'High-energy premium score-chase look.' },
    },
    boards: {
      oracle: { name: 'Oracle Glass', cost: 95, className: 'board-oracle', desc: 'A cleaner premium board frame for long phone sessions.' },
      eclipse: { name: 'Eclipse Frame', cost: 140, className: 'board-eclipse', desc: 'Dark annual-pass style frame.' },
    },
    trails: {
      comet: { name: 'Comet Trail', cost: 80, className: 'trail-comet', desc: 'Bright streak trail for line clears.' },
      mantra: { name: 'Mantra Trail', cost: 115, className: 'trail-mantra', desc: 'Soft meditation burst for Zen clears.' },
    },
  };

  const V12_MOOD_TIERS = [0, 160, 420, 880, 1500, 2400];
  const V13_RELEASE_CHECKLIST = [
    { id: 'first_run', name: 'Finish first run', desc: 'Complete any run and create a local profile.' },
    { id: 'mood_set', name: 'Pick a mood tone', desc: 'Use the Mood Deck so the game has a calming identity.' },
    { id: 'daily_signal', name: 'Claim a Signal Chest', desc: 'Prove the daily-return loop is reachable.' },
    { id: 'export_backup', name: 'Export profile backup', desc: 'Serious players can protect progress before live launch.' },
    { id: 'zen_test', name: 'Try Zen Flow', desc: 'Verify the relaxing long-session mode is discoverable.' },
    { id: 'receipt', name: 'Generate a Run Receipt', desc: 'Finish a run and record shareable proof.' },
    { id: 'annual_value', name: '$13/year value check', desc: 'Review the paid-tier promise before charging anyone.' },
  ];
  Object.assign(COSMETICS.themes, V12_CURATOR_DROPS.themes);
  Object.assign(COSMETICS.boards, V12_CURATOR_DROPS.boards);
  Object.assign(COSMETICS.trails, V12_CURATOR_DROPS.trails);

  const CHRONICLE_ARCS = [
    { id: 'first_ascent', title: 'First Ascent', goal: 'Finish any run', check: (s) => s.stats.pieces > 0, xp: 90, shards: 4 },
    { id: 'calm_orbit', title: 'Calm Orbit', goal: 'Clear 12+ lines in Zen Flow', check: (s) => s.mode === 'zen' && s.lines >= 12, xp: 150, shards: 6 },
    { id: 'core_song', title: 'Core Song', goal: 'Trigger 4+ power cores', check: (s) => s.stats.cores >= 4, xp: 180, shards: 7 },
    { id: 'surge_litany', title: 'Surge Litany', goal: 'Activate 2+ Rift Surges', check: (s) => s.stats.surges >= 2, xp: 230, shards: 9 },
    { id: 'league_echo', title: 'League Echo', goal: 'Score 18000+', check: (s) => s.score >= 18000, xp: 280, shards: 11 },
    { id: 'scar_monk', title: 'Scar Monk', goal: 'Clear 14+ lines in Onslaught', check: (s) => s.mode === 'onslaught' && s.lines >= 14, xp: 360, shards: 15 },
  ];

  const POST_RUN_RECOVERY = [
    { id: 'breathe', name: 'Breath Reset', desc: '+1 Serenity, +6 companion affinity. Built for calm replay.', affinity: 6, serenity: 1 },
    { id: 'analyze', name: 'Analyze Stack', desc: '+1 insight note and +4 companion affinity.', affinity: 4, memory: true },
    { id: 'rematch', name: 'Rematch Signal', desc: '+3 shards now, then jump straight into another run.', affinity: 2, shards: 3, rematch: true },
  ];

  const $ = (id) => document.getElementById(id);
  const ui = {
    appShell: $('appShell'),
    canvas: $('gameCanvas'),
    holdCanvas: $('holdCanvas'),
    nextCanvas: $('nextCanvas'),
    boardStage: $('boardStage'),
    overlay: $('overlay'),
    overlayPanel: $('overlayPanel'),
    score: $('score'),
    best: $('best'),
    level: $('level'),
    combo: $('combo'),
    lines: $('lines'),
    timeText: $('timeText'),
    shieldText: $('shieldText'),
    surgeText: $('surgeText'),
    rivalText: $('rivalText'),
    todayStreakText: $('todayStreakText'),
    prestigeText: $('prestigeText'),
    modeLabel: $('modeLabel'),
    missionText: $('missionText'),
    riftLabel: $('riftLabel'),
    riftValue: $('riftValue'),
    riftFill: $('riftFill'),
    riftBtn: $('riftBtn'),
    riftMobileBtn: $('riftMobileBtn'),
    installBtn: $('installBtn'),
    profileBtn: $('profileBtn'),
    moodBtn: $('moodBtn'),
    seasonBtn: $('seasonBtn'),
    liveOpsBtn: $('liveOpsBtn'),
    academyBtn: $('academyBtn'),
    rivalsBtn: $('rivalsBtn'),
    mapBtn: $('mapBtn'),
    sanctuaryBtn: $('sanctuaryBtn'),
    relicsBtn: $('relicsBtn'),
    runLabBtn: $('runLabBtn'),
    licenseBtn: $('licenseBtn'),
    codexBtn: $('codexBtn'),
    leagueBtn: $('leagueBtn'),
    academySideBtn: $('academySideBtn'),
    liveOpsSideBtn: $('liveOpsSideBtn'),
    coachBtn: $('coachBtn'),
    matrixBtn: $('matrixBtn'),
    forgeBtn: $('forgeBtn'),
    protocolBtn: $('protocolBtn'),
    analyticsBtn: $('analyticsBtn'),
    companionsBtn: $('companionsBtn'),
    chronicleBtn: $('chronicleBtn'),
    aftercareBtn: $('aftercareBtn'),
    crownBtn: $('crownBtn'),
    curatorBtn: $('curatorBtn'),
    finalBtn: $('finalBtn'),
    moodMiniBtn: $('moodMiniBtn'),
    moodSideBtn: $('moodSideBtn'),
    moodChip: $('moodChip'),
    moodSideText: $('moodSideText'),
    beatSideText: $('beatSideText'),
    rankChip: $('rankChip'),
    muteBtn: $('muteBtn'),
    pauseBtn: $('pauseBtn'),
    leftBtn: $('leftBtn'),
    rightBtn: $('rightBtn'),
    rotateBtn: $('rotateBtn'),
    dropBtn: $('dropBtn'),
    holdBtn: $('holdBtn'),
    toast: $('toast'),
  };

  const ctx = ui.canvas.getContext('2d');
  const holdCtx = ui.holdCanvas.getContext('2d');
  const nextCtx = ui.nextCanvas.getContext('2d');

  let audioCtx = null;
  let deferredInstallPrompt = null;
  let selectedMode = localStorage.getItem('nrb_selected_mode') || 'endurance';
  let raf = 0;
  let lastTime = 0;
  let accumulator = 0;
  let toastTimer = 0;
  let ambientAudio = null;
  let selectedRival = localStorage.getItem('nrb_selected_rival') || '';
  let repeatTimer = null;
  let repeatDelayTimer = null;

  function emptyGrid() {
    return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
  }

  function hashString(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function dailyInfo() {
    const key = todayKey();
    const seed = hashString(`neon-rift-${key}`);
    const mod = DAILY_MODIFIERS[seed % DAILY_MODIFIERS.length];
    return { key, seed, mod };
  }

  function loadProfile() {
    const base = {
      version: 13,
      xp: 0,
      shards: 0,
      runs: 0,
      totalLines: 0,
      totalSurges: 0,
      bestByMode: {},
      prestige: { level: 0, lastAt: '' },
      academy: { completed: {}, completedCount: 0 },
      rivals: { beaten: {}, beatenCount: 0 },
      focus: { minutes: 0, sessions: 0, lastSession: '' },
      campaign: { active: '', completed: {}, completedCount: 0 },
      sanctuary: { items: {}, serenity: 0, lastAccrual: Date.now(), breathSessions: 0, sleepTimerUses: 0 },
      relics: { owned: {}, equipped: '', fragments: 0, unlocks: 0 },
      runLab: { selected: 'none', enabled: false, completions: 0 },
      mastery: {},
      liveOps: { lastChestDay: '', chestStreak: 0, dailyClaims: 0, weatherRuns: 0 },
      focusCards: { selected: 'score_10k', completed: {}, completedCount: 0 },
      loadouts: { slots: {} },
      license: { title: 'Rift Initiate', callsign: 'PILOT-13', emblem: 'spark', titleUnlocks: { 'Rift Initiate': true }, emblemUnlocks: { spark: true } },
      codex: { seen: {}, counts: {}, rewards: {}, discoveries: 0 },
      league: { week: '', score: 0, bestRun: 0, tier: 'bronze', medals: 0 },
      drills: { active: '', completed: {}, completedCount: 0, lastAdvice: '' },
      pulse: { completed: 0, bestRun: 0 },
      skillTree: { owned: {}, spent: 0 },
      challengeForge: { active: '', completed: {}, clears: 0 },
      protocol: { step: 0, completedCount: 0, lastClear: '' },
      analytics: { runs: [], bestScore: 0, bestLines: 0, avgScore: 0, avgLines: 0, totalDuration: 0 },
      companions: { active: 'spark', owned: { spark: true }, affection: { spark: 0 }, missionsCompleted: 0 },
      chronicle: { active: 'first_ascent', completed: {}, completedCount: 0, progress: {} },
      aftercare: { recoveries: 0, lastChoice: '', lastAt: '' },
      memoryBank: { notes: [], insightScore: 0 },
      v12: {
        moodMastery: {},
        crownTrials: { active: 'crown_awakening', completed: {}, completedCount: 0 },
        curator: { week: '', purchased: {}, purchasedCount: 0 },
        receipts: { runs: [], bestShare: '' },
        deepFocusMinutes: 0,
        founderScore: 0,
      },
      v13: {
        releaseChecklist: {},
        oathSigned: false,
        founderKitClaimed: false,
        sessionQuality: 0,
        wellnessBreaks: 0,
        lastReleaseReview: '',
        valueScore: 0,
      },
      achievements: {},
      ritual: { streak: 0, bestStreak: 0, lastDay: '', daysCompleted: 0, moodRuns: 0 },
      quests: { progress: {}, completed: {}, completedCount: 0 },
      cosmetics: {
        owned: { themes: { default: true }, boards: { glass: true }, trails: { spark: true } },
        equipped: { theme: 'default', board: 'glass', trail: 'spark' },
      },
      settings: { muted: false, mood: 'alpha', musicVolume: 0.44, sfxVolume: 0.78, haptics: true, reduceMotion: false, comfortAssist: false, highContrast: false, leftHanded: false, largeControls: false, breathCoach: false, ritualPlan: 'daily_calm' },
    };
    try {
      const oldV13 = JSON.parse(localStorage.getItem('nrb_profile_v13') || '{}');
      const oldV12 = JSON.parse(localStorage.getItem('nrb_profile_v12') || '{}');
      const oldV11 = JSON.parse(localStorage.getItem('nrb_profile_v11') || '{}');
      const oldV10 = JSON.parse(localStorage.getItem('nrb_profile_v10') || '{}');
      const oldV9 = JSON.parse(localStorage.getItem('nrb_profile_v9') || '{}');
      const oldV8 = JSON.parse(localStorage.getItem('nrb_profile_v8') || '{}');
      const oldV7 = JSON.parse(localStorage.getItem('nrb_profile_v7') || '{}');
      const oldV6 = JSON.parse(localStorage.getItem('nrb_profile_v6') || '{}');
      const oldV5 = JSON.parse(localStorage.getItem('nrb_profile_v5') || '{}');
      const oldV4 = JSON.parse(localStorage.getItem('nrb_profile_v4') || '{}');
      const oldV3 = JSON.parse(localStorage.getItem('nrb_profile_v3') || '{}');
      const oldV2 = JSON.parse(localStorage.getItem('nrb_profile_v2') || '{}');
      const migrated = { ...base, ...oldV2, ...oldV3, ...oldV4, ...oldV5, ...oldV6, ...oldV7, ...oldV8, ...oldV9, ...oldV10, ...oldV11, ...oldV12, ...oldV13 };
      migrated.settings = { ...base.settings, ...(oldV2.settings || {}), ...(oldV3.settings || {}), ...(oldV4.settings || {}), ...(oldV5.settings || {}), ...(oldV6.settings || {}), ...(oldV7.settings || {}) };
      migrated.ritual = { ...base.ritual, ...(oldV2.ritual || {}), ...(oldV3.ritual || {}), ...(oldV4.ritual || {}), ...(oldV5.ritual || {}), ...(oldV6.ritual || {}), ...(oldV7.ritual || {}) };
      migrated.quests = { ...base.quests, ...(oldV2.quests || {}), ...(oldV3.quests || {}), ...(oldV4.quests || {}), ...(oldV5.quests || {}), ...(oldV6.quests || {}), ...(oldV7.quests || {}) };
      migrated.quests.progress = { ...(base.quests.progress || {}), ...(oldV2.quests?.progress || {}), ...(oldV3.quests?.progress || {}), ...(oldV4.quests?.progress || {}), ...(oldV5.quests?.progress || {}), ...(oldV6.quests?.progress || {}), ...(oldV7.quests?.progress || {}) };
      migrated.quests.completed = { ...(base.quests.completed || {}), ...(oldV2.quests?.completed || {}), ...(oldV3.quests?.completed || {}), ...(oldV4.quests?.completed || {}), ...(oldV5.quests?.completed || {}), ...(oldV6.quests?.completed || {}), ...(oldV7.quests?.completed || {}) };
      migrated.prestige = { ...base.prestige, ...(oldV4.prestige || {}), ...(oldV5.prestige || {}), ...(oldV6.prestige || {}), ...(oldV7.prestige || {}) };
      migrated.academy = { ...base.academy, ...(oldV4.academy || {}), ...(oldV5.academy || {}), ...(oldV6.academy || {}), ...(oldV7.academy || {}) };
      migrated.academy.completed = { ...(base.academy.completed || {}), ...(oldV4.academy?.completed || {}), ...(oldV5.academy?.completed || {}), ...(oldV6.academy?.completed || {}), ...(oldV7.academy?.completed || {}) };
      migrated.rivals = { ...base.rivals, ...(oldV4.rivals || {}), ...(oldV5.rivals || {}), ...(oldV6.rivals || {}), ...(oldV7.rivals || {}) };
      migrated.rivals.beaten = { ...(base.rivals.beaten || {}), ...(oldV4.rivals?.beaten || {}), ...(oldV5.rivals?.beaten || {}), ...(oldV6.rivals?.beaten || {}), ...(oldV7.rivals?.beaten || {}) };
      migrated.focus = { ...base.focus, ...(oldV4.focus || {}), ...(oldV5.focus || {}), ...(oldV6.focus || {}), ...(oldV7.focus || {}) };
      migrated.cosmetics = { ...base.cosmetics, ...(oldV2.cosmetics || {}), ...(oldV3.cosmetics || {}), ...(oldV4.cosmetics || {}), ...(oldV5.cosmetics || {}), ...(oldV6.cosmetics || {}), ...(oldV7.cosmetics || {}) };
      migrated.cosmetics.owned = {
        themes: { default: true, ...(oldV2.cosmetics?.owned?.themes || {}), ...(oldV3.cosmetics?.owned?.themes || {}), ...(oldV4.cosmetics?.owned?.themes || {}), ...(oldV5.cosmetics?.owned?.themes || {}), ...(oldV6.cosmetics?.owned?.themes || {}), ...(oldV7.cosmetics?.owned?.themes || {}) },
        boards: { glass: true, ...(oldV2.cosmetics?.owned?.boards || {}), ...(oldV3.cosmetics?.owned?.boards || {}), ...(oldV4.cosmetics?.owned?.boards || {}), ...(oldV5.cosmetics?.owned?.boards || {}), ...(oldV6.cosmetics?.owned?.boards || {}), ...(oldV7.cosmetics?.owned?.boards || {}) },
        trails: { spark: true, ...(oldV2.cosmetics?.owned?.trails || {}), ...(oldV3.cosmetics?.owned?.trails || {}), ...(oldV4.cosmetics?.owned?.trails || {}), ...(oldV5.cosmetics?.owned?.trails || {}), ...(oldV6.cosmetics?.owned?.trails || {}), ...(oldV7.cosmetics?.owned?.trails || {}) },
      };
      migrated.cosmetics.equipped = { ...base.cosmetics.equipped, ...(oldV2.cosmetics?.equipped || {}), ...(oldV3.cosmetics?.equipped || {}), ...(oldV4.cosmetics?.equipped || {}), ...(oldV5.cosmetics?.equipped || {}), ...(oldV6.cosmetics?.equipped || {}), ...(oldV7.cosmetics?.equipped || {}) };
      migrated.campaign = { ...base.campaign, ...(oldV5.campaign || {}), ...(oldV6.campaign || {}), ...(oldV7.campaign || {}) };
      migrated.campaign.completed = { ...(base.campaign.completed || {}), ...(oldV5.campaign?.completed || {}), ...(oldV6.campaign?.completed || {}), ...(oldV7.campaign?.completed || {}) };
      migrated.sanctuary = { ...base.sanctuary, ...(oldV5.sanctuary || {}), ...(oldV6.sanctuary || {}), ...(oldV7.sanctuary || {}) };
      migrated.sanctuary.items = { ...(base.sanctuary.items || {}), ...(oldV5.sanctuary?.items || {}), ...(oldV6.sanctuary?.items || {}), ...(oldV7.sanctuary?.items || {}) };
      migrated.relics = { ...base.relics, ...(oldV6.relics || {}), ...(oldV7.relics || {}) };
      migrated.relics.owned = { ...(base.relics.owned || {}), ...(oldV6.relics?.owned || {}), ...(oldV7.relics?.owned || {}) };
      migrated.runLab = { ...base.runLab, ...(oldV6.runLab || {}), ...(oldV7.runLab || {}) };
      migrated.mastery = { ...(base.mastery || {}), ...(oldV6.mastery || {}), ...(oldV7.mastery || {}) };
      if (oldV8.settings) migrated.settings = { ...migrated.settings, ...oldV8.settings };
      if (oldV8.ritual) migrated.ritual = { ...migrated.ritual, ...oldV8.ritual };
      if (oldV8.quests) {
        migrated.quests = { ...migrated.quests, ...oldV8.quests };
        migrated.quests.progress = { ...(migrated.quests.progress || {}), ...(oldV8.quests.progress || {}) };
        migrated.quests.completed = { ...(migrated.quests.completed || {}), ...(oldV8.quests.completed || {}) };
      }
      if (oldV8.prestige) migrated.prestige = { ...migrated.prestige, ...oldV8.prestige };
      if (oldV8.academy) {
        migrated.academy = { ...migrated.academy, ...oldV8.academy };
        migrated.academy.completed = { ...(migrated.academy.completed || {}), ...(oldV8.academy.completed || {}) };
      }
      if (oldV8.rivals) {
        migrated.rivals = { ...migrated.rivals, ...oldV8.rivals };
        migrated.rivals.beaten = { ...(migrated.rivals.beaten || {}), ...(oldV8.rivals.beaten || {}) };
      }
      if (oldV8.focus) migrated.focus = { ...migrated.focus, ...oldV8.focus };
      if (oldV8.cosmetics) {
        migrated.cosmetics = { ...migrated.cosmetics, ...oldV8.cosmetics };
        migrated.cosmetics.owned = {
          themes: { default: true, ...(migrated.cosmetics.owned?.themes || {}), ...(oldV8.cosmetics.owned?.themes || {}) },
          boards: { glass: true, ...(migrated.cosmetics.owned?.boards || {}), ...(oldV8.cosmetics.owned?.boards || {}) },
          trails: { spark: true, ...(migrated.cosmetics.owned?.trails || {}), ...(oldV8.cosmetics.owned?.trails || {}) },
        };
        migrated.cosmetics.equipped = { ...base.cosmetics.equipped, ...(migrated.cosmetics.equipped || {}), ...(oldV8.cosmetics.equipped || {}) };
      }
      if (oldV8.campaign) {
        migrated.campaign = { ...migrated.campaign, ...oldV8.campaign };
        migrated.campaign.completed = { ...(migrated.campaign.completed || {}), ...(oldV8.campaign.completed || {}) };
      }
      if (oldV8.sanctuary) {
        migrated.sanctuary = { ...migrated.sanctuary, ...oldV8.sanctuary };
        migrated.sanctuary.items = { ...(migrated.sanctuary.items || {}), ...(oldV8.sanctuary.items || {}) };
      }
      if (oldV8.relics) {
        migrated.relics = { ...migrated.relics, ...oldV8.relics };
        migrated.relics.owned = { ...(migrated.relics.owned || {}), ...(oldV8.relics.owned || {}) };
      }
      if (oldV8.runLab) migrated.runLab = { ...migrated.runLab, ...oldV8.runLab };
      if (oldV8.mastery) migrated.mastery = { ...migrated.mastery, ...oldV8.mastery };
      if (oldV9.settings) migrated.settings = { ...migrated.settings, ...oldV9.settings };
      if (oldV9.ritual) migrated.ritual = { ...migrated.ritual, ...oldV9.ritual };
      if (oldV9.quests) {
        migrated.quests = { ...migrated.quests, ...oldV9.quests };
        migrated.quests.progress = { ...(migrated.quests.progress || {}), ...(oldV9.quests.progress || {}) };
        migrated.quests.completed = { ...(migrated.quests.completed || {}), ...(oldV9.quests.completed || {}) };
      }
      if (oldV9.prestige) migrated.prestige = { ...migrated.prestige, ...oldV9.prestige };
      if (oldV9.academy) {
        migrated.academy = { ...migrated.academy, ...oldV9.academy };
        migrated.academy.completed = { ...(migrated.academy.completed || {}), ...(oldV9.academy.completed || {}) };
      }
      if (oldV9.rivals) {
        migrated.rivals = { ...migrated.rivals, ...oldV9.rivals };
        migrated.rivals.beaten = { ...(migrated.rivals.beaten || {}), ...(oldV9.rivals.beaten || {}) };
      }
      if (oldV9.focus) migrated.focus = { ...migrated.focus, ...oldV9.focus };
      if (oldV9.cosmetics) {
        migrated.cosmetics = { ...migrated.cosmetics, ...oldV9.cosmetics };
        migrated.cosmetics.owned = {
          themes: { default: true, ...(migrated.cosmetics.owned?.themes || {}), ...(oldV9.cosmetics.owned?.themes || {}) },
          boards: { glass: true, ...(migrated.cosmetics.owned?.boards || {}), ...(oldV9.cosmetics.owned?.boards || {}) },
          trails: { spark: true, ...(migrated.cosmetics.owned?.trails || {}), ...(oldV9.cosmetics.owned?.trails || {}) },
        };
        migrated.cosmetics.equipped = { ...base.cosmetics.equipped, ...(migrated.cosmetics.equipped || {}), ...(oldV9.cosmetics.equipped || {}) };
      }
      if (oldV9.campaign) {
        migrated.campaign = { ...migrated.campaign, ...oldV9.campaign };
        migrated.campaign.completed = { ...(migrated.campaign.completed || {}), ...(oldV9.campaign.completed || {}) };
      }
      if (oldV9.sanctuary) {
        migrated.sanctuary = { ...migrated.sanctuary, ...oldV9.sanctuary };
        migrated.sanctuary.items = { ...(migrated.sanctuary.items || {}), ...(oldV9.sanctuary.items || {}) };
      }
      if (oldV9.relics) {
        migrated.relics = { ...migrated.relics, ...oldV9.relics };
        migrated.relics.owned = { ...(migrated.relics.owned || {}), ...(oldV9.relics.owned || {}) };
      }
      if (oldV9.runLab) migrated.runLab = { ...migrated.runLab, ...oldV9.runLab };
      if (oldV9.mastery) migrated.mastery = { ...migrated.mastery, ...oldV9.mastery };
      migrated.liveOps = { ...base.liveOps, ...(oldV7.liveOps || {}), ...(oldV8.liveOps || {}), ...(oldV9.liveOps || {}) };
      migrated.focusCards = { ...base.focusCards, ...(oldV7.focusCards || {}), ...(oldV8.focusCards || {}), ...(oldV9.focusCards || {}) };
      migrated.focusCards.completed = { ...(base.focusCards.completed || {}), ...(oldV7.focusCards?.completed || {}), ...(oldV8.focusCards?.completed || {}), ...(oldV9.focusCards?.completed || {}) };
      migrated.loadouts = { ...base.loadouts, ...(oldV7.loadouts || {}), ...(oldV8.loadouts || {}), ...(oldV9.loadouts || {}) };
      migrated.loadouts.slots = { ...(base.loadouts.slots || {}), ...(oldV7.loadouts?.slots || {}), ...(oldV8.loadouts?.slots || {}), ...(oldV9.loadouts?.slots || {}) };
      migrated.license = { ...base.license, ...(oldV8.license || {}), ...(oldV9.license || {}) };
      migrated.license.titleUnlocks = { ...(base.license.titleUnlocks || {}), ...(oldV8.license?.titleUnlocks || {}), ...(oldV9.license?.titleUnlocks || {}) };
      migrated.license.emblemUnlocks = { ...(base.license.emblemUnlocks || {}), ...(oldV8.license?.emblemUnlocks || {}), ...(oldV9.license?.emblemUnlocks || {}) };
      migrated.codex = { ...base.codex, ...(oldV8.codex || {}), ...(oldV9.codex || {}) };
      migrated.codex.seen = { ...(base.codex.seen || {}), ...(oldV8.codex?.seen || {}), ...(oldV9.codex?.seen || {}) };
      migrated.codex.counts = { ...(base.codex.counts || {}), ...(oldV8.codex?.counts || {}), ...(oldV9.codex?.counts || {}) };
      migrated.codex.rewards = { ...(base.codex.rewards || {}), ...(oldV8.codex?.rewards || {}), ...(oldV9.codex?.rewards || {}) };
      migrated.league = { ...base.league, ...(oldV8.league || {}), ...(oldV9.league || {}) };
      migrated.drills = { ...base.drills, ...(oldV8.drills || {}), ...(oldV9.drills || {}) };
      migrated.drills.completed = { ...(base.drills.completed || {}), ...(oldV8.drills?.completed || {}), ...(oldV9.drills?.completed || {}) };
      migrated.pulse = { ...base.pulse, ...(oldV8.pulse || {}), ...(oldV9.pulse || {}) };

      if (oldV10.settings) migrated.settings = { ...migrated.settings, ...oldV10.settings };
      if (oldV10.ritual) migrated.ritual = { ...migrated.ritual, ...oldV10.ritual };
      if (oldV10.quests) {
        migrated.quests = { ...migrated.quests, ...oldV10.quests };
        migrated.quests.progress = { ...(migrated.quests.progress || {}), ...(oldV10.quests.progress || {}) };
        migrated.quests.completed = { ...(migrated.quests.completed || {}), ...(oldV10.quests.completed || {}) };
      }
      migrated.skillTree = { ...base.skillTree, ...(oldV9.skillTree || {}), ...(oldV10.skillTree || {}), ...(oldV11.skillTree || {}) };
      migrated.skillTree.owned = { ...(base.skillTree.owned || {}), ...(oldV9.skillTree?.owned || {}), ...(oldV10.skillTree?.owned || {}), ...(oldV11.skillTree?.owned || {}) };
      migrated.challengeForge = { ...base.challengeForge, ...(oldV9.challengeForge || {}), ...(oldV10.challengeForge || {}), ...(oldV11.challengeForge || {}) };
      migrated.challengeForge.completed = { ...(base.challengeForge.completed || {}), ...(oldV9.challengeForge?.completed || {}), ...(oldV10.challengeForge?.completed || {}), ...(oldV11.challengeForge?.completed || {}) };
      migrated.protocol = { ...base.protocol, ...(oldV9.protocol || {}), ...(oldV10.protocol || {}), ...(oldV11.protocol || {}) };
      migrated.analytics = { ...base.analytics, ...(oldV9.analytics || {}), ...(oldV10.analytics || {}), ...(oldV11.analytics || {}) };
      migrated.analytics.runs = [...(oldV9.analytics?.runs || []), ...(oldV10.analytics?.runs || []), ...(oldV11.analytics?.runs || [])].slice(-24);
      migrated.companions = { ...base.companions, ...(oldV11.companions || {}) };
      migrated.companions.owned = { spark: true, ...(oldV11.companions?.owned || {}) };
      migrated.companions.affection = { spark: 0, ...(oldV11.companions?.affection || {}) };
      migrated.chronicle = { ...base.chronicle, ...(oldV11.chronicle || {}) };
      migrated.chronicle.completed = { ...(base.chronicle.completed || {}), ...(oldV11.chronicle?.completed || {}) };
      migrated.chronicle.progress = { ...(base.chronicle.progress || {}), ...(oldV11.chronicle?.progress || {}) };
      migrated.aftercare = { ...base.aftercare, ...(oldV11.aftercare || {}) };
      migrated.memoryBank = { ...base.memoryBank, ...(oldV11.memoryBank || {}) };
      migrated.memoryBank.notes = Array.isArray(migrated.memoryBank.notes) ? migrated.memoryBank.notes : [];
      migrated.v12 = { ...base.v12, ...(oldV11.v12 || {}), ...(oldV12.v12 || {}) };
      migrated.v12.moodMastery = { ...(base.v12.moodMastery || {}), ...(oldV11.v12?.moodMastery || {}), ...(oldV12.v12?.moodMastery || {}) };
      migrated.v12.crownTrials = { ...base.v12.crownTrials, ...(oldV11.v12?.crownTrials || {}), ...(oldV12.v12?.crownTrials || {}) };
      migrated.v12.crownTrials.completed = { ...(base.v12.crownTrials.completed || {}), ...(oldV11.v12?.crownTrials?.completed || {}), ...(oldV12.v12?.crownTrials?.completed || {}) };
      migrated.v12.curator = { ...base.v12.curator, ...(oldV11.v12?.curator || {}), ...(oldV12.v12?.curator || {}) };
      migrated.v12.receipts = { ...base.v12.receipts, ...(oldV11.v12?.receipts || {}), ...(oldV12.v12?.receipts || {}), ...(oldV13.v12?.receipts || {}) };
      migrated.v12.receipts.runs = [...(oldV11.v12?.receipts?.runs || []), ...(oldV12.v12?.receipts?.runs || []), ...(oldV13.v12?.receipts?.runs || [])].slice(-20);
      migrated.v13 = { ...base.v13, ...(oldV13.v13 || {}) };
      migrated.v13.releaseChecklist = { ...(base.v13.releaseChecklist || {}), ...(oldV13.v13?.releaseChecklist || {}) };
      migrated.version = 13;
      return migrated;
    } catch (_) {
      return base;
    }
  }

  function saveProfile() {
    profile.version = 13;
    localStorage.setItem('nrb_profile_v13', JSON.stringify(profile));
    localStorage.setItem('nrb_profile_v12', JSON.stringify(profile));
    renderProfileChips();
  }

  function rankForXP(xp) {
    return Math.max(1, Math.floor(Math.sqrt(xp / 115)) + 1);
  }

  function nextRankXP(rank) {
    return Math.pow(rank, 2) * 115;
  }

  function weekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  function seededPick(pool, seedText, count) {
    const rand = mulberry32(hashString(seedText));
    const copy = [...pool];
    const out = [];
    while (out.length < count && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
    return out;
  }

  function getActiveQuests() {
    const day = todayKey();
    const week = weekKey();
    const daily = seededPick(QUEST_POOL, `daily-${day}`, 3).map((q) => ({ ...q, scope: 'Daily', key: `daily:${day}:${q.id}` }));
    const weekly = seededPick(WEEKLY_QUEST_POOL, `weekly-${week}`, 3).map((q) => ({ ...q, scope: 'Weekly', key: `weekly:${week}:${q.id}` }));
    return [...daily, ...weekly];
  }

  function seasonPoints() {
    return Math.floor((profile.xp || 0) / 3) + (profile.quests?.completedCount || 0) * 85 + (profile.ritual?.daysCompleted || 0) * 60;
  }

  function seasonTier() {
    const points = seasonPoints();
    return SEASON.tiers.reduce((acc, tier) => (points >= tier.need ? tier.tier : acc), 1);
  }

  function prestigeLevel() {
    return Number(profile.prestige?.level || 0);
  }

  function activeRival() {
    return RIVAL_PROFILES.find((rival) => rival.id === selectedRival) || null;
  }


  function activeCampaignNode() {
    return CAMPAIGN_NODES.find((node) => node.id === profile.campaign?.active) || null;
  }

  function sanctuaryRate() {
    return Object.entries(profile.sanctuary?.items || {}).reduce((total, [id, owned]) => total + (owned ? (SANCTUARY_ITEMS[id]?.serenityPerHour || 0) : 0), 0);
  }

  function accrueSanctuary() {
    if (!profile.sanctuary) profile.sanctuary = { items: {}, serenity: 0, lastAccrual: Date.now(), breathSessions: 0, sleepTimerUses: 0 };
    const now = Date.now();
    const last = Number(profile.sanctuary.lastAccrual || now);
    const hours = Math.max(0, Math.min(8, (now - last) / 3600000));
    const gained = Math.floor(hours * sanctuaryRate());
    if (gained > 0) profile.sanctuary.serenity = Number(profile.sanctuary.serenity || 0) + gained;
    profile.sanctuary.lastAccrual = now;
  }

  function activeRitualPlan() {
    return RITUAL_PLANS[profile.settings?.ritualPlan] || RITUAL_PLANS.daily_calm;
  }

  function activeRelic() {
    const id = profile.relics?.equipped;
    return id && profile.relics?.owned?.[id] ? { id, ...RIFT_RELICS[id] } : null;
  }

  function activeRunModifier() {
    const id = profile.runLab?.enabled ? (profile.runLab?.selected || 'none') : 'none';
    return { id, ...(RUN_MODIFIERS[id] || RUN_MODIFIERS.none) };
  }


  function activeRiftEvent() {
    const day = todayKey();
    const eventIndex = hashString(`rift-weather-${weekKey()}-${day}`) % RIFT_EVENTS.length;
    return RIFT_EVENTS[eventIndex];
  }

  function activeFocusCard() {
    const id = profile.focusCards?.selected || 'score_10k';
    return FOCUS_CARDS.find((card) => card.id === id) || FOCUS_CARDS[0];
  }

  function focusCardCompleted(card, runState = state) {
    if (!card || !runState) return false;
    const checks = {
      score_10k: () => runState.score >= 10000,
      lines_16: () => runState.lines >= 16,
      surges_2: () => runState.stats.surges >= 2,
      combo_4: () => runState.bestCombo >= 4,
      missions_3: () => runState.stats.missions >= 3,
      zen_12: () => runState.mode === 'zen' && runState.lines >= 12,
      cores_5: () => runState.stats.cores >= 5,
      no_hold_12: () => runState.stats.holds === 0 && runState.lines >= 12,
    };
    return Boolean((checks[card.id] || (() => false))());
  }

  function focusCardRows() {
    const selected = profile.focusCards?.selected || 'score_10k';
    const completed = profile.focusCards?.completed || {};
    return FOCUS_CARDS.map((card) => {
      const done = Boolean(completed[card.id]);
      const active = selected === card.id;
      return `<button class="profile-row ${active ? 'active done' : ''}" data-focus-card="${card.id}" type="button"><b>${active ? '▶' : done ? '✓' : '☐'} ${card.name}</b><span>${card.target}. ${card.desc} Reward: +${card.rewardXP} XP / +${card.rewardShards} shards.</span></button>`;
    }).join('');
  }

  function chooseFocusCard(id) {
    if (!FOCUS_CARDS.some((card) => card.id === id)) return;
    if (!profile.focusCards) profile.focusCards = { selected: 'score_10k', completed: {}, completedCount: 0 };
    profile.focusCards.selected = id;
    saveProfile();
    showToast(`Focus Card armed: ${activeFocusCard().name}`);
    showLiveOpsOverlay();
  }

  function claimDailySignalChest() {
    if (!profile.liveOps) profile.liveOps = { lastChestDay: '', chestStreak: 0, dailyClaims: 0, weatherRuns: 0 };
    const today = todayKey();
    if (profile.liveOps.lastChestDay === today) {
      showToast('Signal Chest already claimed today');
      return;
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    profile.liveOps.chestStreak = profile.liveOps.lastChestDay === yesterday ? Number(profile.liveOps.chestStreak || 0) + 1 : 1;
    profile.liveOps.lastChestDay = today;
    profile.liveOps.dailyClaims = Number(profile.liveOps.dailyClaims || 0) + 1;
    const streak = profile.liveOps.chestStreak;
    const xp = 90 + streak * 18 + seasonTier() * 12;
    const shards = 4 + Math.min(9, streak) + seasonTier();
    const serenity = 2 + Math.floor(streak / 2);
    profile.xp += xp;
    profile.shards += shards;
    profile.sanctuary.serenity = Number(profile.sanctuary?.serenity || 0) + serenity;
    if (profile.liveOps.dailyClaims >= 3) unlock('checkin_3');
    if (profile.liveOps.dailyClaims >= 7) unlock('checkin_7');
    saveProfile();
    showToast(`Signal Chest: +${xp} XP, +${shards} shards`);
    showLiveOpsOverlay();
  }

  function currentLoadoutSnapshot() {
    return {
      mode: selectedMode,
      mood: profile.settings?.mood || 'alpha',
      relic: profile.relics?.equipped || '',
      modifier: profile.runLab?.selected || 'none',
      modifierEnabled: Boolean(profile.runLab?.enabled),
      theme: profile.cosmetics?.equipped?.theme || 'default',
      board: profile.cosmetics?.equipped?.board || 'glass',
      trail: profile.cosmetics?.equipped?.trail || 'spark',
      focusCard: profile.focusCards?.selected || 'score_10k',
      savedAt: new Date().toISOString(),
    };
  }

  function saveLoadout(slot) {
    if (!LOADOUT_SLOTS.includes(slot)) return;
    if (!profile.loadouts) profile.loadouts = { slots: {} };
    profile.loadouts.slots[slot] = currentLoadoutSnapshot();
    unlock('loadout_saved');
    saveProfile();
    showToast(`Loadout ${slot} saved`);
    showLiveOpsOverlay();
  }

  function launchLoadout(slot) {
    const loadout = profile.loadouts?.slots?.[slot];
    if (!loadout) { showToast(`Loadout ${slot} is empty`); return; }
    selectedRival = '';
    localStorage.removeItem('nrb_selected_rival');
    selectedMode = loadout.mode || 'endurance';
    localStorage.setItem('nrb_selected_mode', selectedMode);
    profile.settings.mood = loadout.mood || profile.settings.mood || 'alpha';
    profile.relics.equipped = loadout.relic || '';
    profile.runLab.selected = loadout.modifier || 'none';
    profile.runLab.enabled = Boolean(loadout.modifierEnabled && profile.runLab.selected !== 'none');
    profile.cosmetics.equipped = { ...profile.cosmetics.equipped, theme: loadout.theme || 'default', board: loadout.board || 'glass', trail: loadout.trail || 'spark' };
    profile.focusCards.selected = loadout.focusCard || profile.focusCards.selected || 'score_10k';
    saveProfile();
    startRun(selectedMode);
  }

  function loadoutRows() {
    const slots = profile.loadouts?.slots || {};
    return LOADOUT_SLOTS.map((slot) => {
      const loadout = slots[slot];
      const mode = loadout ? MODES[loadout.mode]?.label || loadout.mode : 'Empty';
      const mood = loadout ? AUDIO_MOODS[loadout.mood]?.label || loadout.mood : 'No ritual saved';
      const relic = loadout?.relic ? RIFT_RELICS[loadout.relic]?.name || loadout.relic : 'No relic';
      const mod = loadout?.modifierEnabled ? RUN_MODIFIERS[loadout.modifier]?.name || loadout.modifier : 'Clean Signal';
      return `<div class="profile-row loadout-row"><b>Slot ${slot}: ${mode}</b><span>${mood}. ${relic}. ${mod}.</span><em><button data-save-loadout="${slot}" type="button">Save</button><button data-launch-loadout="${slot}" type="button" ${loadout ? '' : 'disabled'}>Launch</button></em></div>`;
    }).join('');
  }

  function showLiveOpsOverlay() {
    const event = activeRiftEvent();
    const card = activeFocusCard();
    const claimed = profile.liveOps?.lastChestDay === todayKey();
    const streak = Number(profile.liveOps?.chestStreak || 0);
    setOverlay(`
      <p class="eyebrow">Ritual Ops</p>
      <h2>Daily Signal Center</h2>
      <p>This is the local live-ops layer: rotating Rift Weather, once-a-day Signal Chest, Focus Cards, and saved launch rituals. It works offline and gives players a reason to come back.</p>
      <div class="ritual-strip">
        <span><b>${event.name}</b>Rift Weather</span>
        <span><b>${claimed ? 'Claimed' : 'Ready'}</b>Signal Chest</span>
        <span><b>${streak}</b>Chest Streak</span>
      </div>
      <div class="profile-list compact-list">
        <div class="profile-row done"><b>${event.name}</b><span>${event.desc}</span></div>
        <div class="profile-row"><b>Active Focus Card: ${card.name}</b><span>${card.target}. ${card.desc}</span></div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="claimChestBtn" class="primary-btn" type="button" ${claimed ? 'disabled' : ''}>${claimed ? 'Chest Claimed' : 'Claim Signal Chest'}</button>
        <button id="startCardBtn" class="secondary-btn" type="button">Start Card Run</button>
        <button id="opsBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
      <h3 class="section-heading">Focus Card Deck</h3>
      <div class="profile-list compact-list">${focusCardRows()}</div>
      <h3 class="section-heading">Launch Loadouts</h3>
      <div class="profile-list compact-list">${loadoutRows()}</div>
    `);
    $('claimChestBtn')?.addEventListener('click', claimDailySignalChest);
    $('startCardBtn')?.addEventListener('click', () => startRun(selectedMode));
    $('opsBackBtn')?.addEventListener('click', homeOverlay);
    ui.overlayPanel.querySelectorAll('[data-focus-card]').forEach((btn) => btn.addEventListener('click', () => chooseFocusCard(btn.dataset.focusCard)));
    ui.overlayPanel.querySelectorAll('[data-save-loadout]').forEach((btn) => btn.addEventListener('click', () => saveLoadout(btn.dataset.saveLoadout)));
    ui.overlayPanel.querySelectorAll('[data-launch-loadout]').forEach((btn) => btn.addEventListener('click', () => launchLoadout(btn.dataset.launchLoadout)));
  }

  function masteryForMode(mode) {
    if (!profile.mastery) profile.mastery = {};
    if (!profile.mastery[mode]) profile.mastery[mode] = { xp: 0, level: 0, best: 0, lines: 0 };
    return profile.mastery[mode];
  }

  function masteryLevelFromXP(xp) {
    return Math.max(0, Math.min(10, Math.floor(Math.sqrt(Number(xp || 0) / 180))));
  }

  function applyV7RunSystems() {
    const relic = activeRelic();
    const modifier = activeRunModifier();
    state.relic = relic;
    state.runModifier = modifier;
    if (relic) {
      state.runPerks.coreChanceBonus += Number(relic.coreBonus || 0);
      state.runPerks.scoreMult *= Number(relic.scoreMult || 1);
      state.runPerks.gravityMult *= Number(relic.gravityMult || 1);
      state.runPerks.riftMult *= Number(relic.riftMult || 1);
    }
    if (modifier && modifier.id !== 'none') {
      state.runPerks.coreChanceBonus += Number(modifier.coreBonus || 0);
      state.runPerks.scoreMult *= Number(modifier.scoreMult || 1);
      state.runPerks.gravityMult *= Number(modifier.gravityMult || 1);
      if (modifier.shieldOverride !== undefined) state.shield = Number(modifier.shieldOverride || 0);
      if (modifier.garbageEvery && !state.cfg.garbageEvery) state.cfg = { ...state.cfg, garbageEvery: modifier.garbageEvery };
    }
  }


  function applyV8RunSystems() {
    applyV7RunSystems();
    const event = activeRiftEvent();
    const card = activeFocusCard();
    state.riftEvent = event;
    state.focusCard = card;
    if (event) {
      state.runPerks.coreChanceBonus += Number(event.coreBonus || 0);
      state.runPerks.scoreMult *= Number(event.scoreMult || 1);
      state.runPerks.gravityMult *= Number(event.gravityMult || 1);
      state.runPerks.riftMult *= Number(event.riftMult || 1);
      state.runPerks.shardMult *= Number(event.shardMult || 1);
      if (event.garbageEvery && !state.cfg.garbageEvery && state.mode !== 'zen') state.cfg = { ...state.cfg, garbageEvery: event.garbageEvery };
    }
    if (card?.id === 'zen_12' && state.mode === 'zen') state.runPerks.gravityMult *= 1.03;
    if (card?.id === 'cores_5') state.runPerks.coreChanceBonus += 0.025;
  }

  function relicUnlockCount() {
    return Object.values(profile.relics?.owned || {}).filter(Boolean).length;
  }

  function buyOrEquipRelic(id) {
    const relic = RIFT_RELICS[id];
    if (!relic) return;
    if (!profile.relics) profile.relics = { owned: {}, equipped: '', fragments: 0, unlocks: 0 };
    if (profile.relics.owned[id]) {
      profile.relics.equipped = profile.relics.equipped === id ? '' : id;
      saveProfile();
      showRelicsOverlay();
      return;
    }
    if (relicUnlockCount() < Number(relic.unlock || 0)) {
      showToast(`Unlock ${relic.unlock} relics first`);
      return;
    }
    if (profile.shards < relic.cost) {
      showToast(`Need ${relic.cost - profile.shards} more shards`);
      return;
    }
    profile.shards -= relic.cost;
    profile.relics.owned[id] = true;
    profile.relics.equipped = id;
    profile.relics.unlocks = relicUnlockCount();
    unlock('relic_first');
    if (relicUnlockCount() >= 5) unlock('relic_5');
    saveProfile();
    showRelicsOverlay();
  }

  function relicRows() {
    const owned = profile.relics?.owned || {};
    const equipped = profile.relics?.equipped || '';
    return Object.entries(RIFT_RELICS).map(([id, relic]) => {
      const locked = relicUnlockCount() < Number(relic.unlock || 0) && !owned[id];
      const verb = equipped === id ? 'Equipped' : owned[id] ? 'Equip' : locked ? `Unlock ${relic.unlock} relics` : `${relic.cost} shards`;
      return `<button class="shop-card ${equipped === id ? 'equipped' : ''}" data-relic="${id}" type="button"><b>${relic.name}</b><span>${relic.desc}</span><em>${verb}</em></button>`;
    }).join('');
  }

  function showRelicsOverlay() {
    const relic = activeRelic();
    setOverlay(`
      <p class="eyebrow">Rift Relics</p>
      <h2>Relic Cabinet</h2>
      <p>Relics are permanent, non-random upgrades bought with earned shards. Equip one at a time so long sessions feel customized without becoming pay-to-win.</p>
      <div class="ritual-strip">
        <span><b>${relic ? relic.name : 'None'}</b>Equipped</span>
        <span><b>${relicUnlockCount()}/${Object.keys(RIFT_RELICS).length}</b>Unlocked</span>
        <span><b>${formatNumber(profile.shards)}</b>Shards</span>
      </div>
      <div class="shop-grid">${relicRows()}</div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="relicBackBtn" class="primary-btn" type="button">Back</button>
        <button id="relicLabBtn" class="secondary-btn" type="button">Run Lab</button>
        <button id="relicMasteryBtn" class="secondary-btn" type="button">Mastery</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-relic]').forEach((btn) => btn.addEventListener('click', () => buyOrEquipRelic(btn.dataset.relic)));
    $('relicBackBtn').addEventListener('click', homeOverlay);
    $('relicLabBtn').addEventListener('click', showRunLabOverlay);
    $('relicMasteryBtn').addEventListener('click', showMasteryOverlay);
  }

  function showRunLabOverlay() {
    const current = activeRunModifier();
    setOverlay(`
      <p class="eyebrow">Run Lab</p>
      <h2>Modifier Console</h2>
      <p>Pick an optional rule-set before starting. This gives serious players fresh risk/reward runs without needing a server-side live-ops system yet.</p>
      <div class="profile-list compact-list">
        ${Object.entries(RUN_MODIFIERS).map(([id, mod]) => `<button class="profile-row ${current.id === id ? 'active done' : ''}" data-modifier="${id}" type="button"><b>${current.id === id ? '▶' : '☐'} ${mod.name}</b><span>${mod.risk}. ${mod.desc}</span></button>`).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="labToggleBtn" class="primary-btn" type="button">${profile.runLab?.enabled ? 'Disable Modifier' : 'Enable Modifier'}</button>
        <button id="labStartBtn" class="secondary-btn" type="button">Start Modified Run</button>
        <button id="labBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-modifier]').forEach((btn) => btn.addEventListener('click', () => {
      profile.runLab.selected = btn.dataset.modifier;
      if (profile.runLab.selected === 'none') profile.runLab.enabled = false;
      saveProfile();
      showRunLabOverlay();
    }));
    $('labToggleBtn').addEventListener('click', () => {
      profile.runLab.enabled = !profile.runLab.enabled;
      if ((profile.runLab.selected || 'none') === 'none') profile.runLab.enabled = false;
      saveProfile();
      showRunLabOverlay();
    });
    $('labStartBtn').addEventListener('click', () => startRun(selectedMode));
    $('labBackBtn').addEventListener('click', homeOverlay);
  }

  function showMasteryOverlay() {
    setOverlay(`
      <p class="eyebrow">Mode Mastery</p>
      <h2>Skill Tracks</h2>
      <p>Every mode now earns mastery XP from score, lines, and completion. This creates long-tail progression even when a player is not chasing cosmetics.</p>
      <div class="profile-list compact-list">
        ${MASTERY_MODES.map((mode) => {
          const m = masteryForMode(mode);
          const lvl = masteryLevelFromXP(m.xp);
          return `<div class="profile-row"><b>${MODES[mode].label} · Lv ${lvl}</b><span>${formatNumber(m.xp)} mastery XP, ${formatNumber(m.best || 0)} best score, ${formatNumber(m.lines || 0)} lifetime lines.</span></div>`;
        }).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="masteryBackBtn" class="primary-btn" type="button">Back</button>
        <button id="masteryRelicsBtn" class="secondary-btn" type="button">Relics</button>
      </div>
    `);
    $('masteryBackBtn').addEventListener('click', homeOverlay);
    $('masteryRelicsBtn').addEventListener('click', showRelicsOverlay);
  }

  function updateMasteryAfterRun(xpGain) {
    const m = masteryForMode(state.mode);
    m.xp = Number(m.xp || 0) + Math.floor((xpGain || 0) * 0.7) + state.lines * 9 + state.stats.missions * 20;
    m.best = Math.max(Number(m.best || 0), Math.floor(state.score));
    m.lines = Number(m.lines || 0) + Number(state.lines || 0);
    const lvl = masteryLevelFromXP(m.xp);
    if (lvl >= 3) unlock('mastery_3');
    if (MASTERY_MODES.every((mode) => masteryLevelFromXP(masteryForMode(mode).xp) >= 1)) unlock('mastery_all');
  }

  function rivalryScoreTarget(rival) {
    if (!rival) return 0;
    const prestigeBump = prestigeLevel() * 900;
    const rankBump = Math.max(0, rankForXP(profile.xp) - 1) * 180;
    return rival.target + prestigeBump + rankBump;
  }


  function ensureV9Profile() {
    profile.license = profile.license || { title: 'Rift Initiate', callsign: 'PILOT-13', emblem: 'spark', titleUnlocks: { 'Rift Initiate': true }, emblemUnlocks: { spark: true } };
    profile.license.titleUnlocks = { 'Rift Initiate': true, ...(profile.license.titleUnlocks || {}) };
    profile.license.emblemUnlocks = { spark: true, ...(profile.license.emblemUnlocks || {}) };
    profile.codex = profile.codex || { seen: {}, counts: {}, rewards: {}, discoveries: 0 };
    profile.codex.seen = profile.codex.seen || {};
    profile.codex.counts = profile.codex.counts || {};
    profile.codex.rewards = profile.codex.rewards || {};
    profile.league = profile.league || { week: '', score: 0, bestRun: 0, tier: 'bronze', medals: 0 };
    profile.drills = profile.drills || { active: '', completed: {}, completedCount: 0, lastAdvice: '' };
    profile.drills.completed = profile.drills.completed || {};
    profile.pulse = profile.pulse || { completed: 0, bestRun: 0 };
  }

  function codexDiscoveryCount() {
    return Object.values(profile.codex?.seen || {}).filter(Boolean).length;
  }

  function markCodex(id, amount = 1) {
    if (!CODEX_ENTRIES[id]) return;
    ensureV10Profile();
    const first = !profile.codex.seen[id];
    profile.codex.seen[id] = true;
    profile.codex.counts[id] = Number(profile.codex.counts[id] || 0) + amount;
    profile.codex.discoveries = codexDiscoveryCount();
    if (first && state?.started) {
      state.score += 130;
      showToast(`Codex discovered: ${CODEX_ENTRIES[id].name}`);
    }
    if (profile.codex.discoveries >= 12) unlock('codex_12');
    const pieces = CLASSIC_POOL.concat('X').every((piece) => profile.codex.seen[`piece_${piece}`]);
    if (pieces) unlock('codex_all_pieces');
  }

  function leagueTierFromScore(score) {
    return LEAGUE_TIERS.reduce((best, tier) => (Number(score || 0) >= tier.need ? tier : best), LEAGUE_TIERS[0]);
  }

  function leagueTierInfo() {
    ensureV9Profile();
    const week = weekKey();
    if (profile.league.week !== week) return LEAGUE_TIERS[0];
    return leagueTierFromScore(profile.league.score);
  }

  function updateLeagueAfterRun() {
    ensureV9Profile();
    const week = weekKey();
    if (profile.league.week !== week) profile.league = { week, score: 0, bestRun: 0, tier: 'bronze', medals: Number(profile.league?.medals || 0) };
    const before = leagueTierFromScore(profile.league.score);
    profile.league.score = Number(profile.league.score || 0) + Math.floor(state.score || 0);
    profile.league.bestRun = Math.max(Number(profile.league.bestRun || 0), Math.floor(state.score || 0));
    const after = leagueTierFromScore(profile.league.score);
    profile.league.tier = after.id;
    if (after.need > before.need) {
      profile.xp += after.rewardXP;
      profile.shards += after.rewardShards;
      profile.league.medals = Number(profile.league.medals || 0) + 1;
      showToast(`${after.name}: +${after.rewardShards} shards`);
    }
    if (after.id === 'silver') unlock('league_silver');
    if (after.id === 'gold') unlock('league_gold');
    if (after.id === 'obsidian' || after.id === 'mythic') unlock('league_obsidian');
  }

  function activeDrill() {
    ensureV9Profile();
    const id = profile.drills.active || seededPick(DRILL_POOL, `drill-${todayKey()}-${rankForXP(profile.xp)}`, 1)[0].id;
    profile.drills.active = id;
    return DRILL_POOL.find((drill) => drill.id === id) || DRILL_POOL[0];
  }

  function chooseDrill(id) {
    if (!DRILL_POOL.some((drill) => drill.id === id)) return;
    ensureV9Profile();
    profile.drills.active = id;
    saveProfile();
    showDrillsOverlay();
  }

  function makePulseGoal(rng) {
    const goal = PULSE_GOALS[Math.floor(rng() * PULSE_GOALS.length)] || PULSE_GOALS[0];
    return { ...goal, progress: 0, complete: false };
  }

  function progressPulse(type, amount = 1, setMax = false) {
    if (!state?.pulseGoal || state.pulseGoal.complete || state.pulseGoal.type !== type) return;
    state.pulseProgress = state.pulseProgress || {};
    const current = Number(state.pulseProgress[type] || 0);
    const next = setMax || state.pulseGoal.setMax ? Math.max(current, amount) : current + amount;
    state.pulseProgress[type] = Math.min(state.pulseGoal.target, next);
    if (state.pulseProgress[type] >= state.pulseGoal.target) {
      state.pulseGoal.complete = true;
      state.score += state.pulseGoal.reward;
      state.riftCharge = Math.min(100, state.riftCharge + 10);
      state.stats.missions += 1;
      profile.pulse.completed = Number(profile.pulse?.completed || 0) + 1;
      profile.pulse.bestRun = Math.max(Number(profile.pulse?.bestRun || 0), profile.pulse.completed);
      addFloater(`PULSE +${state.pulseGoal.reward}`, BOARD_W / 2, 128, '#9dffef');
      showToast(`${state.pulseGoal.text} complete`);
      if (profile.pulse.completed >= 9) unlock('pulse_9');
    }
  }

  function evaluateDrillAfterRun() {
    ensureV9Profile();
    const drill = state.drill || activeDrill();
    if (!drill || profile.drills.completed[`${todayKey()}:${drill.id}`]) return { drill, won: false, xp: 0, shards: 0 };
    const won = Boolean(drill.check(state));
    if (!won) {
      profile.drills.lastAdvice = coachAdvice();
      return { drill, won: false, xp: 0, shards: 0 };
    }
    profile.drills.completed[`${todayKey()}:${drill.id}`] = Date.now();
    profile.drills.completedCount = Number(profile.drills.completedCount || 0) + 1;
    profile.xp += drill.rewardXP;
    profile.shards += drill.rewardShards;
    unlock('drill_first');
    if (profile.drills.completedCount >= 13) unlock('drill_13');
    return { drill, won: true, xp: drill.rewardXP, shards: drill.rewardShards };
  }

  function unlockLicenseItems() {
    ensureV9Profile();
    PILOT_TITLES.forEach((title) => { if (title.need()) profile.license.titleUnlocks[title.id] = true; });
    Object.entries(PILOT_EMBLEMS).forEach(([id, emblem]) => { if (emblem.need()) profile.license.emblemUnlocks[id] = true; });
  }

  function applyV9RunSystems() {
    applyV8RunSystems();
    state.drill = activeDrill();
    const title = profile.license?.title || 'Rift Initiate';
    if (title === 'Calm Stacker' && state.mode === 'zen') state.runPerks.gravityMult *= 1.03;
    if (title === 'Signal Royalty') state.runPerks.scoreMult *= 1.015;
    if (title === 'Gold Circuit') state.runPerks.shardMult *= 1.03;
    if (title === 'Obsidian Pilot') state.runPerks.riftMult *= 1.04;
    if (profile.license?.emblem === 'prism') state.runPerks.coreChanceBonus += 0.01;
    if (profile.license?.emblem === 'lotus' && state.mode === 'zen') state.shield = Math.max(state.shield, 1);
  }



  function ensureV10Profile() {
    ensureV9Profile();
    profile.skillTree = profile.skillTree || { owned: {}, spent: 0 };
    profile.skillTree.owned = profile.skillTree.owned || {};
    profile.challengeForge = profile.challengeForge || { active: '', completed: {}, clears: 0 };
    profile.challengeForge.completed = profile.challengeForge.completed || {};
    profile.protocol = profile.protocol || { step: 0, completedCount: 0, lastClear: '' };
    profile.analytics = profile.analytics || { runs: [], bestScore: 0, bestLines: 0, avgScore: 0, avgLines: 0, totalDuration: 0 };
    profile.analytics.runs = Array.isArray(profile.analytics.runs) ? profile.analytics.runs : [];
  }

  function skillOwnedCount() {
    ensureV10Profile();
    return Object.values(profile.skillTree.owned || {}).filter(Boolean).length;
  }

  function buySkill(id) {
    ensureV10Profile();
    const skill = SKILL_MATRIX[id];
    if (!skill) return;
    if (profile.skillTree.owned[id]) {
      showToast(`${skill.name} already online`);
      return;
    }
    if (profile.shards < skill.cost) {
      showToast(`Need ${skill.cost - profile.shards} more shards`);
      return;
    }
    profile.shards -= skill.cost;
    profile.skillTree.owned[id] = true;
    profile.skillTree.spent = Number(profile.skillTree.spent || 0) + skill.cost;
    if (skillOwnedCount() >= 3) unlock('skill_3');
    saveProfile();
    showSkillMatrixOverlay();
  }

  function challengePoolForToday() {
    return seededPick(CHALLENGE_POOL, `forge-${todayKey()}`, 3).map((challenge) => ({ ...challenge, key: `${todayKey()}:${challenge.id}` }));
  }

  function activeChallenge() {
    ensureV10Profile();
    return challengePoolForToday().find((challenge) => challenge.id === profile.challengeForge.active) || null;
  }

  function selectChallenge(id) {
    ensureV10Profile();
    const challenge = challengePoolForToday().find((item) => item.id === id);
    if (!challenge) return;
    profile.challengeForge.active = profile.challengeForge.active === id ? '' : id;
    if (profile.challengeForge.active) {
      selectedMode = challenge.mode;
      localStorage.setItem('nrb_selected_mode', selectedMode);
    }
    saveProfile();
    showChallengeForgeOverlay();
  }

  function challengeMet(challenge, runState = state) {
    if (!challenge) return false;
    if (runState.mode !== challenge.mode) return false;
    if (runState.score < challenge.targetScore) return false;
    if (runState.lines < challenge.minLines) return false;
    if (challenge.minSurges && runState.stats.surges < challenge.minSurges) return false;
    if (challenge.minCores && runState.stats.cores < challenge.minCores) return false;
    return true;
  }

  function evaluateChallengeAfterRun() {
    ensureV10Profile();
    const challenge = state.challenge || activeChallenge();
    if (!challenge) return { challenge, won: false, xp: 0, shards: 0 };
    const won = challengeMet(challenge);
    const paid = Boolean(profile.challengeForge.completed[challenge.key]);
    if (!won || paid) return { challenge, won, paid, xp: 0, shards: 0 };
    profile.challengeForge.completed[challenge.key] = Date.now();
    profile.challengeForge.clears = Number(profile.challengeForge.clears || 0) + 1;
    profile.challengeForge.active = '';
    unlock('challenge_first');
    if (profile.challengeForge.clears >= 7) unlock('challenge_7');
    return { challenge, won: true, paid: false, xp: challenge.rewardXP, shards: challenge.rewardShards };
  }

  function activeProtocolStep() {
    ensureV10Profile();
    const idx = Math.min(PROTOCOL_STEPS.length, Math.max(0, Number(profile.protocol.step || 0)));
    return PROTOCOL_STEPS[idx] || null;
  }

  function evaluateProtocolAfterRun() {
    ensureV10Profile();
    const step = activeProtocolStep();
    if (!step) return { step: null, won: false, xp: 0, shards: 0 };
    const won = Boolean(step.check(state));
    if (!won) return { step, won: false, xp: 0, shards: 0 };
    profile.protocol.step = Math.min(PROTOCOL_STEPS.length, Number(profile.protocol.step || 0) + 1);
    profile.protocol.completedCount = Math.max(Number(profile.protocol.completedCount || 0), profile.protocol.step);
    profile.protocol.lastClear = todayKey();
    if (profile.protocol.completedCount >= 5) unlock('protocol_5');
    if (profile.protocol.completedCount >= PROTOCOL_STEPS.length) unlock('protocol_13');
    return { step, won: true, xp: step.rewardXP, shards: step.rewardShards };
  }

  function recordRunAnalytics(summary) {
    ensureV10Profile();
    const clean = {
      date: new Date().toISOString(),
      mode: summary.mode,
      score: Math.floor(summary.score || 0),
      lines: Math.floor(summary.lines || 0),
      level: Math.floor(summary.level || 0),
      combo: Math.floor(summary.combo || 0),
      duration: Math.floor(summary.duration || 0),
      xp: Math.floor(summary.xp || 0),
      shards: Math.floor(summary.shards || 0),
      challenge: summary.challenge || '',
      protocol: summary.protocol || '',
    };
    profile.analytics.runs.unshift(clean);
    profile.analytics.runs = profile.analytics.runs.slice(0, 24);
    profile.analytics.bestScore = Math.max(Number(profile.analytics.bestScore || 0), clean.score);
    profile.analytics.bestLines = Math.max(Number(profile.analytics.bestLines || 0), clean.lines);
    profile.analytics.totalDuration = Number(profile.analytics.totalDuration || 0) + clean.duration;
    const count = profile.analytics.runs.length || 1;
    profile.analytics.avgScore = Math.round(profile.analytics.runs.reduce((sum, run) => sum + Number(run.score || 0), 0) / count);
    profile.analytics.avgLines = Math.round(profile.analytics.runs.reduce((sum, run) => sum + Number(run.lines || 0), 0) / count);
    if (profile.analytics.runs.length >= 10) unlock('analytics_10');
  }

  function applyV10RunSystems() {
    applyV9RunSystems();
    ensureV10Profile();
    const owned = profile.skillTree.owned || {};
    if (owned.steady_hands) state.runPerks.gravityMult *= 1.04;
    if (owned.core_whisper) state.runPerks.coreChanceBonus += 0.015;
    if (owned.rift_capacitor) state.riftCharge = Math.min(100, state.riftCharge + 12);
    if (owned.shard_magnet) state.runPerks.shardMult *= 1.08;
    if (owned.score_lens) state.runPerks.scoreMult *= 1.025;
    if (owned.lotus_guard && state.mode === 'zen') state.shield = Math.min(3, state.shield + 1);
    if (owned.scar_buffer) state.runPerks.scarControl = Math.min(0.5, state.runPerks.scarControl + 0.08);
    if (owned.crown_flow) state.runPerks.xpMult *= 1.07;
    const challenge = activeChallenge();
    state.challenge = challenge;
    if (challenge) {
      state.runPerks.scoreMult *= Number(challenge.scoreMult || 1);
      state.runPerks.shardMult *= Number(challenge.shardMult || 1);
      state.runPerks.riftMult *= Number(challenge.riftMult || 1);
      state.runPerks.coreChanceBonus += Number(challenge.coreBonus || 0);
    }
    state.protocolStep = activeProtocolStep();
  }

  function ensureV11Profile() {
    ensureV10Profile();
    profile.version = 11;
    profile.companions = profile.companions || { active: 'spark', owned: { spark: true }, affection: { spark: 0 }, missionsCompleted: 0 };
    profile.companions.owned = { spark: true, ...(profile.companions.owned || {}) };
    profile.companions.affection = { spark: 0, ...(profile.companions.affection || {}) };
    profile.chronicle = profile.chronicle || { active: 'first_ascent', completed: {}, completedCount: 0, progress: {} };
    profile.chronicle.completed = profile.chronicle.completed || {};
    profile.chronicle.progress = profile.chronicle.progress || {};
    profile.aftercare = profile.aftercare || { recoveries: 0, lastChoice: '', lastAt: '' };
    profile.memoryBank = profile.memoryBank || { notes: [], insightScore: 0 };
    profile.memoryBank.notes = Array.isArray(profile.memoryBank.notes) ? profile.memoryBank.notes : [];
  }

  function activeCompanion() {
    ensureV11Profile();
    return RIFT_COMPANIONS[profile.companions.active] || RIFT_COMPANIONS.spark;
  }

  function companionAffinity(id = profile.companions?.active || 'spark') {
    ensureV11Profile();
    return Number(profile.companions.affection?.[id] || 0);
  }

  function buyOrEquipCompanion(id) {
    ensureV11Profile();
    const companion = RIFT_COMPANIONS[id];
    if (!companion) return;
    const owned = Boolean(profile.companions.owned[id]);
    if (!owned) {
      if (companion.needRank && rankForXP(profile.xp) < companion.needRank) return showToast(`Reach Rank ${companion.needRank} first`);
      if (profile.shards < companion.cost) return showToast(`Need ${companion.cost - profile.shards} more shards`);
      profile.shards -= companion.cost;
      profile.companions.owned[id] = true;
      profile.companions.affection[id] = profile.companions.affection[id] || 0;
    }
    profile.companions.active = id;
    saveProfile();
    showCompanionsOverlay();
  }

  function activeChronicleArc() {
    ensureV11Profile();
    const active = profile.chronicle.active;
    return CHRONICLE_ARCS.find((arc) => arc.id === active && !profile.chronicle.completed[arc.id]) || CHRONICLE_ARCS.find((arc) => !profile.chronicle.completed[arc.id]) || null;
  }

  function selectChronicle(id) {
    ensureV11Profile();
    const arc = CHRONICLE_ARCS.find((item) => item.id === id);
    if (!arc || profile.chronicle.completed[id]) return;
    profile.chronicle.active = id;
    saveProfile();
    showChronicleOverlay();
  }

  function evaluateChronicleAfterRun() {
    ensureV11Profile();
    const arc = activeChronicleArc();
    if (!arc) return { arc: null, won: false, xp: 0, shards: 0 };
    profile.chronicle.active = arc.id;
    const won = Boolean(arc.check(state));
    if (!won) return { arc, won: false, xp: 0, shards: 0 };
    profile.chronicle.completed[arc.id] = todayKey();
    profile.chronicle.completedCount = Object.keys(profile.chronicle.completed).length;
    unlock('chronicle_first');
    if (profile.chronicle.completedCount >= 5) unlock('chronicle_5');
    return { arc, won: true, xp: arc.xp, shards: arc.shards };
  }

  function awardCompanionAfterRun() {
    ensureV11Profile();
    const id = profile.companions.active || 'spark';
    const companion = RIFT_COMPANIONS[id] || RIFT_COMPANIONS.spark;
    let affinity = 4;
    if (state.lines >= 10) affinity += 2;
    if (state.bestCombo >= 3) affinity += 2;
    if (state.stats.surges >= 1) affinity += 2;
    if (companion.mode && state.mode === companion.mode) affinity += 4;
    profile.companions.affection[id] = Number(profile.companions.affection[id] || 0) + affinity;
    profile.companions.missionsCompleted = Number(profile.companions.missionsCompleted || 0) + 1;
    unlock('companion_first');
    if (profile.companions.affection[id] >= 50) unlock('companion_50');
    return { companion, affinity };
  }

  function addRunMemoryNote(text) {
    ensureV11Profile();
    const note = { date: new Date().toISOString(), text: String(text || '').slice(0, 140), mode: state?.mode || selectedMode, score: Math.floor(state?.score || 0) };
    profile.memoryBank.notes.unshift(note);
    profile.memoryBank.notes = profile.memoryBank.notes.slice(0, 20);
    profile.memoryBank.insightScore = Number(profile.memoryBank.insightScore || 0) + 1;
    if (profile.memoryBank.notes.length >= 10) unlock('memory_10');
  }

  function choosePostRunRecovery(id) {
    ensureV11Profile();
    const option = POST_RUN_RECOVERY.find((item) => item.id === id);
    if (!option) return;
    profile.aftercare.recoveries = Number(profile.aftercare.recoveries || 0) + 1;
    profile.aftercare.lastChoice = id;
    profile.aftercare.lastAt = new Date().toISOString();
    const companionId = profile.companions.active || 'spark';
    profile.companions.affection[companionId] = Number(profile.companions.affection[companionId] || 0) + Number(option.affinity || 0);
    if (option.serenity) profile.sanctuary.serenity = Number(profile.sanctuary?.serenity || 0) + option.serenity;
    if (option.shards) profile.shards += option.shards;
    if (option.memory) addRunMemoryNote(`Analyzed ${MODES[state.mode]?.label || state.mode}: ${formatNumber(state.score)} score, ${state.lines} lines, combo ${state.bestCombo}.`);
    unlock('aftercare_first');
    saveProfile();
    showToast(`${option.name} applied`);
    if (option.rematch) startRun(selectedMode);
    else showProfileOverlay();
  }

  function applyV11RunSystems() {
    applyV10RunSystems();
    ensureV11Profile();
    const companion = activeCompanion();
    state.companion = companion;
    state.chronicleArc = activeChronicleArc();
    state.runPerks.scoreMult *= Number(companion.scoreMult || 1);
    state.runPerks.shardMult *= Number(companion.shardMult || 1);
    state.runPerks.riftMult *= Number(companion.riftMult || 1);
    state.runPerks.xpMult *= Number(companion.xpMult || 1);
    if (companion.mode && state.mode === companion.mode) state.runPerks.shardMult *= 1.02;
  }



  function ensureV12Profile() {
    ensureV11Profile();
    profile.version = 13;
    profile.v12 = profile.v12 || {};
    profile.v12.moodMastery = profile.v12.moodMastery || {};
    Object.keys(AUDIO_MOODS).forEach((id) => {
      profile.v12.moodMastery[id] = profile.v12.moodMastery[id] || { xp: 0, runs: 0, level: 0 };
    });
    profile.v12.crownTrials = profile.v12.crownTrials || { active: 'crown_awakening', completed: {}, completedCount: 0 };
    profile.v12.crownTrials.completed = profile.v12.crownTrials.completed || {};
    profile.v12.curator = profile.v12.curator || { week: '', purchased: {}, purchasedCount: 0 };
    profile.v12.curator.purchased = profile.v12.curator.purchased || {};
    profile.v12.receipts = profile.v12.receipts || { runs: [], bestShare: '' };
    profile.v12.receipts.runs = Array.isArray(profile.v12.receipts.runs) ? profile.v12.receipts.runs : [];
    profile.v12.founderScore = Number(profile.v12.founderScore || 0);
  }

  function moodMasteryLevel(xp) {
    let level = 0;
    V12_MOOD_TIERS.forEach((need, idx) => { if (Number(xp || 0) >= need) level = idx; });
    return level;
  }

  function activeCrownTrial() {
    ensureV12Profile();
    const active = profile.v12.crownTrials.active;
    return V12_CROWN_TRIALS.find((trial) => trial.id === active && !profile.v12.crownTrials.completed[trial.id]) || V12_CROWN_TRIALS.find((trial) => !profile.v12.crownTrials.completed[trial.id]) || null;
  }

  function selectCrownTrial(id) {
    ensureV12Profile();
    const trial = V12_CROWN_TRIALS.find((item) => item.id === id);
    if (!trial || profile.v12.crownTrials.completed[id]) return;
    profile.v12.crownTrials.active = id;
    saveProfile();
    showCrownTrialsOverlay();
  }

  function weeklyCuratorRows() {
    ensureV12Profile();
    const rows = [];
    Object.entries(V12_CURATOR_DROPS).forEach(([type, items]) => {
      Object.entries(items).forEach(([id, item]) => {
        const owned = Boolean(profile.cosmetics?.owned?.[type]?.[id]);
        rows.push(`<button class="profile-row ${owned ? 'done' : ''}" data-curator-type="${type}" data-curator-id="${id}" type="button"><b>${owned ? '✓' : '☐'} ${item.name}</b><span>${item.desc} ${owned ? 'Owned.' : `Cost ${item.cost} shards.`}</span></button>`);
      });
    });
    return rows.join('');
  }

  function buyCuratorDrop(type, id) {
    ensureV12Profile();
    const item = V12_CURATOR_DROPS[type]?.[id];
    if (!item) return;
    profile.cosmetics.owned[type] = profile.cosmetics.owned[type] || {};
    if (profile.cosmetics.owned[type][id]) {
      profile.cosmetics.equipped[type === 'themes' ? 'theme' : type === 'boards' ? 'board' : 'trail'] = id;
      saveProfile();
      showCuratorOverlay();
      return;
    }
    if (profile.shards < item.cost) return showToast(`Need ${item.cost - profile.shards} more shards`);
    profile.shards -= item.cost;
    profile.cosmetics.owned[type][id] = true;
    profile.v12.curator.purchased[`${type}:${id}`] = todayKey();
    profile.v12.curator.purchasedCount = Object.keys(profile.v12.curator.purchased).length;
    unlock('curator_first');
    saveProfile();
    showCuratorOverlay();
  }

  function applyV12RunSystems() {
    applyV11RunSystems();
    ensureV12Profile();
    const moodId = profile.settings?.mood || 'alpha';
    const mastery = profile.v12.moodMastery[moodId] || { xp: 0, level: 0 };
    const level = moodMasteryLevel(mastery.xp);
    state.v12CrownTrial = activeCrownTrial();
    state.runPerks.scoreMult *= 1 + Math.min(0.025, level * 0.005);
    state.runPerks.shardMult *= 1 + Math.min(0.03, level * 0.006);
    if (moodId === 'theta' || moodId === 'delta' || moodId === 'spa') state.runPerks.gravityMult *= 1 + Math.min(0.035, level * 0.007);
    if ((profile.ritual?.streak || 0) >= 7 && state.mode === 'daily') state.shield = Math.min(3, state.shield + 1);
  }

  function evaluateV12AfterRun() {
    ensureV12Profile();
    const moodId = profile.settings?.mood || 'alpha';
    const mood = profile.v12.moodMastery[moodId] || { xp: 0, runs: 0, level: 0 };
    const gainedMoodXP = Math.max(20, Math.floor(state.lines * 9 + state.level * 8 + state.stats.surges * 20));
    mood.xp = Number(mood.xp || 0) + gainedMoodXP;
    mood.runs = Number(mood.runs || 0) + 1;
    mood.level = moodMasteryLevel(mood.xp);
    profile.v12.moodMastery[moodId] = mood;
    if (mood.level >= 3) unlock('mood_master_3');

    const trial = activeCrownTrial();
    let trialReward = { trial, won: false, xp: 0, shards: 0 };
    if (trial && trial.check(state)) {
      profile.v12.crownTrials.completed[trial.id] = todayKey();
      profile.v12.crownTrials.completedCount = Object.keys(profile.v12.crownTrials.completed).length;
      unlock('crown_trial_first');
      if (profile.v12.crownTrials.completedCount >= 5) unlock('crown_trial_5');
      trialReward = { trial, won: true, xp: trial.xp, shards: trial.shards };
    }

    const receipt = {
      at: new Date().toISOString(),
      mode: state.mode,
      mood: moodId,
      score: Math.floor(state.score),
      lines: Math.floor(state.lines),
      level: Math.floor(state.level),
      surges: Math.floor(state.stats.surges),
      trial: trialReward.won ? trial.name : '',
    };
    profile.v12.receipts.runs.unshift(receipt);
    profile.v12.receipts.runs = profile.v12.receipts.runs.slice(0, 20);
    profile.v12.receipts.bestShare = `${MODES[state.mode]?.label || state.mode} · ${formatNumber(state.score)} pts · ${state.lines} lines · ${AUDIO_MOODS[moodId]?.label || moodId}`;
    if (profile.v12.receipts.runs.length >= 10) unlock('receipt_10');
    profile.v12.founderScore = Math.floor(Number(profile.v12.founderScore || 0) + Math.max(1, state.score / 1000) + state.lines + state.stats.surges * 3 + (trialReward.won ? 34 : 0));
    if (profile.v12.founderScore >= 1300) unlock('founder_score');
    return { mood, gainedMoodXP, trialReward, founderScore: profile.v12.founderScore };
  }


  function coachAdvice() {
    if (!state) return 'Start with Zen Flow, clear lines calmly, then move into Endurance.';
    if (state.lines < 8) return 'Your next improvement is stack cleanliness. Use Zen Flow and protect one side well for line clears.';
    if (state.stats.holds < 2) return 'Use Hold more. Saving an I, T, or shield piece increases run control on phone.';
    if (state.stats.surges < 1) return 'Bank Rift to 100%, then trigger it before a multi-clear for a satisfying score spike.';
    if (state.bestCombo < 3) return 'Build flatter surfaces. Small combo chains turn ordinary clears into retention-grade dopamine.';
    return 'You are ready for Rival Runs, Run Lab modifiers, and weekly league pushes.';
  }

  const profile = loadProfile();
  ensureV12Profile();

  function defaultMission(rng, level) {
    const pool = [
      { type: 'lines', target: 4 + Math.floor(level / 2), label: 'Clear {target} total lines' },
      { type: 'multi', target: 2, label: 'Clear 2+ lines in one drop' },
      { type: 'hold', target: 2, label: 'Use Hold {target} times' },
      { type: 'slam', target: 3, label: 'Slam-drop {target} pieces' },
      { type: 'combo', target: Math.min(3 + Math.floor(level / 4), 7), label: 'Reach combo {target}' },
      { type: 'core', target: 2, label: 'Trigger {target} power cores' },
      { type: 'surge', target: 1, label: 'Activate a Rift Surge' },
    ];
    const item = pool[Math.floor(rng() * pool.length)];
    return { ...item, progress: 0, text: item.label.replace('{target}', item.target) };
  }

  function makeState(mode) {
    const cfg = MODES[mode] || MODES.endurance;
    const daily = cfg.daily ? dailyInfo() : null;
    const seed = daily ? daily.seed : Math.floor((Date.now() % 2147483647) + Math.random() * 999999);
    const rng = daily ? mulberry32(seed) : Math.random;
    const rank = rankForXP(profile.xp);
    const starterShield = rank >= 4 ? 1 : 0;
    return {
      grid: emptyGrid(),
      queue: [],
      bag: [],
      piece: null,
      hold: null,
      canHold: true,
      mode,
      cfg,
      daily,
      seed,
      rng,
      score: 0,
      best: Number(profile.bestByMode[mode] || 0),
      lines: 0,
      level: cfg.startLevel,
      combo: 0,
      bestCombo: 0,
      riftCharge: rank >= 6 ? 18 : 0,
      riftActive: false,
      riftTimer: 0,
      chronoTimer: 0,
      timeLeft: cfg.timeLimit,
      startedAt: 0,
      shield: starterShield,
      started: false,
      paused: false,
      gameOver: false,
      pendingChoice: false,
      muted: Boolean(profile.settings?.muted),
      rival: activeRival(),
      campaignNode: activeCampaignNode(),
      riftEvent: activeRiftEvent(),
      focusCard: activeFocusCard(),
      drill: activeDrill(),
      pulseGoal: makePulseGoal(rng),
      pulseProgress: {},
      runPerks: {
        coreChanceBonus: (rank >= 3 ? 0.015 : 0) + prestigeLevel() * 0.01,
        scoreMult: 1 + prestigeLevel() * 0.03,
        gravityMult: Math.max(0.82, 1 - prestigeLevel() * 0.012),
        riftMult: 1,
        missionBonus: 1,
        scarControl: 0,
        shardMult: 1,
        xpMult: 1,
      },
      stats: {
        holds: 0,
        slams: 0,
        surges: 0,
        cores: 0,
        missions: 0,
        pieces: 0,
        linesBeforeHold: 0,
        achievementsThisRun: 0,
        zenRescues: 0,
        questCompletions: 0,
        breathPrompts: 0,
      },
      mission: null,
      floaters: [],
      particles: [],
      garbageTimer: 0,
      levelChoiceGiven: cfg.startLevel,
      shake: 0,
      awarded: false,
    };
  }

  let state = makeState(selectedMode);

  function activeMood() {
    return AUDIO_MOODS[profile.settings?.mood] || AUDIO_MOODS.alpha;
  }

  function renderProfileChips() {
    accrueSanctuary();
    unlockLicenseItems();
    const rank = rankForXP(profile.xp);
    const mood = activeMood();
    ui.rankChip.textContent = rank;
    if (ui.moodChip) ui.moodChip.textContent = mood.label.split(' ')[0];
    if (ui.moodSideText) ui.moodSideText.textContent = mood.label;
    if (ui.beatSideText) ui.beatSideText.textContent = mood.beat;
    const equipped = profile.cosmetics?.equipped || {};
    const theme = COSMETICS.themes[equipped.theme || 'default'] || COSMETICS.themes.default;
    const board = COSMETICS.boards[equipped.board || 'glass'] || COSMETICS.boards.glass;
    const trail = COSMETICS.trails[equipped.trail || 'spark'] || COSMETICS.trails.spark;
    document.body.dataset.theme = theme.className;
    document.body.dataset.board = board.className;
    document.body.dataset.trail = trail.className;
    document.body.classList.toggle('reduce-motion', Boolean(profile.settings?.reduceMotion));
    document.body.classList.toggle('comfort-assist', Boolean(profile.settings?.comfortAssist));
    document.body.classList.toggle('high-contrast', Boolean(profile.settings?.highContrast));
    document.body.classList.toggle('left-handed', Boolean(profile.settings?.leftHanded));
    document.body.classList.toggle('large-controls', Boolean(profile.settings?.largeControls));
  }

  function formatNumber(n) {
    return Math.floor(n).toLocaleString();
  }

  function haptic(pattern = 12) {
    if (profile.settings?.haptics === false) return;
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  function showToast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1450);
  }

  function sound(type = 'move') {
    if (state.muted || profile.settings?.muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const tones = {
        move: [220, 0.018, 'triangle', 0.032],
        rotate: [420, 0.04, 'sine', 0.04],
        soft: [160, 0.018, 'square', 0.024],
        lock: [90, 0.05, 'sawtooth', 0.04],
        clear: [630, 0.13, 'sine', 0.055],
        core: [870, 0.16, 'triangle', 0.06],
        surge: [1080, 0.22, 'triangle', 0.07],
        fail: [58, 0.3, 'sawtooth', 0.06],
        reward: [760, 0.18, 'sine', 0.05],
      };
      const [freq, dur, wave, vol] = tones[type] || tones.move;
      const sfxVol = Number(profile.settings?.sfxVolume ?? 0.78);
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * sfxVol), now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    } catch (_) {}
  }

  function ensureAmbientAudio() {
    if (!ambientAudio) {
      ambientAudio = new Audio();
      ambientAudio.loop = true;
      ambientAudio.preload = 'auto';
      ambientAudio.crossOrigin = 'anonymous';
    }
    return ambientAudio;
  }

  function applyMoodAudio() {
    const mood = activeMood();
    const audio = ensureAmbientAudio();
    const shouldPlay = !profile.settings?.muted && Number(profile.settings?.musicVolume ?? 0.44) > 0;
    const src = new URL(mood.src, window.location.href).href;
    if (audio.src !== src) audio.src = src;
    audio.volume = Math.max(0, Math.min(1, Number(profile.settings?.musicVolume ?? 0.44)));
    if (!shouldPlay) {
      audio.pause();
      return;
    }
    audio.play().catch(() => {
      showToast('Tap Start or Mood to unlock audio');
    });
  }

  function stopMoodAudio() {
    if (ambientAudio) ambientAudio.pause();
  }

  function setMood(id) {
    if (!AUDIO_MOODS[id]) return;
    profile.settings.mood = id;
    unlock('mood_set');
    saveProfile();
    renderProfileChips();
    applyMoodAudio();
    showToast(`Mood set: ${AUDIO_MOODS[id].label}`);
  }

  function updateRitualProgress() {
    if (state.mode !== 'daily') return;
    const today = todayKey();
    if (profile.ritual.lastDay === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    profile.ritual.streak = profile.ritual.lastDay === yesterday ? profile.ritual.streak + 1 : 1;
    profile.ritual.bestStreak = Math.max(profile.ritual.bestStreak || 0, profile.ritual.streak);
    profile.ritual.lastDay = today;
    profile.ritual.daysCompleted = (profile.ritual.daysCompleted || 0) + 1;
    if (profile.ritual.daysCompleted >= 3) unlock('ritual_3');
  }

  function rand(min, max) {
    return min + state.rng() * (max - min);
  }

  function makeBag() {
    const pool = state.level >= 5 || state.mode === 'onslaught' ? RIFT_POOL : CLASSIC_POOL;
    const bag = [...pool];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(state.rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  function refillQueue() {
    while (state.queue.length < 6) {
      if (!state.bag.length) state.bag = makeBag();
      state.queue.push(state.bag.shift());
    }
  }

  function occupiedCells(shape) {
    const cells = [];
    shape.forEach((row, y) => row.forEach((v, x) => { if (v) cells.push({ x, y }); }));
    return cells;
  }

  function createPiece(type) {
    markCodex(`piece_${type}`, 1);
    const shape = SHAPES[type].map((row) => [...row]);
    const rank = rankForXP(profile.xp);
    const dailyMod = state.daily?.mod || {};
    const baseChance = Math.min(0.08 + state.level * 0.008 + (rank >= 8 ? 0.015 : 0), 0.23);
    const chance = Math.min(baseChance + state.cfg.coreBonus + state.runPerks.coreChanceBonus + (dailyMod.coreBonus || 0), 0.46);
    const coreTypes = ['Q', 'B', 'C', 'SLD'];
    const hasPower = state.rng() < chance;
    const cells = occupiedCells(shape);
    const powerAt = hasPower ? cells[Math.floor(state.rng() * cells.length)] : null;
    const power = hasPower ? coreTypes[Math.floor(state.rng() * coreTypes.length)] : null;
    return {
      type,
      shape,
      power,
      powerAt,
      x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
      y: 0,
    };
  }

  function spawnNext() {
    refillQueue();
    state.piece = createPiece(state.queue.shift());
    state.canHold = true;
    if (collides(state.piece)) handleTopOut();
  }

  function startRun(mode = selectedMode) {
    const rival = activeRival();
    const challenge = activeChallenge();
    if (rival) mode = rival.mode;
    if (challenge) mode = challenge.mode;
    selectedMode = mode;
    localStorage.setItem('nrb_selected_mode', mode);
    state = makeState(mode);
    applyV12RunSystems();
    markCodex(`mode_${mode}`, 1);
    state.mission = defaultMission(state.rng, state.level);
    refillQueue();
    spawnNext();
    state.started = true;
    state.startedAt = performance.now();
    state.paused = false;
    state.gameOver = false;
    state.pendingChoice = false;
    accumulator = 0;
    lastTime = performance.now();
    ui.overlay.classList.remove('active');
    document.body.classList.add('is-playing');
    updateUI();
    applyMoodAudio();
    sound('surge');
    haptic([20, 30, 20]);
  }

  function collides(piece, dx = 0, dy = 0, testShape = piece.shape) {
    for (let y = 0; y < testShape.length; y += 1) {
      for (let x = 0; x < testShape[y].length; x += 1) {
        if (!testShape[y][x]) continue;
        const bx = piece.x + x + dx;
        const by = piece.y + y + dy;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && state.grid[by][bx]) return true;
      }
    }
    return false;
  }

  function move(dx) {
    if (!canAct()) return false;
    const effectiveDx = dx;
    if (!collides(state.piece, effectiveDx, 0)) {
      state.piece.x += effectiveDx;
      sound('move');
      return true;
    }
    return false;
  }

  function rotateMatrix(shape) {
    return shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
  }

  function rotate() {
    if (!canAct()) return;
    const rotated = rotateMatrix(state.piece.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(state.piece, kick, 0, rotated)) {
        state.piece.shape = rotated;
        state.piece.x += kick;
        if (state.piece.powerAt) {
          const cells = occupiedCells(rotated);
          state.piece.powerAt = cells[Math.min(cells.length - 1, Math.floor(state.rng() * cells.length))];
        }
        sound('rotate');
        haptic(8);
        return;
      }
    }
  }

  function softDrop() {
    if (!canAct()) return;
    if (!collides(state.piece, 0, 1)) {
      state.piece.y += 1;
      state.score += state.riftActive ? 2 : 1;
      sound('soft');
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!canAct()) return;
    let dropped = 0;
    while (!collides(state.piece, 0, 1)) {
      state.piece.y += 1;
      dropped += 1;
    }
    state.score += dropped * (state.riftActive ? 4 : 2);
    state.stats.slams += 1;
    progressMission('slam', 1);
    progressPulse('slam', 1);
    progressQuest('slam', 1);
    haptic(20);
    lockPiece();
  }

  function holdPiece() {
    if (!canAct() || !state.canHold) return;
    const currentType = state.piece.type;
    if (!state.hold) {
      state.hold = currentType;
      spawnNext();
    } else {
      const swap = state.hold;
      state.hold = currentType;
      state.piece = createPiece(swap);
      if (collides(state.piece)) handleTopOut();
    }
    state.canHold = false;
    state.stats.holds += 1;
    progressMission('hold', 1);
    progressPulse('hold', 1);
    progressQuest('hold', 1);
    sound('rotate');
    haptic(14);
  }

  function canAct() {
    return state.started && !state.paused && !state.gameOver && !state.pendingChoice && state.piece;
  }

  function powerForCell(piece, x, y) {
    if (!piece.power || !piece.powerAt) return null;
    return piece.powerAt.x === x && piece.powerAt.y === y ? piece.power : null;
  }

  function lockPiece() {
    if (!state.piece || state.gameOver) return;
    const p = state.piece;
    for (let y = 0; y < p.shape.length; y += 1) {
      for (let x = 0; x < p.shape[y].length; x += 1) {
        if (!p.shape[y][x]) continue;
        const bx = p.x + x;
        const by = p.y + y;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          state.grid[by][bx] = { type: p.type, power: powerForCell(p, x, y) };
        }
      }
    }
    state.stats.pieces += 1;
    progressPulse('piece', 1);
    sound('lock');
    resolveLineClears();
    if (!state.gameOver) spawnNext();
  }

  function resolveLineClears() {
    const fullRows = [];
    for (let y = 0; y < ROWS; y += 1) {
      if (state.grid[y].every(Boolean)) fullRows.push(y);
    }

    if (!fullRows.length) {
      state.combo = 0;
      return;
    }

    const powerCells = [];
    fullRows.forEach((row) => {
      state.grid[row].forEach((cell, x) => {
        if (cell?.power) powerCells.push({ row, x, power: cell.power });
      });
    });

    powerCells.forEach((cell) => activateCore(cell.power, cell.row, cell.x));

    const beforeLines = state.lines;
    const remaining = state.grid.filter((_, idx) => !fullRows.includes(idx));
    while (remaining.length < ROWS) remaining.unshift(Array.from({ length: COLS }, () => null));
    state.grid = remaining;

    const count = fullRows.length;
    state.lines += count;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);

    const lineTable = [0, 120, 360, 640, 1050];
    const riftMult = state.riftActive ? 1.8 : 1;
    const chronoBonus = state.chronoTimer > 0 ? 1.08 : 1;
    const gained = Math.floor((lineTable[count] || count * 360) * state.level * riftMult * chronoBonus * state.cfg.scoreMult * state.runPerks.scoreMult);
    const comboBonus = Math.floor(Math.max(0, state.combo - 1) * 70 * state.level * state.runPerks.scoreMult);
    state.score += gained + comboBonus;

    const dailyMod = state.daily?.mod || {};
    const riftGain = (count * 13 + Math.max(0, state.combo - 1) * 4 + powerCells.length * 8) * (dailyMod.riftMult || 1) * state.runPerks.riftMult;
    state.riftCharge = Math.min(100, state.riftCharge + riftGain);

    addFloater(`+${formatNumber(gained + comboBonus)}`, BOARD_W / 2, 140 + rand(-30, 40), count >= 4 ? '#ffd663' : '#35f5ff');
    spawnLineParticles(fullRows, count >= 4 ? '#ffd663' : '#35f5ff');
    sound('clear');
    haptic(count >= 4 ? [22, 40, 22] : 18);

    progressMission('lines', count);
    progressPulse('lines', count);
    progressQuest('lines', count);
    if (state.mode === 'zen') progressQuest('zenLines', count);
    if (count >= 2) progressMission('multi', count);
    progressMission('combo', state.combo, true);
    progressPulse('combo', state.combo, true);

    if (count > 0) unlock('first_line');
    if (state.combo >= 5) unlock('combo_5');

    const oldLevel = state.level;
    state.level = Math.max(state.cfg.startLevel, state.cfg.startLevel + Math.floor(state.lines / 8));
    if (state.level >= 10) unlock('level_10');
    if (state.mode === 'onslaught' && state.lines >= 20) unlock('onslaught_20');
    if (state.mode === 'zen' && state.lines >= 20) unlock('zen_20');

    if (state.level > oldLevel) {
      state.score += 300 * state.level;
      addFloater(`LEVEL ${state.level}`, BOARD_W / 2, 104, '#ff4def');
      maybeOpenAnomalyDraft();
    }

    if (state.lines - beforeLines >= 4) state.riftCharge = Math.min(100, state.riftCharge + 16);
  }

  function activateCore(power, row, x) {
    markCodex(`core_${power}`, 1);
    state.stats.cores += 1;
    progressMission('core', 1);
    progressPulse('core', 1);
    progressQuest('core', 1);
    if (state.stats.cores >= 10) unlock('core_10');
    sound('core');
    haptic([10, 20, 10]);

    if (power === 'Q') {
      for (let yy = row - 1; yy <= row + 1; yy += 1) {
        for (let xx = x - 1; xx <= x + 1; xx += 1) {
          if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS) {
            state.grid[yy][xx] = null;
            burstAt(xx, yy, '#65f7ff', 4);
          }
        }
      }
      state.score += 180 * state.level;
      addFloater('QUANTUM BURST', x * CELL, (row - HIDDEN_ROWS) * CELL, '#65f7ff');
    }

    if (power === 'B') {
      const target = Math.max(0, row - 1);
      for (let xx = 0; xx < COLS; xx += 1) {
        if (state.grid[target][xx]) burstAt(xx, target, '#ffbe2d', 3);
        state.grid[target][xx] = null;
      }
      state.score += 220 * state.level;
      addFloater('BLADE ROW', BOARD_W / 2, Math.max(24, (target - HIDDEN_ROWS) * CELL), '#ffd663');
    }

    if (power === 'C') {
      state.chronoTimer = Math.min(13000, state.chronoTimer + 6200);
      state.score += 130 * state.level;
      addFloater('CHRONO SLOW', BOARD_W / 2, 180, '#c69cff');
    }

    if (power === 'SLD') {
      state.shield = Math.min(3, state.shield + 1);
      state.score += 120 * state.level;
      addFloater('+SHIELD', BOARD_W / 2, 220, '#7cffb1');
    }
  }

  function activateRift() {
    if (!state.started || state.paused || state.gameOver || state.pendingChoice) return;
    if (state.riftCharge < 100 || state.riftActive) {
      showToast(state.riftActive ? 'Rift already burning' : 'Charge rift to 100%');
      return;
    }
    state.riftCharge = 0;
    state.riftActive = true;
    state.riftTimer = 12500;
    state.stats.surges += 1;
    profile.totalSurges += 1;
    state.score += 500 * state.level;
    progressMission('surge', 1);
    progressPulse('surge', 1);
    progressQuest('surge', 1);
    unlock('first_rift');
    sound('surge');
    haptic([30, 40, 30]);
    showToast('RIFT SURGE: 1.8x clear value');
    for (let i = 0; i < 32; i += 1) {
      state.particles.push({ x: rand(10, BOARD_W - 10), y: rand(20, BOARD_H - 20), vx: rand(-0.08, 0.08), vy: rand(-0.18, -0.02), life: rand(500, 1000), color: i % 2 ? '#ff4def' : '#35f5ff', size: rand(2, 5) });
    }
  }

  function progressMission(type, amount = 1, setMax = false) {
    if (!state.mission || state.gameOver) return;
    if (state.mission.type !== type) return;
    if (setMax) state.mission.progress = Math.max(state.mission.progress, amount);
    else state.mission.progress += amount;
    if (state.mission.progress >= state.mission.target) completeMission();
  }

  function completeMission() {
    const reward = Math.floor((650 + state.level * 135) * state.runPerks.missionBonus);
    state.score += reward;
    state.riftCharge = Math.min(100, state.riftCharge + 22);
    state.stats.missions += 1;
    progressQuest('mission', 1);
    addFloater(`MISSION +${reward}`, BOARD_W / 2, 92, '#ffd663');
    showToast(`Mission complete: +${reward}`);
    sound('reward');
    state.mission = defaultMission(state.rng, state.level);
  }

  function progressQuest(type, amount = 1) {
    if (!profile.quests) profile.quests = { progress: {}, completed: {}, completedCount: 0 };
    if (!profile.quests.progress) profile.quests.progress = {};
    if (!profile.quests.completed) profile.quests.completed = {};
    getActiveQuests().forEach((quest) => {
      if (quest.type !== type || profile.quests.completed[quest.key]) return;
      const current = Number(profile.quests.progress[quest.key] || 0);
      const next = Math.min(quest.target, current + amount);
      profile.quests.progress[quest.key] = next;
      if (next >= quest.target) {
        profile.quests.completed[quest.key] = Date.now();
        profile.quests.completedCount = Number(profile.quests.completedCount || 0) + 1;
        profile.xp += quest.xp;
        profile.shards += quest.shards;
        state.stats.questCompletions += 1;
        showToast(`${quest.scope} contract complete: +${quest.shards} shards`);
        sound('reward');
        if (profile.quests.completedCount >= 13) unlock('quest_13');
        progressQuest('quest', 1);
      }
    });
    saveProfile();
  }

  function ownedCosmeticCount() {
    const owned = profile.cosmetics?.owned || {};
    return ['themes', 'boards', 'trails'].reduce((total, type) => total + Object.values(owned[type] || {}).filter(Boolean).length, 0);
  }

  function buyCosmetic(type, id) {
    const item = COSMETICS[type]?.[id];
    if (!item) return;
    if (!profile.cosmetics) profile.cosmetics = { owned: { themes: { default: true }, boards: { glass: true }, trails: { spark: true } }, equipped: { theme: 'default', board: 'glass', trail: 'spark' } };
    if (!profile.cosmetics.owned[type]) profile.cosmetics.owned[type] = {};
    if (profile.cosmetics.owned[type][id]) return equipCosmetic(type, id);
    if (profile.shards < item.cost) {
      showToast(`Need ${item.cost - profile.shards} more shards`);
      return;
    }
    profile.shards -= item.cost;
    profile.cosmetics.owned[type][id] = true;
    if (ownedCosmeticCount() >= 3) unlock('collector_3');
    saveProfile();
    equipCosmetic(type, id);
  }

  function equipCosmetic(type, id) {
    if (!profile.cosmetics?.owned?.[type]?.[id]) return;
    const map = { themes: 'theme', boards: 'board', trails: 'trail' };
    profile.cosmetics.equipped[map[type]] = id;
    saveProfile();
    showToast(`Equipped ${COSMETICS[type][id].name}`);
    showSeasonOverlay();
  }

  function exportProfile() {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
    navigator.clipboard?.writeText(payload).then(() => showToast('Backup copied to clipboard')).catch(() => prompt('Copy your backup code:', payload));
    unlock('export_save');
  }

  function importProfile() {
    const payload = prompt('Paste Neon Rift backup code');
    if (!payload) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(payload.trim()))));
      parsed.version = 13;
      localStorage.setItem('nrb_profile_v13', JSON.stringify(parsed));
      localStorage.setItem('nrb_profile_v12', JSON.stringify(parsed));
      location.reload();
    } catch (_) {
      showToast('Backup import failed');
    }
  }

  function unlock(id) {
    if (profile.achievements[id]) return;
    const item = ACHIEVEMENTS[id];
    if (!item) return;
    profile.achievements[id] = Date.now();
    profile.shards += item[2];
    state.stats.achievementsThisRun += 1;
    saveProfile();
    showToast(`Achievement: ${item[0]} +${item[2]} shards`);
  }

  function handleTopOut() {
    if (state.cfg.zen) {
      state.stats.zenRescues += 1;
      for (let y = 0; y < 9; y += 1) state.grid[y] = Array.from({ length: COLS }, () => null);
      state.piece.y = 0;
      state.piece.x = Math.floor(COLS / 2) - Math.ceil(state.piece.shape[0].length / 2);
      state.score = Math.max(0, state.score - 250 * state.level);
      state.riftCharge = Math.min(100, state.riftCharge + 12);
      showToast('Zen assist cleared the breach');
      haptic(10);
      return;
    }
    if (state.shield > 0) {
      state.shield -= 1;
      for (let y = 0; y < Math.min(6, ROWS); y += 1) {
        state.grid[y] = Array.from({ length: COLS }, () => null);
      }
      for (let y = 6; y < 10; y += 1) {
        state.grid[y] = state.grid[y].map((cell, idx) => (idx % 2 === 0 ? null : cell));
      }
      state.piece.y = 0;
      state.piece.x = Math.floor(COLS / 2) - Math.ceil(state.piece.shape[0].length / 2);
      unlock('shield_save');
      showToast('Shield burned: top breach prevented');
      sound('reward');
      haptic([20, 30, 20]);
      return;
    }
    endRun('Signal collapsed');
  }

  function endRun(reason = 'Run complete') {
    if (state.gameOver || state.awarded) return;
    state.gameOver = true;
    state.paused = false;
    state.awarded = true;
    document.body.classList.remove('is-playing');

    const oldBest = Number(profile.bestByMode[state.mode] || 0);
    if (state.score > oldBest) profile.bestByMode[state.mode] = Math.floor(state.score);
    if (state.mode === 'daily') {
      updateRitualProgress();
      unlock('daily_play');
      progressQuest('dailyRun', 1);
    }
    progressQuest('run', 1);
    if (!profile.settings?.muted && Number(profile.settings?.musicVolume ?? 0.44) > 0) {
      profile.ritual.moodRuns = (profile.ritual.moodRuns || 0) + 1;
      unlock('focus_runner');
      progressQuest('moodRun', 1);
    }
    if (state.score >= 25000) unlock('score_25k');
    const node = state.campaignNode;
    let campaignWin = false;
    let campaignXP = 0;
    let campaignShards = 0;
    if (node && !profile.campaign.completed[node.id] && state.mode === node.mode && state.score >= node.targetScore && state.lines >= node.targetLines) {
      profile.campaign.completed[node.id] = todayKey();
      profile.campaign.completedCount = Object.keys(profile.campaign.completed).length;
      campaignWin = true;
      campaignXP = node.rewardXP;
      campaignShards = node.rewardShards;
      if (profile.campaign.completedCount >= 3) unlock('campaign_3');
      if (profile.campaign.completedCount >= CAMPAIGN_NODES.length) unlock('campaign_clear');
    }
    const elapsedMs = Math.max(60000, performance.now() - Number(state.startedAt || performance.now()));
    const runMinutes = Math.max(1, Math.round(elapsedMs / 60000));
    if (state.mode === 'zen' || !profile.settings?.muted) {
      profile.focus.minutes = Number(profile.focus?.minutes || 0) + runMinutes;
      profile.focus.sessions = Number(profile.focus?.sessions || 0) + 1;
      profile.focus.lastSession = todayKey();
      if (profile.focus.minutes >= 30) unlock('focus_30');
    }
    const rival = state.rival;
    let rivalWin = false;
    let rivalXP = 0;
    let rivalShards = 0;
    if (rival && state.score >= rivalryScoreTarget(rival) && !profile.rivals.beaten[rival.id]) {
      profile.rivals.beaten[rival.id] = todayKey();
      profile.rivals.beatenCount = Object.keys(profile.rivals.beaten).length;
      rivalWin = true;
      rivalXP = rival.rewardXP;
      rivalShards = rival.rewardShards;
      unlock('rival_first');
      if (profile.rivals.beatenCount >= 5) unlock('rival_5');
    }

    const focusCard = state.focusCard || activeFocusCard();
    let cardWin = false;
    let cardXP = 0;
    let cardShards = 0;
    if (focusCard && focusCardCompleted(focusCard)) {
      if (!profile.focusCards) profile.focusCards = { selected: focusCard.id, completed: {}, completedCount: 0 };
      if (!profile.focusCards.completed) profile.focusCards.completed = {};
      const firstClear = !profile.focusCards.completed[focusCard.id];
      profile.focusCards.completed[focusCard.id] = todayKey();
      profile.focusCards.completedCount = Number(profile.focusCards.completedCount || 0) + 1;
      cardWin = true;
      cardXP = focusCard.rewardXP;
      cardShards = focusCard.rewardShards;
      if (firstClear) unlock('focus_card_first');
      if (profile.focusCards.completedCount >= 13) unlock('focus_card_13');
    }
    if (!profile.liveOps) profile.liveOps = { lastChestDay: '', chestStreak: 0, dailyClaims: 0, weatherRuns: 0 };
    profile.liveOps.weatherRuns = Number(profile.liveOps.weatherRuns || 0) + 1;
    if (profile.liveOps.weatherRuns >= 5) unlock('weather_5');
    const drillReward = evaluateDrillAfterRun();
    const challengeReward = evaluateChallengeAfterRun();
    const protocolReward = evaluateProtocolAfterRun();
    const chronicleReward = evaluateChronicleAfterRun();
    const companionReward = awardCompanionAfterRun();
    const v12Reward = evaluateV12AfterRun();
    const v13Reward = evaluateV13AfterRun(runMinutes);
    updateLeagueAfterRun();
    unlockLicenseItems();

    const prestigeMult = 1 + prestigeLevel() * 0.13;
    let xpGain = Math.floor((Math.floor(state.score / 185) + state.lines * 5 + state.stats.surges * 28 + state.stats.missions * 34 + state.bestCombo * 3 + rivalXP + campaignXP + cardXP + drillReward.xp + challengeReward.xp + protocolReward.xp + chronicleReward.xp) * prestigeMult);
    let shardGain = Math.floor(state.score / 2600) + state.stats.missions * 2 + state.stats.achievementsThisRun + rivalShards + campaignShards + cardShards + drillReward.shards + challengeReward.shards + protocolReward.shards + chronicleReward.shards + v12Reward.trialReward.shards;
    const relic = state.relic || activeRelic();
    const modifier = state.runModifier || activeRunModifier();
    xpGain = Math.floor(xpGain * Number(relic?.xpMult || 1) * Number(state.runPerks?.xpMult || 1));
    shardGain = Math.floor(shardGain * Number(relic?.shardMult || 1) * Number(modifier?.shardMult || 1) * Number(state.runPerks?.shardMult || 1));
    if (modifier && modifier.id !== 'none') {
      unlock('modifier_run');
      profile.runLab.completions = Number(profile.runLab?.completions || 0) + 1;
      if (profile.runLab.completions >= 13) unlock('modifier_master');
    }
    updateMasteryAfterRun(xpGain);
    if ((profile.ritual?.streak || 0) >= 7) unlock('devotion_7');
    const oldRank = rankForXP(profile.xp);
    profile.xp += xpGain;
    profile.shards += shardGain;
    if (profile.shards >= 250) unlock('shard_250');
    profile.runs += 1;
    profile.totalLines += state.lines;
    profile.totalSurges += state.stats.surges;
    const newRank = rankForXP(profile.xp);
    const elapsedSeconds = Math.max(1, Math.round((performance.now() - Number(state.startedAt || performance.now())) / 1000));
    recordRunAnalytics({ mode: state.mode, score: state.score, lines: state.lines, level: state.level, combo: state.bestCombo, duration: elapsedSeconds, xp: xpGain, shards: shardGain, challenge: challengeReward.won ? challengeReward.challenge?.name : '', protocol: protocolReward.won ? protocolReward.step?.title : '', chronicle: chronicleReward.won ? chronicleReward.arc?.title : '', companion: companionReward.companion?.name || '', v12: v12Reward.trialReward.won ? v12Reward.trialReward.trial?.name : '', v13: v13Reward.qualityGain ? `Quality +${v13Reward.qualityGain}` : '' });
    saveProfile();

    sound('fail');
    haptic([30, 80, 30]);
    showGameOver(reason, { xpGain, shardGain, oldRank, newRank, newBest: state.score > oldBest, rivalWin, campaignWin, cardWin, focusCard, drillReward, challengeReward, protocolReward, chronicleReward, companionReward, v12Reward, v13Reward });
  }

  function getGravityDelay() {
    const dailyMod = state.daily?.mod || {};
    let delay = 780 - (state.level - 1) * 46;
    delay *= state.cfg.gravityMult * state.runPerks.gravityMult * (dailyMod.gravityMult || 1);
    if (state.riftActive) delay *= 0.56;
    if (state.chronoTimer > 0) delay *= 1.8;
    return Math.max(66, delay);
  }

  function addGarbageRow() {
    const hole = Math.floor(state.rng() * COLS);
    state.grid.shift();
    state.grid.push(Array.from({ length: COLS }, (_, x) => (x === hole || state.rng() < state.runPerks.scarControl ? null : { type: 'G', power: null })));
    state.shake = 260;
    ui.boardStage.classList.add('shake');
    setTimeout(() => ui.boardStage.classList.remove('shake'), 260);
    showToast('Rift scar rising');
  }

  function maybeOpenAnomalyDraft() {
    if (state.level < 3) return;
    if (state.level - state.levelChoiceGiven < 3) return;
    state.levelChoiceGiven = state.level;
    state.pendingChoice = true;
    state.paused = true;
    const choices = pickAnomalyChoices();
    showChoiceOverlay(choices);
  }

  function pickAnomalyChoices() {
    const pool = [
      { name: 'Core Bloom', desc: '+8% power-core chance for this run.', apply: () => { state.runPerks.coreChanceBonus += 0.08; } },
      { name: 'Rift Bank', desc: '+35% rift charge instantly.', apply: () => { state.riftCharge = Math.min(100, state.riftCharge + 35); } },
      { name: 'Score Fever', desc: '+18% score, +5% gravity pressure.', apply: () => { state.runPerks.scoreMult *= 1.18; state.runPerks.gravityMult *= 0.95; } },
      { name: 'Chrono Mercy', desc: 'Slow time for 12 seconds now.', apply: () => { state.chronoTimer = Math.max(state.chronoTimer, 12000); } },
      { name: 'Shield Protocol', desc: '+1 emergency shield, max 3.', apply: () => { state.shield = Math.min(3, state.shield + 1); } },
      { name: 'Mission Dealer', desc: '+40% mission rewards.', apply: () => { state.runPerks.missionBonus *= 1.4; } },
      { name: 'Scar Control', desc: 'Garbage rows create more holes.', apply: () => { state.runPerks.scarControl = Math.min(0.45, state.runPerks.scarControl + 0.16); } },
      { name: 'Rift Reactor', desc: '+24% rift gain for every clear.', apply: () => { state.runPerks.riftMult *= 1.24; } },
    ];
    const copy = [...pool];
    const out = [];
    while (out.length < 3 && copy.length) {
      out.push(copy.splice(Math.floor(state.rng() * copy.length), 1)[0]);
    }
    return out;
  }

  function chooseAnomaly(choice) {
    choice.apply();
    state.pendingChoice = false;
    state.paused = false;
    ui.overlay.classList.remove('active');
    showToast(`Anomaly drafted: ${choice.name}`);
    sound('reward');
    lastTime = performance.now();
  }

  function update(dt) {
    if (!state.started || state.paused || state.gameOver || state.pendingChoice) {
      updateParticles(dt);
      draw();
      return;
    }

    if (state.cfg.timeLimit) {
      state.timeLeft -= dt / 1000;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        endRun('Blitz clock expired');
      }
    }

    if (state.riftActive) {
      state.riftTimer -= dt;
      if (state.riftTimer <= 0) {
        state.riftActive = false;
        state.riftTimer = 0;
        showToast('Rift cooled');
      }
    }

    if (state.chronoTimer > 0) state.chronoTimer = Math.max(0, state.chronoTimer - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

    const dailyGarbage = state.daily?.mod?.garbageEvery || 0;
    const garbageEvery = state.cfg.garbageEvery || dailyGarbage;
    if (garbageEvery && state.lines >= 4) {
      state.garbageTimer += dt / 1000;
      if (state.garbageTimer >= Math.max(14, garbageEvery - state.level * 0.7)) {
        state.garbageTimer = 0;
        addGarbageRow();
      }
    }

    accumulator += dt;
    const delay = getGravityDelay();
    while (accumulator >= delay && canAct()) {
      accumulator -= delay;
      if (!collides(state.piece, 0, 1)) {
        state.piece.y += 1;
      } else {
        lockPiece();
      }
    }

    updateParticles(dt);
    if (state.score > state.best) state.best = Math.floor(state.score);
  }

  function updateParticles(dt) {
    const d = Math.min(50, dt);
    state.particles.forEach((p) => {
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.life -= d;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
    state.floaters.forEach((f) => {
      f.y -= 0.045 * d;
      f.life -= d;
    });
    state.floaters = state.floaters.filter((f) => f.life > 0);
  }

  function addFloater(text, x, y, color = '#35f5ff') {
    state.floaters.push({ text, x, y, color, life: 1100 });
  }

  function burstAt(col, row, color, amount = 5) {
    const y = (row - HIDDEN_ROWS) * CELL + CELL / 2;
    if (y < -CELL || y > BOARD_H + CELL) return;
    const x = col * CELL + CELL / 2;
    for (let i = 0; i < amount; i += 1) {
      state.particles.push({ x, y, vx: rand(-0.16, 0.16), vy: rand(-0.18, 0.12), life: rand(320, 780), color, size: rand(2, 5) });
    }
  }

  function spawnLineParticles(rows, color) {
    rows.forEach((row) => {
      for (let col = 0; col < COLS; col += 1) burstAt(col, row, color, 2);
    });
  }

  function drawCell(context, x, y, size, cell, alpha = 1) {
    const palette = COLORS[cell.power || cell.type] || COLORS.I;
    context.save();
    context.globalAlpha = alpha;
    const grd = context.createLinearGradient(x, y, x + size, y + size);
    grd.addColorStop(0, palette[0]);
    grd.addColorStop(1, palette[1]);
    const pad = Math.max(2, size * 0.08);
    const r = Math.max(4, size * 0.2);
    roundRect(context, x + pad, y + pad, size - pad * 2, size - pad * 2, r);
    context.fillStyle = grd;
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,.42)';
    context.lineWidth = Math.max(1, size * 0.035);
    context.stroke();
    context.shadowColor = palette[0];
    context.shadowBlur = size * 0.26;
    context.strokeStyle = palette[0];
    context.globalAlpha = alpha * 0.26;
    context.stroke();
    context.restore();

    if (cell.power) {
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = '#07101a';
      context.font = `${Math.max(10, size * 0.36)}px system-ui, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const label = cell.power === 'SLD' ? 'S' : cell.power;
      context.fillText(label, x + size / 2, y + size / 2 + 1);
      context.restore();
    }
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function ghostY() {
    if (!state.piece) return 0;
    let y = state.piece.y;
    while (!collides({ ...state.piece, y }, 0, 1)) y += 1;
    return y;
  }

  function drawPiece(context, piece, offsetY = -HIDDEN_ROWS, alpha = 1, ghost = false) {
    if (!piece) return;
    for (let y = 0; y < piece.shape.length; y += 1) {
      for (let x = 0; x < piece.shape[y].length; x += 1) {
        if (!piece.shape[y][x]) continue;
        const bx = piece.x + x;
        const by = piece.y + y + offsetY;
        if (by < 0) continue;
        const power = powerForCell(piece, x, y);
        const cell = ghost ? { type: piece.type, power: null } : { type: piece.type, power };
        drawCell(context, bx * CELL, by * CELL, CELL, cell, alpha);
      }
    }
  }

  function drawBoardBackground() {
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    const grd = ctx.createLinearGradient(0, 0, 0, BOARD_H);
    grd.addColorStop(0, '#050817');
    grd.addColorStop(1, '#02030a');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.055)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, BOARD_H);
      ctx.stroke();
    }
    for (let y = 1; y < VISIBLE_ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(BOARD_W, y * CELL);
      ctx.stroke();
    }
    ctx.restore();

    if (state.riftActive) {
      ctx.save();
      ctx.globalAlpha = 0.17 + Math.sin(performance.now() / 120) * 0.05;
      ctx.fillStyle = '#35f5ff';
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.restore();
    }

    if (state.chronoTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#9b6cff';
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.restore();
    }
  }

  function draw() {
    drawBoardBackground();

    for (let y = HIDDEN_ROWS; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = state.grid[y][x];
        if (cell) drawCell(ctx, x * CELL, (y - HIDDEN_ROWS) * CELL, CELL, cell, 1);
      }
    }

    if (state.piece && state.started && !state.gameOver) {
      const gy = ghostY();
      drawPiece(ctx, { ...state.piece, y: gy }, -HIDDEN_ROWS, 0.17, true);
      drawPiece(ctx, state.piece, -HIDDEN_ROWS, 1, false);
    }

    state.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 600));
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    state.floaters.forEach((f) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 900));
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 16;
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });

    drawMiniCanvases();
  }

  function drawMiniCanvases() {
    drawMini(holdCtx, state.hold ? createMiniPiece(state.hold) : null, ui.holdCanvas.width, ui.holdCanvas.height);
    nextCtx.clearRect(0, 0, ui.nextCanvas.width, ui.nextCanvas.height);
    nextCtx.fillStyle = 'rgba(0,0,0,.18)';
    nextCtx.fillRect(0, 0, ui.nextCanvas.width, ui.nextCanvas.height);
    state.queue.slice(0, 4).forEach((type, idx) => {
      drawMini(nextCtx, createMiniPiece(type), ui.nextCanvas.width, 68, idx * 70);
    });
  }

  function createMiniPiece(type) {
    return { type, shape: SHAPES[type].map((row) => [...row]), power: null, powerAt: null };
  }

  function drawMini(context, piece, width, height, offsetY = 0) {
    context.save();
    if (offsetY === 0) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(0,0,0,.18)';
      context.fillRect(0, 0, width, height);
    }
    if (!piece) {
      context.restore();
      return;
    }
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    const size = Math.min((width - 22) / cols, (height - 16) / rows, 24);
    const startX = (width - cols * size) / 2;
    const startY = offsetY + (height - rows * size) / 2;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (piece.shape[y][x]) drawCell(context, startX + x * size, startY + y * size, size, { type: piece.type, power: null }, 1);
      }
    }
    context.restore();
  }

  function updateUI() {
    ui.score.textContent = formatNumber(state.score);
    ui.best.textContent = formatNumber(Math.max(state.best, Number(profile.bestByMode[state.mode] || 0)));
    ui.level.textContent = state.level;
    ui.combo.textContent = state.combo;
    ui.lines.textContent = state.lines;
    ui.modeLabel.textContent = state.daily ? `${state.cfg.label}: ${state.daily.mod.name}` : state.cfg.label;
    const missionProgress = state.mission ? ` (${Math.min(state.mission.progress, state.mission.target)}/${state.mission.target})` : '';
    const pulse = state.pulseGoal ? ` · ${state.pulseGoal.text} (${Math.min(Number(state.pulseProgress?.[state.pulseGoal.type] || 0), state.pulseGoal.target)}/${state.pulseGoal.target})` : '';
    ui.missionText.textContent = state.mission ? `${state.mission.text}${missionProgress}${pulse}` : `Mission initializing${pulse}`;
    ui.timeText.textContent = state.cfg.timeLimit ? formatClock(state.timeLeft) : '∞';
    ui.shieldText.textContent = state.shield;
    ui.surgeText.textContent = state.stats.surges;
    if (ui.rivalText) ui.rivalText.textContent = state.rival ? state.rival.name : 'None';
    if (ui.todayStreakText) ui.todayStreakText.textContent = profile.ritual?.streak || 0;
    if (ui.prestigeText) ui.prestigeText.textContent = prestigeLevel();
    const charge = Math.floor(state.riftCharge);
    ui.riftFill.style.width = `${Math.min(100, charge)}%`;
    ui.riftValue.textContent = state.riftActive ? `${Math.ceil(state.riftTimer / 1000)}s` : `${charge}%`;
    if (state.riftActive) ui.riftLabel.textContent = 'Rift burning';
    else if (state.riftCharge >= 100) ui.riftLabel.textContent = 'Rift ready';
    else if (state.chronoTimer > 0) ui.riftLabel.textContent = `Chrono slow ${Math.ceil(state.chronoTimer / 1000)}s`;
    else ui.riftLabel.textContent = 'Rift charging';
    ui.riftBtn.classList.toggle('ready', state.riftCharge >= 100 && !state.riftActive);
    ui.riftMobileBtn.classList.toggle('ready', state.riftCharge >= 100 && !state.riftActive);
    ui.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    renderProfileChips();
    ui.pauseBtn.textContent = state.paused ? '▶' : 'Ⅱ';
    renderProfileChips();
  }

  function formatClock(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function loop(now) {
    const dt = Math.min(48, now - lastTime || 16);
    lastTime = now;
    update(dt);
    updateUI();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function setOverlay(html) {
    ui.overlayPanel.innerHTML = html;
    ui.overlay.classList.add('active');
  }

  function homeOverlay() {
    const daily = dailyInfo();
    const best = Number(profile.bestByMode[selectedMode] || 0);
    const rank = rankForXP(profile.xp);
    setOverlay(`
      <p class="eyebrow">Phone-first ritual arcade</p>
      <h2>Enter the Rift</h2>
      <p>Swipe to move, tap to rotate, flick down to slam. Draft anomalies, farm shards, tune calming audio, unlock cosmetics, and push daily/weekly contracts so this turns into a real habit loop.</p>
      <div class="mode-grid" id="modeGrid">
        ${Object.entries(MODES).map(([key, mode]) => `
          <button class="mode-card ${selectedMode === key ? 'active' : ''}" data-mode="${key}" type="button">
            <b>${mode.label}</b><span>${key === 'daily' ? `${daily.mod.name}: ${daily.mod.desc}` : mode.description}</span>
          </button>`).join('')}
      </div>
      <div class="overlay-actions">
        <button id="startRunBtn" class="primary-btn" type="button">Start Run</button>
        <button id="moodDeckBtn" class="secondary-btn" type="button">Mood Deck</button>
      </div>
      <div class="overlay-actions compact-actions">
        <button id="controlsBtn" class="secondary-btn" type="button">Controls</button>
        <button id="seasonVaultBtn" class="secondary-btn" type="button">Season Vault</button>
        <button id="liveOpsOverlayBtn" class="secondary-btn" type="button">Ritual Ops</button>
        <button id="coachOverlayBtn" class="secondary-btn" type="button">Coach</button>
        <button id="academyOverlayBtn" class="secondary-btn" type="button">Academy</button>
        <button id="rivalsOverlayBtn" class="secondary-btn" type="button">Rivals</button>
        <button id="mapOverlayBtn" class="secondary-btn" type="button">Campaign Map</button>
        <button id="sanctuaryOverlayBtn" class="secondary-btn" type="button">Sanctuary</button>
        <button id="relicsOverlayBtn" class="secondary-btn" type="button">Relics</button>
        <button id="runLabOverlayBtn" class="secondary-btn" type="button">Run Lab</button>
        <button id="masteryOverlayBtn" class="secondary-btn" type="button">Mastery</button>
        <button id="licenseOverlayBtn" class="secondary-btn" type="button">License</button>
        <button id="codexOverlayBtn" class="secondary-btn" type="button">Codex</button>
        <button id="leagueOverlayBtn" class="secondary-btn" type="button">League</button>
        <button id="drillsOverlayBtn" class="secondary-btn" type="button">Drills</button>
        <button id="ritualOverlayBtn" class="secondary-btn" type="button">Ritual Plans</button>
        <button id="prestigeOverlayBtn" class="secondary-btn" type="button">Prestige</button>
        <button id="passBtn" class="secondary-btn" type="button">Rift Pass</button>
        <button id="matrixOverlayBtn" class="secondary-btn" type="button">Skill Matrix</button>
        <button id="forgeOverlayBtn" class="secondary-btn" type="button">Challenge Forge</button>
        <button id="protocolOverlayBtn" class="secondary-btn" type="button">13-Step Protocol</button>
        <button id="analyticsOverlayBtn" class="secondary-btn" type="button">Analytics</button>
        <button id="finalOverlayBtn" class="secondary-btn" type="button">Final Pass</button>
      </div>
      <div class="profile-mini">
        <span>Rank <b>${rank}</b></span>
        <span>XP <b>${formatNumber(profile.xp)}</b></span>
        <span>Shards <b>${formatNumber(profile.shards)}</b></span>
        <span>Best <b>${formatNumber(best)}</b></span>
        <span>Streak <b>${profile.ritual?.streak || 0}</b></span>
        <span>Tier <b>${seasonTier()}</b></span>
        <span>Prestige <b>${prestigeLevel()}</b></span>
        <span>Rivals <b>${profile.rivals?.beatenCount || 0}/5</b></span>
        <span>Map <b>${profile.campaign?.completedCount || 0}/${CAMPAIGN_NODES.length}</b></span>
        <span>Serenity <b>${formatNumber(profile.sanctuary?.serenity || 0)}</b></span>
        <span>Relics <b>${relicUnlockCount()}/${Object.keys(RIFT_RELICS).length}</b></span>
        <span>Lab <b>${activeRunModifier().name}</b></span>
        <span>League <b>${leagueTierInfo().name}</b></span>
        <span>Codex <b>${codexDiscoveryCount()}/${Object.keys(CODEX_ENTRIES).length}</b></span>
        <span>v13 <b>${profile.v13?.oathSigned ? 'Ready' : 'Review'}</b></span>
        <span>Pilot <b>${profile.license?.title || 'Rift Initiate'}</b></span>
        <span>Matrix <b>${skillOwnedCount()}/${Object.keys(SKILL_MATRIX).length}</b></span>
        <span>Forge <b>${profile.challengeForge?.clears || 0}</b></span>
        <span>Protocol <b>${Math.min(PROTOCOL_STEPS.length, profile.protocol?.completedCount || 0)}/${PROTOCOL_STEPS.length}</b></span>
      </div>
    `);
    bindHomeOverlay();
  }

  function bindHomeOverlay() {
    ui.overlayPanel.querySelectorAll('.mode-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedMode = btn.dataset.mode;
        localStorage.setItem('nrb_selected_mode', selectedMode);
        homeOverlay();
      });
    });
    $('startRunBtn').addEventListener('click', () => startRun(selectedMode));
    $('controlsBtn').addEventListener('click', showControlsOverlay);
    $('moodDeckBtn')?.addEventListener('click', () => showMoodOverlay('home'));
    $('seasonVaultBtn')?.addEventListener('click', showSeasonOverlay);
    $('liveOpsOverlayBtn')?.addEventListener('click', showLiveOpsOverlay);
    $('coachOverlayBtn')?.addEventListener('click', showCoachOverlay);
    $('academyOverlayBtn')?.addEventListener('click', showAcademyOverlay);
    $('rivalsOverlayBtn')?.addEventListener('click', showRivalsOverlay);
    $('mapOverlayBtn')?.addEventListener('click', showCampaignOverlay);
    $('sanctuaryOverlayBtn')?.addEventListener('click', showSanctuaryOverlay);
    $('relicsOverlayBtn')?.addEventListener('click', showRelicsOverlay);
    $('runLabOverlayBtn')?.addEventListener('click', showRunLabOverlay);
    $('masteryOverlayBtn')?.addEventListener('click', showMasteryOverlay);
    $('licenseOverlayBtn')?.addEventListener('click', showLicenseOverlay);
    $('codexOverlayBtn')?.addEventListener('click', showCodexOverlay);
    $('leagueOverlayBtn')?.addEventListener('click', showLeagueOverlay);
    $('drillsOverlayBtn')?.addEventListener('click', showDrillsOverlay);
    $('ritualOverlayBtn')?.addEventListener('click', showRitualOverlay);
    $('prestigeOverlayBtn')?.addEventListener('click', showPrestigeOverlay);
    $('passBtn')?.addEventListener('click', showPassOverlay);
    $('matrixOverlayBtn')?.addEventListener('click', showSkillMatrixOverlay);
    $('forgeOverlayBtn')?.addEventListener('click', showChallengeForgeOverlay);
    $('protocolOverlayBtn')?.addEventListener('click', showProtocolOverlay);
    $('analyticsOverlayBtn')?.addEventListener('click', showAnalyticsOverlay);
    $('finalOverlayBtn')?.addEventListener('click', showFinalPassOverlay);
  }

  function showControlsOverlay() {
    setOverlay(`
      <p class="eyebrow">Control deck</p>
      <h2>Play Fast</h2>
      <p><b>Tap board</b> to rotate. <b>Swipe left/right</b> to move. <b>Swipe down</b> to slam. <b>Swipe up</b> to hold. Use the Mood Deck when you want calm, focus, or late-night tones.</p>
      <div class="profile-list">
        <div class="profile-row"><b>Rift Surge</b><span>Clear lines until the meter hits 100%, then hit RIFT for a scoring burn.</span></div>
        <div class="profile-row"><b>Power Cores</b><span>Q bursts clusters, B slices a row, C slows time, S grants shield.</span></div>
        <div class="profile-row"><b>Anomaly Drafts</b><span>Every few levels you pick a run perk. This is what turns a good run into a long session.</span></div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="backHomeBtn" class="primary-btn" type="button">Back</button>
        <button id="moodDeckBtn" class="secondary-btn" type="button">Mood</button>
        <button id="comfortBtn" class="secondary-btn" type="button">Comfort</button>
        <button id="startRunBtn" class="secondary-btn" type="button">Start</button>
      </div>
    `);
    $('backHomeBtn').addEventListener('click', homeOverlay);
    $('moodDeckBtn')?.addEventListener('click', () => showMoodOverlay('controls'));
    $('comfortBtn')?.addEventListener('click', showComfortOverlay);
    $('startRunBtn').addEventListener('click', () => startRun(selectedMode));
  }

  function showPauseOverlay() {
    state.paused = true;
    setOverlay(`
      <p class="eyebrow">Paused</p>
      <h2>Hold Orbit</h2>
      <p>Run is preserved. Score: <b>${formatNumber(state.score)}</b>. Lines: <b>${state.lines}</b>. Rift: <b>${Math.floor(state.riftCharge)}%</b>.</p>
      <div class="overlay-actions">
        <button id="resumeBtn" class="primary-btn" type="button">Resume</button>
        <button id="moodDeckBtn" class="secondary-btn" type="button">Mood</button>
        <button id="coachPauseBtn" class="secondary-btn" type="button">Coach</button>
        <button id="quitBtn" class="secondary-btn" type="button">End</button>
      </div>
    `);
    $('resumeBtn').addEventListener('click', () => {
      state.paused = false;
      ui.overlay.classList.remove('active');
      lastTime = performance.now();
    });
    $('moodDeckBtn')?.addEventListener('click', () => showMoodOverlay('pause'));
    $('coachPauseBtn')?.addEventListener('click', showCoachOverlay);
    $('quitBtn').addEventListener('click', () => endRun('Run ended'));
  }

  function showMoodOverlay(returnTo = 'home') {
    const mood = activeMood();
    const musicValue = Math.round(Number(profile.settings?.musicVolume ?? 0.44) * 100);
    const sfxValue = Math.round(Number(profile.settings?.sfxVolume ?? 0.78) * 100);
    setOverlay(`
      <p class="eyebrow">Mood audio deck</p>
      <h2>${mood.label}</h2>
      <p>Pick a calming tone while you play. Binaural-style loops work best with headphones. This is entertainment audio, not medical treatment.</p>
      <div class="audio-deck">
        <div class="mood-grid">
          ${Object.entries(AUDIO_MOODS).map(([id, item]) => `
            <button class="mood-card-btn ${profile.settings.mood === id ? 'active' : ''}" data-mood="${id}" type="button">
              <b>${item.label}</b><span>${item.desc}</span><em>${item.beat} · ${item.intent}</em>
            </button>
          `).join('')}
        </div>
        <div class="audio-controls">
          <label class="audio-slider"><span>Music</span><input id="musicVolume" type="range" min="0" max="100" value="${musicValue}" /><b id="musicValueText">${musicValue}%</b></label>
          <label class="audio-slider"><span>SFX</span><input id="sfxVolume" type="range" min="0" max="100" value="${sfxValue}" /><b id="sfxValueText">${sfxValue}%</b></label>
          <div class="toggle-row">
            <button id="muteToggleBtn" class="toggle-chip ${profile.settings.muted ? '' : 'active'}" type="button">${profile.settings.muted ? 'Muted' : 'Audio On'}</button>
            <button id="hapticsToggleBtn" class="toggle-chip ${profile.settings.haptics === false ? '' : 'active'}" type="button">Haptics</button>
          </div>
        </div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="moodDoneBtn" class="primary-btn" type="button">Done</button>
        <button id="moodPassBtn" class="secondary-btn" type="button">Why $13/yr?</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-mood]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setMood(btn.dataset.mood);
        showMoodOverlay(returnTo);
      });
    });
    $('musicVolume').addEventListener('input', (event) => {
      profile.settings.musicVolume = Number(event.target.value) / 100;
      $('musicValueText').textContent = `${event.target.value}%`;
      saveProfile();
      applyMoodAudio();
    });
    $('sfxVolume').addEventListener('input', (event) => {
      profile.settings.sfxVolume = Number(event.target.value) / 100;
      $('sfxValueText').textContent = `${event.target.value}%`;
      saveProfile();
    });
    $('muteToggleBtn').addEventListener('click', () => {
      profile.settings.muted = !profile.settings.muted;
      state.muted = profile.settings.muted;
      saveProfile();
      if (profile.settings.muted) stopMoodAudio();
      else applyMoodAudio();
      showMoodOverlay(returnTo);
    });
    $('hapticsToggleBtn').addEventListener('click', () => {
      profile.settings.haptics = profile.settings.haptics === false;
      saveProfile();
      showMoodOverlay(returnTo);
    });
    $('moodDoneBtn').addEventListener('click', () => {
      if (returnTo === 'pause' && state.started && !state.gameOver) {
        state.paused = false;
        ui.overlay.classList.remove('active');
        lastTime = performance.now();
      } else if (returnTo === 'controls') showControlsOverlay();
      else homeOverlay();
    });
    $('moodPassBtn').addEventListener('click', showPassOverlay);
  }


  function questCard(quest) {
    const done = Boolean(profile.quests?.completed?.[quest.key]);
    const progress = Math.min(quest.target, Number(profile.quests?.progress?.[quest.key] || 0));
    return `<div class="profile-row quest-row ${done ? 'done' : ''}"><b>${done ? '✅' : '☐'} ${quest.scope}: ${quest.label}</b><span>${progress}/${quest.target} · +${quest.xp} XP · +${quest.shards} shards</span></div>`;
  }

  function cosmeticRows(type, label) {
    const owned = profile.cosmetics?.owned?.[type] || {};
    const equippedKey = { themes: 'theme', boards: 'board', trails: 'trail' }[type];
    const equipped = profile.cosmetics?.equipped?.[equippedKey];
    return `
      <h3 class="vault-heading">${label}</h3>
      <div class="shop-grid">
        ${Object.entries(COSMETICS[type]).map(([id, item]) => {
          const isOwned = Boolean(owned[id]);
          const isEquipped = equipped === id;
          const verb = isEquipped ? 'Equipped' : isOwned ? 'Equip' : `${item.cost} shards`;
          return `<button class="shop-card ${isEquipped ? 'equipped' : ''}" data-shop-type="${type}" data-shop-id="${id}" type="button"><b>${item.name}</b><span>${item.desc}</span><em>${verb}</em></button>`;
        }).join('')}
      </div>`;
  }



  function showSkillMatrixOverlay() {
    ensureV10Profile();
    const owned = profile.skillTree.owned || {};
    setOverlay(`
      <p class="eyebrow">v11 premium progression</p>
      <h2>Skill Matrix</h2>
      <p>Spend earned shards on permanent run-affecting upgrades. This gives long-term players a reason to keep grinding without blocking the core game.</p>
      <div class="profile-list">
        ${Object.entries(SKILL_MATRIX).map(([id, skill]) => `
          <button class="profile-row ${owned[id] ? 'done active' : ''}" data-skill="${id}" type="button">
            <b>${owned[id] ? '✅' : '☐'} ${skill.name}</b><span>${skill.desc} Cost: ${owned[id] ? 'owned' : `${skill.cost} shards`}.</span>
          </button>`).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="matrixBackBtn" class="primary-btn" type="button">Back</button>
        <button id="matrixForgeBtn" class="secondary-btn" type="button">Challenge Forge</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-skill]').forEach((btn) => btn.addEventListener('click', () => buySkill(btn.dataset.skill)));
    $('matrixBackBtn').addEventListener('click', homeOverlay);
    $('matrixForgeBtn')?.addEventListener('click', showChallengeForgeOverlay);
  }

  function showChallengeForgeOverlay() {
    ensureV10Profile();
    const pool = challengePoolForToday();
    const active = activeChallenge();
    setOverlay(`
      <p class="eyebrow">v11 challenge forge</p>
      <h2>${active ? `Armed: ${active.name}` : 'Pick a Forge Target'}</h2>
      <p>Daily generated challenge cards force a mode, add a light run modifier, and pay one-time XP/shard rewards when cleared.</p>
      <div class="profile-list">
        ${pool.map((challenge) => {
          const done = Boolean(profile.challengeForge?.completed?.[challenge.key]);
          const armed = profile.challengeForge?.active === challenge.id;
          return `<button class="profile-row ${armed ? 'active' : ''} ${done ? 'done' : ''}" data-challenge="${challenge.id}" type="button"><b>${done ? '✅' : armed ? '▶' : '☐'} ${challenge.name}</b><span>${MODES[challenge.mode].label}. ${formatNumber(challenge.targetScore)} score, ${challenge.minLines}+ lines${challenge.minSurges ? `, ${challenge.minSurges}+ surges` : ''}${challenge.minCores ? `, ${challenge.minCores}+ cores` : ''}. Reward: +${challenge.rewardXP} XP / +${challenge.rewardShards} shards. ${challenge.desc}</span></button>`;
        }).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="forgeBackBtn" class="primary-btn" type="button">Back</button>
        <button id="forgeStartBtn" class="secondary-btn" type="button">Start Armed Challenge</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-challenge]').forEach((btn) => btn.addEventListener('click', () => selectChallenge(btn.dataset.challenge)));
    $('forgeBackBtn').addEventListener('click', homeOverlay);
    $('forgeStartBtn')?.addEventListener('click', () => {
      const armed = activeChallenge();
      startRun(armed ? armed.mode : selectedMode);
    });
  }

  function showProtocolOverlay() {
    ensureV10Profile();
    const active = activeProtocolStep();
    setOverlay(`
      <p class="eyebrow">v11 guided retention path</p>
      <h2>13-Step Gravity Protocol</h2>
      <p>${active ? `Current lesson: <b>${active.title}</b> — ${active.goal}.` : 'Protocol complete. You have cleared the full 13-step player journey.'}</p>
      <div class="profile-list">
        ${PROTOCOL_STEPS.map((step, idx) => {
          const done = idx < Number(profile.protocol?.step || 0);
          const current = idx === Number(profile.protocol?.step || 0);
          return `<div class="profile-row ${done ? 'done' : current ? 'active' : ''}"><b>${done ? '✅' : current ? '▶' : '☐'} ${idx + 1}. ${step.title}</b><span>${step.goal}. Reward: +${step.rewardXP} XP / +${step.rewardShards} shards.</span></div>`;
        }).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="protocolBackBtn" class="primary-btn" type="button">Back</button>
        <button id="protocolStartBtn" class="secondary-btn" type="button">Start Next Lesson</button>
      </div>
    `);
    $('protocolBackBtn').addEventListener('click', homeOverlay);
    $('protocolStartBtn')?.addEventListener('click', () => startRun(active?.id === 'zen' ? 'zen' : active?.id === 'daily' ? 'daily' : active?.id === 'onslaught' ? 'onslaught' : selectedMode));
  }

  function showAnalyticsOverlay() {
    ensureV10Profile();
    const runs = profile.analytics.runs || [];
    const recent = runs.slice(0, 10).map((run) => `<div class="profile-row"><b>${MODES[run.mode]?.label || run.mode} · ${formatNumber(run.score)}</b><span>${run.lines} lines, Lv ${run.level}, ${run.duration}s, +${run.xp} XP / +${run.shards} shards${run.challenge ? `, Challenge: ${run.challenge}` : ''}${run.protocol ? `, Protocol: ${run.protocol}` : ''}</span></div>`).join('') || '<div class="profile-row"><b>No runs logged yet</b><span>Finish a run to populate local analytics.</span></div>';
    setOverlay(`
      <p class="eyebrow">v11 local analytics</p>
      <h2>Run Intelligence</h2>
      <p>Local-only stats help the player chase better sessions without requiring accounts, servers, or invasive tracking.</p>
      <div class="profile-mini">
        <span>Logged <b>${runs.length}</b></span>
        <span>Best Score <b>${formatNumber(profile.analytics.bestScore || 0)}</b></span>
        <span>Best Lines <b>${formatNumber(profile.analytics.bestLines || 0)}</b></span>
        <span>Avg Score <b>${formatNumber(profile.analytics.avgScore || 0)}</b></span>
        <span>Avg Lines <b>${formatNumber(profile.analytics.avgLines || 0)}</b></span>
        <span>Total Time <b>${formatNumber(Math.round((profile.analytics.totalDuration || 0) / 60))}m</b></span>
      </div>
      <div class="profile-list">${recent}</div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="analyticsBackBtn" class="primary-btn" type="button">Back</button>
        <button id="analyticsProtocolBtn" class="secondary-btn" type="button">Protocol</button>
      </div>
    `);
    $('analyticsBackBtn').addEventListener('click', homeOverlay);
    $('analyticsProtocolBtn')?.addEventListener('click', showProtocolOverlay);
  }

  function showCompanionsOverlay() {
    ensureV11Profile();
    const active = profile.companions.active || 'spark';
    setOverlay(`
      <p class="eyebrow">v11 companion layer</p>
      <h2>Rift Companions</h2>
      <p>Companions create a softer long-session loop: affinity, tiny run tuning, and identity players can care about over months.</p>
      <div class="profile-list">
        ${Object.entries(RIFT_COMPANIONS).map(([id, companion]) => {
          const owned = Boolean(profile.companions.owned[id]);
          const locked = companion.needRank && rankForXP(profile.xp) < companion.needRank;
          const label = active === id ? 'Active' : owned ? 'Equip' : locked ? `Rank ${companion.needRank}` : `${companion.cost} shards`;
          return `<button class="profile-row ${active === id ? 'active' : ''} ${owned ? 'done' : ''}" data-companion="${id}" type="button"><b>${owned ? '✅' : '☐'} ${companion.name}</b><span>${companion.desc} Affinity: ${companionAffinity(id)}. ${label}.</span></button>`;
        }).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="companionsBackBtn" class="primary-btn" type="button">Back</button>
        <button id="companionsChronicleBtn" class="secondary-btn" type="button">Chronicle</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-companion]').forEach((btn) => btn.addEventListener('click', () => buyOrEquipCompanion(btn.dataset.companion)));
    $('companionsBackBtn').addEventListener('click', homeOverlay);
    $('companionsChronicleBtn')?.addEventListener('click', showChronicleOverlay);
  }

  function showChronicleOverlay() {
    ensureV11Profile();
    const active = activeChronicleArc();
    setOverlay(`
      <p class="eyebrow">v11 story progression</p>
      <h2>Rift Chronicle</h2>
      <p>${active ? `Active arc: <b>${active.title}</b> — ${active.goal}.` : 'All Chronicle arcs are complete. Add more arcs as seasonal $13/year content.'}</p>
      <div class="profile-list">
        ${CHRONICLE_ARCS.map((arc) => {
          const done = Boolean(profile.chronicle.completed[arc.id]);
          const current = active?.id === arc.id;
          return `<button class="profile-row ${done ? 'done' : current ? 'active' : ''}" data-chronicle="${arc.id}" type="button"><b>${done ? '✅' : current ? '▶' : '☐'} ${arc.title}</b><span>${arc.goal}. Reward: +${arc.xp} XP / +${arc.shards} shards.</span></button>`;
        }).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="chronicleBackBtn" class="primary-btn" type="button">Back</button>
        <button id="chronicleStartBtn" class="secondary-btn" type="button">Start Arc Run</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-chronicle]').forEach((btn) => btn.addEventListener('click', () => selectChronicle(btn.dataset.chronicle)));
    $('chronicleBackBtn').addEventListener('click', homeOverlay);
    $('chronicleStartBtn')?.addEventListener('click', () => startRun(active?.id === 'calm_orbit' ? 'zen' : active?.id === 'scar_monk' ? 'onslaught' : selectedMode));
  }

  function showAftercareOverlay() {
    ensureV11Profile();
    setOverlay(`
      <p class="eyebrow">v11 recovery loop</p>
      <h2>Post-Run Aftercare</h2>
      <p>Give the player a satisfying decision after failure or victory. This turns loss into progression instead of churn.</p>
      <div class="profile-list">
        ${POST_RUN_RECOVERY.map((option) => `<button class="profile-row" data-aftercare="${option.id}" type="button"><b>${option.name}</b><span>${option.desc}</span></button>`).join('')}
      </div>
      <div class="profile-mini">
        <span>Recoveries <b>${profile.aftercare.recoveries || 0}</b></span>
        <span>Memory Notes <b>${profile.memoryBank.notes.length}</b></span>
        <span>Active Companion <b>${activeCompanion().name}</b></span>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="aftercareBackBtn" class="primary-btn" type="button">Profile</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-aftercare]').forEach((btn) => btn.addEventListener('click', () => choosePostRunRecovery(btn.dataset.aftercare)));
    $('aftercareBackBtn').addEventListener('click', showProfileOverlay);
  }


  function showLicenseOverlay() {
    unlockLicenseItems();
    const license = profile.license || {};
    setOverlay(`
      <p class="eyebrow">Pilot License</p>
      <h2>${license.callsign || 'PILOT-13'} · ${license.title || 'Rift Initiate'}</h2>
      <p>Player identity now has earned titles and emblems. This helps the game feel like a profile players maintain instead of a disposable score toy.</p>
      <div class="ritual-strip">
        <span><b>${license.title || 'Rift Initiate'}</b>Title</span>
        <span><b>${PILOT_EMBLEMS[license.emblem || 'spark']?.name || 'Spark'}</b>Emblem</span>
        <span><b>${leagueTierInfo().name}</b>League</span>
      </div>
      <h3 class="section-heading">Titles</h3>
      <div class="profile-list compact-list">
        ${PILOT_TITLES.map((title) => {
          const unlocked = Boolean(profile.license.titleUnlocks?.[title.id]) || title.need();
          return `<button class="profile-row ${license.title === title.id ? 'active done' : unlocked ? 'done' : ''}" data-title="${title.id}" type="button" ${unlocked ? '' : 'disabled'}><b>${license.title === title.id ? '▶' : unlocked ? '✓' : '☐'} ${title.id}</b><span>${title.desc}</span></button>`;
        }).join('')}
      </div>
      <h3 class="section-heading">Emblems</h3>
      <div class="profile-list compact-list">
        ${Object.entries(PILOT_EMBLEMS).map(([id, emblem]) => {
          const unlocked = Boolean(profile.license.emblemUnlocks?.[id]) || emblem.need();
          return `<button class="profile-row ${license.emblem === id ? 'active done' : unlocked ? 'done' : ''}" data-emblem="${id}" type="button" ${unlocked ? '' : 'disabled'}><b>${license.emblem === id ? '▶' : unlocked ? '✓' : '☐'} ${emblem.name}</b><span>${emblem.desc}</span></button>`;
        }).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="licenseNameBtn" class="primary-btn" type="button">Edit Callsign</button>
        <button id="licenseBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-title]').forEach((btn) => btn.addEventListener('click', () => { profile.license.title = btn.dataset.title; unlock('license_custom'); saveProfile(); showLicenseOverlay(); }));
    ui.overlayPanel.querySelectorAll('[data-emblem]').forEach((btn) => btn.addEventListener('click', () => { profile.license.emblem = btn.dataset.emblem; unlock('license_custom'); saveProfile(); showLicenseOverlay(); }));
    $('licenseNameBtn')?.addEventListener('click', () => {
      const name = prompt('Pilot callsign', profile.license.callsign || 'PILOT-13');
      if (!name) return;
      profile.license.callsign = name.slice(0, 18).replace(/[<>]/g, '');
      unlock('license_custom');
      saveProfile();
      showLicenseOverlay();
    });
    $('licenseBackBtn')?.addEventListener('click', homeOverlay);
  }

  function showCodexOverlay() {
    const discoveries = codexDiscoveryCount();
    setOverlay(`
      <p class="eyebrow">Rift Codex</p>
      <h2>Collection Archive</h2>
      <p>The Codex tracks discoveries while the player naturally plays: pieces, power cores, and modes. It creates collection completion without needing online accounts.</p>
      <div class="ritual-strip">
        <span><b>${discoveries}/${Object.keys(CODEX_ENTRIES).length}</b>Discovered</span>
        <span><b>${Object.values(profile.codex?.counts || {}).reduce((a, b) => a + Number(b || 0), 0)}</b>Total Finds</span>
        <span><b>${discoveries >= 12 ? 'Keeper' : 'Scanning'}</b>Status</span>
      </div>
      <div class="profile-list compact-list">
        ${Object.entries(CODEX_ENTRIES).map(([id, entry]) => {
          const seen = Boolean(profile.codex?.seen?.[id]);
          const count = Number(profile.codex?.counts?.[id] || 0);
          return `<div class="profile-row ${seen ? 'done' : ''}"><b>${seen ? '✓' : '☐'} ${seen ? entry.name : 'Unknown Signal'}</b><span>${entry.type}. ${seen ? entry.desc : 'Discover this by playing.'} ${seen ? `Seen ${count}x.` : ''}</span></div>`;
        }).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="codexBackBtn" class="primary-btn" type="button">Back</button>
        <button id="codexStartBtn" class="secondary-btn" type="button">Start Discovery Run</button>
      </div>
    `);
    $('codexBackBtn')?.addEventListener('click', homeOverlay);
    $('codexStartBtn')?.addEventListener('click', () => startRun(selectedMode));
  }

  function showLeagueOverlay() {
    ensureV9Profile();
    const week = weekKey();
    if (profile.league.week !== week) profile.league = { week, score: 0, bestRun: 0, tier: 'bronze', medals: Number(profile.league?.medals || 0) };
    const tier = leagueTierInfo();
    const next = LEAGUE_TIERS.find((item) => item.need > Number(profile.league.score || 0));
    setOverlay(`
      <p class="eyebrow">Weekly League</p>
      <h2>${tier.name}</h2>
      <p>This is a local offline league ladder. It gives score-chasers a weekly return loop now, and can later be replaced with real cloud leaderboards.</p>
      <div class="ritual-strip">
        <span><b>${formatNumber(profile.league.score || 0)}</b>Weekly Score</span>
        <span><b>${formatNumber(profile.league.bestRun || 0)}</b>Best Run</span>
        <span><b>${profile.league.medals || 0}</b>Medals</span>
      </div>
      <div class="profile-list compact-list">
        ${LEAGUE_TIERS.map((item) => `<div class="profile-row ${tier.id === item.id ? 'active done' : Number(profile.league.score || 0) >= item.need ? 'done' : ''}"><b>${Number(profile.league.score || 0) >= item.need ? '✓' : '☐'} ${item.name}</b><span>Need ${formatNumber(item.need)} weekly score. Reward on first climb: +${item.rewardXP} XP / +${item.rewardShards} shards.</span></div>`).join('')}
      </div>
      <p class="fine-print">Next: ${next ? `${formatNumber(next.need - Number(profile.league.score || 0))} score to ${next.name}` : 'Weekly ladder complete.'}</p>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="leagueStartBtn" class="primary-btn" type="button">Push League Run</button>
        <button id="leagueBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    $('leagueStartBtn')?.addEventListener('click', () => startRun(selectedMode));
    $('leagueBackBtn')?.addEventListener('click', homeOverlay);
  }

  function showDrillsOverlay() {
    const active = activeDrill();
    setOverlay(`
      <p class="eyebrow">Adaptive Coach Drills</p>
      <h2>${active.name}</h2>
      <p>Drills are local coach goals that convert player weakness into a concrete next run. This creates a stronger reason to replay after a loss.</p>
      <div class="ritual-strip">
        <span><b>${active.targetText}</b>Target</span>
        <span><b>${profile.drills.completedCount || 0}</b>Completed</span>
        <span><b>${active.mode ? MODES[active.mode]?.label : 'Any'}</b>Suggested Mode</span>
      </div>
      <div class="profile-list compact-list">
        ${DRILL_POOL.map((drill) => `<button class="profile-row ${active.id === drill.id ? 'active done' : ''}" data-drill="${drill.id}" type="button"><b>${active.id === drill.id ? '▶' : '☐'} ${drill.name}</b><span>${drill.targetText}. Reward: +${drill.rewardXP} XP / +${drill.rewardShards} shards.</span></button>`).join('')}
      </div>
      <p class="fine-print">Coach note: ${profile.drills.lastAdvice || coachAdvice()}</p>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="drillStartBtn" class="primary-btn" type="button">Start Drill Run</button>
        <button id="drillBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-drill]').forEach((btn) => btn.addEventListener('click', () => chooseDrill(btn.dataset.drill)));
    $('drillStartBtn')?.addEventListener('click', () => startRun(active.mode || selectedMode));
    $('drillBackBtn')?.addEventListener('click', homeOverlay);
  }


  function showMoodMasteryOverlay() {
    ensureV12Profile();
    const rows = Object.entries(AUDIO_MOODS).map(([id, mood]) => {
      const mastery = profile.v12.moodMastery[id] || { xp: 0, runs: 0 };
      const level = moodMasteryLevel(mastery.xp);
      const next = V12_MOOD_TIERS[level + 1] || V12_MOOD_TIERS[V12_MOOD_TIERS.length - 1];
      return `<div class="profile-row ${id === (profile.settings?.mood || 'alpha') ? 'active done' : ''}"><b>${mood.label} · Lv ${level}</b><span>${formatNumber(mastery.xp || 0)} XP / ${formatNumber(next)} · ${mastery.runs || 0} runs · ${mood.intent}</span></div>`;
    }).join('');
    setOverlay(`
      <p class="eyebrow">v12 mood retention</p>
      <h2>Mood Mastery</h2>
      <p>Every tone now levels independently. This makes the audio system a progression lane instead of a settings menu.</p>
      <div class="profile-list compact-list">${rows}</div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="moodMasteryMoodBtn" class="primary-btn" type="button">Tune Mood</button>
        <button id="moodMasteryBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    $('moodMasteryMoodBtn')?.addEventListener('click', () => showMoodOverlay('profile'));
    $('moodMasteryBackBtn')?.addEventListener('click', showProfileOverlay);
  }

  function showCrownTrialsOverlay() {
    ensureV12Profile();
    const active = activeCrownTrial();
    setOverlay(`
      <p class="eyebrow">v12 annual-pass challenge lane</p>
      <h2>Crown Trials</h2>
      <p>${active ? `Active trial: <b>${active.name}</b> — ${active.goal}.` : 'All Crown Trials are clear. This is where new monthly premium challenge packs can drop.'}</p>
      <div class="ritual-strip">
        <span><b>${profile.v12.crownTrials.completedCount || 0}</b>Trials Cleared</span>
        <span><b>${formatNumber(profile.v12.founderScore || 0)}</b>Founder Score</span>
        <span><b>${profile.v12.receipts?.runs?.length || 0}</b>Receipts</span>
      </div>
      <div class="profile-list compact-list">
        ${V12_CROWN_TRIALS.map((trial) => `<button class="profile-row ${profile.v12.crownTrials.completed[trial.id] ? 'done' : active?.id === trial.id ? 'active' : ''}" data-crown-trial="${trial.id}" type="button"><b>${profile.v12.crownTrials.completed[trial.id] ? '✓' : active?.id === trial.id ? '▶' : '☐'} ${trial.name}</b><span>${trial.goal}. Reward: +${trial.xp} XP / +${trial.shards} shards.</span></button>`).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="crownStartBtn" class="primary-btn" type="button">Start Trial Run</button>
        <button id="crownBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-crown-trial]').forEach((btn) => btn.addEventListener('click', () => selectCrownTrial(btn.dataset.crownTrial)));
    $('crownStartBtn')?.addEventListener('click', () => startRun(selectedMode));
    $('crownBackBtn')?.addEventListener('click', showProfileOverlay);
  }

  function showCuratorOverlay() {
    ensureV12Profile();
    setOverlay(`
      <p class="eyebrow">v12 collection economy</p>
      <h2>Weekly Curator</h2>
      <p>Shard-spend cosmetics now rotate through a premium-feeling storefront without real-money pressure. Annual subscribers can get exclusive drops later.</p>
      <div class="ritual-strip">
        <span><b>${profile.v12.curator.purchasedCount || 0}</b>Curator Drops</span>
        <span><b>${formatNumber(profile.shards)}</b>Shards</span>
        <span><b>${ownedCosmeticCount()}</b>Total Cosmetics</span>
      </div>
      <div class="profile-list compact-list">${weeklyCuratorRows()}</div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="curatorBackBtn" class="primary-btn" type="button">Back</button>
        <button id="curatorVaultBtn" class="secondary-btn" type="button">Season Vault</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-curator-id]').forEach((btn) => btn.addEventListener('click', () => buyCuratorDrop(btn.dataset.curatorType, btn.dataset.curatorId)));
    $('curatorBackBtn')?.addEventListener('click', showProfileOverlay);
    $('curatorVaultBtn')?.addEventListener('click', showSeasonOverlay);
  }

  function showReceiptsOverlay() {
    ensureV12Profile();
    const rows = (profile.v12.receipts.runs || []).slice(0, 10).map((run) => `<div class="profile-row"><b>${MODES[run.mode]?.label || run.mode} · ${formatNumber(run.score)}</b><span>${run.lines} lines · ${AUDIO_MOODS[run.mood]?.label || run.mood} · ${run.trial ? `Trial: ${run.trial}` : 'Standard run'} · ${new Date(run.at).toLocaleDateString()}</span></div>`).join('') || '<div class="profile-row"><b>No receipts yet</b><span>Finish a run to create local shareable proof.</span></div>';
    setOverlay(`
      <p class="eyebrow">v12 share loop</p>
      <h2>Run Receipts</h2>
      <p>Receipts give players a clean reason to share progress from your website/PWA without needing accounts yet.</p>
      <div class="profile-list compact-list">${rows}</div>
      <div class="profile-row done"><b>Share Text</b><span>${profile.v12.receipts.bestShare || 'Finish a run to generate a share line.'}</span></div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="receiptsBackBtn" class="primary-btn" type="button">Back</button>
        <button id="receiptsStartBtn" class="secondary-btn" type="button">Generate New Receipt</button>
      </div>
    `);
    $('receiptsBackBtn')?.addEventListener('click', showProfileOverlay);
    $('receiptsStartBtn')?.addEventListener('click', () => startRun(selectedMode));
  }


  function ensureV13Profile() {
    profile.v13 = profile.v13 || {};
    profile.v13.releaseChecklist = profile.v13.releaseChecklist || {};
    profile.v13.oathSigned = Boolean(profile.v13.oathSigned);
    profile.v13.founderKitClaimed = Boolean(profile.v13.founderKitClaimed);
    profile.v13.sessionQuality = Number(profile.v13.sessionQuality || 0);
    profile.v13.wellnessBreaks = Number(profile.v13.wellnessBreaks || 0);
    profile.v13.valueScore = Number(profile.v13.valueScore || 0);
  }

  function evaluateV13AfterRun(runMinutes = 1) {
    ensureV13Profile();
    const qualityGain = Math.max(1, Math.floor(state.lines / 2) + state.stats.surges * 2 + (state.mode === 'zen' ? 3 : 0) + Math.min(13, runMinutes));
    profile.v13.sessionQuality += qualityGain;
    profile.v13.valueScore = Math.floor((profile.runs || 0) * 2 + (profile.ritual?.streak || 0) * 13 + (profile.v12?.founderScore || 0) / 13 + profile.v13.sessionQuality);
    if (profile.v13.sessionQuality >= 100) unlock('v13_quality_100');
    profile.v13.releaseChecklist.first_run = true;
    if (state.mode === 'zen') profile.v13.releaseChecklist.zen_test = true;
    if (profile.v12?.receipts?.runs?.length) profile.v13.releaseChecklist.receipt = true;
    return { qualityGain, valueScore: profile.v13.valueScore };
  }

  function releaseChecklistRows() {
    ensureV13Profile();
    const auto = {
      first_run: (profile.runs || 0) > 0,
      mood_set: Boolean(profile.achievements?.mood_set) || Boolean(profile.settings?.mood),
      daily_signal: Number(profile.liveOps?.dailyClaims || 0) > 0,
      export_backup: Boolean(profile.achievements?.export_save),
      zen_test: Boolean(profile.v13.releaseChecklist.zen_test) || Number(profile.bestByMode?.zen || 0) > 0,
      receipt: Boolean(profile.v12?.receipts?.runs?.length),
      annual_value: Boolean(profile.v13.releaseChecklist.annual_value),
    };
    return V13_RELEASE_CHECKLIST.map((item) => {
      const done = Boolean(profile.v13.releaseChecklist[item.id] || auto[item.id]);
      if (done) profile.v13.releaseChecklist[item.id] = true;
      return `<button class="profile-row ${done ? 'done' : ''}" data-v13-check="${item.id}" type="button"><b>${done ? '✅' : '☐'} ${item.name}</b><span>${item.desc}</span></button>`;
    }).join('');
  }

  function claimV13FounderKit() {
    ensureV13Profile();
    if (profile.v13.founderKitClaimed) return showFinalPassOverlay();
    profile.cosmetics.owned.themes.singularity = true;
    profile.cosmetics.owned.boards.crownGlass = true;
    profile.cosmetics.owned.trails.auraWave = true;
    profile.v13.founderKitClaimed = true;
    unlock('v13_founder_kit');
    saveProfile();
    showToast('v13 Founder Kit claimed');
    showFinalPassOverlay();
  }

  function signV13Oath() {
    ensureV13Profile();
    profile.v13.oathSigned = true;
    profile.v13.releaseChecklist.annual_value = true;
    profile.v13.lastReleaseReview = todayKey();
    unlock('v13_release_oath');
    const allDone = V13_RELEASE_CHECKLIST.every((item) => profile.v13.releaseChecklist[item.id]);
    if (allDone) unlock('v13_checklist');
    saveProfile();
    showFinalPassOverlay();
  }

  function takeWellnessBreak() {
    ensureV13Profile();
    profile.v13.wellnessBreaks += 1;
    profile.shards += 1;
    saveProfile();
    showToast('Reset break logged · +1 shard');
    showFinalPassOverlay();
  }

  function showFinalPassOverlay() {
    ensureV13Profile();
    const doneCount = V13_RELEASE_CHECKLIST.filter((item) => profile.v13.releaseChecklist[item.id]).length;
    const value = Math.floor(profile.v13.valueScore || ((profile.runs || 0) * 2 + (profile.ritual?.streak || 0) * 13));
    setOverlay(`
      <p class="eyebrow">v13 release candidate</p>
      <h2>Final Pass Console</h2>
      <p>This panel is the commercial hardening layer: player-first promise, annual-value check, founder kit, wellness reset, and the launch checklist before you ask people to pay $13/year.</p>
      <div class="ritual-strip">
        <span><b>${doneCount}/${V13_RELEASE_CHECKLIST.length}</b>Checklist</span>
        <span><b>${formatNumber(value)}</b>Value Score</span>
        <span><b>${formatNumber(profile.v13.sessionQuality || 0)}</b>Quality</span>
        <span><b>${profile.v13.wellnessBreaks || 0}</b>Breaks</span>
      </div>
      <div class="profile-list compact-list">${releaseChecklistRows()}</div>
      <div class="profile-row done"><b>$13/year Promise</b><span>Charge for ritual value: offline play, mood audio, progression, cosmetic ownership, exportable profile, daily/weekly goals, comfort modes, and no pay-to-win core lock.</span></div>
      <div class="profile-row ${profile.v13.oathSigned ? 'done' : ''}"><b>${profile.v13.oathSigned ? '✅' : '☐'} Player-first oath</b><span>Core game remains playable. Subscription should add convenience, rituals, cosmetics, seasonal challenge lanes, and support for continued development.</span></div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="v13OathBtn" class="primary-btn" type="button">${profile.v13.oathSigned ? 'Oath Signed' : 'Sign Release Oath'}</button>
        <button id="v13KitBtn" class="secondary-btn" type="button">${profile.v13.founderKitClaimed ? 'Founder Kit Owned' : 'Claim Founder Kit'}</button>
        <button id="v13BreakBtn" class="secondary-btn" type="button">60-Second Reset</button>
        <button id="v13BackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-v13-check]').forEach((btn) => btn.addEventListener('click', () => {
      ensureV13Profile();
      profile.v13.releaseChecklist[btn.dataset.v13Check] = true;
      saveProfile();
      showFinalPassOverlay();
    }));
    $('v13OathBtn')?.addEventListener('click', signV13Oath);
    $('v13KitBtn')?.addEventListener('click', claimV13FounderKit);
    $('v13BreakBtn')?.addEventListener('click', takeWellnessBreak);
    $('v13BackBtn')?.addEventListener('click', homeOverlay);
  }


  function showSeasonOverlay() {
    const points = seasonPoints();
    const tier = seasonTier();
    const quests = getActiveQuests().map(questCard).join('');
    if (tier >= 5) unlock('season_5');
    setOverlay(`
      <p class="eyebrow">${SEASON.name}</p>
      <h2>Season Vault · Tier ${tier}</h2>
      <p>${SEASON.tagline} Current season points: <b>${formatNumber(points)}</b>. Complete contracts and spend shards on cosmetics that make the game feel owned.</p>
      <div class="profile-list compact-list">
        ${SEASON.tiers.map((t) => `<div class="profile-row ${points >= t.need ? 'done' : ''}"><b>${points >= t.need ? '✅' : '☐'} Tier ${t.tier}</b><span>${formatNumber(t.need)} pts · ${t.reward}</span></div>`).join('')}
      </div>
      <h3 class="vault-heading">Active contracts</h3>
      <div class="profile-list compact-list">${quests}</div>
      ${cosmeticRows('themes', 'Themes')}
      ${cosmeticRows('boards', 'Board frames')}
      ${cosmeticRows('trails', 'Line-clear trails')}
      <div class="overlay-actions" style="margin-top:14px">
        <button id="vaultBackBtn" class="primary-btn" type="button">Back</button>
        <button id="vaultCoachBtn" class="secondary-btn" type="button">Coach</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-shop-type]').forEach((btn) => {
      btn.addEventListener('click', () => buyCosmetic(btn.dataset.shopType, btn.dataset.shopId));
    });
    $('vaultBackBtn').addEventListener('click', homeOverlay);
    $('vaultCoachBtn').addEventListener('click', showCoachOverlay);
  }

  function showCoachOverlay() {
    const rank = rankForXP(profile.xp);
    const bestMode = Object.entries(profile.bestByMode || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0] || ['endurance', 0];
    const linesPerRun = profile.runs ? Math.round(profile.totalLines / profile.runs) : 0;
    const suggestions = [];
    if ((profile.ritual?.streak || 0) < 3) suggestions.push('Run Daily Rift three days in a row to unlock stronger ritual retention and shard flow.');
    if (rank < 4) suggestions.push('Farm Endurance missions until Rank 4; the starter shield makes paid-feeling runs less punishing.');
    if (linesPerRun < 18) suggestions.push('Use Zen Flow to practice stacking without harsh top-outs, then return to Blitz for score attacks.');
    if (ownedCosmeticCount() < 3) suggestions.push('Complete contracts and buy two cosmetics; owned cosmetics make the profile feel worth keeping.');
    if (!suggestions.length) suggestions.push('You are in the core loop now: chase weekly contracts, build shards, and rotate moods for different sessions.');
    setOverlay(`
      <p class="eyebrow">Local Rift Coach</p>
      <h2>Next Best Moves</h2>
      <p>This is an offline stats coach. It reads local progress and gives practical targets without needing a server or AI bill.</p>
      <div class="ritual-strip">
        <span><b>${rank}</b>Rank</span>
        <span><b>${formatNumber(bestMode[1])}</b>Best ${MODES[bestMode[0]]?.label || bestMode[0]}</span>
        <span><b>${linesPerRun}</b>Lines/run</span>
      </div>
      <div class="profile-list">
        ${suggestions.map((tip, idx) => `<div class="profile-row"><b>Directive ${idx + 1}</b><span>${tip}</span></div>`).join('')}
        <div class="profile-row"><b>Premium hook</b><span>The $13/year version should sell cloud sync, seasonal drops, exclusive calm audio packs, and cross-device profile protection — not pay-to-win power.</span></div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="coachBackBtn" class="primary-btn" type="button">Back</button>
        <button id="coachVaultBtn" class="secondary-btn" type="button">Season Vault</button>
      </div>
    `);
    $('coachBackBtn').addEventListener('click', homeOverlay);
    $('coachVaultBtn').addEventListener('click', showSeasonOverlay);
  }

  function showComfortOverlay() {
    const toggles = [
      ['reduceMotion', 'Reduce Motion', 'Softens ambient animation and particle intensity.'],
      ['comfortAssist', 'Comfort Assist', 'Adds clearer contrast and gentler visual pressure.'],
      ['highContrast', 'High Contrast', 'Improves board readability for bright rooms.'],
      ['leftHanded', 'Left-Handed Controls', 'Mirrors the touch-control rail for left-hand play.'],
      ['largeControls', 'Large Controls', 'Makes bottom controls easier to hit on phones.'],
    ];
    setOverlay(`
      <p class="eyebrow">Comfort Lab</p>
      <h2>Make It Playable for Hours</h2>
      <p>These settings are retention features. A paid mobile ritual game needs comfort, readability, and one-handed control options.</p>
      <div class="profile-list">
        ${toggles.map(([key, name, desc]) => `<button class="profile-row toggle-setting ${profile.settings?.[key] ? 'done' : ''}" data-setting="${key}" type="button"><b>${profile.settings?.[key] ? '✅' : '☐'} ${name}</b><span>${desc}</span></button>`).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="comfortBackBtn" class="primary-btn" type="button">Back</button>
        <button id="comfortMoodBtn" class="secondary-btn" type="button">Mood Deck</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-setting]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.setting;
        profile.settings[key] = !profile.settings[key];
        saveProfile();
        showComfortOverlay();
      });
    });
    $('comfortBackBtn').addEventListener('click', showControlsOverlay);
    $('comfortMoodBtn').addEventListener('click', () => showMoodOverlay('controls'));
  }

  function showPassOverlay() {
    setOverlay(`
      <p class="eyebrow">Rift Pass value model</p>
      <h2>$13/year should feel obvious</h2>
      <p>This build is structured like a premium ritual game: daily challenge, persistent rank, achievements, offline install, mood audio, Zen Flow, contracts, Season Vault cosmetics, save export, and comfort controls without gambling mechanics.</p>
      <div class="ritual-strip">
        <span><b>${profile.ritual?.streak || 0}</b>Current streak</span>
        <span><b>${profile.ritual?.bestStreak || 0}</b>Best streak</span>
        <span><b>${profile.ritual?.moodRuns || 0}</b>Mood runs</span>
      </div>
      <div class="pass-grid">
        <div class="pass-card"><strong>Now playable</strong><b>Mood Deck</b><span>Five offline binaural-style ambience loops with volume, haptics, and SFX controls.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Daily Ritual</b><span>Seeded Daily Rift modifiers, streak tracking, rank XP, and shard rewards.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Season Vault</b><span>Shard cosmetics, daily contracts, weekly quests, season tiers, and premium-feeling unlock loops.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Rift Academy</b><span>Onboarding lessons with rewards, designed to make first-hour retention less confusing.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Rival Runs</b><span>Score targets that create practical goals without needing live leaderboards yet.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Prestige Ascension</b><span>Rank 13 reset loop with permanent bonuses for long-term players.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Campaign Map</b><span>Eight guided progression nodes create chapter goals beyond endless high score chasing.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Sanctuary</b><span>Players spend shards on calm artifacts that generate serenity and reinforce daily return behavior.</span></div>
        <div class="pass-card"><strong>Now playable</strong><b>Ritual Plans</b><span>One-tap mood and mode presets make the game feel like a personalized focus toy.</span></div>
        <div class="pass-card"><strong>Playable</strong><b>Rift Relics</b><span>Earned permanent relics let players tune core chance, rift charge, gravity, XP, score, or shard yield.</span></div>
        <div class="pass-card"><strong>Playable</strong><b>Run Lab</b><span>Optional modifiers add fresh risk/reward runs without requiring online live ops.</span></div>
        <div class="pass-card"><strong>Playable</strong><b>Mode Mastery</b><span>Each mode has its own long-tail mastery track so every session contributes to progression.</span></div>
        <div class="pass-card"><strong>Playable</strong><b>Ritual Ops</b><span>Daily Signal Chest, rotating Rift Weather, Focus Cards, and saved launch loadouts make the game feel alive while staying offline.</span></div>
        <div class="pass-card"><strong>Playable</strong><b>Pilot Identity</b><span>Earned titles, emblems, callsign, and profile identity make players feel ownership.</span></div>
        <div class="pass-card"><strong>Playable</strong><b>Weekly League</b><span>Offline weekly score ladder gives score-chasers a fresh return loop.</span></div>
        <div class="pass-card"><strong>Playable</strong><b>Rift Codex</b><span>Collection archive tracks discovered pieces, modes, and power cores.</span></div>
        <div class="pass-card"><strong>Expansion slot</strong><b>Cloud Sync</b><span>Hook this to your auth/payment layer later for paid accounts, device sync, leaderboards, subscriber cosmetics, and cross-device saves.</span></div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="passBackBtn" class="primary-btn" type="button">Back</button>
        <button id="passMoodBtn" class="secondary-btn" type="button">Mood Deck</button>
        <button id="passFocusBtn" class="secondary-btn" type="button">Focus Ritual</button>
      </div>
    `);
    $('passBackBtn').addEventListener('click', homeOverlay);
    $('passMoodBtn').addEventListener('click', () => showMoodOverlay('home'));
    $('passFocusBtn')?.addEventListener('click', showFocusOverlay);
  }



  function campaignRow(node) {
    const done = Boolean(profile.campaign?.completed?.[node.id]);
    const active = profile.campaign?.active === node.id;
    return `<button class="profile-row campaign-row ${done ? 'done' : ''} ${active ? 'active' : ''}" data-campaign="${node.id}" type="button"><b>${done ? '✅' : active ? '▶' : '☐'} ${node.title}</b><span>${MODES[node.mode].label}: ${formatNumber(node.targetScore)} score + ${node.targetLines} lines. ${node.desc} Reward: +${node.rewardXP} XP / +${node.rewardShards} shards.</span></button>`;
  }

  function showCampaignOverlay() {
    const active = activeCampaignNode();
    setOverlay(`
      <p class="eyebrow">Gravity Protocol campaign</p>
      <h2>Campaign Map</h2>
      <p>These chapter nodes give serious players a reason to keep playing beyond raw score. Select a node, start its mode, and clear the target to earn permanent rewards.</p>
      <div class="ritual-strip">
        <span><b>${profile.campaign?.completedCount || 0}/${CAMPAIGN_NODES.length}</b>Nodes</span>
        <span><b>${active ? active.title : 'None'}</b>Active</span>
        <span><b>${formatNumber(profile.shards)}</b>Shards</span>
      </div>
      <div class="profile-list compact-list">${CAMPAIGN_NODES.map(campaignRow).join('')}</div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="campaignStartBtn" class="primary-btn" type="button">Start Active Node</button>
        <button id="campaignBackBtn" class="secondary-btn" type="button">Back</button>
        <button id="campaignCoachBtn" class="secondary-btn" type="button">Coach</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-campaign]').forEach((btn) => {
      btn.addEventListener('click', () => {
        profile.campaign.active = btn.dataset.campaign;
        saveProfile();
        showCampaignOverlay();
      });
    });
    $('campaignStartBtn').addEventListener('click', () => {
      const node = activeCampaignNode() || CAMPAIGN_NODES.find((item) => !profile.campaign.completed[item.id]) || CAMPAIGN_NODES[0];
      profile.campaign.active = node.id;
      selectedMode = node.mode;
      saveProfile();
      startRun(node.mode);
    });
    $('campaignBackBtn').addEventListener('click', homeOverlay);
    $('campaignCoachBtn').addEventListener('click', showCoachOverlay);
  }

  function buySanctuaryItem(id) {
    const item = SANCTUARY_ITEMS[id];
    if (!item) return;
    if (!profile.sanctuary) profile.sanctuary = { items: {}, serenity: 0, lastAccrual: Date.now(), breathSessions: 0, sleepTimerUses: 0 };
    if (profile.sanctuary.items[id]) {
      showToast(`${item.name} already placed`);
      return;
    }
    if (profile.shards < item.cost) {
      showToast(`Need ${item.cost - profile.shards} more shards`);
      return;
    }
    profile.shards -= item.cost;
    profile.sanctuary.items[id] = true;
    unlock('garden_seed');
    if (id === 'crown') unlock('garden_crown');
    saveProfile();
    showSanctuaryOverlay();
  }

  function convertSerenity() {
    accrueSanctuary();
    const serenity = Number(profile.sanctuary?.serenity || 0);
    if (serenity < 20) {
      showToast('Need 20 serenity to convert');
      return;
    }
    const spend = Math.min(serenity, 120);
    const shards = Math.floor(spend / 20);
    profile.sanctuary.serenity -= shards * 20;
    profile.shards += shards;
    saveProfile();
    showToast(`Converted serenity into +${shards} shards`);
    showSanctuaryOverlay();
  }

  function startBreathSession() {
    profile.settings.breathCoach = true;
    profile.sanctuary.breathSessions = Number(profile.sanctuary?.breathSessions || 0) + 1;
    profile.sanctuary.serenity = Number(profile.sanctuary?.serenity || 0) + 3;
    if (profile.sanctuary.breathSessions >= 5) unlock('breath_5');
    saveProfile();
    showToast('Breath coach armed: inhale 4, hold 2, exhale 6');
    showSanctuaryOverlay();
  }

  function showSanctuaryOverlay() {
    accrueSanctuary();
    const rate = sanctuaryRate();
    const owned = profile.sanctuary?.items || {};
    setOverlay(`
      <p class="eyebrow">Relaxed retention layer</p>
      <h2>Rift Sanctuary</h2>
      <p>A calm progression garden gives paying players a reason to return even when they do not want a hard run. Artifacts generate serenity while the app is away, capped locally for fairness.</p>
      <div class="ritual-strip">
        <span><b>${formatNumber(profile.sanctuary?.serenity || 0)}</b>Serenity</span>
        <span><b>${rate}/hr</b>Rate</span>
        <span><b>${Object.values(owned).filter(Boolean).length}/${Object.keys(SANCTUARY_ITEMS).length}</b>Artifacts</span>
      </div>
      <div class="sanctuary-orb" aria-hidden="true"><span>inhale</span><b>4 · 2 · 6</b></div>
      <div class="shop-grid">
        ${Object.entries(SANCTUARY_ITEMS).map(([id, item]) => `<button class="shop-card ${owned[id] ? 'equipped' : ''}" data-sanctuary="${id}" type="button"><b>${owned[id] ? 'Placed · ' : ''}${item.name}</b><span>${item.desc}</span><em>${owned[id] ? `${item.serenityPerHour}/hr serenity` : `${item.cost} shards · ${item.serenityPerHour}/hr`}</em></button>`).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="sanctuaryBreathBtn" class="primary-btn" type="button">Start Breath Coach</button>
        <button id="sanctuaryConvertBtn" class="secondary-btn" type="button">Convert Serenity</button>
        <button id="sanctuaryRitualBtn" class="secondary-btn" type="button">Ritual Plans</button>
        <button id="sanctuaryBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-sanctuary]').forEach((btn) => btn.addEventListener('click', () => buySanctuaryItem(btn.dataset.sanctuary)));
    $('sanctuaryBreathBtn').addEventListener('click', startBreathSession);
    $('sanctuaryConvertBtn').addEventListener('click', convertSerenity);
    $('sanctuaryRitualBtn').addEventListener('click', showRitualOverlay);
    $('sanctuaryBackBtn').addEventListener('click', homeOverlay);
  }

  function showRitualOverlay() {
    const current = activeRitualPlan();
    setOverlay(`
      <p class="eyebrow">One-tap session design</p>
      <h2>Ritual Plans</h2>
      <p>Ritual Plans pair a game mode with a mood tone. This makes the product feel personal: calm run, score run, night run, or hard run without menu friction.</p>
      <div class="ritual-strip">
        <span><b>${current.name}</b>Active</span>
        <span><b>${AUDIO_MOODS[current.mood].label}</b>Mood</span>
        <span><b>${MODES[current.mode].label}</b>Mode</span>
      </div>
      <div class="shop-grid">
        ${Object.entries(RITUAL_PLANS).map(([id, plan]) => `<button class="shop-card ${profile.settings?.ritualPlan === id ? 'equipped' : ''}" data-ritual-plan="${id}" type="button"><b>${plan.name}</b><span>${plan.desc}</span><em>${AUDIO_MOODS[plan.mood].beat} · ${MODES[plan.mode].label}</em></button>`).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="ritualStartBtn" class="primary-btn" type="button">Apply + Start</button>
        <button id="ritualMoodBtn" class="secondary-btn" type="button">Mood Deck</button>
        <button id="ritualBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-ritual-plan]').forEach((btn) => {
      btn.addEventListener('click', () => {
        profile.settings.ritualPlan = btn.dataset.ritualPlan;
        unlock('ritual_plan');
        saveProfile();
        showRitualOverlay();
      });
    });
    $('ritualStartBtn').addEventListener('click', () => {
      const plan = activeRitualPlan();
      profile.settings.mood = plan.mood;
      selectedMode = plan.mode;
      saveProfile();
      applyMoodAudio();
      startRun(plan.mode);
    });
    $('ritualMoodBtn').addEventListener('click', () => showMoodOverlay('home'));
    $('ritualBackBtn').addEventListener('click', homeOverlay);
  }

  function academyRow(lesson) {
    const done = Boolean(profile.academy?.completed?.[lesson.id]);
    return `<button class="profile-row academy-row ${done ? 'done' : ''}" data-lesson="${lesson.id}" type="button"><b>${done ? '✅' : '☐'} ${lesson.title}</b><span>${lesson.desc} Reward: +${lesson.rewardXP} XP / +${lesson.rewardShards} shards.</span></button>`;
  }

  function completeAcademyLesson(id) {
    const lesson = ACADEMY_LESSONS.find((item) => item.id === id);
    if (!lesson || profile.academy.completed[id]) return;
    profile.academy.completed[id] = todayKey();
    profile.academy.completedCount = Object.keys(profile.academy.completed).length;
    profile.xp += lesson.rewardXP;
    profile.shards += lesson.rewardShards;
    if (profile.academy.completedCount >= ACADEMY_LESSONS.length) unlock('academy_complete');
    saveProfile();
    showToast(`Academy cleared: ${lesson.title}`);
    showAcademyOverlay();
  }

  function showAcademyOverlay() {
    const complete = profile.academy?.completedCount || 0;
    setOverlay(`
      <p class="eyebrow">Rift Academy</p>
      <h2>Onboard Players Fast</h2>
      <p>Paid mobile games need a clean first-hour path. These lessons explain the depth, award progress, and push players into modes that match their mood.</p>
      <div class="ritual-strip">
        <span><b>${complete}/${ACADEMY_LESSONS.length}</b>Lessons</span>
        <span><b>${formatNumber(profile.shards)}</b>Shards</span>
        <span><b>${rankForXP(profile.xp)}</b>Rank</span>
      </div>
      <div class="profile-list">
        ${ACADEMY_LESSONS.map(academyRow).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="academyBackBtn" class="primary-btn" type="button">Back</button>
        <button id="academyZenBtn" class="secondary-btn" type="button">Start Zen</button>
        <button id="academyRivalsBtn" class="secondary-btn" type="button">Rivals</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-lesson]').forEach((btn) => btn.addEventListener('click', () => completeAcademyLesson(btn.dataset.lesson)));
    $('academyBackBtn').addEventListener('click', homeOverlay);
    $('academyZenBtn').addEventListener('click', () => { selectedRival = ''; localStorage.removeItem('nrb_selected_rival'); startRun('zen'); });
    $('academyRivalsBtn').addEventListener('click', showRivalsOverlay);
  }

  function rivalCard(rival) {
    const beaten = Boolean(profile.rivals?.beaten?.[rival.id]);
    const active = selectedRival === rival.id;
    const mode = MODES[rival.mode]?.label || rival.mode;
    return `<button class="rival-card ${beaten ? 'done' : ''} ${active ? 'equipped' : ''}" data-rival="${rival.id}" type="button"><b>${beaten ? '✅' : active ? '⚡' : '☐'} ${rival.name}</b><span>${rival.desc}</span><em>${mode} · Target ${formatNumber(rivalryScoreTarget(rival))} · +${rival.rewardXP} XP / +${rival.rewardShards} shards</em></button>`;
  }

  function showRivalsOverlay() {
    const active = activeRival();
    setOverlay(`
      <p class="eyebrow">Rival Runs</p>
      <h2>${active ? active.name : 'Choose a Target'}</h2>
      <p>Rivals give players a clear reason to run again. Pick a target, start the matching mode, and beat the score for one-time rewards.</p>
      <div class="shop-grid rival-grid">
        ${RIVAL_PROFILES.map(rivalCard).join('')}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="rivalStartBtn" class="primary-btn" type="button">Start Rival</button>
        <button id="rivalClearBtn" class="secondary-btn" type="button">Clear Rival</button>
        <button id="rivalBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    ui.overlayPanel.querySelectorAll('[data-rival]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedRival = btn.dataset.rival;
        localStorage.setItem('nrb_selected_rival', selectedRival);
        showRivalsOverlay();
      });
    });
    $('rivalStartBtn').addEventListener('click', () => {
      const rival = activeRival();
      if (!rival) { showToast('Pick a rival first'); return; }
      startRun(rival.mode);
    });
    $('rivalClearBtn').addEventListener('click', () => {
      selectedRival = '';
      localStorage.removeItem('nrb_selected_rival');
      showRivalsOverlay();
    });
    $('rivalBackBtn').addEventListener('click', homeOverlay);
  }

  function canPrestige() {
    return rankForXP(profile.xp) >= 13;
  }

  function showPrestigeOverlay() {
    const rank = rankForXP(profile.xp);
    const level = prestigeLevel();
    const ready = canPrestige();
    setOverlay(`
      <p class="eyebrow">Prestige Ascension</p>
      <h2>Reset Into Power</h2>
      <p>Prestige gives long-term players a real reason to keep playing after rank grind slows down. It keeps best scores, cosmetics, achievements, rivals, and vault progress.</p>
      <div class="profile-list">
        <div class="profile-row"><b>Current Prestige</b><span>Level ${level}. Permanent bonuses: +${level * 13}% XP, +${level * 3}% score pressure bonus, +${level}% core chance.</span></div>
        <div class="profile-row"><b>Requirement</b><span>Reach Rank 13. Current rank: ${rank}. ${ready ? 'Ascension available now.' : 'Keep clearing contracts and Rival Runs.'}</span></div>
        <div class="profile-row"><b>What resets</b><span>XP resets to 0. Shards are reduced by 13 as a ritual cost when available. Cosmetics and records stay intact.</span></div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="prestigeDoBtn" class="primary-btn" type="button" ${ready ? '' : 'disabled'}>${ready ? 'Ascend' : 'Locked'}</button>
        <button id="prestigeBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    $('prestigeDoBtn').addEventListener('click', () => {
      if (!canPrestige()) { showToast('Reach Rank 13 first'); return; }
      if (!confirm('Prestige now? XP resets, permanent bonuses increase, records stay.')) return;
      profile.prestige.level = prestigeLevel() + 1;
      profile.prestige.lastAt = new Date().toISOString();
      profile.xp = 0;
      profile.shards = Math.max(0, Number(profile.shards || 0) - 13);
      if (profile.prestige.level >= 1) unlock('prestige_1');
      saveProfile();
      showPrestigeOverlay();
    });
    $('prestigeBackBtn').addEventListener('click', homeOverlay);
  }

  function showFocusOverlay() {
    const minutes = Number(profile.focus?.minutes || 0);
    setOverlay(`
      <p class="eyebrow">Focus Ritual</p>
      <h2>Play Like Meditation</h2>
      <p>Use this as the subscription-grade wellness angle: a calm falling-block ritual with mood loops, gentle controls, and daily streaks. Log a 30-minute ritual after a real long session.</p>
      <div class="profile-list">
        <div class="profile-row"><b>Logged Focus</b><span>${minutes} total minutes across ${profile.focus?.sessions || 0} sessions.</span></div>
        <div class="profile-row"><b>Best Pairing</b><span>Zen Flow + Theta Drift or Rift Spa + large controls. This is the hour-long retention lane.</span></div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="focusLogBtn" class="primary-btn" type="button">Log 30 Min</button>
        <button id="focusZenBtn" class="secondary-btn" type="button">Start Zen</button>
        <button id="focusBackBtn" class="secondary-btn" type="button">Back</button>
      </div>
    `);
    $('focusLogBtn').addEventListener('click', () => {
      profile.focus.minutes = Number(profile.focus?.minutes || 0) + 30;
      profile.focus.sessions = Number(profile.focus?.sessions || 0) + 1;
      profile.focus.lastSession = new Date().toISOString();
      if (profile.focus.minutes >= 30) unlock('focus_30');
      profile.xp += 180;
      profile.shards += 6;
      saveProfile();
      showFocusOverlay();
    });
    $('focusZenBtn').addEventListener('click', () => { selectedRival = ''; localStorage.removeItem('nrb_selected_rival'); startRun('zen'); });
    $('focusBackBtn').addEventListener('click', homeOverlay);
  }

  function showChoiceOverlay(choices) {
    setOverlay(`
      <p class="eyebrow">Anomaly draft</p>
      <h2>Choose Power</h2>
      <p>The rift is mutating. Pick one upgrade for this run.</p>
      <div class="choice-list">
        ${choices.map((choice, idx) => `
          <button class="choice-card" data-choice="${idx}" type="button"><b>${choice.name}</b><span>${choice.desc}</span></button>
        `).join('')}
      </div>
    `);
    ui.overlayPanel.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => chooseAnomaly(choices[Number(btn.dataset.choice)]));
    });
  }

  function showGameOver(reason, reward) {
    const rankLine = reward.newRank > reward.oldRank ? `<div class="profile-row"><b>Rank Up</b><span>${reward.oldRank} → ${reward.newRank}. New passive power unlocked.</span></div>` : '';
    const rivalLine = reward.rivalWin ? `<div class="profile-row done"><b>Rival Beaten</b><span>${state.rival?.name || 'Target'} cleared. Rival rewards added to this run.</span></div>` : state.rival ? `<div class="profile-row"><b>Rival Target</b><span>${state.rival.name}: ${formatNumber(state.score)} / ${formatNumber(rivalryScoreTarget(state.rival))}.</span></div>` : '';
    const modifierLine = state.runModifier && state.runModifier.id !== 'none' ? `<div class="profile-row done"><b>Run Lab</b><span>${state.runModifier.name} completed. Modified runs cleared: ${profile.runLab?.completions || 0}.</span></div>` : '';
    const relicLine = state.relic ? `<div class="profile-row"><b>Relic</b><span>${state.relic.name} was equipped for this run.</span></div>` : '';
    const masteryLine = `<div class="profile-row"><b>Mode Mastery</b><span>${MODES[state.mode].label} mastery level ${masteryLevelFromXP(masteryForMode(state.mode).xp)}.</span></div>`;
    const cardLine = reward.cardWin ? `<div class="profile-row done"><b>Focus Card Cleared</b><span>${reward.focusCard?.name || 'Card'} paid out with this run.</span></div>` : reward.focusCard ? `<div class="profile-row"><b>Focus Card</b><span>${reward.focusCard.name}: ${reward.focusCard.target}.</span></div>` : '';
    const weatherLine = state.riftEvent ? `<div class="profile-row"><b>Rift Weather</b><span>${state.riftEvent.name}: ${state.riftEvent.desc}</span></div>` : '';
    const campaignLine = reward.campaignWin ? `<div class="profile-row done"><b>Campaign Node Cleared</b><span>${state.campaignNode?.title || 'Node'} rewards added. Map progress now ${profile.campaign?.completedCount || 0}/${CAMPAIGN_NODES.length}.</span></div>` : state.campaignNode ? `<div class="profile-row"><b>Campaign Target</b><span>${state.campaignNode.title}: ${formatNumber(state.score)} / ${formatNumber(state.campaignNode.targetScore)} score and ${state.lines}/${state.campaignNode.targetLines} lines.</span></div>` : '';
    const drillLine = reward.drillReward?.won ? `<div class="profile-row done"><b>Coach Drill Cleared</b><span>${reward.drillReward.drill.name}: +${reward.drillReward.xp} XP / +${reward.drillReward.shards} shards.</span></div>` : `<div class="profile-row"><b>Coach Advice</b><span>${coachAdvice()}</span></div>`;
    const leagueLine = `<div class="profile-row"><b>Weekly League</b><span>${leagueTierInfo().name}: ${formatNumber(profile.league?.score || 0)} score this week.</span></div>`;
    const chronicleLine = reward.chronicleReward?.arc ? (reward.chronicleReward.won ? `<div class="profile-row done"><b>Chronicle Arc Cleared</b><span>${reward.chronicleReward.arc.title}: +${reward.chronicleReward.xp} XP / +${reward.chronicleReward.shards} shards.</span></div>` : `<div class="profile-row"><b>Chronicle Arc</b><span>${reward.chronicleReward.arc.title}: ${reward.chronicleReward.arc.goal}.</span></div>`) : '';
    const companionLine = reward.companionReward?.companion ? `<div class="profile-row done"><b>${reward.companionReward.companion.name}</b><span>Bond gained +${reward.companionReward.affinity}. Total affinity: ${companionAffinity(profile.companions.active)}.</span></div>` : '';
    const challengeLine = reward.challengeReward?.challenge ? (reward.challengeReward.won ? `<div class="profile-row done"><b>Challenge Forge Cleared</b><span>${reward.challengeReward.challenge.name}: +${reward.challengeReward.xp} XP / +${reward.challengeReward.shards} shards.</span></div>` : `<div class="profile-row"><b>Challenge Forge</b><span>${reward.challengeReward.challenge.name}: ${formatNumber(state.score)} / ${formatNumber(reward.challengeReward.challenge.targetScore)} score.</span></div>`) : '';
    const protocolLine = reward.protocolReward?.step ? (reward.protocolReward.won ? `<div class="profile-row done"><b>Protocol Step Cleared</b><span>${reward.protocolReward.step.title}: +${reward.protocolReward.xp} XP / +${reward.protocolReward.shards} shards.</span></div>` : `<div class="profile-row"><b>Protocol Step</b><span>${reward.protocolReward.step.title}: ${reward.protocolReward.step.goal}.</span></div>`) : '<div class="profile-row done"><b>Protocol</b><span>All 13 steps cleared.</span></div>';
    const pulseLine = state.pulseGoal?.complete ? `<div class="profile-row done"><b>Pulse Goal</b><span>${state.pulseGoal.text} paid +${state.pulseGoal.reward} score.</span></div>` : state.pulseGoal ? `<div class="profile-row"><b>Pulse Goal</b><span>${state.pulseGoal.text} was armed for this run.</span></div>` : '';
    const v12Line = reward.v12Reward ? `<div class="profile-row done"><b>v12 Mood/Crown</b><span>+${reward.v12Reward.gainedMoodXP} mood XP${reward.v12Reward.trialReward.won ? ` · Crown Trial cleared: ${reward.v12Reward.trialReward.trial.name}` : ''} · Founder Score ${formatNumber(reward.v12Reward.founderScore)}</span></div>` : '';
    const v13Line = reward.v13Reward ? `<div class="profile-row done"><b>v13 Quality</b><span>+${reward.v13Reward.qualityGain} session quality · Value Score ${formatNumber(reward.v13Reward.valueScore)}</span></div>` : '';
    setOverlay(`
      <p class="eyebrow">${reason}</p>
      <h2>${reward.newBest ? 'New Record' : 'Run Complete'}</h2>
      <p>Score <b>${formatNumber(state.score)}</b>. Lines <b>${state.lines}</b>. Best combo <b>${state.bestCombo}</b>. Missions <b>${state.stats.missions}</b>.</p>
      <div class="profile-list">
        <div class="profile-row"><b>Rewards</b><span>+${formatNumber(reward.xpGain)} XP and +${formatNumber(reward.shardGain)} shards earned.</span></div>
        ${rankLine}
        ${rivalLine}
        ${campaignLine}
        ${cardLine}
        ${weatherLine}
        ${modifierLine}
        ${relicLine}
        ${masteryLine}
        ${drillLine}
        ${leagueLine}
        ${challengeLine}
        ${protocolLine}
        ${chronicleLine}
        ${companionLine}
        ${pulseLine}
        ${v12Line}
        <div class="profile-row"><b>Retention Loop</b><span>Shards, achievements, mood runs, and daily streaks persist locally. Rank passives make future runs stronger.</span></div>
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="againBtn" class="primary-btn" type="button">Run Again</button>
        <button id="aftercareRunBtn" class="secondary-btn" type="button">Aftercare</button>
        <button id="homeBtn" class="secondary-btn" type="button">Modes</button>
        <button id="rivalsAfterBtn" class="secondary-btn" type="button">Rivals</button>
      </div>
    `);
    $('againBtn').addEventListener('click', () => startRun(selectedMode));
    $('homeBtn').addEventListener('click', homeOverlay);
    $('aftercareRunBtn')?.addEventListener('click', showAftercareOverlay);
    $('rivalsAfterBtn')?.addEventListener('click', showRivalsOverlay);
  }

  function showProfileOverlay() {
    const rank = rankForXP(profile.xp);
    const next = nextRankXP(rank);
    const done = Object.keys(profile.achievements).length;
    const achievements = Object.entries(ACHIEVEMENTS).map(([id, item]) => {
      const unlocked = Boolean(profile.achievements[id]);
      return `<div class="profile-row"><b>${unlocked ? '✅' : '☐'} ${item[0]}</b><span>${item[1]} ${unlocked ? '' : `Reward: ${item[2]} shards.`}</span></div>`;
    }).join('');
    setOverlay(`
      <p class="eyebrow">Pilot profile</p>
      <h2>Rank ${rank}</h2>
      <p>${formatNumber(profile.xp)} XP. Next rank at ${formatNumber(next)} XP. ${formatNumber(profile.shards)} shards banked.</p>
      <div class="profile-list">
        <div class="profile-row"><b>Season</b><span>${SEASON.name}. Tier ${seasonTier()}. ${formatNumber(seasonPoints())} season points. ${profile.quests?.completedCount || 0} contracts completed.</span></div>
        <div class="profile-row"><b>Passive Unlocks</b><span>Rank 3: higher core chance. Rank 4: start with shield. Rank 6: start with rift charge. Rank 8: richer core odds.</span></div>
        <div class="profile-row"><b>Lifetime</b><span>${profile.runs} runs, ${profile.totalLines} lines, ${profile.totalSurges} surges, ${done}/${Object.keys(ACHIEVEMENTS).length} achievements.</span></div>
        <div class="profile-row"><b>Ritual Stats</b><span>${profile.ritual?.streak || 0} day current streak, ${profile.ritual?.bestStreak || 0} best streak, ${profile.ritual?.moodRuns || 0} mood-audio runs.</span></div>
        <div class="profile-row"><b>Academy / Rivals / Prestige</b><span>${profile.academy?.completedCount || 0}/${ACADEMY_LESSONS.length} lessons, ${profile.rivals?.beatenCount || 0}/${RIVAL_PROFILES.length} rivals beaten, prestige ${prestigeLevel()}.</span></div>
        <div class="profile-row"><b>Campaign / Sanctuary</b><span>${profile.campaign?.completedCount || 0}/${CAMPAIGN_NODES.length} map nodes, ${formatNumber(profile.sanctuary?.serenity || 0)} serenity, ${sanctuaryRate()}/hr sanctuary rate.</span></div>
        <div class="profile-row"><b>Relics / Lab / Mastery</b><span>${relicUnlockCount()}/${Object.keys(RIFT_RELICS).length} relics, ${profile.runLab?.completions || 0} modified runs, ${MASTERY_MODES.map((mode) => `${MODES[mode].label} Lv ${masteryLevelFromXP(masteryForMode(mode).xp)}`).join(' · ')}.</span></div>
        <div class="profile-row"><b>Progression Systems</b><span>${skillOwnedCount()}/${Object.keys(SKILL_MATRIX).length} Skill Matrix nodes, ${profile.challengeForge?.clears || 0} Forge clears, ${profile.protocol?.completedCount || 0}/${PROTOCOL_STEPS.length} protocol lessons, ${profile.analytics?.runs?.length || 0} analytics runs logged.</span></div>
        <div class="profile-row"><b>v11 Systems</b><span>${activeCompanion().name} companion, ${profile.chronicle?.completedCount || 0}/${CHRONICLE_ARCS.length} Chronicle arcs, ${profile.aftercare?.recoveries || 0} recoveries, ${profile.memoryBank?.notes?.length || 0} run memories.</span></div>
        <div class="profile-row"><b>v13 Release Candidate</b><span>${profile.v13?.oathSigned ? 'Release oath signed' : 'Release oath pending'}, ${formatNumber(profile.v13?.sessionQuality || 0)} quality score, ${profile.v13?.founderKitClaimed ? 'Founder Kit claimed' : 'Founder Kit available'}.</span></div>
        ${achievements}
      </div>
      <div class="overlay-actions" style="margin-top:14px">
        <button id="profileBackBtn" class="primary-btn" type="button">Back</button>
        <button id="profileMoodBtn" class="secondary-btn" type="button">Mood</button>
        <button id="profileVaultBtn" class="secondary-btn" type="button">Vault</button>
        <button id="profileLiveOpsBtn" class="secondary-btn" type="button">Ritual Ops</button>
        <button id="profileExportBtn" class="secondary-btn" type="button">Export</button>
        <button id="profileImportBtn" class="secondary-btn" type="button">Import</button>
        <button id="profilePassBtn" class="secondary-btn" type="button">Rift Pass</button>
        <button id="profileAcademyBtn" class="secondary-btn" type="button">Academy</button>
        <button id="profilePrestigeBtn" class="secondary-btn" type="button">Prestige</button>
        <button id="profileCampaignBtn" class="secondary-btn" type="button">Map</button>
        <button id="profileSanctuaryBtn" class="secondary-btn" type="button">Sanctuary</button>
        <button id="profileRelicsBtn" class="secondary-btn" type="button">Relics</button>
        <button id="profileLabBtn" class="secondary-btn" type="button">Run Lab</button>
        <button id="profileMasteryBtn" class="secondary-btn" type="button">Mastery</button>
        <button id="profileLicenseBtn" class="secondary-btn" type="button">License</button>
        <button id="profileCodexBtn" class="secondary-btn" type="button">Codex</button>
        <button id="profileLeagueBtn" class="secondary-btn" type="button">League</button>
        <button id="profileDrillsBtn" class="secondary-btn" type="button">Drills</button>
        <button id="profileMatrixBtn" class="secondary-btn" type="button">Matrix</button>
        <button id="profileForgeBtn" class="secondary-btn" type="button">Forge</button>
        <button id="profileProtocolBtn" class="secondary-btn" type="button">Protocol</button>
        <button id="profileAnalyticsBtn" class="secondary-btn" type="button">Analytics</button>
        <button id="profileCompanionsBtn" class="secondary-btn" type="button">Companions</button>
        <button id="profileChronicleBtn" class="secondary-btn" type="button">Chronicle</button>
        <button id="profileMoodMasteryBtn" class="secondary-btn" type="button">Mood Mastery</button>
        <button id="profileCrownBtn" class="secondary-btn" type="button">Crown Trials</button>
        <button id="profileCuratorBtn" class="secondary-btn" type="button">Curator</button>
        <button id="profileReceiptsBtn" class="secondary-btn" type="button">Receipts</button>
        <button id="profileFinalBtn" class="secondary-btn" type="button">Final Pass</button>
        <button id="resetProfileBtn" class="secondary-btn" type="button">Reset</button>
      </div>
    `);
    $('profileBackBtn').addEventListener('click', () => {
      if (state.started && !state.gameOver) {
        state.paused = false;
        ui.overlay.classList.remove('active');
        lastTime = performance.now();
      } else homeOverlay();
    });
    $('profileMoodBtn')?.addEventListener('click', () => showMoodOverlay('home'));
    $('profileVaultBtn')?.addEventListener('click', showSeasonOverlay);
    $('profileLiveOpsBtn')?.addEventListener('click', showLiveOpsOverlay);
    $('profileExportBtn')?.addEventListener('click', exportProfile);
    $('profileImportBtn')?.addEventListener('click', importProfile);
    $('profilePassBtn')?.addEventListener('click', showPassOverlay);
    $('profileAcademyBtn')?.addEventListener('click', showAcademyOverlay);
    $('profilePrestigeBtn')?.addEventListener('click', showPrestigeOverlay);
    $('profileCampaignBtn')?.addEventListener('click', showCampaignOverlay);
    $('profileSanctuaryBtn')?.addEventListener('click', showSanctuaryOverlay);
    $('profileRelicsBtn')?.addEventListener('click', showRelicsOverlay);
    $('profileLabBtn')?.addEventListener('click', showRunLabOverlay);
    $('profileMasteryBtn')?.addEventListener('click', showMasteryOverlay);
    $('profileLicenseBtn')?.addEventListener('click', showLicenseOverlay);
    $('profileCodexBtn')?.addEventListener('click', showCodexOverlay);
    $('profileLeagueBtn')?.addEventListener('click', showLeagueOverlay);
    $('profileDrillsBtn')?.addEventListener('click', showDrillsOverlay);
    $('profileMatrixBtn')?.addEventListener('click', showSkillMatrixOverlay);
    $('profileForgeBtn')?.addEventListener('click', showChallengeForgeOverlay);
    $('profileProtocolBtn')?.addEventListener('click', showProtocolOverlay);
    $('profileAnalyticsBtn')?.addEventListener('click', showAnalyticsOverlay);
    $('profileCompanionsBtn')?.addEventListener('click', showCompanionsOverlay);
    $('profileChronicleBtn')?.addEventListener('click', showChronicleOverlay);
    $('profileMoodMasteryBtn')?.addEventListener('click', showMoodMasteryOverlay);
    $('profileCrownBtn')?.addEventListener('click', showCrownTrialsOverlay);
    $('profileCuratorBtn')?.addEventListener('click', showCuratorOverlay);
    $('profileReceiptsBtn')?.addEventListener('click', showReceiptsOverlay);
    $('profileFinalBtn')?.addEventListener('click', showFinalPassOverlay);
    $('resetProfileBtn').addEventListener('click', () => {
      if (!confirm('Reset local Neon Rift profile on this device?')) return;
      localStorage.removeItem('nrb_profile_v2');
      localStorage.removeItem('nrb_profile_v3');
      localStorage.removeItem('nrb_profile_v4');
      localStorage.removeItem('nrb_profile_v5');
      localStorage.removeItem('nrb_profile_v6');
      localStorage.removeItem('nrb_profile_v7');
      localStorage.removeItem('nrb_profile_v8');
      localStorage.removeItem('nrb_profile_v9');
      localStorage.removeItem('nrb_profile_v10');
      localStorage.removeItem('nrb_profile_v11');
      localStorage.removeItem('nrb_profile_v12');
      localStorage.removeItem('nrb_profile_v13');
      location.reload();
    });
  }

  function bindButtons() {
    bindRepeat(ui.leftBtn, () => move(-1), 180, 76);
    bindRepeat(ui.rightBtn, () => move(1), 180, 76);
    ui.rotateBtn.addEventListener('click', rotate);
    ui.dropBtn.addEventListener('click', hardDrop);
    ui.holdBtn.addEventListener('click', holdPiece);
    ui.riftBtn.addEventListener('click', activateRift);
    ui.riftMobileBtn.addEventListener('click', activateRift);
    ui.moodBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showMoodOverlay(state.started && !state.gameOver ? 'pause' : 'home');
    });
    ui.moodMiniBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showMoodOverlay(state.started && !state.gameOver ? 'pause' : 'home');
    });
    ui.moodSideBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showMoodOverlay(state.started && !state.gameOver ? 'pause' : 'home');
    });
    ui.pauseBtn.addEventListener('click', () => {
      if (!state.started || state.gameOver) return homeOverlay();
      if (state.paused) {
        state.paused = false;
        ui.overlay.classList.remove('active');
        lastTime = performance.now();
      } else showPauseOverlay();
    });
    ui.muteBtn.addEventListener('click', () => {
      state.muted = !state.muted;
      profile.settings.muted = state.muted;
      saveProfile();
      if (state.muted) stopMoodAudio();
      else applyMoodAudio();
      updateUI();
    });
    ui.profileBtn.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showProfileOverlay();
    });
    ui.seasonBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showSeasonOverlay();
    });
    ui.liveOpsBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showLiveOpsOverlay();
    });
    ui.academyBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showAcademyOverlay();
    });
    ui.rivalsBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showRivalsOverlay();
    });
    ui.mapBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showCampaignOverlay();
    });
    ui.sanctuaryBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showSanctuaryOverlay();
    });
    ui.relicsBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showRelicsOverlay();
    });
    ui.runLabBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showRunLabOverlay();
    });
    ui.licenseBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showLicenseOverlay();
    });
    ui.codexBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showCodexOverlay();
    });
    ui.leagueBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showLeagueOverlay();
    });
    ui.liveOpsSideBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showLiveOpsOverlay();
    });
    ui.academySideBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showAcademyOverlay();
    });
    ui.coachBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showCoachOverlay();
    });
    ui.matrixBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showSkillMatrixOverlay();
    });
    ui.forgeBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showChallengeForgeOverlay();
    });
    ui.protocolBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showProtocolOverlay();
    });
    ui.analyticsBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showAnalyticsOverlay();
    });
    ui.companionsBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showCompanionsOverlay();
    });
    ui.chronicleBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showChronicleOverlay();
    });
    ui.aftercareBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showAftercareOverlay();
    });
    ui.crownBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showCrownTrialsOverlay();
    });
    ui.curatorBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showCuratorOverlay();
    });
    ui.finalBtn?.addEventListener('click', () => {
      if (state.started && !state.gameOver) state.paused = true;
      showFinalPassOverlay();
    });

    window.addEventListener('keydown', (event) => {
      if (event.repeat && event.code !== 'ArrowDown') return;
      if (event.code === 'ArrowLeft') move(-1);
      if (event.code === 'ArrowRight') move(1);
      if (event.code === 'ArrowUp' || event.code === 'KeyX') rotate();
      if (event.code === 'ArrowDown') softDrop();
      if (event.code === 'Space') { event.preventDefault(); hardDrop(); }
      if (event.code === 'KeyC' || event.code === 'ShiftLeft') holdPiece();
      if (event.code === 'KeyR') activateRift();
      if (event.code === 'KeyO' && !state.started) showLiveOpsOverlay();
      if (event.code === 'KeyA' && !state.started) showAcademyOverlay();
      if (event.code === 'KeyV' && !state.started) showRivalsOverlay();
      if (event.code === 'KeyM' && !state.started) showCampaignOverlay();
      if (event.code === 'KeyS' && !state.started) showSanctuaryOverlay();
      if (event.code === 'KeyR' && !state.started) showRelicsOverlay();
      if (event.code === 'KeyL' && !state.started) showRunLabOverlay();
      if (event.code === 'KeyC' && !state.started) showCodexOverlay();
      if (event.code === 'KeyG' && !state.started) showLeagueOverlay();
      if (event.code === 'KeyP' || event.code === 'Escape') {
        if (state.started && !state.gameOver) showPauseOverlay();
      }
    });

    bindGestures();
  }

  function bindRepeat(button, action, delay, interval) {
    const stop = () => {
      clearTimeout(repeatDelayTimer);
      clearInterval(repeatTimer);
      repeatDelayTimer = null;
      repeatTimer = null;
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      stop();
      action();
      repeatDelayTimer = setTimeout(() => {
        repeatTimer = setInterval(action, interval);
      }, delay);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((name) => button.addEventListener(name, stop));
  }

  function bindGestures() {
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let startT = 0;
    let moved = false;

    ui.boardStage.addEventListener('pointerdown', (event) => {
      if (!state.started || state.gameOver || state.paused || state.pendingChoice) return;
      ui.boardStage.setPointerCapture?.(event.pointerId);
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      startT = performance.now();
      moved = false;
    });

    ui.boardStage.addEventListener('pointermove', (event) => {
      if (!canAct()) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 0.6) {
        const steps = Math.max(1, Math.min(3, Math.floor(Math.abs(dx) / 24)));
        for (let i = 0; i < steps; i += 1) move(dx > 0 ? 1 : -1);
        lastX = event.clientX;
        moved = true;
      }
      if (dy > 34 && Math.abs(dy) > Math.abs(dx)) {
        softDrop();
        lastY = event.clientY;
        moved = true;
      }
    });

    ui.boardStage.addEventListener('pointerup', (event) => {
      if (!canAct()) return;
      const totalX = event.clientX - startX;
      const totalY = event.clientY - startY;
      const elapsed = performance.now() - startT;
      if (totalY > 92 && Math.abs(totalY) > Math.abs(totalX) * 1.18) {
        hardDrop();
        return;
      }
      if (totalY < -70 && Math.abs(totalY) > Math.abs(totalX) * 1.05) {
        holdPiece();
        return;
      }
      if (!moved && elapsed < 320 && Math.abs(totalX) < 18 && Math.abs(totalY) < 18) rotate();
    });
  }

  function setupInstall() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      ui.installBtn.hidden = false;
    });
    ui.installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        showToast('Use browser menu: Add to Home Screen');
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      ui.installBtn.hidden = true;
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function init() {
    bindButtons();
    setupInstall();
    accrueSanctuary();
    saveProfile();
    ensureV11Profile();
    ensureV13Profile();
    renderProfileChips();
    ensureAmbientAudio();
    applyV12RunSystems();
    state.mission = defaultMission(state.rng, state.level);
    homeOverlay();
    updateUI();
    draw();
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('pagehide', () => cancelAnimationFrame(raf));
  init();
})();
