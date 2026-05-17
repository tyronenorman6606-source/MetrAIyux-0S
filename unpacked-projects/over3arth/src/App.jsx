import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  Activity,
  BellRing,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Download,
  Flame,
  Gamepad2,
  Gem,
  Globe2,
  Home,
  Layers3,
  Map,
  MessageCircle,
  Mic,
  NotebookPen,
  Play,
  Plus,
  Radar,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Swords,
  Target,
  Upload,
  Volume2,
  Wand2,
  Zap
} from 'lucide-react';

import Meter from './components/Meter.jsx';
import SigilButton from './components/SigilButton.jsx';
import WorldskinVeil from './components/WorldskinVeil.jsx';
import { Globe } from './registry/magicui/globe.jsx';
import { allianceTemplates, anchorTemplates, archetypes, canonTemplates, epochTemplates, focusSessionTemplates, planLanes, realms, realityContractTemplates, researchPrinciples, ritualPrompts, worldBlueprints } from './data/over3arthContent.js';
import {
  addLedgerEntry,
  calculateStats,
  createInitialState,
  calculateMomentumSeries,
  calculateRealmScores,
  createAscensionCard,
  createFocusQuest,
  createWorldInsight,
  createAnchorQuest,
  createRealityForecast,
  calculateAnchorStats,
  calculateEpochStats,
  calculateCanonStats,
  createEpochQuestWave,
  createAllianceQuest,
  createAllianceScript,
  dateWithinDays,
  forgeAffirmation,
  forgeRecoveryRite,
  generateQuest,
  getArchetype,
  getRealm,
  getWeekKey,
  primeStarterWorld,
  shouldOfferRecoveryRite,
  generateContractQuest,
  todayKey,
  uid
} from './lib/engine.js';
import { clearSnapshots, downloadTextFile, exportState, getSnapshotVault, loadState, parseImportedState, resetState, restoreSnapshot, saveSnapshot, saveState } from './lib/storage.js';
import { trackEvent } from './lib/analytics.js';
import { DEFAULT_VESSEL_NAME, createBrainResponse, detectBrainTarget, gateWorldNames, getVesselName } from './lib/voiceBrains.js';

const navItems = [
  { id: 'dashboard', label: 'World', icon: Home },
  { id: 'realms', label: 'Realms', icon: Globe2 },
  { id: 'anchors', label: 'Anchors', icon: Target },
  { id: 'codex', label: 'Codex', icon: Layers3 },
  { id: 'quests', label: 'Quests', icon: Swords },
  { id: 'ritual', label: 'Ritual', icon: Flame },
  { id: 'focus', label: 'Focus', icon: Brain },
  { id: 'affirm', label: 'Affirm', icon: Sparkles },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'review', label: 'Review', icon: CalendarDays },
  { id: 'ascend', label: 'Ascend', icon: Gem },
  { id: 'ledger', label: 'Ledger', icon: ScrollText }
];

const worldGateCoordinates = [
  { x: 42, y: 21 },
  { x: 57, y: 25 },
  { x: 33, y: 34 },
  { x: 68, y: 40 },
  { x: 29, y: 50 },
  { x: 61, y: 55 },
  { x: 43, y: 64 },
  { x: 72, y: 68 },
  { x: 32, y: 73 },
  { x: 53, y: 78 },
  { x: 63, y: 33 }
];

const realmCoordinates = [
  { x: 48, y: 35 },
  { x: 58, y: 45 },
  { x: 44, y: 55 },
  { x: 56, y: 63 },
  { x: 38, y: 45 },
  { x: 64, y: 56 }
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function getStoredPowerMode() {
  if (typeof window === 'undefined') return 'full';
  return localStorage.getItem('over3arth-power-mode') || (prefersReducedMotion() ? 'low' : 'full');
}

function MotionChrome({ label = 'OVER3ARTH LIVE SIMULATION', children }) {
  const pointerX = useMotionValue(-260);
  const pointerY = useMotionValue(-260);
  const springX = useSpring(pointerX, { stiffness: 240, damping: 34, mass: 0.36 });
  const springY = useSpring(pointerY, { stiffness: 240, damping: 34, mass: 0.36 });
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { stiffness: 170, damping: 30 });
  const scanShift = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (event.pointerType !== 'mouse') return;
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [pointerX, pointerY]);

  return (
    <div className="motion-chrome" data-motion-chrome>
      <motion.div className="motion-scroll-progress" style={{ scaleX: progressScale }} aria-hidden="true" />
      <motion.div className="motion-scanline" style={{ backgroundPositionX: scanShift }} aria-hidden="true" />
      <motion.div className="motion-cursor-field" style={{ x: springX, y: springY }} aria-hidden="true" />
      <div className="motion-chrome-label">{label}</div>
      {children}
    </div>
  );
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildUniverseSectors(state) {
  return realms.map((realm, index) => {
    const goals = state.goals.filter((goal) => goal.realm === realm.id);
    const openGoals = goals.filter((goal) => goal.status !== 'complete');
    const quests = state.quests.filter((quest) => quest.realm === realm.id);
    const openQuests = quests.filter((quest) => !quest.done);
    const proofs = quests.filter((quest) => quest.done);
    const anchors = (state.anchors || []).filter((anchor) => anchor.realm === realm.id && anchor.status !== 'sealed');
    const charge = clampPercent(18 + openGoals.length * 16 + proofs.length * 9 + anchors.length * 10 - openQuests.length * 2);

    return {
      ...realm,
      index,
      angle: index * (360 / realms.length) - 90,
      charge,
      goals: goals.length,
      openGoals: openGoals.length,
      openQuests: openQuests.length,
      proofs: proofs.length,
      anchors: anchors.length
    };
  });
}

function App() {
  const [state, setState] = useState(() => {
    const loaded = loadState(createInitialState());
    if (loaded.profile.onboardingComplete) {
      return {
        ...loaded,
        profile: {
          ...loaded.profile,
          vesselName: loaded.profile.vesselName || DEFAULT_VESSEL_NAME
        }
      };
    }
    return primeStarterWorld({
      ...loaded,
      profile: {
        ...loaded.profile,
        name: loaded.profile.name || 'World Forger',
        worldName: loaded.profile.worldName || 'New Earth Prime',
        vesselName: loaded.profile.vesselName || DEFAULT_VESSEL_NAME,
        onboardingComplete: true
      }
    });
  });
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [powerMode, setPowerMode] = useState(getStoredPowerMode);
  const lowPower = powerMode === 'low';
  const stats = useMemo(() => calculateStats(state), [state]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    localStorage.setItem('over3arth-power-mode', powerMode);
    document.documentElement.dataset.powerMode = powerMode;
  }, [powerMode]);

  function flash(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function updateState(updater, message, eventName = 'state_update') {
    setState((current) => (typeof updater === 'function' ? updater(current) : updater));
    trackEvent(eventName, { message: message || 'state changed' });
    if (message) flash(message);
  }

  return (
    <MotionChrome>
      <div className={view === 'dashboard' ? 'app-shell game-mode' : 'app-shell'}>
        {view !== 'dashboard' ? (
          <header className="topbar glass-panel">
            <button className="brand-lockup" onClick={() => setView('dashboard')} aria-label="Open Over3arth dashboard">
              <img src="/over3arth.svg" alt="Over3arth" />
              <span>
                <strong>Over3arth</strong>
                <small>{state.profile.worldName}</small>
              </span>
            </button>
            <div className="topbar-actions">
              <span className="pill"><Zap size={14} /> LVL {stats.level}</span>
              <span className="pill"><Flame size={14} /> {stats.streak} day streak</span>
              <SigilButton variant="ghost" onClick={() => setPowerMode(lowPower ? 'full' : 'low')}><Zap size={16} /> {lowPower ? 'Full power' : 'Low power'}</SigilButton>
              <SigilButton variant="ghost" onClick={() => { exportState(state); trackEvent('export_ledger'); }}><Download size={16} /> Export</SigilButton>
            </div>
          </header>
        ) : null}

        {view !== 'dashboard' ? (
          <aside className="side-nav glass-panel">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </aside>
        ) : null}

        <main className={view === 'dashboard' ? 'main-stage game-stage' : 'main-stage'}>
          <AnimatePresence mode="wait">
            {view === 'dashboard' && <Dashboard key="dashboard" state={state} stats={stats} setView={setView} updateState={updateState} />}
            {view === 'realms' && <Realms key="realms" state={state} updateState={updateState} />}
            {view === 'anchors' && <Anchors key="anchors" state={state} updateState={updateState} />}
            {view === 'codex' && <Codex key="codex" state={state} stats={stats} updateState={updateState} />}
            {view === 'quests' && <Quests key="quests" state={state} updateState={updateState} />}
            {view === 'ritual' && <Ritual key="ritual" state={state} stats={stats} updateState={updateState} />}
            {view === 'focus' && <FocusChamber key="focus" state={state} stats={stats} updateState={updateState} />}
            {view === 'affirm' && <Affirm key="affirm" state={state} updateState={updateState} />}
            {view === 'notes' && <Notes key="notes" state={state} updateState={updateState} />}
            {view === 'review' && <Review key="review" state={state} stats={stats} updateState={updateState} />}
            {view === 'ascend' && <Ascend key="ascend" state={state} stats={stats} updateState={updateState} />}
            {view === 'ledger' && <Ledger key="ledger" state={state} updateState={updateState} />}
          </AnimatePresence>
        </main>

        {view !== 'dashboard' ? (
          <nav className="mobile-nav glass-panel" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        <AnimatePresence>
          {view !== 'dashboard' && toast ? (
            <motion.div className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>
        {view !== 'dashboard' ? (
          <footer className="app-disclaimer">Over3arth shapes action through goals, reflection, and proof. It does not guarantee outcomes or replace professional care.</footer>
        ) : null}
      </div>
    </MotionChrome>
  );
}

function Page({ eyebrow, title, copy, children, action }) {
  return (
    <motion.section className="page" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.28 }}>
      <div className="page-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {copy ? <p>{copy}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

function Onboarding({ state, updateState }) {
  const [profile, setProfile] = useState(state.profile);

  function finish() {
    let next = {
      ...state,
      profile: {
        ...profile,
        name: profile.name || 'World Forger',
        worldName: profile.worldName || 'New Earth Prime',
        onboardingComplete: true
      }
    };
    next = primeStarterWorld(next);
    updateState(next, 'Over3arth world forged.', 'onboarding_complete');
  }

  return (
    <div className="onboarding-screen">
      <motion.div className="onboarding-card glass-panel" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <img src="/over3arth.svg" className="hero-logo" alt="Over3arth" />
        <span className="eyebrow">World Genesis</span>
        <h1>Forge your intended reality through repeated proof.</h1>
        <p>
          Over3arth turns goals into realms, affirmations into identity signals, notes into a reality ledger, and daily action into visible proof. This is not passive motivation. It is a command interface for attention, intention, and behavior.
        </p>

        <div className="onboarding-grid">
          <label>
            Your name
            <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="World Forger" />
          </label>
          <label>
            World name
            <input value={profile.worldName} onChange={(event) => setProfile({ ...profile, worldName: event.target.value })} placeholder="New Earth Prime" />
          </label>
        </div>

        <label>
          Prime intention
          <textarea value={profile.primeIntention} onChange={(event) => setProfile({ ...profile, primeIntention: event.target.value })} rows="3" />
        </label>

        <div className="archetype-grid">
          {archetypes.map((item) => (
            <button key={item.id} className={profile.archetype === item.id ? 'archetype selected' : 'archetype'} onClick={() => setProfile({ ...profile, archetype: item.id })}>
              <strong>{item.icon} {item.name}</strong>
              <small>{item.mantra}</small>
            </button>
          ))}
        </div>

        <SigilButton onClick={finish}><Wand2 size={18} /> Begin Genesis</SigilButton>
      </motion.div>
    </div>
  );
}

function Dashboard({ state, stats, archetype, setView, updateState, lowPower }) {
  const todayRitual = state.rituals.find((ritual) => ritual.date === todayKey());
  const recoveryReady = shouldOfferRecoveryRite(state);
  const urgentQuests = state.quests.filter((quest) => !quest.done).slice(0, 3);
  const recentNotes = state.notes.slice(0, 3);
  const worldInsight = createWorldInsight(state, stats);
  const momentumSeries = calculateMomentumSeries(state, 7);
  const anchorStats = calculateAnchorStats(state);
  const forecast = createRealityForecast(state, stats);

  function openRecoveryRite() {
    updateState((current) => forgeRecoveryRite(current), 'Recovery rite opened. No shame. Just return.', 'recovery_rite_opened');
  }

  function generateTodayQuests() {
    updateState((current) => {
      if (!current.goals.length) return current;
      const newQuests = current.goals.filter((goal) => goal.status !== 'complete').slice(0, 3).map(generateQuest);
      let next = { ...current, quests: [...newQuests, ...current.quests] };
      next = addLedgerEntry(next, 'quest', 'Daily quest wave generated', `${newQuests.length} quests were forged from active goals.`);
      return next;
    }, 'Daily quests forged.', 'quests_generated');
  }

  return (
    <Page
      eyebrow="Overearth Simulation"
      title={`${state.profile.worldName} is live.`}
      copy="Move through the sectors, launch proof missions, seal quests, and watch the realm model respond to the behavior you actually perform."
      action={<SigilButton onClick={() => setView('quests')}><Gamepad2 size={18} /> Play quests</SigilButton>}
    >
      <UniverseSimulation
        state={state}
        stats={stats}
        forecast={forecast}
        anchorStats={anchorStats}
        worldInsight={worldInsight}
        setView={setView}
        updateState={updateState}
      />

      {false ? (<>
      <div className="hero-grid">
        <section className="world-card glass-panel">
          <div className="world-card-top">
            <span className="archetype-orb">{archetype.icon}</span>
            <div>
              <span className="eyebrow">{archetype.name} Mode</span>
              <h2>{state.profile.worldName}</h2>
            </div>
          </div>
          <p className="prime-intention">“{state.profile.primeIntention}”</p>
          <div className="stat-row">
            <Stat icon={Zap} label="XP" value={stats.xp} />
            <Stat icon={Target} label="Active Goals" value={stats.activeGoals} />
            <Stat icon={ShieldCheck} label="Proofs" value={stats.completedQuests} />
            <Stat icon={Brain} label="Focus Min" value={stats.focusMinutes} />
            <Stat icon={Target} label="Anchors" value={stats.activeAnchors} />
            <Stat icon={Layers3} label="Epochs" value={stats.activeEpochs} />
            <Stat icon={TrendingUp} label="Reviews" value={stats.reviewCount} />
          </div>
          <Meter value={stats.energy} label="Reality Charge" detail="Built from ritual completion, quests, notes, and active goals." />
          <Meter value={stats.progressToLevel} label={`Level ${stats.level} progress`} detail={`${stats.nextLevelXp - stats.xp} XP until next ascension.`} />
          {stats.overdueQuests ? <p className="risk-callout">{stats.overdueQuests} overdue quest{stats.overdueQuests === 1 ? '' : 's'} need a decision: complete, rewrite, or release.</p> : null}
          {recoveryReady ? (
            <div className="recovery-callout">
              <div>
                <strong>Rhythm gap detected.</strong>
                <p>Open a recovery rite and convert the missed day into a light return quest.</p>
              </div>
              <SigilButton variant="secondary" onClick={openRecoveryRite}><RotateCcw size={16} /> Open recovery</SigilButton>
            </div>
          ) : null}
        </section>

        <div className="hero-side-stack">
          {!lowPower ? (
            <LazyWorldGlobePanel
              worldName={state.profile.worldName}
              energy={stats.energy}
              activeGoals={stats.activeGoals}
              completedQuests={stats.completedQuests}
            />
          ) : (
            <section className="globe-demo-card glass-panel globe-fallback" aria-label="Over3arth low power world globe placeholder">
              <span className="globe-title">Over3arth</span>
              <div className="fallback-orb" />
              <div className="globe-command-strip">
                <span><strong>{state.profile.worldName}</strong><small>Low power mode</small></span>
                <span><strong>{stats.energy}%</strong><small>Reality charge</small></span>
                <span><strong>{stats.activeGoals}</strong><small>Realms active</small></span>
              </div>
            </section>
          )}

          <section className="glass-panel power-panel">
            <span className="eyebrow">Today’s Command</span>
            <h2>{todayRitual ? 'Ritual complete. Now make proof.' : 'Prime the field before the day takes you.'}</h2>
            <p>{todayRitual ? todayRitual.nextAction : 'Do the ritual, name the signal, choose one proof move, then execute before overthinking can negotiate.'}</p>
            <div className="stacked-actions">
              <SigilButton onClick={() => setView('ritual')}><Flame size={18} /> Open ritual</SigilButton>
              <SigilButton variant="secondary" onClick={generateTodayQuests}><Swords size={18} /> Generate quests</SigilButton>
            </div>
          </section>
        </div>
      </div>

      <section className="glass-panel oracle-panel">
        <div>
          <span className="eyebrow">World Intelligence</span>
          <h2>{worldInsight.status}</h2>
          <p>{worldInsight.command}</p>
          <small>{worldInsight.reason}</small>
        </div>
        <SigilButton variant="secondary" onClick={() => setView(worldInsight.targetView)}><ChevronRight size={18} /> Open command</SigilButton>
        <div className="momentum-strip" aria-label="Seven day momentum strip">
          {momentumSeries.map((day) => (
            <span key={day.date} style={{ '--charge': `${Math.max(8, day.charge)}%` }}>
              <i />
              <small>{day.date.slice(5)}</small>
            </span>
          ))}
        </div>
      </section>


      <section className="glass-panel forecast-panel">
        <div>
          <span className="eyebrow">Reality Forecast v1.6</span>
          <h2>{forecast.verdict}</h2>
          <p>Anchors bind your chosen identity to repeatable cues, places, and rewards. This keeps the app grounded in behavior instead of empty manifestation talk.</p>
        </div>
        <div className="forecast-meters">
          <Meter value={forecast.consistency} label="Consistency field" detail="Built from streak, proof, focus, and anchor strength." />
          <Meter value={anchorStats.strength} label="Anchor grid" detail={`${anchorStats.active} active · ${anchorStats.sealed} sealed · ${anchorStats.realmsCovered} realms covered`} />
          <Meter value={forecast.launchReadiness} label="Proof archive" detail="Built from completed proof, reviews, contracts, and sealed anchors." />
        </div>
        <SigilButton variant="secondary" onClick={() => setView(forecast.weakestRealm ? 'anchors' : 'realms')}>
          <Target size={18} /> Fortify {forecast.weakestRealm?.name || 'world'}
        </SigilButton>
      </section>

      <section className="glass-panel codex-signal-panel">
        <div>
          <span className="eyebrow">World Codex v1.6</span>
          <h2>{(state.epochs || []).filter((epoch) => epoch.status !== 'complete').length} active epoch{(state.epochs || []).filter((epoch) => epoch.status !== 'complete').length === 1 ? '' : 's'} · {(state.allies || []).filter((ally) => ally.status !== 'archived').length} allies · {(state.canon || []).filter((rule) => rule.status !== 'archived').length} laws</h2>
          <p>Codex turns Over3arth from daily motivation into a living operating system: long-range arcs, accountability allies, and personal laws that keep the world coherent.</p>
        </div>
        <SigilButton variant="secondary" onClick={() => setView('codex')}><Layers3 size={18} /> Open Codex</SigilButton>
      </section>

      <div className="three-column">
        <section className="glass-panel mini-panel">
          <span className="eyebrow">Active Quests</span>
          <h3>Next proof moves</h3>
          {urgentQuests.length ? urgentQuests.map((quest) => <QuestMini key={quest.id} quest={quest} updateState={updateState} />) : <EmptyLine text="No open quests. Generate one from a goal." />}
        </section>

        <section className="glass-panel mini-panel">
          <span className="eyebrow">Realm Map</span>
          <h3>Energy distribution</h3>
          <div className="realm-radar">
            {realms.map((realm) => {
              const count = state.goals.filter((goal) => goal.realm === realm.id).length + state.quests.filter((quest) => quest.realm === realm.id && quest.done).length;
              return <span key={realm.id} style={{ '--power': `${Math.min(100, count * 18 + 10)}%` }}>{realm.sigil}<small>{realm.name}</small></span>;
            })}
          </div>
        </section>

        <section className="glass-panel mini-panel">
          <span className="eyebrow">Recent Notes</span>
          <h3>Reality signals</h3>
          {recentNotes.length ? recentNotes.map((note) => <NoteMini key={note.id} note={note} />) : <EmptyLine text="Capture a signal, lesson, dream, or command." />}
        </section>
      </div>

      <section className="glass-panel research-panel">
        <span className="eyebrow">App Doctrine</span>
        <h2>Mythic interface. Grounded mechanics.</h2>
        <div className="principle-grid">
          {researchPrinciples.map((item) => (
            <article key={item.label}>
              <strong>{item.label}</strong>
              <p>{item.appMechanic}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel safety-panel">
        <span className="eyebrow">Grounding Protocol</span>
        <h2>Energy language. Real-world action.</h2>
        <p>Over3arth is a motivational productivity system. It helps you direct attention, plan behavior, record evidence, and build consistency. It does not replace medical, mental-health, legal, or financial support, and it does not guarantee external outcomes.</p>
      </section>
      </>) : null}
    </Page>
  );
}

function UniverseSimulation({ state, stats, forecast, anchorStats, worldInsight, setView, updateState }) {
  const sectors = useMemo(() => buildUniverseSectors(state), [state]);
  const gameGates = useMemo(() => navItems.filter((item) => item.id !== 'dashboard').map((item, index) => ({
    ...item,
    worldName: gateWorldNames[item.id] || item.label,
    coordinate: worldGateCoordinates[index % worldGateCoordinates.length]
  })), []);
  const [selectedRealmId, setSelectedRealmId] = useState(() => sectors.find((sector) => sector.openQuests || sector.openGoals)?.id || 'craft');
  const [activeGateId, setActiveGateId] = useState('realms');
  const [brainTarget, setBrainTarget] = useState('vessel');
  const [brainMode, setBrainMode] = useState('idle');
  const [brainLine, setBrainLine] = useState(() => `${DEFAULT_VESSEL_NAME} is awake above Overearth. Tap the voice sigil, say "Overearth" or "${DEFAULT_VESSEL_NAME}", then ask for a mission, realm jump, or status.`);
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef(null);
  const commandHandlerRef = useRef(null);
  const voiceEnabledRef = useRef(false);

  useEffect(() => {
    if (!sectors.some((sector) => sector.id === selectedRealmId)) {
      setSelectedRealmId(sectors[0]?.id || 'craft');
    }
  }, [selectedRealmId, sectors]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const selected = sectors.find((sector) => sector.id === selectedRealmId) || sectors[0];
  const selectedRealm = getRealm(selected?.id || 'craft');
  const selectedQuests = state.quests.filter((quest) => quest.realm === selectedRealm.id);
  const openRealmQuests = selectedQuests.filter((quest) => !quest.done);
  const priorityQuest = openRealmQuests[0] || state.quests.find((quest) => !quest.done);
  const activeGateIndex = Math.max(0, gameGates.findIndex((item) => item.id === activeGateId));
  const activeGate = gameGates[activeGateIndex] || gameGates[0];
  const avatarAngle = activeGateIndex * (360 / Math.max(1, gameGates.length));
  const vesselName = getVesselName(state);
  const voiceSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const worldskinCharge = clampPercent((stats.energy + selected.charge + (priorityQuest ? 18 : 0)) / 2);

  commandHandlerRef.current = handleVoiceCommand;

  return (
    <section className="spectacle-scene worldskin-scene" data-brain={brainTarget} data-voice={brainMode} aria-label="Playable Overearth universe">
      <WorldskinVeil charge={worldskinCharge} brainTarget={brainTarget} />
      <div
        className="world-charge-orbit spectacle-orbit worldskin-orbit"
        style={{ '--world-charge': `${Math.max(8, stats.energy)}%`, '--avatar-angle': `${avatarAngle}deg`, '--worldskin-charge': `${worldskinCharge}%` }}
      >
        <Globe className="game-world-globe spectacle-globe" intensity={Math.max(0.95, stats.energy / 60)} label={`${state.profile.worldName} world charge globe`} />
        <div className="worldskin-pulse-field" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="worldskin-gate-field" aria-label="Overearth world gates">
          {gameGates.map((gate, index) => {
            const Icon = gate.icon;
            return (
              <button
                key={gate.id}
                type="button"
                className={activeGateId === gate.id ? 'worldskin-gate active' : 'worldskin-gate'}
                style={{ '--gate-x': `${gate.coordinate.x}%`, '--gate-y': `${gate.coordinate.y}%`, '--gate-delay': `${index * -0.24}s` }}
                onClick={() => travelToGate(gate, true)}
                title={gate.worldName}
                aria-label={`Travel to ${gate.worldName}`}
              >
                <Icon size={15} />
              </button>
            );
          })}
          {sectors.map((sector, index) => {
            const coord = realmCoordinates[index % realmCoordinates.length];
            return (
              <button
                key={sector.id}
                type="button"
                className={selectedRealmId === sector.id ? 'worldskin-realm-node active' : 'worldskin-realm-node'}
                style={{ '--realm-x': `${coord.x}%`, '--realm-y': `${coord.y}%`, '--realm-charge': `${Math.max(12, sector.charge)}%`, '--realm-delay': `${index * -0.34}s` }}
                onClick={() => travelToRealm(sector, true)}
                title={sector.name}
                aria-label={`Enter ${sector.name}`}
              >
                {sector.sigil}
              </button>
            );
          })}
        </div>
        <div className="avatar-orbit spectacle-avatar-orbit" aria-hidden="true">
          <motion.div
            className="energy-being spectacle-being"
            animate={{ y: [0, -10, 0], scale: [1, 1.035, 1] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="being-aura" />
            <span className="being-sunburst" />
            <span className="being-thread thread-one" />
            <span className="being-thread thread-two" />
            <span className="being-thread thread-three" />
            <span className="being-rune-ring ring-outer" />
            <span className="being-rune-ring ring-inner" />
            <span className="being-crown" />
            <span className="being-arm arm-left" />
            <span className="being-arm arm-right" />
            <span className="being-core" />
            <span className="being-body" />
            <span className="being-shadow" />
            <span className="being-orbital-particles">
              {Array.from({ length: 14 }, (_, index) => (
                <i key={index} style={{ '--spark-angle': `${index * (360 / 14)}deg`, '--spark-delay': `${index * -0.17}s` }} />
              ))}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="worldskin-action-sigils" aria-label="Overearth game actions">
        <button type="button" className={voiceEnabled ? 'voice-aperture listening' : 'voice-aperture'} onClick={toggleListening} title={voiceEnabled ? 'Stop local voice brains' : 'Start local voice brains'} aria-label={voiceEnabled ? 'Stop local voice brains' : 'Start local voice brains'}>
          <Mic size={18} />
        </button>
        <button type="button" onClick={requestMission} title="Summon mission" aria-label="Summon mission"><Swords size={17} /></button>
        <button type="button" onClick={requestProofSeal} title="Seal proof" aria-label="Seal proof"><CheckCircle2 size={17} /></button>
        <button type="button" onClick={requestFocusPulse} title="Focus pulse" aria-label="Focus pulse"><Brain size={17} /></button>
        <button type="button" onClick={requestRitualPulse} title="Ritual pulse" aria-label="Ritual pulse"><Flame size={17} /></button>
        <button type="button" onClick={() => speakBrain(createBrainResponse({ transcript: 'status', target: 'overearth', state, stats, selectedRealm, activeGate, gates: gameGates, realms, vesselName }).response, 'overearth')} title="World status" aria-label="World status"><Radar size={17} /></button>
      </div>

      <motion.div className="worldskin-voice-ribbon" data-target={brainTarget} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} aria-live="polite">
        <span className="voice-ribbon-speaker">
          {brainTarget === 'overearth' ? <Globe2 size={14} /> : <Volume2 size={14} />}
          {brainTarget === 'overearth' ? 'Overearth' : vesselName}
        </span>
        <p>{brainLine}</p>
        <small>{lastTranscript ? `Heard: ${lastTranscript}` : voiceSupported ? 'Say “Overearth” or the vessel name after tapping the mic.' : 'Voice recognition is not available in this browser. The sigils still run the local brains.'}</small>
      </motion.div>
    </section>
  );

  function toggleListening() {
    if (voiceEnabled) {
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
      setBrainMode('idle');
      recognitionRef.current?.stop?.();
      speakBrain('Local listening is paused. The world remains awake through the sigils.', brainTarget);
      return;
    }

    if (!voiceSupported) {
      speakBrain('This browser cannot open speech recognition here. The local brains are still available through the sigils.', 'overearth');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result?.[0]?.transcript || '';
        if (transcript) commandHandlerRef.current?.(transcript);
      };
      recognition.onerror = () => {
        setBrainMode('idle');
        setVoiceEnabled(false);
        voiceEnabledRef.current = false;
      };
      recognition.onend = () => {
        if (!voiceEnabledRef.current) return;
        try {
          recognition.start();
        } catch {
          setBrainMode('idle');
        }
      };
      recognitionRef.current = recognition;
    }

    try {
      voiceEnabledRef.current = true;
      setVoiceEnabled(true);
      setBrainMode('listening');
      recognitionRef.current.start();
      speakBrain(`Local voice channel open. Say Overearth for the world brain, or say ${vesselName} for the vessel brain.`, 'overearth');
    } catch {
      setBrainMode('idle');
      setVoiceEnabled(false);
      voiceEnabledRef.current = false;
    }
  }

  function handleVoiceCommand(transcript) {
    const target = detectBrainTarget(transcript, vesselName, brainTarget);
    const result = createBrainResponse({ transcript, target, state, stats, selectedRealm, activeGate, gates: gameGates, realms, vesselName });
    setLastTranscript(transcript);
    setBrainTarget(result.target);
    applyBrainAction(result, transcript);
    rememberBrainExchange(transcript, result);
    speakBrain(result.response, result.target);
  }

  function applyBrainAction(result) {
    if (result.action === 'travel_realm') {
      const realm = sectors.find((sector) => sector.id === result.payload.realmId);
      if (realm) travelToRealm(realm, false);
    }
    if (result.action === 'travel_gate') {
      const gate = gameGates.find((item) => item.id === result.payload.gateId);
      if (gate) travelToGate(gate, false);
    }
    if (result.action === 'generate_mission') launchSectorMission();
    if (result.action === 'seal_quest') sealPriorityProof();
    if (result.action === 'ritual_pulse') sealRitualPulse();
    if (result.action === 'focus_pulse') sealFocusPulse();
    if (result.action === 'rename_vessel') {
      updateState((current) => ({
        ...current,
        profile: { ...current.profile, vesselName: result.payload.name }
      }), '', 'vessel_renamed');
    }
  }

  function speakBrain(text, target = 'vessel') {
    setBrainTarget(target);
    setBrainLine(text);
    setBrainMode('speaking');

    if (!speechSupported) {
      window.setTimeout(() => setBrainMode(voiceEnabledRef.current ? 'listening' : 'idle'), 900);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = target === 'overearth' ? 0.88 : 1;
    utterance.pitch = target === 'overearth' ? 0.72 : 1.22;
    utterance.volume = 0.92;
    utterance.onend = () => setBrainMode(voiceEnabledRef.current ? 'listening' : 'idle');
    window.speechSynthesis.speak(utterance);
  }

  function rememberBrainExchange(transcript, result) {
    updateState((current) => ({
      ...current,
      brainMemory: [
        {
          id: uid('brain'),
          target: result.target,
          command: transcript,
          response: result.response,
          realm: selectedRealm.id,
          gate: activeGate.id,
          createdAt: new Date().toISOString()
        },
        ...(current.brainMemory || [])
      ].slice(0, 60)
    }), '', 'brain_exchange_recorded');
  }

  function travelToGate(gate, shouldSpeak = false) {
    if (!gate) return;
    setActiveGateId(gate.id);
    trackEvent('avatar_travel', { destination: gate.id, mode: 'worldskin' });
    if (shouldSpeak) speakBrain(`${vesselName} crossed into ${gate.worldName}.`, 'vessel');
  }

  function travelToRealm(realm, shouldSpeak = false) {
    if (!realm) return;
    setSelectedRealmId(realm.id);
    setActiveGateId('realms');
    trackEvent('realm_travel', { destination: realm.id, mode: 'worldskin' });
    if (shouldSpeak) speakBrain(`${vesselName} is standing in ${realm.name}. ${realm.promise}`, 'vessel');
  }

  function requestMission() {
    launchSectorMission();
    speakBrain(`Mission forged in ${selectedRealm.name}. I placed it in the Quest Wilds.`, 'overearth');
  }

  function requestProofSeal() {
    if (!priorityQuest) {
      speakBrain('No open proof thread is close enough to seal. Summon a mission first.', 'overearth');
      return;
    }
    sealPriorityProof();
    speakBrain(`Proof sealed: ${priorityQuest.title}. The globe remembers.`, 'overearth');
  }

  function requestRitualPulse() {
    sealRitualPulse();
    speakBrain(`Ritual flame sealed for ${selectedRealm.name}.`, 'overearth');
  }

  function requestFocusPulse() {
    sealFocusPulse();
    speakBrain(`${vesselName} logged a focus pulse in ${selectedRealm.name}.`, 'vessel');
  }

  function launchSectorMission() {
    updateState((current) => {
      const realm = getRealm(selectedRealm.id);
      let goals = current.goals || [];
      let targetGoal = goals.find((goal) => goal.realm === realm.id && goal.status !== 'complete');

      if (!targetGoal) {
        targetGoal = {
          id: uid('goal'),
          title: realm.starterGoal,
          realm: realm.id,
          why: realm.promise,
          desiredOutcome: `${realm.name} becomes visible in the way I move today.`,
          obstacle: 'Letting the world stay conceptual instead of proving it with one action.',
          ifThen: 'If I drift into passive simulation, then I complete the smallest visible proof move.',
          targetDate: '',
          status: 'active',
          createdAt: new Date().toISOString(),
          milestones: []
        };
        goals = [targetGoal, ...goals];
      }

      const baseQuest = generateQuest(targetGoal);
      const quest = {
        ...baseQuest,
        title: `${realm.name} mission: ${baseQuest.title}`,
        evidence: 'Leave a visible receipt: a note, message, rep, screenshot, draft, decision, or shipped artifact.',
        dueDate: todayKey(),
        priority: 'simulation'
      };

      let next = { ...current, goals, quests: [quest, ...(current.quests || [])] };
      next = addLedgerEntry(next, 'simulation', `${realm.name} mission launched`, quest.title);
      return next;
    }, `${selectedRealm.name} mission launched.`, 'simulation_mission_launched');
  }

  function sealPriorityProof() {
    if (!priorityQuest) return;
    updateState((current) => {
      let next = {
        ...current,
        quests: current.quests.map((quest) => (
          quest.id === priorityQuest.id ? { ...quest, done: true, doneAt: new Date().toISOString() } : quest
        ))
      };
      next = addLedgerEntry(next, 'proof', 'Simulation proof sealed', priorityQuest.title);
      return next;
    }, '+40 XP. Simulation proof sealed.', 'simulation_proof_sealed');
  }

  function sealRitualPulse() {
    updateState((current) => {
      const existing = (current.rituals || []).find((ritual) => ritual.date === todayKey());
      const ritual = {
        id: existing?.id || uid('ritual'),
        date: todayKey(),
        focusRealm: selectedRealm.id,
        prompt: 'What reality are you feeding through the vessel today?',
        intention: `${selectedRealm.name} receives one clean signal today.`,
        nextAction: priorityQuest?.title || `Complete one visible proof move for ${selectedRealm.name}.`,
        release: 'I release passive simulation and feed the world through action.',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      let next = {
        ...current,
        rituals: [ritual, ...(current.rituals || []).filter((item) => item.date !== todayKey())]
      };
      next = addLedgerEntry(next, 'ritual', 'Worldskin ritual pulse sealed', ritual.nextAction);
      return next;
    }, '', 'worldskin_ritual_pulse');
  }

  function sealFocusPulse() {
    updateState((current) => {
      const session = {
        id: uid('focus'),
        title: `${selectedRealm.name} vessel focus pulse`,
        realm: selectedRealm.id,
        intent: priorityQuest?.title || `Give ${selectedRealm.name} thirteen minutes of proof.`,
        output: 'Worldskin focus pulse logged from the playable globe.',
        minutes: 13,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      let next = {
        ...current,
        focusSessions: [session, ...(current.focusSessions || [])].slice(0, 250)
      };
      next = addLedgerEntry(next, 'focus', 'Worldskin focus pulse completed', `${session.minutes} minutes · ${session.title}`);
      return next;
    }, '', 'worldskin_focus_pulse');
  }

  return (
    <section className="universe-simulation glass-panel neon-glow-panel">
      <div className="overearth-life-sim">
        <div className="life-sim-main">
          <div
            className="world-charge-orbit"
            style={{ '--world-charge': `${stats.energy}%`, '--avatar-angle': `${avatarAngle}deg` }}
            aria-label={`${state.profile.worldName} world charge globe`}
          >
            <Globe className="game-world-globe" intensity={Math.max(0.75, stats.energy / 72)} label={`${state.profile.worldName} world charge globe`} />
            <div className="avatar-orbit" aria-hidden="true">
              <div className="energy-being">
                <span className="being-crown" />
                <span className="being-core" />
                <span className="being-body" />
                <span className="being-shadow" />
              </div>
            </div>
            <div className="charge-readout">
              <strong>{stats.energy}%</strong>
              <span>World Charge</span>
            </div>
          </div>

          <div className="world-gate-grid" aria-label="Overearth world gates">
            {navItems.map((gate) => {
              const Icon = gate.icon;
              return (
                <button
                  type="button"
                  key={gate.id}
                  className={gate.id === activeGate.id ? 'world-gate active' : 'world-gate'}
                  onClick={() => travelToGate(gate)}
                >
                  <Icon size={17} />
                  <span>{gate.label}</span>
                  <small>World</small>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="life-sim-panel" aria-label="Energy-being status">
          <div className="avatar-card">
            <span className="eyebrow"><Sparkles size={14} /> Energy Being</span>
            <h2>{state.profile.name || 'World Forger'}</h2>
            <p>Standing over {state.profile.worldName}. Current destination: <strong>{activeGate.label}</strong>.</p>
          </div>

          <div className="needs-grid">
            {needs.map((need) => {
              const Icon = need.icon;
              return (
                <article key={need.label} className="need-meter" style={{ '--need': `${need.value}%` }}>
                  <div><Icon size={16} /><strong>{need.label}</strong><span>{need.value}%</span></div>
                  <i />
                  <small>{need.detail}</small>
                </article>
              );
            })}
          </div>

          <div className="mission-card game-mission">
            <span className="eyebrow"><Play size={14} /> Current Quest</span>
            {priorityQuest ? (
              <>
                <strong>{priorityQuest.title}</strong>
                <p>{priorityQuest.detail}</p>
                <button type="button" onClick={sealPriorityProof}><ShieldCheck size={16} /> Seal proof</button>
              </>
            ) : (
              <>
                <strong>The avatar needs a quest.</strong>
                <p>Pick a realm, launch a mission, and give the world charge a reason to rise.</p>
                <button type="button" onClick={launchSectorMission}><Swords size={16} /> Launch mission</button>
              </>
            )}
          </div>

          <div className="game-actions">
            <button type="button" onClick={launchSectorMission}><Swords size={16} /> Quest</button>
            <button type="button" onClick={() => travelToGate(navItems.find((item) => item.id === 'ritual'))}><Flame size={16} /> Ritual</button>
            <button type="button" onClick={() => travelToGate(navItems.find((item) => item.id === 'anchors'))}><Target size={16} /> Anchor</button>
            <button type="button" onClick={() => travelToGate(navItems.find((item) => item.id === worldInsight.targetView) || navItems[0])}><Brain size={16} /> Intel</button>
          </div>
        </aside>

        <div className="realm-world-strip" aria-label="Life realms">
          {sectors.map((sector) => (
            <button
              type="button"
              key={sector.id}
              className={sector.id === selectedRealm.id ? 'realm-world active' : 'realm-world'}
              style={{ '--charge': `${sector.charge}%` }}
              onClick={() => setSelectedRealmId(sector.id)}
            >
              <span>{sector.sigil}</span>
              <strong>{sector.name}</strong>
              <small>{sector.openQuests} quests · {sector.proofs} proof</small>
            </button>
          ))}
        </div>
      </div>

      <div className="simulation-stage">
        <div className="simulation-copy">
          <span className="eyebrow"><Radar size={14} /> Live Overearth Map</span>
          <h2><span className="neon-gradient-text">Simulated universe</span>, powered by proof.</h2>
          <p>
            Each realm is a sector. Goals increase mass, anchors stabilize orbit, quests become missions, and completed proof raises the charge of the map.
          </p>
        </div>

        <div className="overearth-map" role="group" aria-label="Overearth realm simulation map">
          <div className="orbit-ring ring-a" />
          <div className="orbit-ring ring-b" />
          <div className="orbit-ring ring-c" />
          <div className="planet-core">
            <span>{stats.energy}%</span>
            <small>world charge</small>
          </div>
          {sectors.map((sector) => (
            <button
              type="button"
              key={sector.id}
              className={sector.id === selectedRealm.id ? 'sector-node active' : 'sector-node'}
              style={{ '--angle': `${sector.angle}deg`, '--charge': `${sector.charge}%`, '--sector-index': sector.index }}
              onClick={() => setSelectedRealmId(sector.id)}
              aria-label={`Open ${sector.name} sector`}
            >
              <span>{sector.sigil}</span>
              <strong>{sector.name}</strong>
              <small>{sector.charge}%</small>
            </button>
          ))}
        </div>
      </div>

      <aside className="simulation-hud" aria-label="Selected sector mission control">
        <div className="hud-title">
          <span><CircleDot size={16} /> Sector selected</span>
          <strong>{selectedRealm.name}</strong>
          <small>{selectedRealm.promise}</small>
        </div>

        <div className="hud-metrics">
          <Stat icon={Target} label="Goals" value={selected?.goals || 0} />
          <Stat icon={Swords} label="Missions" value={selected?.openQuests || 0} />
          <Stat icon={ShieldCheck} label="Proof" value={selected?.proofs || 0} />
          <Stat icon={Activity} label="Charge" value={`${selected?.charge || 0}%`} />
        </div>

        <div className="mission-card">
          <span className="eyebrow"><Play size={14} /> Priority Mission</span>
          {priorityQuest ? (
            <>
              <strong>{priorityQuest.title}</strong>
              <p>{priorityQuest.detail}</p>
              <button type="button" onClick={sealPriorityProof}><ShieldCheck size={16} /> Seal proof</button>
            </>
          ) : (
            <>
              <strong>No active mission in the queue.</strong>
              <p>Launch one from this sector and give the simulation something real to track.</p>
              <button type="button" onClick={launchSectorMission}><Swords size={16} /> Launch mission</button>
            </>
          )}
        </div>

        <div className="sim-command-grid">
          <button type="button" onClick={launchSectorMission}><Swords size={16} /> Launch</button>
          <button type="button" onClick={() => setView('realms')}><Map size={16} /> Realms</button>
          <button type="button" onClick={() => setView('anchors')}><Target size={16} /> Anchors</button>
          <button type="button" onClick={() => setView(worldInsight.targetView)}><Brain size={16} /> Intel</button>
        </div>

        <div className="sim-readout">
          <span><strong>{simIntegrity}%</strong><small>Simulation integrity</small></span>
          <span><strong>{activeEpochs}</strong><small>Epoch arcs</small></span>
          <span><strong>{lawsOnline}</strong><small>World laws</small></span>
        </div>

        <div className="proof-stream">
          <span className="eyebrow">Recent sector proof</span>
          {recentProofs.length ? recentProofs.map((quest) => <QuestDone key={quest.id} quest={quest} />) : <EmptyLine text="No sealed proof in this sector yet." />}
        </div>
      </aside>
    </section>
  );
}

function Realms({ state, updateState }) {
  const [form, setForm] = useState({
    title: '', realm: 'craft', why: '', desiredOutcome: '', obstacle: '', ifThen: '', targetDate: ''
  });

  function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    updateState((current) => {
      const goal = {
        id: uid('goal'),
        ...form,
        status: 'active',
        createdAt: new Date().toISOString(),
        milestones: []
      };
      let next = { ...current, goals: [goal, ...current.goals], quests: [generateQuest(goal), ...current.quests] };
      next = addLedgerEntry(next, 'goal', 'Realm goal forged', `${goal.title} entered ${getRealm(goal.realm).name}.`);
      return next;
    }, 'Goal forged and quest created.', 'goal_created');
    setForm({ title: '', realm: form.realm, why: '', desiredOutcome: '', obstacle: '', ifThen: '', targetDate: '' });
  }

  function completeGoal(goalId) {
    updateState((current) => {
      const goal = current.goals.find((item) => item.id === goalId);
      let next = {
        ...current,
        goals: current.goals.map((item) => item.id === goalId ? { ...item, status: item.status === 'complete' ? 'active' : 'complete', completedAt: new Date().toISOString() } : item)
      };
      next = addLedgerEntry(next, 'goal', goal?.status === 'complete' ? 'Goal reopened' : 'Goal completed', goal?.title || 'Goal updated');
      return next;
    }, 'Realm status updated.', 'goal_status_changed');
  }

  function applyBlueprintPack(blueprint) {
    updateState((current) => {
      const goals = blueprint.goals.map((item) => ({
        id: uid('goal'),
        ...item,
        status: 'active',
        targetDate: '',
        createdAt: new Date().toISOString(),
        milestones: []
      }));
      const quests = goals.map(generateQuest);
      let next = { ...current, goals: [...goals, ...current.goals], quests: [...quests, ...current.quests] };
      next = addLedgerEntry(next, 'blueprint', `${blueprint.name} blueprint activated`, `${goals.length} goals and ${quests.length} first quests were added.`);
      return next;
    }, `${blueprint.name} activated.`, 'blueprint_activated');
  }

  return (
    <Page eyebrow="Realm Builder" title="Turn life areas into living worlds." copy="Each realm needs a desired outcome, a meaningful reason, a known obstacle, and an if–then plan. That is where intention becomes executable.">
      <div className="realm-layout">
        <aside className="realm-sidebar">
        <form className="glass-panel forge-form" onSubmit={submit}>
          <h2>Forge a goal</h2>
          <label>Goal title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Launch my new offer" /></label>
          <label>Realm<select value={form.realm} onChange={(e) => setForm({ ...form, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
          <label>Why this matters<textarea value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} placeholder="This matters because..." /></label>
          <label>Desired outcome<textarea value={form.desiredOutcome} onChange={(e) => setForm({ ...form, desiredOutcome: e.target.value })} placeholder="When this is real, my life looks like..." /></label>
          <label>Main obstacle<textarea value={form.obstacle} onChange={(e) => setForm({ ...form, obstacle: e.target.value })} placeholder="The predictable resistance is..." /></label>
          <label>If–then battle plan<textarea value={form.ifThen} onChange={(e) => setForm({ ...form, ifThen: e.target.value })} placeholder="If ___ happens, then I will ___." /></label>
          <label>Target date<input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></label>
          <SigilButton><Plus size={18} /> Forge goal</SigilButton>
        </form>

        <section className="glass-panel blueprint-panel">
          <span className="eyebrow">World Blueprints</span>
          <h2>Instant realm packs</h2>
          <p>Activate a serious starting system, then edit the goals to match your real life.</p>
          <div className="blueprint-grid">
            {worldBlueprints.map((blueprint) => (
              <button type="button" key={blueprint.id} onClick={() => applyBlueprintPack(blueprint)}>
                <strong><Layers3 size={16} /> {blueprint.name}</strong>
                <small>{blueprint.tagline}</small>
              </button>
            ))}
          </div>
        </section>
        </aside>

        <div className="goal-board">
          {realms.map((realm) => {
            const realmGoals = state.goals.filter((goal) => goal.realm === realm.id);
            return (
              <section className="glass-panel realm-card" key={realm.id}>
                <div className="realm-title"><span>{realm.sigil}</span><div><h3>{realm.name}</h3><p>{realm.promise}</p></div></div>
                {realmGoals.length ? realmGoals.map((goal) => (
                  <article className={goal.status === 'complete' ? 'goal-card complete' : 'goal-card'} key={goal.id}>
                    <div>
                      <strong>{goal.title}</strong>
                      <small>{goal.targetDate ? `Target: ${goal.targetDate}` : 'No deadline set'}</small>
                    </div>
                    {goal.desiredOutcome ? <p>{goal.desiredOutcome}</p> : null}
                    {goal.ifThen ? <blockquote>{goal.ifThen}</blockquote> : null}
                    <button onClick={() => completeGoal(goal.id)}>{goal.status === 'complete' ? 'Reopen' : 'Mark complete'}</button>
                  </article>
                )) : <EmptyLine text="No goals forged in this realm yet." />}
              </section>
            );
          })}
        </div>
      </div>
    </Page>
  );
}


function Anchors({ state, updateState }) {
  const anchorStats = calculateAnchorStats(state);
  const [form, setForm] = useState({
    name: '',
    realm: 'mind',
    cue: '',
    action: '',
    environment: '',
    friction: '',
    reward: ''
  });

  function applyTemplate(template) {
    setForm({
      name: template.name,
      realm: template.realm,
      cue: template.cue,
      action: template.action,
      environment: template.environment,
      friction: template.friction,
      reward: template.reward
    });
  }

  function createAnchor(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.cue.trim() || !form.action.trim()) return;
    updateState((current) => {
      const anchor = {
        id: uid('anchor'),
        ...form,
        name: form.name.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        activations: 0
      };
      let next = { ...current, anchors: [anchor, ...(current.anchors || [])] };
      next = addLedgerEntry(next, 'anchor', 'Reality anchor installed', `${anchor.name} was bound to ${getRealm(anchor.realm).name}.`);
      return next;
    }, 'Reality anchor installed.', 'anchor_created');
    setForm({ name: '', realm: form.realm, cue: '', action: '', environment: '', friction: '', reward: '' });
  }

  function activateAnchor(anchor) {
    updateState((current) => {
      const quest = createAnchorQuest(anchor);
      let next = {
        ...current,
        quests: [quest, ...(current.quests || [])],
        anchors: (current.anchors || []).map((item) => item.id === anchor.id ? { ...item, activations: Number(item.activations || 0) + 1, lastActivatedAt: new Date().toISOString() } : item)
      };
      next = addLedgerEntry(next, 'anchor', 'Anchor activation quest forged', quest.title);
      return next;
    }, 'Anchor converted into today’s proof quest.', 'anchor_activated');
  }

  function sealAnchor(anchorId) {
    updateState((current) => {
      const anchor = (current.anchors || []).find((item) => item.id === anchorId);
      let next = {
        ...current,
        anchors: (current.anchors || []).map((item) => item.id === anchorId ? { ...item, status: item.status === 'sealed' ? 'active' : 'sealed', sealedAt: new Date().toISOString() } : item)
      };
      next = addLedgerEntry(next, 'anchor', anchor?.status === 'sealed' ? 'Reality anchor reopened' : 'Reality anchor sealed', anchor?.name || 'Anchor updated');
      return next;
    }, 'Anchor status updated.', 'anchor_status_changed');
  }

  return (
    <Page eyebrow="Reality Anchors" title="Make the physical world trigger the identity you chose." copy="Anchors connect a cue, place, friction reducer, action, and reward. This turns intention into a repeatable loop instead of relying on mood.">
      <div className="anchor-layout">
        <aside className="anchor-sidebar">
          <form className="glass-panel forge-form" onSubmit={createAnchor}>
            <h2>Install anchor</h2>
            <label>Anchor name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Morning Command Anchor" /></label>
            <label>Realm<select value={form.realm} onChange={(e) => setForm({ ...form, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
            <label>Cue<textarea value={form.cue} onChange={(e) => setForm({ ...form, cue: e.target.value })} placeholder="When this happens..." /></label>
            <label>Action<textarea value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} placeholder="Then I do this visible proof move..." /></label>
            <label>Environment design<textarea value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} placeholder="Where does this anchor live?" /></label>
            <label>Friction reducer<textarea value={form.friction} onChange={(e) => setForm({ ...form, friction: e.target.value })} placeholder="What makes this easier to repeat?" /></label>
            <label>Reward / acknowledgment<textarea value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder="How do I acknowledge the loop?" /></label>
            <SigilButton><Target size={18} /> Save anchor</SigilButton>
          </form>

          <section className="glass-panel anchor-template-panel">
            <span className="eyebrow">Anchor Templates</span>
            <h2>Install a proven loop</h2>
            <div className="anchor-template-grid">
              {anchorTemplates.map((template) => (
                <button type="button" key={template.id} onClick={() => applyTemplate(template)}>
                  <strong>{template.name}</strong>
                  <small>{template.cue}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="glass-panel anchor-command-panel">
          <span className="eyebrow">Anchor Grid Strength</span>
          <h2>{anchorStats.strength}% bound</h2>
          <p>{anchorStats.active} active anchors · {anchorStats.sealed} sealed · {anchorStats.questLinked} quest-linked · {anchorStats.realmsCovered} realms covered.</p>
          <Meter value={anchorStats.strength} label="Environment alignment" detail="A strong anchor grid gives goals more daily triggers and less decision drag." />
        </section>

        <section className="anchor-board">
          {(state.anchors || []).length ? (state.anchors || []).map((anchor) => (
            <article className={anchor.status === 'sealed' ? 'glass-panel anchor-card sealed' : 'glass-panel anchor-card'} key={anchor.id}>
              <div className="anchor-card-head">
                <span>{getRealm(anchor.realm).sigil}</span>
                <div>
                  <strong>{anchor.name}</strong>
                  <small>{getRealm(anchor.realm).name} · activated {Number(anchor.activations || 0)} time{Number(anchor.activations || 0) === 1 ? '' : 's'}</small>
                </div>
              </div>
              <p><b>Cue:</b> {anchor.cue}</p>
              <p><b>Action:</b> {anchor.action}</p>
              {anchor.environment ? <p><b>Environment:</b> {anchor.environment}</p> : null}
              {anchor.friction ? <blockquote>{anchor.friction}</blockquote> : null}
              {anchor.reward ? <small>Reward: {anchor.reward}</small> : null}
              <div className="anchor-actions">
                <SigilButton variant="secondary" onClick={() => activateAnchor(anchor)}><Swords size={16} /> Quest this</SigilButton>
                <SigilButton variant="ghost" onClick={() => sealAnchor(anchor.id)}>{anchor.status === 'sealed' ? 'Reopen' : 'Seal'}</SigilButton>
              </div>
            </article>
          )) : <div className="glass-panel"><EmptyLine text="No anchors installed. Start with a template and bind your world to one real behavior cue." /></div>}
        </section>
      </div>
    </Page>
  );
}

function Quests({ state, updateState }) {
  const openQuests = state.quests.filter((quest) => !quest.done);
  const doneQuests = state.quests.filter((quest) => quest.done).slice(0, 12);
  const [manualQuest, setManualQuest] = useState({
    title: '',
    detail: '',
    realm: 'craft',
    dueDate: todayKey(),
    difficulty: 'medium',
    evidence: ''
  });

  function completeQuest(questId) {
    updateState((current) => {
      const quest = current.quests.find((item) => item.id === questId);
      let next = {
        ...current,
        quests: current.quests.map((item) => item.id === questId ? { ...item, done: true, doneAt: new Date().toISOString() } : item)
      };
      next = addLedgerEntry(next, 'proof', 'Quest completed', quest?.title || 'A proof move was completed.');
      return next;
    }, '+40 XP. Proof logged.', 'quest_completed');
  }

  function addQuestForGoal(goal) {
    updateState((current) => {
      const quest = generateQuest(goal);
      let next = { ...current, quests: [quest, ...current.quests] };
      next = addLedgerEntry(next, 'quest', 'Quest forged', quest.title);
      return next;
    }, 'New quest forged.', 'quest_created');
  }

  function addManualQuest(event) {
    event.preventDefault();
    if (!manualQuest.title.trim()) return;
    updateState((current) => {
      const quest = {
        id: uid('quest'),
        ...manualQuest,
        title: manualQuest.title.trim(),
        detail: manualQuest.detail || 'Manual proof move.',
        done: false,
        createdAt: new Date().toISOString(),
        priority: manualQuest.dueDate === todayKey() ? 'today' : 'scheduled'
      };
      let next = { ...current, quests: [quest, ...current.quests] };
      next = addLedgerEntry(next, 'quest', 'Manual quest forged', quest.title);
      return next;
    }, 'Manual quest forged.', 'manual_quest_created');
    setManualQuest({ title: '', detail: '', realm: manualQuest.realm, dueDate: todayKey(), difficulty: 'medium', evidence: '' });
  }

  return (
    <Page eyebrow="Proof Engine" title="Do not worship the goal. Complete the next proof." copy="Quests convert vision into small moves that can actually be finished today.">
      <div className="quest-layout">
        <section className="glass-panel quest-column">
          <h2>Open quests</h2>
          {openQuests.length ? openQuests.map((quest) => (
            <article className={quest.dueDate && quest.dueDate < todayKey() ? 'quest-card overdue' : 'quest-card'} key={quest.id}>
              <span>{getRealm(quest.realm).sigil}</span>
              <div>
                <strong>{quest.title}</strong>
                <p>{quest.detail}</p>
                <small>{getRealm(quest.realm).name}{quest.dueDate ? ` · Due ${quest.dueDate}` : ''}{quest.difficulty ? ` · ${quest.difficulty}` : ''}</small>
                {quest.evidence ? <em>Evidence target: {quest.evidence}</em> : null}
              </div>
              <SigilButton onClick={() => completeQuest(quest.id)}><ShieldCheck size={16} /> Complete</SigilButton>
            </article>
          )) : <EmptyLine text="No open quests. Build one from an active goal." />}
        </section>

        <section className="glass-panel quest-column compact">
          <form className="manual-quest-form" onSubmit={addManualQuest}>
            <h2>Forge manual proof</h2>
            <label>Quest title<input value={manualQuest.title} onChange={(e) => setManualQuest({ ...manualQuest, title: e.target.value })} placeholder="Send the proposal" /></label>
            <label>Realm<select value={manualQuest.realm} onChange={(e) => setManualQuest({ ...manualQuest, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
            <div className="two-field-grid">
              <label>Due<input type="date" value={manualQuest.dueDate} onChange={(e) => setManualQuest({ ...manualQuest, dueDate: e.target.value })} /></label>
              <label>Difficulty<select value={manualQuest.difficulty} onChange={(e) => setManualQuest({ ...manualQuest, difficulty: e.target.value })}><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option></select></label>
            </div>
            <label>Detail<textarea value={manualQuest.detail} onChange={(e) => setManualQuest({ ...manualQuest, detail: e.target.value })} placeholder="What exactly counts as proof?" /></label>
            <label>Evidence target<input value={manualQuest.evidence} onChange={(e) => setManualQuest({ ...manualQuest, evidence: e.target.value })} placeholder="Screenshot, link, sent message, receipt..." /></label>
            <SigilButton><Plus size={18} /> Add proof move</SigilButton>
          </form>

          <h2>Forge from goals</h2>
          {state.goals.filter((goal) => goal.status !== 'complete').map((goal) => (
            <button className="goal-quest-button" key={goal.id} onClick={() => addQuestForGoal(goal)}>
              <span>{getRealm(goal.realm).sigil}</span>
              <strong>{goal.title}</strong>
              <ChevronRight size={16} />
            </button>
          ))}
          <h2>Completed proof</h2>
          {doneQuests.length ? doneQuests.map((quest) => <QuestDone key={quest.id} quest={quest} />) : <EmptyLine text="Completed proof will appear here." />}
        </section>
      </div>
    </Page>
  );
}

function Ritual({ state, stats, updateState }) {
  const today = todayKey();
  const existing = state.rituals.find((ritual) => ritual.date === today);
  const settings = state.settings || {};
  const [reminderHour, setReminderHour] = useState(settings.reminderHour || '08:00');
  const [form, setForm] = useState(existing || {
    date: today,
    energy: 7,
    focusRealm: 'craft',
    prompt: ritualPrompts[Math.floor(Math.random() * ritualPrompts.length)],
    intention: '',
    release: '',
    nextAction: '',
    gratitude: ''
  });

  function submit(event) {
    event.preventDefault();
    updateState((current) => {
      const ritual = { ...form, id: existing?.id || uid('ritual'), createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      let next = {
        ...current,
        rituals: [ritual, ...current.rituals.filter((item) => item.date !== today)]
      };
      next = addLedgerEntry(next, 'ritual', existing ? 'Ritual updated' : 'Daily ritual completed', ritual.nextAction || ritual.intention);
      return next;
    }, 'Ritual sealed. Reality charge increased.', 'ritual_saved');
  }

  function saveReminder(event) {
    event.preventDefault();
    updateState((current) => {
      let next = { ...current, settings: { ...(current.settings || {}), reminderHour } };
      next = addLedgerEntry(next, 'settings', 'Ritual reminder time updated', `Daily ritual reminder target: ${reminderHour}.`);
      return next;
    }, 'Reminder preference saved.', 'reminder_saved');
  }

  async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('This browser does not support notification permission for this PWA.');
      return;
    }
    const permission = await window.Notification.requestPermission();
    updateState((current) => {
      let next = { ...current, settings: { ...(current.settings || {}), notificationPermission: permission } };
      next = addLedgerEntry(next, 'settings', 'Notification permission updated', `Browser permission is ${permission}.`);
      return next;
    }, `Notification permission: ${permission}.`, 'notification_permission_changed');
  }

  return (
    <Page eyebrow="Daily Power Ritual" title="Prime your energy before the world programs it for you." copy="Name the signal, release the leak, choose the proof. Keep it short enough to repeat and strong enough to matter.">
      <div className="ritual-layout">
        <form className="glass-panel ritual-form" onSubmit={submit}>
          <div className="prompt-card">
            <Brain size={22} />
            <strong>{form.prompt}</strong>
          </div>
          <label>Energy level: {form.energy}<input type="range" min="1" max="10" value={form.energy} onChange={(e) => setForm({ ...form, energy: e.target.value })} /></label>
          <label>Focus realm<select value={form.focusRealm} onChange={(e) => setForm({ ...form, focusRealm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
          <label>Today’s intention<textarea value={form.intention} onChange={(e) => setForm({ ...form, intention: e.target.value })} placeholder="Today I am feeding..." /></label>
          <label>What I release<textarea value={form.release} onChange={(e) => setForm({ ...form, release: e.target.value })} placeholder="I release the loop of..." /></label>
          <label>Next proof action<textarea value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} placeholder="Before the day ends, I will..." /></label>
          <label>Gratitude / evidence<textarea value={form.gratitude} onChange={(e) => setForm({ ...form, gratitude: e.target.value })} placeholder="Evidence I am already becoming..." /></label>
          <SigilButton><Flame size={18} /> Seal ritual</SigilButton>
        </form>

        <section className="glass-panel ritual-side">
          <span className="eyebrow">Charge Readout</span>
          <h2>{stats.energy}%</h2>
          <p>Reality Charge is a practical signal: ritual, proof, notes, and active goals. It keeps the mythic layer tied to behavior.</p>
          <Meter value={stats.energy} label="Charge" />

          <form className="reminder-panel" onSubmit={saveReminder}>
            <div>
              <span className="eyebrow">Return Signal</span>
              <h3><BellRing size={18} /> Ritual reminder</h3>
              <p>Stores the preferred daily return time locally. Browser notification permission is prepared for a future push backend or installable PWA enhancement.</p>
            </div>
            <label>Daily target time<input type="time" value={reminderHour} onChange={(e) => setReminderHour(e.target.value)} /></label>
            <div className="stacked-actions horizontal">
              <SigilButton><CheckCircle2 size={18} /> Save time</SigilButton>
              <SigilButton type="button" variant="secondary" onClick={requestNotificationPermission}><BellRing size={18} /> Enable browser</SigilButton>
            </div>
            <small>Permission: {settings.notificationPermission || 'default'}</small>
          </form>

          <div className="ritual-recap">
            {state.rituals.slice(0, 5).map((ritual) => (
              <article key={ritual.id}>
                <strong>{ritual.date}</strong>
                <p>{ritual.nextAction || ritual.intention}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}


function FocusChamber({ state, stats, updateState }) {
  const defaultMinutes = Number(state.settings?.focusDuration || 25);
  const [session, setSession] = useState({
    title: '',
    realm: 'craft',
    minutes: defaultMinutes,
    intent: focusSessionTemplates.find((template) => template.minutes === defaultMinutes)?.intent || 'Build one visible proof block with no input switching.',
    output: '',
    distraction: ''
  });
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const progress = Math.max(0, Math.min(100, Math.round((1 - secondsLeft / Math.max(60, Number(session.minutes || 1) * 60)) * 100)));
  const minuteLabel = `${Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:${(secondsLeft % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running) setSecondsLeft(Number(session.minutes || 25) * 60);
  }, [session.minutes, running]);

  function applyTemplate(template) {
    setRunning(false);
    setSession({
      ...session,
      title: template.name,
      realm: template.realm,
      minutes: template.minutes,
      intent: template.intent
    });
    setSecondsLeft(template.minutes * 60);
  }

  function completeSession(createQuest = false) {
    if (!session.intent.trim() && !session.title.trim()) return;
    updateState((current) => {
      const focusSession = {
        id: uid('focus'),
        ...session,
        title: session.title || `${session.minutes}-minute focus block`,
        minutes: Number(session.minutes || 25),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      let next = {
        ...current,
        focusSessions: [focusSession, ...(current.focusSessions || [])].slice(0, 250),
        settings: { ...(current.settings || {}), focusDuration: Number(session.minutes || 25) }
      };
      if (createQuest) next = { ...next, quests: [createFocusQuest(focusSession), ...(next.quests || [])] };
      next = addLedgerEntry(next, 'focus', 'Focus session completed', `${focusSession.minutes} minutes · ${focusSession.title}`);
      return next;
    }, createQuest ? 'Focus sealed and proof quest created.' : 'Focus sealed.', 'focus_session_completed');
    setRunning(false);
    setSecondsLeft(Number(session.minutes || 25) * 60);
    setSession({ ...session, output: '', distraction: '' });
  }

  function resetTimer() {
    setRunning(false);
    setSecondsLeft(Number(session.minutes || 25) * 60);
  }

  return (
    <Page eyebrow="Focus Chamber" title="Lock attention long enough to bend the day." copy="The chamber turns intention into protected minutes. Finish the block, name the output, then convert it into proof if it needs follow-through.">
      <div className="focus-layout">
        <section className="glass-panel focus-stage">
          <span className="eyebrow">Active Focus Block</span>
          <div className="focus-timer" style={{ '--progress': `${progress}%` }}>
            <span>{minuteLabel}</span>
            <small>{progress}% complete</small>
          </div>
          <Meter value={progress} label="Focus charge" detail={`${session.minutes || 25} minute chamber · ${getRealm(session.realm).name}`} />
          <div className="stacked-actions horizontal">
            <SigilButton onClick={() => setRunning((value) => !value)}><Zap size={18} /> {running ? 'Pause chamber' : 'Start chamber'}</SigilButton>
            <SigilButton variant="secondary" onClick={resetTimer}><RotateCcw size={18} /> Reset</SigilButton>
          </div>
          <div className="focus-proof-actions">
            <SigilButton onClick={() => completeSession(false)}><CheckCircle2 size={18} /> Seal focus</SigilButton>
            <SigilButton variant="secondary" onClick={() => completeSession(true)}><Swords size={18} /> Seal + quest</SigilButton>
          </div>
        </section>

        <form className="glass-panel focus-form" onSubmit={(event) => { event.preventDefault(); completeSession(false); }}>
          <h2>Command parameters</h2>
          <label>Focus title<input value={session.title} onChange={(e) => setSession({ ...session, title: e.target.value })} placeholder="Build the proposal, train, write, ship..." /></label>
          <label>Realm<select value={session.realm} onChange={(e) => setSession({ ...session, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
          <div className="two-field-grid">
            <label>Minutes<input type="number" min="5" max="180" value={session.minutes} onChange={(e) => setSession({ ...session, minutes: e.target.value })} /></label>
            <label>Output target<input value={session.output} onChange={(e) => setSession({ ...session, output: e.target.value })} placeholder="What must exist after?" /></label>
          </div>
          <label>Intent<textarea value={session.intent} onChange={(e) => setSession({ ...session, intent: e.target.value })} placeholder="During this chamber, I will..." /></label>
          <label>Distraction boundary<textarea value={session.distraction} onChange={(e) => setSession({ ...session, distraction: e.target.value })} placeholder="If distraction hits, I will..." /></label>
        </form>
      </div>

      <section className="glass-panel focus-template-panel">
        <span className="eyebrow">Focus Protocols</span>
        <h2>Fast chamber templates</h2>
        <div className="contract-template-grid">
          {focusSessionTemplates.map((template) => (
            <button type="button" key={template.id} onClick={() => applyTemplate(template)}>
              <strong>{template.name}</strong>
              <small>{template.minutes} minutes · {getRealm(template.realm).name}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel past-focus-panel">
        <span className="eyebrow">Deep Work Ledger</span>
        <h2>{stats.focusMinutes} total focus minutes · {stats.focusMinutesThisWeek} this week</h2>
        <div className="focus-history-list">
          {(state.focusSessions || []).length ? (state.focusSessions || []).slice(0, 10).map((item) => (
            <article key={item.id}>
              <span>{getRealm(item.realm).sigil}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.intent}</p>
                <small>{item.minutes} minutes · {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'Complete'}</small>
              </div>
            </article>
          )) : <EmptyLine text="No focus sessions sealed yet. Start the first chamber." />}
        </div>
      </section>
    </Page>
  );
}

function Affirm({ state, updateState }) {
  const [focusRealm, setFocusRealm] = useState('craft');
  const [text, setText] = useState(() => forgeAffirmation(state, 'craft'));

  function generate() {
    setText(forgeAffirmation(state, focusRealm));
  }

  function save() {
    updateState((current) => {
      const affirmation = { id: uid('affirm'), text, realm: focusRealm, createdAt: new Date().toISOString() };
      let next = { ...current, affirmations: [affirmation, ...current.affirmations] };
      next = addLedgerEntry(next, 'affirmation', 'Affirmation saved', text);
      return next;
    }, 'Affirmation saved to the vault.', 'affirmation_saved');
  }

  return (
    <Page eyebrow="Affirmation Forge" title="Language is a steering wheel for attention." copy="Use affirmations as identity commands, not empty comfort. Say what you are practicing, then prove it with behavior.">
      <div className="affirm-layout">
        <section className="glass-panel affirmation-stage">
          <label>Focus realm<select value={focusRealm} onChange={(e) => setFocusRealm(e.target.value)}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
          <motion.div key={text} className="affirmation-text" initial={{ opacity: 0, filter: 'blur(12px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }}>
            {text}
          </motion.div>
          <div className="stacked-actions horizontal">
            <SigilButton onClick={generate}><Wand2 size={18} /> Generate</SigilButton>
            <SigilButton variant="secondary" onClick={save}><Gem size={18} /> Save</SigilButton>
          </div>
        </section>

        <section className="glass-panel affirm-vault">
          <h2>Saved affirmations</h2>
          {state.affirmations.length ? state.affirmations.map((item) => (
            <article key={item.id}>
              <span>{getRealm(item.realm).sigil}</span>
              <p>{item.text}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </article>
          )) : <EmptyLine text="Your saved identity commands will appear here." />}
        </section>
      </div>
    </Page>
  );
}

function Notes({ state, updateState }) {
  const [form, setForm] = useState({ title: '', body: '', realm: 'mind', tag: 'signal', energy: 5 });

  function submit(event) {
    event.preventDefault();
    if (!form.body.trim() && !form.title.trim()) return;
    updateState((current) => {
      const note = { id: uid('note'), ...form, createdAt: new Date().toISOString() };
      let next = { ...current, notes: [note, ...current.notes] };
      next = addLedgerEntry(next, 'note', 'Reality signal captured', note.title || note.body.slice(0, 70));
      return next;
    }, 'Signal captured.', 'note_created');
    setForm({ title: '', body: '', realm: form.realm, tag: 'signal', energy: 5 });
  }

  return (
    <Page eyebrow="Reality Ledger" title="Capture the signals before they dissolve." copy="Use notes for ideas, dreams, lessons, emotions, downloads, plans, and evidence. The app turns reflection into searchable power.">
      <div className="notes-layout">
        <form className="glass-panel forge-form" onSubmit={submit}>
          <h2>New note</h2>
          <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Signal from today" /></label>
          <label>Realm<select value={form.realm} onChange={(e) => setForm({ ...form, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
          <label>Tag<input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="signal, lesson, dream, idea" /></label>
          <label>Intensity: {form.energy}<input type="range" min="1" max="10" value={form.energy} onChange={(e) => setForm({ ...form, energy: e.target.value })} /></label>
          <label>Body<textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write what needs to be remembered, released, or acted on..." rows="8" /></label>
          <SigilButton><BookOpen size={18} /> Save note</SigilButton>
        </form>

        <section className="note-grid">
          {state.notes.length ? state.notes.map((note) => (
            <article className="glass-panel note-card" key={note.id}>
              <div><span>{getRealm(note.realm).sigil}</span><small>{note.tag}</small></div>
              <h3>{note.title || 'Untitled signal'}</h3>
              <p>{note.body}</p>
              <footer><small>{new Date(note.createdAt).toLocaleString()}</small><strong>{note.energy}/10</strong></footer>
            </article>
          )) : <div className="glass-panel"><EmptyLine text="No notes yet. Capture the first signal." /></div>}
        </section>
      </div>
    </Page>
  );
}

function Review({ state, stats, updateState }) {
  const weekKey = getWeekKey();
  const existing = state.reviews?.find((review) => review.weekKey === weekKey);
  const realmScores = calculateRealmScores(state);
  const completedThisWeek = state.quests.filter((quest) => quest.done && dateWithinDays(quest.doneAt, 7)).length;
  const ritualsThisWeek = state.rituals.filter((ritual) => dateWithinDays(ritual.createdAt || ritual.date, 7)).length;
  const notesThisWeek = state.notes.filter((note) => dateWithinDays(note.createdAt, 7)).length;
  const score = Math.min(100, completedThisWeek * 12 + ritualsThisWeek * 10 + notesThisWeek * 6 + stats.activeGoals * 3);
  const [form, setForm] = useState(existing || {
    weekKey,
    wins: '',
    proof: '',
    drag: '',
    lesson: '',
    nextFocus: '',
    ifThenPlan: '',
    promise: ''
  });

  function saveReview(event) {
    event.preventDefault();
    updateState((current) => {
      const review = {
        ...form,
        id: existing?.id || uid('review'),
        weekKey,
        score,
        completedThisWeek,
        ritualsThisWeek,
        notesThisWeek,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      let next = {
        ...current,
        reviews: [review, ...(current.reviews || []).filter((item) => item.weekKey !== weekKey)]
      };
      next = addLedgerEntry(next, 'review', 'Weekly ascension review saved', `Week ${weekKey} scored ${score}/100.`);
      return next;
    }, 'Weekly review sealed.', 'weekly_review_saved');
  }

  return (
    <Page eyebrow="Ascension Review" title="Close the loop before the next loop starts." copy="A weekly review turns scattered effort into intelligence. Capture wins, drag, lessons, and the next command.">
      <div className="review-layout">
        <section className="glass-panel insight-panel">
          <span className="eyebrow">This Week</span>
          <h2>{score}%</h2>
          <p>Momentum score from completed proof, rituals, notes, and active realms. It is a signal, not a moral judgment.</p>
          <Meter value={score} label="Weekly momentum" detail={`${completedThisWeek} proofs · ${ritualsThisWeek} rituals · ${notesThisWeek} notes`} />
          <div className="stat-row compact">
            <Stat icon={ShieldCheck} label="Proofs" value={completedThisWeek} />
            <Stat icon={Flame} label="Rituals" value={ritualsThisWeek} />
            <Stat icon={BookOpen} label="Notes" value={notesThisWeek} />
          </div>
        </section>

        <form className="glass-panel review-form" onSubmit={saveReview}>
          <h2>Weekly command log</h2>
          <label>Wins<textarea value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} placeholder="What moved? What did I complete?" /></label>
          <label>Visible proof<textarea value={form.proof} onChange={(e) => setForm({ ...form, proof: e.target.value })} placeholder="Links, screenshots, completed actions, messages sent, reps logged..." /></label>
          <label>Drag / resistance<textarea value={form.drag} onChange={(e) => setForm({ ...form, drag: e.target.value })} placeholder="What kept trying to pull me back?" /></label>
          <label>Lesson<textarea value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} placeholder="What is the signal inside this week?" /></label>
          <label>Next week focus<textarea value={form.nextFocus} onChange={(e) => setForm({ ...form, nextFocus: e.target.value })} placeholder="The next reality I am feeding is..." /></label>
          <label>If–then plan<textarea value={form.ifThenPlan} onChange={(e) => setForm({ ...form, ifThenPlan: e.target.value })} placeholder="If the predictable obstacle appears, then I will..." /></label>
          <label>Promise to self<textarea value={form.promise} onChange={(e) => setForm({ ...form, promise: e.target.value })} placeholder="This week I will prove..." /></label>
          <SigilButton><CalendarDays size={18} /> Seal weekly review</SigilButton>
        </form>

        <section className="glass-panel realm-score-panel">
          <span className="eyebrow">Realm Intelligence</span>
          <h2>Where energy is moving</h2>
          <div className="realm-score-list">
            {realmScores.map((realm) => (
              <article key={realm.id}>
                <span>{realm.sigil}</span>
                <div>
                  <strong>{realm.name}</strong>
                  <Meter value={realm.score} label={`${realm.score}% charged`} />
                  <small>{realm.activeGoals} active · {realm.completedQuests} proofs · {realm.recentNotes} notes this week</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-panel past-reviews">
        <span className="eyebrow">Review Archive</span>
        <h2>Previous command logs</h2>
        {(state.reviews || []).length ? (state.reviews || []).slice(0, 8).map((review) => (
          <article key={review.id}>
            <strong>Week of {review.weekKey} · {review.score ?? 0}%</strong>
            <p>{review.nextFocus || review.lesson || review.wins || 'Review saved.'}</p>
          </article>
        )) : <EmptyLine text="No weekly reviews saved yet. Seal the first one." />}
      </section>
    </Page>
  );
}



function Codex({ state, stats, updateState }) {
  const epochStats = calculateEpochStats(state);
  const canonStats = calculateCanonStats(state);
  const activeEpochs = (state.epochs || []).filter((epoch) => epoch.status !== 'complete');
  const activeAllies = (state.allies || []).filter((ally) => ally.status !== 'archived');
  const activeCanon = (state.canon || []).filter((rule) => rule.status !== 'archived');
  const [epochForm, setEpochForm] = useState({ title: '', realm: 'craft', days: 30, northStar: '', milestones: '', evidence: '', startDate: todayKey() });
  const [allyForm, setAllyForm] = useState({ name: '', role: 'Witness', realm: 'heart', contact: '', cadence: 'Weekly', ask: '', nextCheckIn: todayKey() });
  const [canonForm, setCanonForm] = useState({ realm: 'mind', law: '', evidence: '', status: 'active' });
  const [scriptText, setScriptText] = useState('');

  function applyEpochTemplate(template) {
    setEpochForm({
      title: template.name,
      realm: template.realm,
      days: template.days,
      northStar: template.northStar,
      milestones: template.milestones.join('\n'),
      evidence: 'Completed proof quests, notes, links, screenshots, metrics, or real-world outputs.',
      startDate: todayKey()
    });
  }

  function createEpoch(event) {
    event.preventDefault();
    if (!epochForm.title.trim()) return;
    updateState((current) => {
      const epoch = {
        id: uid('epoch'),
        ...epochForm,
        title: epochForm.title.trim(),
        days: Number(epochForm.days || 30),
        milestones: epochForm.milestones.split('\n').map((item) => item.trim()).filter(Boolean),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      const quests = createEpochQuestWave(epoch);
      let next = { ...current, epochs: [epoch, ...(current.epochs || [])], quests: [...quests, ...(current.quests || [])] };
      next = addLedgerEntry(next, 'epoch', 'Epoch created', `${epoch.title} opened with ${quests.length} phase quests.`);
      return next;
    }, 'Epoch opened and phase quests forged.', 'epoch_created');
    setEpochForm({ ...epochForm, title: '', northStar: '', milestones: '', evidence: '' });
  }

  function completeEpoch(epochId) {
    updateState((current) => {
      const epoch = (current.epochs || []).find((item) => item.id === epochId);
      let next = {
        ...current,
        epochs: (current.epochs || []).map((item) => item.id === epochId ? { ...item, status: 'complete', completedAt: new Date().toISOString() } : item)
      };
      next = addLedgerEntry(next, 'epoch', 'Epoch sealed', epoch?.title || 'Epoch completed');
      return next;
    }, '+90 XP. Epoch sealed into the world archive.', 'epoch_completed');
  }

  function applyAllyTemplate(template) {
    setAllyForm({ ...allyForm, name: template.name, role: template.role, cadence: template.cadence, ask: template.ask });
  }

  function createAlly(event) {
    event.preventDefault();
    if (!allyForm.name.trim()) return;
    updateState((current) => {
      const ally = { id: uid('ally'), ...allyForm, status: 'active', createdAt: new Date().toISOString() };
      const quest = createAllianceQuest(ally);
      let next = { ...current, allies: [ally, ...(current.allies || [])], quests: [quest, ...(current.quests || [])] };
      next = addLedgerEntry(next, 'alliance', 'Alliance ally added', `${ally.name} added as ${ally.role}.`);
      return next;
    }, 'Ally added and check-in quest created.', 'ally_created');
    setAllyForm({ ...allyForm, name: '', contact: '', ask: '' });
  }

  function generateScript(ally) {
    const script = createAllianceScript(ally, state);
    setScriptText(script);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(script).catch(() => {});
    trackEvent('alliance_script_generated', { ally: ally.role });
  }

  function archiveAlly(allyId) {
    updateState((current) => {
      let next = { ...current, allies: (current.allies || []).map((ally) => ally.id === allyId ? { ...ally, status: 'archived', archivedAt: new Date().toISOString() } : ally) };
      next = addLedgerEntry(next, 'alliance', 'Ally archived', 'The accountability ally was moved out of the active circle.');
      return next;
    }, 'Ally archived.', 'ally_archived');
  }

  function applyCanonTemplate(template) {
    setCanonForm({ realm: template.realm, law: template.law, evidence: 'This law is proven through repeated behavior, not belief alone.', status: 'active' });
  }

  function createCanonRule(event) {
    event.preventDefault();
    if (!canonForm.law.trim()) return;
    updateState((current) => {
      const rule = { id: uid('law'), ...canonForm, status: 'active', createdAt: new Date().toISOString() };
      let next = { ...current, canon: [rule, ...(current.canon || [])] };
      next = addLedgerEntry(next, 'canon', 'World law installed', rule.law);
      return next;
    }, 'World law installed.', 'canon_created');
    setCanonForm({ ...canonForm, law: '', evidence: '' });
  }

  function archiveCanon(ruleId) {
    updateState((current) => {
      let next = { ...current, canon: (current.canon || []).map((rule) => rule.id === ruleId ? { ...rule, status: 'archived', archivedAt: new Date().toISOString() } : rule) };
      next = addLedgerEntry(next, 'canon', 'World law archived', 'A law was removed from the active codex.');
      return next;
    }, 'World law archived.', 'canon_archived');
  }

  return (
    <Page eyebrow="World Codex" title="Turn the intended reality into doctrine, allies, and time horizons." copy="Codex gives Over3arth a long-range operating system: epochs for transformation arcs, allies for accountability, and laws for identity-level consistency.">
      <section className="glass-panel codex-command-panel">
        <div>
          <span className="eyebrow">Codex Intelligence</span>
          <h2>Level {stats.level} · {epochStats.strength}% epoch field · {canonStats.strength}% law field</h2>
          <p>Strong worlds have structure. Use this page to decide the arc, name the support circle, and write the laws your actions must obey.</p>
        </div>
        <div className="stat-row compact">
          <Stat icon={Layers3} label="Active Epochs" value={epochStats.active} />
          <Stat icon={ShieldCheck} label="Allies" value={activeAllies.length} />
          <Stat icon={ScrollText} label="World Laws" value={canonStats.total} />
        </div>
      </section>

      <div className="codex-layout">
        <section className="glass-panel codex-form-panel">
          <span className="eyebrow">Epoch Planner</span>
          <h2>Open a transformation arc.</h2>
          <div className="contract-template-grid">
            {epochTemplates.map((template) => (
              <button type="button" key={template.id} onClick={() => applyEpochTemplate(template)}>
                <strong>{template.name}</strong>
                <small>{template.days} days · {getRealm(template.realm).name}</small>
              </button>
            ))}
          </div>
          <form className="codex-inner-form" onSubmit={createEpoch}>
            <label>Epoch title<input value={epochForm.title} onChange={(e) => setEpochForm({ ...epochForm, title: e.target.value })} placeholder="30-Day Wealth Dominion" /></label>
            <div className="two-field-grid">
              <label>Realm<select value={epochForm.realm} onChange={(e) => setEpochForm({ ...epochForm, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
              <label>Days<input type="number" min="3" max="180" value={epochForm.days} onChange={(e) => setEpochForm({ ...epochForm, days: e.target.value })} /></label>
            </div>
            <label>North star<textarea value={epochForm.northStar} onChange={(e) => setEpochForm({ ...epochForm, northStar: e.target.value })} placeholder="By the end of this arc, what must be visibly different?" /></label>
            <label>Milestones<textarea value={epochForm.milestones} onChange={(e) => setEpochForm({ ...epochForm, milestones: e.target.value })} placeholder="One milestone per line" /></label>
            <label>Evidence standard<input value={epochForm.evidence} onChange={(e) => setEpochForm({ ...epochForm, evidence: e.target.value })} placeholder="What counts as proof of the epoch?" /></label>
            <SigilButton><Layers3 size={18} /> Open epoch</SigilButton>
          </form>
        </section>

        <section className="glass-panel codex-list-panel">
          <span className="eyebrow">Active Epochs</span>
          <h2>{activeEpochs.length} arc{activeEpochs.length === 1 ? '' : 's'} commanding the horizon</h2>
          {activeEpochs.length ? activeEpochs.map((epoch) => (
            <article className="codex-card epoch-card" key={epoch.id}>
              <div><span>{getRealm(epoch.realm).sigil}</span><strong>{epoch.title}</strong></div>
              <p>{epoch.northStar}</p>
              <small>{epoch.days} days · started {epoch.startDate || epoch.createdAt?.slice(0, 10) || 'now'}</small>
              {epoch.milestones?.length ? <ul>{epoch.milestones.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              <SigilButton variant="secondary" onClick={() => completeEpoch(epoch.id)}><CheckCircle2 size={16} /> Seal epoch</SigilButton>
            </article>
          )) : <EmptyLine text="No active epochs yet. Open one arc so the world has a horizon." />}
          {(state.epochs || []).filter((epoch) => epoch.status === 'complete').length ? <p className="archive-line">{(state.epochs || []).filter((epoch) => epoch.status === 'complete').length} completed epoch{(state.epochs || []).filter((epoch) => epoch.status === 'complete').length === 1 ? '' : 's'} archived.</p> : null}
        </section>
      </div>

      <div className="codex-layout secondary">
        <section className="glass-panel codex-form-panel">
          <span className="eyebrow">Alliance Circle</span>
          <h2>Build accountability without fake messaging APIs.</h2>
          <p>Contacts are local records. Over3arth creates check-in scripts and quests; it does not send messages unless you add a real backend/provider later.</p>
          <div className="contract-template-grid">
            {allianceTemplates.map((template) => (
              <button type="button" key={template.id} onClick={() => applyAllyTemplate(template)}>
                <strong>{template.name}</strong>
                <small>{template.role} · {template.cadence}</small>
              </button>
            ))}
          </div>
          <form className="codex-inner-form" onSubmit={createAlly}>
            <label>Name<input value={allyForm.name} onChange={(e) => setAllyForm({ ...allyForm, name: e.target.value })} placeholder="Accountability ally" /></label>
            <div className="two-field-grid">
              <label>Role<input value={allyForm.role} onChange={(e) => setAllyForm({ ...allyForm, role: e.target.value })} placeholder="Witness, Builder, Coach..." /></label>
              <label>Realm<select value={allyForm.realm} onChange={(e) => setAllyForm({ ...allyForm, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
            </div>
            <label>Contact note<input value={allyForm.contact} onChange={(e) => setAllyForm({ ...allyForm, contact: e.target.value })} placeholder="Phone, handle, email, or where to reach them" /></label>
            <div className="two-field-grid">
              <label>Cadence<input value={allyForm.cadence} onChange={(e) => setAllyForm({ ...allyForm, cadence: e.target.value })} placeholder="Weekly" /></label>
              <label>Next check-in<input type="date" value={allyForm.nextCheckIn} onChange={(e) => setAllyForm({ ...allyForm, nextCheckIn: e.target.value })} /></label>
            </div>
            <label>Support ask<textarea value={allyForm.ask} onChange={(e) => setAllyForm({ ...allyForm, ask: e.target.value })} placeholder="What should they ask you or hold you to?" /></label>
            <SigilButton><ShieldCheck size={18} /> Add ally</SigilButton>
          </form>
        </section>

        <section className="glass-panel codex-list-panel">
          <span className="eyebrow">Active Allies</span>
          <h2>{activeAllies.length} support signal{activeAllies.length === 1 ? '' : 's'} online</h2>
          {activeAllies.length ? activeAllies.map((ally) => (
            <article className="codex-card ally-card" key={ally.id}>
              <div><span>{getRealm(ally.realm).sigil}</span><strong>{ally.name}</strong></div>
              <p>{ally.ask || 'Ask me what proof I created and what comes next.'}</p>
              <small>{ally.role} · {ally.cadence} · next {ally.nextCheckIn || 'unscheduled'}</small>
              {ally.contact ? <blockquote>{ally.contact}</blockquote> : null}
              <div className="stacked-actions horizontal">
                <SigilButton variant="secondary" onClick={() => generateScript(ally)}><ScrollText size={16} /> Copy script</SigilButton>
                <SigilButton variant="ghost" onClick={() => archiveAlly(ally.id)}><RotateCcw size={16} /> Archive</SigilButton>
              </div>
            </article>
          )) : <EmptyLine text="No allies added yet. Add one witness so proof has a mirror." />}
          {scriptText ? <textarea className="script-preview" readOnly value={scriptText} aria-label="Latest alliance check-in script" /> : null}
        </section>
      </div>

      <div className="codex-layout secondary">
        <section className="glass-panel codex-form-panel">
          <span className="eyebrow">World Laws</span>
          <h2>Install identity doctrine.</h2>
          <p>World laws are not magic claims. They are operating rules that shape attention, environment, language, and behavior.</p>
          <div className="contract-template-grid">
            {canonTemplates.map((template) => (
              <button type="button" key={template.id} onClick={() => applyCanonTemplate(template)}>
                <strong>{getRealm(template.realm).sigil} {getRealm(template.realm).name}</strong>
                <small>{template.law}</small>
              </button>
            ))}
          </div>
          <form className="codex-inner-form" onSubmit={createCanonRule}>
            <label>Realm<select value={canonForm.realm} onChange={(e) => setCanonForm({ ...canonForm, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
            <label>Law<textarea value={canonForm.law} onChange={(e) => setCanonForm({ ...canonForm, law: e.target.value })} placeholder="In this world, I..." /></label>
            <label>Evidence standard<input value={canonForm.evidence} onChange={(e) => setCanonForm({ ...canonForm, evidence: e.target.value })} placeholder="How will this law show up in behavior?" /></label>
            <SigilButton><ScrollText size={18} /> Install law</SigilButton>
          </form>
        </section>

        <section className="glass-panel codex-list-panel">
          <span className="eyebrow">Active Canon</span>
          <h2>{activeCanon.length} world law{activeCanon.length === 1 ? '' : 's'} installed</h2>
          <Meter value={canonStats.strength} label="Canon strength" detail={`${canonStats.realmsCovered} realms covered · ${canonStats.recentRules} recent laws`} />
          {activeCanon.length ? activeCanon.map((rule) => (
            <article className="codex-card law-card" key={rule.id}>
              <div><span>{getRealm(rule.realm).sigil}</span><strong>{getRealm(rule.realm).name}</strong></div>
              <p>{rule.law}</p>
              {rule.evidence ? <small>{rule.evidence}</small> : null}
              <SigilButton variant="ghost" onClick={() => archiveCanon(rule.id)}><RotateCcw size={16} /> Archive law</SigilButton>
            </article>
          )) : <EmptyLine text="No world laws yet. Install one rule your next actions must obey." />}
        </section>
      </div>
    </Page>
  );
}

function Ascend({ state, stats, updateState }) {
  const activeContracts = (state.contracts || []).filter((contract) => contract.status !== 'complete');
  const sealedContracts = (state.contracts || []).filter((contract) => contract.status === 'complete');
  const [contractForm, setContractForm] = useState({
    title: '',
    realm: 'craft',
    vow: '',
    dailyProof: '',
    evidence: '',
    boundary: '',
    reward: '',
    reviewDate: ''
  });

  function applyContractTemplate(template) {
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + template.days);
    setContractForm({
      title: template.name,
      realm: contractForm.realm,
      vow: `For ${template.days} days, I will protect one clear command and prove it with action.`,
      dailyProof: template.dailyProof,
      evidence: 'A completed quest, saved note, link, screenshot, or visible proof record.',
      boundary: template.boundary,
      reward: 'I acknowledge the proof, recover cleanly, and increase the standard by one step.',
      reviewDate: reviewDate.toISOString().slice(0, 10)
    });
  }

  function createContract(event) {
    event.preventDefault();
    if (!contractForm.title.trim()) return;
    updateState((current) => {
      const contract = {
        id: uid('contract'),
        ...contractForm,
        title: contractForm.title.trim(),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      const quest = generateContractQuest(contract);
      let next = {
        ...current,
        contracts: [contract, ...(current.contracts || [])],
        quests: [quest, ...(current.quests || [])]
      };
      next = addLedgerEntry(next, 'contract', 'Reality contract sealed', `${contract.title} entered ${getRealm(contract.realm).name}.`);
      return next;
    }, 'Reality contract sealed and first proof quest created.', 'contract_created');
    setContractForm({ title: '', realm: contractForm.realm, vow: '', dailyProof: '', evidence: '', boundary: '', reward: '', reviewDate: '' });
  }

  function completeContract(contractId) {
    updateState((current) => {
      const contract = (current.contracts || []).find((item) => item.id === contractId);
      let next = {
        ...current,
        contracts: (current.contracts || []).map((item) => item.id === contractId ? { ...item, status: 'complete', completedAt: new Date().toISOString() } : item)
      };
      next = addLedgerEntry(next, 'contract', 'Reality contract completed', contract?.title || 'Contract completed.');
      return next;
    }, '+75 XP. Contract archived as proof.', 'contract_completed');
  }

  function forgeCard() {
    const card = createAscensionCard(state, stats);
    updateState((current) => {
      let next = { ...current, shareCards: [card, ...(current.shareCards || [])].slice(0, 24) };
      next = addLedgerEntry(next, 'share', 'Ascension card forged', `${card.worldName} level ${card.level} card created.`);
      return next;
    }, 'Ascension card forged.', 'ascension_card_created');
    downloadTextFile(`over3arth-ascension-card-${todayKey()}.txt`, card.text);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(card.text).catch(() => {});
  }

  function choosePlan(plan) {
    updateState((current) => {
      let next = {
        ...current,
        settings: { ...(current.settings || {}), selectedPlan: plan.id },
        launchSignals: [
          { id: uid('signal'), planId: plan.id, planName: plan.name, createdAt: new Date().toISOString() },
          ...(current.launchSignals || [])
        ].slice(0, 50)
      };
      next = addLedgerEntry(next, 'launch', `${plan.name} plan interest saved`, 'Local signal only. No payment is collected in this build.');
      return next;
    }, `${plan.name} lane saved locally.`, 'plan_lane_selected');
  }

  return (
    <Page eyebrow="Ascension Layer" title="Contracts, share cards, and launch-ready monetization lanes." copy="This page adds retention and business infrastructure without pretending to charge users or sync data before those systems exist.">
      <div className="ascend-layout">
        <section className="glass-panel contract-forge">
          <span className="eyebrow">Reality Contracts</span>
          <h2>Turn a goal into a signed command.</h2>
          <p>A contract is a short arc with a vow, daily proof, boundary, reward, and review date.</p>
          <div className="contract-template-grid">
            {realityContractTemplates.map((template) => (
              <button type="button" key={template.id} onClick={() => applyContractTemplate(template)}>
                <strong>{template.name}</strong>
                <small>{template.days} days · {template.dailyProof}</small>
              </button>
            ))}
          </div>
          <form className="contract-form" onSubmit={createContract}>
            <label>Contract title<input value={contractForm.title} onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} placeholder="30-Day Wealth Forge" /></label>
            <label>Realm<select value={contractForm.realm} onChange={(e) => setContractForm({ ...contractForm, realm: e.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
            <label>Vow<textarea value={contractForm.vow} onChange={(e) => setContractForm({ ...contractForm, vow: e.target.value })} placeholder="I commit to..." /></label>
            <label>Daily proof<textarea value={contractForm.dailyProof} onChange={(e) => setContractForm({ ...contractForm, dailyProof: e.target.value })} placeholder="Every day I will prove this by..." /></label>
            <label>Evidence standard<input value={contractForm.evidence} onChange={(e) => setContractForm({ ...contractForm, evidence: e.target.value })} placeholder="What counts as proof?" /></label>
            <label>Boundary<textarea value={contractForm.boundary} onChange={(e) => setContractForm({ ...contractForm, boundary: e.target.value })} placeholder="What behavior protects the contract?" /></label>
            <div className="two-field-grid">
              <label>Reward<input value={contractForm.reward} onChange={(e) => setContractForm({ ...contractForm, reward: e.target.value })} placeholder="How will I acknowledge completion?" /></label>
              <label>Review date<input type="date" value={contractForm.reviewDate} onChange={(e) => setContractForm({ ...contractForm, reviewDate: e.target.value })} /></label>
            </div>
            <SigilButton><CheckCircle2 size={18} /> Seal contract</SigilButton>
          </form>
        </section>

        <section className="glass-panel contract-board">
          <span className="eyebrow">Active Contracts</span>
          <h2>{activeContracts.length} command arc{activeContracts.length === 1 ? '' : 's'} online</h2>
          {activeContracts.length ? activeContracts.map((contract) => (
            <article className="contract-card" key={contract.id}>
              <div><span>{getRealm(contract.realm).sigil}</span><strong>{contract.title}</strong></div>
              <p>{contract.vow}</p>
              <small>Daily proof: {contract.dailyProof || 'Visible action'}{contract.reviewDate ? ` · Review ${contract.reviewDate}` : ''}</small>
              {contract.boundary ? <blockquote>{contract.boundary}</blockquote> : null}
              <SigilButton variant="secondary" onClick={() => completeContract(contract.id)}><ShieldCheck size={16} /> Complete contract</SigilButton>
            </article>
          )) : <EmptyLine text="No active contracts yet. Seal one command arc." />}
          {sealedContracts.length ? <p className="archive-line">{sealedContracts.length} sealed contract{sealedContracts.length === 1 ? '' : 's'} archived as proof.</p> : null}
        </section>
      </div>

      <div className="ascend-layout secondary">
        <section className="glass-panel share-card-panel">
          <span className="eyebrow">Share / Export</span>
          <h2>Forge an Ascension Card.</h2>
          <p>Create a clean text card users can copy, download, post, or save. This avoids fake social APIs while giving the app a viral artifact layer.</p>
          <div className="ascension-card-preview">
            <strong>{state.profile.worldName}</strong>
            <span>Level {stats.level} · {stats.energy}% charge · {stats.completedQuests} proofs</span>
            <p>{state.profile.primeIntention}</p>
          </div>
          <SigilButton onClick={forgeCard}><Download size={18} /> Download card</SigilButton>
          {(state.shareCards || []).length ? <small>{state.shareCards.length} card{state.shareCards.length === 1 ? '' : 's'} forged locally.</small> : null}
        </section>

        <section className="glass-panel plan-panel">
          <span className="eyebrow">Monetization Readiness</span>
          <h2>Pricing lanes without fake billing.</h2>
          <p>These cards are local launch signals. They do not process payments. Add Stripe, Lemon Squeezy, Polar, or your own billing gateway when backend auth is ready.</p>
          <div className="plan-grid">
            {planLanes.map((plan) => (
              <article className={state.settings?.selectedPlan === plan.id ? 'plan-card selected' : 'plan-card'} key={plan.id}>
                <strong>{plan.name}</strong>
                <span>{plan.price}</span>
                <p>{plan.promise}</p>
                <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <SigilButton variant="secondary" onClick={() => choosePlan(plan)}>Save lane</SigilButton>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

function Ledger({ state, updateState }) {
  const fileId = 'over3arth-import';
  const [snapshots, setSnapshots] = useState(() => getSnapshotVault());

  function refreshSnapshots() {
    setSnapshots(getSnapshotVault());
  }

  function importLedger(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedState = parseImportedState(reader.result, state);
        updateState(importedState, 'Ledger imported safely.', 'ledger_imported');
        refreshSnapshots();
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function createManualSnapshot() {
    saveSnapshot(state, 'Manual operator snapshot');
    refreshSnapshots();
    updateState((current) => addLedgerEntry(current, 'backup', 'Manual snapshot saved', 'A local restore point was written to this browser.'), 'Snapshot saved.', 'snapshot_saved');
  }

  function restoreLocalSnapshot(snapshotId) {
    const confirmed = window.confirm('Restore this Over3arth snapshot on this device? Export your current world first if you need it.');
    if (!confirmed) return;
    try {
      const restored = restoreSnapshot(snapshotId, state);
      updateState(addLedgerEntry(restored, 'backup', 'Snapshot restored', 'The world state was restored from the local snapshot vault.'), 'Snapshot restored.', 'snapshot_restored');
      refreshSnapshots();
    } catch (error) {
      alert(`Restore failed: ${error.message}`);
    }
  }

  function wipeSnapshots() {
    const confirmed = window.confirm('Clear all local snapshots? This does not reset the active world.');
    if (!confirmed) return;
    clearSnapshots();
    refreshSnapshots();
    updateState((current) => addLedgerEntry(current, 'backup', 'Snapshot vault cleared', 'Local restore points were removed from this browser.'), 'Snapshot vault cleared.', 'snapshot_vault_cleared');
  }

  return (
    <Page eyebrow="System Ledger" title="Proof, rituals, notes, backups, and world changes." copy="The ledger makes your momentum visible. Data is stored locally on this device unless you export or add a backend sync layer later.">
      <div className="ledger-actions glass-panel">
        <SigilButton onClick={() => { exportState(state); trackEvent('export_ledger'); }}><Download size={18} /> Export JSON</SigilButton>
        <label className="sigil-button secondary" htmlFor={fileId}><Upload size={18} /> Import JSON</label>
        <input id={fileId} type="file" accept="application/json" onChange={importLedger} hidden />
        <SigilButton variant="secondary" onClick={createManualSnapshot}><ShieldCheck size={18} /> Save snapshot</SigilButton>
        <SigilButton variant="danger" onClick={resetState}><RotateCcw size={18} /> Reset world</SigilButton>
      </div>

      <section className="glass-panel snapshot-vault">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">Restore Vault</span>
            <h2>{snapshots.length} local restore point{snapshots.length === 1 ? '' : 's'}</h2>
            <p>Over3arth now keeps a local snapshot vault. It is still browser-local, so JSON export remains the safest cross-device backup.</p>
          </div>
          {snapshots.length ? <SigilButton variant="ghost" onClick={wipeSnapshots}><RotateCcw size={16} /> Clear vault</SigilButton> : null}
        </div>
        <div className="snapshot-grid">
          {snapshots.length ? snapshots.map((snapshot) => (
            <article key={snapshot.id} className="snapshot-card">
              <strong>{snapshot.reason}</strong>
              <small>{snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : 'No timestamp'} · schema v{snapshot.schemaVersion}</small>
              <p>{snapshot.goals} goals · {snapshot.quests} quests · {snapshot.notes} notes · {snapshot.rituals} rituals · {snapshot.focusSessions} focus sessions · {snapshot.anchors || 0} anchors · {snapshot.epochs || 0} epochs · {snapshot.allies || 0} allies · {snapshot.canon || 0} laws</p>
              <SigilButton variant="secondary" onClick={() => restoreLocalSnapshot(snapshot.id)}>Restore</SigilButton>
            </article>
          )) : <EmptyLine text="No snapshots yet. Save one before major edits or imports." />}
        </div>
      </section>

      <section className="glass-panel ledger-list">
        {state.ledger.length ? state.ledger.map((entry) => (
          <article key={entry.id}>
            <span>{entry.type}</span>
            <div>
              <strong>{entry.title}</strong>
              {entry.detail ? <p>{entry.detail}</p> : null}
              <small>{new Date(entry.createdAt).toLocaleString()}</small>
            </div>
          </article>
        )) : <EmptyLine text="No ledger entries yet." />}
      </section>
    </Page>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat-card">
      <Icon size={18} />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function QuestMini({ quest, updateState }) {
  function complete() {
    updateState((current) => {
      let next = {
        ...current,
        quests: current.quests.map((item) => item.id === quest.id ? { ...item, done: true, doneAt: new Date().toISOString() } : item)
      };
      next = addLedgerEntry(next, 'proof', 'Quest completed', quest.title);
      return next;
    }, '+40 XP. Proof logged.', 'quest_completed');
  }

  return (
    <article className="mini-item">
      <span>{getRealm(quest.realm).sigil}</span>
      <div><strong>{quest.title}</strong><small>{quest.detail}</small></div>
      <button onClick={complete}>Done</button>
    </article>
  );
}

function NoteMini({ note }) {
  return (
    <article className="mini-item note-mini">
      <span>{getRealm(note.realm).sigil}</span>
      <div><strong>{note.title || 'Untitled'}</strong><small>{note.body.slice(0, 82)}</small></div>
    </article>
  );
}

function QuestDone({ quest }) {
  return (
    <article className="done-item">
      <span>{getRealm(quest.realm).sigil}</span>
      <div>
        <strong>{quest.title}</strong>
        <small>{quest.doneAt ? new Date(quest.doneAt).toLocaleString() : 'Complete'}</small>
      </div>
    </article>
  );
}

function EmptyLine({ text }) {
  return <p className="empty-line">{text}</p>;
}

export default App;
