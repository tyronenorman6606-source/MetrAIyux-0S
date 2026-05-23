(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const bridge = () => window.MetrAIyuxGateBridge;
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));

  function renderCards(cards = []) {
    const root = $("gateCards");
    if (!root) return;
    root.innerHTML = cards.map((card) => `
      <article class="panel">
        <strong>${escapeHtml(card.name || card.id)}</strong>
        <small>Status: ${escapeHtml(card.status || "active")}</small>
        <small>Scope: ${escapeHtml(card.scope || "gate-card")}</small>
        <small>Source: ${escapeHtml(card.source || "session")}</small>
      </article>
    `).join("") || '<article class="panel"><strong>No gate cards</strong><small>Sign into the 0S/SkyGate session first.</small></article>';
  }

  function renderEvents(events = []) {
    const root = $("eventList");
    if (!root) return;
    root.innerHTML = events.slice(-30).reverse().map((event) => `
      <article class="event-row">
        <b>${escapeHtml(event.type)}</b>
        <small>${escapeHtml(event.at)} · ${escapeHtml(event.platform_id)} · ${escapeHtml(event.actor)}</small>
        <code>${escapeHtml(JSON.stringify(event.detail || {}, null, 2))}</code>
      </article>
    `).join("") || '<article class="event-row"><b>No events yet</b><small>Open a gated app or record a live check.</small></article>';
  }

  function render() {
    const api = bridge();
    const session = api?.current?.();
    const cards = api?.gateCards?.() || [];
    const events = api?.readEvents?.() || [];

    $("sessionState").textContent = session ? "Active" : "Missing";
    $("sessionActor").textContent = session?.actor || session?.email || "Unknown";
    $("cardCount").textContent = String(cards.length);
    $("eventCount").textContent = String(events.length);

    renderCards(cards);
    renderEvents(events);
  }

  function seedLocalProof() {
    if (!/^(localhost|127\.0\.0\.1|)$/i.test(location.hostname)) {
      bridge()?.record?.("skygate_local_proof_rejected", { reason: "not-localhost" });
      render();
      return;
    }
    bridge()?.persist?.({
      token: "METRAIYUX-0S-LOCAL-GATE-PROOF",
      source: "0s-skygate-local-proof",
      platform_id: "metraiyux-0s",
      usage_lane: "local-proof",
      actor: "local-operator",
      role: "admin",
      gate_cards: [
        { id: "0s-core", name: "0S Core", scope: "desktop-control" },
        { id: "fs27", name: "FS27 SkyGate", scope: "identity-auth" },
        { id: "0meg4kai", name: "0meg4kAI Security", scope: "security-governance" },
        { id: "skyerunners", name: "SkyeRunners", scope: "runner-orchestration" },
        { id: "omega", name: "Omega Runner Security", scope: "omega-control" }
      ]
    });
    render();
  }

  function recordHeartbeat() {
    const session = bridge()?.requireSession?.({ platformId: "metraiyux-0s-skygate", usageLane: "gate-control-plane" });
    bridge()?.record?.("skygate_control_plane_live_check", {
      session: session ? "active" : "missing",
      cards: bridge()?.gateCards?.().map((card) => card.id) || []
    }, session || undefined);
    render();
  }

  document.addEventListener("metraiyux:gate-event", render);
  window.addEventListener("storage", (event) => {
    if (event.key === "metraiyux.gate.events.v1" || event.key === "METRAIYUX_GATE_SESSION") render();
  });
  $("refreshGate")?.addEventListener("click", render);
  $("recordHeartbeat")?.addEventListener("click", recordHeartbeat);
  $("seedLocalProof")?.addEventListener("click", seedLocalProof);
  render();
})();
