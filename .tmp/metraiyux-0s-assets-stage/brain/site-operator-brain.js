
const SiteOperatorBrain = (() => {
  const stateKey = 'sovereign13.siteOperator.events.v1';
  const taskKey = 'sovereign13.siteOperator.tasks.v1';
  let config = null;
  let personas = null;
  let knowledge = null;
  let surfaceRegistry = null;

  const $ = (id) => document.getElementById(id);
  const now = () => new Date().toISOString();
  const getStore = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const setStore = (key, value) => localStorage.setItem(key, JSON.stringify(value, null, 2));
  const words = (text) => String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  async function boot() {
    const [cfg, prs, kb, surfaces] = await Promise.all([
      fetch('/brain/site-operator-brain.json').then(r => r.json()),
      fetch('/brain/persona-brains.json').then(r => r.json()),
      fetch('/brain/knowledge-base.json').then(r => r.json()).catch(() => ({chunks: []})),
      fetch('/brain/live-surface-registry.json').then(r => r.json()).catch(() => null)
    ]);
    config = cfg;
    personas = prs;
    knowledge = Array.isArray(kb) ? {chunks: kb} : kb;
    surfaceRegistry = surfaces;
    renderStatus();
    renderStores();
  }

  function scoreRoute(message, route) {
    const text = String(message || '').toLowerCase();
    const profile = (personas.profiles || []).find(p => p.id === route.route_to) || {};
    const routeWords = [route.intent, route.create_task, ...(profile.scope_keywords || []), profile.name, profile.cabinet, profile.title].join(' ').toLowerCase();
    let score = 0;
    for (const w of words(text)) if (routeWords.includes(w)) score += w.length > 4 ? 3 : 1;
    if (/contract|legal|compliance|policy|filing|incorporation/.test(text) && route.intent.includes('compliance')) score += 15;
    if (/lead|buyer|sale|proposal|close|ae|discovery/.test(text) && route.intent.includes('buyer')) score += 15;
    if (/candidate|recruit|job order|staff|worker|placement/.test(text) && route.intent.includes('candidate')) score += 15;
    if (/proof|qa|claim|audit|receipt|smoke|test/.test(text) && route.intent.includes('quality')) score += 15;
    if (/site|deploy|worker|cloudflare|automation|brain|api/.test(text) && route.intent.includes('technology')) score += 15;
    return score;
  }

  function routeMessage(message) {
    const routes = config.routes.map(r => ({...r, score: scoreRoute(message, r)})).sort((a,b)=>b.score-a.score);
    const primary = routes[0] || config.routes[0];
    const profile = (personas.profiles || []).find(p => p.id === primary.route_to) || {name: primary.route_to, cabinet:'Unknown'};
    const secondary = (personas.profiles || []).find(p => p.id === primary.secondary) || {name: primary.secondary || 'Central Company Command Brain'};
    const nextActions = [
      primary.create_task,
      `Route primary review to ${profile.name}.`,
      secondary.name ? `Route secondary check to ${secondary.name}.` : 'Hold secondary check for Central Company Command Brain.',
      'Create a proof receipt before publishing or promising completion.',
      'Escalate to human operator before legal, financial, hiring, filing, or contract action.'
    ];
    const receipt = {
      id: `evt_${Date.now()}`,
      created_at: now(),
      message,
      route_intent: primary.intent,
      primary_brain: profile.name,
      primary_brain_id: primary.route_to,
      primary_cabinet: profile.cabinet,
      secondary_brain: secondary.name,
      recommended_task: primary.create_task,
      guardrail: 'Human approval required for legally binding, hiring, firing, filing, payment, or contract actions.',
      next_actions: nextActions,
      live_surfaces: surfaceMatches(message)
    };
    return receipt;
  }

  function surfaceMatches(message, limit = 3) {
    const text = String(message || '').toLowerCase();
    const surfaces = surfaceRegistry?.surfaces || [];
    return surfaces
      .map(surface => {
        const hay = [surface.name, surface.audience, surface.privacy, surface.purpose, surface.sales_use, ...(surface.route_when || [])].join(' ').toLowerCase();
        let score = 0;
        for (const w of words(text)) if (hay.includes(w)) score += w.length > 5 ? 3 : 1;
        if (/sell|buyer|prospect|client|lead|website|white[- ]?label|command deck|deployment|proof|gate|auth|skygate|fs27/i.test(text) && /proof|gate|command|sales|client|metraiyux|skygate|website/i.test(hay)) score += 8;
        return {...surface, score};
      })
      .filter(surface => surface.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, limit)
      .map(({score, ...surface}) => surface);
  }

  function addEvent(receipt) {
    const items = getStore(stateKey);
    items.unshift(receipt);
    setStore(stateKey, items.slice(0, 250));
  }

  function addTask(receipt) {
    const tasks = getStore(taskKey);
    tasks.unshift({
      id: receipt.id.replace('evt_', 'task_'),
      created_at: receipt.created_at,
      title: receipt.recommended_task,
      owner_brain: receipt.primary_brain,
      cabinet: receipt.primary_cabinet,
      status: 'Queued for human operator review',
      source_event: receipt.id,
      next_actions: receipt.next_actions
    });
    setStore(taskKey, tasks.slice(0, 250));
  }

  function renderStatus() {
    if (!$('brainStatus')) return;
    $('brainStatus').innerHTML = `<strong>${config.total_system_brains}</strong> total brains · <strong>${config.total_connected_brains}</strong> connected cabinet/company brains · mode: <strong>${config.mode}</strong>`;
  }

  function renderStores() {
    const events = getStore(stateKey);
    const tasks = getStore(taskKey);
    if ($('eventLog')) $('eventLog').innerHTML = events.slice(0,8).map(e => `<article class="mini-record"><b>${e.route_intent}</b><span>${e.primary_brain} → ${e.secondary_brain || 'none'}</span><p>${escapeHtml(e.message).slice(0,220)}</p></article>`).join('') || '<p>No local events yet.</p>';
    if ($('taskLog')) $('taskLog').innerHTML = tasks.slice(0,8).map(t => `<article class="mini-record"><b>${t.title}</b><span>${t.owner_brain} · ${t.status}</span></article>`).join('') || '<p>No local tasks yet.</p>';
  }

  function answer(message) {
    const receipt = routeMessage(message);
    addEvent(receipt);
    addTask(receipt);
    renderStores();
    renderAutonomyCockpit(receipt);
    return receipt;
  }

  function approvalProfile(receipt) {
    const text = [receipt.message, receipt.route_intent, receipt.recommended_task].join(' ');
    const needsHuman = /(contract|legal|compliance|filing|hire|fire|payment|invoice|payroll|price|pricing|public claim|publish|regulated|tobacco|vape|cbd|government)/i.test(text);
    return {
      gate: needsHuman ? 'Human approval required' : 'Internal draft can proceed',
      risk: needsHuman ? 'Elevated' : 'Standard',
      reason: needsHuman ? 'The signal touches money, regulated claims, contracts, hiring, compliance, pricing, or public publishing.' : 'The signal can be drafted and queued before a human reviews the final action.'
    };
  }

  function renderAutonomyCockpit(receipt) {
    const routePanel = $('liveRoutePanel');
    const gatePanel = $('approvalGatePanel');
    const receiptPanel = $('liveReceiptPanel');
    const profile = approvalProfile(receipt);
    document.querySelectorAll('[data-flow]').forEach((node, index) => {
      node.classList.remove('is-active');
      setTimeout(() => node.classList.add('is-active'), index * 120);
    });
    if (routePanel) {
      routePanel.innerHTML = [
        `<b>Intent</b><span>${escapeHtml(receipt.route_intent)}</span>`,
        `<b>Primary</b><span>${escapeHtml(receipt.primary_brain)}</span>`,
        `<b>Secondary</b><span>${escapeHtml(receipt.secondary_brain || 'Central Company Command Brain')}</span>`,
        `<b>Task</b><span>${escapeHtml(receipt.recommended_task)}</span>`
      ].join('');
    }
    if (gatePanel) {
      gatePanel.innerHTML = [
        `<b>${escapeHtml(profile.gate)}</b>`,
        `<span>Risk: ${escapeHtml(profile.risk)}</span>`,
        `<p>${escapeHtml(profile.reason)}</p>`
      ].join('');
    }
    if (receiptPanel) {
      receiptPanel.textContent = JSON.stringify({
        id: receipt.id,
        created_at: receipt.created_at,
        route_intent: receipt.route_intent,
        primary_brain: receipt.primary_brain,
        secondary_brain: receipt.secondary_brain,
        approval_gate: profile.gate,
        risk: profile.risk,
        task_status: 'Queued for operator review',
        local_memory: 'event log + task queue'
      }, null, 2);
    }
  }

  function exportJson(type='all') {
    const data = type === 'events' ? getStore(stateKey) : type === 'tasks' ? getStore(taskKey) : {events:getStore(stateKey), tasks:getStore(taskKey), exported_at: now()};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `site-operator-${type}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function clearLocal() {
    localStorage.removeItem(stateKey);
    localStorage.removeItem(taskKey);
    renderStores();
  }

  function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  return { boot, answer, exportJson, clearLocal };
})();

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.body.dataset.siteOperator) return;
  await SiteOperatorBrain.boot();
  const form = document.getElementById('operatorForm');
  const output = document.getElementById('operatorOutput');
  const demos = {
    bob: 'Bob Smoke Shop needs the site scanned after the QR/PWA update. Check workspace-preview, installability, store QR routing, specials links, and any tobacco/vape/CBD copy that needs human approval before publishing.',
    lead: 'A Phoenix buyer wants a staffing proposal, pricing range, discovery call, and proof that the company can handle compliance-heavy onboarding.',
    proof: 'Before publishing a public claim about autonomous routing, create a proof receipt, assign QA review, and require founder approval if the claim is not verified.'
  };
  document.querySelectorAll('[data-operator-demo]').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-operator-demo');
      const input = document.getElementById('operatorInput');
      if (input) input.value = demos[key] || demos.lead;
      form?.requestSubmit();
    });
  });
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = document.getElementById('operatorInput').value;
    const r = SiteOperatorBrain.answer(message);
    const esc = (s) => String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const surfaces = (r.live_surfaces || []).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.name)}</a>: ${esc(s.sales_use || s.purpose || '').slice(0,180)}</li>`).join('');
    output.innerHTML = `<div class="answer-card"><p class="eyebrow">Autonomous routing receipt</p><h3>${r.primary_brain}</h3><p><b>Cabinet:</b> ${r.primary_cabinet}</p><p><b>Secondary:</b> ${r.secondary_brain}</p><p><b>Task:</b> ${r.recommended_task}</p><ol>${r.next_actions.map(x=>`<li>${x}</li>`).join('')}</ol>${surfaces ? `<h4>Live surfaces to show</h4><ul>${surfaces}</ul>` : ''}<p class="warning">${r.guardrail}</p></div>`;
  });
  document.getElementById('exportOperatorData')?.addEventListener('click', () => SiteOperatorBrain.exportJson('all'));
  document.getElementById('clearOperatorData')?.addEventListener('click', () => SiteOperatorBrain.clearLocal());
});
