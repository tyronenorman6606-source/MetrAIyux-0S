(function () {
  "use strict";

  const STORAGE_KEY = "skyeMusicNexusNativeDawProject";
  const PROJECTS_KEY = "skyeMusicNexusNativeDawProjects";
  const API = { studio: "/.netlify/functions/music-studio" };

  const auth = window.createSkyGateAuth
    ? window.createSkyGateAuth({ storageKey: "skye_music_nexus_session" })
    : null;

  const keyboardNoteCodes = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK"];
  const padKeyCodes = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8"];
  const octaveCodes = new Set(["KeyZ", "KeyX"]);
  const maxBeats = 16;
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
      { id: "drums", name: "Drums", color: "#f5c76b", volume: 0.88, muted: false, solo: false, armed: false, meter: 0.2, regions: [{ name: "Kick pattern", start: 0, length: 4 }, { name: "Hat lift", start: 8, length: 4 }] },
      { id: "bass", name: "808 Bass", color: "#66e5ff", volume: 0.74, muted: false, solo: false, armed: false, meter: 0.3, regions: [{ name: "Sub hook", start: 4, length: 6 }] },
      { id: "keys", name: "Keys", color: "#bd8cff", volume: 0.7, muted: false, solo: false, armed: false, meter: 0.15, regions: [{ name: "Minor stack", start: 2, length: 8 }] },
      { id: "vocal", name: "Vocal", color: "#ff8f70", volume: 0.82, muted: false, solo: false, armed: true, meter: 0.1, regions: [{ name: "Hook take", start: 10, length: 5 }] },
      { id: "sample", name: "Sample", color: "#9dffbd", volume: 0.65, muted: false, solo: false, armed: false, meter: 0.18, regions: [{ name: "Texture chop", start: 6, length: 4 }] }
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
      clipCount: state.clips.length,
      decodedClipCount: state.clips.filter((clip) => clip.bufferReady).length,
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
    if (options.recordHistory) pushHistory(options.historyLabel || `Add ${name}`);
    const region = {
      name,
      start: state.beat % maxBeats,
      length: Math.max(1, Math.min(maxBeats, Number(length) || 1)),
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
        if (!state.loopEnabled && state.beat >= maxBeats - 1) state.beat = 0;
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
      if (!state.loopEnabled && state.beat >= maxBeats - 1) {
        state.playing = false;
        state.recording = false;
        state.timer = null;
        $("playTransportButton")?.classList.remove("is-active");
        $("recordTransportButton")?.classList.remove("is-active");
        writeOutput("Playback reached the end of the arrangement.");
        syncDebug();
        return;
      }
      state.beat = state.loopEnabled ? (state.beat + 1) % maxBeats : Math.min(maxBeats - 1, state.beat + 1);
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

  function playClip(clipId, volume = 1) {
    const clip = state.clips.find((item) => item.id === clipId);
    if (!clip || !clip.buffer) return false;
    const audio = ensureAudio();
    const source = audio.createBufferSource();
    const amp = audio.createGain();
    source.buffer = clip.buffer;
    amp.gain.setValueAtTime(Math.max(0.02, Math.min(0.9, volume * 0.82)), audio.currentTime);
    source.connect(amp).connect(outputNode(audio));
    source.start();
    markSound(`clip-${clip.name}`);
    return true;
  }

  async function previewClip(clipId) {
    const clip = state.clips.find((item) => item.id === clipId);
    if (!clip) return;
    try {
      await unlockAudio();
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
          if (startsNow) playClip(region.clipId, track.volume);
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
    ruler.innerHTML = Array.from({ length: maxBeats }, (_, index) => `<span>${index + 1}</span>`).join("");
  }

  function renderTracks() {
    const grid = $("dawTrackGrid");
    if (!grid) return;
    grid.innerHTML = state.tracks.map((track) => {
      const regions = track.regions.map((region, regionIndex) => {
        const start = Math.max(0, region.start) / maxBeats * 100;
        const width = Math.max(1, region.length) / maxBeats * 100;
        const selected = state.selectedRegion && state.selectedRegion.trackId === track.id && state.selectedRegion.regionIndex === regionIndex;
        return `<button type="button" class="daw-region ${selected ? "is-selected" : ""}" data-region-track="${track.id}" data-region-index="${regionIndex}" style="left:${start}%;width:${width}%;border-color:${track.color};"><span>${escapeHtml(region.name)}</span></button>`;
      }).join("");
      const playhead = `<div class="daw-playhead" style="left:${state.beat / maxBeats * 100}%"></div>`;
      return `<article class="daw-track-row" data-track="${track.id}">
        <div class="daw-track-label">
          <strong>${escapeHtml(track.name)}</strong>
          <div class="daw-track-controls">
            <button type="button" data-track-action="mute" data-track-id="${track.id}" class="${track.muted ? "is-on" : ""}">M</button>
            <button type="button" data-track-action="solo" data-track-id="${track.id}" class="${track.solo ? "is-on" : ""}">S</button>
            <button type="button" data-track-action="arm" data-track-id="${track.id}" class="${track.armed ? "is-on" : ""}">R</button>
          </div>
        </div>
        <div class="daw-lane">${regions}${playhead}</div>
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
      <span>${escapeHtml(clip.type)} - ${formatBytes(clip.size)} - ${clip.bufferReady ? "decoded" : clip.decodeError ? "decode failed" : "decoding"}</span>
      <button type="button" data-clip-preview="${escapeHtml(clip.id)}" ${clip.bufferReady || clip.localObjectUrl ? "" : "disabled"}>Preview Clip</button>
    </article>`).join("");
    renderWorkbenchPanel();
    updateStatusbar();
  }

  function buildWorkbenchFiles() {
    const regionCount = state.tracks.reduce((total, track) => total + track.regions.length, 0);
    return [
      { name: "session.nexus", detail: `${$("dawProjectInput")?.value || "Nexus native session"} / ${$("dawTempoInput")?.value || 96} BPM`, type: "session" },
      { name: "tracks.json", detail: `${state.tracks.length} tracks / ${regionCount} regions`, type: "tracks" },
      { name: "mixer.json", detail: `${state.tracks.filter((track) => track.solo).length} solo / ${state.tracks.filter((track) => track.muted).length} muted`, type: "mix" },
      { name: "clips.bin", detail: `${state.clips.length} imported / ${state.clips.filter((clip) => clip.bufferReady).length} decoded`, type: "clips" },
      { name: "edit-history.json", detail: `${state.history.length} undo / ${state.future.length} redo / ${state.editEvents} edits`, type: "tracks" },
      { name: "sound-packs.json", detail: `${soundLibrary.length} local packs / ${state.soundPackEvents} inserted`, type: "clips" },
      { name: "inputs.json", detail: `mic ${state.micRecordEvents} / midi ${state.midiStatus}`, type: "mix" },
      { name: "mixdown.wav", detail: `${state.mixdownEvents} rendered browser WAV exports`, type: "export" },
      { name: "release-forge.json", detail: "Release Forge handoff manifest", type: "export" },
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
      body.innerHTML = state.tracks.map((track) => fileRow({ name: `${track.name} channel`, detail: `${Math.round(track.volume * 100)}% volume / ${Math.round(track.meter * 100)}% meter`, type: "mix" })).join("");
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
      : ["session", "tracks", "clips", "mix", "export"].includes(nextRail) ? nextRail
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
      const start = Math.min(maxBeats - 1, selected.region.start + selected.region.length);
      const length = Math.max(1, Math.min(selected.region.length, maxBeats - start));
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
          region.start = Math.max(0, Math.min(maxBeats - 1, Math.round(Number(region.start) || 0)));
          region.length = Math.max(1, Math.min(maxBeats - region.start, Math.round(Number(region.length) || 1)));
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
      const baseStart = state.beat % maxBeats;
      pack.regions.forEach((name, index) => {
        const start = Math.min(maxBeats - 1, baseStart + index * Math.max(1, Math.floor(pack.length / Math.max(1, pack.regions.length))));
        track.regions.push({
          name,
          start,
          length: Math.max(1, Math.min(pack.length, maxBeats - start)),
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
    if (clips) clips.textContent = `${state.clips.length} clips`;
    if (save) save.textContent = state.commandLog.some((line) => line.includes("Saved native DAW project")) ? "Saved" : "Local session";
  }

  function readableKeyboardCode(code) {
    if (!code) return "";
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    if (code === "Space") return "Space";
    return code;
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
        type: file.type || "audio/unknown",
        size: file.size,
        localObjectUrl: URL.createObjectURL(file),
        buffer: null,
        bufferReady: false
      };
      state.clips.unshift(clip);
      addRegionToArmedTrack(file.name.replace(/\.[^.]+$/, ""), 4, { clipId: clip.id });
      try {
        const arrayBuffer = await file.arrayBuffer();
        clip.buffer = await audio.decodeAudioData(arrayBuffer.slice(0));
        clip.bufferReady = true;
      } catch (error) {
        clip.decodeError = error.message || "Clip decode failed.";
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

  function synthRegionIntoMix(mix, track, region, sampleRate, beatDuration) {
    const startSample = Math.floor(region.start * beatDuration * sampleRate);
    const durationSamples = Math.max(1, Math.floor(region.length * beatDuration * sampleRate));
    const base = track.id === "bass" ? 92 : track.id === "keys" ? 330 : track.id === "vocal" ? 440 : track.id === "sample" ? 220 : 120;
    for (let index = 0; index < durationSamples; index += 1) {
      const absolute = startSample + index;
      const beatPulse = Math.floor(index / Math.max(1, Math.floor(beatDuration * sampleRate)));
      const envelope = Math.min(1, index / 500, (durationSamples - index) / 1200);
      const wave = track.id === "drums"
        ? (beatPulse % 2 === 0 ? Math.sin(2 * Math.PI * 62 * (index / sampleRate)) : (Math.random() * 2 - 1) * 0.18)
        : Math.sin(2 * Math.PI * (base + beatPulse * 3) * (index / sampleRate));
      mixSample(mix, absolute, wave * envelope * track.volume * 0.16);
    }
  }

  function clipRegionIntoMix(mix, track, region, clip, sampleRate, beatDuration) {
    if (!clip || !clip.buffer) return false;
    const source = clip.buffer.getChannelData(0);
    const sourceRate = clip.buffer.sampleRate || sampleRate;
    const startSample = Math.floor(region.start * beatDuration * sampleRate);
    const maxSamples = Math.min(
      Math.floor(region.length * beatDuration * sampleRate),
      Math.floor(source.length * (sampleRate / sourceRate))
    );
    for (let index = 0; index < maxSamples; index += 1) {
      const sourceIndex = Math.min(source.length - 1, Math.floor(index * (sourceRate / sampleRate)));
      mixSample(mix, startSample + index, source[sourceIndex] * track.volume * 0.75);
    }
    return true;
  }

  function encodeWav(samples, sampleRate) {
    const dataBytes = samples.length * 2;
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
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataBytes, true);
    for (let index = 0; index < samples.length; index += 1) {
      view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, samples[index])) * 32767, true);
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
    const totalSamples = Math.ceil(maxBeats * beatDuration * sampleRate);
    const mix = new Float32Array(totalSamples);
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
    const blob = encodeWav(mix, sampleRate);
    const title = ($("dawProjectInput")?.value || "nexus_session").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    downloadBlob(blob, `${title}_mixdown.wav`);
    state.mixdownEvents += 1;
    writeOutput(`Rendered browser WAV mixdown: ${(blob.size / 1024 / 1024).toFixed(2)} MB.`);
  }

  async function finishMicRecording(recorder) {
    const blob = new Blob(state.micChunks, { type: recorder.mimeType || "audio/webm" });
    const clip = {
      id: `mic_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: `Mic take ${new Date().toLocaleTimeString()}`,
      type: blob.type || "audio/webm",
      size: blob.size,
      localObjectUrl: URL.createObjectURL(blob),
      buffer: null,
      bufferReady: false
    };
    state.clips.unshift(clip);
    pushHistory(`Record microphone: ${clip.name}`);
    addRegionToArmedTrack(clip.name, 4, { clipId: clip.id });
    try {
      const audio = ensureAudio({ resume: false });
      const arrayBuffer = await blob.arrayBuffer();
      clip.buffer = await audio.decodeAudioData(arrayBuffer.slice(0));
      clip.bufferReady = true;
    } catch (error) {
      clip.decodeError = error.message || "Mic clip decode failed.";
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

  function collectProject() {
    return {
      id: `native_daw_${Date.now()}`,
      artistId: $("dawArtistInput")?.value || "artist_unassigned",
      title: $("dawProjectInput")?.value || "Nexus native session",
      tempoKey: `${$("dawTempoInput")?.value || 96} BPM / ${$("dawKeyInput")?.value || "F minor"}`,
      sourceEngines: ["SkyeMusicNexus Native DAW"],
      status: "native_daw_session_saved",
      transport: {
        loopEnabled: state.loopEnabled,
        metronomeEnabled: state.metronomeEnabled,
        beat: state.beat
      },
      tracks: state.tracks.map((track) => ({
        id: track.id,
        name: track.name,
        volume: track.volume,
        muted: track.muted,
        solo: track.solo,
        armed: track.armed,
        regions: track.regions
      })),
      clips: state.clips.map((clip) => ({ id: clip.id, name: clip.name, type: clip.type, size: clip.size })),
      proof: {
        importedClips: state.clips.length,
        decodedClips: state.clips.filter((clip) => clip.bufferReady).length,
        editEvents: state.editEvents,
        soundPackEvents: state.soundPackEvents,
        mixdownEvents: state.mixdownEvents,
        micRecordEvents: state.micRecordEvents,
        midiStatus: state.midiStatus
      },
      updatedAt: new Date().toISOString()
    };
  }

  async function saveProject() {
    const project = collectProject();
    const existing = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([project, ...existing].slice(0, 25)));
    try {
      const result = await postStudio({ action: "saveProject", project });
      writeOutput("Saved native DAW project through SkyGate.\n" + JSON.stringify(result, null, 2));
    } catch (error) {
      writeOutput("Saved native DAW project locally. SkyGate write did not complete.\n" + JSON.stringify({ warning: error.message, project }, null, 2));
    }
  }

  function exportManifest() {
    const project = collectProject();
    const manifest = {
      ...project,
      releaseForgeLine: {
        artistId: project.artistId,
        title: project.title,
        tracks: project.tracks.flatMap((track) => track.regions.map((region) => ({ title: region.name, lane: track.name, proofUse: "native-daw-session" }))),
        rightsRequiredBeforePlayback: true,
        sendTo: "SkyeMusicNexus Release Forge"
      }
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

  async function postStudio(body) {
    const requestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    };
    const response = auth && typeof auth.fetch === "function"
      ? await auth.fetch(API.studio, requestInit, { missingAuthMessage: "Connect SkyGate before saving the DAW project." })
      : await fetch(API.studio, requestInit);
    const text = await response.text();
    const json = JSON.parse(text || "{}");
    if (!response.ok) throw new Error(json.error || json.message || `Studio write failed: ${response.status}`);
    return json;
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
    $("exportDawManifestButton")?.addEventListener("click", exportManifest);
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
    $("dawFileInput")?.addEventListener("change", importFiles);
    $("dawProjectInput")?.addEventListener("input", updateStatusbar);
    $("dawTempoInput")?.addEventListener("input", renderWorkbenchPanel);
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
      if (!volume) return;
      const track = state.tracks.find((item) => item.id === volume.dataset.volumeTrack);
      if (track) {
        track.volume = Number(volume.value);
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function init() {
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
    setAudioStatus("Audio locked");
    updateStatusbar();
    updateEditButtons();
    syncDebug();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
