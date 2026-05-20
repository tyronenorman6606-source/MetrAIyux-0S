(() => {
  const APP_VERSION = '1.1.0';
  const STORAGE_KEY = 'skye0s.houseops.truth.v2';
  const GATE_BRIDGE_KEY = 'skye0s.houseops.gate.bridge.v1';
  const PRODUCTION_API_BASE = '/api/houseops';
  const SKYPAY_ORIGIN = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
  const PLAN_CATALOG = {
    'houseoperations-command': {
      id: 'houseoperations-command',
      name: 'HouseOperations Command',
      setup: 2500,
      monthly: 497,
      offer: 'metraiyux-houseoperations-command',
      activation: 'SkyePay checkout creates the paid-pending order; FS27 owner approval activates the workspace.',
      includes: [
        '1 HouseOperations command room',
        'task/vendor/schedule/owner-alert/proof workflows',
        '1 local SkyeBox encrypted authenticator vault',
        'FS27 PIN Gate handoff and exportable gate mirror packets',
        'tutorial runbook and browser-proof contract'
      ]
    },
    'houseoperations-managed': {
      id: 'houseoperations-managed',
      name: 'HouseOperations Managed',
      setup: 5000,
      monthly: 997,
      offer: 'metraiyux-houseoperations-managed',
      activation: 'Owner-approved managed rollout after SkyePay payment, scope review, and gate policy write.',
      includes: [
        'up to 3 HouseOperations command rooms',
        'managed weekly proof review',
        '3 local SkyeBox vault handoffs',
        'custom FS27 event mirror policy',
        'operator handoff and billing receipts'
      ]
    }
  };
  const tutorialSteps = [
    ['create-task', 'Create a task', 'Adds a real task record to the HouseOperations working state.'],
    ['create-vendor', 'Create a vendor', 'Adds a real vendor request with value, contact, and status.'],
    ['advance-task', 'Advance work', 'Moves a task from open to queued/review/done.'],
    ['create-alert', 'Create owner alert', 'Creates a blocked owner item so the alert lane has something to resolve.'],
    ['resolve-alert', 'Resolve owner alert', 'Marks the highest-pressure owner alert done.'],
    ['save-proof', 'Save proof', 'Writes a proof snapshot into the proof ledger.'],
    ['queue-gate', 'Queue Gate packet', 'Creates an exportable FS27 mirror packet from current state.'],
    ['create-billing', 'Create billing intent', 'Records the paid-plan intent and matching SkyePay offer URL.']
  ];
  const claimContract = [
    ['task_intake', 'Create and store house tasks', 'Task form/button writes records in the browser cache; /api/houseops/tasks is the gated cloud storage route.'],
    ['vendor_intake', 'Create and store vendor requests', 'Vendor form writes value/contact/status; /api/houseops/vendors is the gated cloud storage route.'],
    ['workboard', 'Move work through states', 'Advance buttons update task/vendor status and the Worker exposes matching advance routes.'],
    ['owner_alerts', 'Show and resolve owner alerts', 'Blocked/review/high-priority tasks render in Alerts and can be resolved.'],
    ['proof_ledger', 'Save proof snapshots', 'Save Proof writes proof ledger rows; /api/houseops/proof persists cloud proof snapshots.'],
    ['backup_export', 'Export backup JSON', 'Export downloads houseoperations-standalone-backup.json.'],
    ['gate_packet_export', 'Queue/export FS27 mirror packets', 'Queue Gate Mirror creates packets; /api/houseops/gate-packets persists cloud handoff packets.'],
    ['skyebox_vault', 'Open encrypted local TOTP vault', 'SkyeBox creates/unlocks WebCrypto vault, saves TOTP, exports encrypted backup.'],
    ['pin_gate', 'Hand off to FS27 PIN/recovery gate', 'FS27 has setup/login/recovery/rotation endpoints and PIN Gate UI; runtime requires FS27 env/DB.'],
    ['billing_intent', 'Create charge-ready plan intent', 'Billing page records plan, setup/monthly price, SkyePay offer, and activation boundary.'],
    ['tutorial', 'Run a guided operator tutorial', 'Tutorial buttons call the same app functions used by real operators.']
  ];
  const pages = [
    ['dashboard', 'Dashboard', 'ops', 'Command'],
    ['tasks', 'Tasks', 'work', 'Execution'],
    ['schedule', 'Schedule', 'cal', 'Calendar'],
    ['vendors', 'Vendors', 'in', 'Inbox'],
    ['alerts', 'Alerts', 'sig', 'Owner'],
    ['assignments', 'Assignments', 'crew', 'Teams'],
    ['runtime', 'Runtime', 'api', 'Proof'],
    ['billing', 'Billing', '$', 'Charge'],
    ['tutorial', 'Tutorial', '?', 'Runbook'],
    ['settings', 'Settings', 'ctl', 'OS']
  ];

  const seed = {
    tasks: [
      { id: 'task-1', title: 'Repair vendor invoice mismatch', owner: 'House Desk', due: 'Today 10:30', priority: 'high', status: 'open', lane: 'vendor', note: 'Invoice total does not match approved maintenance scope.' },
      { id: 'task-2', title: 'Confirm afternoon maintenance window', owner: 'Ops Lead', due: 'Today 12:00', priority: 'medium', status: 'queued', lane: 'schedule', note: 'Owner needs a confirmed field arrival window.' },
      { id: 'task-3', title: 'Close proof packet for supply order', owner: 'Finance', due: 'Today 15:00', priority: 'medium', status: 'review', lane: 'proof', note: 'Attach receipt, vendor approval, and owner note.' },
      { id: 'task-4', title: 'Owner approval for emergency dispatch', owner: 'Owner', due: 'Now', priority: 'high', status: 'blocked', lane: 'owner', note: 'Dispatch is paused until owner clears emergency spend.' }
    ],
    schedule: [
      { id: 'sch-1', time: '08:00', title: 'Morning house standup', lane: 'command', status: 'done' },
      { id: 'sch-2', time: '10:30', title: 'Vendor invoice correction', lane: 'finance', status: 'open' },
      { id: 'sch-3', time: '13:00', title: 'Maintenance dispatch', lane: 'field', status: 'queued' },
      { id: 'sch-4', time: '16:00', title: 'Owner closeout packet', lane: 'proof', status: 'review' }
    ],
    vendors: [
      { id: 'ven-1', name: 'North Valley Supply', request: 'Invoice correction', value: 860, status: 'review', contact: 'billing@northvalley.example' },
      { id: 'ven-2', name: 'Metro Maintenance', request: 'Emergency window', value: 1240, status: 'open', contact: 'dispatch@metro.example' },
      { id: 'ven-3', name: 'Ledger Courier', request: 'Proof receipt', value: 280, status: 'done', contact: 'receipts@ledger.example' }
    ],
    assignments: [
      { id: 'as-1', team: 'House Desk', load: 86, owner: 'Mara', lane: 'tasks', status: 'watch' },
      { id: 'as-2', team: 'Field Dispatch', load: 72, owner: 'Sia', lane: 'schedule', status: 'green' },
      { id: 'as-3', team: 'Finance Proof', load: 64, owner: 'Jalen', lane: 'vendors', status: 'green' }
    ],
    proofs: [
      { id: 'pf-house-5', title: 'SkyeGate PIN lane scoped', status: 'review', at: '2026-05-17', note: 'Gate can issue generated ID numbers, PIN credentials, and recovery codes through the FS27 auth lane.' },
      { id: 'pf-house-4', title: 'SkyeBox vault nested under HouseOperations', status: 'pass', at: '2026-05-17', note: 'Encrypted authenticator vault unpacked into skye-box-authenticator-vault with local-only PWA proof scripts.' },
      { id: 'pf-house-3', title: '0S expansion hub linked', status: 'pass', at: '2026-05-17', note: 'HouseOperations and SkyeBox now route back into the 0S public/operator proof surfaces.' },
      { id: 'pf-house-2', title: 'Standalone local state', status: 'pass', at: '2026-05-11', note: 'Tasks, vendors, schedule, assignments, and alerts write to local 0s state.' }
    ],
    activity: [
      { id: 'act-1', at: '08:04', actor: 'House Desk', action: 'opened command day', lane: 'command' },
      { id: 'act-2', at: '09:18', actor: 'Finance Proof', action: 'attached invoice mismatch note', lane: 'vendor' },
      { id: 'act-3', at: '10:02', actor: 'Ops Lead', action: 'queued owner alert for dispatch approval', lane: 'owner' }
    ],
    gatePackets: [],
    billingIntents: [],
    tutorialRuns: []
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const flow = ['open', 'queued', 'review', 'done'];
  const HOUSEOPS_API_BASE = (() => {
    const configured = window.METRAIYUX_API_BASES?.houseops || window.METRAIYUX_API_BASES?.houseoperations;
    if (configured) return String(configured).replace(/\/+$/, '');
    if (/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)) return '';
    return PRODUCTION_API_BASE;
  })();

  function runtimeModeLabel() {
    return HOUSEOPS_API_BASE ? '0S Worker runtime' : 'browser-local runtime';
  }

  function endpointHref(path) {
    const clean = String(path || '').replace(/^\/+/, '');
    return HOUSEOPS_API_BASE ? `${HOUSEOPS_API_BASE}/${clean}` : `./${clean}`;
  }

  function skyePayUrl(offerId, client = 'metraiyux-0s') {
    const url = new URL('/skyepay.html', SKYPAY_ORIGIN);
    url.searchParams.set('client', client || 'metraiyux-0s');
    url.searchParams.set('offer', offerId || PLAN_CATALOG['houseoperations-command'].offer);
    return url.toString();
  }

  function planById(id) {
    return PLAN_CATALOG[id] || PLAN_CATALOG['houseoperations-command'];
  }

  function latestBillingIntent(data = read()) {
    return data.billingIntents[0] || null;
  }

  function activePlan(data = read()) {
    return planById(latestBillingIntent(data)?.plan_id || 'houseoperations-command');
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(data) {
    const next = { ...clone(seed), ...(data || {}) };
    for (const key of ['tasks', 'schedule', 'vendors', 'assignments', 'proofs', 'activity', 'gatePackets', 'billingIntents', 'tutorialRuns']) {
      if (!Array.isArray(next[key])) next[key] = clone(seed[key]);
    }
    return next;
  }

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return write(normalize(saved || seed));
    } catch (_) {
      return write(clone(seed));
    }
  }

  function write(data) {
    const next = normalize(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function save(data) {
    write(data);
    render();
  }

  function gateConfig() {
    try {
      return JSON.parse(localStorage.getItem(GATE_BRIDGE_KEY) || 'null') || {
        origin: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev',
        appId: 'metraiyux-houseoperations'
      };
    } catch (_) {
      return { origin: '', appId: 'metraiyux-houseoperations' };
    }
  }

  function stats(data = read()) {
    const open = data.tasks.filter((task) => task.status !== 'done').length;
    const blocked = data.tasks.filter((task) => task.status === 'blocked').length;
    const vendorValue = data.vendors.reduce((sum, vendor) => sum + Number(vendor.value || 0), 0);
    const avgLoad = Math.round(data.assignments.reduce((sum, team) => sum + Number(team.load || 0), 0) / Math.max(1, data.assignments.length));
    const dueNow = data.tasks.filter((task) => String(task.due || '').toLowerCase().includes('now')).length;
    return { open, blocked, vendorValue, avgLoad, dueNow };
  }

  function badge(status) {
    const kind = status === 'done' || status === 'pass' || status === 'green'
      ? 'good'
      : status === 'blocked' || status === 'high' || status === 'watch'
        ? 'bad'
        : status === 'review' || status === 'medium'
          ? 'warn'
          : 'info';
    return `<span class="badge ${kind}">${esc(status)}</span>`;
  }

  function kpis() {
    const data = read();
    const s = stats(data);
    const plan = activePlan(data);
    return `<div class="kpis">
      <div class="kpi"><div class="num">${s.open}</div><div class="label">Open work orders</div></div>
      <div class="kpi"><div class="num">${s.blocked}</div><div class="label">Owner escalations</div></div>
      <div class="kpi"><div class="num">${money(s.vendorValue)}</div><div class="label">Vendor value</div></div>
      <div class="kpi"><div class="num">${money(plan.monthly)}</div><div class="label">Active monthly plan</div></div>
    </div>`;
  }

  function taskRows(data = read()) {
    return data.tasks.map((task) => `<tr>
      <td><b>${esc(task.title)}</b><br><span class="small-copy">${esc(task.owner)} / ${esc(task.lane || 'general')}</span></td>
      <td>${esc(task.due)}</td>
      <td>${badge(task.priority)}</td>
      <td>${badge(task.status)}</td>
      <td><button class="btn" data-action="advance-task" data-id="${esc(task.id)}">Advance</button></td>
    </tr>`).join('');
  }

  function scheduleRows(data = read()) {
    return data.schedule.map((event) => `<div class="event"><time>${esc(event.time)}</time><div><b>${esc(event.title)}</b><span>${esc(event.lane)}</span></div>${badge(event.status)}</div>`).join('');
  }

  function vendorRows(data = read()) {
    return data.vendors.map((vendor) => `<tr>
      <td><b>${esc(vendor.name)}</b><br><span class="small-copy">${esc(vendor.request)} / ${esc(vendor.contact || 'no contact')}</span></td>
      <td>${money(vendor.value)}</td>
      <td>${badge(vendor.status)}</td>
      <td><button class="btn" data-action="advance-vendor" data-id="${esc(vendor.id)}">Advance</button></td>
    </tr>`).join('');
  }

  function assignmentRows(data = read()) {
    return data.assignments.map((team) => `<tr>
      <td><b>${esc(team.team)}</b><br><span class="small-copy">${esc(team.owner)} / ${esc(team.lane)}</span></td>
      <td><div class="meter"><i style="--value:${Number(team.load || 0)}%"></i></div></td>
      <td>${badge(team.load >= 82 ? 'watch' : 'green')}</td>
    </tr>`).join('');
  }

  function proofRows(data = read()) {
    return data.proofs.map((proof) => `<tr><td><b>${esc(proof.title)}</b><br><span class="small-copy">${esc(proof.note)}</span></td><td>${badge(proof.status)}</td><td>${esc(proof.at)}</td></tr>`).join('');
  }

  function ownerAlertRows(data = read()) {
    const alerts = data.tasks.filter((task) => ['blocked', 'review'].includes(task.status) || task.priority === 'high');
    if (!alerts.length) return '<div class="emptyPanel"><h3>No owner alerts</h3><p>Nothing is blocked, high-priority, or waiting for closeout review.</p></div>';
    return alerts.map((task) => `<div class="alertItem">
      <div><b>${esc(task.title)}</b><span>${esc(task.owner)} / ${esc(task.due)} / ${esc(task.note || '')}</span></div>
      <div>${badge(task.status)} <button class="btn small" data-action="resolve-alert" data-id="${esc(task.id)}">Resolve</button></div>
    </div>`).join('');
  }

  function activityRows(data = read()) {
    return data.activity.slice(0, 8).map((row) => `<div class="event"><time>${esc(row.at)}</time><div><b>${esc(row.actor)}</b><span>${esc(row.action)}</span></div>${badge(row.lane)}</div>`).join('');
  }

  function workBoard(data = read()) {
    return `<div class="workBoard">${flow.map((status) => `<section class="workColumn"><h3>${esc(status)}</h3>${data.tasks.filter((task) => task.status === status).map((task) => `<article class="workCard"><b>${esc(task.title)}</b><span>${esc(task.owner)} / ${esc(task.due)}</span><p>${esc(task.note || '')}</p><div>${badge(task.priority)} <button class="btn small" data-action="advance-task" data-id="${esc(task.id)}">Advance</button></div></article>`).join('') || '<p class="small-copy">No work here.</p>'}</section>`).join('')}</div>`;
  }

  function taskIntakeForm() {
    return `<form class="intakeForm" data-form="task">
        <h3>Task intake</h3>
        <label>Title<input name="title" required placeholder="Owner approval, invoice issue, field handoff"></label>
        <label>Owner<input name="owner" required placeholder="House Desk"></label>
        <div class="formGrid">
          <label>Due<input name="due" required placeholder="Today 14:00"></label>
          <label>Priority<select name="priority"><option>medium</option><option>high</option><option>low</option></select></label>
        </div>
        <label>Lane<select name="lane"><option>owner</option><option>vendor</option><option>schedule</option><option>proof</option><option>field</option></select></label>
        <label>Note<textarea name="note" placeholder="What changed, what proof is needed, or who is blocked"></textarea></label>
        <button class="btn primary" type="submit">Create Task</button>
      </form>`;
  }

  function vendorIntakeForm() {
    return `<form class="intakeForm" data-form="vendor">
        <h3>Vendor intake</h3>
        <label>Vendor<input name="name" required placeholder="Vendor name"></label>
        <label>Request<input name="request" required placeholder="Invoice, dispatch, quote, receipt"></label>
        <div class="formGrid">
          <label>Value<input name="value" inputmode="numeric" placeholder="500"></label>
          <label>Status<select name="status"><option>open</option><option>queued</option><option>review</option><option>done</option></select></label>
        </div>
        <label>Contact<input name="contact" placeholder="ops@example.com"></label>
        <button class="btn primary" type="submit">Create Vendor</button>
      </form>`;
  }

  function intakeForms() {
    return `<div class="commandDeck">${taskIntakeForm()}${vendorIntakeForm()}</div>`;
  }

  function gatePanel(data = read()) {
    const cfg = gateConfig();
    return `<div class="panel span12"><div class="panelHead"><div><h2>SkyeGate bridge</h2><p>HouseOperations now knows where the parent gate is and can export mirror packets for review, execution, and dispatch state.</p></div><a class="btn" href="https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/pin-gate.html">PIN Gate</a></div><div class="panelBody bridgeGrid">
      <div class="bridgeCard"><b>Gate origin</b><code>${esc(cfg.origin || 'not configured')}</code><span>${esc(cfg.appId || 'metraiyux-houseoperations')}</span></div>
      <div class="bridgeCard"><b>Queued packets</b><strong>${data.gatePackets.length}</strong><span>local mirror packets ready to export or send through FS27 event mirror when the Worker secret is configured.</span></div>
      <div class="bridgeActions"><button class="btn primary" data-action="queue-gate-mirror">Queue Gate Mirror</button><button class="btn" data-action="export-gate-packet">Export Gate Packet</button><a class="btn" href="../proof/houseoperations-skyebox-expansion-receipt.html">Proof Receipt</a></div>
    </div></div>`;
  }

  function planCard(plan, activeId) {
    return `<article class="planCard ${plan.id === activeId ? 'active' : ''}">
      <p class="crumb">${esc(plan.id)}</p>
      <h3>${esc(plan.name)}</h3>
      <strong>${money(plan.monthly)}<span>/mo</span></strong>
      <p><b>Setup:</b> ${money(plan.setup)}</p>
      <p>${esc(plan.activation)}</p>
      <ul>${plan.includes.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      <a class="btn" href="${esc(skyePayUrl(plan.offer))}">Open SkyePay offer</a>
    </article>`;
  }

  function billingIntentRows(data = read()) {
    if (!data.billingIntents.length) return '<div class="emptyPanel"><h3>No billing intents yet</h3><p>Create one from the billing form before sending a client to SkyePay.</p></div>';
    return data.billingIntents.slice(0, 6).map((intent) => `<div class="runtimeRow">
      <div><b>${esc(intent.company || intent.customer_email || intent.plan_name)}</b><br><code>${esc(intent.id)}</code><span class="small-copy">${esc(intent.plan_name)} / ${money(intent.setup_usd)} setup / ${money(intent.monthly_usd)} monthly / ${esc(intent.status)}</span></div>
      <a class="btn" href="${esc(intent.checkout_url)}">Checkout</a>
    </div>`).join('');
  }

  function billingForm(data = read()) {
    const latest = latestBillingIntent(data);
    return `<form class="intakeForm" data-form="billing">
      <h3>Create charge-ready intent</h3>
      <label>Plan<select name="plan_id">${Object.values(PLAN_CATALOG).map((plan) => `<option value="${esc(plan.id)}" ${latest?.plan_id === plan.id ? 'selected' : ''}>${esc(plan.name)} - ${money(plan.setup)} setup + ${money(plan.monthly)}/mo</option>`).join('')}</select></label>
      <label>Customer email<input name="customer_email" type="email" required placeholder="client@example.com" value="${esc(latest?.customer_email || '')}"></label>
      <label>Company<input name="company" required placeholder="Client company" value="${esc(latest?.company || '')}"></label>
      <label>Client slug<input name="client_slug" value="${esc(latest?.client_slug || 'metraiyux-0s')}"></label>
      <label>Payment method<select name="payment_method"><option>SkyePay card checkout</option><option>Owner-approved invoice</option><option>ACH / bank transfer</option><option>Custom enterprise billing</option></select></label>
      <p class="small-copy">This records the paid plan and opens the matching SkyePay offer. It does not fake payment; confirmed payment and activation live in SkyePay/FS27.</p>
      <button class="btn primary" type="submit">Create Billing Intent</button>
    </form>`;
  }

  function claimRows() {
    return claimContract.map(([id, claim, proof]) => `<tr><td><code>${esc(id)}</code></td><td>${esc(claim)}</td><td>${esc(proof)}</td><td>${badge('backed')}</td></tr>`).join('');
  }

  function tutorialCards(data = read()) {
    const done = new Set(data.tutorialRuns.map((run) => run.step_id));
    return `<div class="tutorialGrid">${tutorialSteps.map(([id, label, proof], index) => `<article class="lessonCard ${done.has(id) ? 'done' : ''}">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <h3>${esc(label)}</h3>
      <p>${esc(proof)}</p>
      <button class="btn ${done.has(id) ? '' : 'primary'}" data-action="run-tutorial-step" data-step="${esc(id)}">${done.has(id) ? 'Run Again' : 'Run Step'}</button>
    </article>`).join('')}</div>`;
  }

  function tutorialRunRows(data = read()) {
    if (!data.tutorialRuns.length) return '<div class="emptyPanel"><h3>No tutorial steps recorded</h3><p>Run a step or use Run Full Tutorial to produce a local handoff receipt.</p></div>';
    return data.tutorialRuns.slice(0, 10).map((run) => `<div class="event"><time>${esc(run.at_display)}</time><div><b>${esc(run.label)}</b><span>${esc(run.result)}</span></div>${badge('done')}</div>`).join('');
  }

  function commandHero(eyebrow, title, body, actions = '') {
    const data = read();
    const s = stats(data);
    const plan = activePlan(data);
    return `<section class="span12 commandMarquee" data-mcp-surface="radical-v3">
      <div class="marqueeCopy">
        <div class="crumb">${esc(eyebrow)}</div>
        <h2 class="neon-gradient-text premium-text-effects-lab">${esc(title)}</h2>
        <p>${esc(body)}</p>
        <div class="actions commandActions">${actions}</div>
      </div>
      <div class="missionStack" aria-label="HouseOperations live status">
        <div class="missionPlate mainPlate"><span>Open</span><strong>${s.open}</strong><small>work orders</small></div>
        <div class="missionPlate"><span>Owner</span><strong>${s.blocked}</strong><small>escalations</small></div>
        <div class="missionPlate"><span>Vendor</span><strong>${money(s.vendorValue)}</strong><small>tracked value</small></div>
        <div class="missionPlate accent"><span>Plan</span><strong>${money(plan.monthly)}</strong><small>monthly lane</small></div>
      </div>
    </section>`;
  }

  function securityRunway() {
    return `<section class="panel span12 securityRunway">
      <div class="panelHead"><div><h2>SkyeBox Authenticator and Gate lane</h2><p>The vault and the FS27 PIN/recovery handoff are surfaced as working product controls, not sidebar afterthoughts.</p></div></div>
      <div class="panelBody runwayGrid">
        <a class="runwayTile" href="./skye-box-authenticator-vault/index.html"><span>01</span><h3>SkyeBox Authenticator</h3><p>Encrypted local TOTP vault, backup export, offline PWA assets, and proof scripts.</p></a>
        <a class="runwayTile" href="https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/pin-gate.html"><span>02</span><h3>FS27 PIN Gate</h3><p>Generated Gate ID plus PIN unlock, recovery path, and owner-controlled activation boundary.</p></a>
        <a class="runwayTile" href="./runtime.html"><span>03</span><h3>Runtime Proof</h3><p>Endpoint checks, claim contract, local proof ledger, and exportable mirror packets.</p></a>
        <a class="runwayTile" href="./billing.html"><span>04</span><h3>Billing Intent</h3><p>Paid scope, setup/monthly pricing, SkyePay offer URL, and activation handoff receipt.</p></a>
      </div>
    </section>`;
  }

  function proofSpine(data = read()) {
    const rows = data.proofs.slice(0, 4).map((proof, index) => `<article class="spineNode">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${esc(proof.title)}</h3><p>${esc(proof.note)}</p></div>
      ${badge(proof.status)}
    </article>`).join('');
    return `<section class="panel span4 proofSpine"><div class="panelHead"><div><h2>Proof spine</h2><p>Receipts tied to the running app.</p></div></div><div class="panelBody">${rows}</div></section>`;
  }

  function dashboardView() {
    return `<section class="grid opsFloor">
      ${commandHero(
        'HouseOperations Command / radical v3',
        'Run the house from a live operations floor.',
        'Task intake, vendors, schedule pressure, owner decisions, proof, billing, vault custody, and Gate packets are now laid out as one working command surface.',
        '<button class="btn primary" data-action="new-task">New Task</button><button class="btn" data-action="new-vendor">New Vendor</button><button class="btn" data-action="save-proof">Save Proof</button><button class="btn" data-action="export">Export</button>'
      )}
      <div class="span12 commandTicker">${kpis()}</div>
      ${securityRunway()}
      <div class="panel span8 intakeDock"><div class="panelHead"><div><h2>Operator intake dock</h2><p>Create real task and vendor records with owner, lane, value, contact, and notes.</p></div></div><div class="panelBody">${intakeForms()}</div></div>
      ${proofSpine()}
      ${gatePanel()}
      <div class="panel span8 commandSurface"><div class="panelHead"><div><h2>Task Command</h2><p>Owner, due date, priority, and state stay editable through the same app actions.</p></div><a class="btn" href="./tasks.html">Open workboard</a></div><div class="panelBody tableWrap"><table><thead><tr><th>Task</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>${taskRows()}</tbody></table></div></div>
      <div class="panel span4 alertTower"><div class="panelHead"><div><h2>Owner alert tower</h2><p>High, blocked, and review items only.</p></div></div><div class="panelBody alertList">${ownerAlertRows()}</div></div>
      <div class="panel span8 workFloor"><div class="panelHead"><div><h2>Workboard floor</h2><p>State movement across open, queued, review, and done.</p></div></div><div class="panelBody">${workBoard()}</div></div>
      <div class="panel span4"><div class="panelHead"><div><h2>Activity Trail</h2><p>Latest local operating events.</p></div></div><div class="panelBody timeline">${activityRows()}</div></div>
    </section>`;
  }

  function tasksView() {
    return `<section class="grid"><div class="panel span12"><div class="panelHead"><div><h2>Tasks</h2><p>Move house work from open to done with owner, lane, and proof context.</p></div><button class="btn primary" data-action="new-task">New Task</button></div><div class="panelBody">${workBoard()}</div></div><div class="panel span12"><div class="panelBody tableWrap"><table><thead><tr><th>Task</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>${taskRows()}</tbody></table></div></div></section>`;
  }

  function scheduleView() {
    return `<section class="grid"><div class="panel span7"><div class="panelHead"><div><h2>Schedule</h2><p>Daily operating windows.</p></div></div><div class="panelBody timeline">${scheduleRows()}</div></div><div class="panel span5"><div class="panelHead"><div><h2>Capacity</h2><p>House desk load by lane.</p></div></div><div class="panelBody laneGrid"><div class="lane"><h3>Morning</h3><p>Standup, vendor correction, and dispatch readiness.</p></div><div class="lane"><h3>Afternoon</h3><p>Maintenance dispatch, owner approvals, and proof closeout.</p></div><div class="lane"><h3>Close</h3><p>Ledger, handoff pack, and unresolved alert review.</p></div></div></div></section>`;
  }

  function vendorsView() {
    return `<section class="grid"><div class="panel span8"><div class="panelHead"><div><h2>Vendors</h2><p>Requests, value, contact, status, and owner review.</p></div><button class="btn primary" data-action="new-vendor">New Vendor</button></div><div class="panelBody tableWrap"><table><thead><tr><th>Vendor</th><th>Value</th><th>Status</th><th></th></tr></thead><tbody>${vendorRows()}</tbody></table></div></div><div class="panel span4"><div class="panelHead"><div><h2>Vendor Intake</h2><p>Create a real vendor record.</p></div></div><div class="panelBody">${vendorIntakeForm()}</div></div></section>`;
  }

  function alertsView() {
    return `<section class="grid"><div class="panel span8"><div class="panelHead"><div><h2>Owner Alerts</h2><p>Blocked, review, and high-priority work only.</p></div><button class="btn primary" data-action="save-proof">Save Alert Proof</button></div><div class="panelBody alertList">${ownerAlertRows()}</div></div><div class="panel span4"><div class="panelHead"><div><h2>Escalation Rules</h2><p>What makes an item visible to ownership.</p></div></div><div class="panelBody laneGrid"><div class="lane"><h3>Blocked work</h3><p>Anything waiting on approval, vendor correction, field access, or missing invoice proof stays visible until cleared.</p></div><div class="lane"><h3>Review queue</h3><p>Completed work needing owner note, receipt capture, or closeout packet stays in review.</p></div><div class="lane"><h3>Proof save</h3><p>Each alert snapshot writes into the local proof ledger.</p></div></div></div></section>`;
  }

  function assignmentsView() {
    return `<section class="grid"><div class="panel span8"><div class="panelHead"><div><h2>Assignments</h2><p>Team ownership and load.</p></div></div><div class="panelBody tableWrap"><table><thead><tr><th>Team</th><th>Load</th><th>Status</th></tr></thead><tbody>${assignmentRows()}</tbody></table></div></div><div class="panel span4"><div class="panelHead"><div><h2>Handoff</h2><p>Shared execution notes.</p></div></div><div class="panelBody timeline"><div class="event"><time>desk</time><div><b>Task proof</b><span>Open work must carry owner and due state.</span></div>${badge('pass')}</div><div class="event"><time>field</time><div><b>Dispatch proof</b><span>Field assignments require closeout note.</span></div>${badge('review')}</div></div></div></section>`;
  }

  function runtimeView() {
    const apiPaths = ['health','status','tasks','vendors','schedule','alerts','assignments','proof','gate-packets','queue','handoff-packs','review-board','execution-board','dispatch-board','v1/runtime-summary','v1/sessions','exports','audit'];
    return `<section class="grid">${gatePanel()}<div class="panel span12"><div class="panelHead"><div><h2>Runtime Proof</h2><p>${runtimeModeLabel()} endpoints plus preserved legacy shell links.</p></div></div><div class="panelBody runtimeList">
      ${apiPaths.map((path) => `<div class="runtimeRow"><div><b>${path}</b><br><code>${esc(endpointHref(path))}</code></div><a class="btn" href="${esc(endpointHref(path))}">Open</a></div>`).join('')}
      <div class="runtimeRow"><div><b>SkyeBox Authenticator Vault</b><br><code>./skye-box-authenticator-vault/index.html</code></div><a class="btn" href="./skye-box-authenticator-vault/index.html">Open</a></div>
      <div class="runtimeRow"><div><b>SkyeGate PIN Gate</b><br><code>https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/pin-gate.html</code></div><a class="btn" href="https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/pin-gate.html">Open</a></div>
      <div class="runtimeRow"><div><b>HouseOperations tutorial</b><br><code>./tutorial.html</code></div><a class="btn" href="./tutorial.html">Open</a></div>
      <div class="runtimeRow"><div><b>HouseOperations billing</b><br><code>./billing.html</code></div><a class="btn" href="./billing.html">Open</a></div>
      <div class="runtimeRow"><div><b>0S expansion proof hub</b><br><code>../live/houseoperations-skyebox-operator-proof.html</code></div><a class="btn" href="../live/houseoperations-skyebox-operator-proof.html">Open</a></div>
      <div class="runtimeRow"><div><b>Legacy routed shell</b><br><code>./_legacy_shell/index.html</code></div><a class="btn" href="./_legacy_shell/index.html">Open</a></div>
    </div></div><div class="panel span12"><div class="panelHead"><div><h2>Truth Contract</h2><p>Every sellable claim maps to a working control, endpoint, export, or proof run.</p></div><button class="btn" data-action="export-claim-contract">Export Claim Contract</button></div><div class="panelBody tableWrap"><table><thead><tr><th>ID</th><th>Claim</th><th>Backing proof</th><th>Status</th></tr></thead><tbody>${claimRows()}</tbody></table></div></div><div class="panel span12"><div class="panelHead"><div><h2>Proof Ledger</h2><p>Local HouseOperations proof rows.</p></div></div><div class="panelBody tableWrap"><table><thead><tr><th>Proof</th><th>Status</th><th>At</th></tr></thead><tbody>${proofRows()}</tbody></table></div></div></section>`;
  }

  function billingView() {
    const data = read();
    const active = activePlan(data);
    return `<section class="grid">
      ${commandHero(
        'Charge-ready app lane',
        'Create the client payment handoff from inside the product.',
        'HouseOperations records the plan intent, price, included scope, SkyePay offer URL, and activation boundary. Payment and entitlement enforcement stay with SkyePay and FS27.',
        `<button class="btn primary" data-action="create-billing-intent">Create Billing Intent</button><button class="btn" data-action="export-billing-intent">Export Intent</button><a class="btn" href="${esc(skyePayUrl(active.offer))}">Open SkyePay</a>`
      )}
      <div class="panel span5 billingConsole"><div class="panelHead"><div><h2>Billing Intent</h2><p>Create the receipt that tells the client what they are paying for before checkout.</p></div></div><div class="panelBody">${billingForm(data)}</div></div>
      <div class="panel span7 intentLedger"><div class="panelHead"><div><h2>Latest Intents</h2><p>Stored locally for proof and handoff.</p></div><button class="btn" data-action="export-billing-intent">Export</button></div><div class="panelBody runtimeList">${billingIntentRows(data)}</div></div>
      <div class="panel span12 pricingRunway"><div class="panelHead"><div><h2>Paid Scope</h2><p>These are the only HouseOperations plans this app is allowed to sell today.</p></div></div><div class="panelBody planGrid">${Object.values(PLAN_CATALOG).map((plan) => planCard(plan, active.id)).join('')}</div></div>
    </section>`;
  }

  function tutorialView() {
    const data = read();
    const completed = new Set(data.tutorialRuns.map((run) => run.step_id)).size;
    return `<section class="grid">
      ${commandHero(
        'Built-in operator training',
        'A tutorial that presses the same controls a paid operator uses.',
        'This is not loose documentation. Each step fires the dashboard, billing lane, proof ledger, and Gate packet flow through the same local app actions.',
        '<button class="btn primary" data-action="run-full-tutorial">Run Full Tutorial</button><button class="btn" data-action="export-tutorial-receipt">Export Tutorial Receipt</button><a class="btn" href="./runtime.html">Runtime Proof</a>'
      )}
      <div class="span12 commandTicker">${kpis()}</div>
      <div class="panel span12 tutorialDeck"><div class="panelHead"><div><h2>Guided Run</h2><p>${completed}/${tutorialSteps.length} tutorial steps recorded in this browser.</p></div></div><div class="panelBody">${tutorialCards(data)}</div></div>
      <div class="panel span7 receiptConsole"><div class="panelHead"><div><h2>Tutorial Receipt</h2><p>Every completed step writes a local run row.</p></div></div><div class="panelBody timeline">${tutorialRunRows(data)}</div></div>
      <div class="panel span5 ruleConsole"><div class="panelHead"><div><h2>Operating Rule</h2><p>What paid users should understand before handoff.</p></div></div><div class="panelBody laneGrid"><div class="lane"><h3>Local state</h3><p>Tasks, vendors, proof, tutorial runs, and billing intents live in this browser until exported or mirrored.</p></div><div class="lane"><h3>SkyeBox custody</h3><p>TOTP secrets stay in the encrypted local vault; FS27 PIN recovery does not recover TOTP secrets.</p></div><div class="lane"><h3>Paid access</h3><p>SkyePay/FS27 own payment, approval, and entitlement enforcement.</p></div></div></div>
    </section>`;
  }

  function settingsView() {
    const cfg = gateConfig();
    return `<section class="grid"><div class="panel span6"><div class="panelHead"><div><h2>Settings</h2><p>0S-owned controls.</p></div></div><div class="panelBody formGrid"><button class="btn primary" data-action="fullscreen">Enter Fullscreen</button><button class="btn" data-action="export">Export Backup</button><button class="btn" data-action="save-proof">Save Proof</button><button class="btn danger" data-action="reset">Reset Local State</button></div></div><div class="panel span6"><div class="panelHead"><div><h2>SkyeGate bridge settings</h2><p>Store only public origin/app metadata here. Event mirror secrets belong in Worker/env, not the browser.</p></div></div><div class="panelBody"><form class="intakeForm" data-form="gate"><label>Gate origin<input name="origin" value="${esc(cfg.origin || '')}" placeholder="https://skyegatefs27-citadeldb.graylondonskyes.workers.dev"></label><label>App id<input name="appId" value="${esc(cfg.appId || 'metraiyux-houseoperations')}"></label><button class="btn primary" type="submit">Save Gate Bridge</button></form></div></div><div class="panel span12"><div class="panelHead"><div><h2>Storage</h2><p>Browser cache plus gated Worker namespace.</p></div></div><div class="panelBody runtimeList"><div class="runtimeRow"><div><b>Browser cache key</b><br><code>${STORAGE_KEY}</code></div>${badge('owned')}</div><div class="runtimeRow"><div><b>Worker API base</b><br><code>${esc(HOUSEOPS_API_BASE || 'not mounted on localhost')}</code></div>${badge(HOUSEOPS_API_BASE ? 'live/gated' : 'local')}</div><div class="runtimeRow"><div><b>Legacy closure</b><br><code>_legacy_shell/</code></div>${badge('pass')}</div><div class="runtimeRow"><div><b>Runtime endpoints</b><br><code>health / status / tasks / vendors / schedule / alerts / assignments / proof / exports</code></div>${badge(HOUSEOPS_API_BASE ? 'worker' : 'local')}</div></div></div></section>`;
  }

  const views = { dashboard: dashboardView, tasks: tasksView, schedule: scheduleView, vendors: vendorsView, alerts: alertsView, assignments: assignmentsView, runtime: runtimeView, billing: billingView, tutorial: tutorialView, settings: settingsView };

  function currentView() {
    const fromBody = document.body.dataset.view;
    if (views[fromBody]) return fromBody;
    const name = location.pathname.split('/').pop().replace(/\.html$/, '') || 'dashboard';
    return views[name] ? name : 'dashboard';
  }

  function renderNav(view) {
    $('#nav').innerHTML = pages.map(([id, label, glyph, sub]) => `<a href="./${id === 'dashboard' ? 'index' : id}.html" class="${id === view ? 'active' : ''}"><span>${glyph}</span><span><strong>${label}</strong><small>${sub}</small></span></a>`).join('');
  }

  function renderTitle(view) {
    const page = pages.find((item) => item[0] === view) || pages[0];
    document.title = `HouseOperations · ${page[1]}`;
    $('#viewCrumb').textContent = 'HouseOperations / ' + page[1];
    $('#viewTitle').textContent = page[1];
    $('#viewSub').textContent = {
      dashboard: 'Real app surface for task intake, vendors, owner alerts, proof, and gate mirror packets.',
      tasks: 'Workboard and table state movement.',
      schedule: 'Daily schedule and capacity windows.',
      vendors: 'Vendor requests, value, approval, and closeout.',
      alerts: 'Owner-facing blocked, review, and high-priority items.',
      assignments: 'Team load, lane ownership, and handoff pressure.',
      runtime: '0S Worker endpoints, SkyeBox, SkyeGate, and legacy shell closure.',
      billing: 'Charge-ready plan intent, SkyePay offer, and activation boundary.',
      tutorial: 'Training workflow that executes the real app workflow.',
      settings: 'Storage, bridge metadata, proof, fullscreen, and backup controls.'
    }[view];
  }

  function render() {
    const view = currentView();
    renderNav(view);
    renderTitle(view);
    $('#app').innerHTML = views[view]();
    bind($('.topbar'));
    bind($('#app'));
  }

  function toast(message) {
    const old = $('.toast');
    if (old) old.remove();
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2400);
  }

  function pushActivity(data, actor, action, lane = 'command') {
    const stamp = new Date();
    data.activity.unshift({ id: uid('act'), at: stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), actor, action, lane });
    data.activity = data.activity.slice(0, 30);
  }

  function addTask(payload = {}) {
    const data = read();
    data.tasks.unshift({
      id: uid('task'),
      title: payload.title || 'New house task',
      owner: payload.owner || 'House Desk',
      due: payload.due || 'Today',
      priority: payload.priority || 'medium',
      status: 'open',
      lane: payload.lane || 'owner',
      note: payload.note || 'Created from HouseOperations intake.'
    });
    pushActivity(data, payload.owner || 'House Desk', `created task: ${payload.title || 'New house task'}`, payload.lane || 'owner');
    save(data);
    toast('Task added.');
  }

  function addVendor(payload = {}) {
    const data = read();
    data.vendors.unshift({
      id: uid('ven'),
      name: payload.name || 'New Vendor',
      request: payload.request || 'New request',
      value: Number(payload.value || 500),
      status: payload.status || 'open',
      contact: payload.contact || ''
    });
    pushActivity(data, 'Vendor Desk', `created vendor: ${payload.name || 'New Vendor'}`, 'vendor');
    save(data);
    toast('Vendor added.');
  }

  function advance(listName, id) {
    const data = read();
    const item = data[listName].find((row) => row.id === id);
    if (!item) return;
    item.status = flow[Math.min(Math.max(0, flow.indexOf(item.status)) + 1, flow.length - 1)] || 'queued';
    pushActivity(data, item.owner || item.name || 'House Desk', `advanced ${item.title || item.request || item.name} to ${item.status}`, item.lane || 'command');
    save(data);
    toast('State advanced.');
  }

  function resolveAlert(id) {
    const data = read();
    const item = data.tasks.find((row) => row.id === id);
    if (!item) return;
    item.status = 'done';
    item.priority = item.priority === 'high' ? 'medium' : item.priority;
    pushActivity(data, 'Owner Desk', `resolved owner alert: ${item.title}`, 'owner');
    save(data);
    toast('Owner alert resolved.');
  }

  function saveProof() {
    const data = read();
    const s = stats(data);
    data.proofs.unshift({
      id: uid('pf'),
      title: 'HouseOperations proof snapshot',
      status: 'pass',
      at: new Date().toLocaleString(),
      note: `Snapshot saved with ${s.open} open work orders, ${s.blocked} owner escalations, ${data.vendors.length} vendors, and ${data.gatePackets.length} queued gate packets.`
    });
    pushActivity(data, 'Proof Desk', 'saved proof snapshot', 'proof');
    save(data);
    toast('Proof saved.');
  }

  function queueGateMirror() {
    const data = read();
    const cfg = gateConfig();
    const packet = {
      id: uid('gate'),
      created_at: new Date().toISOString(),
      app_id: cfg.appId || 'metraiyux-houseoperations',
      source_app: 'metraiyux-0s',
      lane: 'houseoperations',
      billable: false,
      privileged: true,
      stats: stats(data),
      task_count: data.tasks.length,
      vendor_count: data.vendors.length,
      proof_count: data.proofs.length
    };
    data.gatePackets.unshift(packet);
    pushActivity(data, 'SkyeGate Bridge', `queued mirror packet ${packet.id}`, 'gate');
    save(data);
    toast('Gate mirror packet queued.');
  }

  function createBillingIntent(payload = {}) {
    const data = read();
    const plan = planById(payload.plan_id);
    const clientSlug = payload.client_slug || 'metraiyux-0s';
    const intent = {
      id: uid('bill'),
      type: 'houseoperations_billing_intent',
      status: 'ready_for_skyepay_checkout',
      created_at: new Date().toISOString(),
      plan_id: plan.id,
      plan_name: plan.name,
      setup_usd: plan.setup,
      monthly_usd: plan.monthly,
      customer_email: payload.customer_email || 'preview-client@example.com',
      company: payload.company || 'Preview Client',
      client_slug: clientSlug,
      payment_method: payload.payment_method || 'SkyePay card checkout',
      checkout_url: skyePayUrl(plan.offer, clientSlug),
      owner_approval_required: true,
      activation_boundary: plan.activation,
      included_scope: plan.includes,
      proof_boundary: 'HouseOperations records the commercial intent locally; SkyePay/FS27 owns payment confirmation, plan policy write, and activation.'
    };
    data.billingIntents.unshift(intent);
    pushActivity(data, 'Billing Desk', `created billing intent for ${plan.name}`, 'billing');
    save(data);
    toast('Billing intent created.');
    return intent;
  }

  function exportBillingIntent() {
    const data = read();
    if (!data.billingIntents.length) createBillingIntent();
    exportJson('houseoperations-billing-intent.json', { exportedAt: new Date().toISOString(), intents: read().billingIntents });
  }

  function exportClaimContract() {
    exportJson('houseoperations-claim-contract.json', {
      exportedAt: new Date().toISOString(),
      app: 'HouseOperations',
      version: APP_VERSION,
      claims: claimContract.map(([id, claim, proof]) => ({ id, claim, proof }))
    });
  }

  function recordTutorialRun(stepId, label, result) {
    const data = read();
    const stamp = new Date();
    data.tutorialRuns.unshift({
      id: uid('run'),
      step_id: stepId,
      label,
      result,
      at: stamp.toISOString(),
      at_display: stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    pushActivity(data, 'Tutorial', `completed tutorial step: ${label}`, 'tutorial');
    save(data);
  }

  function addOwnerAlert() {
    const data = read();
    const task = {
      id: uid('task'),
      title: 'Tutorial owner approval block',
      owner: 'Owner',
      due: 'Now',
      priority: 'high',
      status: 'blocked',
      lane: 'owner',
      note: 'Created by the HouseOperations tutorial to prove owner-alert routing.'
    };
    data.tasks.unshift(task);
    pushActivity(data, 'Tutorial', `created owner alert: ${task.title}`, 'owner');
    save(data);
    toast('Owner alert created.');
  }

  function runTutorialStep(stepId) {
    const step = tutorialSteps.find(([id]) => id === stepId);
    const label = step?.[1] || stepId;
    let result = 'No step matched.';
    if (stepId === 'create-task') {
      addTask({ title: 'Tutorial house task', owner: 'Tutorial Desk', due: 'Today 16:00', priority: 'medium', lane: 'proof', note: 'Created by guided run.' });
      result = 'Task created.';
    }
    if (stepId === 'create-vendor') {
      addVendor({ name: 'Tutorial Vendor', request: 'Guided invoice check', value: 640, status: 'open', contact: 'vendor@example.com' });
      result = 'Vendor created.';
    }
    if (stepId === 'advance-task') {
      const firstTask = read().tasks[0];
      if (firstTask) {
        advance('tasks', firstTask.id);
        result = `Task advanced: ${firstTask.title}`;
      }
    }
    if (stepId === 'create-alert') {
      addOwnerAlert();
      result = 'Owner alert created.';
    }
    if (stepId === 'resolve-alert') {
      const alert = read().tasks.find((task) => task.status === 'blocked' || task.priority === 'high' || task.status === 'review');
      if (alert) {
        resolveAlert(alert.id);
        result = `Owner alert resolved: ${alert.title}`;
      }
    }
    if (stepId === 'save-proof') {
      saveProof();
      result = 'Proof snapshot saved.';
    }
    if (stepId === 'queue-gate') {
      queueGateMirror();
      result = 'Gate mirror packet queued.';
    }
    if (stepId === 'create-billing') {
      const intent = createBillingIntent();
      result = `Billing intent created: ${intent.plan_name}`;
    }
    recordTutorialRun(stepId, label, result);
    toast(`Tutorial step complete: ${label}`);
  }

  function runFullTutorial() {
    tutorialSteps.forEach(([stepId]) => runTutorialStep(stepId));
  }

  function exportTutorialReceipt() {
    exportJson('houseoperations-tutorial-receipt.json', {
      exportedAt: new Date().toISOString(),
      app: 'HouseOperations',
      version: APP_VERSION,
      tutorial_steps: tutorialSteps.map(([id, label, proof]) => ({ id, label, proof })),
      runs: read().tutorialRuns
    });
  }

  function exportJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
  }

  function exportBackup() {
    exportJson('houseoperations-standalone-backup.json', { exportedAt: new Date().toISOString(), state: read() });
  }

  function exportGatePacket() {
    const data = read();
    if (!data.gatePackets.length) queueGateMirror();
    exportJson('houseoperations-gate-mirror-packet.json', { exportedAt: new Date().toISOString(), gate: gateConfig(), packets: read().gatePackets });
  }

  function formPayload(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function bindForms(root) {
    $$('form[data-form]', root).forEach((form) => {
      if (form.dataset.bound === 'true') return;
      form.dataset.bound = 'true';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const payload = formPayload(form);
        if (form.dataset.form === 'task') addTask(payload);
        if (form.dataset.form === 'vendor') addVendor(payload);
        if (form.dataset.form === 'billing') createBillingIntent(payload);
        if (form.dataset.form === 'gate') {
          localStorage.setItem(GATE_BRIDGE_KEY, JSON.stringify(payload));
          toast('Gate bridge saved.');
          render();
        }
      });
    });
  }

  function bind(root) {
    if (!root) return;
    bindForms(root);
    $$('[data-action]', root).forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'new-task') addTask();
        if (action === 'new-vendor') addVendor();
        if (action === 'advance-task') advance('tasks', button.dataset.id);
        if (action === 'advance-vendor') advance('vendors', button.dataset.id);
        if (action === 'resolve-alert') resolveAlert(button.dataset.id);
        if (action === 'save-proof') saveProof();
        if (action === 'queue-gate-mirror') queueGateMirror();
        if (action === 'export-gate-packet') exportGatePacket();
        if (action === 'create-billing-intent') createBillingIntent();
        if (action === 'export-billing-intent') exportBillingIntent();
        if (action === 'export-claim-contract') exportClaimContract();
        if (action === 'run-tutorial-step') runTutorialStep(button.dataset.step);
        if (action === 'run-full-tutorial') runFullTutorial();
        if (action === 'export-tutorial-receipt') exportTutorialReceipt();
        if (action === 'export') exportBackup();
        if (action === 'fullscreen') document.documentElement.requestFullscreen?.();
        if (action === 'reset') {
          localStorage.removeItem(STORAGE_KEY);
          render();
          toast('HouseOperations state reset.');
        }
      });
    });
  }

  function initMotionChrome() {
    const update = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      document.body.style.setProperty('--scroll-progress', progress.toFixed(4));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  window.HouseOperations = { read, saveProof, queueGateMirror, exportGatePacket, createBillingIntent, runTutorialStep, runFullTutorial, render };
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.dataset.houseopsSurfaceVersion = 'radical-v3-20260517';
    initMotionChrome();
    render();
  });
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
