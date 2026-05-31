(() => {
  const state = {
    boot: null,
    status: null,
    activeAction: "triage",
    urlMessageId: "",
    urlSubject: ""
  };

  function el(id){ return document.getElementById(id); }
  function setText(id, text){ const node = el(id); if(node) node.textContent = text || ""; }
  function fmt(value){
    try{ return new Date(value).toLocaleString(); }catch(_err){ return value || ""; }
  }

  function renderCapabilities(items = []){
    const root = el("brainCapabilities");
    if(!root) return;
    root.innerHTML = (items || []).map((item) => `
      <button class="brain-action-card" data-brain-action="${safe(item.id)}" type="button">
        <strong>${safe(item.label || item.id)}</strong>
        <span>${safe(item.detail || "")}</span>
      </button>
    `).join("") || '<div class="empty">No brain capabilities returned.</div>';
  }

  function renderHistory(items = []){
    const root = el("brainHistory");
    if(!root) return;
    root.innerHTML = (items || []).map((item) => `
      <article class="brain-history-row">
        <div><strong>${safe(item.action || "brain")}</strong><span>${safe(fmt(item.created_at))}</span></div>
        <p>${safe(item.output?.summary || "Brain event saved.")}</p>
      </article>
    `).join("") || '<div class="empty">No brain history yet.</div>';
  }

  function renderAiStatus(ai){
    const node = el("brainAiStatus");
    if(!node) return;
    const plan = ai?.entitlement || {};
    const month = ai?.month || {};
    const status = month.ai_call_allowed ? "FS27 Brain ready" : "local-only until SkyPay entitlement/gateway is active";
    const remaining = month.calls_remaining === null || month.calls_remaining === undefined ? "unlimited" : String(month.calls_remaining);
    node.textContent = `${status}. Plan: ${plan.name || plan.id || "SkyEmail Brain"}. Calls remaining: ${remaining}. FS27 gateway: ${ai?.fs27_gateway_configured ? "ready" : "not configured"}.`;
    const modelSelect = el("brainModel");
    if(modelSelect && Array.isArray(ai?.models) && ai.models.length){
      const current = modelSelect.value || ai.default_model || ai.models[0];
      modelSelect.innerHTML = ai.models.map((item)=>`<option value="${safe(item)}">${safe(formatModelLabel(item))}</option>`).join("");
      modelSelect.value = ai.models.includes(current) ? current : (ai.default_model || ai.models[0]);
    }
  }

  function formatModelLabel(model){
    const labels = {
      "skyemail-brain-fast": "SkyEmail Brain Fast",
      "skyemail-brain-deep": "SkyEmail Brain Deep",
      "skyemail-brain-operator": "SkyEmail Brain Operator"
    };
    return labels[model] || String(model || "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  async function renderPlans(){
    const root = el("brainPlanActions");
    if(!root) return;
    try{
      const data = await apiFetch("/mail-brain-plans");
      const paid = (data.plans || []).filter((plan)=> plan.provider_calls);
      root.innerHTML = paid.slice(0, 3).map((plan)=>`<button class="btn small" type="button" data-ai-plan="${safe(plan.id)}">${safe(plan.name || plan.id)}</button>`).join("");
    }catch(_err){
      root.innerHTML = "";
    }
  }

  function renderMonitors(items = []){
    const root = el("brainMonitors");
    if(!root) return;
    root.innerHTML = (items || []).map((item) => `
      <article class="brain-history-row">
        <div><strong>${safe(item.status || "watching")}</strong><span>${safe(fmt(item.updated_at || item.created_at))}</span></div>
        <p>${safe(item.subject || "Reply monitor")} ${item.correspondent_email ? `• ${safe(item.correspondent_email)}` : ""}</p>
        ${item.matched_message_id ? `<a class="btn small" href="message.html?id=${encodeURIComponent(item.matched_message_id)}">Open matched reply</a>` : ""}
      </article>
    `).join("") || '<div class="empty">No reply monitors yet.</div>';
  }

  function renderOutput(data){
    const root = el("brainOutput");
    if(!root) return;
    const output = data?.output || {};
    const recs = Array.isArray(output.recommendations) ? output.recommendations : [];
    const boundaries = Array.isArray(output.boundaries) ? output.boundaries : [];
    const draft = output.draft || null;
    root.innerHTML = `
      <div class="brain-output-section">
        <span class="badge">${safe(data?.model_mode || "local")}</span>
        <h3>${safe(data?.action || "Brain")} result</h3>
        <p>${safe(output.summary || "No summary returned.")}</p>
      </div>
      ${draft ? `<div class="brain-draft">
        <strong>${safe(draft.subject || "Draft")}</strong>
        <pre>${safe(draft.body || "")}</pre>
        <a class="btn gold" href="compose.html?to=${encodeURIComponent(el("brainTo")?.value || "")}&subject=${encodeURIComponent(draft.subject || "")}&body=${encodeURIComponent(draft.body || "")}">Open Compose With Draft</a>
      </div>` : ""}
      ${output.sent ? `<div class="brain-output-section">
        <h3>Sent</h3>
        <p>${safe(output.sent.from || "")} -> ${safe((output.sent.to || []).join ? output.sent.to.join(", ") : output.sent.to || "")}</p>
      </div>` : ""}
      ${output.monitor ? `<div class="brain-output-section">
        <h3>Monitor</h3>
        <p>${safe(output.monitor.status || "watching")} • ${safe(output.monitor.subject || "")}</p>
      </div>` : ""}
      <div class="brain-output-section">
        <h3>Recommendations</h3>
        <ul>${recs.map((item) => `<li>${safe(item)}</li>`).join("") || "<li>No recommendations.</li>"}</ul>
      </div>
      <div class="brain-output-section">
        <h3>Boundaries</h3>
        <ul>${boundaries.map((item) => `<li>${safe(item)}</li>`).join("")}</ul>
      </div>
    `;
  }

  async function refreshBrain(){
    setText("brainStatus", "Loading mailbox brain...");
    const data = await apiFetch("/mail-brain");
    state.status = data;
    const mailbox = data.mailbox?.mailbox_email || state.boot?.status?.selected_mailbox || state.boot?.status?.mailbox?.mailbox_email || "active mailbox";
    setText("brainMailboxBadge", `Mailbox brain: ${mailbox}`);
    setText("brainStatus", `Ready. ${data.history?.length || 0} recent brain events for this mailbox.`);
    renderAiStatus(data.ai || {});
    renderCapabilities(data.capabilities || []);
    renderHistory(data.history || []);
    renderMonitors(data.monitors || []);
    await renderPlans();
    return data;
  }

  async function runBrain(action){
    const selected = action || el("brainAction")?.value || state.activeAction || "triage";
    state.activeAction = selected;
    const prompt = (el("brainPrompt")?.value || "").trim();
    setText("brainStatus", `Running ${selected}...`);
    const body = {
      action: selected,
      prompt,
      source: "skymail-brain-page",
      model_mode: el("brainMode")?.value || "fs27_metered_v1",
      model: el("brainModel")?.value || "skyemail-brain-fast",
      to: el("brainTo")?.value || "",
      subject: el("brainSubject")?.value || "",
      message: prompt,
      approved: Boolean(el("brainApproveSend")?.checked)
    };
    if(state.urlMessageId) body.message_id = state.urlMessageId;
    const data = await apiFetch("/mail-brain", { method:"POST", body: JSON.stringify(body) });
    renderOutput(data);
    renderAiStatus(data.ai || state.status?.ai || {});
    renderMonitors(data.monitors || []);
    await refreshBrain().catch(() => null);
    setText("brainStatus", `${selected} complete.`);
    if(window.SMV?.trackGame) window.SMV.trackGame("proof_loop", { key:`brain:${selected}` }, { silent:true });
  }

  function bind(){
    document.addEventListener("click", (event) => {
      const actionBtn = event.target.closest("[data-brain-action]");
      if(!actionBtn) return;
      const action = actionBtn.getAttribute("data-brain-action") || "triage";
      if(el("brainAction")) el("brainAction").value = action;
      runBrain(action).catch((err) => setText("brainStatus", err.message || "Brain action failed."));
    });
    document.addEventListener("click", async (event) => {
      const planBtn = event.target.closest("[data-ai-plan]");
      if(!planBtn) return;
      try{
        setText("brainStatus", `Creating checkout for ${planBtn.dataset.aiPlan}...`);
        const data = await apiFetch("/mail-brain-checkout", { method:"POST", body: JSON.stringify({ plan_id: planBtn.dataset.aiPlan }) });
        const url = data.checkout?.url || data.checkout?.checkout_url;
        if(url) location.href = url;
        else setText("brainStatus", "Checkout created, but no redirect URL was returned.");
      }catch(err){
        setText("brainStatus", err.message || "Checkout failed.");
      }
    });
    el("refreshBrainBtn")?.addEventListener("click", () => refreshBrain().catch((err) => setText("brainStatus", err.message || "Refresh failed.")));
    el("clearBrainBtn")?.addEventListener("click", () => {
      if(el("brainPrompt")) el("brainPrompt").value = "";
      renderOutput({ action:"clear", model_mode:"local", output:{ summary:"Cleared local prompt.", recommendations:["Choose a brain action to continue."], boundaries:[] } });
    });
    el("brainForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      runBrain().catch((err) => setText("brainStatus", err.message || "Brain action failed."));
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(location.search);
    state.urlMessageId = params.get("message_id") || params.get("id") || "";
    state.urlSubject = params.get("subject") || "";
    if(state.urlSubject && el("brainPrompt")){
      el("brainPrompt").value = `Message context: ${state.urlSubject}`;
      if(el("brainSubject")) el("brainSubject").value = state.urlSubject;
    }
    try{
      state.boot = await SMV.withBoot("brain", "Brain", "Local mailbox brain + FS27 metered Brain lane");
      bind();
      const returnedSession = params.get("session_id") || params.get("checkout_id") || params.get("stripe_session_id") || "";
      if(returnedSession){
        setText("brainStatus", "Claiming SkyPay Brain entitlement...");
        await apiFetch("/mail-brain-claim", {
          method:"POST",
          body: JSON.stringify({ session_id: returnedSession, plan_id: params.get("plan") || params.get("offer") || "" })
        }).catch((err)=> setText("brainStatus", err.message || "Entitlement claim failed."));
      }
      await refreshBrain();
      if(state.urlMessageId){
        if(el("brainAction")) el("brainAction").value = "triage";
        await runBrain("triage");
      }
    }catch(err){
      setText("brainStatus", err.message || "Brain failed to start.");
      setText("brainMailboxBadge", "Brain unavailable");
    }
  });
})();
