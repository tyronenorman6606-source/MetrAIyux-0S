import { archetypes, questTemplates, realms, starterAffirmations } from '../data/over3arthContent';

export const todayKey = () => new Date().toISOString().slice(0, 10);
export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
export const STATE_SCHEMA_VERSION = 7;

export function createInitialState() {
  return {
    hydrated: false,
    profile: {
      name: '',
      worldName: 'New Earth Prime',
      archetype: 'sovereign',
      primeIntention: 'I am forging a life that matches my highest standard.',
      onboardingComplete: false,
      createdAt: new Date().toISOString()
    },
    goals: [],
    quests: [],
    notes: [],
    rituals: [],
    affirmations: [],
    ledger: [],
    reviews: [],
    contracts: [],
    recoveryRites: [],
    shareCards: [],
    launchSignals: [],
    focusSessions: [],
    anchors: [],
    epochs: [],
    allies: [],
    canon: [],
    settings: {
      sound: false,
      intensity: 'mythic',
      reminderHour: '08:00',
      notificationPermission: 'default',
      weeklyReviewDay: 'SUN',
      plan: 'founder-preview',
      selectedPlan: 'forge',
      focusDuration: 25,
      focusSound: false
    },
    schemaVersion: STATE_SCHEMA_VERSION
  };
}

export function getArchetype(id) {
  return archetypes.find((item) => item.id === id) || archetypes[0];
}

export function getRealm(id) {
  return realms.find((item) => item.id === id) || realms[0];
}

export function addLedgerEntry(state, type, title, detail = '') {
  return {
    ...state,
    ledger: [
      {
        id: uid('log'),
        type,
        title,
        detail,
        createdAt: new Date().toISOString()
      },
      ...(state.ledger || [])
    ].slice(0, 250)
  };
}

export function calculateStats(state) {
  const today = todayKey();
  const completedQuests = (state.quests || []).filter((quest) => quest.done).length;
  const overdueQuests = (state.quests || []).filter((quest) => !quest.done && quest.dueDate && quest.dueDate < today).length;
  const activeGoals = (state.goals || []).filter((goal) => goal.status !== 'complete').length;
  const activeContracts = (state.contracts || []).filter((contract) => contract.status !== 'complete').length;
  const sealedContracts = (state.contracts || []).filter((contract) => contract.status === 'complete').length;
  const activeAnchors = (state.anchors || []).filter((anchor) => anchor.status !== 'sealed').length;
  const sealedAnchors = (state.anchors || []).filter((anchor) => anchor.status === 'sealed').length;
  const activeEpochs = (state.epochs || []).filter((epoch) => epoch.status !== 'complete').length;
  const completedEpochs = (state.epochs || []).filter((epoch) => epoch.status === 'complete').length;
  const activeAllies = (state.allies || []).filter((ally) => ally.status !== 'archived').length;
  const canonRules = (state.canon || []).filter((rule) => rule.status !== 'archived').length;
  const todayRitual = (state.rituals || []).find((ritual) => ritual.date === today);
  const todayQuests = (state.quests || []).filter((quest) => quest.createdAt?.slice(0, 10) === today || quest.doneAt?.slice(0, 10) === today);
  const completedToday = (state.quests || []).filter((quest) => quest.doneAt?.slice(0, 10) === today).length;
  const notesThisWeek = (state.notes || []).filter((note) => daysAgo(note.createdAt) <= 7).length;
  const focusSessions = state.focusSessions || [];
  const focusThisWeek = focusSessions.filter((session) => daysAgo(session.completedAt || session.createdAt) <= 7);
  const focusMinutes = focusSessions.reduce((total, session) => total + Number(session.minutes || 0), 0);
  const focusMinutesThisWeek = focusThisWeek.reduce((total, session) => total + Number(session.minutes || 0), 0);
  const streak = calculateStreak(state.rituals || []);
  const xp = completedQuests * 40 + (state.rituals || []).length * 25 + (state.notes || []).length * 12 + (state.goals || []).length * 30 + sealedContracts * 75 + activeContracts * 15 + activeAnchors * 18 + sealedAnchors * 45 + activeEpochs * 34 + completedEpochs * 90 + activeAllies * 22 + canonRules * 16 + Math.floor(focusMinutes * 1.5);
  const level = Math.max(1, Math.floor(xp / 220) + 1);
  const energy = Math.min(
    100,
    Math.round((todayRitual ? 30 : 0) + Math.min(22, completedToday * 12) + Math.min(16, notesThisWeek * 4) + Math.min(16, activeGoals * 4) + Math.min(10, activeContracts * 4) + Math.min(9, activeAnchors * 3) + Math.min(9, activeEpochs * 4) + Math.min(7, activeAllies * 3) + Math.min(7, canonRules * 2) + Math.min(14, focusMinutesThisWeek / 10))
  );

  return {
    activeGoals,
    activeContracts,
    sealedContracts,
    activeAnchors,
    sealedAnchors,
    activeEpochs,
    completedEpochs,
    activeAllies,
    canonRules,
    focusSessionCount: focusSessions.length,
    focusMinutes,
    focusMinutesThisWeek,
    completedQuests,
    todayRitual: Boolean(todayRitual),
    todayQuests: todayQuests.length,
    completedToday,
    notesThisWeek,
    overdueQuests,
    reviewCount: state.reviews?.length || 0,
    shareCardCount: state.shareCards?.length || 0,
    streak,
    xp,
    level,
    energy,
    nextLevelXp: level * 220,
    progressToLevel: Math.min(100, Math.round(((xp % 220) / 220) * 100))
  };
}

function daysAgo(value) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 9999;
  return Math.floor((Date.now() - then) / 86400000);
}

function keyForOffset(offset) {
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + offset);
  return cursor.toISOString().slice(0, 10);
}

function calculateStreak(rituals) {
  const dates = new Set(rituals.map((ritual) => ritual.date));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function shouldOfferRecoveryRite(state) {
  const rituals = state.rituals || [];
  if (!rituals.length) return false;
  const today = todayKey();
  const yesterday = keyForOffset(-1);
  const recoveredToday = (state.recoveryRites || []).some((rite) => rite.date === today);
  const didToday = rituals.some((ritual) => ritual.date === today);
  const didYesterday = rituals.some((ritual) => ritual.date === yesterday);
  return !didToday && !didYesterday && !recoveredToday;
}

export function forgeRecoveryRite(state) {
  const today = todayKey();
  const quest = {
    id: uid('quest'),
    realm: 'mind',
    title: 'Recovery Rite: complete a 7-minute return move',
    detail: 'Pick one tiny action that reopens momentum without punishing yourself for the missed day.',
    evidence: 'A short note saying what you did and what restarts now.',
    dueDate: today,
    difficulty: 'light',
    done: false,
    createdAt: new Date().toISOString(),
    priority: 'recovery'
  };
  const rite = {
    id: uid('recovery'),
    date: today,
    questId: quest.id,
    createdAt: new Date().toISOString()
  };
  let next = {
    ...state,
    quests: [quest, ...(state.quests || [])],
    recoveryRites: [rite, ...(state.recoveryRites || [])]
  };
  next = addLedgerEntry(next, 'recovery', 'Recovery rite opened', 'A missed rhythm was converted into a light return quest.');
  return next;
}

export function forgeAffirmation(state, focusRealm = '') {
  const archetype = getArchetype(state.profile.archetype);
  const realm = focusRealm ? getRealm(focusRealm) : null;
  const strongestGoal = state.goals.find((goal) => goal.realm === focusRealm) || state.goals[0];
  const base = starterAffirmations[Math.floor(Math.random() * starterAffirmations.length)];
  const realmLine = realm ? `In my ${realm.name}, I move with ${archetype.gift}.` : `My ${archetype.name} energy is online.`;
  const goalLine = strongestGoal ? `I am making ${strongestGoal.title} real through today's next action.` : 'I choose one clear action and let proof compound.';
  return `${base} ${realmLine} ${goalLine}`;
}

export function generateQuest(goal) {
  const text = questTemplates[Math.floor(Math.random() * questTemplates.length)];
  return {
    id: uid('quest'),
    goalId: goal.id,
    realm: goal.realm,
    title: text,
    detail: `Linked to: ${goal.title}`,
    done: false,
    createdAt: new Date().toISOString(),
    priority: 'today'
  };
}

export function generateContractQuest(contract) {
  return {
    id: uid('quest'),
    contractId: contract.id,
    realm: contract.realm,
    title: contract.dailyProof || `Move ${contract.title} forward for 13 minutes`,
    detail: `Reality contract proof: ${contract.vow}`,
    evidence: contract.evidence || 'Visible proof logged in notes, screenshots, links, or completed action.',
    dueDate: todayKey(),
    difficulty: 'medium',
    done: false,
    createdAt: new Date().toISOString(),
    priority: 'contract'
  };
}

export function createAscensionCard(state, stats) {
  const topGoal = (state.goals || []).find((goal) => goal.status !== 'complete') || (state.goals || [])[0];
  const latestReview = (state.reviews || [])[0];
  const card = {
    id: uid('card'),
    createdAt: new Date().toISOString(),
    worldName: state.profile.worldName,
    archetype: getArchetype(state.profile.archetype).name,
    level: stats.level,
    energy: stats.energy,
    streak: stats.streak,
    activeGoals: stats.activeGoals,
    completedProofs: stats.completedQuests,
    activeContracts: stats.activeContracts,
    primeIntention: state.profile.primeIntention,
    nextCommand: latestReview?.nextFocus || topGoal?.title || 'Choose one visible proof move and complete it today.'
  };
  const text = [
    `OVER3ARTH ASCENSION CARD`,
    `World: ${card.worldName}`,
    `Mode: ${card.archetype}`,
    `Level: ${card.level}`,
    `Reality Charge: ${card.energy}%`,
    `Streak: ${card.streak} day(s)`,
    `Active Goals: ${card.activeGoals}`,
    `Completed Proofs: ${card.completedProofs}`,
    `Active Contracts: ${card.activeContracts}`,
    `Active Epochs: ${state.epochs?.filter((epoch) => epoch.status !== 'complete').length || 0}`,
    `Alliance Allies: ${state.allies?.filter((ally) => ally.status !== 'archived').length || 0}`,
    `World Laws: ${state.canon?.filter((rule) => rule.status !== 'archived').length || 0}`,
    `Prime Intention: ${card.primeIntention}`,
    `Next Command: ${card.nextCommand}`,
    `Generated: ${new Date(card.createdAt).toLocaleString()}`
  ].join('\n');
  return { ...card, text };
}

export function primeStarterWorld(state) {
  const selectedRealms = realms.slice(0, 4);
  let nextState = { ...state };
  const goals = selectedRealms.map((realm) => ({
    id: uid('goal'),
    title: realm.starterGoal,
    realm: realm.id,
    why: realm.promise,
    desiredOutcome: `I want ${realm.name} to become a visible part of my new reality.`,
    obstacle: 'Inconsistency, distraction, and old identity loops.',
    ifThen: 'If I feel resistance, then I will do the smallest 13-minute proof move anyway.',
    status: 'active',
    createdAt: new Date().toISOString(),
    targetDate: '',
    milestones: []
  }));
  const quests = goals.map(generateQuest);
  nextState = { ...nextState, goals, quests };
  nextState = addLedgerEntry(nextState, 'world', 'Starter world forged', 'Four initial realms, goals, and quests were created.');
  return nextState;
}

export function getWeekKey(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = date.getDate() - day;
  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

export function dateWithinDays(value, days) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 86400000;
}

export function calculateRealmScores(state) {
  return realms.map((realm) => {
    const goals = state.goals.filter((goal) => goal.realm === realm.id);
    const contracts = (state.contracts || []).filter((contract) => contract.realm === realm.id && contract.status !== 'complete');
    const activeGoals = goals.filter((goal) => goal.status !== 'complete').length;
    const completedGoals = goals.filter((goal) => goal.status === 'complete').length;
    const completedQuests = state.quests.filter((quest) => quest.realm === realm.id && quest.done).length;
    const recentNotes = state.notes.filter((note) => note.realm === realm.id && dateWithinDays(note.createdAt, 7)).length;
    const score = Math.min(100, activeGoals * 12 + completedGoals * 20 + completedQuests * 9 + recentNotes * 8 + contracts.length * 10);
    return { ...realm, activeGoals, completedGoals, completedQuests, recentNotes, contracts: contracts.length, score };
  });
}


export function calculateMomentumSeries(state, days = 14) {
  const rows = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = keyForOffset(-offset);
    const rituals = (state.rituals || []).filter((ritual) => ritual.date === date).length;
    const proofs = (state.quests || []).filter((quest) => quest.doneAt?.slice(0, 10) === date).length;
    const notes = (state.notes || []).filter((note) => note.createdAt?.slice(0, 10) === date).length;
    const focusMinutes = (state.focusSessions || [])
      .filter((session) => (session.completedAt || session.createdAt)?.slice(0, 10) === date)
      .reduce((total, session) => total + Number(session.minutes || 0), 0);
    const charge = Math.min(100, rituals * 35 + proofs * 18 + notes * 8 + Math.round(focusMinutes * 0.8));
    rows.push({ date, rituals, proofs, notes, focusMinutes, charge });
  }
  return rows;
}


export function createAnchorQuest(anchor) {
  return {
    id: uid('quest'),
    anchorId: anchor.id,
    realm: anchor.realm || 'mind',
    title: `Activate anchor: ${anchor.name || anchor.title}`,
    detail: anchor.action || 'Run the cue-action-reward loop once today and record the result.',
    evidence: `Cue: ${anchor.cue || 'chosen trigger'} · Reward: ${anchor.reward || 'momentum acknowledged'}`,
    dueDate: todayKey(),
    difficulty: 'light',
    done: false,
    createdAt: new Date().toISOString(),
    priority: 'anchor'
  };
}

export function calculateAnchorStats(state) {
  const anchors = state.anchors || [];
  const active = anchors.filter((anchor) => anchor.status !== 'sealed');
  const sealed = anchors.filter((anchor) => anchor.status === 'sealed');
  const questIds = new Set((state.quests || []).filter((quest) => quest.anchorId).map((quest) => quest.anchorId));
  const realmsCovered = new Set(active.map((anchor) => anchor.realm).filter(Boolean));
  const strength = Math.min(100, active.length * 18 + sealed.length * 24 + questIds.size * 10 + realmsCovered.size * 8);
  return {
    total: anchors.length,
    active: active.length,
    sealed: sealed.length,
    questLinked: questIds.size,
    realmsCovered: realmsCovered.size,
    strength
  };
}

export function createRealityForecast(state, stats) {
  const anchors = calculateAnchorStats(state);
  const realmScores = calculateRealmScores(state);
  const weakestRealm = realmScores.sort((a, b) => a.score - b.score)[0];
  const consistency = Math.min(100, stats.streak * 11 + stats.completedToday * 14 + Math.round(stats.focusMinutesThisWeek / 4) + anchors.strength * 0.28);
  const proofPressure = Math.min(100, stats.overdueQuests * 18 + Math.max(0, stats.activeGoals - stats.completedToday) * 5);
  const launchReadiness = Math.min(100, stats.completedQuests * 5 + stats.reviewCount * 13 + stats.sealedContracts * 15 + anchors.sealed * 10);
  let verdict = 'Command the next small proof.';
  if (!anchors.total) verdict = 'Install at least one Reality Anchor so your environment starts triggering the intended identity.';
  else if (stats.overdueQuests) verdict = 'Close or rewrite overdue proof before adding more pressure.';
  else if (!stats.todayRitual) verdict = 'Seal today’s ritual to set the operating frequency.';
  else if (consistency >= 75) verdict = 'Momentum is compounding. Raise the standard in the weakest realm.';
  return {
    consistency: Math.round(consistency),
    proofPressure,
    launchReadiness,
    weakestRealm,
    verdict
  };
}

export function createWorldInsight(state, stats) {
  const openQuests = (state.quests || []).filter((quest) => !quest.done);
  const overdue = openQuests.filter((quest) => quest.dueDate && quest.dueDate < todayKey());
  const activeGoals = (state.goals || []).filter((goal) => goal.status !== 'complete');
  const latestReview = (state.reviews || [])[0];
  const latestRitual = (state.rituals || [])[0];
  const weakestRealm = calculateRealmScores(state).sort((a, b) => a.score - b.score)[0];

  if (overdue.length) {
    return {
      status: 'Decision required',
      tone: 'warning',
      command: `Resolve ${overdue.length} overdue proof move${overdue.length === 1 ? '' : 's'} before forging more pressure.`,
      reason: 'Open loops leak attention. Complete, rewrite, or release the stale quest.',
      targetView: 'quests'
    };
  }

  if (!stats.todayRitual) {
    return {
      status: 'Prime the field',
      tone: 'ritual',
      command: 'Seal today’s ritual before the outside world writes the script.',
      reason: 'The ritual is the quickest way to set intention, release friction, and pick one proof move.',
      targetView: 'ritual'
    };
  }

  if (!stats.completedToday && openQuests.length) {
    return {
      status: 'Proof pending',
      tone: 'action',
      command: `Complete: ${openQuests[0].title}`,
      reason: latestRitual?.nextAction || 'Reality Charge rises when intention turns into visible proof.',
      targetView: 'quests'
    };
  }

  if (stats.focusMinutesThisWeek < 75 && activeGoals.length) {
    return {
      status: 'Focus chamber advised',
      tone: 'focus',
      command: `Run one focus session for ${activeGoals[0].title}.`,
      reason: 'Deep work minutes make the world feel less theoretical and more engineered.',
      targetView: 'focus'
    };
  }

  if (!(state.anchors || []).length) {
    return {
      status: 'Environment unbound',
      tone: 'anchor',
      command: 'Create one Reality Anchor so the physical world starts triggering the chosen behavior.',
      reason: 'Cue-based loops reduce reliance on mood and make the intended identity easier to repeat.',
      targetView: 'anchors'
    };
  }

  return {
    status: 'Reality compounding',
    tone: 'stable',
    command: latestReview?.nextFocus || `Feed the ${weakestRealm?.name || 'lowest-charge realm'} with one clean proof move.`,
    reason: 'Your system has momentum. Protect the rhythm, then raise the standard by one step.',
    targetView: weakestRealm ? 'realms' : 'dashboard'
  };
}

export function createFocusQuest(session) {
  return {
    id: uid('quest'),
    realm: session.realm || 'craft',
    title: `Convert ${session.title || 'focus session'} into visible proof`,
    detail: `After ${session.minutes || 25} focused minutes, package the output into one saved proof, message, commit, note, or deliverable.`,
    evidence: session.output || 'Name the visible output created from this focus block.',
    dueDate: todayKey(),
    difficulty: 'medium',
    done: false,
    createdAt: new Date().toISOString(),
    priority: 'focus'
  };
}


export function createEpochQuestWave(epoch) {
  const phases = [
    {
      title: `Epoch foundation: ${epoch.title}`,
      detail: epoch.milestones?.[0] || 'Define the first visible proof and remove one friction point.',
      difficulty: 'medium'
    },
    {
      title: `Epoch momentum: ${epoch.title}`,
      detail: epoch.milestones?.[1] || 'Complete one repeatable proof loop that shows the arc is alive.',
      difficulty: 'medium'
    },
    {
      title: `Epoch seal: ${epoch.title}`,
      detail: epoch.milestones?.[2] || 'Archive what changed, what proved it, and what the next epoch demands.',
      difficulty: 'heavy'
    }
  ];

  return phases.map((phase, index) => ({
    id: uid('quest'),
    epochId: epoch.id,
    realm: epoch.realm || 'craft',
    title: phase.title,
    detail: phase.detail,
    evidence: epoch.evidence || 'Visible proof, note, link, screenshot, result, or completed deliverable.',
    dueDate: index === 0 ? todayKey() : '',
    difficulty: phase.difficulty,
    done: false,
    createdAt: new Date().toISOString(),
    priority: 'epoch'
  }));
}

export function createAllianceQuest(ally) {
  return {
    id: uid('quest'),
    allyId: ally.id,
    realm: ally.realm || 'heart',
    title: `Send alliance check-in to ${ally.name || 'chosen ally'}`,
    detail: ally.ask || 'Share the current proof target, the obstacle, and the next action.',
    evidence: 'Message sent, call made, check-in completed, or script copied and acted on.',
    dueDate: ally.nextCheckIn || todayKey(),
    difficulty: 'light',
    done: false,
    createdAt: new Date().toISOString(),
    priority: 'alliance'
  };
}

export function createAllianceScript(ally, state) {
  const openQuest = (state.quests || []).find((quest) => !quest.done);
  const currentEpoch = (state.epochs || []).find((epoch) => epoch.status !== 'complete');
  return [
    `Over3arth check-in for ${ally.name || 'my ally'}`,
    `World: ${state.profile.worldName}`,
    `Current command: ${currentEpoch?.title || openQuest?.title || state.profile.primeIntention}`,
    `Proof target: ${openQuest?.detail || ally.ask || 'One visible action before the day ends.'}`,
    `Support ask: ${ally.ask || 'Ask me what I completed and what I am doing next.'}`,
    `Next check-in: ${ally.nextCheckIn || 'not scheduled yet'}`
  ].join('\n');
}

export function calculateEpochStats(state) {
  const epochs = state.epochs || [];
  const active = epochs.filter((epoch) => epoch.status !== 'complete');
  const complete = epochs.filter((epoch) => epoch.status === 'complete');
  const questLinks = new Set((state.quests || []).filter((quest) => quest.epochId).map((quest) => quest.epochId));
  const realmsCovered = new Set(active.map((epoch) => epoch.realm).filter(Boolean));
  const longestDays = active.reduce((max, epoch) => Math.max(max, Number(epoch.days || 0)), 0);
  const strength = Math.min(100, active.length * 22 + complete.length * 30 + questLinks.size * 13 + realmsCovered.size * 8 + Math.round(longestDays / 6));
  return {
    total: epochs.length,
    active: active.length,
    complete: complete.length,
    questLinked: questLinks.size,
    realmsCovered: realmsCovered.size,
    longestDays,
    strength
  };
}

export function calculateCanonStats(state) {
  const rules = (state.canon || []).filter((rule) => rule.status !== 'archived');
  const realmsCovered = new Set(rules.map((rule) => rule.realm).filter(Boolean));
  const recentRules = rules.filter((rule) => dateWithinDays(rule.createdAt, 14)).length;
  const strength = Math.min(100, rules.length * 12 + realmsCovered.size * 10 + recentRules * 5);
  return { total: rules.length, realmsCovered: realmsCovered.size, recentRules, strength };
}
