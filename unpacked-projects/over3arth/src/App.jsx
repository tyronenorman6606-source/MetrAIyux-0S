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
import NeuralSpaceField from './components/NeuralSpaceField.jsx';
import NeuralSpacePortal from './components/NeuralSpacePortal.jsx';
import SigilButton from './components/SigilButton.jsx';
import { Globe } from './registry/magicui/globe.jsx';
import { allianceTemplates, anchorTemplates, archetypes, canonTemplates, epochTemplates, focusSessionTemplates, planLanes, realms, realityContractTemplates, researchPrinciples, ritualPrompts, worldBlueprints } from './data/over3arthContent.js';
import { getNeuralSpaceLane, neuralSpaceLanes } from './data/neuralSpacePro.js';
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
import { archiveNeuralSpaceExchange, loadNeuralRuntimeSignal, triggerNeuralSpaceBuild } from './lib/neuralSpaceRuntime.js';
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
  const [audioOutputEnabled, setAudioOutputEnabled] = useState(false);
  const [travelPulse, setTravelPulse] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [neuralLaneId, setNeuralLaneId] = useState('chat');
  const [neuralRuntime, setNeuralRuntime] = useState({ online: false, checkedAt: null, summary: null });
  const [neuralBusy, setNeuralBusy] = useState(false);
  const [brainLog, setBrainLog] = useState(() => [
    {
      id: 'boot_vessel',
      target: 'vessel',
      role: 'brain',
      text: `${DEFAULT_VESSEL_NAME} online. I can take typed commands here while the mic listens from the sigil.`,
      createdAt: new Date().toISOString()
    }
  ]);
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

  useEffect(() => {
    refreshNeuralRuntime({ silent: true });
  }, []);

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
  const activeGateCoord = activeGate.coordinate || { x: 50, y: 28 };
  const activeNeuralLane = getNeuralSpaceLane(neuralLaneId);

  commandHandlerRef.current = (transcript) => handleBrainCommand(transcript, 'voice');

  return (
    <section className="spectacle-scene worldskin-scene" data-brain={brainTarget} data-voice={brainMode} data-neural-lane={neuralLaneId} aria-label="Playable Overearth universe">
      <NeuralSpaceField activeLaneId={neuralLaneId} charge={worldskinCharge} brainTarget={brainTarget} travelPulse={travelPulse} />
      <div
        className="world-charge-orbit spectacle-orbit worldskin-orbit"
        style={{
          '--world-charge': `${Math.max(8, stats.energy)}%`,
          '--avatar-angle': `${avatarAngle}deg`,
          '--worldskin-charge': `${worldskinCharge}%`,
          '--rift-x': `${activeGateCoord.x}%`,
          '--rift-y': `${activeGateCoord.y}%`,
          '--neural-color': activeNeuralLane.color
        }}
      >
        <Globe className="game-world-globe spectacle-globe" intensity={Math.max(0.95, stats.energy / 60)} label={`${state.profile.worldName} world charge globe`} />
        <div className="worldskin-pulse-field" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="worldskin-interior-rift" key={`rift-${activeGateId}-${selectedRealmId}-${travelPulse}`} aria-hidden="true">
          <span className="rift-core" />
          <span className="rift-depth depth-one" />
          <span className="rift-depth depth-two" />
          <span className="rift-route route-one" />
          <span className="rift-route route-two" />
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

      <motion.div className="worldskin-brain-dock" data-target={brainTarget} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} aria-live="polite">
        <div className="brain-dock-head">
          <span className="voice-ribbon-speaker">
            {brainTarget === 'overearth' ? <Globe2 size={14} /> : <Volume2 size={14} />}
            {brainTarget === 'overearth' ? 'Overearth' : vesselName}
          </span>
          <div className="brain-dock-status">
            <span className={voiceEnabled ? 'listening-dot active' : 'listening-dot'} />
            {voiceEnabled ? 'Listening' : voiceSupported ? 'Mic ready' : 'Typed mode'}
          </div>
        </div>
        <div className="brain-dock-worldline">
          <strong>{activeGate.worldName}</strong>
          <span>{selectedRealm.name} / {activeNeuralLane.shortLabel}</span>
        </div>
        <div className="brain-log" aria-label="Overearth brain chat log">
          {brainLog.slice(-4).map((item) => (
            <div key={item.id} className={`brain-log-entry ${item.role} ${item.target || 'player'}`}>
              <span>{item.role === 'player' ? 'You' : item.target === 'overearth' ? 'Overearth' : vesselName}</span>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
        <NeuralSpacePortal
          lanes={neuralSpaceLanes}
          activeLaneId={neuralLaneId}
          runtime={neuralRuntime}
          busy={neuralBusy}
          onSelectLane={(laneId) => selectNeuralLane(laneId, true)}
          onRefresh={() => refreshNeuralRuntime()}
        />
        <form className="brain-command-line" onSubmit={submitBrainChat}>
          <MessageCircle size={15} aria-hidden="true" />
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder={`Talk to Overearth, ${vesselName}, or NeuralSpacePro`}
            aria-label={`Talk to Overearth, ${vesselName}, or NeuralSpacePro`}
          />
          <button type="submit" aria-label="Send brain command"><ChevronRight size={16} /></button>
        </form>
        <div className="brain-dock-controls">
          <button type="button" onClick={toggleListening}>{voiceEnabled ? 'Stop mic' : 'Start mic'}</button>
          <button type="button" onClick={() => setAudioOutputEnabled((value) => !value)}>{audioOutputEnabled ? 'Mute voice' : 'Enable voice'}</button>
        </div>
        <small>{lastTranscript ? `Heard: ${lastTranscript}` : neuralRuntime.online ? 'NeuralSpace runtime linked through the local worker.' : 'Type here anytime. Start the NeuralSpace runtime to archive sessions and build proofs.'}</small>
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

  function submitBrainChat(event) {
    event.preventDefault();
    const transcript = chatInput.trim();
    if (!transcript) return;
    setChatInput('');
    handleBrainCommand(transcript, 'typed');
  }

  function handleBrainCommand(transcript, source = 'typed') {
    const target = detectBrainTarget(transcript, vesselName, brainTarget);
    const result = createBrainResponse({ transcript, target, state, stats, selectedRealm, activeGate, gates: gameGates, realms, vesselName });
    setLastTranscript(transcript);
    setBrainTarget(result.target);
    appendBrainLog([
      {
        id: uid('player'),
        role: 'player',
        source,
        text: transcript,
        createdAt: new Date().toISOString()
      },
      {
        id: uid('brain'),
        role: 'brain',
        target: result.target,
        text: result.response,
        createdAt: new Date().toISOString()
      }
    ]);
    applyBrainAction(result, transcript);
    rememberBrainExchange(transcript, result);
    bridgeNeuralSpace(result, transcript);
    speakBrain(result.response, result.target, { log: false });
  }

  function applyBrainAction(result, transcript) {
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
    if (['open_neural_lane', 'neural_research', 'neural_build'].includes(result.action)) {
      selectNeuralLane(result.payload?.laneId || 'chat', false);
    }
    if (result.action === 'neural_build') {
      launchNeuralSpaceBuild(transcript, result);
    }
  }

  function selectNeuralLane(laneId, shouldSpeak = false) {
    const lane = getNeuralSpaceLane(laneId);
    setNeuralLaneId(lane.id);
    setTravelPulse((value) => value + 1);
    const linkedGate = gameGates.find((item) => item.id === lane.gateId);
    if (linkedGate) setActiveGateId(linkedGate.id);
    if (shouldSpeak) {
      speakBrain(`${lane.label} is now the active assistant dimension. ${lane.response}`, 'vessel');
    }
  }

  async function refreshNeuralRuntime(options = {}) {
    const { silent = false } = options;
    setNeuralBusy(true);
    try {
      const signal = await loadNeuralRuntimeSignal();
      setNeuralRuntime(signal);
      if (!silent) {
        appendBrainLog([{
          id: uid('neural_sync'),
          role: 'brain',
          target: 'vessel',
          text: signal.online
            ? `NeuralSpace runtime linked: ${signal.summary.sessionCount} sessions, ${signal.summary.projectCount} projects, ${signal.summary.queueDepth} queued events.`
            : 'NeuralSpace runtime is staged, but the local worker is not responding yet.',
          createdAt: new Date().toISOString()
        }]);
      }
      return signal;
    } catch {
      const offline = { online: false, checkedAt: new Date().toISOString(), summary: null };
      setNeuralRuntime(offline);
      if (!silent) {
        appendBrainLog([{
          id: uid('neural_sync'),
          role: 'brain',
          target: 'vessel',
          text: 'NeuralSpace runtime is waiting. Start the local runtime and I can archive chats, builds, queues, and handoffs from here.',
          createdAt: new Date().toISOString()
        }]);
      }
      return offline;
    } finally {
      setNeuralBusy(false);
    }
  }

  async function bridgeNeuralSpace(result, transcript) {
    if (!['open_neural_lane', 'neural_research'].includes(result.action)) return;
    setNeuralBusy(true);
    try {
      const laneId = result.payload?.laneId || neuralLaneId;
      const payload = await archiveNeuralSpaceExchange({
        transcript,
        response: result.response,
        laneId,
        context: {
          worldName: state.profile.worldName,
          realmName: selectedRealm.name,
          gateName: activeGate.worldName
        }
      });
      appendBrainLog([{
        id: uid('neural_session'),
        role: 'brain',
        target: 'vessel',
        text: `NeuralSpace archived this as ${payload.sessionId}.`,
        createdAt: new Date().toISOString()
      }]);
      await refreshNeuralRuntime({ silent: true });
    } catch {
      appendBrainLog([{
        id: uid('neural_session'),
        role: 'brain',
        target: 'vessel',
        text: 'NeuralSpace lane is open visually. The local runtime will start archiving once its worker is running.',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setNeuralBusy(false);
    }
  }

  async function launchNeuralSpaceBuild(transcript, result) {
    setNeuralBusy(true);
    try {
      const laneId = result.payload?.laneId || 'build';
      const payload = await triggerNeuralSpaceBuild({
        laneId,
        brief: [
          transcript,
          '',
          `Overearth context: ${state.profile.worldName} / ${selectedRealm.name} / ${activeGate.worldName}.`,
          'Generate only local proof artifacts for this assistant-universe build lane.'
        ].join('\n'),
        context: {
          worldName: state.profile.worldName
        }
      });
      appendBrainLog([{
        id: uid('neural_build'),
        role: 'brain',
        target: 'vessel',
        text: `Build Forge generated ${payload.projectId} with quality ${payload.qualityScore}. The queue now has a proof event.`,
        createdAt: new Date().toISOString()
      }]);
      await refreshNeuralRuntime({ silent: true });
    } catch {
      appendBrainLog([{
        id: uid('neural_build'),
        role: 'brain',
        target: 'vessel',
        text: 'Build Forge is staged, but the NeuralSpace local runtime is not answering yet. The lane will fire once the worker is up.',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setNeuralBusy(false);
    }
  }

  function appendBrainLog(entries) {
    setBrainLog((current) => [...current, ...entries].slice(-18));
  }

  function speakBrain(text, target = 'vessel', options = {}) {
    const { log = true } = options;
    setBrainTarget(target);
    setBrainLine(text);
    setBrainMode('speaking');
    if (log) {
      appendBrainLog([{
        id: uid('brain'),
        role: 'brain',
        target,
        text,
        createdAt: new Date().toISOString()
      }]);
    }

    if (!speechSupported || !audioOutputEnabled) {
      window.setTimeout(() => setBrainMode(voiceEnabledRef.current ? 'listening' : 'idle'), 900);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferredVoice = voices.find((voice) => /natural|samantha|aria|jenny|guy|zira|daniel|google us english/i.test(voice.name));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = target === 'overearth' ? 0.78 : 0.92;
    utterance.pitch = target === 'overearth' ? 0.62 : 1.04;
    utterance.volume = 0.86;
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
    setTravelPulse((value) => value + 1);
    trackEvent('avatar_travel', { destination: gate.id, mode: 'worldskin' });
    if (shouldSpeak) speakBrain(`${vesselName} crossed into ${gate.worldName}.`, 'vessel');
  }

  function travelToRealm(realm, shouldSpeak = false) {
    if (!realm) return;
    setSelectedRealmId(realm.id);
    setActiveGateId('realms');
    setTravelPulse((value) => value + 1);
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
      let next = { ...current, settings: { ...(c
