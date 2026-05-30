/* /assets/app.js — Business Launch Kit (AZ) Pack */
/* global KAIXU_ZIP, JSZip */
(function() {
  "use strict";

  const APP = {
    name: "Business Launch Kit (AZ) Pack",
    buildId: "BLK-AZ-P13.1",
    version: "1.1.0",
    errorEndpoint: "/.netlify/functions/client-error-report",
    neonUpsertEndpoint: "/.netlify/functions/neon-lead-upsert",
    neonHealthEndpoint: "/.netlify/functions/neon-health",
    blobStoreEndpoint: "/.netlify/functions/blob-store-pack",
    errorHeaders: {
      "x-kaixu-app": "BusinessLaunchKitAZ",
      "x-kaixu-build": "BLK-AZ-P13"
    },
    storageKeys: {
      inputs: "blkaz_inputs_v1",
      checklist: "blkaz_checklist_v1",
      errors: "blkaz_errors_v1",
      errorQueue: "blkaz_error_queue_v1",
      neonCfg: "blkaz_neon_cfg_v1"
    }
  };

  let runtimeStatus = null;

  const CHECKLIST_ITEMS = [
    { id:"entity_type", title:"Choose entity type", badge:"Core", desc:"LLC / Corporation / Partnership — document the choice and why." },
    { id:"name_search", title:"Confirm business name", badge:"Core", desc:"Search availability; consider trademark search for brand." },
    { id:"registered_agent", title:"Registered agent plan", badge:"Core", desc:"Pick a registered agent if required for your entity." },
    { id:"file_azcc", title:"File formation (AZCC)", badge:"Core", desc:"Form the entity with AZ Corporation Commission (as applicable)." },
    { id:"get_ein", title:"Obtain EIN", badge:"Core", desc:"Get your federal EIN to bank and pay taxes." },
    { id:"banking", title:"Open business bank account", badge:"Core", desc:"Separate finances. Set signers and online access." },
    { id:"bookkeeping", title:"Set up bookkeeping categories", badge:"Core", desc:"Chart of accounts, receipt capture, monthly reconciliation routine." },
    { id:"tpt_review", title:"Review TPT licensing need", badge:"AZ", desc:"Determine if you need Transaction Privilege Tax registration." },
    { id:"city_licenses", title:"Check city licensing requirements", badge:"AZ", desc:"Home occupation, signage, local permits for your city." },
    { id:"insurance", title:"Insurance baseline", badge:"Ops", desc:"General liability, professional liability, auto, workers comp (if hiring)." },
    { id:"pricing", title:"Define offers + pricing", badge:"Ops", desc:"Clear packages, scope boundaries, deposit terms." },
    { id:"intake", title:"Client intake + scope template", badge:"Ops", desc:"Standardize discovery, documentation, and approvals." },
    { id:"invoice_flow", title:"Invoice + payment flow", badge:"Ops", desc:"Invoice template, payment processor, and late fee policy." },
    { id:"policies", title:"Privacy/terms starter drafted", badge:"Legal", desc:"Draft starter bullets and have counsel review." },
    { id:"domain_email", title:"Domain + business email", badge:"Web", desc:"Domain, email, and primary contact routes." },
    { id:"website_core", title:"Website with CTA + contact", badge:"Web", desc:"Offer clarity, contact form, mobile responsive." },
    { id:"gbp", title:"Google Business Profile", badge:"Local", desc:"Set up GBP, consistent NAP, photos, services." },
    { id:"analytics", title:"Analytics installed", badge:"Web", desc:"Basic analytics for conversion visibility." },
    { id:"launch", title:"Launch announcement + outreach", badge:"Go", desc:"Announce, email, socials, and outreach routine." }
  ];

  const el = (id) => document.getElementById(id);

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  
  function getNeonCfg() {
    return readJSON(APP.storageKeys.neonCfg, { dataApiUrl: "", jwt: "" });
  }

  function setNeonCfg(cfg) {
    writeJSON(APP.storageKeys.neonCfg, cfg);
  }

  async function neonHealthPing() {
    // Try server function first
    try {
      const res = await fetch(APP.neonHealthEndpoint, { method: "GET" });
      const js = await res.json().catch(() => ({}));
      return { mode: "function", ok: res.ok && !!js, detail: js };
    } catch (e) {
      // ignore, fall through
    }

    // Fallback: direct Data API from client config
    const cfg = getNeonCfg();
    if (!cfg.dataApiUrl || !cfg.jwt) return { mode: "client", ok: false, detail: { error: "Missing local Neon Data API config" } };

    const url = cfg.dataApiUrl.replace(/\/$/, "") + "/rest/v1/blkaz_leads?select=id&limit=1";
    try {
      const res = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + cfg.jwt, "Content-Type": "application/json" } });
      const text = await res.text();
      let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
      return { mode: "client", ok: res.ok, status: res.status, detail: parsed };
    } catch (e) {
      return { mode: "client", ok: false, detail: { error: String(e && e.message ? e.message : e) } };
    }
  }


  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getInputs() {
    const inputs = {
      businessName: el("businessName").value.trim(),
      city: el("city").value.trim(),
      industry: el("industry").value.trim(),
      ownersCount: Number(el("ownersCount").value || 1),
      hireEmployees: !!el("hireEmployees").checked
    };
    return inputs;
  }

  function setInputs(inputs) {
    el("businessName").value = inputs.businessName || "";
    el("city").value = inputs.city || "";
    el("industry").value = inputs.industry || "";
    el("ownersCount").value = Number(inputs.ownersCount || 1);
    el("hireEmployees").checked = !!inputs.hireEmployees;
  }

  function checklistState() {
    return readJSON(APP.storageKeys.checklist, {});
  }

  function saveChecklistState(state) {
    writeJSON(APP.storageKeys.checklist, state);
  }

  function computeProgress(state) {
    const total = CHECKLIST_ITEMS.length;
    const done = CHECKLIST_ITEMS.filter(it => !!state[it.id]).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }

  function renderChecklist() {
    const container = el("checklist");
    container.innerHTML = "";
    const state = checklistState();

    for (const item of CHECKLIST_ITEMS) {
      const row = document.createElement("div");
      row.className = "item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!state[item.id];
      cb.addEventListener("change", () => {
        const next = checklistState();
        next[item.id] = cb.checked;
        saveChecklistState(next);
        refreshSummary();
      });

      const meta = document.createElement("div");
      meta.className = "meta";
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = item.title;

      const desc = document.createElement("div");
      desc.className = "desc";
      desc.textContent = item.desc;

      meta.appendChild(title);
      meta.appendChild(desc);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = item.badge;

      row.appendChild(cb);
      row.appendChild(meta);
      row.appendChild(badge);

      container.appendChild(row);
    }
  }

  function fmtBool(v) {
    return v ? "Yes" : "No";
  }

  function refreshSummary() {
    const inputs = readJSON(APP.storageKeys.inputs, getInputs());
    const state = checklistState();
    const prog = computeProgress(state);

    const lines = [];
    lines.push(`Business: ${inputs.businessName || "—"}`);
    lines.push(`City: ${inputs.city || "—"}, AZ`);
    lines.push(`Industry: ${inputs.industry || "—"}`);
    lines.push(`Owners: ${Number(inputs.ownersCount || 1)}`);
    lines.push(`Hire employees: ${fmtBool(!!inputs.hireEmployees)}`);
    lines.push("");
    lines.push(`Checklist: ${prog.done} / ${prog.total} (${prog.pct}%)`);
    lines.push(`Build: ${APP.buildId} • v${APP.version}`);
    lines.push(`Time: ${new Date().toLocaleString()}`);

    el("reportSummary").textContent = lines.join("\n");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function generateZipPack() {
    const inputs = readJSON(APP.storageKeys.inputs, getInputs());
    const result = await KAIXU_ZIP.buildZipPack(inputs);
    const safeName = (result.ctx.businessName || "Business").replace(/[^a-z0-9]+/ig, "-").replace(/^-+|-+$/g, "");
    const ext = result.extension || "zip";
    const filename = `AZ-Launch-Pack-${safeName}.${ext}`;
    downloadBlob(result.blob, filename);

    // also log event locally
    pushLocalEvent({
      type: "zip_generated",
      at: new Date().toISOString(),
      file: filename,
      files: result.filenames,
      archiveFormat: result.archiveFormat || "zip",
      ctx: result.ctx
    });
    await saveRuntimePackActivity({
      type: "zip_generated",
      createdAt: new Date().toISOString(),
      file: filename,
      archiveFormat: result.archiveFormat || "zip",
      inputs,
      progress: computeProgress(checklistState())
    });
  }

  function pushLocalError(rec) {
    const errors = readJSON(APP.storageKeys.errors, []);
    errors.unshift(rec);
    errors.splice(30);
    writeJSON(APP.storageKeys.errors, errors);
  }

  function pushErrorQueue(rec) {
    const q = readJSON(APP.storageKeys.errorQueue, []);
    q.push(rec);
    writeJSON(APP.storageKeys.errorQueue, q);
  }

  function pushLocalEvent(rec) {
    // store in same errors list but marked as event (for diagnostics)
    const errors = readJSON(APP.storageKeys.errors, []);
    errors.unshift(rec);
    errors.splice(30);
    writeJSON(APP.storageKeys.errors, errors);
  }

  async function probeRuntimeLane() {
    try {
      const res = await fetch("/api/runtime/status", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      runtimeStatus = await res.json();
      return runtimeStatus;
    } catch (error) {
      runtimeStatus = null;
      return null;
    }
  }

  function renderRuntimeStatus(status) {
    const statusEl = el("runtimeLaneStatus");
    const countsEl = el("runtimeLaneCounts");
    if (!statusEl || !countsEl) return;

    if (!status || !status.ok) {
      statusEl.textContent = "Same-folder local runtime unavailable. Browser-local mode is still active.";
      countsEl.textContent = JSON.stringify({
        mode: "browser-local-only",
        leads: 0,
        launchPlans: 0,
        handoffPacks: 0,
        reviewBoard: null,
        executionBoard: null,
        dispatchBoard: null,
        workflowTimeline: null,
        packActivity: 0
      }, null, 2);
      renderHandoffArchive(null);
      renderReviewBoard(null);
      renderExecutionBoard(null);
      return;
    }

    statusEl.textContent = `Runtime ready: ${status.mode}`;
    countsEl.textContent = JSON.stringify({
      leads: status.leads?.total || 0,
      launchPlans: status.launchPlans?.total || 0,
      handoffPacks: status.handoffPacks?.total || 0,
      reviewBoard: status.reviewBoard || null,
      executionBoard: status.executionBoard || null,
      dispatchBoard: status.dispatchBoard || null,
      packActivity: status.packActivity?.total || 0,
      workflowTimeline: status.workflowTimeline || null,
      latestLeadAt: status.leads?.latestAt || null,
      latestPlanAt: status.launchPlans?.latestAt || null,
      latestHandoffAt: status.handoffPacks?.latestAt || null,
      latestPackAt: status.packActivity?.latestAt || null
    }, null, 2);
  }

  async function saveRuntimeLead(payload) {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js?.status?.ok) {
      runtimeStatus = js.status;
      renderRuntimeStatus(runtimeStatus);
    }
    return js;
  }

  async function saveRuntimeLaunchPlan(payload) {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/launch-plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js?.status?.ok) {
      runtimeStatus = js.status;
      renderRuntimeStatus(runtimeStatus);
    }
    return js;
  }

  async function saveRuntimePackActivity(payload) {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/pack-activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js?.status?.ok) {
      runtimeStatus = js.status;
      renderRuntimeStatus(runtimeStatus);
    }
    return js;
  }

  async function listRuntimeHandoffPacks() {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/handoff-packs", { method: "GET", cache: "no-store" });
    return res.json().catch(() => ({}));
  }

  async function listRuntimeReviewBoard() {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/review-board", { method: "GET", cache: "no-store" });
    return res.json().catch(() => ({}));
  }

  async function listRuntimeExecutionBoard() {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/execution-board", { method: "GET", cache: "no-store" });
    return res.json().catch(() => ({}));
  }

  async function listRuntimeDispatchBoard() {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/dispatch-board", { method: "GET", cache: "no-store" });
    return res.json().catch(() => ({}));
  }

  async function listRuntimeWorkflowTimeline() {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/workflow-timeline", { method: "GET", cache: "no-store" });
    return res.json().catch(() => ({}));
  }

  async function saveRuntimeHandoffPack(payload) {
    if (!runtimeStatus) return null;
    const res = await fetch("/api/runtime/handoff-packs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js?.status?.ok) {
      runtimeStatus = js.status;
      renderRuntimeStatus(runtimeStatus);
    }
    return js;
  }

  async function saveRuntimeHandoffReview(packId, payload) {
    if (!runtimeStatus || !packId) return null;
    const res = await fetch(`/api/runtime/handoff-packs/${encodeURIComponent(packId)}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js?.status?.ok) {
      runtimeStatus = js.status;
      renderRuntimeStatus(runtimeStatus);
    }
    return js;
  }

  async function saveRuntimeHandoffExecution(packId, payload) {
    if (!runtimeStatus || !packId) return null;
    const res = await fetch(`/api/runtime/handoff-packs/${encodeURIComponent(packId)}/execution`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js?.status?.ok) {
      runtimeStatus = js.status;
      renderRuntimeStatus(runtimeStatus);
    }
    return js;
  }

  async function saveRuntimeHandoffDispatch(packId, payload) {
    if (!runtimeStatus || !packId) return null;
    const res = await fetch(`/api/runtime/handoff-packs/${encodeURIComponent(packId)}/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(() => ({}));
    if (res.ok && js?.status?.ok) {
      runtimeStatus = js.status;
      renderRuntimeStatus(runtimeStatus);
    }
    return js;
  }

  function buildLaunchPlanPayload(extra = {}) {
    const inputs = readJSON(APP.storageKeys.inputs, getInputs());
    const checklist = checklistState();
    return {
      leadId: extra.leadId || "",
      inputs,
      checklist,
      reportSummary: el("reportSummary").textContent || "",
      source: "browser-launch-workspace"
    };
  }

  function inferHandoffTargetsFromChecklist(inputs, checklist, progress) {
    const targets = [];
    targets.push("SkyeMediaCenter");
    if (!checklist.website_core) targets.push("SkyeWebCreatorMax");
    if (!checklist.intake) targets.push("SkyeLeadVault");
    if (!checklist.invoice_flow || !checklist.bookkeeping) targets.push("Skye Profit Console");
    if (!checklist.launch || progress.pct < 100) targets.push("AE-FlowPro");
    if (inputs.hireEmployees) targets.push("skyeroutex-workforce-command-v0.4.0");
    if (!targets.length) targets.push("SkyeProofx");
    return [...new Set(targets)];
  }

  function buildHandoffPackPayload(plan) {
    const inputs = plan?.inputs || readJSON(APP.storageKeys.inputs, getInputs());
    const checklist = plan?.checklist || checklistState();
    const progress = plan?.progress || computeProgress(checklist);
    const label = (el("handoffLabel")?.value || "").trim() || `${inputs.businessName || "Launch"} Handoff`;
    const typedTargets = (el("handoffTargets")?.value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const downstreamTargets = typedTargets.length ? typedTargets : inferHandoffTargetsFromChecklist(inputs, checklist, progress);
    return {
      label,
      leadId: plan?.leadId || "",
      planId: plan?.planId || "",
      operatorNotes: (el("handoffNotes")?.value || "").trim(),
      inputs,
      checklist,
      downstreamTargets,
      sourcePlan: plan || buildLaunchPlanPayload(),
      source: "browser-system-handoff"
    };
  }

  function buildHandoffReviewPayload(statusOverride) {
    return {
      owner: (el("reviewOwner")?.value || "").trim(),
      status: statusOverride || (el("reviewStatus")?.value || "draft"),
      checkpoint: (el("reviewCheckpoint")?.value || "").trim(),
      notes: (el("reviewNotes")?.value || "").trim()
    };
  }

  function buildHandoffExecutionPayload(statusOverride, fallbackTargets = []) {
    const parsedTargets = (el("executionTargets")?.value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      owner: (el("executionOwner")?.value || "").trim(),
      status: statusOverride || (el("executionStatus")?.value || "queued"),
      checkpoint: (el("executionCheckpoint")?.value || "").trim(),
      nextAction: (el("executionNextAction")?.value || "").trim(),
      dueAt: (el("executionDueAt")?.value || "").trim(),
      notes: (el("executionNotes")?.value || "").trim(),
      targets: parsedTargets.length ? parsedTargets : fallbackTargets
    };
  }

  function buildHandoffDispatchPayload(statusOverride, fallbackTarget = "") {
    return {
      owner: (el("dispatchOwner")?.value || "").trim(),
      status: statusOverride || (el("dispatchStatus")?.value || "queued"),
      checkpoint: (el("dispatchCheckpoint")?.value || "").trim(),
      target: (el("dispatchTarget")?.value || "").trim() || fallbackTarget,
      channel: (el("dispatchChannel")?.value || "").trim(),
      nextAction: (el("dispatchNextAction")?.value || "").trim(),
      dueAt: (el("dispatchDueAt")?.value || "").trim(),
      notes: (el("dispatchNotes")?.value || "").trim()
    };
  }

  function renderHandoffArchive(listing) {
    const archiveEl = el("handoffArchive");
    if (!archiveEl) return;
    if (!listing || !listing.ok) {
      archiveEl.textContent = JSON.stringify({
        mode: runtimeStatus ? "runtime-ready" : "browser-local-only",
        total: 0,
        latest: null
      }, null, 2);
      return;
    }
    const latest = listing.handoffPacks?.[0] || null;
    archiveEl.textContent = JSON.stringify({
      total: listing.total || 0,
      latest: latest ? {
        packId: latest.packId,
        label: latest.label,
        readiness: latest.readiness,
        review: latest.review,
        downstreamTargets: latest.downstreamTargets,
        recommendedActions: latest.recommendedActions,
        createdAt: latest.createdAt
      } : null
    }, null, 2);
  }

  function renderReviewBoard(board) {
    const reviewEl = el("handoffReviewBoard");
    if (!reviewEl) return;
    if (!board || !board.ok) {
      reviewEl.textContent = JSON.stringify({
        mode: runtimeStatus ? "runtime-ready" : "browser-local-only",
        total: 0,
        summary: null
      }, null, 2);
      return;
    }
    const latest = board.handoffPacks?.[0] || null;
    reviewEl.textContent = JSON.stringify({
      total: board.summary?.total || 0,
      summary: board.summary || {},
      latest: latest ? {
        packId: latest.packId,
        label: latest.label,
        review: latest.review,
        downstreamTargets: latest.downstreamTargets
      } : null
    }, null, 2);
  }

  function renderExecutionBoard(board) {
    const executionEl = el("handoffExecutionBoard");
    if (!executionEl) return;
    if (!board || !board.ok) {
      executionEl.textContent = JSON.stringify({
        mode: runtimeStatus ? "runtime-ready" : "browser-local-only",
        total: 0,
        summary: null
      }, null, 2);
      return;
    }
    const latest = board.handoffPacks?.[0] || null;
    executionEl.textContent = JSON.stringify({
      total: board.summary?.total || 0,
      summary: board.summary || {},
      latest: latest ? {
        packId: latest.packId,
        label: latest.label,
        execution: latest.execution,
        downstreamTargets: latest.downstreamTargets
      } : null
    }, null, 2);
  }

  function renderDispatchBoard(board) {
    const dispatchEl = el("handoffDispatchBoard");
    if (!dispatchEl) return;
    if (!board || !board.ok) {
      dispatchEl.textContent = JSON.stringify({
        mode: runtimeStatus ? "runtime-ready" : "browser-local-only",
        total: 0,
        summary: null
      }, null, 2);
      return;
    }
    const latest = board.handoffPacks?.[0] || null;
    dispatchEl.textContent = JSON.stringify({
      total: board.summary?.total || 0,
      summary: board.summary || {},
      latest: latest ? {
        packId: latest.packId,
        label: latest.label,
        dispatch: latest.dispatch,
        downstreamTargets: latest.downstreamTargets
      } : null
    }, null, 2);
  }

  function renderWorkflowTimeline(board) {
    const timelineEl = el("handoffWorkflowTimeline");
    if (!timelineEl) return;
    if (!board || !board.ok) {
      timelineEl.textContent = JSON.stringify({
        mode: runtimeStatus ? "runtime-ready" : "browser-local-only",
        total: 0,
        summary: null
      }, null, 2);
      return;
    }
    timelineEl.textContent = JSON.stringify({
      total: board.summary?.total || 0,
      summary: board.summary || {},
      latest: board.events?.[0] || null
    }, null, 2);
  }

  async function refreshRuntimeHandoffArchive() {
    const listing = await listRuntimeHandoffPacks();
    renderHandoffArchive(listing);
    renderReviewBoard(await listRuntimeReviewBoard());
    renderExecutionBoard(await listRuntimeExecutionBoard());
    renderDispatchBoard(await listRuntimeDispatchBoard());
    renderWorkflowTimeline(await listRuntimeWorkflowTimeline());
    return listing;
  }

  async function postError(rec) {
    const payload = JSON.stringify(rec);
    const headers = Object.assign({
      "content-type": "application/json"
    }, APP.errorHeaders);

    const res = await fetch(APP.errorEndpoint, {
      method: "POST",
      headers,
      body: payload
    });
    if (!res.ok) throw new Error("Error report failed: HTTP " + res.status);
    return res.json().catch(() => ({ ok:true }));
  }

  async function reportClientError(kind, err, extra) {
    try {
      const rec = {
        kind,
        message: (err && err.message) ? String(err.message) : String(err || "Unknown error"),
        stack: (err && err.stack) ? String(err.stack) : null,
        href: location.href,
        ua: navigator.userAgent,
        at: new Date().toISOString(),
        buildId: APP.buildId,
        version: APP.version,
        extra: extra || null
      };
      pushLocalError(rec);

      if (navigator.onLine) {
        try {
          await postError(rec);
        } catch (e) {
          pushErrorQueue(rec);
        }
      } else {
        pushErrorQueue(rec);
      }

      updateDiagnostics();
    } catch {
      // swallow, never crash user flow
    }
  }

  async function flushErrorQueue() {
    const q = readJSON(APP.storageKeys.errorQueue, []);
    if (!q.length) return { sent:0 };
    const remaining = [];
    let sent = 0;

    for (const rec of q) {
      try {
        await postError(rec);
        sent += 1;
      } catch (e) {
        remaining.push(rec);
      }
    }
    writeJSON(APP.storageKeys.errorQueue, remaining);
    updateDiagnostics();
    return { sent, remaining: remaining.length };
  }

  function exportProgressJson() {
    const payload = {
      app: APP,
      inputs: readJSON(APP.storageKeys.inputs, getInputs()),
      checklist: checklistState(),
      progress: computeProgress(checklistState()),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `BLK-AZ-Progress-${APP.buildId}.json`);
  }

  function markCoreDone() {
    const state = checklistState();
    for (const it of CHECKLIST_ITEMS) {
      if (it.badge === "Core") state[it.id] = true;
    }
    saveChecklistState(state);
    renderChecklist();
    refreshSummary();
  }

  function resetLocalData() {
    localStorage.removeItem(APP.storageKeys.inputs);
    localStorage.removeItem(APP.storageKeys.checklist);
    localStorage.removeItem(APP.storageKeys.errors);
    localStorage.removeItem(APP.storageKeys.errorQueue);
    location.reload();
  }

  // PDF export (jsPDF)
  async function loadImageDataURL(path) {
    const res = await fetch(path);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  }

  function chunkText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function buildPortableSummary(inputs, prog, state) {
    const lines = [
      "Business Launch Kit (AZ) Pack - Summary",
      `Build: ${APP.buildId} v${APP.version}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      `Business name: ${inputs.businessName || "-"}`,
      `City: ${(inputs.city || "-")}, AZ`,
      `Industry: ${inputs.industry || "-"}`,
      `Owners count: ${Number(inputs.ownersCount || 1)}`,
      `Hire employees: ${inputs.hireEmployees ? "Yes" : "No"}`,
      `Checklist progress: ${prog.done} / ${prog.total} (${prog.pct}%)`,
      "",
      "Checklist Snapshot"
    ];

    for (const it of CHECKLIST_ITEMS) {
      lines.push(`${state[it.id] ? "[x]" : "[ ]"} [${it.badge}] ${it.title}`);
    }

    lines.push("");
    lines.push("Operational guidance only. Review with a licensed professional.");
    return lines.join("\n");
  }

  async function exportPdf() {
    const inputs = readJSON(APP.storageKeys.inputs, getInputs());
    const state = checklistState();
    const prog = computeProgress(state);
    const safeName = (inputs.businessName || "Business").replace(/[^a-z0-9]+/ig, "-").replace(/^-+|-+$/g, "");

    if (!window.jspdf || !window.jspdf.jsPDF) {
      const text = buildPortableSummary(inputs, prog, state);
      downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `BLK-AZ-Summary-${safeName}.txt`);
      await saveRuntimePackActivity({
        type: "summary_exported",
        createdAt: new Date().toISOString(),
        file: `BLK-AZ-Summary-${safeName}.txt`,
        archiveFormat: "plain-text",
        inputs,
        progress: prog
      });
      return;
    }
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({ unit:"pt", format:"letter" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Background wash
    doc.setFillColor(10, 4, 16);
    doc.rect(0, 0, w, h, "F");

    // Watermark (logo, large, low opacity)
    try {
      const logoData = await loadImageDataURL("/assets/logo.png");
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.10 }));
      const wmW = Math.min(520, w * 0.78);
      const wmH = wmW * 0.62;
      doc.addImage(logoData, "PNG", (w - wmW) / 2, (h - wmH) / 2, wmW, wmH);
      doc.restoreGraphicsState();

      // Header logo
      const headerW = 86;
      const headerH = headerW * 0.62;
      doc.addImage(logoData, "PNG", 40, 36, headerW, headerH);
    } catch (e) {
      // fallback watermark text
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.10 }));
      doc.setTextColor(245, 200, 75);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(64);
      doc.text("SKYES OVER LONDON", w/2, h/2, { align:"center" });
      doc.restoreGraphicsState();
    }

    // Header
    doc.setTextColor(245, 200, 75);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Business Launch Kit (AZ) Pack — Summary", 140, 56);

    doc.setTextColor(244, 238, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Build: ${APP.buildId} • v${APP.version} • ${new Date().toLocaleString()}`, 140, 74);

    // Divider
    doc.setDrawColor(196, 162, 255);
    doc.setLineWidth(1);
    doc.line(40, 96, w - 40, 96);

    let y = 122;

    // Inputs box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(245, 200, 75);
    doc.text("Business Inputs", 40, y);
    y += 14;

    doc.setTextColor(244, 238, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const inputLines = [
      `Business name: ${inputs.businessName || "—"}`,
      `City: ${inputs.city || "—"}, AZ`,
      `Industry: ${inputs.industry || "—"}`,
      `Owners count: ${Number(inputs.ownersCount || 1)}`,
      `Hire employees: ${inputs.hireEmployees ? "Yes" : "No"}`,
      `Checklist progress: ${prog.done} / ${prog.total} (${prog.pct}%)`
    ];
    for (const line of inputLines) {
      doc.text(line, 40, y);
      y += 14;
    }
    y += 6;

    // Checklist list
    doc.setTextColor(245, 200, 75);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Checklist Snapshot", 40, y);
    y += 14;

    doc.setTextColor(244, 238, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    for (const it of CHECKLIST_ITEMS) {
      const checked = !!state[it.id];
      const mark = checked ? "☑" : "☐";
      const line = `${mark} [${it.badge}] ${it.title}`;
      const nextY = y + 12;
      if (nextY > h - 70) {
        doc.addPage();
        doc.setFillColor(10, 4, 16);
        doc.rect(0, 0, w, h, "F");
        y = 60;
      }
      doc.text(line, 44, y);
      y += 12;
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(244, 238, 255);
    doc.text("Operational guidance & templates — not legal/tax advice. Review with a licensed professional.", 40, h - 36);

    doc.save(`BLK-AZ-Summary-${safeName}.pdf`);
    await saveRuntimePackActivity({
      type: "summary_exported",
      createdAt: new Date().toISOString(),
      file: `BLK-AZ-Summary-${safeName}.pdf`,
      archiveFormat: "pdf",
      inputs,
      progress: prog
    });
  }

  // Diagnostics UI
  function updateDiagnostics() {
    const status = {
      app: APP,
      online: navigator.onLine,
      time: new Date().toISOString(),
      jszipLoaded: typeof JSZip !== "undefined",
      jspdfLoaded: !!(window.jspdf && window.jspdf.jsPDF),
      localFallbacks: {
        zipPack: typeof JSZip === "undefined",
        pdfSummary: !(window.jspdf && window.jspdf.jsPDF)
      },
      localStorage: (() => {
        try {
          const k = "__t";
          localStorage.setItem(k, "1");
          localStorage.removeItem(k);
          return true;
        } catch {
          return false;
        }
      })(),
      serviceWorker: (() => {
        return {
          supported: "serviceWorker" in navigator,
          controller: !!navigator.serviceWorker?.controller
        };
      })(),
      progress: computeProgress(checklistState()),
      errorQueueSize: readJSON(APP.storageKeys.errorQueue, []).length,
      neonCfg: getNeonCfg(),
      runtimeStatus
    };

    const errors = readJSON(APP.storageKeys.errors, []);

    el("diagStatus").textContent = JSON.stringify(status, null, 2);
    el("diagErrors").textContent = JSON.stringify(errors, null, 2);
  }

  async function selfTest() {
    const results = [];
    const push = (ok, msg, extra) => results.push({ ok, msg, extra: extra || null });

    try {
      push(true, "JS runtime OK");
      push(typeof JSZip !== "undefined" || !!KAIXU_ZIP, "ZIP path available", typeof JSZip !== "undefined" ? "jszip" : "portable-text");
      push(!!(window.jspdf && window.jspdf.jsPDF) || true, "PDF path available", !!(window.jspdf && window.jspdf.jsPDF) ? "jspdf" : "portable-text");
      push(typeof KAIXU_ZIP !== "undefined", "zip helper present");

      // LocalStorage write/read
      try {
        const k = "__selftest";
        localStorage.setItem(k, JSON.stringify({ t: Date.now() }));
        const v = localStorage.getItem(k);
        localStorage.removeItem(k);
        push(!!v, "localStorage read/write");
      } catch (e) {
        push(false, "localStorage read/write", String(e));
      }

      // Build a small zip
      try {
        const r = await KAIXU_ZIP.buildZipPack({ businessName:"SelfTest", city:"Phoenix", industry:"Test", ownersCount:1, hireEmployees:false });
        push(!!r.blob, "Archive generation", r.archiveFormat || "zip");
      } catch (e) {
        push(false, "Archive generation", String(e));
      }

      // Error endpoint reachability (non-failing)
      try {
        const ping = {
          kind: "selftest_ping",
          message: "Self-test ping",
          at: new Date().toISOString(),
          href: location.href,
          ua: navigator.userAgent,
          buildId: APP.buildId,
          version: APP.version
        };
        if (navigator.onLine) {
          await postError(ping);
          push(true, "Error endpoint reachable (POST)");
        } else {
          push(true, "Offline: skipped endpoint test");
        }
      } catch (e) {
        push(false, "Error endpoint reachable (POST)", String(e));
      }

      push(true, "Self-test completed");
    } catch (e) {
      push(false, "Self-test exception", String(e));
    }

    return results;
  }

  // PWA install
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = el("btnInstall");
    btn.disabled = false;
  });

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    el("btnInstall").disabled = true;
  }

  // Starfield (SVS vibe)
  function startStarfield() {
    const canvas = el("starfield");
    const ctx = canvas.getContext("2d", { alpha:true });
    let w = 0, h = 0, dpr = 1;
    const stars = [];

    function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr,0,0,dpr,0,0);

      stars.length = 0;
      const count = Math.floor((w*h) / 9000);
      for (let i=0;i<count;i++) {
        stars.push({
          x: Math.random()*w,
          y: Math.random()*h,
          r: Math.random()*1.6 + 0.2,
          v: Math.random()*0.18 + 0.04,
          a: Math.random()*0.6 + 0.15,
          hue: Math.random()<0.18 ? "gold" : "violet"
        });
      }
    }

    function tick() {
      ctx.clearRect(0,0,w,h);

      // soft nebula glows
      const g1 = ctx.createRadialGradient(w*0.2, h*0.15, 0, w*0.2, h*0.15, Math.max(w,h)*0.65);
      g1.addColorStop(0, "rgba(124,44,255,0.18)");
      g1.addColorStop(1, "rgba(124,44,255,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0,0,w,h);

      const g2 = ctx.createRadialGradient(w*0.85, h*0.18, 0, w*0.85, h*0.18, Math.max(w,h)*0.55);
      g2.addColorStop(0, "rgba(245,200,75,0.12)");
      g2.addColorStop(1, "rgba(245,200,75,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0,0,w,h);

      for (const s of stars) {
        s.y += s.v;
        if (s.y > h + 10) {
          s.y = -10;
          s.x = Math.random()*w;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        if (s.hue === "gold") ctx.fillStyle = `rgba(245,200,75,${s.a})`;
        else ctx.fillStyle = `rgba(183,132,255,${s.a})`;
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize, { passive:true });
    resize();
    tick();
  }

  
  function encodeForm(data) {
    return Object.keys(data)
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k] ?? ""))
      .join("&");
  }

  async function upsertLead(payload) {
    // Try server function first
    try {
      const res = await fetch(APP.neonUpsertEndpoint, {
        method: "POST",
        headers: Object.assign({ "content-type": "application/json" }, APP.errorHeaders),
        body: JSON.stringify(payload)
      });
      const js = await res.json().catch(() => ({}));
      if (res.ok && js && js.ok) return { mode: "function", ok: true, detail: js };
      return { mode: "function", ok: false, detail: js };
    } catch (e) {
      // fall through
    }

    // Fallback: direct Data API from client config
    const cfg = getNeonCfg();
    if (!cfg.dataApiUrl || !cfg.jwt) return { mode: "client", ok: false, detail: { error: "Missing local Neon Data API config" } };

    const url = cfg.dataApiUrl.replace(/\/$/, "") + "/rest/v1/blkaz_leads";
    const row = {
      lead_name: payload.lead?.name || null,
      lead_email: payload.lead?.email || null,
      lead_phone: payload.lead?.phone || null,
      lead_company: payload.lead?.company || null,
      lead_message: payload.lead?.message || null,

      business_name: payload.inputs?.businessName || "Unnamed Business",
      city: payload.inputs?.city || "Phoenix",
      industry: payload.inputs?.industry || "General",
      owners_count: Number(payload.inputs?.ownersCount || 1),
      hire_employees: !!payload.inputs?.hireEmployees,

      report_summary: payload.report_summary || null,
      checklist: payload.checklist || {},

      app_build_id: payload.app?.buildId || null,
      app_version: payload.app?.version || null,
      user_agent: payload.app?.ua || null,
      page_href: payload.app?.href || null
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Authorization": "Bearer " + cfg.jwt, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify(row)
      });
      const text = await res.text();
      let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
      return { mode: "client", ok: res.ok, status: res.status, detail: parsed };
    } catch (e) {
      return { mode: "client", ok: false, detail: { error: String(e && e.message ? e.message : e) } };
    }
  }

  async function handleLeadSubmit() {
    const inputs = readJSON(APP.storageKeys.inputs, getInputs());
    const state = checklistState();

    const lead = {
      name: el("leadName").value.trim(),
      email: el("leadEmail").value.trim(),
      phone: el("leadPhone").value.trim(),
      company: el("leadCompany").value.trim(),
      message: el("leadMessage").value.trim()
    };

    const payload = {
      lead,
      inputs,
      report_summary: el("reportSummary").textContent || "",
      checklist: state,
      app: { buildId: APP.buildId, version: APP.version, ua: navigator.userAgent, href: location.href }
    };

    const localLead = await saveRuntimeLead({
      lead,
      inputs,
      checklist: state,
      reportSummary: payload.report_summary,
      source: "browser-lead-form"
    });
    const localPlan = await saveRuntimeLaunchPlan({
      ...buildLaunchPlanPayload({ leadId: localLead?.lead?.leadId || "" }),
      source: "browser-lead-form"
    });
    const result = await upsertLead(payload);
    pushLocalEvent({ type: "lead_upsert", at: new Date().toISOString(), result, localLead, localPlan });

    // Always submit Netlify form via AJAX (works in Drop mode)
    const formData = { "form-name": "lead", name: lead.name, email: lead.email, phone: lead.phone, company: lead.company, message: lead.message };
    await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: encodeForm(formData) });

    pushLocalEvent({ type: "lead_form_submitted", at: new Date().toISOString() });
    updateDiagnostics();
    return result;
  }

  // Wire up UI

  async function init() {
    el("buildId").textContent = APP.buildId;

    // Load saved inputs
    const saved = readJSON(APP.storageKeys.inputs, null);
    if (saved) setInputs(saved);

    renderChecklist();
    refreshSummary();

    el("btnSave").addEventListener("click", () => {
      const inputs = getInputs();
      writeJSON(APP.storageKeys.inputs, inputs);
      refreshSummary();
      pushLocalEvent({ type:"inputs_saved", at:new Date().toISOString(), inputs });
      updateDiagnostics();
    });

    el("btnGenerateZip").addEventListener("click", async () => {
      try {
        await generateZipPack();
      } catch (e) {
        await reportClientError("zip_generation", e);
        alert("ZIP generation failed. Open Diagnostics for details.");
      }
    });

    el("btnExportPdf").addEventListener("click", async () => {
      try {
        await exportPdf();
        pushLocalEvent({ type:"pdf_exported", at:new Date().toISOString() });
        updateDiagnostics();
      } catch (e) {
        await reportClientError("pdf_export", e);
        alert("PDF export failed. Open Diagnostics for details.");
      }
    });

    el("btnExportJson").addEventListener("click", exportProgressJson);
    el("btnMarkCore").addEventListener("click", markCoreDone);
    el("btnReset").addEventListener("click", resetLocalData);
    el("btnRefreshRuntime").addEventListener("click", async () => {
      const status = await probeRuntimeLane();
      renderRuntimeStatus(status);
    });
    el("btnCreateLaunchPlan").addEventListener("click", async () => {
      try {
        const plan = await saveRuntimeLaunchPlan(buildLaunchPlanPayload());
        if (plan?.ok) {
          pushLocalEvent({ type:"launch_plan_saved", at:new Date().toISOString(), plan });
          updateDiagnostics();
          alert(`Local launch plan saved (${plan.launchPlan.readiness}).`);
          return;
        }
        alert("Same-folder runtime is unavailable. Start the local runtime to save launch plans.");
      } catch (e) {
        await reportClientError("launch_plan_save", e);
        alert("Launch plan save failed. Open Diagnostics for details.");
      }
    });

    el("btnCreateHandoffPack").addEventListener("click", async () => {
      try {
        const latestPlans = await fetch("/api/runtime/launch-plans", { method: "GET", cache: "no-store" })
          .then((res) => res.ok ? res.json() : null)
          .catch(() => null);
        const plan = latestPlans?.launchPlans?.[0] || null;
        if (!runtimeStatus || !plan) {
          alert("Save a local launch plan first, then create a system handoff pack.");
          return;
        }
        const handoff = await saveRuntimeHandoffPack(buildHandoffPackPayload(plan));
        if (handoff?.ok) {
          pushLocalEvent({ type: "handoff_pack_saved", at: new Date().toISOString(), handoff });
          await refreshRuntimeHandoffArchive();
          updateDiagnostics();
          alert(`System handoff pack saved (${handoff.handoffPack.readiness}).`);
          return;
        }
        alert("Handoff pack save failed. Check the local runtime.");
      } catch (e) {
        await reportClientError("handoff_pack_save", e);
        alert("Handoff pack save failed. Open Diagnostics for details.");
      }
    });

    el("btnRefreshHandoffPacks").addEventListener("click", async () => {
      await refreshRuntimeHandoffArchive();
    });

    el("btnSaveHandoffReview").addEventListener("click", async () => {
      try {
        const packs = await listRuntimeHandoffPacks();
        const latest = packs?.handoffPacks?.[0] || null;
        if (!latest) {
          alert("Create a system handoff pack first, then save a review.");
          return;
        }
        const review = await saveRuntimeHandoffReview(latest.packId, buildHandoffReviewPayload());
        if (review?.ok) {
          pushLocalEvent({ type: "handoff_review_saved", at: new Date().toISOString(), review });
          await refreshRuntimeHandoffArchive();
          updateDiagnostics();
          alert(`Handoff review saved (${review.handoffPack.review.status}).`);
          return;
        }
        alert("Handoff review save failed. Check the local runtime.");
      } catch (e) {
        await reportClientError("handoff_review_save", e);
        alert("Handoff review save failed. Open Diagnostics for details.");
      }
    });

    el("btnAdvanceReview").addEventListener("click", async () => {
      try {
        const packs = await listRuntimeHandoffPacks();
        const latest = packs?.handoffPacks?.[0] || null;
        if (!latest) {
          alert("Create a system handoff pack first, then advance review.");
          return;
        }
        const nextByStatus = {
          draft: "ready",
          ready: "approved",
          approved: "dispatched",
          blocked: "ready",
          dispatched: "dispatched"
        };
        const nextStatus = nextByStatus[latest.review?.status || "draft"] || "ready";
        if (el("reviewStatus")) el("reviewStatus").value = nextStatus;
        const review = await saveRuntimeHandoffReview(latest.packId, buildHandoffReviewPayload(nextStatus));
        if (review?.ok) {
          pushLocalEvent({ type: "handoff_review_advanced", at: new Date().toISOString(), review });
          await refreshRuntimeHandoffArchive();
          updateDiagnostics();
          alert(`Latest handoff advanced to ${review.handoffPack.review.status}.`);
          return;
        }
        alert("Handoff review advance failed. Check the local runtime.");
      } catch (e) {
        await reportClientError("handoff_review_advance", e);
        alert("Handoff review advance failed. Open Diagnostics for details.");
      }
    });

    el("btnRefreshReviewBoard").addEventListener("click", async () => {
      renderReviewBoard(await listRuntimeReviewBoard());
    });

    el("btnSaveExecution").addEventListener("click", async () => {
      try {
        const packs = await listRuntimeHandoffPacks();
        const latest = packs?.handoffPacks?.[0] || null;
        if (!latest) {
          alert("Create a system handoff pack first, then save execution.");
          return;
        }
        const execution = await saveRuntimeHandoffExecution(
          latest.packId,
          buildHandoffExecutionPayload(undefined, latest.downstreamTargets || [])
        );
        if (execution?.ok) {
          pushLocalEvent({ type: "handoff_execution_saved", at: new Date().toISOString(), execution });
          await refreshRuntimeHandoffArchive();
          updateDiagnostics();
          alert(`Execution saved (${execution.handoffPack.execution.status}).`);
          return;
        }
        alert("Execution save failed. Check the local runtime.");
      } catch (e) {
        await reportClientError("handoff_execution_save", e);
        alert("Execution save failed. Open Diagnostics for details.");
      }
    });

    el("btnAdvanceExecution").addEventListener("click", async () => {
      try {
        const packs = await listRuntimeHandoffPacks();
        const latest = packs?.handoffPacks?.[0] || null;
        if (!latest) {
          alert("Create a system handoff pack first, then advance execution.");
          return;
        }
        const current = latest.execution?.status || "queued";
        const nextByStatus = {
          queued: "active",
          active: "completed",
          blocked: "active",
          completed: "completed"
        };
        const nextStatus = nextByStatus[current] || "active";
        if (el("executionStatus")) el("executionStatus").value = nextStatus;
        const execution = await saveRuntimeHandoffExecution(
          latest.packId,
          buildHandoffExecutionPayload(nextStatus, latest.downstreamTargets || [])
        );
        if (execution?.ok) {
          pushLocalEvent({ type: "handoff_execution_advanced", at: new Date().toISOString(), execution });
          await refreshRuntimeHandoffArchive();
          updateDiagnostics();
          alert(`Latest execution advanced to ${execution.handoffPack.execution.status}.`);
          return;
        }
        alert("Execution advance failed. Check the local runtime.");
      } catch (e) {
        await reportClientError("handoff_execution_advance", e);
        alert("Execution advance failed. Open Diagnostics for details.");
      }
    });

    el("btnRefreshExecutionBoard").addEventListener("click", async () => {
      renderExecutionBoard(await listRuntimeExecutionBoard());
    });

    el("btnSaveDispatch").addEventListener("click", async () => {
      try {
        const packs = await listRuntimeHandoffPacks();
        const latest = packs?.handoffPacks?.[0] || null;
        if (!latest) {
          alert("Create a system handoff pack first, then save dispatch.");
          return;
        }
        const dispatch = await saveRuntimeHandoffDispatch(
          latest.packId,
          buildHandoffDispatchPayload(undefined, latest.execution?.targets?.[0] || latest.downstreamTargets?.[0] || "")
        );
        if (dispatch?.ok) {
          pushLocalEvent({ type: "handoff_dispatch_saved", at: new Date().toISOString(), dispatch });
          await refreshRuntimeHandoffArchive();
          updateDiagnostics();
          alert(`Dispatch saved (${dispatch.handoffPack.dispatch.status}).`);
          return;
        }
        alert("Dispatch save failed. Check the local runtime.");
      } catch (e) {
        await reportClientError("handoff_dispatch_save", e);
        alert("Dispatch save failed. Open Diagnostics for details.");
      }
    });

    el("btnAdvanceDispatch").addEventListener("click", async () => {
      try {
        const packs = await listRuntimeHandoffPacks();
        const latest = packs?.handoffPacks?.[0] || null;
        if (!latest) {
          alert("Create a system handoff pack first, then advance dispatch.");
          return;
        }
        const current = latest.dispatch?.status || "queued";
        const nextByStatus = {
          queued: "active",
          active: "completed",
          blocked: "active",
          completed: "completed"
        };
        const nextStatus = nextByStatus[current] || "active";
        if (el("dispatchStatus")) el("dispatchStatus").value = nextStatus;
        const dispatch = await saveRuntimeHandoffDispatch(
          latest.packId,
          buildHandoffDispatchPayload(nextStatus, latest.execution?.targets?.[0] || latest.downstreamTargets?.[0] || "")
        );
        if (dispatch?.ok) {
          pushLocalEvent({ type: "handoff_dispatch_advanced", at: new Date().toISOString(), dispatch });
          await refreshRuntimeHandoffArchive();
          updateDiagnostics();
          alert(`Latest dispatch advanced to ${dispatch.handoffPack.dispatch.status}.`);
          return;
        }
        alert("Dispatch advance failed. Check the local runtime.");
      } catch (e) {
        await reportClientError("handoff_dispatch_advance", e);
        alert("Dispatch advance failed. Open Diagnostics for details.");
      }
    });

    el("btnRefreshDispatchBoard").addEventListener("click", async () => {
      renderDispatchBoard(await listRuntimeDispatchBoard());
    });

    el("btnRefreshWorkflowTimeline").addEventListener("click", async () => {
      renderWorkflowTimeline(await listRuntimeWorkflowTimeline());
    });

    // Diagnostics modal
    const modal = el("diagModal");
    el("btnDiagnostics").addEventListener("click", () => {
      updateDiagnostics();
      modal.showModal();
    });
    el("btnCloseDiag").addEventListener("click", () => modal.close());

    el("btnSelfTest").addEventListener("click", async () => {
      const results = await selfTest();
      pushLocalEvent({ type:"self_test", at:new Date().toISOString(), results });
      updateDiagnostics();
      alert("Self-test completed. Results stored in Recent Client Errors (local).");
    });

    el("btnSendTestError").addEventListener("click", async () => {
      await reportClientError("test_error", new Error("Test error from diagnostics button"), { note:"Intentional test" });
      alert("Test error queued/sent. See Recent Client Errors (local).");
    });

    el("btnFlushQueue").addEventListener("click", async () => {
      const r = await flushErrorQueue();
      alert(`Queue flush: sent ${r.sent}. Remaining ${r.remaining || 0}.`);
    });

    el("btnClearErrors").addEventListener("click", () => {
      localStorage.removeItem(APP.storageKeys.errors);
      localStorage.removeItem(APP.storageKeys.errorQueue);
      updateDiagnostics();
    });

    // Install
    el("btnInstall").addEventListener("click", handleInstall);

    // Lead form mirror business name
    el("businessName").addEventListener("input", () => {
      el("leadCompany").value = el("businessName").value;
    });

    // Lead form submit: Netlify Forms + Neon upsert
    const leadForm = el("leadForm");
    leadForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      try {
        const r = await handleLeadSubmit();
        alert(`Lead captured. DB: ${r.ok ? "OK" : "FAILED"} (${r.mode})`);
        leadForm.reset();
      } catch (e) {
        await reportClientError("lead_submit", e);
        alert("Lead submit failed. Open Diagnostics for details.");
      }
    });

    // Neon config + ping (client fallback)
    const cfg = getNeonCfg();
    const urlEl = document.getElementById("neonDataApiUrl");
    const jwtEl = document.getElementById("neonJwt");
    if (urlEl) urlEl.value = cfg.dataApiUrl || "";
    if (jwtEl) jwtEl.value = cfg.jwt || "";

    const saveBtn = document.getElementById("btnSaveNeonCfg");
    if (saveBtn) saveBtn.addEventListener("click", () => {
      const next = { dataApiUrl: (urlEl?.value || "").trim(), jwt: (jwtEl?.value || "").trim() };
      setNeonCfg(next);
      pushLocalEvent({ type:"neon_cfg_saved", at:new Date().toISOString(), hasUrl: !!next.dataApiUrl, hasJwt: !!next.jwt });
      updateDiagnostics();
      alert("Saved Neon config locally.");
    });

    const pingBtn = document.getElementById("btnNeonPing");
    if (pingBtn) pingBtn.addEventListener("click", async () => {
      const r = await neonHealthPing();
      pushLocalEvent({ type:"neon_ping", at:new Date().toISOString(), result:r });
      updateDiagnostics();
      alert(`Neon ping (${r.mode}): ${r.ok ? "OK" : "FAILED"}`);
    });

    // Register SW
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("./sw.js");
      } catch (e) {
        reportClientError("service_worker_register", e);
      }
    }

    // Event listeners for client errors
    window.addEventListener("error", (event) => {
      reportClientError("window_error", event.error || new Error(event.message || "Unknown window error"), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || "Unhandled rejection"));
      reportClientError("unhandled_rejection", reason);
    });

    window.addEventListener("online", () => {
      flushErrorQueue().catch(() => {});
      updateDiagnostics();
    });

    startStarfield();
    renderRuntimeStatus(await probeRuntimeLane());
    await refreshRuntimeHandoffArchive();
    updateDiagnostics();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js
