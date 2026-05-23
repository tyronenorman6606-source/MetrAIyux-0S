(function () {
  const tones = {
    gold: "#f3d483",
    cyan: "#35b7ff",
    mint: "#6ff2c7",
    violet: "#a88cff",
    danger: "#ff9a9a",
    default: "#f3d483"
  };

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));

  const pct = (used, limit) => {
    const u = Number(used || 0);
    const l = Number(limit || 0);
    if (!l) return 0;
    return Math.max(0, Math.min(100, (u / l) * 100));
  };

  const fmt = (value, unit = "") => {
    const n = Number(value || 0);
    if (unit === "usd") return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (unit === "mb") return n >= 1024 ? `${(n / 1024).toFixed(1)} GB` : `${Math.round(n)} MB`;
    return `${n.toLocaleString()}${unit ? ` ${unit}` : ""}`;
  };

  function resolveSources(root) {
    const url = new URL(location.href);
    const workspaceId = root.dataset.workspace || url.searchParams.get("workspace") || url.searchParams.get("workspace_id") || "";
    const api = workspaceId && root.dataset.api
      ? root.dataset.api.replace("{workspace_id}", encodeURIComponent(workspaceId))
      : "";
    const staticSources = [root.dataset.source, root.dataset.fallback].filter(Boolean);
    return workspaceId ? [api, ...staticSources].filter(Boolean) : staticSources;
  }

  async function loadVisualData(root) {
    const sources = resolveSources(root);
    let lastError = null;
    for (const source of sources) {
      try {
        const res = await fetch(source, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data && data.ok !== false) return data.visuals || data;
        lastError = data?.error || `status_${res.status}`;
      } catch (error) {
        lastError = error?.message || String(error);
      }
    }
    throw new Error(lastError || "No visual data source configured");
  }

  function renderWorkspace(el, data) {
    if (!el) return;
    const w = data.workspace || {};
    el.innerHTML = `
      <span class="status-pill">${esc(w.status || "workspace")}</span>
      <h2>${esc(w.company_name || "Customer workspace")}</h2>
      <p><strong>Workspace:</strong> ${esc(w.workspace_id || "unknown")} &nbsp; <strong>Plan:</strong> ${esc(w.plan_id || "unknown")}</p>
      <p class="mini-note">${esc(w.activation || "Activation and plan policy are tracked by FS27.")}</p>
    `;
  }

  function renderKpis(el, rows) {
    if (!el) return;
    el.innerHTML = (rows || []).map((row) => `
      <article class="visual-kpi visual-tone-${esc(row.tone || "default")}">
        <span>${esc(row.label)}</span>
        <strong>${esc(row.value)}</strong>
        <small>${esc(row.detail || "")}</small>
      </article>
    `).join("");
  }

  function renderProgress(el, rows) {
    if (!el) return;
    el.innerHTML = (rows || []).map((row) => {
      const amount = pct(row.used, row.limit);
      return `
        <div class="visual-progress-row">
          <div class="visual-progress-head">
            <strong>${esc(row.label)}</strong>
            <span>${esc(fmt(row.used, row.unit))} / ${esc(fmt(row.limit, row.unit))}</span>
          </div>
          <div class="visual-progress-track" role="progressbar" aria-valuenow="${amount.toFixed(1)}" aria-valuemin="0" aria-valuemax="100">
            <i style="width:${amount.toFixed(2)}%"></i>
          </div>
          <small>${amount.toFixed(1)}% used - ${esc(row.status || "tracked")}</small>
        </div>
      `;
    }).join("");
  }

  function renderBars(el, rows) {
    if (!el) return;
    const data = rows || [];
    const width = 680;
    const rowHeight = 58;
    const height = Math.max(80, data.length * rowHeight + 18);
    const bars = data.map((row, index) => {
      const y = 18 + index * rowHeight;
      const amount = pct(row.value, row.limit);
      const barWidth = Math.max(2, (amount / 100) * 430);
      return `
        <text x="12" y="${y + 20}" class="visual-svg-label">${esc(row.label)}</text>
        <rect x="165" y="${y}" width="430" height="18" rx="6" class="visual-svg-track"></rect>
        <rect x="165" y="${y}" width="${barWidth.toFixed(2)}" height="18" rx="6" class="visual-svg-bar"></rect>
        <text x="610" y="${y + 15}" class="visual-svg-value">${esc(fmt(row.value, row.unit))}</text>
      `;
    }).join("");
    el.innerHTML = `<svg class="visual-bars" viewBox="0 0 ${width} ${height}" role="img" aria-label="Customer usage bars">${bars}</svg>`;
  }

  function renderDonut(el, rows) {
    if (!el) return;
    const data = rows || [];
    const total = data.reduce((sum, row) => sum + Number(row.value || 0), 0) || 1;
    let offset = 25;
    const rings = data.map((row) => {
      const amount = (Number(row.value || 0) / total) * 100;
      const color = tones[row.tone] || tones.default;
      const ring = `<circle cx="70" cy="70" r="48" pathLength="100" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="${amount.toFixed(2)} ${Math.max(0, 100 - amount).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>`;
      offset -= amount;
      return ring;
    }).join("");
    const legend = data.map((row) => `<span><i style="background:${tones[row.tone] || tones.default}"></i>${esc(row.label)} ${esc(row.value)}</span>`).join("");
    el.innerHTML = `
      <div class="visual-donut-wrap">
        <svg class="visual-donut" viewBox="0 0 140 140" role="img" aria-label="Workflow status mix">
          <circle cx="70" cy="70" r="48" pathLength="100" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="18"></circle>
          ${rings}
          <text x="70" y="74" text-anchor="middle" class="visual-donut-total">${total}</text>
        </svg>
        <div class="visual-legend">${legend}</div>
      </div>
    `;
  }

  function renderTimeline(el, rows) {
    if (!el) return;
    el.innerHTML = (rows || []).map((row) => `
      <article class="visual-timeline-item">
        <span>${esc(row.status || "event")}</span>
        <h3>${esc(row.title)}</h3>
        <p>${esc(row.detail || "")}</p>
        <time>${esc(row.time ? new Date(row.time).toLocaleString() : "")}</time>
      </article>
    `).join("");
  }

  function renderStack(el, rows) {
    if (!el) return;
    el.innerHTML = (rows || []).map((row) => `
      <article class="visual-stack-card">
        <span>${esc(row.label)}</span>
        <strong>${esc(row.value)}</strong>
        <small>${esc(row.status)}</small>
      </article>
    `).join("");
  }

  function renderEventMix(el, rows) {
    if (!el) return;
    const max = Math.max(1, ...(rows || []).map((row) => Number(row.value || 0)));
    el.innerHTML = (rows || []).map((row) => {
      const amount = (Number(row.value || 0) / max) * 100;
      return `
        <div class="visual-mini-bar">
          <span>${esc(row.label)}</span>
          <b style="width:${amount.toFixed(2)}%"></b>
          <strong>${esc(row.value)}</strong>
        </div>
      `;
    }).join("");
  }

  async function renderDashboard(root) {
    const status = root.querySelector("[data-visual-status]");
    try {
      if (status) status.textContent = "Loading customer visuals...";
      const data = await loadVisualData(root);
      renderWorkspace(root.querySelector("[data-visual-workspace]"), data);
      renderKpis(root.querySelector("[data-visual-kpis]"), data.kpis);
      renderProgress(root.querySelector("[data-visual-progress]"), data.progress);
      renderBars(root.querySelector("[data-visual-bars]"), data.bars);
      renderDonut(root.querySelector("[data-visual-donut]"), data.donut);
      renderTimeline(root.querySelector("[data-visual-timeline]"), data.timeline);
      renderStack(root.querySelector("[data-visual-stack]"), data.sovereign_stack);
      renderEventMix(root.querySelector("[data-visual-event-mix]"), data.event_mix);
      if (status) status.textContent = `Visual data loaded: ${data.generated_at || new Date().toISOString()}`;
    } catch (error) {
      if (status) status.textContent = `Visual data unavailable: ${error.message}`;
      root.classList.add("visual-dashboard-error");
    }
  }

  window.ZeroSVisualData = { loadVisualData, renderDashboard };
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-visual-dashboard]").forEach((root) => renderDashboard(root));
  });
})();
