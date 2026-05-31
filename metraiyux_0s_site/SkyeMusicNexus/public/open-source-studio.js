/*
  SkyeMusicNexus Native DAW Studio
  Drop-in browser logic for /SkyeMusicNexus/public/daw.html

  This file intentionally keeps the DAW lane first-party.
*/

(function () {
  "use strict";

  const STORAGE_KEYS = {
    session: "skyeMusicNexusStudioSession",
    projects: "skyeMusicNexusStudioProjects"
  };

  function musicFunctionUrl(name) {
    const configured = window.METRAIYUX_API_BASES && window.METRAIYUX_API_BASES.skymusicnexus;
    if (configured) return `${String(configured).replace(/\/+$/, "")}/${name}`;
    if (/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname)) return `/.netlify/functions/${name}`;
    return `/api/skymusicnexus/${name}`;
  }

  const API = {
    studio: musicFunctionUrl("music-studio"),
    assets: musicFunctionUrl("music-assets"),
    releases: musicFunctionUrl("music-releases"),
    exchange: musicFunctionUrl("music-exchange")
  };

  const auth = window.createSkyGateAuth
    ? window.createSkyGateAuth({ storageKey: "MetrAIyuxGateBridge" })
    : null;

  const nativeModules = [
    {
      name: "Nexus Native DAW",
      role: "Fullscreen first-party arrangement, transport, pads, keys, and mixer",
      license: "SkyeMusicNexus owned code",
      repo: "local public/nexus-daw.js",
      mode: "Native Nexus room"
    },
    {
      name: "Stem Vault",
      role: "Local stems, bounces, masters, and reference intake",
      license: "SkyeMusicNexus owned code",
      repo: "local public/stems.html",
      mode: "Native Nexus room"
    },
    {
      name: "Export Forge",
      role: "Project JSON, proof manifest, and Release Forge handoff",
      license: "SkyeMusicNexus owned code",
      repo: "local public/exports.html",
      mode: "Native Nexus room"
    },
    {
      name: "Release Ops",
      role: "Rights, exchange, upload, player, and operator handoff",
      license: "SkyeMusicNexus owned code",
      repo: "local Nexus runtime",
      mode: "Gated Nexus rooms"
    }
  ];

  const samplePacks = [
    {
      id: "pack_obsidian_rnb",
      name: "Obsidian R&B Starter",
      mood: "dark velvet, late-night, soul pressure",
      count: 28
    },
    {
      id: "pack_cyber_trap",
      name: "Cyber Trap Metals",
      mood: "industrial drums, chrome hits, distorted hooks",
      count: 34
    },
    {
      id: "pack_cathedral_air",
      name: "Cathedral Air",
      mood: "ambient choir pads, cinematic air, sacred texture",
      count: 19
    }
  ];

  const state = {
    stems: [],
    lastProject: null,
    exportJobs: []
  };

  function $(id) {
    return document.getElementById(id);
  }

  function valueFor(id, fallback) {
    const node = $(id);
    return node && "value" in node ? node.value.trim() || fallback : fallback;
  }

  function getGateToken() {
    const activeToken = auth && typeof auth.getToken === "function" ? auth.getToken() : "";
    if (activeToken) return activeToken;

    const musicGateSession = window.SkyeMusicGate && typeof window.SkyeMusicGate.session === "function"
      ? window.SkyeMusicGate.session()
      : null;
    if (musicGateSession && musicGateSession.token) return musicGateSession.token;

    const gateBridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
    const bridgeSession = gateBridge && typeof gateBridge.current === "function" ? gateBridge.current() : null;
    return bridgeSession && bridgeSession.token ? bridgeSession.token : "";
  }

  function authHeaders(extra) {
    const token = getGateToken();
    return Object.assign(
      { "Content-Type": "application/json" },
      token ? { Authorization: `Bearer ${token}`, "x-skygate-session": token } : {},
      extra || {}
    );
  }

  async function postJson(url, body) {
    const requestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    };

    const response = auth && typeof auth.fetch === "function"
      ? await auth.fetch(url, requestInit, {
          missingAuthMessage: "Connect a SkyGate session before saving studio projects."
        })
      : await fetch(url, { ...requestInit, headers: authHeaders() });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (_) {
      json = { ok: response.ok, raw: text };
    }

    if (!response.ok) {
      const error = new Error(json.error || json.message || `Request failed: ${response.status}`);
      error.payload = json;
      throw error;
    }

    return json;
  }

  function saveLocalProject(project) {
    const projects = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.projects) || "[]");
    const withoutExisting = projects.filter((item) => item.id !== project.id);
    withoutExisting.unshift(project);
    window.localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(withoutExisting.slice(0, 50)));
  }

  function collectProject() {
    const artistId = valueFor("artistIdInput", "artist_unassigned");
    const releaseId = valueFor("releaseIdInput", "release_draft");
    const title = valueFor("projectTitleInput", "Untitled SkyeMusicNexus Studio Session");
    const tempoKey = valueFor("tempoKeyInput", "tempo/key unset");
    const notes = valueFor("creativeNotesInput", "");

    return {
      id: `studio_${artistId}_${releaseId}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
      artistId,
      releaseId,
      title,
      tempoKey,
      notes,
      stems: state.stems,
      sourceEngines: ["SkyeMusicNexus Native DAW"],
      status: "creation_session_saved",
      updatedAt: new Date().toISOString()
    };
  }

  function renderStemList() {
    const list = $("stemList");
    if (!list) return;

    list.innerHTML = "";

    if (!state.stems.length) {
      const item = document.createElement("li");
      item.innerHTML = "<strong>No stems staged.</strong><span>Add audio files to create a session manifest.</span>";
      list.appendChild(item);
      return;
    }

    for (const stem of state.stems) {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${escapeHtml(stem.name)}</strong><span>${escapeHtml(stem.type)} · ${formatBytes(stem.size)} · ${escapeHtml(stem.status)}</span>`;
      list.appendChild(item);
    }
  }

  function renderSamplePacks() {
    const rail = $("samplePackRail");
    if (!rail) return;

    rail.innerHTML = samplePacks.map((pack) => {
      return `<article class="sample-card">
        <strong>${escapeHtml(pack.name)}</strong>
        <span>${pack.count} loops · ${escapeHtml(pack.mood)}</span>
      </article>`;
    }).join("");
  }

  function renderEngineLedger() {
    const grid = $("engineLedgerGrid");
    if (!grid) return;

    grid.innerHTML = nativeModules.map((engine) => {
      return `<article class="engine-ledger-card">
        <h4>${escapeHtml(engine.name)}</h4>
        <p>${escapeHtml(engine.role)}</p>
        <p><strong>${escapeHtml(engine.license)}</strong></p>
        <code>${escapeHtml(engine.repo)}</code>
        <p>${escapeHtml(engine.mode)}</p>
      </article>`;
    }).join("");
  }

  function generateReleaseForgeLine(project, exportTargets) {
    const line = {
      artistId: project.artistId,
      releaseId: project.releaseId,
      title: project.title,
      tracks: state.stems.map((stem) => ({
        title: stem.name.replace(/\.[^.]+$/, ""),
        source: stem.objectKey || stem.localObjectUrl || stem.name,
        proofUse: "creation-session-staged",
        engine: "native-nexus-daw-lane"
      })),
      exportTargets,
      rightsRequiredBeforePlayback: true,
      sendTo: "SkyeMusicNexus Release Forge"
    };

    const output = $("releaseForgeLine");
    if (output) output.textContent = JSON.stringify(line, null, 2);
    return line;
  }

  async function saveProject() {
    const output = $("projectSaveOutput");
    const project = collectProject();
    state.lastProject = project;
    saveLocalProject(project);

    output.textContent = "Saving local session and trying gated music-studio function...";

    try {
      const result = await postJson(API.studio, {
        action: "saveProject",
        project
      });
      output.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      output.textContent = JSON.stringify({
        ok: false,
        localSaved: true,
        warning: "Function not available or gate rejected. Project saved to browser ledger.",
        error: error.message
      }, null, 2);
    }
  }

  function exportProjectJson() {
    const project = state.lastProject || collectProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${project.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  async function queueExport() {
    const output = $("exportQueueOutput");
    const project = state.lastProject || collectProject();
    const exportTargets = Array.from(document.querySelectorAll(".exportTarget:checked")).map((item) => item.value);
    const releaseForgeLine = generateReleaseForgeLine(project, exportTargets);

    output.textContent = "Queueing export job...";

    try {
      const result = await postJson(API.studio, {
        action: "queueExport",
        project,
        exportTargets,
        releaseForgeLine
      });

      state.exportJobs.unshift(result.exportJob || result);
      output.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      const localJob = {
        id: `local_export_${Date.now()}`,
        status: "local_only_export_manifest",
        projectId: project.id,
        exportTargets,
        releaseForgeLine
      };

      state.exportJobs.unshift(localJob);
      output.textContent = JSON.stringify({
        ok: false,
        localQueued: true,
        warning: "Function not available or gate rejected. Export manifest generated locally.",
        exportJob: localJob,
        error: error.message
      }, null, 2);
    }
  }

  async function handleStemFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const stem = {
        id: `stem_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: file.type || "audio/unknown",
        size: file.size,
        localObjectUrl: URL.createObjectURL(file),
        status: "local staged"
      };

      state.stems.push(stem);
    }

    renderStemList();
  }

  function toggleOpenSourceLedger() {
    const ledger = $("openSourceLedger");
    ledger.hidden = !ledger.hidden;
    if (!ledger.hidden) {
      ledger.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function proofSession() {
    const gate = window.SkyeMusicGate;
    if (auth && gate && typeof gate.requireSession === "function") {
      const session = gate.session() || await gate.requireSession();
      if (session?.token) {
        auth.setToken(session.token);
        alert("0S session connected for the creation studio.");
        return;
      }
    }

    alert("Open Client Login first, then return to connect your 0S session.");
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "unknown size";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size = size / 1024;
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
    $("saveProjectButton")?.addEventListener("click", saveProject);
    $("exportProjectJsonButton")?.addEventListener("click", exportProjectJson);
    $("queueExportButton")?.addEventListener("click", queueExport);
    $("stemFileInput")?.addEventListener("change", handleStemFiles);
    $("openSourceLedgerButton")?.addEventListener("click", toggleOpenSourceLedger);

    const proofButton = $("proofSessionButton");
    if (proofButton && !proofButton.dataset.action) {
      proofButton.addEventListener("click", proofSession);
    }

    renderStemList();
    renderSamplePacks();
    renderEngineLedger();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
