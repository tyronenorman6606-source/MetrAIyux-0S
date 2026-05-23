import express from 'express';

const app = express();
const port = Number(process.env.DASHBOARD_PORT || 7413);
const gatewayBase = process.env.GATEWAY_BASE_URL || 'http://127.0.0.1:7313';
const token = process.env.GATEWAY_ADMIN_TOKEN || '';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/assets', express.static('public/assets'));
app.use('/public-assets', express.static('public/assets'));

async function gateway(path, options = {}) {
  try {
    const res = await fetch(`${gatewayBase}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { ok: false, error: text || `HTTP ${res.status}`, status: res.status }; }
  } catch (error) {
    return { ok: false, error: `Gateway unavailable: ${error.message}`, gatewayBase };
  }
}

async function gatewayPost(path, body) {
  return gateway(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>${esc(title)} · CitadelDB Ultimate · Skyes Over London</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:dark;--bg:#07070b;--panel:#10111b;--muted:#a7adbd;--line:#2a2d3d;--gold:#d7aa43;--ok:#5cffb1;--bad:#ff5c7a;--blue:#90b4ff}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(circle at top left,#241a37,#07070b 38%,#030306);color:#f7f8ff}
body:before{content:"";position:fixed;inset:0;background:linear-gradient(120deg,rgba(215,170,67,.10),transparent 30%,rgba(144,180,255,.08));pointer-events:none}
header{padding:28px;border-bottom:1px solid var(--line);background:rgba(10,10,16,.72);position:sticky;top:0;backdrop-filter:blur(18px);z-index:2}
h1{margin:0;font-size:24px;letter-spacing:-.04em}.sub{color:var(--muted);margin-top:6px;line-height:1.55}main{padding:28px;display:grid;gap:22px;max-width:1350px;margin:auto;position:relative;z-index:1}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.panel{border:1px solid var(--line);border-radius:22px;padding:20px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.022));box-shadow:0 24px 70px rgba(0,0,0,.35)}
.metric{font-size:34px;font-weight:800;letter-spacing:-.06em}.label{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.12em}
table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:.12em}
.ok{color:var(--ok)}.bad{color:var(--bad)}.pill{border:1px solid var(--line);padding:6px 10px;border-radius:999px;color:var(--muted);display:inline-block}
nav{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap}a{color:#ffe29a;text-decoration:none}a:hover{text-decoration:underline}code{color:#ffe29a}pre{overflow:auto;white-space:pre-wrap}
input,select,textarea{width:100%;padding:12px 13px;border-radius:13px;border:1px solid var(--line);background:#080914;color:#fff;margin:7px 0 13px}
button{background:linear-gradient(135deg,#ffe29a,#d7aa43);border:0;color:#111;padding:12px 16px;border-radius:14px;font-weight:800;cursor:pointer}
button:hover{filter:brightness(1.08)}.cta{display:inline-flex;background:linear-gradient(135deg,#ffe29a,#d7aa43);color:#111!important;padding:11px 15px;border-radius:999px;font-weight:900;text-decoration:none!important}.notice{border:1px solid var(--line);border-radius:16px;padding:12px;background:rgba(255,255,255,.04)}
@media(max-width:900px){.grid,.two{grid-template-columns:1fr 1fr}}@media(max-width:620px){.grid,.two{grid-template-columns:1fr}header,main{padding:18px}}
</style></head><body><header><div style="display:flex;align-items:center;gap:14px"><img src="/assets/citadeldb-app-icon-192.png" alt="CitadelDB" style="width:54px;height:54px;border-radius:14px;object-fit:cover;box-shadow:0 0 30px rgba(215,170,67,.22)"><div><h1>CitadelDB Ultimate</h1><div class="sub">Sovereign Database Command Infrastructure by Skyes Over London · SoveReign13 Infrastructure Family</div></div>
<nav><a href="/">Overview</a><a href="/setup-wizard">Setup Wizard</a><a href="/onboarding">First Run</a><a href="/guided">Guided Ops</a><a href="/live-gates">Live Gates</a><a href="/commercial">Commercial</a><a href="/branches">Branches</a><a href="/platform">Platform</a><a href="/table-browser">Table Browser</a><a href="/self-service">Self-Service Console</a><a href="/app-lifecycle">App Lifecycle</a><a href="/app-onboarding">App Onboarding</a><a href="/launchpad">Database Launchpad</a><a href="/wizard">Connect App</a><a href="/ai-debug">AI Debug</a><a href="/actions">Actions</a><a href="/jobs">Jobs</a><a href="/apps">Apps</a><a href="/catalog">Catalog</a><a href="/tenants">Tenants</a><a href="/security">Security</a><a href="/architecture">Architecture</a><a href="/backups">Backups</a><a href="/restores">Restores</a><a href="/migrations">Migrations</a><a href="/audit">Audit</a><a href="/readiness">Readiness</a><a href="/proof">Proof</a></nav></header><main><section class="notice"><strong>Aegis boundary:</strong> dashboard is an operator surface. Keep it private or behind Omega Skygate / SoveReign13 upstream auth.</section>${body}</main><footer style="padding:24px 28px;border-top:1px solid var(--line);color:var(--muted);max-width:1350px;margin:auto;position:relative;z-index:1">CitadelDB Ultimate · Skyes Over London · SOLEnterprises · SoveReign13 Infrastructure Family</footer></body></html>`;
}

function table(headers, rows) {
  if (!rows?.length) return '<p class="sub">No records yet.</p>';
  return `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function renderAudit(rows) {
  return table(['Time','Actor','Action','Target'], (rows||[]).map(r=>`<tr><td>${esc(r.created_at)}</td><td>${esc(r.actor)}</td><td>${esc(r.action)}</td><td>${esc(r.target||'')}</td></tr>`));
}

app.get('/', async (_req, res) => {
  const [health, apps, backups, restores, audit, capacity, readiness] = await Promise.all([
    gateway('/health'), gateway('/admin/apps'), gateway('/admin/backups'), gateway('/admin/restores'), gateway('/admin/audit?limit=10'), gateway('/admin/capacity'), gateway('/admin/readiness')
  ]);
  res.send(page('Overview', `
<section class="grid">
<div class="panel"><div class="label">Gateway</div><div class="metric ${health.ok?'ok':'bad'}">${health.ok?'OK':'FAIL'}</div><div class="sub">${esc(health.mode||health.error||'')}</div></div>
<div class="panel"><div class="label">Readiness</div><div class="metric ${readiness.ok?'ok':'bad'}">${readiness.ok?'PASS':'OPEN'}</div><div class="sub">proof-gated status</div></div>
<div class="panel"><div class="label">Apps</div><div class="metric">${esc(apps.apps?.length||0)}</div><div class="sub">provisioned databases</div></div>
<div class="panel"><div class="label">DB Size</div><div class="metric">${capacity.databaseBytes ? Math.round(capacity.databaseBytes/1024/1024) : 0}</div><div class="sub">MB reported by Postgres</div></div>
</section>
<section class="panel"><h2>SkyLedger proof truth</h2><p>Skyes doctrine: if a proof is not listed here or in <code>proof/</code>, it should not be claimed as completed.</p><p><span class="pill">Database: ${esc(health.database||'unknown')}</span></p></section>
<section class="panel"><h2>Recent audit</h2>${renderAudit(audit.events||[])}</section>`));
});

app.get('/actions', (_req, res) => {
  res.send(page('Actions', `
<section class="two">
<div class="panel"><h2>Provision app database</h2><form method="post" action="/actions/provision"><label>App slug</label><input name="app" placeholder="skyeroutes" required><label>Engine</label><select name="engine"><option value="vps-postgres">vps-postgres</option><option value="cloudnativepg">cloudnativepg</option><option value="supabase-pack">supabase-pack</option><option value="neon-lab">neon-lab</option></select><button>Create app DB</button></form></div>
<div class="panel"><h2>Create backup receipt</h2><form method="post" action="/actions/backup-receipt"><label>Backup kind</label><input name="backupKind" value="manual"><label>Backup path</label><input name="backupPath" placeholder="backups/manual/citadel.dump" required><label>Database</label><input name="databaseName" value="citadel" required><label>Checksum</label><input name="checksum" placeholder="sha256 optional"><button>Record backup receipt</button></form></div>
</section>
<section class="panel"><h2>Enqueue safe operator job</h2><form method="post" action="/actions/enqueue-job"><label>Job type</label><select name="jobType"><option value="health">health</option><option value="validate-env">validate-env</option><option value="backup-now">backup-now</option><option value="backup-encrypted">backup-encrypted</option><option value="restore-test">restore-test</option><option value="smoke-all">smoke-all</option><option value="object-backup-sync">object-backup-sync</option></select><button>Enqueue job</button></form></section><section class="panel"><h2>Important</h2><p>Jobs are allowlisted and executed only by the worker. The dashboard does not execute arbitrary shell commands.</p></section>`));
});

app.post('/actions/provision', async (req, res) => {
  const result = await gatewayPost('/admin/apps', { app: req.body.app, engine: req.body.engine });
  res.send(page('Provision result', `<section class="panel"><h2>Provision result</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/apps">View apps</a></p></section>`));
});

app.post('/actions/backup-receipt', async (req, res) => {
  const result = await gatewayPost('/admin/backups/receipt', {
    backupKind: req.body.backupKind,
    backupPath: req.body.backupPath,
    databaseName: req.body.databaseName,
    checksum: req.body.checksum || undefined
  });
  res.send(page('Backup receipt result', `<section class="panel"><h2>Backup receipt result</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/backups">View backups</a></p></section>`));
});

app.get('/apps', async (_req,res)=>{const d=await gateway('/admin/apps');res.send(page('Apps',`<section class="panel"><h2>Provisioned apps</h2>${table(['App','Database','Role','Engine','Status','Owner dashboard','Created'],(d.apps||[]).map(r=>`<tr><td>${esc(r.app_slug)}</td><td>${esc(r.database_name)}</td><td>${esc(r.role_name)}</td><td>${esc(r.engine)}</td><td>${esc(r.status)}</td><td><a href="/apps/${encodeURIComponent(r.app_slug)}/owner-dashboard">Open</a></td><td>${esc(r.created_at)}</td></tr>`))}</section>`));});

app.get('/apps/:appSlug/owner-dashboard', async (req,res)=>{
  const appSlug = req.params.appSlug;
  const d = await gateway(`/admin/apps/${encodeURIComponent(appSlug)}/owner-dashboard`);
  if (!d.ok) {
    return res.send(page('Owner Dashboard', `<section class="panel"><h2>Owner dashboard unavailable</h2><pre><code>${esc(JSON.stringify(d,null,2))}</code></pre></section>`));
  }
  const checks = Object.entries(d.acceptance || {}).map(([key, value]) => `<tr><td>${esc(key)}</td><td class="${value?'ok':'bad'}">${value?'PASS':'OPEN'}</td></tr>`);
  res.send(page(`${d.app.app_slug} Owner Dashboard`, `
    <section class="grid">
      <div class="panel"><div class="label">App</div><div class="metric">${esc(d.app.app_slug)}</div><div class="sub">${esc(d.app.status)}</div></div>
      <div class="panel"><div class="label">Database</div><div class="metric" style="font-size:22px">${esc(d.app.database_name)}</div><div class="sub">${esc(d.connection.host)}:${esc(d.connection.port)}</div></div>
      <div class="panel"><div class="label">Backups</div><div class="metric">${esc(d.backups?.length || 0)}</div><div class="sub">matching receipts</div></div>
      <div class="panel"><div class="label">Owner handoff</div><div class="metric ${d.acceptedForOwnerHandoff?'ok':'bad'}">${d.acceptedForOwnerHandoff?'READY':'OPEN'}</div><div class="sub">proof-gated</div></div>
    </section>
    <section class="two">
      <div class="panel"><h2>Connection template</h2><pre><code>${esc(d.connection.envTemplate)}</code></pre><p class="sub">Password is shown only during initial provisioning or credential rotation.</p></div>
      <div class="panel"><h2>Acceptance</h2>${table(['Check','Status'], checks)}</div>
    </section>
    <section class="panel"><h2>Owner handoff packet</h2><pre><code>${esc(d.handoff)}</code></pre></section>
    <section class="two">
      <div class="panel"><h2>Recent backups</h2>${table(['Kind','Path','Restore','Created'],(d.backups||[]).map(r=>`<tr><td>${esc(r.backup_kind)}</td><td>${esc(r.backup_path)}</td><td>${esc(r.restore_test_status||'')}</td><td>${esc(r.created_at)}</td></tr>`))}</div>
      <div class="panel"><h2>Recent jobs</h2>${table(['Job','Status','Receipt','Error'],(d.jobs||[]).map(r=>`<tr><td>${esc(r.job_type)}</td><td>${esc(r.status)}</td><td>${esc(r.receipt_path||'')}</td><td>${esc(r.error||'')}</td></tr>`))}</div>
    </section>
  `));
});
app.get('/catalog', async (_req,res)=>{const d=await gateway('/admin/service-catalog');res.send(page('Service catalog',`<section class="panel"><h2>Service catalog</h2>${table(['App','Database','Engine','Status','Last backup','Last restore test'],(d.services||[]).map(r=>`<tr><td>${esc(r.app_slug)}</td><td>${esc(r.database_name)}</td><td>${esc(r.engine)}</td><td>${esc(r.status)}</td><td>${esc(r.backup?.last_backup_at||'')}</td><td>${esc(r.backup?.last_restore_test_at||'')}</td></tr>`))}</section>`));});
app.get('/backups', async (_req,res)=>{const d=await gateway('/admin/backups');res.send(page('Backups',`<section class="panel"><h2>Backup receipts</h2>${table(['Kind','Database','Path','SHA256','Restore','Created'],(d.backups||[]).map(r=>`<tr><td>${esc(r.backup_kind)}</td><td>${esc(r.database_name)}</td><td>${esc(r.backup_path)}</td><td><code>${esc(r.checksum||'')}</code></td><td>${esc(r.restore_test_status||'not tested')}</td><td>${esc(r.created_at)}</td></tr>`))}</section>`));});
app.get('/restores', async (_req,res)=>{const d=await gateway('/admin/restores');res.send(page('Restores',`<section class="panel"><h2>Restore receipts</h2>${table(['Target','Source','Success','Started','Finished','Error'],(d.restores||[]).map(r=>`<tr><td>${esc(r.target_database)}</td><td>${esc(r.source_backup_path)}</td><td class="${r.success?'ok':'bad'}">${esc(r.success)}</td><td>${esc(r.started_at)}</td><td>${esc(r.finished_at||'')}</td><td>${esc(r.error||'')}</td></tr>`))}</section>`));});
app.get('/migrations', async (_req,res)=>{const d=await gateway('/admin/migrations');res.send(page('Migrations',`<section class="panel"><h2>Migration receipts</h2>${table(['App','Database','File','Checksum','Success','Applied'],(d.migrations||[]).map(r=>`<tr><td>${esc(r.app_slug)}</td><td>${esc(r.database_name)}</td><td>${esc(r.migration_file)}</td><td><code>${esc(r.checksum)}</code></td><td class="${r.success?'ok':'bad'}">${esc(r.success)}</td><td>${esc(r.applied_at)}</td></tr>`))}</section>`));});
app.get('/audit', async (_req,res)=>{const d=await gateway('/admin/audit?limit=100');res.send(page('Audit',`<section class="panel"><h2>Audit events</h2>${renderAudit(d.events||[])}</section>`));});
app.get('/readiness', async (_req,res)=>{const d=await gateway('/admin/readiness');res.send(page('Readiness',`<section class="panel"><h2>Readiness checks</h2>${table(['Check','Status','Detail'],(d.checks||[]).map(c=>`<tr><td>${esc(c.name)}</td><td class="${c.ok?'ok':'bad'}">${c.ok?'PASS':'OPEN'}</td><td><code>${esc(JSON.stringify(c.detail))}</code></td></tr>`))}</section>`));});
app.get('/proof', (_req,res)=>res.send(page('Proof',`<section class="panel"><h2>Proof commands</h2><pre><code>./cli/citadel health
./cli/citadel provision proofapp
./cli/citadel migrate proofapp migrations/smoke-app
./cli/citadel backup-now
./cli/citadel restore-test
./cli/citadel smoke-all</code></pre><p>Generated receipts land in <code>proof/*.txt</code>.</p></section>`)));


app.post('/actions/enqueue-job', async (req, res) => {
  const result = await gatewayPost('/admin/jobs', { jobType: req.body.jobType, requestedBy: 'operator-dashboard' });
  res.send(page('Job queued', `<section class="panel"><h2>Job queued</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/jobs">View jobs</a></p></section>`));
});

app.get('/jobs', async (_req,res)=>{
  const d=await gateway('/admin/jobs?limit=100');
  res.send(page('Jobs',`<section class="panel"><h2>Operator jobs</h2>${table(['ID','Type','Status','Attempts','Requested','Finished','Receipt','Error'],(d.jobs||[]).map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.job_type)}</td><td class="${r.status==='succeeded'?'ok':(r.status==='failed'?'bad':'')}">${esc(r.status)}</td><td>${esc(r.attempts)}/${esc(r.max_attempts)}</td><td>${esc(r.requested_at)}</td><td>${esc(r.finished_at||'')}</td><td>${esc(r.receipt_path||'')}</td><td>${esc(r.error||'')}</td></tr>`))}</section>`));
});

app.get('/command-receipts', async (_req,res)=>{
  const d=await gateway('/admin/command-receipts');
  res.send(page('Command receipts',`<section class="panel"><h2>Command receipts</h2>${table(['Job','Command','Success','Receipt','SHA256','Created'],(d.receipts||[]).map(r=>`<tr><td>${esc(r.job_id||'')}</td><td>${esc(r.command_name)}</td><td class="${r.success?'ok':'bad'}">${esc(r.success)}</td><td>${esc(r.receipt_path)}</td><td><code>${esc(r.checksum||'')}</code></td><td>${esc(r.created_at)}</td></tr>`))}</section>`));
});



app.get('/security', async (_req,res)=>{
  const [readiness, capacity, findings] = await Promise.all([
    gateway('/admin/readiness'),
    gateway('/admin/capacity'),
    gateway('/admin/policy-findings')
  ]);
  res.send(page('Security posture', `<section class="panel"><h2>Security posture</h2><p class="sub">This is a posture view, not a security guarantee. The live host must still be hardened.</p>${table(['Check','Status','Detail'],(readiness.checks||[]).map(c=>`<tr><td>${esc(c.name)}</td><td class="${c.ok?'ok':'bad'}">${c.ok?'PASS':'OPEN'}</td><td><code>${esc(JSON.stringify(c.detail))}</code></td></tr>`))}</section><section class="panel"><h2>Capacity snapshot</h2><pre><code>${esc(JSON.stringify(capacity,null,2))}</code></pre></section><section class="panel"><h2>Policy findings</h2>${table(['Policy','Severity','Status','Target','Detail'],(findings.findings||[]).map(f=>`<tr><td>${esc(f.policy_name)}</td><td>${esc(f.severity)}</td><td>${esc(f.status)}</td><td>${esc(f.target||'')}</td><td>${esc(f.detail)}</td></tr>`))}</section>`));
});

app.get('/tenants', async (_req,res)=>{
  const d = await gateway('/admin/tenants');
  res.send(page('Tenants', `<section class="panel"><h2>Create tenant</h2><form method="post" action="/tenants"><label>Tenant slug</label><input name="tenantSlug" required placeholder="northstar"><label>Display name</label><input name="displayName" required placeholder="NorthStar Office & Accounting"><label>Owner/contact</label><input name="ownerContact" placeholder="ops@example.com"><button>Save tenant</button></form></section><section class="panel"><h2>Tenant registry</h2>${table(['Tenant','Name','Contact','Status','Created'],(d.tenants||[]).map(t=>`<tr><td>${esc(t.tenant_slug)}</td><td>${esc(t.display_name)}</td><td>${esc(t.owner_contact||'')}</td><td>${esc(t.status)}</td><td>${esc(t.created_at)}</td></tr>`))}</section>`));
});

app.post('/tenants', async (req,res)=>{
  const result = await gatewayPost('/admin/tenants', {
    tenantSlug: req.body.tenantSlug,
    displayName: req.body.displayName,
    ownerContact: req.body.ownerContact || undefined
  });
  res.send(page('Tenant saved', `<section class="panel"><h2>Tenant saved</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/tenants">Back to tenants</a></p></section>`));
});



app.get('/architecture', (_req,res)=>{
  res.send(page('Architecture', `<section class="panel"><h2>CitadelDB Sovereign Architecture</h2><p>CitadelDB is Skyes Over London database command infrastructure. The product architecture is company-owned and built around Citadel Core, Reliquary, SceptR, Veyra3.1, Aegis, and SkyLedger.</p></section><section class="grid"><div class="panel"><div class="label">Citadel Core</div><p class="sub">Tenant, app, environment, database, role, and service catalog control.</p></div><div class="panel"><div class="label">Reliquary</div><p class="sub">Backups, restores, exports, rollbacks, manifests, and recovery receipts.</p></div><div class="panel"><div class="label">SceptR</div><p class="sub">Provisioning, migrations, safe jobs, smoke tests, and proof runners.</p></div><div class="panel"><div class="label">Veyra3.1</div><p class="sub">Private routing, pooler endpoints, service discovery, and failover route promotion.</p></div><div class="panel"><div class="label">Aegis</div><p class="sub">Policy checks, credential rotation, exposure guards, and incident discipline.</p></div><div class="panel"><div class="label">SkyLedger</div><p class="sub">Audit events, command receipts, claims ledger, and proof history.</p></div></section>`));
});



app.get('/public', (_req, res) => {
  res.send(page('CitadelDB Public Surface', `<section class="panel"><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center"><div><div class="label">Skyes Over London · SoveReign13</div><h2>CitadelDB Ultimate</h2><p>Sovereign Database Command Infrastructure for owned platforms: provisioning, migrations, backups, restore tests, rollback receipts, private routing, safe jobs, and proof-led readiness.</p><p><a class="cta" href="/">Open Operator Dashboard</a></p></div><img src="/assets/citadeldb-ultimate-logo.png" alt="CitadelDB Ultimate logo" style="width:100%;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.45)"></div></section>`));
});



app.get('/wizard', async (_req, res) => {
  const apps = await gateway('/admin/apps');
  const options = (apps.apps || []).map(a => `<option value="${esc(a.app_slug)}">${esc(a.app_slug)} · ${esc(a.database_name)}</option>`).join('');
  res.send(page('Connect App Wizard', `
    <section class="panel">
      <h2>Connect an app without command-line confusion</h2>
      <p class="sub">Step 1 creates the database. Step 2 shows the connection settings. Step 3 tells you exactly what to paste into the app.</p>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Step 1 · Create app database</h2>
        <form method="post" action="/wizard/provision">
          <label>What app needs a database?</label>
          <input name="app" placeholder="skyeroutes, sovereigndocs, leadflow" required>
          <label>Runtime</label>
          <select name="engine"><option value="vps-postgres">Citadel Postgres Runtime</option><option value="cloudnativepg">Citadel HA Runtime</option></select>
          <button>Create database</button>
        </form>
      </div>
      <div class="panel">
        <h2>Step 2 · View connection</h2>
        <form method="get" action="/wizard/connection">
          <label>Select existing app</label>
          <select name="appSlug">${options || '<option value="">No apps yet</option>'}</select>
          <button>Show me what to paste</button>
        </form>
      </div>
    </section>
    <section class="panel">
      <h2>Plain English</h2>
      <p>Creating an app database means CitadelDB makes a private Postgres database and username for that one app. You paste the generated DATABASE_URL into that app. That is it.</p>
    </section>
  `));
});

app.post('/wizard/provision', async (req, res) => {
  const result = await gatewayPost('/admin/apps', { app: req.body.app, engine: req.body.engine || 'vps-postgres' });
  const app = result.app || req.body.app;
  res.send(page('Database Created', `
    <section class="panel">
      <h2>Database created</h2>
      <p class="sub">Copy the DATABASE_URL below into the app you are connecting. This is the only time the generated password is shown unless you rotate the credential.</p>
      <pre><code>${esc(result.databaseUrlTemplate || JSON.stringify(result, null, 2))}</code></pre>
      <p><a class="cta" href="/wizard/connection?appSlug=${encodeURIComponent(app)}">Show connection guide</a></p>
    </section>
  `));
});

app.get('/wizard/connection', async (req, res) => {
  const appSlug = req.query.appSlug || '';
  if (!appSlug) return res.redirect('/wizard');
  const result = await gateway(`/admin/apps/${encodeURIComponent(appSlug)}/connection`);
  if (!result.ok) {
    return res.send(page('Connection', `<section class="panel"><h2>Could not find app</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre></section>`));
  }

  const env = result.connection.envTemplate;
  res.send(page('Connection Guide', `
    <section class="panel">
      <h2>Connect ${esc(result.app.app_slug)}</h2>
      <p class="sub">Paste this into the app's environment variables. Replace <code>APP_PASSWORD</code> with the password shown when the app database was created, or rotate the credential to create a new password.</p>
      <pre><code>${esc(env)}</code></pre>
    </section>
    <section class="two">
      <div class="panel">
        <h2>What this means</h2>
        <p>Database: <code>${esc(result.connection.database)}</code></p>
        <p>Username: <code>${esc(result.connection.username)}</code></p>
        <p>Host: <code>${esc(result.connection.host)}</code></p>
        <p>Port: <code>${esc(result.connection.port)}</code></p>
      </div>
      <div class="panel">
        <h2>After you paste it</h2>
        <p>Restart the app, then run a write smoke from the app environment. The dashboard can record a request, but it will not fake a write without the real app DATABASE_URL/password.</p>
        <form method="post" action="/wizard/write-smoke-job">
          <input type="hidden" name="appSlug" value="${esc(result.app.app_slug)}">
          <button>Queue write-smoke reminder job</button>
        </form>
      </div>
    </section>
  `));
});

app.post('/wizard/write-smoke-job', async (req, res) => {
  const result = await gatewayPost(`/admin/apps/${encodeURIComponent(req.body.appSlug)}/write-smoke-job`, {});
  res.send(page('Write Smoke Job', `<section class="panel"><h2>Write-smoke request recorded</h2><p class="sub">No unproven success. This job reminds the operator that app write smoke needs the actual app DATABASE_URL/password.</p><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/jobs">View jobs</a></p></section>`));
});

app.get('/ai-debug', async (_req, res) => {
  const status = await gateway('/admin/ai/status');
  const apps = await gateway('/admin/apps');
  const appOptions = ['<option value="">General CitadelDB issue</option>'].concat((apps.apps || []).map(a => `<option value="${esc(a.app_slug)}">${esc(a.app_slug)}</option>`)).join('');
  res.send(page('AI Debug Assistant', `
    <section class="panel">
      <h2>AI Debug Assistant</h2>
      <p class="sub">Ask OpenAI or Gemini to help debug CitadelDB issues. API keys stay server-side in .env and are never shown in the browser.</p>
      <div class="notice">Status: AI enabled = <strong>${esc(status.providers?.enabled || false)}</strong> · OpenAI key = <strong>${esc(status.providers?.openai || false)}</strong> · Gemini key = <strong>${esc(status.providers?.gemini || false)}</strong></div>
    </section>
    <section class="panel">
      <form method="post" action="/ai-debug">
        <label>Provider</label>
        <select name="provider"><option value="openai">OpenAI</option><option value="gemini">Gemini</option></select>
        <label>App context</label>
        <select name="appSlug">${appOptions}</select>
        <label>What is broken or confusing?</label>
        <textarea name="question" rows="8" placeholder="Example: My app will not connect after I pasted DATABASE_URL. What should I check?" required></textarea>
        <button>Ask AI Debug Assistant</button>
      </form>
    </section>
  `));
});

app.post('/ai-debug', async (req, res) => {
  const result = await gatewayPost('/admin/ai/debug', {
    provider: req.body.provider,
    question: req.body.question,
    appSlug: req.body.appSlug || undefined
  });
  res.send(page('AI Debug Answer', `
    <section class="panel">
      <h2>AI Debug Answer</h2>
      ${result.ok ? `<pre><code>${esc(result.answer)}</code></pre>` : `<pre><code>${esc(JSON.stringify(result,null,2))}</code></pre>`}
      <p><a class="cta" href="/ai-debug">Ask another question</a></p>
    </section>
  `));
});


app.get('/launchpad', async (_req, res) => {
  const apps = await gateway('/admin/apps');
  const rows = (apps.apps || []).map(a => `<tr><td>${esc(a.app_slug)}</td><td>${esc(a.database_name)}</td><td>${esc(a.role_name)}</td><td>${esc(a.status)}</td><td><a href="/launchpad/app/${encodeURIComponent(a.app_slug)}">Open</a></td></tr>`).join('');
  res.send(page('Database Launchpad', `
    <section class="panel">
      <h2>Database Launchpad</h2>
      <p class="sub">Create app databases, rotate app credentials, test connection strings, run real write-smoke checks, and generate setup packets without knowing database commands.</p>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Create a database for an app</h2>
        <form method="post" action="/wizard/provision">
          <label>App name</label>
          <input name="app" placeholder="skyeroutes, leadflow, sovereigndocs" required>
          <label>Runtime</label>
          <select name="engine"><option value="vps-postgres">Citadel Postgres Runtime</option><option value="cloudnativepg">Citadel HA Runtime</option></select>
          <button>Create database</button>
        </form>
      </div>
      <div class="panel">
        <h2>Test a DATABASE_URL</h2>
        <form method="post" action="/launchpad/test-url">
          <label>Paste DATABASE_URL</label>
          <textarea name="databaseUrl" rows="4" placeholder="postgres://user:password@host:6432/database" required></textarea>
          <label><input type="checkbox" name="write" value="true"> Also run real write-smoke</label>
          <button>Test connection</button>
        </form>
      </div>
    </section>
    <section class="panel">
      <h2>Existing app databases</h2>
      <table><thead><tr><th>App</th><th>Database</th><th>User</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5">No apps yet.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.get('/launchpad/app/:appSlug', async (req, res) => {
  const appSlug = req.params.appSlug;
  const [connection, packet] = await Promise.all([
    gateway(`/admin/apps/${encodeURIComponent(appSlug)}/connection`),
    gateway(`/admin/apps/${encodeURIComponent(appSlug)}/setup-packet`)
  ]);

  if (!connection.ok) return res.send(page('App Database', `<section class="panel"><h2>App not found</h2><pre><code>${esc(JSON.stringify(connection,null,2))}</code></pre></section>`));

  res.send(page(`Launchpad · ${esc(appSlug)}`, `
    <section class="panel">
      <h2>${esc(appSlug)} database</h2>
      <p class="sub">This is the plain-English setup page for this app database.</p>
      <div class="notice">Database: <strong>${esc(connection.connection.database)}</strong> · User: <strong>${esc(connection.connection.username)}</strong> · Host: <strong>${esc(connection.connection.host)}</strong> · Port: <strong>${esc(connection.connection.port)}</strong></div>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Connection template</h2>
        <p>Use this if you already have the app password.</p>
        <pre><code>${esc(connection.connection.envTemplate)}</code></pre>
      </div>
      <div class="panel">
        <h2>Need a fresh password?</h2>
        <p>Rotate the app credential. This gives you a new DATABASE_URL to paste into the app.</p>
        <form method="post" action="/launchpad/app/${encodeURIComponent(appSlug)}/rotate">
          <button>Rotate credential and show new DATABASE_URL</button>
        </form>
      </div>
    </section>
    <section class="panel">
      <h2>Setup packet</h2>
      <pre><code>${esc(packet.packet || 'No packet available')}</code></pre>
    </section>
  `));
});

app.post('/launchpad/app/:appSlug/rotate', async (req, res) => {
  const result = await gatewayPost(`/admin/apps/${encodeURIComponent(req.params.appSlug)}/rotate-credential`, {});
  res.send(page('Credential Rotated', `
    <section class="panel">
      <h2>New app DATABASE_URL</h2>
      <p class="sub">Paste this into the app environment and restart the app. This screen is the only time the new password is shown.</p>
      <pre><code>${esc(result.connection?.env || JSON.stringify(result,null,2))}</code></pre>
      <div class="notice">Do not paste this into public code. Put it into the app's environment variables.</div>
    </section>
    <section class="panel">
      <h2>Next step</h2>
      <p>After the app restarts, paste the same DATABASE_URL below to test it from the dashboard.</p>
      <form method="post" action="/launchpad/test-url">
        <textarea name="databaseUrl" rows="4" required>${esc(result.connection?.databaseUrl || '')}</textarea>
        <label><input type="checkbox" name="write" value="true" checked> Also run real write-smoke</label>
        <button>Test this DATABASE_URL</button>
      </form>
    </section>
  `));
});

app.post('/launchpad/test-url', async (req, res) => {
  const result = await gatewayPost('/admin/database/test-url', { databaseUrl: req.body.databaseUrl, write: req.body.write === 'true' });
  const ok = result.ok ? 'PASS' : 'OPEN';
  const payload = JSON.stringify(result,null,2);
  res.send(page('Database URL Test', `
    <section class="panel">
      <h2>${ok}: Database test</h2>
      <p class="sub">The URL below is redacted. Secrets are not printed back into the result.</p>
      <pre><code>${esc(payload)}</code></pre>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Ask OpenAI with this result</h2>
        <form method="post" action="/ai-debug">
          <input type="hidden" name="provider" value="openai">
          <textarea name="question" rows="8">I tested a CitadelDB DATABASE_URL and got this result. Explain what it means and what I should do next in plain English:

${esc(payload)}</textarea>
          <button>Ask OpenAI</button>
        </form>
      </div>
      <div class="panel">
        <h2>Ask Gemini with this result</h2>
        <form method="post" action="/ai-debug">
          <input type="hidden" name="provider" value="gemini">
          <textarea name="question" rows="8">I tested a CitadelDB DATABASE_URL and got this result. Explain what it means and what I should do next in plain English:

${esc(payload)}</textarea>
          <button>Ask Gemini</button>
        </form>
      </div>
    </section>
  `));
});


app.get('/onboarding', async (_req, res) => {
  const checklist = await gateway('/admin/guided/setup-checklist');
  const rows = (checklist.checks || []).map(c => `<tr><td>${c.ok ? '✅' : '☐'}</td><td>${esc(c.label)}</td><td>${esc(c.why)}</td></tr>`).join('');
  res.send(page('First Run', `
    <section class="panel">
      <h2>First Run Setup</h2>
      <p class="sub">This page tells you what is ready, what is missing, and what button to press next.</p>
      <div class="notice">Setup score: <strong>${esc(checklist.percent || 0)}%</strong> · Apps: <strong>${esc(checklist.counts?.apps || 0)}</strong> · Backups: <strong>${esc(checklist.counts?.backups || 0)}</strong> · Restore tests: <strong>${esc(checklist.counts?.restores || 0)}</strong></div>
    </section>
    <section class="panel">
      <h2>Checklist</h2>
      <table><thead><tr><th></th><th>Item</th><th>Why it matters</th></tr></thead><tbody>${rows}</tbody></table>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Next best action</h2>
        <p>If no app exists yet, go to Database Launchpad and create one. If an app exists, run backup and restore-test proof.</p>
        <p><a class="cta" href="/launchpad">Open Database Launchpad</a></p>
      </div>
      <div class="panel">
        <h2>Need help?</h2>
        <p>Use the AI Debug Assistant with a diagnostic bundle instead of guessing.</p>
        <p><a class="cta" href="/guided/diagnostics">Create Diagnostic Bundle</a></p>
      </div>
    </section>
  `));
});

app.get('/guided', async (_req, res) => {
  const checklist = await gateway('/admin/guided/setup-checklist');
  res.send(page('Guided Ops', `
    <section class="panel">
      <h2>Guided Ops</h2>
      <p class="sub">Run safe proof actions from buttons. These enqueue allowlisted jobs and create receipts when the backend proves the operation.</p>
      <div class="notice">Current setup score: <strong>${esc(checklist.percent || 0)}%</strong></div>
    </section>
    <section class="grid">
      ${['validate-env','backup-now','restore-test','policy-check','backup-manifest','object-backup-sync'].map(action => `
        <div class="panel">
          <h2>${action}</h2>
          <p class="sub">${action === 'restore-test' ? 'Proves backups can be restored.' : action === 'backup-now' ? 'Creates a backup receipt.' : action === 'object-backup-sync' ? 'Syncs backups off-server if object storage is configured.' : 'Runs a safe proof action.'}</p>
          <form method="post" action="/guided/proof-action">
            <input type="hidden" name="action" value="${action}">
            <button>Run ${action}</button>
          </form>
        </div>`).join('')}
    </section>
    <section class="panel">
      <h2>After running actions</h2>
      <p><a href="/jobs">Check jobs</a> · <a href="/backups">Check backups</a> · <a href="/restores">Check restores</a> · <a href="/guided/diagnostics">Create diagnostic bundle</a></p>
    </section>
  `));
});

app.post('/guided/proof-action', async (req, res) => {
  const result = await gatewayPost('/admin/guided/proof-action', { action: req.body.action });
  res.send(page('Proof Action Queued', `
    <section class="panel">
      <h2>Proof action queued</h2>
      <p class="sub">This does not unproven success. Check the Jobs and receipt pages for actual proof.</p>
      <pre><code>${esc(JSON.stringify(result,null,2))}</code></pre>
      <p><a class="cta" href="/jobs">View Jobs</a></p>
    </section>
  `));
});

app.get('/guided/diagnostics', async (_req, res) => {
  const result = await gateway('/admin/guided/diagnostic-bundle');
  const payload = JSON.stringify(result.bundle || result, null, 2);
  res.send(page('Diagnostic Bundle', `
    <section class="panel">
      <h2>Diagnostic Bundle</h2>
      <p class="sub">This redacted bundle can be sent into OpenAI or Gemini debug. It includes apps, jobs, backups, restores, audits, and policy findings.</p>
      <pre><code>${esc(payload)}</code></pre>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Ask OpenAI</h2>
        <form method="post" action="/ai-debug">
          <input type="hidden" name="provider" value="openai">
          <textarea name="question" rows="8">Review this CitadelDB diagnostic bundle. Explain what is healthy, what is broken, and what I should do next in plain English:

${esc(payload)}</textarea>
          <button>Ask OpenAI</button>
        </form>
      </div>
      <div class="panel">
        <h2>Ask Gemini</h2>
        <form method="post" action="/ai-debug">
          <input type="hidden" name="provider" value="gemini">
          <textarea name="question" rows="8">Review this CitadelDB diagnostic bundle. Explain what is healthy, what is broken, and what I should do next in plain English:

${esc(payload)}</textarea>
          <button>Ask Gemini</button>
        </form>
      </div>
    </section>
  `));
});


app.get('/setup-wizard', async (_req, res) => {
  const readiness = await gateway('/admin/setup/env-readiness');
  const plan = await gateway('/admin/setup/plan');
  const requiredRows = (readiness.required || []).map(i => `<tr><td>${i.present ? '✅' : '☐'}</td><td>${esc(i.key)}</td><td>${esc(i.label)}</td><td>${esc(i.why)}</td></tr>`).join('');
  const optionalRows = (readiness.optional || []).map(i => `<tr><td>${i.present ? '✅' : '☐'}</td><td>${esc(i.key)}</td><td>${esc(i.label)}</td><td>${esc(i.why)}</td></tr>`).join('');

  res.send(page('Setup Wizard', `
    <section class="panel">
      <h2>Setup Wizard</h2>
      <p class="sub">This is the plain-English setup screen. It tells you which secrets exist, what they do, and what to do next.</p>
      <div class="notice">Required setup ready: <strong>${readiness.ready ? 'yes' : 'no'}</strong>${readiness.missingRequired?.length ? ` · Missing: <strong>${esc(readiness.missingRequired.join(', '))}</strong>` : ''}</div>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Generate required secrets</h2>
        <p>Use this if you need new values for your .env. Store them safely. The dashboard does not write your .env file for you.</p>
        <form method="post" action="/setup-wizard/generate-secrets">
          <button>Generate secrets to paste into .env</button>
        </form>
      </div>
      <div class="panel">
        <h2>Next setup plan</h2>
        <pre><code>${esc(plan.plan || '')}</code></pre>
      </div>
    </section>
    <section class="panel">
      <h2>Required secrets</h2>
      <table><thead><tr><th></th><th>Key</th><th>Name</th><th>Why</th></tr></thead><tbody>${requiredRows}</tbody></table>
    </section>
    <section class="panel">
      <h2>Optional integrations</h2>
      <table><thead><tr><th></th><th>Key</th><th>Name</th><th>Why</th></tr></thead><tbody>${optionalRows}</tbody></table>
    </section>
  `));
});

app.post('/setup-wizard/generate-secrets', async (_req, res) => {
  const result = await gatewayPost('/admin/setup/generate-secrets', {});
  res.send(page('Generated Secrets', `
    <section class="panel">
      <h2>Generated secrets</h2>
      <p class="sub">Paste this into your server .env. Store a copy somewhere secure. This page is for setup only.</p>
      <pre><code>${esc(result.envBlock || JSON.stringify(result,null,2))}</code></pre>
      <div class="notice">${esc(result.warning || '')}</div>
    </section>
    <section class="panel">
      <h2>After pasting into .env</h2>
      <p>Restart the stack, then return to Setup Wizard.</p>
      <pre><code>make prod-down
make prod-up</code></pre>
      <p><a class="cta" href="/setup-wizard">Return to Setup Wizard</a></p>
    </section>
  `));
});


app.get('/app-onboarding', async (_req, res) => {
  const apps = await gateway('/admin/apps');
  const rows = (apps.apps || []).map(a => `<tr><td>${esc(a.app_slug)}</td><td>${esc(a.database_name)}</td><td>${esc(a.role_name)}</td><td><a href="/app-onboarding/${encodeURIComponent(a.app_slug)}">Onboard</a></td></tr>`).join('');
  res.send(page('App Onboarding', `
    <section class="panel">
      <h2>App Onboarding</h2>
      <p class="sub">Generate framework-specific setup instructions, migration checklists, and app proof packets.</p>
      <p><a class="cta" href="/launchpad">Create a new app database</a></p>
    </section>
    <section class="panel">
      <h2>Existing apps</h2>
      <table><thead><tr><th>App</th><th>Database</th><th>User</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4">No apps yet. Create one in Database Launchpad.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.get('/app-onboarding/:appSlug', async (req, res) => {
  const appSlug = req.params.appSlug;
  const framework = req.query.framework || 'node-express';
  const packet = await gateway(`/admin/apps/${encodeURIComponent(appSlug)}/onboarding-packet?framework=${encodeURIComponent(framework)}`);
  const proof = await gateway(`/admin/apps/${encodeURIComponent(appSlug)}/proof-packet`);
  const frameworks = [
    ['node-express','Node / Express'],
    ['nextjs-prisma','Next.js / Prisma'],
    ['python-sqlalchemy','Python / SQLAlchemy'],
    ['django','Django'],
    ['rails','Ruby on Rails'],
    ['laravel','Laravel']
  ];
  const opts = frameworks.map(([k,v]) => `<option value="${k}" ${k===framework?'selected':''}>${v}</option>`).join('');
  res.send(page(`Onboarding · ${esc(appSlug)}`, `
    <section class="panel">
      <h2>${esc(appSlug)} onboarding</h2>
      <p class="sub">Pick the app framework and copy the setup packet into your app/workflow.</p>
      <form method="get" action="/app-onboarding/${encodeURIComponent(appSlug)}">
        <label>Framework</label>
        <select name="framework">${opts}</select>
        <button>Generate packet</button>
      </form>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Onboarding Packet</h2>
        <pre><code>${esc(packet.packet || JSON.stringify(packet,null,2))}</code></pre>
      </div>
      <div class="panel">
        <h2>Proof Packet</h2>
        <p class="sub">Accepted: <strong>${proof.packet?.accepted ? 'yes' : 'no'}</strong></p>
        <pre><code>${esc(JSON.stringify(proof.packet || proof,null,2))}</code></pre>
      </div>
    </section>
  `));
});


app.get('/app-lifecycle', async (_req, res) => {
  const apps = await gateway('/admin/apps');
  const rows = (apps.apps || []).map(a => `<tr><td>${esc(a.app_slug)}</td><td>${esc(a.database_name)}</td><td>${esc(a.status)}</td><td><a href="/app-lifecycle/${encodeURIComponent(a.app_slug)}">Manage lifecycle</a></td></tr>`).join('');
  res.send(page('App Lifecycle', `
    <section class="panel">
      <h2>App Lifecycle</h2>
      <p class="sub">Move an app from old database to CitadelDB with migration plan, proof buttons, rollback packet, and acceptance status.</p>
      <p><a class="cta" href="/launchpad">Create app database</a></p>
    </section>
    <section class="panel">
      <h2>Apps</h2>
      <table><thead><tr><th>App</th><th>Database</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4">No apps yet.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.get('/app-lifecycle/:appSlug', async (req, res) => {
  const appSlug = req.params.appSlug;
  const framework = req.query.framework || 'node-express';
  const source = req.query.source || 'existing DATABASE_URL';
  const plan = await gateway(`/admin/apps/${encodeURIComponent(appSlug)}/migration-plan?framework=${encodeURIComponent(framework)}&source=${encodeURIComponent(source)}`);
  const proof = await gateway(`/admin/apps/${encodeURIComponent(appSlug)}/proof-packet`);
  const rollback = await gateway(`/admin/apps/${encodeURIComponent(appSlug)}/rollback-packet`);
  const steps = (plan.steps || []).map(s => `<tr><td>${s.order}</td><td>${esc(s.label)}</td><td>${esc(s.proof)}</td></tr>`).join('');

  res.send(page(`Lifecycle · ${esc(appSlug)}`, `
    <section class="panel">
      <h2>${esc(appSlug)} lifecycle</h2>
      <p class="sub">Use this screen to move the app onto CitadelDB end-to-end without guessing the sequence.</p>
      <form method="get" action="/app-lifecycle/${encodeURIComponent(appSlug)}">
        <label>Framework</label>
        <select name="framework">
          ${['node-express','nextjs-prisma','python-sqlalchemy','django','rails','laravel'].map(f => `<option value="${f}" ${f===framework?'selected':''}>${f}</option>`).join('')}
        </select>
        <label>Source database label</label>
        <input name="source" value="${esc(source)}">
        <button>Update migration plan</button>
      </form>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Proof status</h2>
        <pre><code>${esc(JSON.stringify(proof.packet?.acceptance || proof, null, 2))}</code></pre>
        <p>Accepted: <strong>${proof.packet?.accepted ? 'yes' : 'no'}</strong></p>
      </div>
      <div class="panel">
        <h2>Lifecycle actions</h2>
        ${[
          ['migration-rehearsal','Queue migration rehearsal check'],
          ['app-backup-now','Run app backup proof'],
          ['app-restore-test','Run app restore-test proof'],
          ['app-diagnostic-bundle','Queue diagnostic/policy check'],
          ['app-cutover-note','Record cutover readiness note']
        ].map(([action,label]) => `<form method="post" action="/app-lifecycle/${encodeURIComponent(appSlug)}/action" style="margin-bottom:10px"><input type="hidden" name="action" value="${action}"><button>${label}</button></form>`).join('')}
      </div>
    </section>
    <section class="panel">
      <h2>Migration plan</h2>
      <table><thead><tr><th>#</th><th>Step</th><th>Proof</th></tr></thead><tbody>${steps}</tbody></table>
    </section>
    <section class="panel">
      <h2>Rollback packet</h2>
      <pre><code>${esc(rollback.packet || JSON.stringify(rollback,null,2))}</code></pre>
    </section>
  `));
});

app.post('/app-lifecycle/:appSlug/action', async (req, res) => {
  const result = await gatewayPost(`/admin/apps/${encodeURIComponent(req.params.appSlug)}/lifecycle-action`, { action: req.body.action });
  res.send(page('Lifecycle Action Queued', `
    <section class="panel">
      <h2>Lifecycle action queued</h2>
      <p class="sub">This does not claim success. Check Jobs, proof packets, backups, and restores.</p>
      <pre><code>${esc(JSON.stringify(result,null,2))}</code></pre>
      <p><a class="cta" href="/app-lifecycle/${encodeURIComponent(req.params.appSlug)}">Back to lifecycle</a> <a class="cta" href="/jobs">View Jobs</a></p>
    </section>
  `));
});


app.get('/self-service', async (_req, res) => {
  const projects = await gateway('/admin/self-service/projects');
  const rows = (projects.projects || []).map(p => `<tr><td>${esc(p.project_name)}</td><td>${esc(p.project_slug)}</td><td>${esc(p.owner_ref)}</td><td>${esc(p.status)}</td><td><a href="/self-service/${encodeURIComponent(p.project_slug)}">Open Console</a></td></tr>`).join('');
  res.send(page('Self-Service Console', `
    <section class="panel">
      <h2>Self-Service Database Console</h2>
      <p class="sub">Create projects, let users provision databases, copy connection strings, run SQL, and track query history.</p>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Create project</h2>
        <form method="post" action="/self-service/projects">
          <label>Project name</label>
          <input name="projectName" placeholder="SkyRoutes Client DBs" required>
          <label>Project slug</label>
          <input name="projectSlug" placeholder="skyroutes" required>
          <label>Owner reference</label>
          <input name="ownerRef" placeholder="client/team/user id">
          <label>Max databases</label>
          <input name="maxDatabases" type="number" value="5" min="1" max="100">
          <button>Create project</button>
        </form>
      </div>
      <div class="panel">
        <h2>Neon-level target</h2>
        <p>This console is the foundation for user self-service: projects, databases, roles, connection strings, SQL execution, and history. Branching/autoscale/storage billing still need live infrastructure-specific implementation.</p>
      </div>
    </section>
    <section class="panel">
      <h2>Projects</h2>
      <table><thead><tr><th>Name</th><th>Slug</th><th>Owner</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5">No projects yet.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.post('/self-service/projects', async (req, res) => {
  const result = await gatewayPost('/admin/self-service/projects', {
    projectName: req.body.projectName,
    projectSlug: req.body.projectSlug,
    ownerRef: req.body.ownerRef || 'operator',
    maxDatabases: Number(req.body.maxDatabases || 5)
  });
  const slug = result.project?.project_slug || req.body.projectSlug;
  res.redirect(`/self-service/${encodeURIComponent(slug)}`);
});

app.get('/self-service/:projectSlug', async (req, res) => {
  const projectSlug = req.params.projectSlug;
  const result = await gateway(`/admin/self-service/projects/${encodeURIComponent(projectSlug)}`);
  if (!result.ok) return res.send(page('Project Console', `<section class="panel"><h2>Project not found</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre></section>`));
  const dbRows = (result.databases || []).map(d => `<tr><td>${esc(d.app_slug)}</td><td>${esc(d.database_name)}</td><td>${esc(d.role_name)}</td><td>${esc(d.status)}</td><td><a href="/self-service/${encodeURIComponent(projectSlug)}/db/${encodeURIComponent(d.app_slug)}">SQL Console</a></td></tr>`).join('');
  const histRows = (result.queryHistory || []).map(h => `<tr><td>${esc(h.created_at)}</td><td>${esc(h.app_slug)}</td><td>${esc(h.statement_kind)}</td><td>${h.success?'✅':'☐'}</td><td>${esc(h.elapsed_ms || '')}</td><td>${esc(h.sql_preview)}</td></tr>`).join('');
  res.send(page(`Project · ${esc(result.project.project_name)}`, `
    <section class="panel">
      <h2>${esc(result.project.project_name)}</h2>
      <p class="sub">Owner: ${esc(result.project.owner_ref)} · Databases: ${esc((result.databases || []).length)} / ${esc(result.project.max_databases)}</p>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Provision database</h2>
        <form method="post" action="/self-service/${encodeURIComponent(projectSlug)}/databases">
          <label>Database/app name</label>
          <input name="appSlug" placeholder="production, staging, customer-a" required>
          <button>Create database</button>
        </form>
      </div>
      <div class="panel">
        <h2>Project usage</h2>
        <p>Query history and provisioned databases are tracked here. Storage/compute metering is scaffolded for provider-specific live metrics.</p>
      </div>
    </section>
    <section class="panel">
      <h2>Databases</h2>
      <table><thead><tr><th>App</th><th>Database</th><th>User</th><th>Status</th><th></th></tr></thead><tbody>${dbRows || '<tr><td colspan="5">No databases yet.</td></tr>'}</tbody></table>
    </section>
    <section class="panel">
      <h2>Recent SQL history</h2>
      <table><thead><tr><th>Time</th><th>DB</th><th>Kind</th><th>OK</th><th>ms</th><th>SQL</th></tr></thead><tbody>${histRows || '<tr><td colspan="6">No queries yet.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.post('/self-service/:projectSlug/databases', async (req, res) => {
  const result = await gatewayPost(`/admin/self-service/projects/${encodeURIComponent(req.params.projectSlug)}/databases`, {
    appSlug: req.body.appSlug,
    engine: 'vps-postgres'
  });
  res.send(page('Database Created', `
    <section class="panel">
      <h2>Database created</h2>
      <p class="sub">Copy this now. The password is shown once.</p>
      <pre><code>${esc(result.connection?.env || JSON.stringify(result,null,2))}</code></pre>
      <p><a class="cta" href="/self-service/${encodeURIComponent(req.params.projectSlug)}">Back to project</a></p>
    </section>
  `));
});

app.get('/self-service/:projectSlug/db/:appSlug', async (req, res) => {
  res.send(page('SQL Console', `
    <section class="panel">
      <h2>SQL Console · ${esc(req.params.appSlug)}</h2>
      <p class="sub">Paste the database URL for this database, then run one SQL statement at a time. Dangerous role/system operations are blocked.</p>
    </section>
    <section class="panel">
      <form method="post" action="/self-service/${encodeURIComponent(req.params.projectSlug)}/db/${encodeURIComponent(req.params.appSlug)}/sql">
        <label>DATABASE_URL</label>
        <textarea name="databaseUrl" rows="3" placeholder="postgres://user:password@host:6432/database" required></textarea>
        <label>SQL</label>
        <textarea name="sql" rows="10" placeholder="select now();" required></textarea>
        <button>Run SQL</button>
      </form>
    </section>
  `));
});

app.post('/self-service/:projectSlug/db/:appSlug/sql', async (req, res) => {
  const result = await gatewayPost(`/admin/self-service/projects/${encodeURIComponent(req.params.projectSlug)}/databases/${encodeURIComponent(req.params.appSlug)}/sql`, {
    databaseUrl: req.body.databaseUrl,
    sql: req.body.sql
  });
  const table = result.rows ? `<table><thead><tr>${(result.fields || []).map(f => `<th>${esc(f)}</th>`).join('')}</tr></thead><tbody>${(result.rows || []).map(row => `<tr>${(result.fields || Object.keys(row)).map(f => `<td>${esc(row[f])}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
  res.send(page('SQL Result', `
    <section class="panel">
      <h2>${result.ok ? 'SQL executed' : 'SQL failed'}</h2>
      <p class="sub">Elapsed: ${esc(result.elapsedMs || '')}ms · Row count: ${esc(result.rowCount ?? '')}</p>
      ${table}
      <pre><code>${esc(JSON.stringify(result,null,2))}</code></pre>
      <p><a class="cta" href="/self-service/${encodeURIComponent(req.params.projectSlug)}">Back to project</a></p>
    </section>
  `));
});


app.get('/platform', async (_req, res) => {
  const [plans, teams] = await Promise.all([gateway('/admin/platform/plans'), gateway('/admin/platform/teams')]);
  const planRows = (plans.plans || []).map(p => `<tr><td>${esc(p.plan_name)}</td><td>${esc(p.plan_slug)}</td><td>$${(p.monthly_price_cents/100).toFixed(2)}</td><td>${esc(p.max_projects)}</td><td>${esc(p.max_databases)}</td><td>${esc(p.max_query_executions_month)}</td><td>${esc(p.max_storage_mb)} MB</td></tr>`).join('');
  const teamRows = (teams.teams || []).map(t => `<tr><td>${esc(t.team_name)}</td><td>${esc(t.team_slug)}</td><td>${esc(t.plan_slug)}</td><td>${esc(t.owner_account_ref)}</td><td><a href="/platform/team/${encodeURIComponent(t.team_slug)}">Usage</a></td></tr>`).join('');
  res.send(page('Platform', `
    <section class="panel">
      <h2>Platform Control</h2>
      <p class="sub">Account/team/plan/quota scaffolding for turning CitadelDB into a sellable user-facing database platform.</p>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Create account</h2>
        <form method="post" action="/platform/accounts">
          <label>Account ref</label><input name="accountRef" placeholder="user_001" required>
          <label>Display name</label><input name="displayName" placeholder="Client User" required>
          <label>Email</label><input name="email" placeholder="user@example.com">
          <button>Create account</button>
        </form>
      </div>
      <div class="panel">
        <h2>Create team</h2>
        <form method="post" action="/platform/teams">
          <label>Team slug</label><input name="teamSlug" placeholder="client-team" required>
          <label>Team name</label><input name="teamName" placeholder="Client Team" required>
          <label>Owner account ref</label><input name="ownerAccountRef" placeholder="user_001" required>
          <label>Plan</label><select name="planSlug">${(plans.plans || []).map(p => `<option value="${esc(p.plan_slug)}">${esc(p.plan_name)}</option>`).join('')}</select>
          <button>Create team</button>
        </form>
      </div>
    </section>
    <section class="panel">
      <h2>Plans</h2>
      <table><thead><tr><th>Name</th><th>Slug</th><th>Price</th><th>Projects</th><th>DBs</th><th>Queries/mo</th><th>Storage</th></tr></thead><tbody>${planRows}</tbody></table>
    </section>
    <section class="panel">
      <h2>Teams</h2>
      <table><thead><tr><th>Name</th><th>Slug</th><th>Plan</th><th>Owner</th><th></th></tr></thead><tbody>${teamRows || '<tr><td colspan="5">No teams yet.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.post('/platform/accounts', async (req, res) => {
  await gatewayPost('/admin/platform/accounts', {
    accountRef: req.body.accountRef,
    displayName: req.body.displayName,
    email: req.body.email || undefined
  });
  res.redirect('/platform');
});

app.post('/platform/teams', async (req, res) => {
  await gatewayPost('/admin/platform/teams', {
    teamSlug: req.body.teamSlug,
    teamName: req.body.teamName,
    ownerAccountRef: req.body.ownerAccountRef,
    planSlug: req.body.planSlug || 'starter'
  });
  res.redirect('/platform');
});

app.get('/platform/team/:teamSlug', async (req, res) => {
  const usage = await gateway(`/admin/platform/teams/${encodeURIComponent(req.params.teamSlug)}/usage`);
  res.send(page('Team Usage', `
    <section class="panel">
      <h2>${esc(usage.team?.team_name || req.params.teamSlug)} usage</h2>
      <p class="sub">Plan: ${esc(usage.team?.plan_name || '')}</p>
      <pre><code>${esc(JSON.stringify(usage.usage || usage,null,2))}</code></pre>
    </section>
    <section class="panel">
      <h2>Attach project to team</h2>
      <form method="post" action="/platform/team/${encodeURIComponent(req.params.teamSlug)}/attach-project">
        <label>Project slug</label><input name="projectSlug" required>
        <button>Attach project</button>
      </form>
    </section>
  `));
});

app.post('/platform/team/:teamSlug/attach-project', async (req, res) => {
  const result = await gatewayPost(`/admin/platform/teams/${encodeURIComponent(req.params.teamSlug)}/projects/${encodeURIComponent(req.body.projectSlug)}/attach`, {});
  res.send(page('Project Attached', `<section class="panel"><h2>Project attachment result</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/platform/team/${encodeURIComponent(req.params.teamSlug)}">Back</a></p></section>`));
});

app.get('/table-browser', async (_req, res) => {
  const projects = await gateway('/admin/self-service/projects');
  const projectOptions = (projects.projects || []).map(p => `<option value="${esc(p.project_slug)}">${esc(p.project_name)} · ${esc(p.project_slug)}</option>`).join('');
  res.send(page('Table Browser', `
    <section class="panel">
      <h2>Table Browser</h2>
      <p class="sub">Preview tables safely using a pasted DATABASE_URL. This is the foundation for a fuller table editor.</p>
    </section>
    <section class="panel">
      <form method="post" action="/table-browser/tables">
        <label>Project</label><select name="projectSlug">${projectOptions}</select>
        <label>App/database slug</label><input name="appSlug" placeholder="project-production" required>
        <label>DATABASE_URL</label><textarea name="databaseUrl" rows="3" required></textarea>
        <button>List tables</button>
      </form>
    </section>
  `));
});

app.post('/table-browser/tables', async (req, res) => {
  const result = await gatewayPost(`/admin/self-service/projects/${encodeURIComponent(req.body.projectSlug)}/databases/${encodeURIComponent(req.body.appSlug)}/tables`, { databaseUrl: req.body.databaseUrl });
  const rows = (result.tables || []).map(t => `<tr><td>${esc(t.table_schema)}</td><td>${esc(t.table_name)}</td><td><form method="post" action="/table-browser/preview"><input type="hidden" name="projectSlug" value="${esc(req.body.projectSlug)}"><input type="hidden" name="appSlug" value="${esc(req.body.appSlug)}"><input type="hidden" name="databaseUrl" value="${esc(req.body.databaseUrl)}"><input type="hidden" name="schema" value="${esc(t.table_schema)}"><input type="hidden" name="table" value="${esc(t.table_name)}"><button>Preview</button></form></td></tr>`).join('');
  res.send(page('Tables', `<section class="panel"><h2>Tables</h2><table><thead><tr><th>Schema</th><th>Table</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="3">No tables found.</td></tr>'}</tbody></table><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre></section>`));
});

app.post('/table-browser/preview', async (req, res) => {
  const result = await gatewayPost(`/admin/self-service/projects/${encodeURIComponent(req.body.projectSlug)}/databases/${encodeURIComponent(req.body.appSlug)}/table-preview`, {
    databaseUrl: req.body.databaseUrl,
    schema: req.body.schema,
    table: req.body.table,
    limit: 50
  });
  const table = result.rows ? `<table><thead><tr>${(result.fields || []).map(f => `<th>${esc(f)}</th>`).join('')}</tr></thead><tbody>${(result.rows || []).map(row => `<tr>${(result.fields || Object.keys(row)).map(f => `<td>${esc(row[f])}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
  res.send(page('Table Preview', `<section class="panel"><h2>${esc(req.body.schema)}.${esc(req.body.table)}</h2>${table}<pre><code>${esc(JSON.stringify(result,null,2))}</code></pre></section>`));
});


app.get('/commercial', async (_req, res) => {
  const [readiness, plans, teams, events] = await Promise.all([
    gateway('/admin/commercial/readiness'),
    gateway('/admin/platform/plans'),
    gateway('/admin/platform/teams'),
    gateway('/admin/commercial/events')
  ]);
  const checkRows = (readiness.checks || []).map(c => `<tr><td>${c.ok ? '✅' : '☐'}</td><td>${esc(c.label)}</td></tr>`).join('');
  const teamOpts = (teams.teams || []).map(t => `<option value="${esc(t.team_slug)}">${esc(t.team_name)} · ${esc(t.team_slug)}</option>`).join('');
  const planOpts = (plans.plans || []).map(p => `<option value="${esc(p.plan_slug)}">${esc(p.plan_name)}</option>`).join('');
  const eventRows = (events.events || []).map(e => `<tr><td>${esc(e.created_at)}</td><td>${esc(e.event_type)}</td><td>${esc(e.team_slug || '')}</td><td>${e.processed?'✅':'☐'}</td></tr>`).join('');
  res.send(page('Commercial Control Plane', `
    <section class="panel">
      <h2>Commercial Control Plane</h2>
      <p class="sub">Billing, entitlement, subscription, and commercial readiness scaffolding.</p>
      <div class="notice">Readiness: <strong>${esc(readiness.complete || 0)}</strong> / <strong>${esc(readiness.total || 0)}</strong></div>
    </section>
    <section class="two">
      <div class="panel">
        <h2>Commercial readiness</h2>
        <table><thead><tr><th></th><th>Check</th></tr></thead><tbody>${checkRows}</tbody></table>
      </div>
      <div class="panel">
        <h2>Manual subscription / entitlement test</h2>
        <form method="post" action="/commercial/subscription">
          <label>Team</label><select name="teamSlug">${teamOpts}</select>
          <label>Plan</label><select name="planSlug">${planOpts}</select>
          <label>Status</label><select name="status"><option value="active">active</option><option value="trialing">trialing</option><option value="past_due">past_due</option><option value="canceled">canceled</option></select>
          <button>Create/update subscription</button>
        </form>
      </div>
    </section>
    <section class="panel">
      <h2>Recent billing events</h2>
      <table><thead><tr><th>Time</th><th>Type</th><th>Team</th><th>Processed</th></tr></thead><tbody>${eventRows || '<tr><td colspan="4">No events yet.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.post('/commercial/subscription', async (req, res) => {
  const result = await gatewayPost('/admin/commercial/subscriptions', {
    teamSlug: req.body.teamSlug,
    planSlug: req.body.planSlug,
    status: req.body.status,
    providerSubscriptionId: `manual_${req.body.teamSlug}`
  });
  res.send(page('Subscription Updated', `<section class="panel"><h2>Subscription updated</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/commercial">Back</a></p></section>`));
});

app.get('/branches', async (_req, res) => {
  const projects = await gateway('/admin/self-service/projects');
  const projectOptions = (projects.projects || []).map(p => `<option value="${esc(p.project_slug)}">${esc(p.project_name)} · ${esc(p.project_slug)}</option>`).join('');
  res.send(page('Database Branches', `
    <section class="panel">
      <h2>Database Branches</h2>
      <p class="sub">Request branch/clone workflows. This records branch intent and proof requirements; live branch creation still needs PITR/snapshot worker proof.</p>
    </section>
    <section class="panel">
      <form method="post" action="/branches/request">
        <label>Project</label><select name="projectSlug">${projectOptions}</select>
        <label>Parent app/database slug</label><input name="appSlug" placeholder="project-production" required>
        <label>Branch slug</label><input name="branchSlug" placeholder="feature-branch" required>
        <label>Source kind</label><select name="sourceKind"><option value="snapshot">snapshot</option><option value="pitr">pitr</option><option value="logical_dump">logical_dump</option></select>
        <label>Source reference</label><input name="sourceReference" placeholder="timestamp, LSN, snapshot id">
        <button>Request branch</button>
      </form>
    </section>
  `));
});

app.post('/branches/request', async (req, res) => {
  const result = await gatewayPost(`/admin/self-service/projects/${encodeURIComponent(req.body.projectSlug)}/databases/${encodeURIComponent(req.body.appSlug)}/branch-request`, {
    branchSlug: req.body.branchSlug,
    sourceKind: req.body.sourceKind,
    sourceReference: req.body.sourceReference || undefined
  });
  res.send(page('Branch Requested', `<section class="panel"><h2>Branch request recorded</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a href="/branches">Back</a></p></section>`));
});


app.get('/live-gates', async (_req, res) => {
  const status = await gateway('/admin/live-gates/status');
  const configRows = Object.entries(status.config || {}).map(([k,v]) => `<tr><td>${esc(k)}</td><td>${v ? '✅' : '☐'}</td></tr>`).join('');
  const gateRows = (status.routeEvents || []).map(e => `<tr><td>${esc(e.created_at)}</td><td>${esc(e.route_key)}</td><td>${e.allowed?'✅':'☐'}</td><td>${esc(e.reason)}</td><td>${esc(e.team_slug || '')}</td></tr>`).join('');
  const usageRows = (status.usageEvents || []).map(e => `<tr><td>${esc(e.created_at)}</td><td>${esc(e.metric_key)}</td><td>${esc(e.metric_value)}</td><td>${esc(e.project_slug || '')}</td><td>${esc(e.app_slug || '')}</td></tr>`).join('');
  const branchRows = (status.branchReceipts || []).map(b => `<tr><td>${esc(b.created_at)}</td><td>${esc(b.project_slug)}</td><td>${esc(b.branch_slug)}</td><td>${esc(b.status)}</td><td>${esc(b.source_kind)}</td></tr>`).join('');
  res.send(page('Live Gates', `
    <section class="panel">
      <h2>Live Gates</h2>
      <p class="sub">This page separates configured scaffolds from live-enforced platform behavior.</p>
      <form method="post" action="/live-gates/check"><button>Run live gate config check</button></form>
    </section>
    <section class="panel">
      <h2>Configuration</h2>
      <table><thead><tr><th>Gate</th><th>Enabled</th></tr></thead><tbody>${configRows}</tbody></table>
    </section>
    <section class="panel">
      <h2>Recent route gate events</h2>
      <table><thead><tr><th>Time</th><th>Route</th><th>Allowed</th><th>Reason</th><th>Team</th></tr></thead><tbody>${gateRows || '<tr><td colspan="5">No gate events yet.</td></tr>'}</tbody></table>
    </section>
    <section class="panel">
      <h2>Recent usage events</h2>
      <table><thead><tr><th>Time</th><th>Metric</th><th>Value</th><th>Project</th><th>App</th></tr></thead><tbody>${usageRows || '<tr><td colspan="5">No usage events yet.</td></tr>'}</tbody></table>
    </section>
    <section class="panel">
      <h2>Branch receipts</h2>
      <table><thead><tr><th>Time</th><th>Project</th><th>Branch</th><th>Status</th><th>Source</th></tr></thead><tbody>${branchRows || '<tr><td colspan="5">No branch receipts yet.</td></tr>'}</tbody></table>
    </section>
  `));
});

app.post('/live-gates/check', async (_req, res) => {
  const result = await gatewayPost('/admin/live-gates/check', {});
  res.send(page('Live Gate Check', `<section class="panel"><h2>Live gate check recorded</h2><pre><code>${esc(JSON.stringify(result,null,2))}</code></pre><p><a class="cta" href="/live-gates">Back to Live Gates</a></p></section>`));
});


app.get('/live-gates/protected-routes', async (_req, res) => {
  const result = await gateway('/admin/live-gates/protected-routes');
  const rows = (result.protectedRoutes || []).map(r => `<tr><td>${esc(r.status === 'guarded' ? '✅' : '☐')}</td><td>${esc(r.key)}</td><td>${esc(r.method)}</td><td>${esc(r.path)}</td><td>${esc(r.reason)}</td></tr>`).join('');
  res.send(page('Protected Routes', `
    <section class="panel">
      <h2>Protected Route Registry</h2>
      <p class="sub">This shows what is actually guarded versus what still needs policy review before public launch.</p>
      <div class="notice">Guarded: <strong>${esc(result.guarded || 0)}</strong> · Needs policy review: <strong>${esc(result.needsPolicyReview || 0)}</strong></div>
    </section>
    <section class="panel">
      <table><thead><tr><th></th><th>Key</th><th>Method</th><th>Path</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>
    </section>
  `));
});

app.listen(port,'0.0.0.0',()=>console.log(`CitadelDB Operator Dashboard v2.2 Truth Correction listening on :${port}`));
