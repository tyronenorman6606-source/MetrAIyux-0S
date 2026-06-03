(function () {
  const body = document.body;
  if (!body || body.dataset.appId !== "SkyeMail") return;

  const params = new URLSearchParams(window.location.search);
  const page = body.dataset.page || "hub";
  const wsId = params.get("ws_id") || "primary-workspace";
  const suiteBase = new URL(body.dataset.suiteBase || "./", window.location.href);
  const rootBase = new URL(body.dataset.rootBase || "../", window.location.href);
  const stateKey = "skymail.platform.state";
  const deliveryKey = "skymail.delivery.records";
  const launchDraftKey = "skymail.platform.launchDraft";
  const bridgeKey = "skymail.platform.intent.bridge";
  const liveDeliveryState = { status: "pending", items: [], error: "" };
  let storageProtocol = null;
  const initialState = {
    handoffs: [],
    drafts: [],
    campaigns: [],
    opsNotes: [],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      if (parsed === null || parsed === undefined) return clone(fallback);
      return parsed;
    } catch {
      return clone(fallback);
    }
  }

  const state = {
    ...initialState,
    ...(readJson(stateKey, initialState) || {}),
  };

  function saveState() {
    localStorage.setItem(stateKey, JSON.stringify(state));
  }

  function loadDeliveries() {
    const parsed = readJson(deliveryKey, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function readStoredValue(key) {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const value = store.getItem(key);
        if (value) return value;
      } catch {}
    }
    return "";
  }

  function readGateToken() {
    return String(window.MetrAIyuxGateBridge?.current?.()?.token || "").trim();
  }

  function activeMailboxEmail() {
    return String(readStoredValue("SMV_ACTIVE_MAILBOX") || "").trim().toLowerCase();
  }

  function apiCandidates(path) {
    const parsed = new URL(String(path || "").startsWith("/") ? path : `/${path}`, window.location.origin);
    const name = parsed.pathname.replace(/^\/+/, "");
    return [
      `/.netlify/functions/skymail-standalone-${name}${parsed.search}`,
      `/.netlify/functions/${name}${parsed.search}`,
      `/api/skymail-standalone-${name}${parsed.search}`,
      `/api/${name}${parsed.search}`,
    ];
  }

  async function fetchSkyeMailApi(path, options = {}) {
    const token = readGateToken();
    if (!token) {
      const error = new Error("Shared 0S Gate session required for live delivery telemetry.");
      error.status = 401;
      throw error;
    }
    const hasBody = options.body !== undefined;
    const headers = {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    };
    const mailbox = activeMailboxEmail();
    if (mailbox) headers["x-skymail-mailbox-email"] = mailbox;
    let lastError = null;
    for (const candidate of apiCandidates(path)) {
      try {
        const response = await fetch(candidate, {
          method: options.method || (hasBody ? "POST" : "GET"),
          headers,
          credentials: "include",
          cache: "no-store",
          body: hasBody ? JSON.stringify(options.body) : undefined,
        });
        const text = await response.text();
        let data = null;
        try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || `HTTP ${response.status}` }; }
        if (response.ok) return data;
        lastError = new Error(data?.error || `HTTP ${response.status}`);
        lastError.status = response.status;
        if (![404, 502, 503, 504].includes(response.status)) throw lastError;
      } catch (error) {
        lastError = error;
        if (error.status && ![404, 502, 503, 504].includes(error.status)) throw error;
      }
    }
    throw lastError || new Error("Live delivery telemetry API unavailable.");
  }

  async function createLiveHandoff(actionId, context, label) {
    return await fetchSkyeMailApi("/mail-os-handoff", {
      method: "POST",
      body: {
        action_id: actionId,
        label,
        context: {
          mailbox: activeMailboxEmail(),
          subject: context.subject || context.title || "",
          to: context.to || "",
          from: context.from || "",
          snippet: context.text || context.summary || context.note || "",
          source: context.source || "skyemail-suite",
          channel: context.channel || "suite",
        },
      },
    });
  }

  async function saveLiveDraft(draft) {
    return await fetchSkyeMailApi("/gmail-draft-save", {
      method: "POST",
      body: {
        to: draft.to,
        subject: draft.subject,
        text: draft.text,
        html: `<p>${escapeHtml(draft.text || "").replace(/\n/g, "<br>")}</p>`,
      },
    });
  }

  function liveDeliveryEmptyText() {
    if (liveDeliveryState.status === "pending") return "Loading real delivery events from the SkyeMail API.";
    if (liveDeliveryState.status === "unauthenticated") return "Sign in through the shared 0S Gate to load live delivery events.";
    if (liveDeliveryState.status === "error") return liveDeliveryState.error || "Live delivery telemetry is unavailable.";
    return "No live delivery events are stored for this mailbox yet.";
  }

  function liveDeliveryRows() {
    return liveDeliveryState.items.slice(0, 6).map((entry) => ({
      title: entry.subject || entry.event_type || "Delivery event",
      excerpt: `${entry.from_email || "unknown sender"} -> ${entry.recipient_email || "unknown recipient"}`,
      source: `${entry.provider || "provider"} ${entry.delivery_status || "event"}`,
      at: entry.event_created_at || entry.created_at || "",
    }));
  }

  function setLiveTelemetryStatus(text) {
    const node = document.getElementById("mailSkyeMailStatus");
    if (node) node.textContent = text;
  }

  async function refreshLiveDeliveries() {
    try {
      const data = await fetchSkyeMailApi("/resend-events-list?limit=6");
      liveDeliveryState.status = "loaded";
      liveDeliveryState.items = Array.isArray(data?.events) ? data.events : [];
      liveDeliveryState.error = "";
      setLiveTelemetryStatus("Live telemetry loaded");
    } catch (error) {
      liveDeliveryState.status = Number(error.status || 0) === 401 ? "unauthenticated" : "error";
      liveDeliveryState.items = [];
      liveDeliveryState.error = error.message || "Live delivery telemetry unavailable.";
      setLiveTelemetryStatus(liveDeliveryState.status === "unauthenticated" ? "Live telemetry gated" : "Live telemetry unavailable");
    }
    render();
  }

  function suiteHref(path, searchParams) {
    const next = new URL(String(path || "").replace(/^\/+/, ""), suiteBase);
    next.searchParams.set("ws_id", wsId);
    Object.entries(searchParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      next.searchParams.set(key, String(value));
    });
    return `${next.pathname}${next.search}${next.hash}`;
  }

  function rootHref(path, searchParams) {
    const next = new URL(String(path || "").replace(/^\/+/, ""), rootBase);
    Object.entries(searchParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      next.searchParams.set(key, String(value));
    });
    return `${next.pathname}${next.search}${next.hash}`;
  }

  function suiteRedirect(path, searchParams) {
    window.location.href = suiteHref(path, searchParams);
  }

  function rootRedirect(path, searchParams) {
    window.location.href = rootHref(path, searchParams);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderText(selector, value) {
    document.querySelectorAll(`[data-bind="${selector}"]`).forEach((node) => {
      node.textContent = value;
    });
  }

  function renderList(selector, items, emptyText) {
    const node = document.querySelector(selector);
    if (!node) return;
    if (!items.length) {
      node.innerHTML = `<div class="list-entry"><strong>Nothing staged yet</strong><div class="entry-meta">${escapeHtml(emptyText)}</div></div>`;
      return;
    }
    node.innerHTML = items.map((item) => `
      <div class="list-entry">
        <strong>${escapeHtml(item.title || item.subject || item.name || "Untitled")}</strong>
        <div>${escapeHtml(item.excerpt || item.text || item.note || item.summary || "No detail provided.")}</div>
        <div class="entry-meta">${escapeHtml(item.source || item.status || item.audience || item.lane || "platform")} · ${escapeHtml(item.channel || item.at || item.to || "")}</div>
      </div>
    `).join("");
  }

  function rememberHandoff(entry) {
    state.handoffs.unshift({
      id: `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      source: "suite",
      channel: "mail",
      title: "Incoming mail handoff",
      excerpt: "",
      ...entry,
    });
    state.handoffs = state.handoffs.slice(0, 18);
    saveState();
    render();
  }

  function persistDraft(draft) {
    state.drafts.unshift({
      at: new Date().toISOString(),
      source: "compose studio",
      channel: "compose",
      ...draft,
    });
    state.drafts = state.drafts.slice(0, 18);
    saveState();
    render();
  }

  function persistCampaign(campaign) {
    state.campaigns.unshift({
      at: new Date().toISOString(),
      ...campaign,
    });
    state.campaigns = state.campaigns.slice(0, 18);
    saveState();
    render();
  }

  function persistOpsNote(note) {
    state.opsNotes.unshift({
      at: new Date().toISOString(),
      ...note,
    });
    state.opsNotes = state.opsNotes.slice(0, 18);
    saveState();
    render();
  }

  function stageCommandDraft(draft) {
    localStorage.setItem(launchDraftKey, JSON.stringify({ ws_id: wsId, ...draft }));
  }

  function routeToCommand(draft) {
    stageCommandDraft(draft);
    suiteRedirect("apps/command/index.html", {
      to: draft.to || "",
      subject: draft.subject || "",
      body: draft.text || "",
      text: draft.text || "",
      channel: draft.channel || "",
      status: draft.status || "",
      view: draft.view || "compose",
    });
  }

  function seedFromQuery() {
    const title = params.get("title") || params.get("subject") || "";
    const excerpt = params.get("excerpt") || params.get("text") || params.get("message") || "";
    const source = params.get("source") || "";
    const channel = params.get("channel") || "mail";
    if (!title && !excerpt && !source && params.get("bridge_import") !== "1") return;
    rememberHandoff({
      source: source || "suite route",
      channel,
      title: title || "Imported mail draft",
      excerpt: excerpt || "Suite handoff arrived without additional text.",
    });
  }

  function hydrateHubDraftInputs() {
    const mappings = [
      ["mailTo", "to"],
      ["mailSubject", "subject"],
      ["mailBody", "body"],
      ["mailChannel", "channel"],
      ["mailSource", "source"],
    ];
    mappings.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el || el.value) return;
      const value = params.get(key) || (key === "body" ? params.get("text") : "");
      if (value) el.value = value;
    });
  }

  function render() {
    renderText("handoffCount", String(state.handoffs.length));
    renderText("draftCount", String(state.drafts.length));
    renderText("campaignCount", String(state.campaigns.length));
    renderText("liveDeliveryCount", String(liveDeliveryState.items.length));
    renderList('[data-bind="recentHandoffs"]', state.handoffs.slice(0, 6), "Suite pushes from docs, rescue, and automation will appear here.");
    renderList('[data-bind="composeDrafts"]', state.drafts.slice(0, 6), "Compose drafts will show here once staged.");
    renderList('[data-bind="campaignQueue"]', state.campaigns.slice(0, 6), "Campaign batches will appear here once planned.");
    renderList('[data-bind="opsNotes"]', state.opsNotes.slice(0, 6), "Mail operations notes will appear here once recorded.");
    renderList('[data-bind="recentDeliveries"]', liveDeliveryRows(), liveDeliveryEmptyText());
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function injectRuntimeChrome() {
    if (document.getElementById("mailRuntimeBar")) return;
    const topbar = document.querySelector(".platform-topbar");
    const shell = document.querySelector(".platform-shell");
    if (!shell) return;

    const bar = document.createElement("section");
    bar.id = "mailRuntimeBar";
    bar.className = "platform-panel runtime-strip";
    bar.innerHTML = `
      <div class="status-strip">
        <span class="platform-kicker">Standalone runtime</span>
        <span class="mini-card runtime-pill">Workspace <strong>${escapeHtml(wsId)}</strong></span>
        <span class="mini-card runtime-pill" id="mailSyncStatus">Live runtime ready</span>
        <span class="mini-card runtime-pill" id="mailSkyeMailStatus">Live telemetry checking</span>
      </div>
      <div class="button-row">
        <button class="platform-button ghost" id="mailPushSkyeMailBtn" type="button">Export Workspace State</button>
        <button class="platform-button ghost" id="mailOpenSkyeMailKeysBtn" type="button">Open SkyeMail Keys</button>
      </div>
    `;
    if (topbar && topbar.nextSibling) shell.insertBefore(bar, topbar.nextSibling);
    else shell.prepend(bar);
  }

  function createLocalStorageProtocol() {
    let saveTimer = null;
    let syncStatusEl = null;
    let citadelStatusEl = null;

    function setStatus(text) {
      if (syncStatusEl) syncStatusEl.textContent = text;
    }

    function setCitadelStatus(text) {
      if (citadelStatusEl) citadelStatusEl.textContent = text;
    }

    async function load() {
      setStatus("Live runtime ready");
      setCitadelStatus("Live telemetry checking");
      render();
      return {
        ok: true,
        suiteMirror: true,
        model: {
          state: clone(state),
          deliveries: loadDeliveries(),
        },
      };
    }

    async function save() {
      saveState();
      setStatus("Saved in suite mirror");
      return { ok: true, suiteMirror: true };
    }

    function debouncedSave() {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        save().catch((error) => console.error("SkyeMail local suite save failed", error));
      }, 400);
    }

    function configure() {
      syncStatusEl = document.getElementById("mailSyncStatus");
      citadelStatusEl = document.getElementById("mailSkyeMailStatus");
      const exportBtn = document.getElementById("mailPushSkyeMailBtn");
      const openBtn = document.getElementById("mailOpenSkyeMailKeysBtn");
      if (exportBtn && !exportBtn.dataset.bound) {
        exportBtn.dataset.bound = "1";
        exportBtn.addEventListener("click", () => {
          downloadJson(`skymail-suite-state-${wsId}.json`, {
            exported_at: new Date().toISOString(),
            ws_id: wsId,
            state: clone(state),
            deliveries: loadDeliveries(),
          });
          setStatus("Suite state exported");
        });
      }
      if (openBtn && !openBtn.dataset.bound) {
        openBtn.dataset.bound = "1";
        openBtn.addEventListener("click", () => rootRedirect("keys.html"));
      }
    }

    return {
      configure,
      load,
      save,
      debouncedSave,
      setStatus,
      setCitadelStatus,
    };
  }

  function subscribeToSuiteBridge() {
    const deliver = (payload) => {
      if (!payload || typeof payload !== "object") return;
      const targetApp = String(payload.targetApp || payload.appId || payload.target_app || "").trim();
      if (targetApp && targetApp !== "SkyeMail") return;
      const meta = payload.payload || {};
      const context = payload.context || {};
      rememberHandoff({
        source: payload.sourceApp || payload.source || "suite",
        channel: context.channel_id || "mail",
        title: meta.subject || meta.title || payload.detail || payload.intent?.name || "Incoming suite intent",
        excerpt: meta.text || meta.message || payload.detail || "New suite event arrived in SkyeMail.",
      });
    };

    window.addEventListener("storage", (event) => {
      if (event.key !== bridgeKey || !event.newValue) return;
      try {
        deliver(JSON.parse(event.newValue));
      } catch {}
    });

    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== bridgeKey) return;
      deliver(event.data.payload);
    });
  }

  function bindStorageSignals() {
    window.addEventListener("storage", (event) => {
      if (event.key === stateKey) {
        const next = readJson(stateKey, initialState) || initialState;
        state.handoffs = Array.isArray(next.handoffs) ? next.handoffs : [];
        state.drafts = Array.isArray(next.drafts) ? next.drafts : [];
        state.campaigns = Array.isArray(next.campaigns) ? next.campaigns : [];
        state.opsNotes = Array.isArray(next.opsNotes) ? next.opsNotes : [];
        render();
        return;
      }
      if (event.key === deliveryKey) {
        render();
      }
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-action], [data-nav]") : null;
    if (!target) return;

    const nav = target.getAttribute("data-nav");
    if (nav) {
      const map = {
        hub: "index.html",
        mailbox: "apps/mailbox/index.html",
        templates: "apps/templates/index.html",
        campaigns: "apps/campaigns/index.html",
        ops: "apps/ops/index.html",
        command: "apps/command/index.html",
      };
      const next = map[nav];
      if (next) {
        event.preventDefault();
        suiteRedirect(next);
      }
      return;
    }

    const action = target.getAttribute("data-action");
    if (!action) return;

    if (action === "save-compose-draft") {
      event.preventDefault();
      const to = document.getElementById("mailTo")?.value.trim() || "";
      const subject = document.getElementById("mailSubject")?.value.trim() || "Untitled draft";
      const text = document.getElementById("mailBody")?.value.trim() || "";
      const channel = document.getElementById("mailChannel")?.value.trim() || "";
      const source = document.getElementById("mailSource")?.value.trim() || "compose studio";
      persistDraft({ to, subject, text, channel, source, status: "saving-live" });
      rememberHandoff({ title: subject, excerpt: text, source, channel: channel || "compose", status: "saving-live" });
      fetchSkyeMailApi("/gmail-draft-save", {
        method: "POST",
        body: {
          to,
          subject,
          text,
          html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
        },
      }).then((data) => {
        persistDraft({ to, subject, text, channel, source, status: "provider-draft-saved", provider_draft_id: data?.draft?.id || data?.draft?.draft_id || "" });
        storageProtocol?.setStatus?.("Provider draft saved");
      }).catch((error) => {
        persistDraft({ to, subject, text, channel, source, status: `provider-save-failed: ${error.message || "error"}` });
        storageProtocol?.setStatus?.("Provider draft save failed");
      });
      return;
    }

    if (action === "route-compose-to-command") {
      event.preventDefault();
      const to = document.getElementById("mailTo")?.value.trim() || "";
      const subject = document.getElementById("mailSubject")?.value.trim() || "Untitled draft";
      const text = document.getElementById("mailBody")?.value.trim() || "";
      const channel = document.getElementById("mailChannel")?.value.trim() || "";
      routeToCommand({ to, subject, text, channel, status: "Loaded compose draft into SkyeMail command workspace.", view: "compose" });
      return;
    }

    if (action === "save-campaign") {
      event.preventDefault();
      const title = document.getElementById("campaignName")?.value.trim() || "Mail campaign";
      const audience = document.getElementById("campaignAudience")?.value.trim() || "priority-segment";
      const summary = document.getElementById("campaignSummary")?.value.trim() || "";
      persistCampaign({ title, audience, summary, status: "recording-live" });
      createLiveHandoff("saas-customer-command", { title, subject:title, text:`${audience}\n\n${summary}`.trim(), channel:"campaigns", source:"skyemail-suite-campaign" }, "Suite campaign command")
        .then(() => {
          persistCampaign({ title, audience, summary, status: "recorded-in-saas" });
          storageProtocol?.setStatus?.("Campaign recorded in 0S");
        })
        .catch((error) => {
          persistCampaign({ title, audience, summary, status: `0s-record-failed: ${error.message || "error"}` });
          storageProtocol?.setStatus?.("Campaign 0S record failed");
        });
      return;
    }

    if (action === "route-campaign-to-command") {
      event.preventDefault();
      const title = document.getElementById("campaignName")?.value.trim() || "Mail campaign";
      const audience = document.getElementById("campaignAudience")?.value.trim() || "priority-segment";
      const summary = document.getElementById("campaignSummary")?.value.trim() || "";
      routeToCommand({
        subject: title,
        text: `${audience}\n\n${summary}`.trim(),
        status: "Loaded campaign brief into SkyeMail command workspace.",
        view: "compose",
      });
      return;
    }

    if (action === "save-ops-note") {
      event.preventDefault();
      const title = document.getElementById("opsTitle")?.value.trim() || "Mail ops note";
      const note = document.getElementById("opsNote")?.value.trim() || "";
      const status = document.getElementById("opsStatus")?.value.trim() || "watch";
      persistOpsNote({ title, note, status: "recording-live", lane_status: status });
      createLiveHandoff("founder-command-bridge", { title, subject:title, text:note, channel:"ops", source:"skyemail-suite-ops" }, "Suite ops command")
        .then(() => {
          persistOpsNote({ title, note, status: "recorded-in-command", lane_status: status });
          storageProtocol?.setStatus?.("Ops note recorded in 0S");
        })
        .catch((error) => {
          persistOpsNote({ title, note, status: `0s-record-failed: ${error.message || "error"}`, lane_status: status });
          storageProtocol?.setStatus?.("Ops note 0S record failed");
        });
      return;
    }

    if (action === "route-ops-to-command") {
      event.preventDefault();
      const title = document.getElementById("opsTitle")?.value.trim() || "Mail ops note";
      const note = document.getElementById("opsNote")?.value.trim() || "";
      routeToCommand({
        subject: title,
        text: note,
        status: "Loaded operations note into SkyeMail command workspace.",
        view: "settings",
      });
    }
  });

  function markSubnav() {
    document.querySelectorAll(".subnav a").forEach((node) => {
      if (node.getAttribute("data-page") === page) node.classList.add("is-active");
    });
  }

  storageProtocol = createLocalStorageProtocol();
  injectRuntimeChrome();
  storageProtocol.configure();
  seedFromQuery();
  hydrateHubDraftInputs();
  subscribeToSuiteBridge();
  bindStorageSignals();
  markSubnav();
  render();
  void refreshLiveDeliveries();
  void storageProtocol.load();

  window.SkyeMailSuiteRuntime = {
    wsId,
    page,
    state,
    suiteHref,
    rootHref,
    suiteRedirect,
    rootRedirect,
    routeToCommand,
    rememberHandoff,
    launchDraftKey,
    bridgeKey,
    rootBasePath: rootBase.pathname,
    suiteBasePath: suiteBase.pathname,
  };
})();
