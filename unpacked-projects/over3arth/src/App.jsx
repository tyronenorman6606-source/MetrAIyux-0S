import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import gsap from 'gsap';
import {
  Activity,
  BellRing,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Crown,
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
import GrayScapeChromebook from './components/GrayScapeChromebook.jsx';
import NeuralSpaceField from './components/NeuralSpaceField.jsx';
import NeuralSpacePortal from './components/NeuralSpacePortal.jsx';
import SigilButton from './components/SigilButton.jsx';
import { Globe } from './registry/magicui/globe.jsx';
import { allianceTemplates, anchorTemplates, archetypes, canonTemplates, epochTemplates, focusSessionTemplates, planLanes, realms, realityContractTemplates, researchPrinciples, ritualPrompts, worldBlueprints } from './data/over3arthContent.js';
import { getGrayScapeModule } from './data/grayscapeSuperApp.js';
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
import { getAurenBrainStatus, requestAurenBrain, synthesizeAurenSpeech, transcribeAurenAudio } from './lib/aurenBrainClient.js';
import { captureGrayScapeJournal, captureGrayScapeTask, loadGrayScapeSignal } from './lib/grayscapeBridge.js';
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

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function EnergyVesselShell() {
  return (
    <>
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
    </>
  );
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
  const [grayScapeModuleId, setGrayScapeModuleId] = useState('nexus');
  const [grayScapeSignal, setGrayScapeSignal] = useState(() => loadGrayScapeSignal());
  const [grayScapeOpen, setGrayScapeOpen] = useState(false);
  const [grayScapeBusy, setGrayScapeBusy] = useState(false);
  const [grayScapeTraveling, setGrayScapeTraveling] = useState(false);
  const [grayScapeTraveler, setGrayScapeTraveler] = useState(null);
  const [mapDragging, setMapDragging] = useState(false);
  const [aurenBrainStatus, setAurenBrainStatus] = useState({
    ok: false,
    providerOrder: ['MetrAIyux Gate / AurenBrain'],
    lastProvider: 'MetrAIyux Gate / AurenBrain',
    gate: { label: 'MetrAIyux Gate / AurenBrain' },
    voice: { tts: false, stt: false },
    memory: { exchanges: 0, facts: 0 }
  });
  const [aurenBusy, setAurenBusy] = useState(false);
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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlaybackRef = useRef(null);
  const viewportRef = useRef(null);
  const avatarOrbitRef = useRef(null);
  const viewportTweenRef = useRef(null);
  const viewportSettleRef = useRef(null);
  const grayScapeTravelTimerRef = useRef(null);
  const grayScapeArriveTimerRef = useRef(null);
  const grayScapeRunnerClearTimerRef = useRef(null);
  const mapPanRef = useRef({ x: 0, y: 0, scale: 1, rotate: 0 });
  const mapDragRef = useRef({ active: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0, originScale: 1, originRotate: 0 });

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
    refreshAurenBrain({ silent: true });
    refreshGrayScapeSignal({ silent: true });
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    mediaRecorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    audioPlaybackRef.current?.pause?.();
    viewportTweenRef.current?.kill?.();
    window.clearTimeout(viewportSettleRef.current);
    window.clearTimeout(grayScapeTravelTimerRef.current);
    window.clearTimeout(grayScapeArriveTimerRef.current);
    window.clearTimeout(grayScapeRunnerClearTimerRef.current);
  }, []);

  useEffect(() => {
    moveGrayScapeViewport(grayScapeOpen);
  }, [grayScapeOpen]);

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
  const activeGrayScapeModule = getGrayScapeModule(grayScapeModuleId);

  commandHandlerRef.current = (transcript) => handleBrainCommand(transcript, 'voice');

  return (
    <section className="spectacle-scene worldskin-scene" data-brain={brainTarget} data-voice={brainMode} data-thinking={aurenBusy ? 'true' : 'false'} data-neural-lane={neuralLaneId} data-grayscape={grayScapeOpen ? 'open' : 'closed'} data-grayscape-travel={grayScapeTraveling ? 'active' : 'idle'} aria-label="Playable Overearth universe">
      <NeuralSpaceField activeLaneId={neuralLaneId} charge={worldskinCharge} brainTarget={brainTarget} travelPulse={travelPulse} />
      <div
        ref={viewportRef}
        className={mapDragging ? 'worldskin-viewport dragging' : 'worldskin-viewport'}
        onPointerDown={beginMapDrag}
        onPointerMove={moveMapDrag}
        onPointerUp={endMapDrag}
        onPointerCancel={endMapDrag}
        aria-label="Draggable Overearth universe viewport"
      >
        <div
          ref={avatarOrbitRef}
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
        </div>
      </div>

      {grayScapeTraveler ? (
        <div
          className="energy-being spectacle-being vessel-gate-runner"
          data-arrived={grayScapeTraveler.arrived ? 'true' : 'false'}
          style={{
            '--vessel-start-x': `${grayScapeTraveler.startX}px`,
            '--vessel-start-y': `${grayScapeTraveler.startY}px`,
            '--vessel-target-x': `${grayScapeTraveler.targetX}px`,
            '--vessel-target-y': `${grayScapeTraveler.targetY}px`,
            left: `${grayScapeTraveler.arrived ? grayScapeTraveler.targetX : grayScapeTraveler.startX}px`,
            top: `${grayScapeTraveler.arrived ? grayScapeTraveler.targetY : grayScapeTraveler.startY}px`,
            opacity: grayScapeTraveler.arrived ? 0.2 : 1
          }}
          aria-hidden="true"
        >
          <EnergyVesselShell />
        </div>
      ) : null}

      <div className="worldskin-action-sigils" aria-label="Overearth game actions">
        <button type="button" className={voiceEnabled ? 'voice-aperture listening' : 'voice-aperture'} onClick={toggleListening} title={voiceEnabled ? 'Stop local voice brains' : 'Start local voice brains'} aria-label={voiceEnabled ? 'Stop local voice brains' : 'Start local voice brains'}>
          <Mic size={18} />
        </button>
        <button type="button" onClick={requestMission} title="Summon mission" aria-label="Summon mission"><Swords size={17} /></button>
        <button type="button" onClick={requestProofSeal} title="Seal proof" aria-label="Seal proof"><CheckCircle2 size={17} /></button>
        <button type="button" onClick={requestFocusPulse} title="Focus pulse" aria-label="Focus pulse"><Brain size={17} /></button>
        <button type="button" onClick={requestRitualPulse} title="Ritual pulse" aria-label="Ritual pulse"><Flame size={17} /></button>
        <button type="button" onClick={() => openGrayScapeModule(grayScapeModuleId, true)} title="Wake GrayScape Chromebook" aria-label="Wake GrayScape Chromebook"><Crown size={17} /></button>
        <button type="button" onClick={() => handleBrainCommand('Overearth status', 'sigil')} title="World status" aria-label="World status"><Radar size={17} /></button>
      </div>

      <motion.div className="worldskin-brain-dock" data-target={brainTarget} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} aria-live="polite">
        <div className="brain-dock-head">
          <span className="voice-ribbon-speaker">
            {brainTarget === 'overearth' ? <Globe2 size={14} /> : <Volume2 size={14} />}
            {brainTarget === 'overearth' ? 'Overearth' : vesselName}
          </span>
          <div className="brain-dock-status">
            <span className={voiceEnabled ? 'listening-dot active' : 'listening-dot'} />
            {aurenBusy ? 'Thinking' : voiceEnabled ? 'Listening' : voiceSupported || aurenBrainStatus.voice?.stt ? 'Mic ready' : 'Typed mode'}
          </div>
        </div>
        <div className="brain-dock-worldline">
          <strong>{activeGate.worldName}</strong>
          <span>{selectedRealm.name} / {activeNeuralLane.shortLabel} / {aurenBrainStatus.gate?.label || aurenBrainStatus.lastProvider || 'MetrAIyux Gate / AurenBrain'}</span>
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
        <small>{lastTranscript ? `Heard: ${lastTranscript}` : aurenBrainStatus.ok ? `${aurenBrainStatus.gate?.label || 'MetrAIyux Gate / AurenBrain'} online. ${aurenBrainStatus.memory?.exchanges || 0} exchanges remembered.` : 'AurenBrain service is warming up; your gate is ready.'}</small>
      </motion.div>

      <GrayScapeChromebook
        activeModuleId={grayScapeModuleId}
        signal={grayScapeSignal}
        open={grayScapeOpen}
        busy={grayScapeBusy}
        onSelectModule={(moduleId) => selectGrayScapeModule(moduleId, false)}
        onOpenModule={(moduleId) => openGrayScapeModule(moduleId, true)}
        onClose={closeGrayScapeModule}
        onRefresh={() => refreshGrayScapeSignal()}
        onFrameLoad={() => refreshGrayScapeSignal({ silent: true })}
      />
    </section>
  );

  function getGrayScapeViewportTarget(isOpen) {
    const compact = window.innerWidth <= 900;
    return isOpen
      ? {
          x: compact ? window.innerWidth * 0.12 : window.innerWidth * 0.52,
          y: compact ? -window.innerHeight * 0.28 : -window.innerHeight * 0.1,
          scale: compact ? 0.38 : 0.34,
          rotate: compact ? 0 : 2.5,
          opacity: compact ? 0.5 : 0.52,
          filter: 'blur(0.7px)'
        }
      : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, filter: 'blur(0px)' };
  }

  function resetMapDrag() {
    mapDragRef.current = { active: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0, originScale: 1, originRotate: 0 };
    setMapDragging(false);
  }

  function moveGrayScapeViewport(isOpen) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewportTweenRef.current?.kill?.();
    gsap.killTweensOf(viewport);
    window.clearTimeout(viewportSettleRef.current);
    const reduced = prefersReducedMotion();
    const target = getGrayScapeViewportTarget(isOpen);

    viewportTweenRef.current = gsap.to(viewport, {
      x: target.x,
      y: target.y,
      scale: target.scale,
      rotation: target.rotate,
      opacity: target.opacity,
      filter: target.filter,
      duration: reduced ? 0.01 : isOpen ? 0.72 : 0.58,
      ease: isOpen ? 'expo.inOut' : 'power3.inOut',
      onUpdate: () => {
        mapPanRef.current = {
          x: Number(gsap.getProperty(viewport, 'x')) || 0,
          y: Number(gsap.getProperty(viewport, 'y')) || 0,
          scale: Number(gsap.getProperty(viewport, 'scale')) || 1,
          rotate: Number(gsap.getProperty(viewport, 'rotation')) || 0
        };
      },
      onComplete: () => {
        mapPanRef.current = { x: target.x, y: target.y, scale: target.scale, rotate: target.rotate };
      }
    });
    viewportSettleRef.current = window.setTimeout(() => {
      gsap.killTweensOf(viewport);
      gsap.set(viewport, {
        x: target.x,
        y: target.y,
        scale: target.scale,
        rotation: target.rotate,
        opacity: target.opacity,
        filter: target.filter
      });
      mapPanRef.current = { x: target.x, y: target.y, scale: target.scale, rotate: target.rotate };
    }, reduced ? 20 : isOpen ? 820 : 680);
  }

  function shouldIgnoreMapDrag(target) {
    return Boolean(target?.closest?.('button, input, textarea, select, iframe, a, .worldskin-brain-dock, .worldskin-action-sigils, .grayscape-chromebook'));
  }

  function beginMapDrag(event) {
    if (grayScapeTraveling || shouldIgnoreMapDrag(event.target)) return;
    viewportTweenRef.current?.kill?.();
    const origin = mapPanRef.current;
    mapDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x || 0,
      originY: origin.y || 0,
      originScale: origin.scale || 1,
      originRotate: origin.rotate || 0
    };
    setMapDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveMapDrag(event) {
    const drag = mapDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId || !viewportRef.current) return;
    const boundsX = window.innerWidth * 0.45;
    const boundsY = window.innerHeight * 0.34;
    const next = {
      x: clampValue(drag.originX + event.clientX - drag.startX, -boundsX, boundsX),
      y: clampValue(drag.originY + event.clientY - drag.startY, -boundsY, boundsY),
      scale: drag.originScale || 1,
      rotate: drag.originRotate || 0
    };
    mapPanRef.current = next;
    gsap.set(viewportRef.current, { x: next.x, y: next.y, scale: next.scale, rotation: next.rotate, opacity: 1, filter: grayScapeOpen ? 'blur(0.7px)' : 'blur(0px)' });
  }

  function endMapDrag(event) {
    const drag = mapDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    mapDragRef.current = { active: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0, originScale: 1, originRotate: 0 };
    setMapDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function closeGrayScapeModule() {
    window.clearTimeout(grayScapeTravelTimerRef.current);
    window.clearTimeout(grayScapeArriveTimerRef.current);
    window.clearTimeout(grayScapeRunnerClearTimerRef.current);
    resetMapDrag();
    setGrayScapeTraveling(false);
    setGrayScapeTraveler(null);
    setGrayScapeOpen(false);
    moveGrayScapeViewport(false);
  }

  function createGrayScapeTravelFrame() {
    const vesselNode = avatarOrbitRef.current?.querySelector?.('.spectacle-being') || avatarOrbitRef.current;
    const laptopNode =
      document.querySelector('.grayscape-chromebook[data-open="false"] .grayscape-chromebook__closed-lid') ||
      document.querySelector('.grayscape-chromebook[data-open="false"]');
    const vesselRect = vesselNode?.getBoundingClientRect?.();
    const laptopRect = laptopNode?.getBoundingClientRect?.();
    const width = window.innerWidth || 1440;
    const height = window.innerHeight || 900;

    return {
      startX: vesselRect ? vesselRect.left + vesselRect.width / 2 : width * 0.5,
      startY: vesselRect ? vesselRect.top + vesselRect.height / 2 : height * 0.44,
      targetX: laptopRect ? laptopRect.left + laptopRect.width * 0.54 : 118,
      targetY: laptopRect ? laptopRect.top + laptopRect.height * 0.42 : height * 0.42
    };
  }

  function toggleListening() {
    if (voiceEnabled) {
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
      setBrainMode('idle');
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          setBrainMode('idle');
        }
        speakBrain('Voice captured. I am reading it now.', brainTarget, { audible: false });
        return;
      }
      recognitionRef.current?.stop?.();
      speakBrain('Listening is paused. The world remains awake through the sigils.', brainTarget);
      return;
    }

    if (!voiceSupported) {
      startServerVoiceCapture();
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
      speakBrain(`Voice channel open. Say Overearth for the world brain, or say ${vesselName} for the vessel brain.`, 'overearth', { audible: false });
    } catch {
      setBrainMode('idle');
      setVoiceEnabled(false);
      voiceEnabledRef.current = false;
      startServerVoiceCapture();
    }
  }

  async function startServerVoiceCapture() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      speakBrain('Microphone capture is blocked here. Type the command and I will still answer through AurenBrain.', 'overearth');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        let delegatedToBrain = false;
        audioChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        if (!chunks.length) {
          setBrainMode('idle');
          return;
        }
        setAurenBusy(true);
        setBrainMode('thinking');
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const result = await transcribeAurenAudio(blob);
          const text = String(result.text || '').trim();
          if (text) {
            delegatedToBrain = true;
            await handleBrainCommand(text, 'voice');
          } else {
            speakBrain('I caught audio, but no words came through cleanly.', 'overearth');
          }
        } catch {
          speakBrain(
            aurenBrainStatus.voice?.stt
              ? 'The transcriber failed on that capture. Try one shorter line.'
              : 'Server transcription needs a model-backed voice key. Type it here and I will answer through the same brain.',
            'overearth'
          );
        } finally {
          setAurenBusy(false);
          if (!delegatedToBrain) setBrainMode(voiceEnabledRef.current ? 'listening' : 'idle');
        }
      };

      mediaRecorderRef.current = recorder;
      voiceEnabledRef.current = true;
      setVoiceEnabled(true);
      setBrainMode('listening');
      setBrainLine('Voice capture open. Tap the mic again to send.');
      recorder.start();
    } catch {
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
      setBrainMode('idle');
      speakBrain('Microphone permission did not open. The typed channel is active.', 'overearth');
    }
  }

  function submitBrainChat(event) {
    event.preventDefault();
    const transcript = chatInput.trim();
    if (!transcript) return;
    setChatInput('');
    handleBrainCommand(transcript, 'typed');
  }

  async function handleBrainCommand(transcript, source = 'typed') {
    const command = String(transcript || '').trim();
    if (!command) return;
    const target = detectBrainTarget(command, vesselName, brainTarget);
    setLastTranscript(command);
    setBrainTarget(target);
    setBrainMode('thinking');
    appendBrainLog([{
      id: uid('player'),
      role: 'player',
      source,
      text: command,
      createdAt: new Date().toISOString()
    }]);

    const localBrainPlan = createBrainResponse({
      transcript: command,
      target,
      state,
      stats,
      selectedRealm,
      activeGate,
      gates: gameGates,
      realms,
      vesselName,
      activeNeuralLane,
      neuralRuntime,
      activeGrayScapeModule,
      grayScapeSignal
    });

    setAurenBusy(true);
    let result;
    try {
      const payload = await requestAurenBrain(buildBrainPayload(command, target, source));
      result = normalizeClientBrainResult(payload, target);
      result = reconcileLocalBrainResult(result, localBrainPlan, target);
      setAurenBrainStatus((current) => ({
        ...current,
        ok: true,
        lastProvider: result.provider || current.lastProvider || 'MetrAIyux Gate / AurenBrain',
        lastError: '',
        neuralStatus: result.neuralStatus || current.neuralStatus
      }));
    } catch (error) {
      const fallback = localBrainPlan;
      result = normalizeClientBrainResult({
        ...fallback,
        provider: 'MetrAIyux Gate / AurenBrain',
        actions: fallback.action && fallback.action !== 'none'
          ? [{ type: fallback.action, payload: fallback.payload || {}, reason: 'onboard gate action' }]
          : [],
        failures: [{ gate: 'MetrAIyux Gate / AurenBrain', error: error.message }]
      }, fallback.target || target);
      setAurenBrainStatus((current) => ({
        ...current,
        ok: false,
        lastProvider: 'MetrAIyux Gate / AurenBrain',
        gate: current.gate || { label: 'MetrAIyux Gate / AurenBrain' },
        lastError: error.message,
        providerOrder: current.providerOrder?.length ? current.providerOrder : ['MetrAIyux Gate / AurenBrain']
      }));
    } finally {
      setAurenBusy(false);
    }

    setBrainTarget(result.target);
    appendBrainLog([{
      id: uid('brain'),
      role: 'brain',
      target: result.target,
      provider: result.provider,
      text: result.response,
      createdAt: new Date().toISOString()
    }]);
    applyBrainAction(result, command);
    rememberBrainExchange(command, result);
    bridgeNeuralSpace(result, command);
    speakBrain(result.response, result.target, { log: false });
  }

  function reconcileLocalBrainResult(providerResult, localPlan, fallbackTarget) {
    const localAction = localPlan?.action;
    if (!localAction || localAction === 'none' || getBrainActions(providerResult).length) {
      return providerResult;
    }
    return normalizeClientBrainResult({
      ...providerResult,
      target: localPlan.target || providerResult.target || fallbackTarget,
      response: localPlan.response || providerResult.response,
      actions: [{ type: localAction, payload: localPlan.payload || {}, reason: 'local Overearth command router' }],
      action: localAction,
      payload: localPlan.payload || {},
      provider: providerResult.provider || 'MetrAIyux Gate / AurenBrain',
      confidence: Math.max(Number(providerResult.confidence) || 0, Number(localPlan.confidence) || 0.72)
    }, fallbackTarget);
  }

  function applyBrainAction(result, transcript) {
    for (const action of getBrainActions(result)) {
      const payload = action.payload || {};
      if (action.type === 'travel_realm') {
        const realm = sectors.find((sector) => sector.id === payload.realmId);
        if (realm) travelToRealm(realm, false);
      }
      if (action.type === 'travel_gate') {
        const gate = gameGates.find((item) => item.id === payload.gateId);
        if (gate) travelToGate(gate, false);
      }
      if (action.type === 'generate_mission') launchSectorMission();
      if (action.type === 'seal_quest') sealPriorityProof();
      if (action.type === 'ritual_pulse') sealRitualPulse();
      if (action.type === 'focus_pulse') sealFocusPulse();
      if (action.type === 'capture_note') captureBrainNote(payload.note || transcript);
      if (action.type === 'sync_neural_runtime') refreshNeuralRuntime();
      if (action.type === 'rename_vessel' && payload.name) {
        updateState((current) => ({
          ...current,
          profile: { ...current.profile, vesselName: payload.name }
        }), '', 'vessel_renamed');
      }
      if (['open_neural_lane', 'neural_research', 'neural_build'].includes(action.type)) {
        selectNeuralLane(payload.laneId || 'chat', false);
      }
      if (action.type === 'neural_build') {
        launchNeuralSpaceBuild(transcript, { ...result, payload });
      }
      if (action.type === 'open_grayscape_module') {
        openGrayScapeModule(payload.moduleId || 'nexus', false);
      }
      if (action.type === 'grayscape_task') {
        const signal = captureGrayScapeTask(payload.title || transcript, payload.due || '');
        setGrayScapeSignal(signal);
        selectGrayScapeModule('tasks', false);
      }
      if (action.type === 'grayscape_journal') {
        const signal = captureGrayScapeJournal(payload.content || transcript, payload.title || 'Overearth Capture');
        setGrayScapeSignal(signal);
        selectGrayScapeModule('journal', false);
      }
      if (action.type === 'grayscape_sync') {
        refreshGrayScapeSignal();
      }
    }
  }

  function buildBrainPayload(message, target, source) {
    return {
      message,
      target,
      source,
      state,
      stats,
      selectedRealm,
      activeGate: {
        id: activeGate.id,
        label: activeGate.label,
        worldName: activeGate.worldName,
        coordinate: activeGate.coordinate
      },
      activeNeuralLane,
      neuralLaneId,
      neuralRuntime,
      activeGrayScapeModule,
      grayScapeModuleId,
      grayScapeSignal,
      history: brainLog.slice(-10).map((item) => ({
        role: item.role,
        target: item.target || '',
        text: item.text,
        createdAt: item.createdAt
      }))
    };
  }

  function normalizeClientBrainResult(candidate, fallbackTarget = 'vessel') {
    const target = candidate.target === 'overearth' || candidate.target === 'vessel' ? candidate.target : fallbackTarget;
    const fallbackAction = candidate.action
      ? [{ type: candidate.action, payload: candidate.payload || {}, reason: 'single action result' }]
      : [];
    const actions = (Array.isArray(candidate.actions) && candidate.actions.length ? candidate.actions : fallbackAction)
      .map((action) => ({
        type: action?.type || 'none',
        payload: action?.payload && typeof action.payload === 'object' ? action.payload : {},
        reason: action?.reason || ''
      }));
    const primary = actions[0] || { type: 'none', payload: {}, reason: '' };
    return {
      ...candidate,
      target,
      response: String(candidate.response || '').trim() || 'I am online, but that answer came back empty. Give me one clean command and I will reroute.',
      actions,
      action: primary.type,
      payload: primary.payload,
      provider: candidate.provider || candidate.gate?.label || 'MetrAIyux Gate / AurenBrain',
      confidence: Number.isFinite(candidate.confidence) ? candidate.confidence : 0.5
    };
  }

  function getBrainActions(result) {
    const actions = Array.isArray(result.actions) && result.actions.length
      ? result.actions
      : result.action
        ? [{ type: result.action, payload: result.payload || {}, reason: '' }]
        : [];
    return actions.filter((action) => action?.type && action.type !== 'none');
  }

  function captureBrainNote(note) {
    const text = String(note || '').trim();
    if (!text) return;
    updateState((current) => {
      const entry = {
        id: uid('note'),
        text,
        realm: selectedRealm.id,
        source: 'energy-vessel',
        createdAt: new Date().toISOString()
      };
      let next = {
        ...current,
        notes: [entry, ...(current.notes || [])].slice(0, 250)
      };
      next = addLedgerEntry(next, 'note', 'Energy vessel memory captured', text);
      return next;
    }, '', 'brain_note_captured');
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

  function selectGrayScapeModule(moduleId, shouldSpeak = false) {
    const module = getGrayScapeModule(moduleId);
    setGrayScapeModuleId(module.id);
    setTravelPulse((value) => value + 1);
    const linkedGate = gameGates.find((item) => item.id === module.gateId);
    if (linkedGate) setActiveGateId(linkedGate.id);
    const linkedRealm = sectors.find((sector) => sector.id === module.realmId);
    if (linkedRealm) setSelectedRealmId(linkedRealm.id);
    if (shouldSpeak) {
      speakBrain(`${module.label} is selected in GrayScape. ${module.response}`, 'vessel');
    }
  }

  function openGrayScapeModule(moduleId, shouldSpeak = false) {
    const module = getGrayScapeModule(moduleId);
    selectGrayScapeModule(module.id, false);
    window.clearTimeout(grayScapeTravelTimerRef.current);
    window.clearTimeout(grayScapeArriveTimerRef.current);
    window.clearTimeout(grayScapeRunnerClearTimerRef.current);
    resetMapDrag();
    refreshGrayScapeSignal({ silent: true });
    if (grayScapeOpen) {
      setGrayScapeTraveling(false);
      setGrayScapeTraveler(null);
      if (shouldSpeak) {
        speakBrain(`${module.label} is already open inside GrayScape.`, 'vessel');
      }
      return;
    }

    const travelFrame = { ...createGrayScapeTravelFrame(), arrived: false };
    setGrayScapeTraveler(travelFrame);
    setGrayScapeTraveling(true);
    grayScapeArriveTimerRef.current = window.setTimeout(() => {
      setGrayScapeTraveler((current) => current ? { ...current, arrived: true } : current);
    }, 40);
    if (shouldSpeak) {
      speakBrain(`${vesselName} is crossing into ${module.label}. GrayScape opens when the vessel reaches the side gate.`, 'vessel');
    }
    grayScapeTravelTimerRef.current = window.setTimeout(() => {
      setGrayScapeOpen(true);
      moveGrayScapeViewport(true);
      setGrayScapeTraveler((current) => current ? { ...current, arrived: true } : current);
      grayScapeRunnerClearTimerRef.current = window.setTimeout(() => {
        setGrayScapeTraveling(false);
        setGrayScapeTraveler(null);
      }, prefersReducedMotion() ? 140 : 1600);
    }, prefersReducedMotion() ? 820 : 1120);
  }

  async function refreshGrayScapeSignal(options = {}) {
    const { silent = false } = options;
    setGrayScapeBusy(true);
    try {
      const signal = loadGrayScapeSignal();
      setGrayScapeSignal(signal);
      if (!silent) {
        appendBrainLog([{
          id: uid('grayscape_sync'),
          role: 'brain',
          target: 'vessel',
          text: `GrayScape linked: ${signal.tasks.open} open tasks, ${signal.journal.entries} journal entries, ${signal.command.founderMessages} founder messages, vault ${signal.vault.locked ? 'locked' : 'open'}.`,
          createdAt: new Date().toISOString()
        }]);
      }
      return signal;
    } finally {
      setGrayScapeBusy(false);
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

  async function refreshAurenBrain(options = {}) {
    const { silent = false } = options;
    try {
      const status = await getAurenBrainStatus();
      const next = {
        ...status,
        gate: status.gate || { label: status.providerOrder?.[0] || 'MetrAIyux Gate / AurenBrain' },
        lastProvider: status.gate?.label || status.providerOrder?.[0] || 'MetrAIyux Gate / AurenBrain'
      };
      setAurenBrainStatus(next);
      if (!silent) {
        appendBrainLog([{
          id: uid('auren_status'),
          role: 'brain',
          target: 'vessel',
          text: `AurenBrain is online through ${next.gate?.label || next.lastProvider}. Memory holds ${status.memory?.exchanges || 0} exchanges and ${status.memory?.facts || 0} facts.`,
          createdAt: new Date().toISOString()
        }]);
      }
      return next;
    } catch (error) {
      const offline = {
        ok: false,
        providerOrder: ['MetrAIyux Gate / AurenBrain'],
        lastProvider: 'MetrAIyux Gate / AurenBrain',
        gate: { label: 'MetrAIyux Gate / AurenBrain' },
        lastError: error.message,
        voice: { tts: false, stt: false },
        memory: { exchanges: 0, facts: 0 }
      };
      setAurenBrainStatus(offline);
      if (!silent) {
        appendBrainLog([{
          id: uid('auren_status'),
          role: 'brain',
          target: 'vessel',
          text: 'AurenBrain service is not answering yet. I am using the onboard gate core until the local brain server is running.',
          createdAt: new Date().toISOString()
        }]);
      }
      return offline;
    }
  }

  async function bridgeNeuralSpace(result, transcript) {
    const action = getBrainActions(result).find((item) => ['open_neural_lane', 'neural_research'].includes(item.type));
    if (!action) return;
    setNeuralBusy(true);
    try {
      const laneId = action.payload?.laneId || neuralLaneId;
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

  async function speakBrain(text, target = 'vessel', options = {}) {
    const { log = true, audible = true } = options;
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

    const finishSpeaking = () => setBrainMode(voiceEnabledRef.current ? 'listening' : 'idle');

    if (!audible || !audioOutputEnabled) {
      window.setTimeout(() => setBrainMode(voiceEnabledRef.current ? 'listening' : 'idle'), 900);
      return;
    }

    try {
      const audioBlob = await synthesizeAurenSpeech({
        text,
        target,
        voice: target === 'overearth' ? 'onyx' : undefined
      });
      window.speechSynthesis?.cancel?.();
      audioPlaybackRef.current?.pause?.();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioPlaybackRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        finishSpeaking();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        finishSpeaking();
      };
      await audio.play();
      return;
    } catch {
      // Browser voices are the no-key onboard path; model speech takes over when the company gate has voice enabled.
    }

    if (!speechSupported) {
      window.setTimeout(finishSpeaking, 900);
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
    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;
    window.speechSynthesis.speak(utterance);
  }

  function rememberBrainExchange(transcript, result) {
    const actions = getBrainActions(result).map((action) => ({
      type: action.type,
      payload: action.payload || {}
    }));
    updateState((current) => ({
      ...current,
      brainMemory: [
        {
          id: uid('brain'),
          target: result.target,
          command: transcript,
          response: result.response,
          provider: result.provider || result.gate?.label || 'MetrAIyux Gate / AurenBrain',
          actions,
          confidence: result.confidence,
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
      let next = { ...current, settings: { ...(current.settings || {}), reminderHour } };
      next = addLedgerEntry(next, 'ritual', 'Ritual reminder saved', `Daily ritual reminder set for ${reminderHour}.`);
      return next;
    }, 'Ritual reminder saved.', 'ritual_reminder_saved');
  }

  return (
    <Page eyebrow="Daily Ritual" title="Feed the world before the day takes over." copy="Rituals prime the simulation with one intention, one release, and one proof move.">
      <div className="two-column">
        <form className="glass-panel form-card" onSubmit={submit}>
          <label>Prompt<textarea value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} rows="2" /></label>
          <label>Realm<select value={form.focusRealm} onChange={(event) => setForm({ ...form, focusRealm: event.target.value })}>{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select></label>
          <label>Intention<textarea value={form.intention} onChange={(event) => setForm({ ...form, intention: event.target.value })} rows="2" /></label>
          <label>Release<textarea value={form.release} onChange={(event) => setForm({ ...form, release: event.target.value })} rows="2" /></label>
          <label>Next proof<input value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} placeholder="One visible move today" /></label>
          <SigilButton><Flame size={18} /> Seal ritual</SigilButton>
        </form>

        <section className="glass-panel form-card">
          <span className="eyebrow"><BellRing size={14} /> Local Reminder</span>
          <h2>{stats.streak} day streak</h2>
          <form onSubmit={saveReminder}>
            <label>Reminder time<input type="time" value={reminderHour} onChange={(event) => setReminderHour(event.target.value)} /></label>
            <SigilButton variant="secondary"><CalendarDays size={16} /> Save reminder</SigilButton>
          </form>
          <Meter value={stats.energy} label="Reality charge" detail="Rituals raise the world when they lead into proof." />
        </section>
      </div>
    </Page>
  );
}

function Codex({ state, stats }) {
  const activeEpochs = (state.epochs || []).filter((epoch) => epoch.status !== 'complete');
  const activeAllies = (state.allies || []).filter((ally) => ally.status !== 'archived');
  const activeCanon = (state.canon || []).filter((rule) => rule.status !== 'archived');

  return (
    <Page eyebrow="World Codex" title="Keep the universe coherent." copy="Epochs, allies, canon, and contracts are the long-range memory of the world.">
      <div className="three-column">
        <section className="glass-panel mini-panel"><span className="eyebrow">Epochs</span><h3>{activeEpochs.length} active arcs</h3><p>{epochTemplates[0]?.promise || 'Long-range arcs hold the bigger story.'}</p></section>
        <section className="glass-panel mini-panel"><span className="eyebrow">Allies</span><h3>{activeAllies.length} allies</h3><p>{allianceTemplates[0]?.script || 'Allies make the world answerable to people, not just intention.'}</p></section>
        <section className="glass-panel mini-panel"><span className="eyebrow">Canon</span><h3>{activeCanon.length} laws</h3><p>{canonTemplates[0]?.law || 'Personal law gives the simulation spine.'}</p></section>
      </div>
      <section className="glass-panel"><Meter value={stats.energy} label="Codex charge" detail={`${realityContractTemplates.length} contract templates are ready to turn intent into rules.`} /></section>
    </Page>
  );
}

function FocusChamber({ state, stats, updateState }) {
  const [intent, setIntent] = useState(focusSessionTemplates[0]?.intent || 'Give the world thirteen clean minutes.');

  function completeFocus() {
    const realmId = state.profile?.focusRealm || 'craft';
    updateState((current) => {
      const session = {
        id: uid('focus'),
        title: 'Manual focus chamber pulse',
        realm: realmId,
        intent,
        output: 'Logged from the focus chamber.',
        minutes: 13,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      let next = { ...current, focusSessions: [session, ...(current.focusSessions || [])].slice(0, 250) };
      next = addLedgerEntry(next, 'focus', 'Focus chamber pulse completed', intent);
      return next;
    }, 'Focus pulse logged.', 'focus_session_saved');
  }

  return (
    <Page eyebrow="Focus Chamber" title="Give the vessel a clean block of time." copy="A focus pulse is a small proof container. Pick the output and seal the minutes.">
      <section className="glass-panel form-card">
        <label>Focus intent<textarea value={intent} onChange={(event) => setIntent(event.target.value)} rows="3" /></label>
        <SigilButton onClick={completeFocus}><Brain size={18} /> Complete 13 minute pulse</SigilButton>
        <Meter value={stats.focusMinutes % 100} label="Focus memory" detail={`${stats.focusMinutes} total minutes logged.`} />
      </section>
    </Page>
  );
}

function Affirm({ state, updateState }) {
  const [text, setText] = useState(state.affirmations?.[0]?.text || '');

  function saveAffirmation(event) {
    event.preventDefault();
    updateState((current) => {
      const affirmation = text.trim()
        ? { id: uid('affirm'), text: text.trim(), createdAt: new Date().toISOString() }
        : forgeAffirmation(current);
      let next = { ...current, affirmations: [affirmation, ...(current.affirmations || [])].slice(0, 120) };
      next = addLedgerEntry(next, 'affirmation', 'Signal shrine updated', affirmation.text);
      return next;
    }, 'Affirmation saved.', 'affirmation_saved');
    setText('');
  }

  return (
    <Page eyebrow="Signal Shrine" title="Write the identity signal." copy="Affirmations work here only when they point back to behavior.">
      <form className="glass-panel form-card" onSubmit={saveAffirmation}>
        <label>Signal<input value={text} onChange={(event) => setText(event.target.value)} placeholder="I move like the version of me who ships proof." /></label>
        <SigilButton><Sparkles size={18} /> Save signal</SigilButton>
      </form>
    </Page>
  );
}

function Notes({ state, updateState }) {
  const [note, setNote] = useState('');

  function saveNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    updateState((current) => {
      const entry = { id: uid('note'), text: note.trim(), createdAt: new Date().toISOString() };
      let next = { ...current, notes: [entry, ...(current.notes || [])].slice(0, 250) };
      next = addLedgerEntry(next, 'note', 'Memory sea signal captured', entry.text);
      return next;
    }, 'Note captured.', 'note_saved');
    setNote('');
  }

  return (
    <Page eyebrow="Memory Sea" title="Capture signals before they disappear." copy="Notes are raw world memory: decisions, receipts, dreams, lessons, and patterns.">
      <form className="glass-panel form-card" onSubmit={saveNote}>
        <label>Signal<textarea value={note} onChange={(event) => setNote(event.target.value)} rows="5" /></label>
        <SigilButton><NotebookPen size={18} /> Capture</SigilButton>
      </form>
      <div className="stack-list">{(state.notes || []).slice(0, 8).map((item) => <NoteMini key={item.id} note={item} />)}</div>
    </Page>
  );
}

function Review({ state, stats }) {
  const completed = (state.quests || []).filter((quest) => quest.done).length;
  return (
    <Page eyebrow="Review Moon" title="Look at what the world actually did." copy="Review keeps the simulation honest by reading proof instead of mood.">
      <div className="three-column">
        <Stat icon={ShieldCheck} label="Proof" value={completed} />
        <Stat icon={Flame} label="Streak" value={stats.streak} />
        <Stat icon={Zap} label="Charge" value={`${stats.energy}%`} />
      </div>
    </Page>
  );
}

function Ascend({ state, stats, updateState }) {
  function createCard() {
    updateState((current) => {
      const card = createAscensionCard(current, calculateStats(current));
      let next = { ...current, shareCards: [card, ...(current.shareCards || [])].slice(0, 24) };
      next = addLedgerEntry(next, 'ascension', 'Ascension card created', card.nextCommand);
      return next;
    }, 'Ascension card created.', 'ascension_card_created');
  }

  return (
    <Page eyebrow="Ascension Gate" title={`Level ${stats.level} is active.`} copy="Ascension cards turn progress into a visible artifact.">
      <section className="glass-panel form-card">
        <Meter value={stats.progressToLevel} label="Next level" detail={`${stats.nextLevelXp - stats.xp} XP until the next gate.`} />
        <SigilButton onClick={createCard}><Gem size={18} /> Create ascension card</SigilButton>
      </section>
      <div className="stack-list">{(state.shareCards || []).slice(0, 4).map((card) => <article key={card.id} className="glass-panel"><strong>{card.worldName}</strong><p>{card.nextCommand}</p></article>)}</div>
    </Page>
  );
}

function Ledger({ state }) {
  return (
    <Page eyebrow="Proof Ledger" title="The world remembers receipts." copy="Every sealed action becomes part of the local world history.">
      <div className="stack-list">
        {(state.ledger || []).slice(0, 24).map((entry) => (
          <article key={entry.id} className="glass-panel ledger-entry">
            <span className="eyebrow">{entry.type}</span>
            <strong>{entry.title}</strong>
            <p>{entry.detail}</p>
          </article>
        ))}
      </div>
    </Page>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <article className="stat-card glass-panel">
      {Icon ? <Icon size={18} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyLine({ text }) {
  return <p className="empty-line">{text}</p>;
}

function QuestMini({ quest, updateState }) {
  return (
    <article className="mini-proof">
      <strong>{quest.title}</strong>
      <small>{quest.dueDate || 'No due date'}</small>
      <button type="button" onClick={() => updateState((current) => ({ ...current, quests: current.quests.map((item) => item.id === quest.id ? { ...item, done: true, doneAt: new Date().toISOString() } : item) }), 'Proof sealed.', 'quest_completed')}>Seal</button>
    </article>
  );
}

function QuestDone({ quest }) {
  return (
    <article className="mini-proof done">
      <strong>{quest.title}</strong>
      <small>{quest.doneAt ? new Date(quest.doneAt).toLocaleDateString() : 'Complete'}</small>
    </article>
  );
}

function NoteMini({ note }) {
  return (
    <article className="mini-proof">
      <p>{note.text}</p>
      <small>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Captured'}</small>
    </article>
  );
}

function LazyWorldGlobePanel({ worldName, energy, activeGoals, completedQuests }) {
  return (
    <section className="globe-demo-card glass-panel">
      <span className="globe-title">{worldName}</span>
      <Globe className="world-globe" intensity={Math.max(0.75, energy / 72)} />
      <div className="globe-command-strip">
        <span><strong>{energy}%</strong><small>Charge</small></span>
        <span><strong>{activeGoals}</strong><small>Goals</small></span>
        <span><strong>{completedQuests}</strong><small>Proofs</small></span>
      </div>
    </section>
  );
}

export default App;
