(() => {
  const apiPath = "api/review-submissions";
  const offlineKey = "solReviewOfflineSubmissions";
  const tokenKey = "solReviewAdminToken";

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function setStatus(node, text, tone = "neutral") {
    if (!node) return;
    node.textContent = text;
    node.dataset.tone = tone;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function readOffline() {
    try {
      return JSON.parse(localStorage.getItem(offlineKey) || "[]");
    } catch {
      return [];
    }
  }

  function writeOffline(items) {
    localStorage.setItem(offlineKey, JSON.stringify(items));
  }

  function bindSubmitForm() {
    const form = $("[data-live-review-form]");
    if (!form) return;

    const status = $("[data-review-submit-status]");
    const offlineCount = $("[data-offline-review-count]");
    const updateOfflineCount = () => {
      if (offlineCount) offlineCount.textContent = String(readOffline().length);
    };

    updateOfflineCount();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.consent = formData.get("consent") === "on";
      payload.publicNameConsent = formData.get("publicNameConsent") === "on";
      payload.publicCompanyConsent = formData.get("publicCompanyConsent") === "on";

      setStatus(status, "Sending your review to the 0S QA queue...", "neutral");

      try {
        const response = await fetch(apiPath, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || result.error || "Submission failed");

        form.reset();
        setStatus(status, `Submitted. 0S QA receipt: ${result.submissionId}`, "success");
      } catch (error) {
        const offline = readOffline();
        offline.push({
          ...payload,
          id: `local-${Date.now()}`,
          status: "local_pending_0s_sync",
          createdAt: new Date().toISOString(),
        });
        writeOffline(offline);
        updateOfflineCount();
        setStatus(status, `Live queue is not accepting yet, so this review was saved locally for 0S sync. ${error.message}`, "warning");
      }
    });

    $("[data-export-offline-reviews]")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify({ submissions: readOffline() }, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `sol-local-review-submissions-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  function headers(token) {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
  }

  function renderQueue(items, summary) {
    const list = $("[data-review-queue-list]");
    if (!list) return;

    const stats = $("[data-review-queue-stats]");
    if (stats && summary) {
      stats.textContent = `${summary.pending0sQa} pending QA / ${summary.approvedUnpublished} approved and unpublished / ${summary.publishThreshold} needed for production batch`;
    }

    if (!items.length) {
      list.innerHTML = `<div class="submission-card"><b>No review submissions yet.</b><p>The live queue is ready once Cloudflare KV is bound and clients start using the intake form.</p></div>`;
      return;
    }

    list.innerHTML = items.map((item) => `
      <article class="submission-card" data-submission-id="${escapeHtml(item.id)}">
        <div class="submission-card-head">
          <div>
            <b>${escapeHtml(item.reviewerName || "Review client")}</b>
            <span>${escapeHtml(item.service || "Service lane")} / ${escapeHtml(item.status)}</span>
          </div>
          <small>${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString() : "")}</small>
        </div>
        <p>${escapeHtml(item.reviewText || "")}</p>
        <dl>
          <div><dt>Email</dt><dd>${escapeHtml(item.reviewerEmail || "")}</dd></div>
          <div><dt>Role</dt><dd>${escapeHtml(item.role || "")}</dd></div>
          <div><dt>Company</dt><dd>${escapeHtml(item.company || "")}</dd></div>
          <div><dt>Public name</dt><dd>${item.publicNameConsent ? "yes" : "no"}</dd></div>
        </dl>
        <label>
          QA note
          <textarea data-qa-note rows="2" placeholder="0S QA note for this review"></textarea>
        </label>
        <div class="submission-actions">
          <button type="button" data-review-action="approve">Approve</button>
          <button type="button" data-review-action="reject">Reject</button>
        </div>
      </article>
    `).join("");
  }

  async function loadQueue(token) {
    const response = await fetch(apiPath, { headers: headers(token) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || result.error || "Queue load failed");
    renderQueue(result.submissions || [], result.summary);
    return result;
  }

  function bindOperatorQueue() {
    const shell = $("[data-review-qa-shell]");
    if (!shell) return;

    const tokenInput = $("[data-review-admin-token]");
    const status = $("[data-review-qa-status]");
    const saved = localStorage.getItem(tokenKey) || "";
    if (tokenInput) tokenInput.value = saved;

    const getToken = () => (tokenInput?.value || "").trim();

    $("[data-load-review-queue]")?.addEventListener("click", async () => {
      const token = getToken();
      if (!token) {
        setStatus(status, "Enter the 0S review admin token first.", "warning");
        return;
      }
      localStorage.setItem(tokenKey, token);
      setStatus(status, "Loading live review queue...", "neutral");
      try {
        await loadQueue(token);
        setStatus(status, "Queue loaded.", "success");
      } catch (error) {
        setStatus(status, error.message, "warning");
      }
    });

    $("[data-review-queue-list]")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-review-action]");
      if (!button) return;
      const card = event.target.closest("[data-submission-id]");
      const id = card?.dataset.submissionId;
      const qaNotes = $("[data-qa-note]", card)?.value || "";
      const token = getToken();
      if (!id || !token) return;

      setStatus(status, `${button.dataset.reviewAction} review ${id}...`, "neutral");
      try {
        const response = await fetch(apiPath, {
          method: "PATCH",
          headers: headers(token),
          body: JSON.stringify({ action: button.dataset.reviewAction, id, qaNotes }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || result.error || "Review action failed");
        await loadQueue(token);
        setStatus(status, `Review ${id} moved to ${result.submission.status}.`, "success");
      } catch (error) {
        setStatus(status, error.message, "warning");
      }
    });

    $("[data-mark-review-batch-ready]")?.addEventListener("click", async () => {
      const token = getToken();
      setStatus(status, "Checking for five approved reviews...", "neutral");
      try {
        const response = await fetch(apiPath, {
          method: "PATCH",
          headers: headers(token),
          body: JSON.stringify({ action: "mark_batch_ready" }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || result.error || "Batch action failed");
        await loadQueue(token);
        setStatus(status, `Batch ${result.batchId} is ready for production publish.`, "success");
      } catch (error) {
        setStatus(status, error.message, "warning");
      }
    });

    $("[data-export-review-queue]")?.addEventListener("click", async () => {
      const token = getToken();
      try {
        const result = await loadQueue(token);
        const ready = (result.submissions || []).filter((item) => item.status === "ready_for_production");
        const blob = new Blob([JSON.stringify({ submissions: ready }, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `sol-ready-review-batch-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        setStatus(status, error.message, "warning");
      }
    });
  }

  bindSubmitForm();
  bindOperatorQueue();
})();
