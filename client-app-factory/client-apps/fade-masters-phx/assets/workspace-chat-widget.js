(function () {
  "use strict";

  const doc = document;
  const win = window;
  const CONFIG_KEY = "MetrAIyuxWorkspaceChatConfig";
  const API_KEY = "MetrAIyuxWorkspaceChat";
  const DEFAULT_DISCLAIMER = "Messages are tied to this workspace account and may be used for support, proof receipts, QA, and follow-up inside the client build lane.";

  if (win[API_KEY] && win[API_KEY].__mounted) return;

  const defaults = {
    workspaceId: "metraiyux-workspace",
    workspaceSlug: "metraiyux-workspace",
    clientName: "Workspace",
    appName: "Workspace App",
    launcherText: "Workspace chat",
    operatorName: "MetrAIyux Operator",
    welcomeText: "Send a note here. This thread is logged to the workspace lane.",
    accountDisclaimer: DEFAULT_DISCLAIMER,
    accent: "",
    apiBase: "",
    trackEventsToRelay: false,
    accessReply: "",
    accessTriggers: ["password", "access", "code", "unlock", "workspace"],
    passwordGate: null
  };

  function isPlainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function mergeConfig(base, incoming) {
    const next = { ...base };
    Object.keys(incoming || {}).forEach((key) => {
      const value = incoming[key];
      if (isPlainObject(value) && isPlainObject(next[key])) {
        next[key] = mergeConfig(next[key], value);
      } else if (value !== undefined) {
        next[key] = value;
      }
    });
    return next;
  }

  const config = mergeConfig(defaults, win[CONFIG_KEY] || {});
  const storageRoot = `metraiyux.workspaceChat.${config.workspaceId || config.workspaceSlug}`;
  const messagesKey = `${storageRoot}.messages`;
  const eventsKey = `${storageRoot}.events`;
  const relayKey = `${storageRoot}.relay`;
  let root = null;
  let panel = null;
  let form = null;
  let list = null;
  let input = null;
  let launcher = null;
  let gateNode = null;

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function loadMessages() {
    return safeParse(localStorage.getItem(messagesKey), []);
  }

  function loadEvents() {
    return safeParse(localStorage.getItem(eventsKey), []);
  }

  function loadRelayState() {
    return safeParse(localStorage.getItem(relayKey), {});
  }

  function saveRelayState(next) {
    save(relayKey, next);
  }

  function uid(prefix) {
    if (win.crypto && typeof win.crypto.randomUUID === "function") {
      return `${prefix}_${win.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clampText(value, max = 1200) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function cssValue(names) {
    const styles = getComputedStyle(doc.documentElement);
    for (const name of names) {
      const value = styles.getPropertyValue(name).trim();
      if (value) return value;
    }
    return "";
  }

  function normalizeHex(value) {
    const raw = String(value || "").trim();
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    return "";
  }

  function resolveAccent() {
    return normalizeHex(config.accent)
      || normalizeHex(cssValue(["--accent", "--color-accent", "--brand-accent", "--primary", "--gold", "--neon"]))
      || "#64d6ff";
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex) || "#64d6ff";
    const int = parseInt(normalized.slice(1), 16);
    return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
  }

  const accent = resolveAccent();
  const accentRgb = hexToRgb(accent);

  function track(eventType, metadata = {}) {
    const event = {
      id: uid("evt"),
      eventType,
      workspaceId: config.workspaceId,
      workspaceSlug: config.workspaceSlug,
      path: location.pathname,
      at: new Date().toISOString(),
      metadata
    };
    const events = loadEvents();
    events.push(event);
    save(eventsKey, events.slice(-250));
    win.dispatchEvent(new CustomEvent("workspace-chat:event", { detail: event }));
    return event;
  }

  function injectStyle() {
    if (doc.getElementById("metraiyux-workspace-chat-style")) return;
    const style = doc.createElement("style");
    style.id = "metraiyux-workspace-chat-style";
    style.textContent = `
      body.workspace-password-pending > :not(.metraiyux-chat-root):not(.metraiyux-password-gate):not(script):not(style) {
        visibility: hidden !important;
      }
      .metraiyux-chat-root,
      .metraiyux-password-gate {
        visibility: visible !important;
      }
      .metraiyux-chat-root {
        --mwc-accent: ${accent};
        --mwc-accent-rgb: ${accentRgb};
        --mwc-bg: rgba(8, 13, 20, 0.92);
        --mwc-panel: rgba(12, 18, 27, 0.9);
        --mwc-line: rgba(var(--mwc-accent-rgb), 0.34);
        --mwc-text: #f6fbff;
        --mwc-muted: rgba(231, 241, 248, 0.72);
        position: fixed;
        right: max(16px, env(safe-area-inset-right));
        bottom: max(16px, env(safe-area-inset-bottom));
        z-index: 2147483600;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--mwc-text);
      }
      .metraiyux-chat-launcher {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 48px;
        max-width: min(76vw, 280px);
        border: 1px solid rgba(var(--mwc-accent-rgb), 0.54);
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(7, 11, 18, 0.86), rgba(var(--mwc-accent-rgb), 0.2));
        color: var(--mwc-text);
        box-shadow: 0 0 18px rgba(var(--mwc-accent-rgb), 0.38), 0 16px 42px rgba(0, 0, 0, 0.36);
        cursor: pointer;
        padding: 10px 16px;
        font: 800 13px/1.1 inherit;
        letter-spacing: 0;
        backdrop-filter: blur(16px);
      }
      .metraiyux-chat-launcher span:first-child {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--mwc-accent);
        box-shadow: 0 0 14px rgba(var(--mwc-accent-rgb), 0.88);
        flex: 0 0 auto;
      }
      .metraiyux-chat-panel {
        position: absolute;
        right: 0;
        bottom: 62px;
        display: none;
        width: min(390px, calc(100vw - 24px));
        max-height: min(620px, calc(100vh - 96px));
        overflow: hidden;
        grid-template-rows: auto minmax(180px, 1fr) auto;
        border: 1px solid rgba(var(--mwc-accent-rgb), 0.42);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(8, 12, 19, 0.94), rgba(8, 13, 20, 0.88));
        box-shadow: 0 0 26px rgba(var(--mwc-accent-rgb), 0.32), 0 28px 80px rgba(0, 0, 0, 0.48);
        backdrop-filter: blur(20px);
      }
      .metraiyux-chat-root[data-open="true"] .metraiyux-chat-panel {
        display: grid;
      }
      .metraiyux-chat-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 16px 12px;
        border-bottom: 1px solid rgba(var(--mwc-accent-rgb), 0.18);
      }
      .metraiyux-chat-title {
        display: grid;
        gap: 4px;
      }
      .metraiyux-chat-title strong {
        font-size: 14px;
        line-height: 1.1;
      }
      .metraiyux-chat-title span,
      .metraiyux-chat-disclaimer {
        color: var(--mwc-muted);
        font-size: 11px;
        line-height: 1.4;
      }
      .metraiyux-chat-close,
      .metraiyux-gate-open-chat {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--mwc-text);
        cursor: pointer;
        font: 800 12px/1 inherit;
      }
      .metraiyux-chat-close {
        width: 34px;
        height: 34px;
      }
      .metraiyux-chat-messages {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(var(--mwc-accent-rgb), 0.75) rgba(255, 255, 255, 0.06);
      }
      .metraiyux-chat-messages::-webkit-scrollbar {
        width: 8px;
      }
      .metraiyux-chat-messages::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }
      .metraiyux-chat-messages::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(var(--mwc-accent-rgb), 0.64);
        box-shadow: 0 0 12px rgba(var(--mwc-accent-rgb), 0.72);
      }
      .metraiyux-chat-message {
        max-width: 86%;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--mwc-text);
        font-size: 13px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }
      .metraiyux-chat-message[data-role="visitor"] {
        align-self: flex-end;
        border-color: rgba(var(--mwc-accent-rgb), 0.34);
        background: rgba(var(--mwc-accent-rgb), 0.18);
      }
      .metraiyux-chat-message[data-role="operator"],
      .metraiyux-chat-message[data-role="system"] {
        align-self: flex-start;
      }
      .metraiyux-chat-message time {
        display: block;
        margin-top: 6px;
        color: rgba(232, 241, 247, 0.52);
        font-size: 10px;
      }
      .metraiyux-chat-foot {
        display: grid;
        gap: 10px;
        padding: 12px;
        border-top: 1px solid rgba(var(--mwc-accent-rgb), 0.18);
      }
      .metraiyux-chat-disclaimer {
        padding: 0 2px;
      }
      .metraiyux-chat-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
      }
      .metraiyux-chat-form input {
        min-width: 0;
        height: 42px;
        border: 1px solid rgba(var(--mwc-accent-rgb), 0.28);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--mwc-text);
        padding: 0 14px;
        font: 500 13px/1 inherit;
        outline: none;
      }
      .metraiyux-chat-form input:focus {
        border-color: rgba(var(--mwc-accent-rgb), 0.72);
        box-shadow: 0 0 0 3px rgba(var(--mwc-accent-rgb), 0.18);
      }
      .metraiyux-chat-form button,
      .metraiyux-gate-card button[type="submit"] {
        border: 0;
        border-radius: 999px;
        background: var(--mwc-accent, ${accent});
        color: #041018;
        cursor: pointer;
        font: 900 13px/1 inherit;
        padding: 0 16px;
        box-shadow: 0 0 18px rgba(var(--mwc-accent-rgb), 0.42);
      }
      .metraiyux-password-gate {
        --mwc-accent: ${accent};
        --mwc-accent-rgb: ${accentRgb};
        position: fixed;
        inset: 0;
        z-index: 2147483500;
        display: grid;
        place-items: center;
        padding: 20px;
        background:
          radial-gradient(circle at 22% 18%, rgba(var(--mwc-accent-rgb), 0.18), transparent 32%),
          rgba(1, 5, 10, 0.82);
        color: #f6fbff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        backdrop-filter: blur(16px);
      }
      .metraiyux-gate-card {
        width: min(440px, 100%);
        border: 1px solid rgba(var(--mwc-accent-rgb), 0.42);
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(10, 16, 24, 0.96), rgba(10, 16, 24, 0.88));
        box-shadow: 0 0 30px rgba(var(--mwc-accent-rgb), 0.3), 0 28px 88px rgba(0, 0, 0, 0.55);
        padding: 24px;
      }
      .metraiyux-gate-card h2 {
        margin: 0 0 8px;
        font-size: clamp(24px, 6vw, 34px);
        line-height: 1;
        letter-spacing: 0;
      }
      .metraiyux-gate-card p {
        margin: 0 0 16px;
        color: rgba(235, 246, 255, 0.76);
        line-height: 1.5;
      }
      .metraiyux-gate-card form {
        display: grid;
        gap: 10px;
      }
      .metraiyux-gate-card label {
        display: grid;
        gap: 8px;
        font-size: 12px;
        color: rgba(235, 246, 255, 0.7);
      }
      .metraiyux-gate-card input {
        width: 100%;
        min-height: 48px;
        border: 1px solid rgba(var(--mwc-accent-rgb), 0.34);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        padding: 0 12px;
        font-size: 16px;
        outline: none;
      }
      .metraiyux-gate-card input:focus {
        border-color: rgba(var(--mwc-accent-rgb), 0.78);
        box-shadow: 0 0 0 3px rgba(var(--mwc-accent-rgb), 0.18);
      }
      .metraiyux-gate-card button[type="submit"] {
        min-height: 46px;
      }
      .metraiyux-gate-open-chat {
        min-height: 38px;
        padding: 0 14px;
      }
      .metraiyux-gate-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
      }
      .metraiyux-gate-error {
        min-height: 18px;
        margin: 4px 0 0;
        color: #ffb7b7;
        font-size: 12px;
      }
      @media (max-width: 560px) {
        .metraiyux-chat-root {
          right: 12px;
          bottom: 12px;
        }
        .metraiyux-chat-panel {
          width: calc(100vw - 24px);
          max-height: calc(100vh - 92px);
        }
        .metraiyux-chat-launcher {
          max-width: calc(100vw - 24px);
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function makeMessage(role, body, metadata = {}) {
    return {
      id: uid("msg"),
      role,
      body: clampText(body, 1800),
      at: new Date().toISOString(),
      metadata
    };
  }

  function persistMessage(message) {
    const messages = loadMessages();
    messages.push(message);
    save(messagesKey, messages.slice(-120));
    return message;
  }

  function renderMessages() {
    if (!list) return;
    const messages = loadMessages();
    list.textContent = "";
    messages.forEach((message) => {
      const bubble = doc.createElement("div");
      bubble.className = "metraiyux-chat-message";
      bubble.dataset.role = message.role || "operator";
      const text = doc.createElement("div");
      text.textContent = message.body;
      const time = doc.createElement("time");
      time.dateTime = message.at;
      time.textContent = new Date(message.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      bubble.append(text, time);
      list.appendChild(bubble);
    });
    list.scrollTop = list.scrollHeight;
  }

  function addMessage(role, body, metadata = {}) {
    const message = persistMessage(makeMessage(role, body, metadata));
    renderMessages();
    return message;
  }

  function sendSystemMessage(body, metadata = {}) {
    const existing = loadMessages().slice(-3).some((message) => message.body === body);
    if (existing) return null;
    const message = addMessage(metadata.role || "operator", body, metadata);
    track(metadata.eventType || "message.system", { messageId: message.id, reason: metadata.reason || "manual" });
    return message;
  }

  function ensureWelcome() {
    if (loadMessages().length) return;
    persistMessage(makeMessage("operator", config.welcomeText || defaults.welcomeText, { kind: "welcome" }));
  }

  function apiUrl(path) {
    const base = String(config.apiBase || "").trim();
    if (!base) return "";
    return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
  }

  async function relayFetch(path, payload) {
    const url = apiUrl(path);
    if (!url) throw new Error("apiBase missing");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Relay13 returned ${response.status}`);
    return response.json();
  }

  async function syncVisitorMessage(message) {
    const relayUrl = apiUrl("api/v1/conversations");
    if (!relayUrl) {
      track("network.queued", { messageId: message.id, reason: "apiBase_missing" });
      return { ok: false, queued: true, reason: "apiBase_missing" };
    }
    const state = loadRelayState();
    try {
      if (state.conversation_id && state.visitor_token) {
        await relayFetch(`api/v1/conversations/${state.conversation_id}/messages`, {
          visitor_token: state.visitor_token,
          sender_name: "Workspace visitor",
          body: message.body,
          metadata: {
            workspace_id: config.workspaceId,
            local_message_id: message.id,
            source_url: location.href
          }
        });
        track("network.sent", { messageId: message.id, conversationId: state.conversation_id, route: "message" });
        return { ok: true, conversationId: state.conversation_id, route: "message" };
      }
      const created = await relayFetch("api/v1/conversations", {
        workspace: config.workspaceSlug,
        workspace_id: config.workspaceId,
        channel: "website-widget",
        customer_name: "Workspace visitor",
        subject: `${config.clientName || config.appName} workspace chat`,
        message: message.body,
        source_url: location.href,
        metadata: {
          local_message_id: message.id,
          app_name: config.appName
        }
      });
      saveRelayState(created);
      track("network.sent", { messageId: message.id, conversationId: created.conversation_id, route: "conversation" });
      return { ok: true, conversationId: created.conversation_id, route: "conversation" };
    } catch (error) {
      track("network.failed", { messageId: message.id, reason: error.message });
      return { ok: false, queued: true, reason: error.message };
    }
  }

  function isAccessQuestion(text) {
    if (!config.accessReply) return false;
    const normalized = String(text || "").toLowerCase();
    return (config.accessTriggers || defaults.accessTriggers).some((trigger) => normalized.includes(String(trigger).toLowerCase()));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const body = clampText(input.value, 1200);
    if (!body) return;
    input.value = "";
    const message = addMessage("visitor", body);
    track("message.sent", { messageId: message.id });
    const relayStatus = await syncVisitorMessage(message);
    win.setTimeout(() => {
      if (isAccessQuestion(body)) {
        const reply = addMessage("operator", config.accessReply, { kind: "access-reply", relayStatus });
        track("message.reply", { messageId: reply.id, kind: "access-reply" });
        return;
      }
      const replyBody = relayStatus && relayStatus.ok
        ? `Sent into the ${config.clientName || config.appName} live workspace lane. An operator can review it with this workspace account context.`
        : `Saved locally and queued for ${config.clientName || config.appName} workspace retry. Relay13 is live, but this app did not receive a live delivery receipt yet.`;
      const reply = addMessage("operator", replyBody, { kind: relayStatus && relayStatus.ok ? "relay-confirmation" : "queued-confirmation", relayStatus });
      track("message.reply", { messageId: reply.id, kind: relayStatus && relayStatus.ok ? "relay-confirmation" : "queued-confirmation" });
    }, 180);
  }

  function setOpen(open) {
    if (!root) return;
    root.dataset.open = open ? "true" : "false";
    launcher.setAttribute("aria-expanded", String(open));
    if (open) {
      track("widget.open");
      win.setTimeout(() => input && input.focus(), 80);
    } else {
      track("widget.close");
    }
  }

  function buildWidget() {
    root = doc.createElement("div");
    root.className = "metraiyux-chat-root";
    root.dataset.open = "false";
    root.innerHTML = `
      <section class="metraiyux-chat-panel" role="dialog" aria-label="${config.clientName} workspace chat">
        <header class="metraiyux-chat-head">
          <div class="metraiyux-chat-title">
            <strong>${config.clientName || config.appName}</strong>
            <span>${config.operatorName || "MetrAIyux Operator"}</span>
          </div>
          <button class="metraiyux-chat-close" type="button" aria-label="Close workspace chat">x</button>
        </header>
        <div class="metraiyux-chat-messages" data-chat-messages></div>
        <div class="metraiyux-chat-foot">
          <div class="metraiyux-chat-disclaimer">${config.accountDisclaimer || DEFAULT_DISCLAIMER}</div>
          <form class="metraiyux-chat-form" data-chat-form>
            <input data-chat-input type="text" autocomplete="off" placeholder="Message this workspace" aria-label="Message this workspace">
            <button type="submit">Send</button>
          </form>
        </div>
      </section>
      <button class="metraiyux-chat-launcher" type="button" aria-expanded="false">
        <span aria-hidden="true"></span>
        <span>${config.launcherText || "Workspace chat"}</span>
      </button>
    `;
    doc.body.appendChild(root);
    panel = root.querySelector(".metraiyux-chat-panel");
    form = root.querySelector("[data-chat-form]");
    list = root.querySelector("[data-chat-messages]");
    input = root.querySelector("[data-chat-input]");
    launcher = root.querySelector(".metraiyux-chat-launcher");
    form.addEventListener("submit", handleSubmit);
    launcher.addEventListener("click", () => setOpen(root.dataset.open !== "true"));
    root.querySelector(".metraiyux-chat-close").addEventListener("click", () => setOpen(false));
  }

  function gateStorage() {
    const gate = config.passwordGate || {};
    return gate.storage || "session";
  }

  function gateKey() {
    const gate = config.passwordGate || {};
    return gate.storageKey || `metraiyux.workspaceGate.${config.workspaceId || config.workspaceSlug}`;
  }

  function gateIsUnlocked() {
    const key = gateKey();
    try {
      return sessionStorage.getItem(key) === "unlocked" || localStorage.getItem(key) === "unlocked";
    } catch {
      return false;
    }
  }

  function storeGateUnlock() {
    const key = gateKey();
    try {
      if (gateStorage() === "local") localStorage.setItem(key, "unlocked");
      else sessionStorage.setItem(key, "unlocked");
    } catch {}
  }

  function unlockGate(source) {
    storeGateUnlock();
    doc.body.classList.remove("workspace-password-pending");
    if (gateNode) gateNode.remove();
    track("gate.unlock", { source });
  }

  function sendAccessThroughChat() {
    setOpen(true);
    const body = config.accessReply || "Ask the workspace owner for the access code.";
    sendSystemMessage(body, { eventType: "gate.password.sent", reason: "gate_request", role: "operator" });
  }

  function mountPasswordGate() {
    const gate = config.passwordGate;
    if (!gate || !gate.enabled) return;
    doc.body.classList.add("workspace-password-pending");
    if (gateIsUnlocked()) {
      unlockGate("stored-session");
      return;
    }
    gateNode = doc.createElement("div");
    gateNode.className = "metraiyux-password-gate";
    gateNode.setAttribute("role", "dialog");
    gateNode.setAttribute("aria-modal", "true");
    gateNode.innerHTML = `
      <div class="metraiyux-gate-card">
        <h2>${gate.title || "Preview workspace"}</h2>
        <p>${gate.prompt || "Enter the preview access code to unlock this screen."}</p>
        <form data-gate-form>
          <label>
            Preview access code
            <input data-gate-input type="password" autocomplete="current-password" required>
          </label>
          <button type="submit">Unlock workspace</button>
          <div class="metraiyux-gate-error" data-gate-error aria-live="polite"></div>
        </form>
        <div class="metraiyux-gate-actions">
          <button class="metraiyux-gate-open-chat" type="button" data-gate-chat>${gate.chatButtonText || "Send code through chat"}</button>
        </div>
      </div>
    `;
    doc.body.appendChild(gateNode);
    const gateForm = gateNode.querySelector("[data-gate-form]");
    const gateInput = gateNode.querySelector("[data-gate-input]");
    const gateError = gateNode.querySelector("[data-gate-error]");
    gateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = String(gateInput.value || "").trim();
      if (value === String(gate.password || "")) {
        unlockGate("password");
        return;
      }
      gateError.textContent = gate.errorText || "That code did not unlock this workspace.";
      gateInput.select();
      track("gate.attempt", { result: "failed" });
    });
    gateNode.querySelector("[data-gate-chat]").addEventListener("click", sendAccessThroughChat);
    win.setTimeout(() => gateInput.focus(), 80);
    track("gate.mount");
  }

  function exportLedger() {
    return {
      workspaceId: config.workspaceId,
      workspaceSlug: config.workspaceSlug,
      clientName: config.clientName,
      relay: loadRelayState(),
      messages: loadMessages(),
      events: loadEvents()
    };
  }

  function mount() {
    if (!doc.body) {
      doc.addEventListener("DOMContentLoaded", mount, { once: true });
      return;
    }
    injectStyle();
    ensureWelcome();
    buildWidget();
    renderMessages();
    mountPasswordGate();
    track("widget.mount", { apiBase: Boolean(config.apiBase), gate: Boolean(config.passwordGate && config.passwordGate.enabled) });
  }

  win[API_KEY] = {
    __mounted: true,
    config,
    open: () => setOpen(true),
    close: () => setOpen(false),
    track,
    sendSystemMessage,
    exportLedger
  };

  mount();
})();
