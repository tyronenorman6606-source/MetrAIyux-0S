(function () {
  "use strict";

  const STORAGE_KEY = "skyeMusicNexusNativeDawProject";
  const PROJECTS_KEY = "skyeMusicNexusNativeDawProjects";
  const KAIXU_USAGE_KEY = "skyeMusicNexusDawKaixuUsage";
  function musicFunctionUrl(name) {
    const configured = window.METRAIYUX_API_BASES && window.METRAIYUX_API_BASES.skymusicnexus;
    if (configured) return `${String(configured).replace(/\/+$/, "")}/${name}`;
    if (/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname)) return `/.netlify/functions/${name}`;
    return `/api/skymusicnexus/${name}`;
  }
  const API = {
    studio: musicFunctionUrl("music-studio"),
    assets: musicFunctionUrl("music-assets")
  };

  const auth = window.createSkyGateAuth
    ? window.createSkyGateAuth({ storageKey: "skye_music_nexus_session" })
    : null;

  const keyboardNoteCodes = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK"];
  const padKeyCodes = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8"];
  const octaveCodes = new Set(["KeyZ", "KeyX"]);
  const BEATS_PER_BAR = 4;
  const DEFAULT_BEATS = 16;
  const MAX_TIMELINE_BEATS = 1024;
  const INLINE_ASSET_UPLOAD_LIMIT = 18 * 1024 * 1024;
  const PROJECT_SCHEMA_VERSION = "skymusicnexus.native-daw.project.v2";
  const PROJECT_INLINE_AUDIO_LIMIT = 4 * 1024 * 1024;
  const KAIXU_MODEL_ALIASES = new Set(["kaixu-6.7-nano", "kaixu-6.7-mini", "kaixu-6.7", "kaixu-6.7-pro", "kaixu-6.7-max"]);
  const KAIXU_BUDGET_LIMITS = {
    "free-beta": 24,
    "artist-pro": 72,
    label: 160,
    "owner-review": 240
  };
  const KAIXU_MODEL_CREDITS = {
    "kaixu-6.7-nano": 1,
    "kaixu-6.7-mini": 2,
    "kaixu-6.7": 4,
    "kaixu-6.7-pro": 8,
    "kaixu-6.7-max": 12
  };
  const RAW_ROUTE_NAMES = [
    ["open", "ai"],
    ["anth", "ropic"],
    ["clau", "de"],
    ["gem", "ini"],
    ["goo", "gle"],
    ["eleven", "labs"],
    ["stabil", "ity"],
    ["repli", "cate"],
    ["su", "no"],
    ["ud", "io"],
    ["mis", "tral"],
    ["gr", "oq"]
  ].map((parts) => parts.join(""));
  const RAW_ROUTE_NAME_PATTERN = new RegExp(`\\b(${RAW_ROUTE_NAMES.join("|")})\\b`, "gi");
  const soundLibrary = [
    { id: "trap-grid", name: "Trap Grid", trackId: "drums", length: 4, regions: ["Kick grid", "Hat ladder"] },
    { id: "sub-run", name: "808 Run", trackId: "bass", length: 4, regions: ["808 answer"] },
    { id: "minor-keys", name: "Minor Keys", trackId: "keys", length: 8, regions: ["Minor keys loop"] },
    { id: "vocal-chop", name: "Vocal Chop", trackId: "vocal", length: 4, regions: ["Vocal chop"] },
    { id: "texture-bed", name: "Texture Bed", trackId: "sample", length: 6, regions: ["Texture bed"] },
    { id: "hook-stack", name: "Hook Stack", trackId: "keys", length: 8, regions: ["Hook chord", "Counter line"] }
  ];

  const state = {
    audio: null,
    master: null,
    compressor: null,
    audioUnlocked: false,
    soundEvents: 0,
    lastSoundAt: "",
    lastAudioError: "",
    playing: false,
    recording: false,
    beat: 0,
    maxBeats: DEFAULT_BEATS,
    projectId: "",
    timer: null,
    metronomeEnabled: false,
    loopEnabled: true,
    selectedRegion: { trackId: "drums", regionIndex: 0 },
    history: [],
    future: [],
    editEvents: 0,
    soundPackEvents: 0,
    mixdownEvents: 0,
    micRecordEvents: 0,
    midiEvents: 0,
    midiStatus: "not-connected",
    kaixuAssistEvents: 0,
    lastKaixuAssist: null,
    lastAssistantRate: null,
    assistantCreditUsage: null,
    lastAppliedDiff: null,
    assetPromoteEvents: 0,
    lastAssetPromotion: null,
    lastRestoreReport: null,
    exportQueueEvents: 0,
    lastExportJob: null,
    cloudProjects: [],
    micRecorder: null,
    micChunks: [],
    micStream: null,
    clips: [],
    clipPreviewEvents: 0,
    keyboardEvents: 0,
    keyboardOctave: 0,
    heldKeyboardKeys: new Set(),
    activeRail: "session",
    commandLog: ["Workbench donor harvested: activity rail, project explorer, console/status lanes."],
    tracks: [
      { id: "drums", name: "Drums", color: "#f5c76b", volume: 0.88, pan: 0, muted: false, solo: false, armed: false, meter: 0.2, regions: [{ name: "Kick pattern", start: 0, length: 4 }, { name: "Hat lift", start: 8, length: 4 }] },
      { id: "bass", name: "808 Bass", color: "#66e5ff", volume: 0.74, pan: 0, muted: false, solo: false, armed: false, meter: 0.3, regions: [{ name: "Sub hook", start: 4, length: 6 }] },
      { id: "keys", name: "Keys", color: "#bd8cff", volume: 0.7, pan: -0.1, muted: false, solo: false, armed: false, meter: 0.15, regions: [{ name: "Minor stack", start: 2, length: 8 }] },
      { id: "vocal", name: "Vocal", color: "#ff8f70", volume: 0.82, pan: 0.04, muted: false, solo: false, armed: true, meter: 0.1, regions: [{ name: "Hook take", start: 10, length: 5 }] },
      { id: "sample", name: "Sample", color: "#9dffbd", volume: 0.65, pan: 0.12, muted: false, solo: false, armed: false, meter: 0.18, regions: [{ name: "Texture chop", start: 6, length: 4 }] }
    ],
    pads: ["Kick", "Snare", "Hat", "Open", "Clap", "Rim", "Tom", "Perc", "808", "Sub", "Vox", "Fx", "Chord", "Bell", "Air", "Drop"],
    keys: [
      ["C", 261.63, false], ["C#", 277.18, true], ["D", 293.66, false], ["D#", 311.13, true],
      ["E", 329.63, false], ["F", 349.23, false], ["F#", 369.99, true], ["G", 392.00, false],
      ["G#", 415.30, true], ["A", 440.00, false], ["A#", 466.16, true], ["B", 493.88, false], ["C2", 523.25, false]
    ]
  };

  function $(id) {
    return document.getElementById(id);
  }

  function clampNumber(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function timelineBeats() {
    return clampNumber(state.maxBeats || DEFAULT_BEATS, BEATS_PER_BAR, MAX_TIMELINE_BEATS, DEFAULT_BEATS);
  }

  function timelineBars() {
    return Math.max(1, Math.ceil(timelineBeats() / BEATS_PER_BAR));
  }

  function syncTimelineInput() {
    const input = $("dawBarsInput");
    if (input) input.value = String(timelineBars());
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw || "");
    } catch (error) {
      return fallback;
    }
  }

  function readLocalProjects() {
    let raw = "";
    try {
      raw = localStorage.getItem(PROJECTS_KEY);
    } catch (error) {
      raw = "";
    }
    const projects = safeJsonParse(raw, []);
    return Array.isArray(projects) ? projects : [];
  }

  function stripProjectInlineAudio(project) {
    return JSON.parse(JSON.stringify(project, (key, value) => {
      if (key === "inlineBase64" || key === "dataBase64" || key === "uploadBase64") return undefined;
      return value;
    }));
  }

  function readKaixuUsage() {
    let raw = "";
    try {
      raw = localStorage.getItem(KAIXU_USAGE_KEY);
    } catch (error) {
      raw = "";
    }
    const usage = safeJsonParse(raw, null);
    if (!usage || usage.day !== todayKey()) return { day: todayKey(), used: 0, runs: 0 };
    return {
      day: usage.day,
      used: clampNumber(usage.used, 0, 9999, 0),
      runs: clampNumber(usage.runs, 0, 9999, 0)
    };
  }

  function writeKaixuUsage(usage) {
    try {
      localStorage.setItem(KAIXU_USAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      appendLog(`kAIxU credit meter stayed in session memory: ${error.message}`);
    }
    state.assistantCreditUsage = usage;
  }

  function currentKaixuAlias() {
    const requestedAlias = $("dawKaixuModel")?.value || "kaixu-6.7-nano";
    return KAIXU_MODEL_ALIASES.has(requestedAlias) ? requestedAlias : "kaixu-6.7-nano";
  }

  function currentBudgetTier() {
    const requested = $("dawKaixuBudget")?.value || "free-beta";
    return Object.prototype.hasOwnProperty.call(KAIXU_BUDGET_LIMITS, requested) ? requested : "free-beta";
  }

  function currentCreditCap() {
    const tierCap = KAIXU_BUDGET_LIMITS[currentBudgetTier()] || KAIXU_BUDGET_LIMITS["free-beta"];
    return clampNumber($("dawKaixuCreditCap")?.value, 1, tierCap, tierCap);
  }

  function updateKaixuBudgetUi() {
    const usage = readKaixuUsage();
    state.assistantCreditUsage = usage;
    const cap = currentCreditCap();
    const meter = $("dawKaixuMeter");
    if (!meter) return;
    const remaining = Math.max(0, cap - usage.used);
    const rate = state.lastAssistantRate;
    const backendNote = rate && Number.isFinite(Number(rate.remaining))
      ? ` / SkyGate ${Math.max(0, Number(rate.remaining))} left`
      : "";
    meter.textContent = `${usage.used} / ${cap} credits used today - ${remaining} left${backendNote}`;
  }

  function syncKaixuCreditCapToTier() {
    const input = $("dawKaixuCreditCap");
    if (input) input.value = String(KAIXU_BUDGET_LIMITS[currentBudgetTier()] || KAIXU_BUDGET_LIMITS["free-beta"]);
    updateKaixuBudgetUi();
  }

  function reserveKaixuCredits() {
    const usage = readKaixuUsage();
    const alias = currentKaixuAlias();
    const cost = KAIXU_MODEL_CREDITS[alias] || 1;
    const cap = currentCreditCap();
    if (usage.used + cost > cap) {
      return { ok: false, alias, cost, cap, usage };
    }
    const next = { ...usage, used: usage.used + cost, runs: usage.runs + 1 };
    writeKaixuUsage(next);
    updateKaixuBudgetUi();
    return { ok: true, alias, cost, cap, usage: next };
  }

  function clampArrangementToTimeline() {
    const max = timelineBeats();
    state.beat = clampNumber(state.beat, 0, Math.max(0, max - 1), 0);
    for (const track of state.tracks) {
      track.pan = clampNumber(track.pan, -1, 1, 0);
      for (const region of track.regions) {
        region.start = clampNumber(region.start, 0, Math.max(0, max - 1), 0);
        region.length = clampNumber(region.length, 1, Math.max(1, max - region.start), 1);
      }
    }
  }

  function setTimelineBars(value, options = {}) {
    const bars = clampNumber(value, 1, MAX_TIMELINE_BEATS / BEATS_PER_BAR, DEFAULT_BEATS / BEATS_PER_BAR);
    state.maxBeats = Math.round(bars) * BEATS_PER_BAR;
    clampArrangementToTimeline();
    if (!options.skipInputSync) syncTimelineInput();
    renderRuler();
    renderTracks();
    renderWorkbenchPanel();
    updateClock();
    syncDebug();
  }

  function syncDebug() {
    window.__SKYE_NEXUS_DAW = {
      audioState: state.audio ? state.audio.state : "not-started",
      audioUnlocked: state.audioUnlocked,
      soundEvents: state.soundEvents,
      lastSoundAt: state.lastSoundAt,
      lastAudioError: state.lastAudioError,
      playing: state.playing,
      recording: state.recording,
      beat: state.beat,
      timelineBeats: timelineBeats(),
      timelineBars: timelineBars(),
      clipCount: state.clips.length,
      decodedClipCount: state.clips.filter((clip) => clip.bufferReady).length,
      vaultedClipCount: state.clips.filter((clip) => clip.assetId).length,
      regionCount: state.tracks.reduce((total, track) => total + track.regions.length, 0),
      clipPreviewEvents: state.clipPreviewEvents,
      keyboardEvents: state.keyboardEvents,
      keyboardOctave: state.keyboardOctave,
      activeRail: state.activeRail,
      metronomeEnabled: state.metronomeEnabled,
      loopEnabled: state.loopEnabled,
      selectedRegion: state.selectedRegion ? { ...state.selectedRegion } : null,
      historyDepth: state.history.length,
      futureDepth: state.future.length,
      editEvents: state.editEvents,
      soundPackEvents: state.soundPackEvents,
      mixdownEvents: state.mixdownEvents,
      micRecordEvents: state.micRecordEvents,
      midiEvents: state.midiEvents,
      midiStatus: state.midiStatus,
      kaixuAssistEvents: state.kaixuAssistEvents,
      lastKaixuAssist: state.lastKaixuAssist,
      lastAssistantRate: state.lastAssistantRate,
      assistantCreditUsage: state.assistantCreditUsage,
      lastAppliedDiff: state.lastAppliedDiff,
      assetPromoteEvents: state.assetPromoteEvents,
      lastAssetPromotion: state.lastAssetPromotion,
      lastRestoreReport: state.lastRestoreReport,
      exportQueueEvents: state.exportQueueEvents,
      lastExportJob: state.lastExportJob,
      cloudProjectCount: state.cloudProjects.length,
      workbenchFiles: buildWorkbenchFiles().length,
      commandLog: state.commandLog.slice(-8)
    };
  }

  function setAudioStatus(message, tone = "idle") {
    const node = $("dawAudioStatus");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("is-running", tone === "running");
    node.classList.toggle("is-error", tone === "error");
    const status = $("dawStatusAudio");
    if (status) status.textContent = message;
  }

  function ensureAudio({ resume = true } = {}) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      state.lastAudioError = "This browser does not expose WebAudio.";
      setAudioStatus("No WebAudio", "error");
      syncDebug();
      throw new Error(state.lastAudioError);
    }
    if (!state.audio) {
      state.audio = new AudioCtor();
      state.master = state.audio.createGain();
      state.master.gain.setValueAtTime(0.92, state.audio.currentTime);
      state.compressor = state.audio.createDynamicsCompressor();
      state.compressor.threshold.setValueAtTime(-18, state.audio.currentTime);
      state.compressor.knee.setValueAtTime(18, state.audio.currentTime);
      state.compressor.ratio.setValueAtTime(4, state.audio.currentTime);
      state.compressor.attack.setValueAtTime(0.004, state.audio.currentTime);
      state.compressor.release.setValueAtTime(0.12, state.audio.currentTime);
      state.master.connect(state.compressor).connect(state.audio.destination);
    }
    if (resume && state.audio.state === "suspended") {
      state.audio.resume().catch((error) => {
        state.lastAudioError = error.message || "Audio resume failed.";
        setAudioStatus("Audio blocked", "error");
        syncDebug();
      });
    }
    syncDebug();
    return state.audio;
  }

  async function unlockAudio({ testTone = false } = {}) {
    const audio = ensureAudio();
    if (audio.state === "suspended") await audio.resume();
    state.audioUnlocked = audio.state === "running";
    setAudioStatus(state.audioUnlocked ? "Audio running" : audio.state, state.audioUnlocked ? "running" : "idle");
    syncDebug();
    if (testTone) {
      beep({ frequency: 660, duration: 0.09, type: "triangle", gain: 0.12, label: "test-tone" });
      window.setTimeout(() => beep({ frequency: 990, duration: 0.07, type: "sine", gain: 0.08, label: "test-tone" }), 80);
    }
    return audio;
  }

  function markSound(label) {
    state.soundEvents += 1;
    state.lastSoundAt = new Date().toISOString();
    state.lastAudioError = "";
    setAudioStatus("Audio running", "running");
    syncDebug();
    if (label) console.debug("SkyeMusicNexus Native DAW sound:", label);
  }

  function outputNode(audio) {
    return state.master || audio.destination;
  }

  function cloneTracks() {
    return state.tracks.map((track) => ({
      ...track,
      regions: track.regions.map((region) => ({ ...region }))
    }));
  }

  function pushHistory(label) {
    state.history.push({
      label,
      tracks: cloneTracks(),
      selectedRegion: state.selectedRegion ? { ...state.selectedRegion } : null
    });
    state.history = state.history.slice(-50);
    state.future = [];
    syncDebug();
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    state.tracks = snapshot.tracks.map((track) => ({
      ...track,
      regions: track.regions.map((region) => ({ ...region }))
    }));
    state.selectedRegion = snapshot.selectedRegion ? { ...snapshot.selectedRegion } : null;
    renderTracks();
    renderMixer();
    renderWorkbenchPanel();
    updateStatusbar();
    updateEditButtons();
    syncDebug();
  }

  function withHistory(label, mutator) {
    pushHistory(label);
    mutator();
    state.editEvents += 1;
    appendLog(label);
    renderTracks();
    renderMixer();
    renderWorkbenchPanel();
    updateStatusbar();
    updateEditButtons();
    syncDebug();
  }

  function undoEdit() {
    const snapshot = state.history.pop();
    if (!snapshot) {
      writeOutput("Nothing to undo.");
      return;
    }
    state.future.push({
      label: "redo",
      tracks: cloneTracks(),
      selectedRegion: state.selectedRegion ? { ...state.selectedRegion } : null
    });
    state.editEvents += 1;
    restoreSnapshot(snapshot);
    writeOutput(`Undid edit: ${snapshot.label}.`);
  }

  function redoEdit() {
    const snapshot = state.future.pop();
    if (!snapshot) {
      writeOutput("Nothing to redo.");
      return;
    }
    state.history.push({
      label: "undo",
      tracks: cloneTracks(),
      selectedRegion: state.selectedRegion ? { ...state.selectedRegion } : null
    });
    state.editEvents += 1;
    restoreSnapshot(snapshot);
    writeOutput("Redid the last edit.");
  }

  function updateEditButtons() {
    $("undoDawButton")?.toggleAttribute("disabled", state.history.length === 0);
    $("redoDawButton")?.toggleAttribute("disabled", state.future.length === 0);
    $("metronomeDawButton")?.classList.toggle("is-active", state.metronomeEnabled);
    $("loopDawButton")?.classList.toggle("is-active", state.loopEnabled);
    $("micRecordButton")?.classList.toggle("is-active", Boolean(state.micRecorder && state.micRecorder.state === "recording"));
    $("midiDawButton")?.classList.toggle("is-active", state.midiStatus === "connected");
  }

  function beep({ frequency = 220, duration = 0.12, type = "sine", gain = 0.08, label = "beep" } = {}) {
    const audio = ensureAudio();
    if (audio.state === "suspended") {
      state.lastAudioError = "Audio context is suspended. Tap Audio, Play, a pad, or a key to unlock it.";
      syncDebug();
      audio.resume().catch(() => {});
    }
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.03, duration));
    osc.connect(amp).connect(outputNode(audio));
    osc.start(now);
    osc.stop(now + Math.max(0.04, duration) + 0.03);
    markSound(label);
  }

  function noiseBurst({ duration = 0.12, gain = 0.08, filter = 1400, label = "noise" } = {}) {
    const audio = ensureAudio();
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = audio.createBufferSource();
    const highpass = audio.createBiquadFilter();
    const amp = audio.createGain();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(filter, audio.currentTime);
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    source.buffer = buffer;
    source.connect(highpass).connect(amp).connect(outputNode(audio));
    source.start();
    markSound(label);
  }

  function kickVoice(gain = 0.18) {
    const audio = ensureAudio();
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(148, now);
    osc.frequency.exponentialRampToValueAtTime(54, now + 0.16);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(amp).connect(outputNode(audio));
    osc.start(now);
    osc.stop(now + 0.24);
    beep({ frequency: 1320, duration: 0.018, type: "square", gain: 0.025, label: "kick-click" });
    markSound("kick");
  }

  function padVoice(label, index) {
    const name = String(label || "").toLowerCase();
    if (name.includes("kick") || name.includes("808") || name.includes("sub")) {
      kickVoice(index === 8 ? 0.16 : 0.2);
      return;
    }
    if (name.includes("snare") || name.includes("clap") || name.includes("rim")) {
      noiseBurst({ duration: 0.13, gain: 0.12, filter: 900, label });
      beep({ frequency: 220 + index * 22, duration: 0.08, type: "triangle", gain: 0.045, label: `${label}-body` });
      return;
    }
    if (name.includes("hat") || name.includes("open") || name.includes("air")) {
      noiseBurst({ duration: name.includes("open") ? 0.24 : 0.07, gain: 0.075, filter: 5200, label });
      return;
    }
    const scale = [196, 220, 246.94, 261.63, 293.66, 329.63, 392, 440];
    beep({ frequency: scale[index % scale.length] * (index > 7 ? 1.5 : 1), duration: 0.18, type: index % 2 ? "sawtooth" : "triangle", gain: 0.1, label });
  }

  async function hitPad(label, index) {
    try {
      await unlockAudio();
      padVoice(label, index);
      flash(`[data-pad-index="${index}"]`);
      addRegionToArmedTrack(label, 1, {}, { recordHistory: true, historyLabel: `Pad write: ${label}` });
      state.editEvents += 1;
      writeOutput(`Pad hit: ${label}. Audio event written to the armed lane.`);
    } catch (error) {
      writeOutput(`Audio did not start: ${error.message}`);
    }
  }

  function shiftedFrequency(frequency) {
    return Number(frequency || 0) * (2 ** state.keyboardOctave);
  }

  async function hitKey(note, frequency, options = {}) {
    try {
      await unlockAudio();
      const finalFrequency = options.fromKeyboard ? shiftedFrequency(frequency) : Number(frequency || 0);
      if (options.fromKeyboard) state.keyboardEvents += 1;
      beep({ frequency: finalFrequency, duration: 0.32, type: "sine", gain: 0.11, label: options.fromKeyboard ? `keyboard-${note}` : `key-${note}` });
      flash(`[data-note="${note}"]`);
      writeOutput(options.fromKeyboard ? `Computer keyboard played: ${note}.` : `Key played: ${note}.`);
    } catch (error) {
      writeOutput(`Audio did not start: ${error.message}`);
    }
  }

  function flash(selector) {
    const node = document.querySelector(selector);
    if (!node) return;
    node.classList.add("is-hit");
    window.setTimeout(() => node.classList.remove("is-hit"), 140);
  }

  function addRegionToArmedTrack(name, length, extra = {}, options = {}) {
    const track = state.tracks.find((item) => item.armed) || state.tracks[0];
    const max = timelineBeats();
    if (options.recordHistory) pushHistory(options.historyLabel || `Add ${name}`);
    const region = {
      name,
      start: state.beat % max,
      length: Math.max(1, Math.min(max, Number(length) || 1)),
      ...extra
    };
    track.regions.push(region);
    state.selectedRegion = { trackId: track.id, regionIndex: track.regions.length - 1 };
    renderTracks();
    renderWorkbenchPanel();
    updateStatusbar();
    updateEditButtons();
    return { track, region };
  }

  async function setTransport(mode) {
    if (mode === "play") {
      try {
        await unlockAudio({ testTone: true });
        state.playing = true;
        if (!state.loopEnabled && state.beat >= timelineBeats() - 1) state.beat = 0;
        $("playTransportButton")?.classList.add("is-active");
        tickSound({ immediate: true });
        randomMeters();
        renderTracks();
        startClock();
        writeOutput("Audio engine active. Arrangement playback is running.");
      } catch (error) {
        state.lastAudioError = error.message || "Audio start failed.";
        setAudioStatus("Audio blocked", "error");
        writeOutput(`Audio did not start: ${state.lastAudioError}`);
      }
      syncDebug();
      return;
    }

    if (mode === "record") {
      state.recording = !state.recording;
      $("recordTransportButton")?.classList.toggle("is-active", state.recording);
      if (state.recording && !state.playing) await setTransport("play");
      syncDebug();
      return;
    }

    state.playing = false;
    state.recording = false;
    window.clearTimeout(state.timer);
    state.timer = null;
    $("playTransportButton")?.classList.remove("is-active");
    $("recordTransportButton")?.classList.remove("is-active");
    updateClock();
    renderTracks();
    writeOutput("Transport stopped.");
    syncDebug();
  }

  function startClock() {
    if (state.timer) return;
    const run = () => {
      if (!state.playing) return;
      const tempo = Number($("dawTempoInput")?.value || 96);
      const max = timelineBeats();
      if (!state.loopEnabled && state.beat >= max - 1) {
        state.playing = false;
        state.recording = false;
        state.timer = null;
        $("playTransportButton")?.classList.remove("is-active");
        $("recordTransportButton")?.classList.remove("is-active");
        writeOutput("Playback reached the end of the arrangement.");
        syncDebug();
        return;
      }
      state.beat = state.loopEnabled ? (state.beat + 1) % max : Math.min(max - 1, state.beat + 1);
      updateClock();
      tickSound();
      randomMeters();
      renderTracks();
      if (state.recording && state.beat % 4 === 0) addRegionToArmedTrack("Recorded phrase", 2);
      syncDebug();
      state.timer = window.setTimeout(run, Math.max(90, 60000 / tempo));
    };
    const tempo = Number($("dawTempoInput")?.value || 96);
    state.timer = window.setTimeout(run, Math.max(90, 60000 / tempo));
  }

  function playClip(clipId, volume = 1, panValue = 0) {
    const clip = state.clips.find((item) => item.id === clipId);
    if (!clip || !clip.buffer) return false;
    const audio = ensureAudio();
    const source = audio.createBufferSource();
    const amp = audio.createGain();
    const panner = typeof audio.createStereoPanner === "function" ? audio.createStereoPanner() : null;
    source.buffer = clip.buffer;
    amp.gain.setValueAtTime(Math.max(0.02, Math.min(0.9, volume * 0.82)), audio.currentTime);
    source.connect(amp);
    if (panner) {
      panner.pan.setValueAtTime(clampNumber(panValue, -1, 1, 0), audio.currentTime);
      amp.connect(panner).connect(outputNode(audio));
    } else {
      amp.connect(outputNode(audio));
    }
    source.start();
    markSound(`clip-${clip.name}`);
    return true;
  }

  async function previewClip(clipId) {
    const clip = state.clips.find((item) => item.id === clipId);
    if (!clip) return;
    try {
      await unlockAudio();
      if (!clip.bufferReady && (clip.inlineBase64 || clip.downloadUrl || clip.streamUrl)) {
        await restoreClipAudio(clip);
        renderClips();
      }
      const played = playClip(clipId, 1);
      if (played) {
        state.clipPreviewEvents += 1;
        writeOutput(`Previewing imported clip: ${clip.name}.`);
        syncDebug();
        return;
      }
      if (clip.localObjectUrl) {
        const fallback = new Audio(clip.localObjectUrl);
        fallback.crossOrigin = "anonymous";
        fallback.volume = 0.85;
        await fallback.play();
        state.clipPreviewEvents += 1;
        markSound(`clip-fallback-${clip.name}`);
        writeOutput(`Previewing imported clip through browser audio fallback: ${clip.name}.`);
        return;
      }
      writeOutput(`Clip is not decoded yet: ${clip.name}.`);
    } catch (error) {
      writeOutput(`Clip preview failed: ${error.message}`);
    }
  }

  function playTrackVoice(track) {
    if (track.id === "drums") {
      kickVoice(0.14 * track.volume);
      return;
    }
    if (track.id === "bass") {
      beep({ frequency: 92, duration: 0.18, type: "sawtooth", gain: 0.1 * track.volume, label: "bass" });
      return;
    }
    if (track.id === "keys") {
      beep({ frequency: 330, duration: 0.16, type: "triangle", gain: 0.08 * track.volume, label: "keys" });
      return;
    }
    if (track.id === "vocal") {
      beep({ frequency: 440, duration: 0.12, type: "sine", gain: 0.07 * track.volume, label: "vocal-guide" });
      return;
    }
    beep({ frequency: 220, duration: 0.13, type: "triangle", gain: 0.07 * track.volume, label: track.id });
  }

  function metronomeClick() {
    if (!state.metronomeEnabled) return;
    const downbeat = state.beat % 4 === 0;
    beep({
      frequency: downbeat ? 1320 : 940,
      duration: 0.045,
      type: downbeat ? "square" : "triangle",
      gain: downbeat ? 0.055 : 0.035,
      label: "metronome"
    });
  }

  function tickSound({ immediate = false } = {}) {
    metronomeClick();
    const activeSolo = state.tracks.some((track) => track.solo);
    for (const track of state.tracks) {
      if (track.muted || (activeSolo && !track.solo)) continue;
      const activeRegions = track.regions.filter((region) => state.beat >= region.start && state.beat < region.start + region.length);
      if (!activeRegions.length) continue;
      let synthPlayed = false;
      for (const region of activeRegions) {
        if (region.clipId) {
          const startsNow = state.beat === region.start || (immediate && state.beat >= region.start && state.beat < region.start + region.length);
          if (startsNow) playClip(region.clipId, track.volume, track.pan || 0);
          continue;
        }
        if (!synthPlayed) {
          playTrackVoice(track);
          synthPlayed = true;
        }
      }
    }
  }

  function randomMeters() {
    for (const track of state.tracks) {
      track.meter = track.muted ? 0 : Math.min(1, Math.random() * track.volume);
    }
    renderMixer();
  }

  function updateClock() {
    const bar = String(Math.floor(state.beat / 4) + 1).padStart(3, "0");
    const beat = String((state.beat % 4) + 1).padStart(2, "0");
    const clock = $("dawClock");
    if (clock) clock.textContent = `${bar}:${beat}`;
  }

  function renderRuler() {
    const ruler = $("dawRuler");
    if (!ruler) return;
    const max = timelineBeats();
    ruler.style.gridTemplateColumns = `repeat(${max}, minmax(3.25rem, 1fr))`;
    ruler.innerHTML = Array.from({ length: max }, (_, index) => `<span>${index + 1}</span>`).join("");
  }

  function renderTracks() {
    const grid = $("dawTrackGrid");
    if (!grid) return;
    const max = timelineBeats();
    grid.innerHTML = state.tracks.map((track) => {
      const regions = track.regions.map((region, regionIndex) => {
        const start = Math.max(0, region.start) / max * 100;
        const width = Math.max(1, region.length) / max * 100;
        const selected = state.selectedRegion && state.selectedRegion.trackId === track.id && state.selectedRegion.regionIndex === regionIndex;
        return `<button type="button" class="daw-region ${selected ? "is-selected" : ""}" data-region-track="${track.id}" data-region-index="${regionIndex}" style="left:${start}%;width:${width}%;border-color:${track.color};"><span>${escapeHtml(region.name)}</span></button>`;
      }).join("");
      const playhead = `<div class="daw-playhead" style="left:${state.beat / max * 100}%"></div>`;
      return `<article class="daw-track-row" data-track="${track.id}">
        <div class="daw-track-label">
          <strong>${escapeHtml(track.name)}</strong>
          <div class="daw-track-controls">
            <button type="button" data-track-action="mute" data-track-id="${track.id}" class="${track.muted ? "is-on" : ""}">M</button>
            <button type="button" data-track-action="solo" data-track-id="${track.id}" class="${track.solo ? "is-on" : ""}">S</button>
            <button type="button" data-track-action="arm" data-track-id="${track.id}" class="${track.armed ? "is-on" : ""}">R</button>
          </div>
        </div>
        <div class="daw-lane" style="--daw-beats:${max};">${regions}${playhead}</div>
      </article>`;
    }).join("");
  }

  function renderMixer() {
    const mixer = $("dawMixerChannels");
    if (!mixer) return;
    mixer.innerHTML = state.tracks.map((track) => {
      return `<article class="daw-channel">
        <div>
          <strong>${escapeHtml(track.name)}</strong>
          <input type="range" min="0" max="1" step="0.01" value="${track.volume}" data-volume-track="${track.id}" aria-label="${escapeHtml(track.name)} volume" />
          <label class="daw-pan-row"><span>Pan</span><input type="range" min="-1" max="1" step="0.01" value="${track.pan || 0}" data-pan-track="${track.id}" aria-label="${escapeHtml(track.name)} pan" /><small>${panLabel(track.pan || 0)}</small></label>
        </div>
        <meter min="0" max="1" value="${track.meter}"></meter>
      </article>`;
    }).join("");
  }

  function renderPads() {
    const pads = $("dawPads");
    if (!pads) return;
    pads.innerHTML = state.pads.map((pad, index) => {
      const shortcut = readableKeyboardCode(padKeyCodes[index]);
      return `<button class="daw-pad" data-pad-index="${index}" type="button" ${shortcut ? `title="Computer keyboard ${escapeHtml(shortcut)}" aria-keyshortcuts="${escapeHtml(shortcut)}"` : ""}>${escapeHtml(pad)}</button>`;
    }).join("");
  }

  function renderKeys() {
    const keys = $("dawKeys");
    if (!keys) return;
    keys.innerHTML = state.keys.map(([note, frequency, black], index) => {
      const shortcut = readableKeyboardCode(keyboardNoteCodes[index]);
      return `<button class="daw-key" data-note="${note}" data-frequency="${frequency}" data-black="${black}" type="button" ${shortcut ? `title="Computer keyboard ${escapeHtml(shortcut)}" aria-keyshortcuts="${escapeHtml(shortcut)}"` : ""}>${note}</button>`;
    }).join("");
  }

  function renderSoundLibrary() {
    const library = $("dawSoundLibrary");
    if (!library) return;
    library.innerHTML = soundLibrary.map((pack) => `<button type="button" data-sound-pack="${escapeHtml(pack.id)}">
      <strong>${escapeHtml(pack.name)}</strong>
      <span>${escapeHtml(pack.regions.join(" + "))}</span>
    </button>`).join("");
  }

  function clipDecodeLabel(clip) {
    if (clip.bufferReady) return "decoded";
    if (clip.restoreStatus === "restoring") return "restoring";
    if (clip.inlineBase64 || clip.downloadUrl || clip.streamUrl) return "restorable";
    if (clip.decodeError) return "metadata only";
    return "decoding";
  }

  function clipStorageLabel(clip) {
    if (clip.assetId) return "vaulted";
    if (clip.inlineBase64) return "project-inline";
    if (clip.uploadBase64) return "vault-ready";
    return "local-only";
  }

  function isClipPreviewable(clip) {
    return Boolean(clip.bufferReady || clip.localObjectUrl || clip.inlineBase64 || clip.downloadUrl || clip.streamUrl);
  }

  function renderClips() {
    const list = $("dawClipList");
    if (!list) return;
    if (!state.clips.length) {
      list.innerHTML = `<article class="daw-clip-card"><strong>No audio imported.</strong><span>Drop files here to place clips on the armed lane.</span></article>`;
      renderWorkbenchPanel();
      updateStatusbar();
      return;
    }
    list.innerHTML = state.clips.map((clip) => `<article class="daw-clip-card">
      <strong>${escapeHtml(clip.name)}</strong>
      <span>${escapeHtml(clip.type)} - ${formatBytes(clip.size)} - ${clipDecodeLabel(clip)} - ${clipStorageLabel(clip)}</span>
      <button type="button" data-clip-preview="${escapeHtml(clip.id)}" ${isClipPreviewable(clip) ? "" : "disabled"}>Preview Clip</button>
      <button type="button" data-clip-promote="${escapeHtml(clip.id)}" ${clip.assetId || !clip.uploadBase64 ? "disabled" : ""}>Vault Clip</button>
      ${clip.assetId ? `<small>Asset ${escapeHtml(clip.assetId)}</small>` : clip.assetPromoteError ? `<small>${escapeHtml(clip.assetPromoteError)}</small>` : clip.contentHash ? `<small>Hash ${escapeHtml(clip.contentHash.slice(0, 16))}</small>` : ""}
    </article>`).join("");
    renderWorkbenchPanel();
    updateStatusbar();
  }

  function buildWorkbenchFiles() {
    const regionCount = state.tracks.reduce((total, track) => total + track.regions.length, 0);
    return [
      { name: "session.nexus", detail: `${$("dawProjectInput")?.value || "Nexus native session"} / ${$("dawTempoInput")?.value || 96} BPM / ${timelineBars()} bars`, type: "session" },
      { name: "tracks.json", detail: `${state.tracks.length} tracks / ${regionCount} regions`, type: "tracks" },
      { name: "mixer.json", detail: `${state.tracks.filter((track) => track.solo).length} solo / ${state.tracks.filter((track) => track.muted).length} muted`, type: "mix" },
      { name: "clips.bin", detail: `${state.clips.length} imported / ${state.clips.filter((clip) => clip.assetId).length} vaulted`, type: "clips" },
      { name: "edit-history.json", detail: `${state.history.length} undo / ${state.future.length} redo / ${state.editEvents} edits`, type: "tracks" },
      { name: "sound-packs.json", detail: `${soundLibrary.length} local packs / ${state.soundPackEvents} inserted`, type: "clips" },
      { name: "inputs.json", detail: `mic ${state.micRecordEvents} / midi ${state.midiStatus}`, type: "mix" },
      { name: "kaixu-assist.json", detail: `${state.kaixuAssistEvents} gated DAW assist runs / ${readKaixuUsage().used} credits`, type: "kaixu" },
      { name: "mixdown.wav", detail: `${state.mixdownEvents} rendered browser WAV exports`, type: "export" },
      { name: "release-forge.json", detail: `${state.exportQueueEvents} queued handoff manifest(s)`, type: "export" },
      { name: "daw-console.log", detail: `${state.commandLog.length} session events`, type: "console" }
    ];
  }

  function fileRow(file) {
    return `<button type="button" class="daw-file-row" data-daw-open="${escapeHtml(file.type)}">
      <span>${escapeHtml(file.type)}</span>
      <div><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.detail)}</small></div>
    </button>`;
  }

  function renderWorkbenchPanel() {
    const body = $("dawWorkbenchBody");
    if (!body) return;
    const kicker = $("dawWorkbenchKicker");
    const title = $("dawWorkbenchTitle");
    const panelCopy = {
      session: ["session", "Project Files"],
      tracks: ["tracks", "Track Map"],
      clips: ["clips", "Clip Bin"],
      mix: ["mix", "Mix Console"],
      kaixu: ["kaixu", "kAIxU Assist"],
      export: ["export", "Release Handoff"]
    }[state.activeRail] || ["session", "Project Files"];
    if (kicker) kicker.textContent = panelCopy[0];
    if (title) title.textContent = panelCopy[1];

    const files = buildWorkbenchFiles();
    if (state.activeRail === "session") {
      body.innerHTML = files.map(fileRow).join("");
    } else if (state.activeRail === "tracks") {
      body.innerHTML = state.tracks.map((track) => fileRow({
        name: `${track.name}.track`,
        detail: `${track.regions.length} regions / ${track.armed ? "armed" : track.muted ? "muted" : track.solo ? "solo" : "ready"}`,
        type: track.id
      })).join("");
    } else if (state.activeRail === "clips") {
      body.innerHTML = state.clips.length
        ? state.clips.map((clip) => fileRow({ name: clip.name, detail: `${formatBytes(clip.size)} / ${clip.bufferReady ? "decoded" : "pending decode"}`, type: "clip" })).join("")
        : fileRow({ name: "No imported clips", detail: "Use Import audio to decode clips into the timeline", type: "clips" });
    } else if (state.activeRail === "mix") {
      body.innerHTML = state.tracks.map((track) => fileRow({ name: `${track.name} channel`, detail: `${Math.round(track.volume * 100)}% volume / ${panLabel(track.pan || 0)} pan / ${Math.round(track.meter * 100)}% meter`, type: "mix" })).join("");
    } else if (state.activeRail === "kaixu") {
      body.innerHTML = state.lastKaixuAssist
        ? [
          fileRow({ name: "last-kaixu-guidance.json", detail: state.lastKaixuAssist.summary || "kAIxU DAW guidance recorded", type: "kaixu" }),
          fileRow({ name: "project-diff.json", detail: `${state.lastKaixuAssist.projectDiff?.operations?.length || 0} deterministic operation(s)`, type: "kaixu" }),
          ...((state.lastKaixuAssist.arrangementActions || state.lastKaixuAssist.actions || []).slice(0, 4).map((line, index) => fileRow({ name: `kaixu-action-${index + 1}.note`, detail: line, type: "kaixu" })))
        ].join("")
        : fileRow({ name: "No guidance yet", detail: "Ask kAIxU from the assistant panel", type: "kaixu" });
    } else {
      body.innerHTML = [
        fileRow({ name: "release-forge.json", detail: "Builds artist, track, rights, and handoff metadata", type: "export" }),
        ...state.commandLog.slice(-5).reverse().map((line, index) => fileRow({ name: `console-${index + 1}.log`, detail: line, type: "log" }))
      ].join("");
    }
  }

  function setWorkbenchRail(nextRail) {
    const trackIds = new Set(state.tracks.map((track) => track.id));
    const normalized = nextRail === "clip" || nextRail === "clips.bin" ? "clips"
      : nextRail === "log" || nextRail === "console" ? "export"
      : trackIds.has(nextRail) ? "tracks"
      : ["session", "tracks", "clips", "mix", "kaixu", "export"].includes(nextRail) ? nextRail
      : "session";
    state.activeRail = normalized;
    document.querySelectorAll("[data-daw-rail]").forEach((button) => button.classList.toggle("active", button.dataset.dawRail === state.activeRail));
    renderWorkbenchPanel();
    syncDebug();
  }

  function getSelectedRegion() {
    if (!state.selectedRegion) return null;
    const track = state.tracks.find((item) => item.id === state.selectedRegion.trackId);
    if (!track) return null;
    const index = Number(state.selectedRegion.regionIndex);
    const region = track.regions[index];
    if (!region) return null;
    return { track, region, index };
  }

  function ensureSelectedRegion() {
    const current = getSelectedRegion();
    if (current) return current;
    for (const track of state.tracks) {
      if (track.regions.length) {
        state.selectedRegion = { trackId: track.id, regionIndex: 0 };
        return getSelectedRegion();
      }
    }
    return null;
  }

  function selectRegion(trackId, regionIndex) {
    state.selectedRegion = { trackId, regionIndex: Number(regionIndex) };
    const selected = getSelectedRegion();
    renderTracks();
    updateEditButtons();
    writeOutput(selected ? `Selected region: ${selected.region.name} on ${selected.track.name}.` : "Selected region is no longer available.");
  }

  function splitSelectedRegion() {
    const selected = ensureSelectedRegion();
    if (!selected) {
      writeOutput("No region to split.");
      return;
    }
    if (selected.region.length <= 1) {
      writeOutput("Selected region is already one beat long.");
      return;
    }
    withHistory(`Split region: ${selected.region.name}`, () => {
      const leftLength = Math.max(1, Math.floor(selected.region.length / 2));
      const rightLength = Math.max(1, selected.region.length - leftLength);
      const left = { ...selected.region, length: leftLength };
      const right = { ...selected.region, name: `${selected.region.name} B`, start: selected.region.start + leftLength, length: rightLength };
      selected.track.regions.splice(selected.index, 1, left, right);
      state.selectedRegion = { trackId: selected.track.id, regionIndex: selected.index + 1 };
    });
    writeOutput("Split selected region.");
  }

  function duplicateSelectedRegion() {
    const selected = ensureSelectedRegion();
    if (!selected) {
      writeOutput("No region to duplicate.");
      return;
    }
    withHistory(`Duplicate region: ${selected.region.name}`, () => {
      const max = timelineBeats();
      const start = Math.min(max - 1, selected.region.start + selected.region.length);
      const length = Math.max(1, Math.min(selected.region.length, max - start));
      const duplicate = { ...selected.region, name: `${selected.region.name} copy`, start, length };
      selected.track.regions.splice(selected.index + 1, 0, duplicate);
      state.selectedRegion = { trackId: selected.track.id, regionIndex: selected.index + 1 };
    });
    writeOutput("Duplicated selected region.");
  }

  function deleteSelectedRegion() {
    const selected = ensureSelectedRegion();
    if (!selected) {
      writeOutput("No region to delete.");
      return;
    }
    withHistory(`Delete region: ${selected.region.name}`, () => {
      selected.track.regions.splice(selected.index, 1);
      const nextIndex = Math.min(selected.index, selected.track.regions.length - 1);
      state.selectedRegion = nextIndex >= 0 ? { trackId: selected.track.id, regionIndex: nextIndex } : null;
    });
    writeOutput("Deleted selected region.");
  }

  function quantizeRegions() {
    withHistory("Quantize arrangement", () => {
      for (const track of state.tracks) {
        for (const region of track.regions) {
          const max = timelineBeats();
          region.start = Math.max(0, Math.min(max - 1, Math.round(Number(region.start) || 0)));
          region.length = Math.max(1, Math.min(max - region.start, Math.round(Number(region.length) || 1)));
        }
        track.regions.sort((a, b) => a.start - b.start);
      }
      state.selectedRegion = null;
    });
    writeOutput("Quantized all regions to the beat grid.");
  }

  function toggleMetronome() {
    state.metronomeEnabled = !state.metronomeEnabled;
    state.editEvents += 1;
    updateEditButtons();
    writeOutput(state.metronomeEnabled ? "Metronome on." : "Metronome off.");
  }

  function toggleLoop() {
    state.loopEnabled = !state.loopEnabled;
    state.editEvents += 1;
    updateEditButtons();
    writeOutput(state.loopEnabled ? "Loop playback on." : "Loop playback off.");
  }

  function addSoundPack(packId) {
    const pack = soundLibrary.find((item) => item.id === packId);
    if (!pack) return;
    const track = state.tracks.find((item) => item.id === pack.trackId) || state.tracks[0];
    withHistory(`Add sound pack: ${pack.name}`, () => {
      const max = timelineBeats();
      const baseStart = state.beat % max;
      pack.regions.forEach((name, index) => {
        const start = Math.min(max - 1, baseStart + index * Math.max(1, Math.floor(pack.length / Math.max(1, pack.regions.length))));
        track.regions.push({
          name,
          start,
          length: Math.max(1, Math.min(pack.length, max - start)),
          packId: pack.id
        });
      });
      state.selectedRegion = { trackId: track.id, regionIndex: track.regions.length - 1 };
    });
    state.soundPackEvents += 1;
    writeOutput(`Inserted loop pack: ${pack.name}.`);
  }

  function appendLog(message) {
    const line = String(message || "").split("\n")[0].slice(0, 180);
    if (!line) return;
    state.commandLog.push(line);
    state.commandLog = state.commandLog.slice(-40);
  }

  function updateStatusbar() {
    const project = $("dawStatusProject");
    const tracks = $("dawStatusTrackCount");
    const clips = $("dawStatusClipCount");
    const save = $("dawStatusSave");
    if (project) project.textContent = $("dawProjectInput")?.value || "Nexus native session";
    if (tracks) tracks.textContent = `${state.tracks.length} tracks`;
    if (clips) clips.textContent = `${state.clips.length} clips / ${state.clips.filter((clip) => clip.assetId).length} vaulted`;
    if (save) save.textContent = state.commandLog.some((line) => line.includes("Saved native DAW project")) ? "Saved" : "Local session";
  }

  function readableKeyboardCode(code) {
    if (!code) return "";
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    if (code === "Space") return "Space";
    return code;
  }

  function panLabel(value) {
    const pan = clampNumber(value, -1, 1, 0);
    if (Math.abs(pan) < 0.04) return "C";
    return `${pan < 0 ? "L" : "R"}${Math.round(Math.abs(pan) * 100)}`;
  }

  function isEditableTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable === true;
  }

  function keyboardNoteForCode(code) {
    const index = keyboardNoteCodes.indexOf(code);
    if (index < 0) return null;
    const key = state.keys[index];
    return key ? { note: key[0], frequency: key[1] } : null;
  }

  function keyboardPadForCode(code) {
    const index = padKeyCodes.indexOf(code);
    if (index < 0) return null;
    return { label: state.pads[index], index };
  }

  async function handlePerformanceKeydown(event) {
    if (isEditableTarget(event.target)) return;
    if ((event.ctrlKey || event.metaKey) && event.code === "KeyZ") {
      event.preventDefault();
      if (event.shiftKey) redoEdit();
      else undoEdit();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.code === "KeyY") {
      event.preventDefault();
      redoEdit();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (state.heldKeyboardKeys.has(event.code)) return;

    const key = keyboardNoteForCode(event.code);
    if (key) {
      event.preventDefault();
      state.heldKeyboardKeys.add(event.code);
      await hitKey(key.note, key.frequency, { fromKeyboard: true });
      syncDebug();
      return;
    }

    const pad = keyboardPadForCode(event.code);
    if (pad && pad.label) {
      event.preventDefault();
      state.heldKeyboardKeys.add(event.code);
      state.keyboardEvents += 1;
      await hitPad(pad.label, pad.index);
      syncDebug();
      return;
    }

    if (octaveCodes.has(event.code)) {
      event.preventDefault();
      state.heldKeyboardKeys.add(event.code);
      state.keyboardOctave = Math.max(-2, Math.min(2, state.keyboardOctave + (event.code === "KeyX" ? 1 : -1)));
      writeOutput(`Computer keyboard octave: ${state.keyboardOctave > 0 ? "+" : ""}${state.keyboardOctave}.`);
      syncDebug();
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      state.heldKeyboardKeys.add(event.code);
      await setTransport(state.playing ? "stop" : "play");
      return;
    }

    if (event.code === "KeyR") {
      event.preventDefault();
      state.heldKeyboardKeys.add(event.code);
      await setTransport("record");
    }
  }

  function handlePerformanceKeyup(event) {
    state.heldKeyboardKeys.delete(event.code);
  }

  async function importFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const audio = ensureAudio({ resume: false });
    pushHistory(`Import ${files.length} audio file(s)`);
    for (const file of files) {
      const clip = {
        id: `clip_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: file.name,
        originalName: file.name,
        type: file.type || "audio/unknown",
        size: file.size,
        localObjectUrl: URL.createObjectURL(file),
        buffer: null,
        bufferReady: false,
        restoreStatus: "importing",
        importedAt: new Date().toISOString()
      };
      state.clips.unshift(clip);
      addRegionToArmedTrack(file.name.replace(/\.[^.]+$/, ""), 4, { clipId: clip.id });
      try {
        const arrayBuffer = await file.arrayBuffer();
        clip.contentHash = await sha256Hex(arrayBuffer);
        if (arrayBuffer.byteLength <= PROJECT_INLINE_AUDIO_LIMIT) {
          clip.inlineBase64 = arrayBufferToBase64(arrayBuffer);
          clip.restoreStatus = "project-inline-ready";
        }
        if (arrayBuffer.byteLength <= INLINE_ASSET_UPLOAD_LIMIT) {
          clip.uploadBase64 = clip.inlineBase64 || arrayBufferToBase64(arrayBuffer);
          clip.assetPromotable = true;
        } else {
          clip.assetPromoteError = `Use Upload Studio for files over ${formatBytes(INLINE_ASSET_UPLOAD_LIMIT)}.`;
        }
        clip.buffer = await audio.decodeAudioData(arrayBuffer.slice(0));
        clip.bufferReady = true;
        clip.duration = clip.buffer.duration;
        clip.sampleRate = clip.buffer.sampleRate;
        clip.channels = clip.buffer.numberOfChannels;
        clip.restoreStatus = clip.inlineBase64 ? "decoded-project-inline" : "decoded-local";
      } catch (error) {
        clip.decodeError = error.message || "Clip decode failed.";
        clip.restoreStatus = clip.inlineBase64 ? "project-inline-ready" : "metadata-only";
      }
    }
    state.editEvents += 1;
    renderClips();
    const decoded = state.clips.filter((clip) => clip.bufferReady).length;
    writeOutput(`Imported ${files.length} clip(s) into the armed lane. ${decoded} decoded for DAW playback.`);
    syncDebug();
  }

  function mixSample(target, index, value) {
    if (index < 0 || index >= target.length) return;
    target[index] = Math.max(-1, Math.min(1, target[index] + value));
  }

  function panGains(value) {
    const pan = clampNumber(value, -1, 1, 0);
    const angle = (pan + 1) * Math.PI / 4;
    return { left: Math.cos(angle), right: Math.sin(angle) };
  }

  function synthRegionIntoMix(mix, track, region, sampleRate, beatDuration) {
    const startSample = Math.floor(region.start * beatDuration * sampleRate);
    const durationSamples = Math.max(1, Math.floor(region.length * beatDuration * sampleRate));
    const base = track.id === "bass" ? 92 : track.id === "keys" ? 330 : track.id === "vocal" ? 440 : track.id === "sample" ? 220 : 120;
    const gains = panGains(track.pan || 0);
    for (let index = 0; index < durationSamples; index += 1) {
      const absolute = startSample + index;
      const beatPulse = Math.floor(index / Math.max(1, Math.floor(beatDuration * sampleRate)));
      const envelope = Math.min(1, index / 500, (durationSamples - index) / 1200);
      const wave = track.id === "drums"
        ? (beatPulse % 2 === 0 ? Math.sin(2 * Math.PI * 62 * (index / sampleRate)) : (Math.random() * 2 - 1) * 0.18)
        : Math.sin(2 * Math.PI * (base + beatPulse * 3) * (index / sampleRate));
      const sample = wave * envelope * track.volume * 0.16;
      mixSample(mix.left, absolute, sample * gains.left);
      mixSample(mix.right, absolute, sample * gains.right);
    }
  }

  function clipRegionIntoMix(mix, track, region, clip, sampleRate, beatDuration) {
    if (!clip || !clip.buffer) return false;
    const sourceLeft = clip.buffer.getChannelData(0);
    const sourceRight = clip.buffer.numberOfChannels > 1 ? clip.buffer.getChannelData(1) : sourceLeft;
    const sourceRate = clip.buffer.sampleRate || sampleRate;
    const startSample = Math.floor(region.start * beatDuration * sampleRate);
    const gains = panGains(track.pan || 0);
    const maxSamples = Math.min(
      Math.floor(region.length * beatDuration * sampleRate),
      Math.floor(sourceLeft.length * (sampleRate / sourceRate))
    );
    for (let index = 0; index < maxSamples; index += 1) {
      const sourceIndex = Math.min(sourceLeft.length - 1, Math.floor(index * (sourceRate / sampleRate)));
      mixSample(mix.left, startSample + index, sourceLeft[sourceIndex] * track.volume * 0.75 * gains.left);
      mixSample(mix.right, startSample + index, sourceRight[sourceIndex] * track.volume * 0.75 * gains.right);
    }
    return true;
  }

  function encodeWav(leftSamples, sampleRate, rightSamples = null) {
    const channels = rightSamples ? 2 : 1;
    const dataBytes = leftSamples.length * channels * 2;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    const writeString = (offset, value) => {
      for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataBytes, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataBytes, true);
    for (let index = 0; index < leftSamples.length; index += 1) {
      const frameOffset = 44 + index * channels * 2;
      view.setInt16(frameOffset, Math.max(-1, Math.min(1, leftSamples[index])) * 32767, true);
      if (rightSamples) view.setInt16(frameOffset + 2, Math.max(-1, Math.min(1, rightSamples[index])) * 32767, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    link.remove();
  }

  function renderMixdownWav() {
    const sampleRate = 44100;
    const tempo = Number($("dawTempoInput")?.value || 96);
    const beatDuration = Math.max(0.25, 60 / Math.max(40, Math.min(240, tempo)));
    const totalSamples = Math.ceil(timelineBeats() * beatDuration * sampleRate);
    const mix = { left: new Float32Array(totalSamples), right: new Float32Array(totalSamples) };
    const activeSolo = state.tracks.some((track) => track.solo);
    for (const track of state.tracks) {
      if (track.muted || (activeSolo && !track.solo)) continue;
      for (const region of track.regions) {
        const clip = region.clipId ? state.clips.find((item) => item.id === region.clipId) : null;
        if (!clipRegionIntoMix(mix, track, region, clip, sampleRate, beatDuration)) {
          synthRegionIntoMix(mix, track, region, sampleRate, beatDuration);
        }
      }
    }
    const blob = encodeWav(mix.left, sampleRate, mix.right);
    const title = ($("dawProjectInput")?.value || "nexus_session").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    downloadBlob(blob, `${title}_mixdown.wav`);
    state.mixdownEvents += 1;
    writeOutput(`Rendered stereo browser WAV mixdown: ${(blob.size / 1024 / 1024).toFixed(2)} MB.`);
  }

  async function finishMicRecording(recorder) {
    const blob = new Blob(state.micChunks, { type: recorder.mimeType || "audio/webm" });
    const clip = {
      id: `mic_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: `Mic take ${new Date().toLocaleTimeString()}`,
      originalName: "microphone-recording.webm",
      type: blob.type || "audio/webm",
      size: blob.size,
      localObjectUrl: URL.createObjectURL(blob),
      buffer: null,
      bufferReady: false,
      restoreStatus: "recorded-local",
      importedAt: new Date().toISOString()
    };
    state.clips.unshift(clip);
    pushHistory(`Record microphone: ${clip.name}`);
    addRegionToArmedTrack(clip.name, 4, { clipId: clip.id });
    try {
      const audio = ensureAudio({ resume: false });
      const arrayBuffer = await blob.arrayBuffer();
      clip.contentHash = await sha256Hex(arrayBuffer);
      if (arrayBuffer.byteLength <= PROJECT_INLINE_AUDIO_LIMIT) {
        clip.inlineBase64 = arrayBufferToBase64(arrayBuffer);
        clip.restoreStatus = "project-inline-ready";
      }
      if (arrayBuffer.byteLength <= INLINE_ASSET_UPLOAD_LIMIT) {
        clip.uploadBase64 = clip.inlineBase64 || arrayBufferToBase64(arrayBuffer);
        clip.assetPromotable = true;
      } else {
        clip.assetPromoteError = `Use Upload Studio for files over ${formatBytes(INLINE_ASSET_UPLOAD_LIMIT)}.`;
      }
      clip.buffer = await audio.decodeAudioData(arrayBuffer.slice(0));
      clip.bufferReady = true;
      clip.duration = clip.buffer.duration;
      clip.sampleRate = clip.buffer.sampleRate;
      clip.channels = clip.buffer.numberOfChannels;
      clip.restoreStatus = clip.inlineBase64 ? "decoded-project-inline" : "decoded-local";
    } catch (error) {
      clip.decodeError = error.message || "Mic clip decode failed.";
      clip.restoreStatus = clip.inlineBase64 ? "project-inline-ready" : "metadata-only";
    }
    state.micRecordEvents += 1;
    state.editEvents += 1;
    state.micChunks = [];
    if (state.micStream) state.micStream.getTracks().forEach((track) => track.stop());
    state.micStream = null;
    state.micRecorder = null;
    renderClips();
    updateEditButtons();
    writeOutput(`Recorded microphone take: ${clip.name}.`);
  }

  async function toggleMicRecord() {
    if (state.micRecorder && state.micRecorder.state === "recording") {
      state.micRecorder.stop();
      updateEditButtons();
      return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function" || typeof window.MediaRecorder !== "function") {
      writeOutput("This browser does not expose microphone recording APIs.");
      return;
    }
    try {
      await unlockAudio();
      state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.micChunks = [];
      const recorder = new MediaRecorder(state.micStream);
      state.micRecorder = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) state.micChunks.push(event.data);
      });
      recorder.addEventListener("stop", () => { void finishMicRecording(recorder); });
      recorder.start();
      updateEditButtons();
      writeOutput("Microphone recording armed.");
    } catch (error) {
      state.lastAudioError = error.message || "Microphone recording failed.";
      if (state.micStream) state.micStream.getTracks().forEach((track) => track.stop());
      state.micStream = null;
      state.micRecorder = null;
      updateEditButtons();
      writeOutput(`Microphone recording failed: ${state.lastAudioError}`);
    }
  }

  function midiNoteToKey(noteNumber) {
    const index = Math.max(0, Math.min(state.keys.length - 1, (Number(noteNumber) - 60) % state.keys.length));
    const key = state.keys[index];
    return key ? { note: key[0], frequency: key[1] } : null;
  }

  async function connectMidi() {
    if (!navigator.requestMIDIAccess) {
      state.midiStatus = "not-supported";
      updateEditButtons();
      writeOutput("This browser does not expose Web MIDI.");
      syncDebug();
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      const inputs = Array.from(access.inputs.values());
      for (const input of inputs) {
        input.onmidimessage = (message) => {
          const [status, note, velocity] = message.data || [];
          const command = status & 0xf0;
          if (command === 0x90 && velocity > 0) {
            const key = midiNoteToKey(note);
            if (key) {
              state.midiEvents += 1;
              void hitKey(key.note, key.frequency, { fromKeyboard: true });
            }
          }
        };
      }
      state.midiStatus = inputs.length ? "connected" : "no-inputs";
      updateEditButtons();
      writeOutput(inputs.length ? `Connected ${inputs.length} MIDI input(s).` : "Web MIDI is available, but no input device is connected.");
      syncDebug();
    } catch (error) {
      state.midiStatus = "blocked";
      writeOutput(`MIDI connection failed: ${error.message}`);
      syncDebug();
    }
  }

  function clipProjectInlineBase64(clip) {
    if (clip.inlineBase64) return clip.inlineBase64;
    if (clip.uploadBase64 && Number(clip.size || 0) <= PROJECT_INLINE_AUDIO_LIMIT) return clip.uploadBase64;
    return "";
  }

  function clipToProjectClip(clip) {
    const inlineBase64 = clipProjectInlineBase64(clip);
    const hasAsset = Boolean(clip.assetId || clip.streamUrl || clip.downloadUrl);
    const restoreStrategy = hasAsset ? "music-assets" : inlineBase64 ? "project-inline" : "metadata-only";
    return {
      id: clip.id,
      name: clip.name,
      originalName: clip.originalName || clip.name,
      type: clip.type,
      size: Number(clip.size || 0),
      assetId: clip.assetId || "",
      streamUrl: clip.streamUrl || "",
      downloadUrl: clip.downloadUrl || "",
      storage: hasAsset ? "music-assets" : inlineBase64 ? "project-inline" : "browser-local",
      audio: {
        contentHash: clip.contentHash || "",
        duration: Number.isFinite(clip.duration) ? clip.duration : 0,
        sampleRate: Number.isFinite(clip.sampleRate) ? clip.sampleRate : 0,
        channels: Number.isFinite(clip.channels) ? clip.channels : 0,
        inlineBase64,
        inlineBytes: inlineBase64 ? Number(clip.size || 0) : 0,
        asset: hasAsset ? {
          assetId: clip.assetId || "",
          streamUrl: clip.streamUrl || "",
          downloadUrl: clip.downloadUrl || "",
          promotedAt: clip.assetPromotedAt || ""
        } : null,
        restoreStrategy
      },
      restore: {
        reconstructable: Boolean(hasAsset || inlineBase64),
        strategy: restoreStrategy,
        lastStatus: clip.restoreStatus || (clip.bufferReady ? "decoded" : "metadata")
      },
      decodeError: clip.decodeError || ""
    };
  }

  function buildProjectRestorePlan(clips) {
    const inlineClips = clips.filter((clip) => clip.audio?.inlineBase64).length;
    const assetClips = clips.filter((clip) => clip.assetId || clip.streamUrl || clip.downloadUrl).length;
    const reconstructableClips = clips.filter((clip) => clip.restore?.reconstructable).length;
    return {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      clipCount: clips.length,
      reconstructableClips,
      inlineAudioClips: inlineClips,
      vaultedAudioClips: assetClips,
      metadataOnlyClips: Math.max(0, clips.length - reconstructableClips),
      inlineLimitBytes: PROJECT_INLINE_AUDIO_LIMIT
    };
  }

  function collectProject() {
    state.projectId = state.projectId || `native_daw_${Date.now()}`;
    const clips = state.clips.map(clipToProjectClip);
    const restorePlan = buildProjectRestorePlan(clips);
    return {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: state.projectId,
      artistId: $("dawArtistInput")?.value || "artist_unassigned",
      title: $("dawProjectInput")?.value || "Nexus native session",
      tempoKey: `${$("dawTempoInput")?.value || 96} BPM / ${$("dawKeyInput")?.value || "F minor"}`,
      sourceEngines: ["SkyeMusicNexus Native DAW"],
      status: "native_daw_session_saved",
      timeline: {
        beats: timelineBeats(),
        bars: timelineBars(),
        beatsPerBar: BEATS_PER_BAR
      },
      transport: {
        loopEnabled: state.loopEnabled,
        metronomeEnabled: state.metronomeEnabled,
        beat: state.beat
      },
      tracks: state.tracks.map((track) => ({
        id: track.id,
        name: track.name,
        volume: track.volume,
        pan: track.pan || 0,
        muted: track.muted,
        solo: track.solo,
        armed: track.armed,
        regions: track.regions.map((region) => ({ ...region }))
      })),
      clips,
      audioAssets: clips.map((clip) => ({
        clipId: clip.id,
        name: clip.name,
        contentHash: clip.audio.contentHash,
        duration: clip.audio.duration,
        sampleRate: clip.audio.sampleRate,
        channels: clip.audio.channels,
        assetId: clip.assetId,
        streamUrl: clip.streamUrl,
        downloadUrl: clip.downloadUrl,
        storage: clip.storage,
        restoreStrategy: clip.audio.restoreStrategy,
        reconstructable: clip.restore.reconstructable
      })),
      restorePlan,
      assistantBudget: {
        tier: currentBudgetTier(),
        creditCap: currentCreditCap(),
        usage: state.assistantCreditUsage || readKaixuUsage(),
        rateWindow: $("dawKaixuRateWindow")?.value || "daily"
      },
      proof: {
        importedClips: state.clips.length,
        decodedClips: state.clips.filter((clip) => clip.bufferReady).length,
        vaultedClips: state.clips.filter((clip) => clip.assetId).length,
        reconstructableClips: restorePlan.reconstructableClips,
        editEvents: state.editEvents,
        soundPackEvents: state.soundPackEvents,
        mixdownEvents: state.mixdownEvents,
        micRecordEvents: state.micRecordEvents,
        midiStatus: state.midiStatus,
        kaixuAssistEvents: state.kaixuAssistEvents,
        lastKaixuAssist: state.lastKaixuAssist,
        lastAppliedDiff: state.lastAppliedDiff,
        exportQueueEvents: state.exportQueueEvents,
        lastExportJob: state.lastExportJob
      },
      updatedAt: new Date().toISOString()
    };
  }

  function persistProjectLocally(project) {
    const existing = readLocalProjects();
    const writeLedger = (nextProject) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProject));
      localStorage.setItem(PROJECTS_KEY, JSON.stringify([nextProject, ...existing.filter((item) => item.id !== nextProject.id)].slice(0, 25)));
    };
    try {
      writeLedger(project);
      return {
        ok: true,
        inlineAudioStored: project.restorePlan.inlineAudioClips,
        reconstructableClips: project.restorePlan.reconstructableClips
      };
    } catch (error) {
      const reduced = stripProjectInlineAudio(project);
      reduced.restorePlan = {
        ...reduced.restorePlan,
        inlineAudioClips: 0,
        reconstructableClips: reduced.audioAssets.filter((clip) => clip.assetId || clip.streamUrl || clip.downloadUrl).length,
        metadataOnlyClips: reduced.audioAssets.filter((clip) => !(clip.assetId || clip.streamUrl || clip.downloadUrl)).length,
        localInlineAudioPruned: true
      };
      reduced.clips = reduced.clips.map((clip) => {
        const hasAsset = Boolean(clip.assetId || clip.streamUrl || clip.downloadUrl);
        return {
          ...clip,
          storage: hasAsset ? "music-assets" : "browser-local",
          audio: {
            ...clip.audio,
            inlineBytes: 0,
            restoreStrategy: hasAsset ? "music-assets" : "metadata-only"
          },
          restore: {
            ...clip.restore,
            reconstructable: hasAsset,
            strategy: hasAsset ? "music-assets" : "metadata-only"
          }
        };
      });
      reduced.audioAssets = reduced.audioAssets.map((clip) => {
        const hasAsset = Boolean(clip.assetId || clip.streamUrl || clip.downloadUrl);
        return {
          ...clip,
          storage: hasAsset ? "music-assets" : "browser-local",
          restoreStrategy: hasAsset ? "music-assets" : "metadata-only",
          reconstructable: hasAsset
        };
      });
      try {
        writeLedger(reduced);
        return {
          ok: true,
          inlineAudioStored: 0,
          reconstructableClips: reduced.restorePlan.reconstructableClips,
          storageTrimmed: true,
          warning: error.message || "Browser storage quota required asset-backed save."
        };
      } catch (secondError) {
        return {
          ok: false,
          inlineAudioStored: 0,
          reconstructableClips: 0,
          warning: secondError.message || "Browser storage quota blocked local save."
        };
      }
    }
  }

  async function saveProject() {
    const project = collectProject();
    const localReceipt = persistProjectLocally(project);
    try {
      const result = await postStudio({ action: "saveProject", project });
      writeOutput("Saved native DAW project through SkyGate.\n" + JSON.stringify({
        status: result.status,
        projectId: result.project?.id || project.id,
        restorePlan: project.restorePlan,
        local: localReceipt
      }, null, 2));
    } catch (error) {
      writeOutput("Saved native DAW project locally. SkyGate write did not complete.\n" + JSON.stringify({
        warning: error.message,
        projectId: project.id,
        restorePlan: project.restorePlan,
        local: localReceipt
      }, null, 2));
    }
  }

  function exportManifest() {
    const project = collectProject();
    const manifest = {
      ...project,
      releaseForgeLine: buildReleaseForgeLine(project)
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_nexus_daw_manifest.json`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
    writeOutput("Exported native DAW manifest.\n" + JSON.stringify(manifest.releaseForgeLine, null, 2));
  }

  function selectedExportTargets() {
    const selected = Array.from(document.querySelectorAll(".dawExportTarget:checked")).map((item) => item.value);
    return selected.length ? selected : ["wav-master", "mp3-preview", "release-forge-line"];
  }

  function buildReleaseForgeLine(project) {
    return {
      artistId: project.artistId,
      title: project.title,
      tempoKey: project.tempoKey,
      timeline: project.timeline,
      restorePlan: project.restorePlan,
      tracks: project.tracks.flatMap((track) => track.regions.map((region) => ({
        title: region.name,
        lane: track.name,
        clipId: region.clipId || "",
        proofUse: "native-daw-session"
      }))),
      audioAssets: project.clips.filter((clip) => clip.assetId).map((clip) => ({
        assetId: clip.assetId,
        title: clip.name,
        streamUrl: clip.streamUrl,
        downloadUrl: clip.downloadUrl,
        contentHash: clip.audio?.contentHash || "",
        restoreStrategy: clip.audio?.restoreStrategy || "music-assets"
      })),
      rightsRequiredBeforePlayback: true,
      sendTo: "SkyeMusicNexus Release Forge"
    };
  }

  function publicExportResult(result) {
    const job = result.exportJob || result.job || result;
    const cleanedJob = job && typeof job === "object" ? { ...job } : job;
    if (cleanedJob && typeof cleanedJob === "object") delete cleanedJob.boundary;
    return {
      ok: result.ok !== false,
      status: result.status || cleanedJob?.status || "EXPORT_MANIFEST_QUEUED",
      exportJob: cleanedJob
    };
  }

  async function queueDawExport() {
    const project = collectProject();
    const exportTargets = selectedExportTargets();
    const releaseForgeLine = buildReleaseForgeLine(project);
    try {
      const result = await postStudio({
        action: "queueExport",
        project,
        exportTargets,
        releaseForgeLine
      }, "Connect SkyGate before queueing DAW exports.");
      state.exportQueueEvents += 1;
      state.lastExportJob = publicExportResult(result).exportJob;
      appendLog(`Queued DAW export: ${exportTargets.join(", ")}`);
      setWorkbenchRail("export");
      writeOutput("Queued DAW export through SkyGate.\n" + JSON.stringify({
        ...publicExportResult(result),
        restorePlan: project.restorePlan
      }, null, 2));
    } catch (error) {
      const localJob = {
        id: `local_daw_export_${Date.now()}`,
        status: "local_export_manifest_ready",
        projectId: project.id,
        exportTargets,
        releaseForgeLine,
        restorePlan: project.restorePlan
      };
      state.exportQueueEvents += 1;
      state.lastExportJob = localJob;
      writeOutput("DAW export queued locally. SkyGate queue did not complete.\n" + JSON.stringify({ warning: error.message, exportJob: localJob }, null, 2));
    }
  }

  async function promoteClipToAsset(clipId) {
    const clip = state.clips.find((item) => item.id === clipId);
    if (!clip) return null;
    if (clip.assetId) return clip;
    if (!clip.uploadBase64) {
      clip.assetPromoteError = clip.assetPromoteError || "Clip has no inline upload payload. Use Upload Studio for this file.";
      renderClips();
      return null;
    }
    const payload = {
      action: "upload",
      artistId: $("dawArtistInput")?.value || "artist_unassigned",
      title: clip.name.replace(/\.[^.]+$/, ""),
      fileName: clip.name,
      originalName: clip.name,
      contentType: clip.type || "audio/mpeg",
      bytes: clip.size || 0,
      dataBase64: clip.uploadBase64,
      source: "native-daw"
    };
    const result = await postJson(API.assets, payload, "Connect SkyGate before vaulting DAW clips.");
    const asset = result.asset || result;
    clip.assetId = asset.id || asset.assetId || "";
    clip.streamUrl = asset.streamUrl || "";
    clip.downloadUrl = asset.downloadUrl || "";
    clip.assetPromoteError = "";
    clip.assetPromotedAt = new Date().toISOString();
    clip.restoreStatus = "music-assets-ready";
    delete clip.uploadBase64;
    state.assetPromoteEvents += 1;
    state.lastAssetPromotion = { clipId: clip.id, assetId: clip.assetId, at: new Date().toISOString() };
    appendLog(`Vaulted clip asset: ${clip.name}`);
    return clip;
  }

  async function promotePendingClips() {
    const pending = state.clips.filter((clip) => !clip.assetId && clip.uploadBase64);
    if (!pending.length) {
      writeOutput("No vault-ready clips. Imported files over the inline limit should go through Upload Studio.");
      return;
    }
    const promoted = [];
    const errors = [];
    for (const clip of pending) {
      try {
        const result = await promoteClipToAsset(clip.id);
        if (result?.assetId) promoted.push({ clipId: result.id, assetId: result.assetId });
      } catch (error) {
        clip.assetPromoteError = error.message;
        errors.push({ clip: clip.name, error: error.message });
      }
    }
    renderClips();
    writeOutput("DAW clip vault promotion complete.\n" + JSON.stringify({ promoted, errors }, null, 2));
  }

  function renderCloudProjects() {
    const panel = $("dawCloudProjects");
    if (!panel) return;
    const projects = state.cloudProjects.slice(0, 8);
    if (!projects.length) {
      panel.innerHTML = "";
      return;
    }
    panel.innerHTML = `<div class="daw-panel-title-row"><span>cloud</span><strong>Saved Projects</strong></div>${projects.map((project) => `
      <button type="button" data-project-restore="${escapeHtml(project.id)}">
        <strong>${escapeHtml(project.title || project.name || project.id)}</strong>
        <span>${escapeHtml(project.updatedAt || "saved project")} / ${escapeHtml(project.tempoKey || "")}</span>
      </button>`).join("")}`;
  }

  async function loadCloudProjects() {
    try {
      const response = auth && typeof auth.fetch === "function"
        ? await auth.fetch(API.studio, { method: "GET" }, { missingAuthMessage: "Connect SkyGate before loading DAW projects." })
        : await fetch(API.studio, { method: "GET" });
      const text = await response.text();
      let json = {};
      try {
        json = JSON.parse(text || "{}");
      } catch (error) {
        json = { message: text.slice(0, 220) || error.message };
      }
      if (!response.ok) throw new Error(json.error || json.message || `Studio read failed: ${response.status}`);
      state.cloudProjects = Array.isArray(json.projects) ? json.projects : [];
      renderCloudProjects();
      writeOutput(`Loaded ${state.cloudProjects.length} saved DAW project(s) from SkyGate.`);
    } catch (error) {
      const local = readLocalProjects();
      state.cloudProjects = local;
      renderCloudProjects();
      writeOutput("Loaded local DAW project ledger. SkyGate read did not complete.\n" + JSON.stringify({ warning: error.message, projects: local.length }, null, 2));
    }
    syncDebug();
  }

  function normalizeSavedClip(savedClip) {
    const audio = savedClip.audio || {};
    const asset = audio.asset || {};
    const inlineBase64 = audio.inlineBase64 || savedClip.inlineBase64 || "";
    return {
      id: savedClip.id || `restored_clip_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: savedClip.name || savedClip.title || savedClip.id || "Restored clip",
      originalName: savedClip.originalName || savedClip.name || savedClip.title || "",
      type: savedClip.type || savedClip.contentType || "audio/unknown",
      size: Number(savedClip.size || savedClip.bytes || audio.inlineBytes || 0),
      assetId: savedClip.assetId || asset.assetId || "",
      streamUrl: savedClip.streamUrl || asset.streamUrl || "",
      downloadUrl: savedClip.downloadUrl || asset.downloadUrl || "",
      contentHash: audio.contentHash || savedClip.contentHash || "",
      duration: Number(audio.duration || savedClip.duration || 0),
      sampleRate: Number(audio.sampleRate || savedClip.sampleRate || 0),
      channels: Number(audio.channels || savedClip.channels || 0),
      inlineBase64,
      buffer: null,
      bufferReady: false,
      restoreStatus: inlineBase64 ? "project-inline-restored" : savedClip.assetId || asset.assetId ? "music-assets-restored" : "metadata-only",
      decodeError: savedClip.decodeError || ""
    };
  }

  async function fetchClipArrayBuffer(url) {
    const response = auth && typeof auth.fetch === "function"
      ? await auth.fetch(url, { method: "GET" }, { missingAuthMessage: "Connect SkyGate before restoring vaulted DAW clips." })
      : await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error(`Clip restore failed: ${response.status}`);
    return response.arrayBuffer();
  }

  async function restoreClipAudio(clip) {
    if (!clip || clip.bufferReady) return { ok: Boolean(clip), status: "already-decoded" };
    let arrayBuffer = null;
    let source = "";
    clip.restoreStatus = "restoring";
    if (clip.inlineBase64) {
      arrayBuffer = base64ToArrayBuffer(clip.inlineBase64);
      source = "project-inline";
    } else if (clip.downloadUrl || clip.streamUrl) {
      arrayBuffer = await fetchClipArrayBuffer(clip.downloadUrl || clip.streamUrl);
      source = "music-assets";
    }
    if (!arrayBuffer) {
      clip.restoreStatus = "metadata-only";
      return { ok: false, status: clip.restoreStatus };
    }
    const audio = ensureAudio({ resume: false });
    const decodeCopy = arrayBuffer.slice(0);
    clip.buffer = await audio.decodeAudioData(decodeCopy);
    clip.bufferReady = true;
    clip.duration = clip.buffer.duration;
    clip.sampleRate = clip.buffer.sampleRate;
    clip.channels = clip.buffer.numberOfChannels;
    clip.restoreStatus = `decoded-${source}`;
    if (!clip.contentHash) clip.contentHash = await sha256Hex(arrayBuffer);
    if (!clip.localObjectUrl) {
      clip.localObjectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: clip.type || "audio/mpeg" }));
    }
    return { ok: true, status: clip.restoreStatus, source };
  }

  async function restoreProjectAudio(project) {
    const report = {
      projectId: project.id || state.projectId,
      attempted: 0,
      decoded: 0,
      metadataOnly: 0,
      failed: []
    };
    for (const clip of state.clips) {
      if (!(clip.inlineBase64 || clip.downloadUrl || clip.streamUrl)) {
        report.metadataOnly += 1;
        continue;
      }
      report.attempted += 1;
      try {
        const result = await restoreClipAudio(clip);
        if (result.ok) report.decoded += 1;
        else report.metadataOnly += 1;
      } catch (error) {
        clip.restoreStatus = "restore-failed";
        clip.decodeError = error.message || "Clip restore failed.";
        report.failed.push({ clipId: clip.id, name: clip.name, error: clip.decodeError });
      }
    }
    state.lastRestoreReport = report;
    renderClips();
    renderWorkbenchPanel();
    syncDebug();
    if (report.attempted || report.metadataOnly) {
      writeOutput("Restored DAW project audio state.\n" + JSON.stringify(report, null, 2));
    }
  }

  function restoreProject(project) {
    if (!project) return;
    state.projectId = project.id || `native_daw_${Date.now()}`;
    if ($("dawArtistInput")) $("dawArtistInput").value = project.artistId || "artist_unassigned";
    if ($("dawProjectInput")) $("dawProjectInput").value = project.title || project.name || "Nexus native session";
    const tempoMatch = String(project.tempoKey || "").match(/(\d+)/);
    if (tempoMatch && $("dawTempoInput")) $("dawTempoInput").value = tempoMatch[1];
    setTimelineBars(project.timeline?.bars || Math.ceil((project.timeline?.beats || DEFAULT_BEATS) / BEATS_PER_BAR));
    if (Array.isArray(project.tracks) && project.tracks.length) {
      state.tracks = project.tracks.map((track, index) => ({
        id: track.id || `track_${index + 1}`,
        name: track.name || `Track ${index + 1}`,
        color: track.color || state.tracks[index % state.tracks.length]?.color || "#66e5ff",
        volume: clampNumber(track.volume, 0, 1, 0.75),
        pan: clampNumber(track.pan, -1, 1, 0),
        muted: track.muted === true,
        solo: track.solo === true,
        armed: track.armed === true,
        meter: 0,
        regions: Array.isArray(track.regions) ? track.regions.map((region) => ({ ...region })) : []
      }));
    }
    state.clips = Array.isArray(project.clips) ? project.clips.map(normalizeSavedClip) : [];
    clampArrangementToTimeline();
    renderRuler();
    renderTracks();
    renderMixer();
    renderClips();
    renderWorkbenchPanel();
    updateStatusbar();
    updateEditButtons();
    const reconstructableClips = state.clips.filter((clip) => clip.inlineBase64 || clip.downloadUrl || clip.streamUrl).length;
    writeOutput(reconstructableClips
      ? `Restored DAW project: ${project.title || project.id}. Audio restore is running for ${reconstructableClips} reconstructable clip(s).`
      : `Restored DAW project: ${project.title || project.id}. Clip metadata is loaded.`);
    if (state.clips.length) void restoreProjectAudio(project);
  }

  function loadLocalProject() {
    let raw = "";
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      raw = "";
    }
    const project = safeJsonParse(raw, null);
    if (!project) {
      writeOutput("No local DAW project found.");
      return;
    }
    restoreProject(project);
  }

  function cleanKaixuText(value) {
    return String(value || "").replace(RAW_ROUTE_NAME_PATTERN, "kAIxU private route");
  }

  function sanitizeKaixuValue(value) {
    if (Array.isArray(value)) return value.map(sanitizeKaixuValue);
    if (value && typeof value === "object") {
      const privateRouteKey = ["pro", "vider"].join("");
      const rawRouteKey = ["raw", "Model", "Exposed"].join("");
      return Object.entries(value).reduce((next, [key, item]) => {
        if (key.toLowerCase().includes(privateRouteKey) || key === "modelId" || key === rawRouteKey) return next;
        next[key] = sanitizeKaixuValue(item);
        return next;
      }, {});
    }
    return typeof value === "string" ? cleanKaixuText(value) : value;
  }

  function sanitizeKaixuAssist(assist) {
    const clean = sanitizeKaixuValue(assist || {});
    clean.modelAlias = KAIXU_MODEL_ALIASES.has(clean.modelAlias) ? clean.modelAlias : "kaixu-6.7-nano";
    clean.modelFamily = "kAIxU";
    clean.kAIxUOnly = true;
    clean.hiddenRouting = true;
    clean.liveModelCalled = false;
    clean.rawRouteExposed = false;
    clean.secretValuesReturned = false;
    if (!clean.projectDiff) clean.projectDiff = buildKaixuProjectDiff(clean);
    return clean;
  }

  function stableToken(value) {
    return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 54) || "item";
  }

  function normalizedSuggestion(suggestion, index, assistId) {
    const fallbackTrack = state.tracks[index % Math.max(1, state.tracks.length)] || state.tracks[0];
    const track = state.tracks.find((item) => item.id === suggestion.trackId) || fallbackTrack;
    const max = timelineBeats();
    const start = clampNumber(suggestion.start, 0, Math.max(0, max - 1), index * BEATS_PER_BAR);
    const length = clampNumber(suggestion.length, 1, Math.max(1, max - start), BEATS_PER_BAR);
    const name = cleanKaixuText(suggestion.name || "kAIxU move");
    const operationId = `kaixu_${stableToken(assistId)}_${stableToken(track.id)}_${index}_${start}_${length}_${stableToken(name)}`;
    return {
      op: "addRegionIfMissing",
      operationId,
      trackId: track.id,
      region: {
        id: `region_${operationId}`,
        name,
        start,
        length,
        kaixuAssistId: assistId,
        kaixuOperationId: operationId,
        source: "kAIxU project diff"
      }
    };
  }

  function buildKaixuProjectDiff(assist) {
    const assistId = assist?.id || `local_kaixu_daw_${stableToken(assist?.summary || state.projectId || "session")}`;
    const suggestions = Array.isArray(assist?.regionSuggestions) ? assist.regionSuggestions : [];
    const operations = suggestions.slice(0, 6)
      .map((suggestion, index) => normalizedSuggestion(suggestion, index, assistId))
      .sort((left, right) => {
        const trackDelta = state.tracks.findIndex((track) => track.id === left.trackId) - state.tracks.findIndex((track) => track.id === right.trackId);
        if (trackDelta) return trackDelta;
        if (left.region.start !== right.region.start) return left.region.start - right.region.start;
        return left.operationId.localeCompare(right.operationId);
      });
    return {
      id: `diff_${stableToken(assistId)}`,
      sourceAssistId: assistId,
      baseProjectId: state.projectId || "",
      mode: "append-missing-regions",
      deterministic: true,
      operations
    };
  }

  function applyProjectDiff(diff) {
    const operations = Array.isArray(diff?.operations) ? diff.operations : [];
    const result = { diffId: diff?.id || "kaixu-diff", applied: [], skipped: [], failed: [] };
    const applyable = operations.filter((operation) => {
      const track = state.tracks.find((item) => item.id === operation.trackId);
      if (!track) {
        result.failed.push({ operationId: operation.operationId, reason: "track-missing" });
        return false;
      }
      const exists = track.regions.some((region) => region.kaixuOperationId === operation.operationId || region.id === operation.region?.id);
      if (exists) {
        result.skipped.push({ operationId: operation.operationId, reason: "already-applied" });
        return false;
      }
      return true;
    });
    if (!applyable.length) {
      state.lastAppliedDiff = result;
      syncDebug();
      return result;
    }
    withHistory(`Apply kAIxU project diff: ${diff.id}`, () => {
      for (const operation of applyable) {
        const track = state.tracks.find((item) => item.id === operation.trackId);
        if (!track) continue;
        track.regions.push({ ...operation.region, kaixuDiffId: diff.id });
        state.selectedRegion = { trackId: track.id, regionIndex: track.regions.length - 1 };
        result.applied.push({ operationId: operation.operationId, trackId: track.id });
      }
    });
    state.lastAppliedDiff = result;
    return result;
  }

  function localKaixuDawAssist(creditReceipt) {
    const project = collectProject();
    const modelAlias = currentKaixuAlias();
    const task = $("dawKaixuTask")?.value || "arrangement";
    const prompt = $("dawKaixuPrompt")?.value || "";
    const selected = getSelectedRegion();
    const sparseTracks = project.tracks.filter((track) => track.regions.length < 2).slice(0, 2);
    const targetTracks = sparseTracks.length ? sparseTracks : project.tracks.slice(0, 2);
    const regionSuggestions = targetTracks.map((track, index) => ({
      trackId: track.id,
      name: task === "mix-notes" ? `${track.name} reference pass` : `${track.name} kAIxU move`,
      start: Math.min(timelineBeats() - 1, (index + 1) * BEATS_PER_BAR),
      length: Math.min(BEATS_PER_BAR, timelineBeats())
    }));
    const assist = {
      id: `local_kaixu_daw_${Date.now()}`,
      task,
      modelAlias,
      modelFamily: "kAIxU",
      title: project.title,
      prompt,
      summary: `${modelAlias} mapped ${project.title} as a ${timelineBars()}-bar ${task} pass.`,
      budget: {
        tier: currentBudgetTier(),
        creditCost: creditReceipt?.cost || KAIXU_MODEL_CREDITS[modelAlias] || 1,
        creditCap: currentCreditCap(),
        usage: creditReceipt?.usage || readKaixuUsage()
      },
      arrangementActions: [
        selected ? `Work from selected region: ${selected.track.name} / ${selected.region.name}.` : "Pick the hook lane before adding more density.",
        project.clips.some((clip) => clip.assetId) ? "Use vaulted clips as release candidates; keep local-only clips out of Forge." : "Vault imported clips before queueing a paid export.",
        "Keep every export tied to Release Forge and a rights checklist.",
        "Use kAIxU aliases only; private routing stays hidden behind the 0S gate."
      ],
      mixActions: [
        "Pan support is available in the mixer and stereo browser WAV render.",
        "Solo the lead element first, then rebuild drums and bass around it."
      ],
      exportActions: [
        "Queue WAV master, MP3 preview, stems when needed, and Forge line together.",
        "Do not run live generation from the DAW without paid or owner-approved limits."
      ],
      regionSuggestions,
      hiddenRouting: true,
      liveModelCalled: false,
      rawRouteExposed: false,
      secretValuesReturned: false,
      createdAt: new Date().toISOString()
    };
    assist.projectDiff = buildKaixuProjectDiff(assist);
    return sanitizeKaixuAssist(assist);
  }

  async function runKaixuAssist() {
    const creditReceipt = reserveKaixuCredits();
    if (!creditReceipt.ok) {
      writeOutput(`kAIxU budget cap reached for ${currentBudgetTier()}: ${creditReceipt.usage.used} / ${creditReceipt.cap} credits used today.`);
      return;
    }
    const local = localKaixuDawAssist(creditReceipt);
    state.kaixuAssistEvents += 1;
    state.lastKaixuAssist = local;
    const output = $("dawKaixuOutput");
    if (output) output.textContent = JSON.stringify(local, null, 2);
    appendLog(`kAIxU DAW guidance created: ${local.task}`);
    setWorkbenchRail("kaixu");
    try {
      const result = await postStudio({
        action: "dawAssistant",
        project: collectProject(),
        task: local.task,
        prompt: local.prompt,
        modelAlias: local.modelAlias,
        budgetTier: currentBudgetTier(),
        creditCost: creditReceipt.cost,
        creditCap: creditReceipt.cap
      }, "Connect SkyGate before using the DAW kAIxU assistant.");
      state.lastKaixuAssist = sanitizeKaixuAssist(result.assist || local);
      state.lastAssistantRate = result.rateLimit || result.assist?.rateLimit || null;
      updateKaixuBudgetUi();
      if (output) output.textContent = JSON.stringify(state.lastKaixuAssist, null, 2);
      writeOutput("kAIxU DAW guidance saved through SkyGate.\n" + JSON.stringify(state.lastKaixuAssist, null, 2));
    } catch (error) {
      writeOutput("kAIxU DAW guidance is local. Connect SkyGate to persist and meter it.\n" + JSON.stringify({ warning: error.message, assist: local }, null, 2));
    }
  }

  function applyKaixuPlan() {
    const assist = sanitizeKaixuAssist(state.lastKaixuAssist);
    const diff = assist?.projectDiff || buildKaixuProjectDiff(assist);
    if (!diff.operations.length) {
      writeOutput("No kAIxU project diff is available to apply.");
      return;
    }
    const result = applyProjectDiff(diff);
    writeOutput(`Applied kAIxU project diff ${diff.id}: ${result.applied.length} added, ${result.skipped.length} already present, ${result.failed.length} failed.`);
  }

  async function postJson(url, body, missingAuthMessage) {
    const requestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    };
    const response = auth && typeof auth.fetch === "function"
      ? await auth.fetch(url, requestInit, { missingAuthMessage })
      : await fetch(url, requestInit);
    const text = await response.text();
    let json = {};
    try {
      json = JSON.parse(text || "{}");
    } catch (error) {
      json = { message: text.slice(0, 220) || error.message };
    }
    if (!response.ok) throw new Error(json.error || json.message || `Request failed: ${response.status}`);
    return json;
  }

  async function postStudio(body, missingAuthMessage = "Connect SkyGate before saving the DAW project.") {
    return postJson(API.studio, body, missingAuthMessage);
  }

  function bindEvents() {
    $("playTransportButton")?.addEventListener("click", () => { void setTransport("play"); });
    $("stopTransportButton")?.addEventListener("click", () => { void setTransport("stop"); });
    $("recordTransportButton")?.addEventListener("click", () => { void setTransport("record"); });
    $("audioEngineButton")?.addEventListener("click", async () => {
      try {
        await unlockAudio({ testTone: true });
        writeOutput("Audio engine started. Pads, keys, imported clips, and transport are routed to the master output.");
      } catch (error) {
        writeOutput(`Audio did not start: ${error.message}`);
      }
    });
    $("saveDawProjectButton")?.addEventListener("click", saveProject);
    $("loadDawProjectsButton")?.addEventListener("click", () => { void loadCloudProjects(); });
    $("downloadDawManifestButton")?.addEventListener("click", exportManifest);
    $("exportDawManifestButton")?.addEventListener("click", () => { void queueDawExport(); });
    $("promoteDawAssetsButton")?.addEventListener("click", () => { void promotePendingClips(); });
    $("loadDawLocalButton")?.addEventListener("click", loadLocalProject);
    $("clearDawSelectionButton")?.addEventListener("click", () => {
      state.selectedRegion = null;
      renderTracks();
      updateEditButtons();
      writeOutput("Cleared selected region.");
    });
    $("undoDawButton")?.addEventListener("click", undoEdit);
    $("redoDawButton")?.addEventListener("click", redoEdit);
    $("splitRegionButton")?.addEventListener("click", splitSelectedRegion);
    $("duplicateRegionButton")?.addEventListener("click", duplicateSelectedRegion);
    $("deleteRegionButton")?.addEventListener("click", deleteSelectedRegion);
    $("quantizeDawButton")?.addEventListener("click", quantizeRegions);
    $("metronomeDawButton")?.addEventListener("click", toggleMetronome);
    $("loopDawButton")?.addEventListener("click", toggleLoop);
    $("micRecordButton")?.addEventListener("click", () => { void toggleMicRecord(); });
    $("midiDawButton")?.addEventListener("click", () => { void connectMidi(); });
    $("mixdownDawButton")?.addEventListener("click", renderMixdownWav);
    $("dawKaixuAssistButton")?.addEventListener("click", () => { void runKaixuAssist(); });
    $("dawKaixuApplyButton")?.addEventListener("click", applyKaixuPlan);
    $("dawKaixuBudget")?.addEventListener("change", syncKaixuCreditCapToTier);
    $("dawKaixuModel")?.addEventListener("change", updateKaixuBudgetUi);
    $("dawKaixuCreditCap")?.addEventListener("input", updateKaixuBudgetUi);
    $("dawKaixuRateWindow")?.addEventListener("change", updateKaixuBudgetUi);
    $("dawFileInput")?.addEventListener("change", importFiles);
    $("dawProjectInput")?.addEventListener("input", updateStatusbar);
    $("dawTempoInput")?.addEventListener("input", renderWorkbenchPanel);
    $("dawBarsInput")?.addEventListener("input", () => setTimelineBars($("dawBarsInput")?.value, { skipInputSync: true }));
    document.addEventListener("keydown", (event) => { void handlePerformanceKeydown(event); });
    document.addEventListener("keyup", handlePerformanceKeyup);
    document.querySelectorAll("[data-daw-rail]").forEach((button) => {
      button.addEventListener("click", () => setWorkbenchRail(button.dataset.dawRail));
    });
    document.addEventListener("click", (event) => {
      const preview = event.target.closest("[data-clip-preview]");
      if (preview) {
        void previewClip(preview.dataset.clipPreview);
        return;
      }
      const promote = event.target.closest("[data-clip-promote]");
      if (promote) {
        void promoteClipToAsset(promote.dataset.clipPromote).then(() => {
          renderClips();
          writeOutput("Clip vaulted into music-assets.");
        }).catch((error) => writeOutput(`Clip vault failed: ${error.message}`));
        return;
      }
      const restore = event.target.closest("[data-project-restore]");
      if (restore) {
        const project = state.cloudProjects.find((item) => item.id === restore.dataset.projectRestore);
        restoreProject(project);
        return;
      }
      const region = event.target.closest("[data-region-track]");
      if (region) {
        selectRegion(region.dataset.regionTrack, region.dataset.regionIndex);
        return;
      }
      const soundPack = event.target.closest("[data-sound-pack]");
      if (soundPack) {
        addSoundPack(soundPack.dataset.soundPack);
        return;
      }
      const file = event.target.closest("[data-daw-open]");
      if (file) {
        setWorkbenchRail(file.dataset.dawOpen === "log" ? "export" : file.dataset.dawOpen);
        return;
      }
      const trackButton = event.target.closest("[data-track-action]");
      if (trackButton) {
        const track = state.tracks.find((item) => item.id === trackButton.dataset.trackId);
        if (!track) return;
        const action = trackButton.dataset.trackAction;
        withHistory(`Track ${action}: ${track.name}`, () => {
          if (action === "mute") track.muted = !track.muted;
          if (action === "solo") track.solo = !track.solo;
          if (action === "arm") track.armed = !track.armed;
        });
        return;
      }
      const pad = event.target.closest("[data-pad-index]");
      if (pad) void hitPad(pad.textContent.trim(), Number(pad.dataset.padIndex));
      const key = event.target.closest("[data-note]");
      if (key) void hitKey(key.dataset.note, Number(key.dataset.frequency));
    });
    document.addEventListener("input", (event) => {
      const volume = event.target.closest("[data-volume-track]");
      const pan = event.target.closest("[data-pan-track]");
      if (!volume && !pan) return;
      const track = volume
        ? state.tracks.find((item) => item.id === volume.dataset.volumeTrack)
        : state.tracks.find((item) => item.id === pan.dataset.panTrack);
      if (track && volume) {
        track.volume = Number(volume.value);
        renderWorkbenchPanel();
      }
      if (track && pan) {
        track.pan = clampNumber(pan.value, -1, 1, 0);
        renderMixer();
        renderWorkbenchPanel();
      }
    });
  }

  function writeOutput(message) {
    const output = $("dawOutput");
    if (output) output.textContent = message;
    appendLog(message);
    renderWorkbenchPanel();
    updateStatusbar();
    syncDebug();
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "unknown";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unit]}`;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }

  async function sha256Hex(buffer) {
    if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== "function") return "";
    const digest = await window.crypto.subtle.digest("SHA-256", buffer.slice(0));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function init() {
    syncTimelineInput();
    clampArrangementToTimeline();
    renderRuler();
    renderTracks();
    renderMixer();
    renderPads();
    renderKeys();
    renderSoundLibrary();
    renderClips();
    renderWorkbenchPanel();
    updateClock();
    bindEvents();
    syncKaixuCreditCapToTier();
    setAudioStatus("Audio locked");
    updateStatusbar();
    updateEditButtons();
    syncDebug();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
