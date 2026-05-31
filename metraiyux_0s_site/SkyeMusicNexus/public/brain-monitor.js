(() => {
  const WORKER_ORIGIN = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
  const STORE_KEY = "skymusicnexus.brainMonitor.v1";
  const REFRESH_MS = 9000;
  const DEFAULT_ARTIST_ID = "gray-skyes-brain";

  const FALLBACK = Object.freeze({
    ok: true,
    providerRequired: false,
    localOnly: true,
    profiles: [{
      artistId: DEFAULT_ARTIST_ID,
      artistName: "Gray Skyes Brain",
      status: "api-unavailable",
      activityMix: { listen: 70, create: 10, social: 20 },
    }],
    actions: [],
    cycles: [],
    systemListens: [],
    songDrafts: [],
    toolRuns: [],
    activityMix: { listen: 70, create: 10, social: 20 },
    summary: { profiles: 0, actions: 0, executedActions: 0, cycles: 0, toolRuns: 0, systemListens: 0, songDrafts: 0 },
    generatedAt: new Date().toISOString(),
    fallback: true,
  });

  const FALLBACK_TRAFFIC = Object.freeze({
    ok: true,
    trafficSummary: {
      nexusStreams: 0,
      playStarts: 0,
      completePlays: 0,
      listenSeconds: 0,
      topTracks: [],
    },
    traffic: [],
    fallback: true,
  });

  const state = {
    artistId: new URLSearchParams(location.search).get("artist") || readStored().artistId || DEFAULT_ARTIST_ID,
    paused: readStored().paused === true,
    loading: false,
    brain: null,
    traffic: null,
    lane: "booting",
    brainLane: "",
    trafficLane: "",
    errors: [],
    lastCycleResult: null,
    lastLoadedAt: null,
    animationFrame: 0,
    auth: null,
    liveStream: {
      controller: null,
      connected: false,
      lane: "",
      lastEventAt: null,
      restartTimer: null,
      failureCount: 0,
      errorKey: "",
    },
  };

  const el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function readStored() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeStored() {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      artistId: state.artistId,
      paused: state.paused,
      updatedAt: new Date().toISOString(),
    }));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function fmt(value) {
    return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(number(value))));
  }

  function duration(value) {
    const seconds = Math.max(0, Math.round(number(value)));
    if (seconds < 60) return `${fmt(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    if (minutes < 60) return remainder ? `${fmt(minutes)}m ${remainder}s` : `${fmt(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${fmt(hours)}h ${rest}m` : `${fmt(hours)}h`;
  }

  function clock(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function compactDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  }

  function musicFunctionBase() {
    const configured = window.METRAIYUX_API_BASES && window.METRAIYUX_API_BASES.skymusicnexus;
    if (configured) return `${String(configured).replace(/\/+$/, "")}/`;
    if (/^(127\.0\.0\.1|localhost)$/i.test(location.hostname)) return "/.netlify/functions/";
    if (/(^|\.)skye-music-nexus\.pages\.dev$/i.test(location.hostname)) return `${WORKER_ORIGIN}/api/skymusicnexus/`;
    return "/api/skymusicnexus/";
  }

  function sameOriginPath(path) {
    return new URL(path, location.origin).toString();
  }

  function addQuery(url, query = {}) {
    const next = new URL(url, location.href);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") next.searchParams.set(key, value);
    }
    return next.toString();
  }

  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs || 7000);
    const targetOrigin = new URL(url, location.href).origin;
    const init = {
      method: options.method || "GET",
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      cache: "no-store",
      credentials: options.credentials || (targetOrigin === location.origin ? "include" : "omit"),
      signal: controller.signal,
    };
    if (options.body) init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    try {
      const hasBearer = state.auth && typeof state.auth.hasToken === "function" && state.auth.hasToken();
      const response = options.auth !== false && hasBearer
        ? await state.auth.fetch(url, init)
        : await fetch(url, init);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || `${response.status} ${response.statusText}`.trim());
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function firstJson(candidates, fallback) {
    const errors = [];
    for (const candidate of candidates) {
      try {
        const data = await requestJson(candidate.url, candidate);
        return { data, lane: candidate.lane, errors };
      } catch (error) {
        errors.push(`${candidate.lane}: ${error.message || error.name || "request failed"}`);
      }
    }
    return { data: fallback, lane: "api unavailable", errors };
  }

  function brainEventsCandidate() {
    const base = musicFunctionBase();
    return {
      lane: "music-brain-daemon?action=events",
      url: addQuery(`${base}music-brain-daemon`, { action: "events", artistId: state.artistId }),
      method: "GET",
    };
  }

  function brainStatusCandidates() {
    const base = musicFunctionBase();
    return [
      {
        lane: "music-brain-daemon?action=status",
        url: addQuery(`${base}music-brain-daemon`, { action: "status", artistId: state.artistId }),
        method: "GET",
      },
      {
        lane: "music-brain?action=hub",
        url: addQuery(`${base}music-brain`, { action: "hub", artistId: state.artistId }),
        method: "GET",
      },
      {
        lane: "brain-daemon?action=status",
        url: addQuery(sameOriginPath("/api/music/brain-daemon"), { action: "status", artistId: state.artistId }),
        method: "GET",
      },
    ];
  }

  function trafficCandidates() {
    const base = musicFunctionBase();
    return [
      {
        lane: "music-drops?action=traffic-summary",
        url: addQuery(`${base}music-drops`, { action: "traffic-summary" }),
        method: "GET",
        auth: false,
        credentials: "omit",
      },
      {
        lane: "traffic-summary",
        url: sameOriginPath("/api/music/traffic-summary"),
        method: "GET",
        auth: false,
        credentials: "omit",
      },
    ];
  }

  function runCycleCandidates(body) {
    const base = musicFunctionBase();
    return [
      {
        lane: "music-brain-daemon:run-now",
        url: `${base}music-brain-daemon`,
        method: "POST",
        body: { action: "run-now", force: true, ...body },
      },
      {
        lane: "music-brain:run-local-cycle",
        url: `${base}music-brain`,
        method: "POST",
        body: { action: "run-local-cycle", ...body },
      },
      {
        lane: "brain-daemon?action=run-cycle",
        url: addQuery(sameOriginPath("/api/music/brain-daemon"), { action: "run-cycle" }),
        method: "POST",
        body: { action: "run-cycle", ...body },
      },
    ];
  }

  async function controlDaemon(action) {
    const base = musicFunctionBase();
    return requestJson(`${base}music-brain-daemon`, {
      method: "POST",
      body: { action, source: "brain-monitor-ui" },
    });
  }

  async function refreshStatus({ quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    if (!quiet) state.errors = [];
    renderShellState();
    const [brainResult, trafficResult] = await Promise.all([
      firstJson(brainStatusCandidates(), FALLBACK),
      firstJson(trafficCandidates(), FALLBACK_TRAFFIC),
    ]);
    state.brain = normalizeBrain(brainResult.data);
    state.traffic = normalizeTraffic(trafficResult.data);
    state.brainLane = brainResult.lane;
    state.trafficLane = trafficResult.lane;
    state.lane = state.liveStream.connected
      ? `${state.brainLane} / ${state.trafficLane} / live heartbeat`
      : `${state.brainLane} / ${state.trafficLane}`;
    state.errors = [...brainResult.errors, ...trafficResult.errors].slice(-6);
    state.lastLoadedAt = new Date();
    state.loading = false;
    render();
  }

  function applyLiveStatus(data, lane) {
    if (!data || typeof data !== "object" || data.schema !== "skyemusicnexus.artist-brain-daemon.v1") return false;
    state.brain = normalizeBrain(data);
    state.traffic = normalizeTraffic({
      ok: true,
      streamImpact: data.streamImpact || data.trafficSummary || {},
      traffic: Array.isArray(data.traffic) ? data.traffic : [],
    });
    state.brainLane = lane;
    state.trafficLane = "daemon streamImpact";
    state.lane = `${lane} / daemon streamImpact / live heartbeat`;
    state.liveStream.connected = true;
    state.liveStream.lastEventAt = new Date();
    state.liveStream.failureCount = 0;
    state.liveStream.errorKey = "";
    state.loading = false;
    state.lastLoadedAt = state.liveStream.lastEventAt;
    render();
    return true;
  }

  function parseSseBlock(block) {
    const event = { type: "message", data: "" };
    for (const rawLine of String(block || "").split(/\r?\n/)) {
      const line = rawLine.trimEnd();
      if (!line || line.startsWith(":")) continue;
      const index = line.indexOf(":");
      const field = index === -1 ? line : line.slice(0, index);
      const value = index === -1 ? "" : line.slice(index + 1).replace(/^ /, "");
      if (field === "event") event.type = value || "message";
      if (field === "data") event.data += `${value}\n`;
    }
    if (event.data.endsWith("\n")) event.data = event.data.slice(0, -1);
    return event;
  }

  function rememberLiveStreamError(message) {
    const clean = String(message || "live heartbeat unavailable").slice(0, 160);
    if (state.liveStream.errorKey === clean && state.liveStream.failureCount > 1) return;
    state.liveStream.errorKey = clean;
    state.errors = [`live heartbeat: ${clean}`, ...state.errors.filter((item) => !String(item).startsWith("live heartbeat:"))].slice(0, 6);
    render();
  }

  function stopLiveStream() {
    if (state.liveStream.restartTimer) {
      clearTimeout(state.liveStream.restartTimer);
      state.liveStream.restartTimer = null;
    }
    if (state.liveStream.controller) {
      state.liveStream.controller.abort();
      state.liveStream.controller = null;
    }
    state.liveStream.connected = false;
  }

  function scheduleLiveStreamRestart() {
    if (state.paused || document.hidden || state.liveStream.restartTimer) return;
    state.liveStream.restartTimer = setTimeout(() => {
      state.liveStream.restartTimer = null;
      startLiveStream();
    }, Math.min(15000, 3500 + state.liveStream.failureCount * 1500));
  }

  async function startLiveStream() {
    const candidate = brainEventsCandidate();
    stopLiveStream();
    const controller = new AbortController();
    state.liveStream.controller = controller;
    state.liveStream.lane = candidate.lane;
    try {
      const targetOrigin = new URL(candidate.url, location.href).origin;
      const sameOrigin = targetOrigin === location.origin;
      const hasBearer = state.auth && typeof state.auth.hasToken === "function" && state.auth.hasToken();
      if (!sameOrigin && !hasBearer) {
        state.liveStream.failureCount += 1;
        scheduleLiveStreamRestart();
        return;
      }
      const init = {
        method: "GET",
        headers: { accept: "text/event-stream" },
        cache: "no-store",
        credentials: sameOrigin ? "include" : "omit",
        signal: controller.signal,
      };
      const response = hasBearer
        ? await state.auth.fetch(candidate.url, init)
        : await fetch(candidate.url, init);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
      if (!response.body || typeof response.body.getReader !== "function") throw new Error("stream reader unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const frame = parseSseBlock(block);
          if (frame.type === "status" || frame.type === "heartbeat" || frame.type === "message") {
            try {
              applyLiveStatus(JSON.parse(frame.data || "{}"), candidate.lane);
            } catch (error) {
              rememberLiveStreamError(error.message || "heartbeat parse failed");
            }
          } else if (frame.type === "error") {
            rememberLiveStreamError(frame.data || "daemon event error");
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        state.liveStream.failureCount += 1;
        state.liveStream.connected = false;
        rememberLiveStreamError(error.message || error.name || "stream request failed");
        scheduleLiveStreamRestart();
      }
      return;
    }
    state.liveStream.connected = false;
    scheduleLiveStreamRestart();
  }

  async function runCycle() {
    if (state.paused) return;
    state.loading = true;
    state.errors = [];
    renderShellState();
    const body = {
      artistId: state.artistId,
      goal: "70 listen / 10 create / 20 social operations monitor cycle",
      limit: 10,
      execute: true,
      weightedMix: true,
    };
    const result = await firstJson(runCycleCandidates(body), simulateCycle(body));
    state.lastCycleResult = result.data;
    if (result.errors.length) state.errors = result.errors.slice(-4);
    await refreshStatus({ quiet: true });
  }

  function simulateCycle(body) {
    const now = new Date().toISOString();
    return {
      ok: false,
      profile: { artistId: body.artistId, artistName: body.artistId, activityMix: { listen: 70, create: 10, social: 20 } },
      cycle: {
        cycleId: `blocked_cycle_${Date.now()}`,
        artistId: body.artistId,
        goal: body.goal,
        executed: false,
        weightedMix: true,
        activityMix: { listen: 70, create: 10, social: 20 },
        receipts: [],
        createdAt: now,
      },
      actions: [],
      receipts: [],
      error: "brain_runtime_unavailable",
      fallback: true,
    };
  }

  function normalizeBrain(data) {
    const brain = data && typeof data === "object" ? { ...data } : { ...FALLBACK };
    if (brain.schema === "skyemusicnexus.artist-brain-daemon.v1") {
      const status = brain;
      const ledger = Array.isArray(status.ledger) ? status.ledger : [];
      const queue = status.queue || {};
      const allocation = status.allocation || {};
      const nowListening = Array.isArray(status.nowListening) ? status.nowListening : [];
      const actions = Array.isArray(queue.recentActions) ? queue.recentActions : Array.isArray(queue.lastActions) ? queue.lastActions : [];
      const currentListen = status.currentListen || status.currentTrack || nowListening[0] || null;
      const currentListenKey = currentListen ? (currentListen.systemListenId || currentListen.trackId || currentListen.releaseId || currentListen.productId || currentListen.title || "") : "";
      const daemonSummary = {
        profiles: Number(status.artistStats?.accounts || 0) || FALLBACK.summary.profiles,
        actions: Number(queue.backlog || 0) + Number(queue.executed || 0),
        executedActions: Number(queue.executed || 0),
        cycles: Number(queue.recentCycles || ledger.length || 0),
        toolRuns: 0,
        systemListens: nowListening.length,
        songDrafts: actions.filter((action) => action.type === "create_song_draft").length,
      };
      return {
        ...FALLBACK,
        ...brain,
        daemonStatus: status.daemon || {},
        policy: status.policy || {},
        profiles: FALLBACK.profiles,
        profile: { ...FALLBACK.profiles[0], activityMix: status.policy?.allocation || FALLBACK.activityMix },
        actions,
        cycles: ledger.map((event) => ({
          cycleId: event.runId || event.daemonEventId,
          goal: "artist-brain daemon cycle",
          executed: event.status === "completed",
          weightedMix: true,
          activityMix: status.policy?.allocation || FALLBACK.activityMix,
          receipts: [],
          createdAt: event.finishedAt || event.startedAt || event.createdAt,
        })),
        systemListens: currentListen ? [currentListen, ...nowListening.filter((item) => {
          const key = item.systemListenId || item.trackId || item.releaseId || item.productId || item.title || "";
          return key !== currentListenKey;
        })] : nowListening,
        songDrafts: [],
        toolRuns: [],
        errors: Array.isArray(status.errors) ? status.errors : [],
        alerts: Array.isArray(status.alerts) ? status.alerts : [],
        summary: daemonSummary,
        activityMix: allocation.actual || status.policy?.allocation || FALLBACK.activityMix,
        targetMix: allocation.target || status.policy?.allocation || FALLBACK.activityMix,
        allocation,
      };
    }
    const profileList = Array.isArray(brain.profiles) ? brain.profiles : [];
    const selected = profileList.find((item) => item.artistId === state.artistId) || profileList[0] || FALLBACK.profiles[0];
    return {
      ...brain,
      profiles: profileList.length ? profileList : FALLBACK.profiles,
      profile: selected,
      actions: Array.isArray(brain.actions) ? brain.actions : [],
      cycles: Array.isArray(brain.cycles) ? brain.cycles : [],
      toolRuns: Array.isArray(brain.toolRuns) ? brain.toolRuns : [],
      systemListens: Array.isArray(brain.systemListens) ? brain.systemListens : [],
      songDrafts: Array.isArray(brain.songDrafts) ? brain.songDrafts : [],
      summary: brain.summary && typeof brain.summary === "object" ? brain.summary : {},
      activityMix: brain.activityMix || selected.activityMix || { listen: 70, create: 10, social: 20 },
    };
  }

  function normalizeTraffic(data) {
    const traffic = data && typeof data === "object" ? data : FALLBACK_TRAFFIC;
    const summary = traffic.trafficSummary || traffic.streamImpact || traffic.summary || {};
    return {
      ...traffic,
      trafficSummary: {
        nexusStreams: number(summary.nexusStreams || summary.streams),
        playStarts: number(summary.playStarts || summary.plays),
        completePlays: number(summary.completePlays || summary.completes),
        listenSeconds: number(summary.listenSeconds || summary.seconds),
        topTracks: Array.isArray(summary.topTracks) ? summary.topTracks : [],
      },
      traffic: Array.isArray(traffic.traffic) ? traffic.traffic : [],
    };
  }

  function currentListen() {
    const brain = state.brain || normalizeBrain(FALLBACK);
    const traffic = state.traffic || normalizeTraffic(FALLBACK_TRAFFIC);
    const listen = brain.systemListens.find((item) => item.status === "listening") || brain.systemListens[0] || traffic.traffic.find((item) => /stream|play/i.test(item.eventType || item.type || "")) || null;
    const topTrack = traffic.trafficSummary.topTracks[0] || null;
    return listen || topTrack || null;
  }

  function titleOf(item) {
    return item?.title || item?.trackTitle || item?.releaseTitle || item?.trackId || item?.dropId || "Untitled signal";
  }

  function actorOf(item) {
    return item?.artistName || item?.listenerArtistName || item?.artistId || item?.listenerArtistId || state.brain?.profile?.artistName || state.artistId;
  }

  function targetOf(item) {
    return item?.targetArtistName || item?.targetArtistId || item?.artistSlug || item?.artistName || "";
  }

  function splitActions() {
    const actions = [...((state.lastCycleResult && state.lastCycleResult.actions) || []), ...((state.brain && state.brain.actions) || [])];
    const seen = new Set();
    const unique = [];
    for (const action of actions) {
      const key = action.actionId || `${action.type}:${action.title}:${action.createdAt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(action);
    }
    return unique;
  }

  function receipts() {
    const daemonLedger = Array.isArray(state.brain?.ledger) ? state.brain.ledger.map((event) => ({
      kind: "daemon_cycle",
      title: `${event.status || "cycle"} / ${event.streamDelta || 0} streams`,
      metricLane: "nexusStreams",
      nexusMetricEligible: true,
      cycleId: event.runId || event.daemonEventId,
      createdAt: event.finishedAt || event.startedAt || event.createdAt,
    })) : [];
    const fromLast = [
      ...((state.lastCycleResult && state.lastCycleResult.receipts) || []),
      ...((state.lastCycleResult && state.lastCycleResult.cycle && state.lastCycleResult.cycle.receipts) || []),
    ];
    const fromCycles = ((state.brain && state.brain.cycles) || []).flatMap((cycle) => {
      return (cycle.receipts || []).map((receipt) => ({ ...receipt, cycleId: cycle.cycleId, createdAt: receipt.createdAt || cycle.createdAt }));
    });
    return [...fromLast, ...daemonLedger, ...fromCycles].slice(0, 30);
  }

  function pendingActions(actions) {
    return actions.filter((action) => !["executed", "done", "complete", "completed"].includes(String(action.status || "").toLowerCase()));
  }

  function renderShellState() {
    document.body.classList.toggle("is-paused", state.paused);
    if (el.pauseButton) el.pauseButton.setAttribute("aria-pressed", String(state.paused));
    if (el.resumeButton) el.resumeButton.setAttribute("aria-pressed", String(!state.paused));
    if (el.runCycleButton) el.runCycleButton.disabled = state.loading || state.paused;
    if (el.refreshButton) el.refreshButton.disabled = state.loading;
  }

  function render() {
    renderShellState();
    const brain = state.brain || normalizeBrain(FALLBACK);
    const traffic = state.traffic || normalizeTraffic(FALLBACK_TRAFFIC);
    const listen = currentListen();
    const actions = splitActions();
    const pending = pendingActions(actions);
    const lastAction = actions.find((action) => String(action.status || "").toLowerCase() === "executed") || actions[0] || null;
    const nextAction = pending[0] || null;
    const mix = brain.activityMix || brain.profile?.activityMix || { listen: 70, create: 10, social: 20 };
    const targetMix = brain.targetMix || brain.policy?.allocation || { listen: 70, create: 10, social: 20 };
    const summary = brain.summary || {};
    const trafficSummary = traffic.trafficSummary || {};
    const daemonErrors = Array.isArray(brain.errors) ? brain.errors : [];
    const daemonAlerts = Array.isArray(brain.alerts) ? brain.alerts : [];
    const errorCount = state.errors.length + daemonErrors.length + daemonAlerts.length;

    el.nowListening.textContent = `${actorOf(listen)}${targetOf(listen) ? ` -> ${targetOf(listen)}` : ""}`;
    el.trackDetail.textContent = `${duration(listen?.listenSeconds || listen?.durationSeconds || 0)} / ${clock(listen?.createdAt || listen?.at)}`;
    el.trackTitle.textContent = titleOf(listen);
    el.trackMeta.textContent = [listen?.releaseTitle, listen?.metricLane || "nexusStreams", listen?.sourceType || listen?.source || ""].filter(Boolean).join(" / ") || "No active track metadata";
    el.lastAction.textContent = lastAction ? titleOf(lastAction) : "Idle";
    el.lastActionMeta.textContent = lastAction ? `${lastAction.type || "action"} / ${lastAction.status || "queued"} / ${compactDate(lastAction.executedAt || lastAction.createdAt)}` : "No action receipt yet";
    el.nextAction.textContent = nextAction ? titleOf(nextAction) : "Not queued";
    el.nextActionMeta.textContent = `${pending.length} pending / ${actions.length} total`;

    const alert = alertState(errorCount, pending.length, brain.daemonStatus || null);
    el.alertCard.dataset.tone = alert.tone;
    el.alertStatus.textContent = alert.title;
    el.alertMeta.textContent = alert.meta;
    el.dataLane.textContent = state.lane || "api unavailable";
    el.lastSync.textContent = state.lastLoadedAt ? compactDate(state.lastLoadedAt) : "--";

    setGauge(el.listenGauge, "listen", mix.listen ?? targetMix.listen ?? 70);
    setGauge(el.createGauge, "create", mix.create ?? targetMix.create ?? 10);
    setGauge(el.socialGauge, "social", mix.social ?? targetMix.social ?? 20);
    el.mixMode.textContent = brain.daemonStatus?.status || (state.lastCycleResult?.cycle?.weightedMix === false ? "manual" : "weighted");
    el.queueBacklog.textContent = fmt(pending.length);
    el.queueMeter.value = Math.min(24, pending.length);
    const visibleErrors = [
      ...daemonAlerts.map((alertItem) => `${alertItem.level || "alert"}: ${alertItem.message || alertItem.code || "daemon alert"}`),
      ...daemonErrors.map((error) => `${error.level || "error"}: ${error.message || error.code || "daemon error"}`),
      ...state.errors,
    ];
    el.errorList.innerHTML = visibleErrors.length
      ? visibleErrors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")
      : "<li>No active errors.</li>";

    el.nexusStreams.textContent = fmt(trafficSummary.nexusStreams);
    el.playStarts.textContent = fmt(trafficSummary.playStarts);
    el.listenSeconds.textContent = duration(trafficSummary.listenSeconds);
    el.systemListens.textContent = fmt(summary.systemListens || brain.systemListens.length);
    el.songDrafts.textContent = fmt(summary.songDrafts || brain.songDrafts.length);
    el.cycleCount.textContent = fmt(summary.cycles || brain.cycles.length);
    el.cycleMeta.textContent = brain.cycles[0] ? compactDate(brain.cycles[0].createdAt) : "none loaded";

    renderActions(actions);
    renderStreams(trafficSummary.topTracks);
    renderReceipts(receipts());
    drawMap();
  }

  function alertState(errorCount, backlog, daemonStatus) {
    if (state.paused) return { tone: "warn", title: "Paused", meta: "Local monitor hold is active" };
    if (daemonStatus?.status === "stalled" || daemonStatus?.status === "error") return { tone: "error", title: daemonStatus.status, meta: `last tick ${compactDate(daemonStatus.lastTickAt)}` };
    if (daemonStatus?.status === "paused" || daemonStatus?.status === "quiet" || daemonStatus?.status === "locked") return { tone: "warn", title: daemonStatus.status, meta: `next ${compactDate(daemonStatus.nextTickAt)}` };
    if (errorCount > 0 && /api unavailable/i.test(state.lane || "")) return { tone: "error", title: "API unavailable", meta: `${errorCount} API lane miss${errorCount === 1 ? "" : "es"}` };
    if (errorCount > 0) return { tone: "warn", title: "Degraded", meta: `${errorCount} fallback note${errorCount === 1 ? "" : "s"}` };
    if (backlog > 14) return { tone: "warn", title: "Backlog", meta: `${backlog} queued actions` };
    return { tone: "ok", title: daemonStatus?.status || "Nominal", meta: state.loading ? "Refreshing" : `next ${compactDate(daemonStatus?.nextTickAt)}` };
  }

  function setGauge(node, key, value) {
    const pct = Math.max(0, Math.min(100, Math.round(number(value))));
    node.textContent = `${pct}%`;
    const gauge = node.closest(".gauge");
    if (gauge) gauge.style.setProperty("--value", pct);
    node.dataset.key = key;
  }

  function renderActions(actions) {
    el.actionCount.textContent = `${fmt(actions.length)} actions`;
    el.actionList.innerHTML = actions.slice(0, 28).map((action) => {
      const status = String(action.status || "planned").toLowerCase();
      const tagClass = status.includes("execut") || status.includes("done") ? "executed" : "planned";
      return `<article class="row">
        <div>
          <strong>${escapeHtml(titleOf(action))}</strong>
          <span>${escapeHtml(action.type || "action")} / ${escapeHtml(action.targetArtistId || action.releaseId || action.productId || "nexus")}</span>
          <small>${escapeHtml(compactDate(action.executedAt || action.createdAt))}</small>
        </div>
        <span class="tag ${tagClass}">${escapeHtml(status || "planned")}</span>
      </article>`;
    }).join("") || emptyRow("No action queue loaded.");
  }

  function renderStreams(tracks) {
    const rows = Array.isArray(tracks) && tracks.length ? tracks : [];
    el.trackCount.textContent = `${fmt(rows.length)} tracks`;
    el.streamList.innerHTML = rows.slice(0, 20).map((track) => {
      return `<article class="row">
        <div>
          <strong>${escapeHtml(titleOf(track))}</strong>
          <span>${escapeHtml(track.artistName || track.artistId || "SkyeMusicNexus")}</span>
          <small>${fmt(track.playStarts)} starts / ${duration(track.listenSeconds)}</small>
        </div>
        <span class="tag ok">${fmt(track.nexusStreams || track.streams)}</span>
      </article>`;
    }).join("") || emptyRow("No stream impact rows loaded.");
  }

  function renderReceipts(rows) {
    el.receiptCount.textContent = `${fmt(rows.length)} receipts`;
    el.receiptList.innerHTML = rows.slice(0, 24).map((receipt) => {
      const ok = receipt.ok === false ? "error" : receipt.nexusMetricEligible === false ? "warn" : "ok";
      return `<article class="row">
        <div>
          <strong>${escapeHtml(receipt.title || receipt.kind || receipt.metricLane || "cycle receipt")}</strong>
          <span>${escapeHtml([receipt.kind, receipt.metricLane, receipt.feedAction].filter(Boolean).join(" / ") || "receipt")}</span>
          <small>${escapeHtml(receipt.cycleId || receipt.postId || receipt.releaseId || receipt.trackId || "")}</small>
        </div>
        <span class="tag ${ok}">${escapeHtml(ok)}</span>
      </article>`;
    }).join("") || emptyRow("No cycle receipts loaded.");
  }

  function emptyRow(message) {
    return `<article class="row"><div><strong>${escapeHtml(message)}</strong><span>--</span></div><span class="tag">idle</span></article>`;
  }

  function mapNodes() {
    const brain = state.brain || normalizeBrain(FALLBACK);
    const traffic = state.traffic || normalizeTraffic(FALLBACK_TRAFFIC);
    const nodes = [];
    nodes.push({ kind: "core", label: brain.profile?.artistName || state.artistId, weight: 1, color: "#f5f2e8" });
    for (const listen of brain.systemListens.slice(0, 12)) {
      nodes.push({ kind: "listen", label: titleOf(listen), weight: 0.55 + Math.min(1.2, number(listen.listenSeconds) / 120), color: "#7ddf64" });
    }
    for (const action of splitActions().slice(0, 18)) {
      const color = action.type === "create_song_draft" ? "#f2c14e" : action.type === "engage_post" || action.type === "feed_post" ? "#ff6b6b" : "#72d6d1";
      nodes.push({ kind: "action", label: titleOf(action), weight: String(action.status).toLowerCase() === "executed" ? 0.95 : 0.62, color });
    }
    for (const track of traffic.trafficSummary.topTracks.slice(0, 10)) {
      nodes.push({ kind: "stream", label: titleOf(track), weight: 0.5 + Math.min(1.4, number(track.nexusStreams) / 20), color: "#72d6d1" });
    }
    return nodes;
  }

  function drawMap() {
    const canvas = el.neuralMap;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(320, Math.round(rect.width * ratio));
    const height = Math.max(320, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const t = performance.now() / 1000;
    const nodes = mapNodes();
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(ratio, ratio);
    const w = width / ratio;
    const h = height / ratio;
    const cx = w / 2;
    const cy = h / 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(245,242,232,.1)";
    for (let i = 0; i < nodes.length; i += 1) {
      const ring = 1 + Math.floor(i / 9);
      const angle = (i / Math.max(1, nodes.length - 1)) * Math.PI * 2 + t * 0.08 * (ring % 2 ? 1 : -1);
      const radius = 54 + ring * Math.min(64, w / 15);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.62;
      nodes[i].x = x;
      nodes[i].y = y;
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    for (const node of nodes.slice(1)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 7 + node.weight * 8, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.globalAlpha = 0.76;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const pulse = 36 + Math.sin(t * 2) * 4;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.fillStyle = state.paused ? "#f2c14e" : "#f5f2e8";
    ctx.fill();
    ctx.fillStyle = "#10110e";
    ctx.font = "900 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.paused ? "PAUSED" : "BRAIN", cx, cy + 4);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(245,242,232,.78)";
    ctx.font = "800 12px Inter, system-ui, sans-serif";
    nodes.slice(1, 14).forEach((node) => {
      ctx.fillText(String(node.kind || "").toUpperCase(), node.x + 14, node.y + 4);
    });
    ctx.restore();
  }

  function animate() {
    drawMap();
    state.animationFrame = requestAnimationFrame(animate);
  }

  function cacheElements() {
    for (const id of [
      "artistIdInput", "refreshButton", "pauseButton", "resumeButton", "runCycleButton",
      "nowListening", "trackDetail", "trackTitle", "trackMeta", "lastAction", "lastActionMeta",
      "nextAction", "nextActionMeta", "alertCard", "alertStatus", "alertMeta", "dataLane",
      "lastSync", "listenGauge", "createGauge", "socialGauge", "mixMode", "queueBacklog",
      "queueMeter", "errorList", "nexusStreams", "playStarts", "listenSeconds", "systemListens",
      "songDrafts", "cycleCount", "cycleMeta", "actionCount", "actionList", "trackCount",
      "streamList", "receiptCount", "receiptList", "neuralMap",
    ]) {
      el[id] = $(id);
    }
  }

  function wire() {
    el.artistIdInput.value = state.artistId;
    el.artistIdInput.addEventListener("change", () => {
      state.artistId = el.artistIdInput.value.trim() || DEFAULT_ARTIST_ID;
      writeStored();
      refreshStatus();
      if (!state.paused && !document.hidden) startLiveStream();
    });
    el.refreshButton.addEventListener("click", () => {
      refreshStatus();
      if (!state.paused && !document.hidden) startLiveStream();
    });
    el.pauseButton.addEventListener("click", async () => {
      state.paused = true;
      stopLiveStream();
      writeStored();
      render();
      try {
        await controlDaemon("pause");
        await refreshStatus({ quiet: true });
      } catch (error) {
        state.errors = [`pause: ${error.message || "request failed"}`];
        render();
      }
    });
    el.resumeButton.addEventListener("click", async () => {
      state.paused = false;
      writeStored();
      render();
      try {
        await controlDaemon("resume");
      } catch (error) {
        state.errors = [`resume: ${error.message || "request failed"}`];
      }
      refreshStatus({ quiet: true });
      startLiveStream();
    });
    el.runCycleButton.addEventListener("click", () => runCycle().catch((error) => {
      state.loading = false;
      state.errors = [`run-cycle: ${error.message || "request failed"}`];
      render();
    }));
    window.addEventListener("resize", drawMap);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !state.paused) {
        refreshStatus({ quiet: true });
        startLiveStream();
      }
      if (document.hidden) stopLiveStream();
    });
  }

  function boot() {
    cacheElements();
    state.auth = window.createSkyGateAuth ? window.createSkyGateAuth({ storageKey: "skye_music_nexus_session" }) : null;
    wire();
    render();
    refreshStatus();
    if (!state.paused && !document.hidden) startLiveStream();
    setInterval(() => {
      if (!state.paused && !document.hidden && !state.liveStream.connected) refreshStatus({ quiet: true });
    }, REFRESH_MS);
    animate();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
