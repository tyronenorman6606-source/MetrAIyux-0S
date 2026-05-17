(() => {
  const APP_VERSION = '1.1.0';
  const STORAGE_KEY = 'skye0s.houseops.truth.v2';
  const GATE_BRIDGE_KEY = 'skye0s.houseops.gate.bridge.v1';
  const SKYPAY_ORIGIN = 'https://skyesol.netlify.app';
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
    ['create-task', 'Create a task', 'Adds a real task record to local HouseOperations state.'],
    ['create-vendor', 'Create a vendor', 'Adds a real vendor request with value, contact, and status.'],
    ['advance-task', 'Advance work', 'Moves a task from open to queued/review/done.'],
    ['create-alert', 'Create owner alert', 'Creates a blocked owner item so the alert lane has something to resolve.'],
    ['resolve-alert', 'Resolve owner alert', 'Marks the highest-pressure owner alert done.'],
    ['save-proof', 'Save proof', 'Writes a proof snapshot into the local proof ledger.'],
    ['queue-gate', 'Queue Gate packet', 'Creates an exportable FS27 mirror packet from current state.'],
    ['create-billing', 'Create billing intent', 'Records the paid-plan intent and matching SkyePay offer URL.']
  ];
  const claimContract = [
    ['task_intake', 'Create and store house tasks', 'Task form/button writes records into local state and E2E verifies new task text.'],
    ['vendor_intake', 'Create and store vendor requests', 'Vendor form writes value/contact/status into local state.'],
    ['workboard', 'Move work through states', 'Advance buttons update task/vendor status through the app flow.'],
    ['owner_alerts', 'Show and resolve owner alerts', 'Blocked/review/high-priority tasks render in Alerts and can be resolved.'],
    ['proof_ledger', 'Save proof snapshots', 'Save Proof writes local proof ledger rows and browser E2E asserts the toast.'],
    ['backup_export', 'Export backup JSON', 'Export downloads houseoperations-standalone-backup.json.'],
    ['gate_packet_export', 'Queue/export FS27 mirror packets', 'Queue Gate Mirror creates packets; export downloads packet JSON.'],
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

  function dashboardView() {
    return `<section class="grid">
      <div class="span12 heroBand">
        <div class="heroCopy"><div class="crumb">HouseOperations app surface</div><h2>Operate the house desk from intake to owner proof.</h2><p>Tasks, vendors, schedule pressure, owner alerts, assignments, proof, exports, and gate mirror packets now live in one local app surface.</p><div class="actions" style="justify-content:flex-start;margin-top:18px"><button class="btn primary" data-action="new-task">New Task</button><button class="btn" data-action="new-vendor">New Vendor</button><button class="btn" data-action="save-proof">Save Proof</button></div></div>
        <div class="opsMap"><span class="routeLine" style="left:12%;top:30%;width:42%;transform:rotate(13deg)"></span><span class="routeLine" style="left:42%;top:58%;width:34%;transform:rotate(-18deg)"></span><span class="pin done" style="left:12%;top:27%"></span><span class="pin risk" style="left:53%;top:40%"></span><span class="pin" style="left:75%;top:47%"></span><span class="pin done" style="left:34%;top:68%"></span></div>
      </div>
      <div class="span12">${kpis()}</div>
      ${gatePanel()}
      <div class="panel span12"><div class="panelHead"><div><h2>Connected security surfaces</h2><p>HouseOperations carries the local 2FA vault and points users into the real FS27 PIN/recovery gate.</p></div></div><div class="panelBody laneGrid"><a class="lane" href="./skye-box-authenticator-vault/index.html"><h3>SkyeBox Authenticator</h3><p>Open the local encrypted TOTP vault nested under this app surface.</p></a><a class="lane" href="https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/pin-gate.html"><h3>FS27 PIN Gate</h3><p>Generated Gate ID, PIN login, and one-time recovery-code session flow.</p></a><a class="lane" href="../proof/houseoperations-skyebox-expansion-receipt.html"><h3>Expansion Receipt</h3><p>Review the proof boundary for local vault custody and gate recovery.</p></a></div></div>
      <div class="panel span12"><div class="panelHead"><div><h2>Operator intake</h2><p>Create real tasks and vendor records with owners, dates, lane, contact, and notes.</p></div></div><div class="panelBody">${intakeForms()}</div></div>
      <div class="panel span8"><div class="panelHead"><div><h2>Workboard</h2><p>State movement across open, queued, review, and done.</p></div><a class="btn" href="./tasks.html">Tasks</a></div><div class="panelBody">${workBoard()}</div></div>
      <div class="panel span4"><div class="panelHead"><div><h2>Owner Alerts</h2><p>High, blocked, and review items.</p></div></div><div class="panelBody alertList">${ownerAlertRows()}</div></div>
      <div class="panel span8"><div class="panelHead"><div><h2>Task Command</h2><p>Owner, due date, priority, and state.</p></div></div><div class="panelBody tableWrap"><table><thead><tr><th>Task</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>${taskRows()}</tbody></table></div></div>
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
    return `<section class="grid">${gatePanel()}<div class="panel span12"><div class="panelHead"><div><h2>Runtime Proof</h2><p>Local static endpoints and preserved legacy shell.</p></div></div><div class="panelBody runtimeList">
      ${['health','status','queue','handoff-packs','review-board','execution-board','dispatch-board','v1/runtime-summary','v1/sessions'].map((path) => `<div class="runtimeRow"><div><b>${path}</b><br><code>./${path}</code></div><a class="btn" href="./${path}">Open</a></div>`).join('')}
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
      <div class="span12 heroBand">
        <div class="heroCopy"><div class="crumb">Charge-ready app lane</div><h2>Bill HouseOperations without overstating what the app owns.</h2><p>HouseOperations records the plan intent, price, included scope, SkyePay offer URL, and activation boundary. Payment and entitlement enforcement belong to SkyePay/FS27.</p><div class="actions" style="justify-content:flex-start;margin-top:18px"><button class="btn primary" data-action="create-billing-intent">Create Billing Intent</button><button class="btn" data-action="export-billing-intent">Export Intent</button><a class="btn" href="${esc(skyePayUrl(active.offer))}">Open SkyePay</a></div></div>
        <div class="opsMap"><span class="routeLine" style="left:10%;top:36%;width:40%;transform:rotate(8deg)"></span><span class="routeLine" style="left:45%;top:54%;width:36%;transform:rotate(-16deg)"></span><span class="pin done" style="left:10%;top:33%"></span><span class="pin risk" style="left:50%;top:42%"></span><span class="pin done" style="left:80%;top:43%"></span></div>
      </div>
      <div class="panel span7"><div class="panelHead"><div><h2>Billing Intent</h2><p>Create the receipt that tells the client what they are paying for before checkout.</p></div></div><div class="panelBody">${billingForm(data)}</div></div>
      <div class="panel span5"><div class="panelHead"><div><h2>Latest Intents</h2><p>Stored locally for proof and handoff.</p></div><button class="btn" data-action="export-billing-intent">Export</button></div><div class="panelBody runtimeList">${billingIntentRows(data)}</div></div>
      <div class="panel span12"><div class="panelHead"><div><h2>Paid Scope</h2><p>These are the only HouseOperations plans this app is allowed to sell today.</p></div></div><div class="panelBody planGrid">${Object.values(PLAN_CATALOG).map((plan) => planCard(plan, active.id)).join('')}</div></div>
    </section>`;
  }

  function tutorialView() {
    const data = read();
    const completed = new Set(data.tutorialRuns.map((run) => run.step_id)).size;
    return `<section class="grid">
      <div class="span12 heroBand">
        <div class="heroCopy"><div class="crumb">Built-in operator training</div><h2>Run the app the way a paid operator will run it.</h2><p>This tutorial is not just documentation. Each step fires the same local app action used by the dashboard, billing lane, proof ledger, and Gate packet flow.</p><div class="actions" style="justify-content:flex-start;margin-top:18px"><button class="btn primary" data-action="run-full-tutorial">Run Full Tutorial</button><button class="btn" data-action="export-tutorial-receipt">Export Tutorial Receipt</button><a class="btn" href="./runtime.html">Runtime Proof</a></div></div>
        <div class="opsMap"><span class="routeLine" style="left:14%;top:30%;width:48%;transform:rotate(12deg)"></span><span class="routeLine" style="left:38%;top:62%;width:38%;transform:rotate(-18deg)"></span><span class="pin done" style="left:14%;top:27%"></span><span class="pin done" style="left:48%;top:41%"></span><span class="pin risk" style="left:77%;top:49%"></span></div>
      </div>
      <div class="span12">${kpis()}</div>
      <div class="panel span12"><div class="panelHead"><div><h2>Guided Run</h2><p>${completed}/${tutorialSteps.length} tutorial steps recorded in this browser.</p></div></div><div class="panelBody">${tutorialCards(data)}</div></div>
      <div class="panel span7"><div class="panelHead"><div><h2>Tutorial Receipt</h2><p>Every completed step writes a local run row.</p></div></div><div class="panelBody timeline">${tutorialRunRows(data)}</div></div>
      <div class="panel span5"><div class="panelHead"><div><h2>Operating Rule</h2><p>What paid users should understand before handoff.</p></div></div><div class="panelBody laneGrid"><div class="lane"><h3>Local state</h3><p>Tasks, vendors, proof, tutorial runs, and billing intents live in this browser until exported or mirrored.</p></div><div class="lane"><h3>SkyeBox custody</h3><p>TOTP secrets stay in the encrypted local vault; FS27 PIN recovery does not recover TOTP secrets.</p></div><div class="lane"><h3>Paid access</h3><p>SkyePay/FS27 own payment, approval, and entitlement enforcement.</p></div></div></div>
    </section>`;
  }

  function settingsView() {
    const cfg = gateConfig();
    return `<section class="grid"><div class="panel span6"><div class="panelHead"><div><h2>Settings</h2><p>Local 0s-owned controls.</p></div></div><div class="panelBody formGrid"><button class="btn primary" data-action="fullscreen">Enter Fullscreen</button><button class="btn" data-action="export">Export Backup</button><button class="btn" data-action="save-proof">Save Proof</button><button class="btn danger" data-action="reset">Reset Local State</button></div></div><div class="panel span6"><div class="panelHead"><div><h2>SkyeGate bridge settings</h2><p>Store only public origin/app metadata here. Event mirror secrets belong in Worker/env, not the browser.</p></div></div><div class="panelBody"><form class="intakeForm" data-form="gate"><label>Gate origin<input name="origin" value="${esc(cfg.origin || '')}" placeholder="https://skyegatefs27-citadeldb.graylondonskyes.workers.dev"></label><label>App id<input name="appId" value="${esc(cfg.appId || 'metraiyux-houseoperations')}"></label><button class="btn primary" type="submit">Save Gate Bridge</button></form></div></div><div class="panel span12"><div class="panelHead"><div><h2>Storage</h2><p>Standalone namespace.</p></div></div><div class="panelBody runtimeList"><div class="runtimeRow"><div><b>State key</b><br><code>${STORAGE_KEY}</code></div>${badge('owned')}</div><div class="runtimeRow"><div><b>Legacy closure</b><br><code>_legacy_shell/</code></div>${badge('pass')}</div><div class="runtimeRow"><div><b>Runtime endpoints</b><br><code>health / status / queue / handoff-packs</code></div>${badge('local')}</div></div></div></section>`;
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
      runtime: 'Local runtime endpoints, SkyeBox, SkyeGate, and legacy shell closure.',
      billing: 'Charge-ready plan intent, SkyePay offer, and activation boundary.',
      tutorial: 'Guided runbook that executes the real app workflow.',
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
    initMotionChrome();
    render();
  });
})();
