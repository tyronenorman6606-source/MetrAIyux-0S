(() => {
  "use strict";

  const STORAGE_KEY = "skyeprofitconsole.neo_front.v3";
  const RUNTIME_BASE = "./api/runtime";
  const gate = globalThis.SkyeProfitGate || null;
  const statusColors = {
    draft: "#70a9ff",
    ready: "#27f5e7",
    approved: "#9dff7a",
    blocked: "#ff6464",
    dispatched: "#ffd85e"
  };
  const laneOrder = ["draft", "ready", "approved", "blocked", "dispatched"];
  const splitDefaults = [
    ["ae", 40],
    ["ops", 18],
    ["tax", 14],
    ["reserve", 13],
    ["reinvest", 15]
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const defaultState = () => ({
    selectedId: "pack-phoenix-sprint",
    splits: Object.fromEntries(splitDefaults),
    runtime: { online: false, counts: null, lastSync: null },
    packs: [
      {
        id: "pack-phoenix-sprint",
        label: "Phoenix conversion sprint",
        target: "AE-FlowPro",
        owner: "profit-ops",
        status: "ready",
        revenue: 13000,
        cost: 3900,
        chance: 67,
        heat: 82,
        notes: "Starter data. Replace it with a real offer lane after launch.",
        createdAt: new Date(Date.now() - 1000 * 60 * 48).toISOString()
      },
      {
        id: "pack-proof-wall",
        label: "Proof wall upsell",
        target: "SkyeProofx",
        owner: "audit-lane",
        status: "approved",
        revenue: 7200,
        cost: 1600,
        chance: 81,
        heat: 91,
        notes: "Turns verified proof artifacts into a paid client retention lane.",
        createdAt: new Date(Date.now() - 1000 * 60 * 21).toISOString()
      },
      {
        id: "pack-workforce",
        label: "Staffing command retainer",
        target: "Workforce Command",
        owner: "field-ae",
        status: "draft",
        revenue: 18500,
        cost: 7800,
        chance: 41,
        heat: 58,
        notes: "Needs tighter service boundary and final close sequence.",
        createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString()
      }
    ],
    proofEvents: [
      { id: "event-seed", type: "field_booted", category: "local", detail: "Neo-front profit field initialized with local starter packs.", createdAt: new Date().toISOString() }
    ],
    closeBriefs: []
  });

  let state = loadState();
  let animationTick = 0;
  let frameHandle = null;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || !Array.isArray(parsed.packs)) return defaultState();
      return {
        ...defaultState(),
        ...parsed,
        splits: { ...Object.fromEntries(splitDefaults), ...(parsed.splits || {}) },
        packs: parsed.packs,
        proofEvents: Array.isArray(parsed.proofEvents) ? parsed.proofEvents : [],
        closeBriefs: Array.isArray(parsed.closeBriefs) ? parsed.closeBriefs : []
      };
    } catch {
      return defaultState();
    }
  }

  function saveState(label = "autosaved") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
    const pill = $("#saveStatePill");
    if (pill) {
      pill.textContent = label;
      setTimeout(() => { pill.textContent = "autosaved"; }, 900);
    }
  }

  function addProof(type, detail, category = "local") {
    state.proofEvents.unshift({ id: uid("event"), type, category, detail, createdAt: new Date().toISOString() });
    state.proofEvents = state.proofEvents.slice(0, 80);
  }

  function selectedPack() {
    return state.packs.find((pack) => pack.id === state.selectedId) || state.packs[0] || null;
  }

  function grossProfit(pack) {
    return Number(pack?.revenue || 0) - Number(pack?.cost || 0);
  }

  function expectedProfit(pack) {
    return grossProfit(pack) * (Number(pack?.chance || 0) / 100);
  }

  function packMargin(pack) {
    const revenue = Number(pack?.revenue || 0);
    return revenue ? (grossProfit(pack) / revenue) * 100 : 0;
  }

  function paybackMultiple(pack) {
    const cost = Number(pack?.cost || 0);
    const revenue = Number(pack?.revenue || 0);
    if (cost <= 0) return revenue > 0 ? 99 : 0;
    return revenue / cost;
  }

  function packRiskFlags(pack) {
    const flags = [];
    const margin = packMargin(pack);
    const chance = Number(pack?.chance || 0);
    if (grossProfit(pack) <= 0) flags.push("direct cost is eating the offer");
    if (margin < 40) flags.push("margin under 40%");
    if (chance < 50) flags.push("close confidence under 50%");
    if (pack?.status === "blocked") flags.push("blocked lane needs owner review");
    if (!String(pack?.owner || "").trim()) flags.push("owner missing");
    if (!String(pack?.notes || "").trim()) flags.push("next-step notes missing");
    return flags.length ? flags.slice(0, 4) : ["clean enough to move"];
  }

  function nextMoneyMove(pack) {
    const margin = packMargin(pack);
    const chance = Number(pack?.chance || 0);
    if (grossProfit(pack) <= 0 || margin < 25) return "reprice before close";
    if (pack?.status === "blocked") return "clear blocker";
    if (chance >= 70 && ["ready", "approved"].includes(pack?.status)) return "ask for the close";
    if (chance < 50) return "tighten proof and decision criteria";
    if (margin < 45) return "protect margin";
    if (pack?.status === "draft") return "shape offer";
    return "advance to execution";
  }

  function packScore(pack) {
    const urgency = ["approved", "ready"].includes(pack?.status) ? 1.22 : pack?.status === "blocked" ? 0.58 : 1;
    const marginBoost = clamp(packMargin(pack), -20, 90) / 100;
    const heatBoost = clamp(Number(pack?.heat || 0), 0, 100) / 100;
    return Math.max(0, expectedProfit(pack)) * urgency * (1 + marginBoost * 0.34 + heatBoost * 0.22);
  }

  function metrics() {
    const totalRevenue = state.packs.reduce((sum, pack) => sum + Number(pack.revenue || 0), 0);
    const totalCost = state.packs.reduce((sum, pack) => sum + Number(pack.cost || 0), 0);
    const expected = state.packs.reduce((sum, pack) => sum + expectedProfit(pack), 0);
    const margin = totalRevenue ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const cashNow = state.packs
      .filter((pack) => ["ready", "approved", "dispatched"].includes(pack.status) && grossProfit(pack) > 0)
      .sort((a, b) => packScore(b) - packScore(a))
      .slice(0, 3)
      .reduce((sum, pack) => sum + expectedProfit(pack), 0);
    const blockedMargin = state.packs
      .filter((pack) => pack.status === "blocked" || grossProfit(pack) <= 0 || Number(pack.chance || 0) < 45)
      .reduce((sum, pack) => sum + Math.max(grossProfit(pack), 0), 0);
    return { totalRevenue, totalCost, expected, margin, cashNow, blockedMargin };
  }

  function renderMetrics() {
    const m = metrics();
    $("#metricBooked").textContent = money(m.totalRevenue);
    $("#metricExpected").textContent = money(m.expected);
    $("#metricMargin").textContent = `${Math.round(m.margin)}%`;
    $("#metricProof").textContent = String(state.proofEvents.length);
  }

  function renderLegend() {
    const legend = $("#fieldLegend");
    legend.innerHTML = laneOrder.map((lane) => `<span class="legend-chip"><i style="background:${statusColors[lane]}"></i>${lane}</span>`).join("");
  }

  function nodePosition(index, total, pack) {
    const angle = ((Math.PI * 2) / Math.max(total, 1)) * index - Math.PI / 2;
    const chanceFactor = clamp(Number(pack.chance || 50), 5, 100) / 100;
    const heatFactor = clamp(Number(pack.heat || 60), 10, 100) / 100;
    const radius = 29 + (chanceFactor * 10) + (heatFactor * 8);
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      angle
    };
  }

  function renderConstellation() {
    const container = $("#constellationNodes");
    container.innerHTML = "";
    state.packs.forEach((pack, index) => {
      const pos = nodePosition(index, state.packs.length, pack);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `field-node${pack.id === state.selectedId ? " active" : ""}`;
      button.style.left = `${pos.x}%`;
      button.style.top = `${pos.y}%`;
      button.dataset.id = pack.id;
      button.innerHTML = `<i style="color:${statusColors[pack.status] || statusColors.draft};background:currentColor"></i><b>${escapeHtml(pack.label)}</b><span>${money(pack.revenue)} · ${pack.chance}%</span>`;
      container.appendChild(button);
    });
  }

  function renderSplits() {
    const stack = $("#splitStack");
    const template = $("#splitTemplate");
    stack.innerHTML = "";
    Object.entries(state.splits).forEach(([name, value]) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.split = name;
      $("span", node).textContent = name;
      const input = $("input", node);
      input.value = value;
      $("b", node).textContent = `${value}%`;
      stack.appendChild(node);
    });
    renderReactorPreview();
  }

  function renderReactorPreview() {
    const pack = selectedPack();
    if (!pack) {
      $("#reactorPreview").textContent = "$0";
      $("#reactorComment").textContent = "No pack selected.";
      return;
    }
    const profit = Number(pack.revenue || 0) - Number(pack.cost || 0);
    const reinvestPercent = Number(state.splits.reinvest || 0);
    const take = profit * (reinvestPercent / 100);
    $("#reactorPreview").textContent = money(take);
    $("#reactorComment").textContent = `${pack.label} · ${reinvestPercent}% reinvest lane from ${money(profit)} gross profit.`;
  }

  function normalizeSplits() {
    const entries = Object.entries(state.splits);
    const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0) || 1;
    let remainder = 100;
    entries.forEach(([key, value], index) => {
      const next = index === entries.length - 1 ? remainder : Math.round((Number(value || 0) / total) * 100);
      state.splits[key] = clamp(next, 0, 100);
      remainder -= next;
    });
    saveState("splits normalized");
    renderSplits();
  }

  function renderSelected() {
    const pack = selectedPack();
    const card = $("#selectedPackCard");
    const status = $("#selectedStatus");
    if (!pack) {
      status.textContent = "none";
      card.innerHTML = "<p>Select a constellation node or create a new profit pack.</p>";
      return;
    }
    const profit = Number(pack.revenue || 0) - Number(pack.cost || 0);
    const expected = profit * (Number(pack.chance || 0) / 100);
    status.textContent = pack.status;
    card.innerHTML = `
      <h3>${escapeHtml(pack.label)}</h3>
      <p>${escapeHtml(pack.notes || "No operator notes captured.")}</p>
      <div class="specimen-grid">
        <div><span>Target</span><b>${escapeHtml(pack.target)}</b></div>
        <div><span>Owner</span><b>${escapeHtml(pack.owner || "unassigned")}</b></div>
        <div><span>Gross profit</span><b>${money(profit)}</b></div>
        <div><span>Expected</span><b>${money(expected)}</b></div>
      </div>
      <div class="card-actions">
        <button class="micro-button" data-pack-action="approve" data-id="${pack.id}" type="button">approve</button>
        <button class="micro-button" data-pack-action="execute" data-id="${pack.id}" type="button">execute</button>
        <button class="micro-button" data-pack-action="dispatch" data-id="${pack.id}" type="button">dispatch</button>
      </div>
    `;
    fillForm(pack, false);
    renderReactorPreview();
  }

  function renderLoom() {
    const loom = $("#loomColumns");
    loom.innerHTML = "";
    laneOrder.forEach((lane) => {
      const column = document.createElement("article");
      column.className = "loom-column";
      const packs = state.packs.filter((pack) => pack.status === lane);
      column.innerHTML = `<h3>${lane} · ${packs.length}</h3>`;
      if (!packs.length) {
        column.insertAdjacentHTML("beforeend", `<div class="empty-state">No packs in this lane.</div>`);
      } else {
        packs.forEach((pack) => {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "loom-card";
          card.dataset.id = pack.id;
          card.innerHTML = `<b>${escapeHtml(pack.label)}</b><span>${money(pack.revenue)} · ${pack.chance}% close · ${escapeHtml(pack.target)}</span>`;
          column.appendChild(card);
        });
      }
      loom.appendChild(column);
    });
  }

  function renderProof() {
    const feed = $("#proofFeed");
    if (!state.proofEvents.length) {
      feed.innerHTML = `<div class="empty-state">No proof events captured yet.</div>`;
      return;
    }
    feed.innerHTML = state.proofEvents.slice(0, 40).map((event) => `
      <article class="proof-event">
        <time>${new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
        <div><b>${escapeHtml(event.type)}</b><span>${escapeHtml(event.detail)} · ${escapeHtml(event.category)}</span></div>
      </article>
    `).join("");
  }

  function renderRuntime() {
    const orb = $("#runtimeOrb");
    const label = $("#runtimeStateLabel");
    const counts = $("#runtimeCounts");
    orb.classList.toggle("online", Boolean(state.runtime.online));
    orb.classList.toggle("offline", !state.runtime.online);
    label.textContent = state.runtime.online ? "Runtime live" : "Local app";
    if (state.runtime.counts) {
      counts.textContent = `${state.runtime.counts.review_pack_count || 0} review · ${state.runtime.counts.close_brief_count || 0} brief · ${state.runtime.counts.execution_item_count || 0} execution · ${state.runtime.counts.dispatch_item_count || 0} dispatch`;
    } else {
      counts.textContent = state.runtime.online ? "runtime connected" : "runtime unchecked";
    }
  }

  function moneyBoard() {
    const items = state.packs.map((pack) => ({
      pack,
      gross: grossProfit(pack),
      expected: expectedProfit(pack),
      margin: packMargin(pack),
      multiple: paybackMultiple(pack),
      move: nextMoneyMove(pack),
      score: packScore(pack),
      risks: packRiskFlags(pack)
    })).sort((a, b) => b.score - a.score);
    const selected = selectedPack();
    const fastest = items.find((item) => ["ready", "approved"].includes(item.pack.status) && item.gross > 0) || items[0] || null;
    return {
      items,
      selected,
      fastest,
      metrics: metrics(),
      lastBrief: state.closeBriefs[0] || null
    };
  }

  function renderMoney() {
    const board = moneyBoard();
    const fastest = board.fastest;
    $("#moneyFastest").textContent = fastest ? money(fastest.expected) : "$0";
    $("#moneyFastestLabel").textContent = fastest ? `${fastest.pack.label} · ${fastest.move}` : "Create a pack to rank fastest cash.";
    $("#moneyCashNow").textContent = money(board.metrics.cashNow);
    $("#moneyCashNowLabel").textContent = "Top ready or approved packs weighted by close odds.";
    $("#moneyBlocked").textContent = money(board.metrics.blockedMargin);
    $("#moneyBlockedLabel").textContent = "Gross margin trapped in blocked, weak, or underwater lanes.";
    $("#moneyPayback").textContent = board.selected ? `${paybackMultiple(board.selected).toFixed(1)}x` : "0.0x";
    $("#moneyPaybackLabel").textContent = board.selected ? `${board.selected.label} revenue over direct cost.` : "Select a pack to see payback.";

    const moves = $("#moneyMoves");
    if (!board.items.length) {
      moves.innerHTML = `<div class="empty-state">No money moves yet.</div>`;
    } else {
      moves.innerHTML = board.items.slice(0, 4).map((item, index) => `
        <button class="money-move${item.pack.id === state.selectedId ? " active" : ""}" type="button" data-id="${item.pack.id}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <b>${escapeHtml(item.pack.label)}</b>
          <em>${escapeHtml(item.move)} · ${money(item.expected)} expected · ${Math.round(item.margin)}% margin</em>
        </button>
      `).join("");
    }

    const card = $("#closeBriefCard");
    if (!board.lastBrief) {
      card.innerHTML = `
        <p class="microline">close brief</p>
        <h3>No brief generated yet.</h3>
        <p>Generate one from the selected pack to get the ask, next move, risk flags, split allocation, and runtime archive proof.</p>
      `;
      return;
    }
    const brief = board.lastBrief;
    card.innerHTML = `
      <p class="microline">latest close brief</p>
      <h3>${escapeHtml(brief.label)}</h3>
      <div class="brief-grid">
        <div><span>Ask</span><b>${money(brief.ask)}</b></div>
        <div><span>Expected</span><b>${money(brief.expectedProfit)}</b></div>
        <div><span>Margin</span><b>${Math.round(Number(brief.margin || 0))}%</b></div>
        <div><span>Payback</span><b>${Number(brief.paybackMultiple || 0).toFixed(1)}x</b></div>
      </div>
      <p>${escapeHtml(brief.action)} for ${escapeHtml(brief.target)}. Owner: ${escapeHtml(brief.owner)}. Decision deadline: ${escapeHtml(brief.deadline)}.</p>
      <ul>${(brief.risks || []).map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>
    `;
  }

  function renderAll() {
    renderMetrics();
    renderLegend();
    renderConstellation();
    renderSplits();
    renderSelected();
    renderMoney();
    renderLoom();
    renderProof();
    renderRuntime();
    drawField();
  }

  function fillForm(pack, overwrite = true) {
    if (!pack || !overwrite && document.activeElement && document.activeElement.closest("#packForm")) return;
    $("#packLabel").value = pack.label || "";
    $("#packOwner").value = pack.owner || "";
    $("#packTarget").value = pack.target || "AE-FlowPro";
    $("#packStatus").value = pack.status || "draft";
    $("#packRevenue").value = pack.revenue || 0;
    $("#packCost").value = pack.cost || 0;
    $("#packChance").value = pack.chance || 50;
    $("#chanceValue").textContent = `${pack.chance || 50}%`;
    $("#packNotes").value = pack.notes || "";
  }

  function packFromForm(existing = {}) {
    const revenue = Number($("#packRevenue").value || 0);
    const cost = Number($("#packCost").value || 0);
    const chance = Number($("#packChance").value || 0);
    return {
      ...existing,
      id: existing.id || uid("pack"),
      label: $("#packLabel").value.trim() || "Untitled profit pack",
      owner: $("#packOwner").value.trim() || "profit-ops",
      target: $("#packTarget").value,
      status: $("#packStatus").value,
      revenue,
      cost,
      chance,
      heat: clamp(Math.round((chance * 0.62) + ((revenue - cost) / Math.max(revenue, 1)) * 48), 8, 100),
      notes: $("#packNotes").value.trim(),
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function createPack(event) {
    event.preventDefault();
    const pack = packFromForm();
    state.packs.unshift(pack);
    state.selectedId = pack.id;
    addProof("profit_pack_forged", `${pack.label} entered the field at ${money(pack.revenue)} with ${pack.chance}% close probability.`, "local");
    saveState("pack forged");
    renderAll();
    pushPackToRuntime(pack);
  }

  function updateSelected() {
    const active = selectedPack();
    if (!active) return;
    const next = packFromForm(active);
    state.packs = state.packs.map((pack) => pack.id === active.id ? next : pack);
    addProof("profit_pack_rewritten", `${next.label} was rewritten inside the local field.`, "local");
    saveState("pack rewritten");
    renderAll();
  }

  function seedScenario() {
    const scenario = {
      id: uid("pack"),
      label: `Scenario ${state.packs.length + 1}: pressure close`,
      target: ["AE-FlowPro", "SkyeProofx", "MetrAIyux 0S", "SkyeLeadVault"][state.packs.length % 4],
      owner: "scenario-lane",
      status: ["draft", "ready", "approved"][state.packs.length % 3],
      revenue: 5200 + Math.round(Math.random() * 22000),
      cost: 900 + Math.round(Math.random() * 8500),
      chance: 32 + Math.round(Math.random() * 61),
      heat: 45 + Math.round(Math.random() * 52),
      notes: "Generated local scenario. Replace with a real close lane when ready.",
      createdAt: new Date().toISOString()
    };
    state.packs.unshift(scenario);
    state.selectedId = scenario.id;
    addProof("scenario_seeded", `${scenario.label} created as a local planning specimen.`, "local");
    saveState("scenario seeded");
    renderAll();
  }

  function clearState() {
    state = defaultState();
    addProof("local_state_reset", "Local neo-front app state was reset to starter packs.", "local");
    saveState("state reset");
    renderAll();
  }

  function exportState() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `skyeprofitconsole-state-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    addProof("state_exported", "The current local profit field was exported as JSON.", "local");
    saveState("state exported");
    renderAll();
  }

  function buildCloseBrief(pack) {
    const gross = grossProfit(pack);
    const expected = expectedProfit(pack);
    const margin = packMargin(pack);
    const deadline = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().slice(0, 10);
    const splitAllocation = Object.entries(state.splits).map(([name, percent]) => ({
      name,
      percent,
      amount: Math.round(gross * (Number(percent || 0) / 100))
    }));
    return {
      id: uid("brief"),
      packId: pack.id,
      label: pack.label,
      target: pack.target,
      owner: pack.owner || "profit-ops",
      ask: Number(pack.revenue || 0),
      directCost: Number(pack.cost || 0),
      grossProfit: gross,
      expectedProfit: expected,
      margin,
      paybackMultiple: paybackMultiple(pack),
      confidence: Number(pack.chance || 0),
      action: nextMoneyMove(pack),
      deadline,
      splitAllocation,
      risks: packRiskFlags(pack),
      notes: pack.notes || "",
      createdAt: new Date().toISOString()
    };
  }

  function generateCloseBrief() {
    const pack = selectedPack();
    if (!pack) return;
    const brief = buildCloseBrief(pack);
    state.closeBriefs.unshift(brief);
    state.closeBriefs = state.closeBriefs.slice(0, 24);
    addProof("close_brief_generated", `${pack.label} close brief generated with ${money(brief.expectedProfit)} expected profit and ${Math.round(brief.margin)}% margin.`, "local");
    saveState("brief generated");
    renderAll();
    pushCloseBriefToRuntime(brief);
  }

  async function runtimeRequest(path, options = {}) {
    const response = await fetch(`${RUNTIME_BASE}${path}`, {
      headers: { "content-type": "application/json", ...(gate?.headers?.() || {}), ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  async function syncRuntime() {
    try {
      const status = await runtimeRequest("/status");
      state.runtime = { online: true, counts: status, lastSync: new Date().toISOString() };
      addProof("runtime_sync", `Runtime connected: ${status.review_pack_count} review packs, ${status.close_brief_count || 0} close briefs, ${status.execution_item_count} execution items, ${status.dispatch_item_count} dispatch items.`, "runtime");
      saveState("runtime synced");
    } catch (error) {
      state.runtime = { online: false, counts: null, lastSync: new Date().toISOString() };
      addProof("runtime_offline", `Runtime not available from this launch mode: ${error.message}. Local app still works.`, "runtime");
      saveState("runtime offline");
    }
    renderAll();
  }

  async function pushCloseBriefToRuntime(brief) {
    try {
      const payload = await runtimeRequest("/close-briefs", {
        method: "POST",
        body: JSON.stringify(brief)
      });
      state.closeBriefs = state.closeBriefs.map((item) => item.id === brief.id ? { ...item, runtimeId: payload.close_brief?.id } : item);
      state.runtime.online = true;
      addProof("runtime_close_brief_archived", `${brief.label} close brief was archived into the same-folder runtime.`, "runtime");
      saveState("brief archived");
      await syncRuntime();
    } catch (error) {
      addProof("runtime_close_brief_skipped", `${brief.label} close brief stayed local because runtime was unavailable: ${error.message}.`, "runtime");
      saveState("brief local");
      renderAll();
    }
  }

  async function pushPackToRuntime(pack) {
    try {
      const grossProfit = Number(pack.revenue || 0) - Number(pack.cost || 0);
      const payload = await runtimeRequest("/close-review-packs", {
        method: "POST",
        body: JSON.stringify({
          label: pack.label,
          target: pack.target,
          notes: pack.notes,
          snapshot: {
            runtime: state.runtime.online ? "Runtime mode: connected" : "Runtime mode: local-only",
            auditScore: `${pack.chance} / 100 close confidence`,
            closePackCount: String(state.packs.length),
            capturedAt: new Date().toISOString()
          },
          review: {
            owner: pack.owner,
            status: pack.status,
            checkpoint: grossProfit > 0 ? "profit_positive" : "margin_blocked",
            notes: pack.notes
          },
          recommended_actions: [
            "Verify revenue and direct cost.",
            "Confirm owner has next action.",
            "Move to execution only after proof lane is clean."
          ]
        })
      });
      state.packs = state.packs.map((item) => item.id === pack.id ? { ...item, runtimeId: payload.review_pack?.id } : item);
      state.runtime.online = true;
      addProof("runtime_review_pack_archived", `${pack.label} was archived into the same-folder runtime.`, "runtime");
      saveState("runtime archived");
      await syncRuntime();
    } catch (error) {
      addProof("runtime_archive_skipped", `${pack.label} stayed local because runtime was unavailable: ${error.message}.`, "runtime");
      saveState("local only");
      renderAll();
    }
  }

  async function transitionPack(id, action) {
    const pack = state.packs.find((item) => item.id === id);
    if (!pack) return;
    const nextStatus = action === "approve" ? "approved" : action === "execute" ? "dispatched" : "dispatched";
    state.packs = state.packs.map((item) => item.id === id ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() } : item);
    addProof(`pack_${action}`, `${pack.label} moved through ${action}.`, "local");
    saveState(`pack ${action}`);
    renderAll();

    if (action === "execute" && pack.runtimeId) {
      try {
        const payload = await runtimeRequest(`/close-review-packs/${encodeURIComponent(pack.runtimeId)}/execution`, {
          method: "POST",
          body: JSON.stringify({ owner: pack.owner, target: pack.target, label: `${pack.label} execution`, notes: pack.notes, checkpoint: "execution_queued" })
        });
        state.packs = state.packs.map((item) => item.id === id ? { ...item, runtimeExecutionId: payload.execution_item?.id } : item);
        addProof("runtime_execution_queued", `${pack.label} execution queued in runtime.`, "runtime");
        saveState("runtime execution");
        await syncRuntime();
      } catch (error) {
        addProof("runtime_execution_skipped", `${pack.label} runtime execution failed: ${error.message}.`, "runtime");
        saveState("execution local");
      }
    }

    if (action === "dispatch" && pack.runtimeExecutionId) {
      try {
        await runtimeRequest(`/execution-board/${encodeURIComponent(pack.runtimeExecutionId)}/dispatch`, {
          method: "POST",
          body: JSON.stringify({ owner: pack.owner, target: pack.target, channel: "activation", status: "ready", checkpoint: "dispatch_ready", notes: pack.notes })
        });
        addProof("runtime_dispatch_queued", `${pack.label} dispatch queued in runtime.`, "runtime");
        saveState("runtime dispatch");
        await syncRuntime();
      } catch (error) {
        addProof("runtime_dispatch_skipped", `${pack.label} runtime dispatch failed: ${error.message}.`, "runtime");
        saveState("dispatch local");
      }
    }
  }

  function drawField() {
    const canvas = $("#profitFieldCanvas");
    const stage = $("#fieldStage");
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) {
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
    }
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(ratio, ratio);
    const sw = w / ratio;
    const sh = h / ratio;
    const scx = sw / 2;
    const scy = sh / 2;

    for (let ring = 0; ring < 7; ring += 1) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 216, 94, ${0.19 - ring * 0.018})`;
      ctx.lineWidth = ring === 0 ? 1.5 : 1;
      ctx.ellipse(scx, scy, 80 + ring * 48 + Math.sin(animationTick / 35 + ring) * 4, 52 + ring * 33, animationTick / 520 + ring * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    state.packs.forEach((pack, index) => {
      const pos = nodePosition(index, state.packs.length, pack);
      const x = (pos.x / 100) * sw;
      const y = (pos.y / 100) * sh;
      const color = statusColors[pack.status] || statusColors.draft;
      ctx.beginPath();
      ctx.strokeStyle = color.replace("#", "rgba(") === color ? color : hexToRgba(color, pack.id === state.selectedId ? .72 : .34);
      ctx.lineWidth = pack.id === state.selectedId ? 2 : 1;
      ctx.moveTo(scx, scy);
      ctx.quadraticCurveTo((x + scx) / 2 + Math.sin(animationTick / 40 + index) * 30, (y + scy) / 2 + Math.cos(animationTick / 42 + index) * 20, x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = hexToRgba(color, .22);
      ctx.arc(x, y, 20 + (Number(pack.heat || 50) / 100) * 22 + Math.sin(animationTick / 20 + index) * 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function animate() {
    animationTick += 1;
    drawField();
    frameHandle = requestAnimationFrame(animate);
  }

  function hexToRgba(hex, alpha) {
    const raw = hex.replace("#", "");
    const value = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function bindEvents() {
    $("#packForm").addEventListener("submit", createPack);
    $("#updateSelected").addEventListener("click", updateSelected);
    $("#seedScenario").addEventListener("click", seedScenario);
    $("#clearState").addEventListener("click", clearState);
    $("#exportState").addEventListener("click", exportState);
    $("#syncRuntime").addEventListener("click", syncRuntime);
    $("#normalizeSplits").addEventListener("click", normalizeSplits);
    $("#createReviewPack").addEventListener("click", () => $("#packForm").requestSubmit());
    $("#generateCloseBrief").addEventListener("click", generateCloseBrief);
    $("#packChance").addEventListener("input", (event) => { $("#chanceValue").textContent = `${event.target.value}%`; });

    $("#constellationNodes").addEventListener("click", (event) => {
      const node = event.target.closest(".field-node");
      if (!node) return;
      state.selectedId = node.dataset.id;
      saveState("selected");
      renderAll();
    });

    $("#loomColumns").addEventListener("click", (event) => {
      const card = event.target.closest(".loom-card");
      if (!card) return;
      state.selectedId = card.dataset.id;
      saveState("selected");
      renderAll();
    });

    $("#moneyMoves").addEventListener("click", (event) => {
      const move = event.target.closest(".money-move");
      if (!move) return;
      state.selectedId = move.dataset.id;
      saveState("money move selected");
      renderAll();
    });

    $("#selectedPackCard").addEventListener("click", (event) => {
      const action = event.target.closest("[data-pack-action]");
      if (!action) return;
      transitionPack(action.dataset.id, action.dataset.packAction);
    });

    $("#splitStack").addEventListener("input", (event) => {
      const input = event.target.closest("input");
      if (!input) return;
      const row = input.closest(".split-row");
      state.splits[row.dataset.split] = Number(input.value);
      $("b", row).textContent = `${input.value}%`;
      saveState("split changed");
      renderReactorPreview();
    });

    window.addEventListener("resize", drawField);
    window.addEventListener("beforeunload", () => {
      if (frameHandle) cancelAnimationFrame(frameHandle);
    });
  }

  async function boot() {
    if (gate?.requireSession) await gate.requireSession();
    bindEvents();
    renderAll();
    animate();
    setTimeout(syncRuntime, 450);
  }

  boot().catch((error) => {
    console.error("SkyeProfitConsole boot failed", error);
  });
})();
