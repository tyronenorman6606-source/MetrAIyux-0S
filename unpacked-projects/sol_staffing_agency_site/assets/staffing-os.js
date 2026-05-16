(function(){
  const collections = [
    "leads",
    "job_orders",
    "candidates",
    "placements",
    "timesheets",
    "gov_pursuits",
    "ae_leads",
    "vendors",
    "risks",
    "brain_feedback",
    "documents",
    "audit"
  ];

  const els = {
    authStatus: document.getElementById("authStatus"),
    summaryCards: document.getElementById("summaryCards"),
    collectionSelect: document.getElementById("collectionSelect"),
    manualCollection: document.getElementById("manualCollection"),
    recordsTable: document.querySelector("#recordsTable tbody"),
    uploadForm: document.getElementById("uploadForm"),
    uploadStatus: document.getElementById("uploadStatus"),
    fileList: document.getElementById("fileList"),
    brainLiveForm: document.getElementById("brainLiveForm"),
    brainLiveOutput: document.getElementById("brainLiveOutput"),
    manualRecordForm: document.getElementById("manualRecordForm"),
    manualStatus: document.getElementById("manualStatus"),
    logoutBtn: document.getElementById("logoutBtn")
  };

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  async function api(path, options = {}) {
    const request = {
      credentials: "same-origin",
      ...options,
      headers: options.body instanceof FormData ? options.headers : {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    };
    const runtime = window.SOLRuntime;
    const response = runtime?.fetchJson
      ? await runtime.fetchJson(path, request)
      : { res: await fetch(path, request), data: null };
    const res = response.res;
    const data = response.data || await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function fillSelect(select) {
    if (!select) return;
    select.innerHTML = collections.map(name => `<option value="${name}">${name.replaceAll("_", " ")}</option>`).join("");
  }

  async function boot() {
    fillSelect(els.collectionSelect);
    fillSelect(els.manualCollection);
    const me = await api("/.netlify/functions/staffing-auth-me").catch(() => null);
    if (!me?.ok) {
      location.href = "./staffing-login.html?next=" + encodeURIComponent(location.pathname);
      return;
    }
    els.authStatus.textContent = `Signed in through Skyegate FS27 as ${me.auth.email || me.auth.username || me.auth.sub} (${me.auth.role || "role pending"})`;
    await Promise.all([loadSummary(), loadRecords(), loadFiles()]);
  }

  async function loadSummary() {
    const data = await api("/.netlify/functions/staffing-records?summary=1");
    els.summaryCards.innerHTML = Object.entries(data.summary || {})
      .filter(([name]) => name !== "audit")
      .map(([name, count]) => `
        <div class="dash-card">
          <strong>${Number(count || 0)}</strong>
          <p>${escapeHtml(name.replaceAll("_", " "))}</p>
        </div>
      `).join("");
  }

  async function loadRecords() {
    const collection = els.collectionSelect.value || "leads";
    const data = await api(`/.netlify/functions/staffing-records?collection=${encodeURIComponent(collection)}&limit=200`);
    els.recordsTable.innerHTML = (data.records || []).map(record => {
      const title = record.data?.company || record.data?.employer || record.data?.candidate_name || record.data?.name || record.data?.title || record.data?.risk_title || record.data?.vendor_name || record.data?.topic || record.id;
      const contact = record.data?.contact || record.data?.contact_name || record.data?.email || record.data?.phone || "";
      return `
        <tr>
          <td>${escapeHtml(new Date(record.created_at).toLocaleString())}<br><small>${escapeHtml(record.id)}</small></td>
          <td>${escapeHtml(title)}</td>
          <td>${escapeHtml(contact)}</td>
          <td>${escapeHtml(record.status || "new")}</td>
          <td>${escapeHtml(record.form_name || record.collection)}</td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="5">No records yet.</td></tr>`;
  }

  async function loadFiles() {
    const data = await api("/.netlify/functions/staffing-files");
    els.fileList.innerHTML = (data.files || []).map(file => `
      <a class="pill-link" href="${window.SOLRuntime?.apiUrl ? window.SOLRuntime.apiUrl(`staffing-files?id=${encodeURIComponent(file.id)}`) : `/.netlify/functions/staffing-files?id=${encodeURIComponent(file.id)}`}">
        ${escapeHtml(file.name)}<br>
        <small>${escapeHtml(file.label || file.content_type || "")} ${Number(file.size || 0)} bytes</small>
      </a>
    `).join("") || `<p>No secure files uploaded yet.</p>`;
  }

  els.collectionSelect?.addEventListener("change", () => loadRecords().catch(console.error));

  els.uploadForm?.addEventListener("submit", async event => {
    event.preventDefault();
    els.uploadStatus.textContent = "Uploading...";
    try {
      const data = await api("/.netlify/functions/staffing-files", {
        method: "POST",
        body: new FormData(els.uploadForm)
      });
      els.uploadStatus.textContent = `Uploaded ${data.file.name}`;
      els.uploadForm.reset();
      await loadFiles();
      await loadSummary();
    } catch (error) {
      els.uploadStatus.textContent = error.message || "Upload failed.";
    }
  });

  els.brainLiveForm?.addEventListener("submit", async event => {
    event.preventDefault();
    els.brainLiveOutput.textContent = "Thinking through the live endpoint...";
    const prompt = new FormData(els.brainLiveForm).get("prompt");
    try {
      const { res, data } = await window.SOLRuntime.fetchJson("/.netlify/functions/brain", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok && !data.answer) throw new Error(data.error || `HTTP ${res.status}`);
      els.brainLiveOutput.textContent = data.answer || "No answer returned.";
    } catch (error) {
      els.brainLiveOutput.textContent = error.message || "Brain request failed.";
    }
  });

  els.manualRecordForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(els.manualRecordForm);
    els.manualStatus.textContent = "Creating record...";
    try {
      await api("/.netlify/functions/staffing-records", {
        method: "POST",
        body: JSON.stringify({
          collection: form.get("collection"),
          form_name: "admin-manual-entry",
          data: {
            title: form.get("title"),
            contact: form.get("contact"),
            notes: form.get("notes")
          }
        })
      });
      els.manualStatus.textContent = "Record created.";
      els.manualRecordForm.reset();
      await loadRecords();
      await loadSummary();
    } catch (error) {
      els.manualStatus.textContent = error.message || "Create failed.";
    }
  });

  els.logoutBtn?.addEventListener("click", async () => {
    await window.SOLRuntime.fetchJson("/.netlify/functions/staffing-auth-logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    location.href = "./staffing-login.html";
  });

  boot().catch(error => {
    if (els.authStatus) els.authStatus.textContent = error.message || "Dashboard failed to load.";
  });
})();
