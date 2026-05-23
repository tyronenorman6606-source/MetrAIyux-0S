// SkyeSecretRotation — isolated owner-only surface for rotating Cloudflare Worker secrets
// Auth: FREE99_ROTATION_CODE (rotation-surface PIN) + FS27 gate verification
// API: Cloudflare v4 — requires CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID worker secrets

const ROTATION_PIN_KEYS = ['FREE99_ROTATION_CODE', 'ROTATION_PIN', 'ROTATION_CODE', 'FREE99_ADMIN_CODE'];
const CF_API = 'https://api.cloudflare.com/client/v4';

function html(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function rotationPin(env) {
  for (const key of ROTATION_PIN_KEYS) {
    const v = String(env[key] || '').trim();
    if (v) return v;
  }
  return '';
}
function cfHeaders(env) {
  return { 'authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json' };
}
function bearer(request) {
  const auth = String(request.headers.get('authorization') || '');
  return auth.replace(/^Bearer\s+/i, '').trim();
}
function cookieValue(request, name) {
  const raw = String(request.headers.get('cookie') || '');
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}
function presentedCode(request, body = {}) {
  return [
    body.code, body.pin, body.password,
    bearer(request),
    cookieValue(request, 'skye_rotation_session'),
    cookieValue(request, 'metraiyux_admin_session'),
    cookieValue(request, 'skye_gate_session'),
  ].map(v => String(v || '').trim()).find(v => v) || '';
}
function setSessionCookie(pin) {
  return `skye_rotation_session=${encodeURIComponent(pin)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;
}
function clearSessionCookie() {
  return `skye_rotation_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
function authPassed(request, env, body = {}) {
  const pin = rotationPin(env);
  if (!pin) return false;
  const code = presentedCode(request, body);
  return code === pin;
}

async function listWorkerSecrets(env, workerName) {
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');
  const res = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${workerName}/secrets`, {
    headers: cfHeaders(env)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.errors?.[0]?.message || `CF API error ${res.status}`);
  return data.result || [];
}

async function putWorkerSecret(env, workerName, secretName, secretValue) {
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');
  const res = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${workerName}/secrets`, {
    method: 'PUT',
    headers: cfHeaders(env),
    body: JSON.stringify({ name: secretName, text: secretValue, type: 'secret_text' })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.errors?.[0]?.message || `CF API error ${res.status}`);
  return data.result;
}

async function sendRotationEmail(env, workerName, secretName, action = 'rotated') {
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  const toEmail = String(env.NOTIFY_EMAIL || 'graylondonskyes@gmail.com').trim();
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY not set' };

  const now = new Date().toISOString();
  const body = {
    from: 'SkyeSecretRotation <noreply@solenterprises.org>',
    to: [toEmail],
    subject: `[SkyeRotation] Secret ${action} — ${secretName} on ${workerName}`,
    html: `
      <div style="font-family:monospace;background:#07090b;color:#f8fbf6;padding:32px;border-radius:8px;max-width:560px">
        <p style="color:#f5d36a;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 16px">SkyeSecretRotation · Owner Alert</p>
        <h2 style="margin:0 0 20px;font-size:22px">Secret ${action.charAt(0).toUpperCase() + action.slice(1)}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:8px 0;color:#aeb8b2;border-bottom:1px solid #1a2320">Worker</td><td style="padding:8px 0;font-weight:700;border-bottom:1px solid #1a2320">${workerName}</td></tr>
          <tr><td style="padding:8px 0;color:#aeb8b2;border-bottom:1px solid #1a2320">Secret</td><td style="padding:8px 0;font-weight:700;border-bottom:1px solid #1a2320">${secretName}</td></tr>
          <tr><td style="padding:8px 0;color:#aeb8b2;border-bottom:1px solid #1a2320">Action</td><td style="padding:8px 0;color:#f5d36a;font-weight:700;border-bottom:1px solid #1a2320">${action.toUpperCase()}</td></tr>
          <tr><td style="padding:8px 0;color:#aeb8b2">Timestamp</td><td style="padding:8px 0">${now}</td></tr>
        </table>
        ${secretName === 'CLOUDFLARE_API_TOKEN' ? `
        <div style="background:rgba(245,211,106,.08);border:1px solid rgba(245,211,106,.3);border-radius:6px;padding:14px;margin-bottom:16px">
          <p style="color:#f5d36a;margin:0 0 8px;font-weight:700">⚠ Action Required</p>
          <p style="color:#dce6df;margin:0;line-height:1.6">The Cloudflare API token was rotated. Update <code style="background:#111;padding:2px 6px;border-radius:3px">cf_pages_deploy.py</code> line 10 with the new token, then redeploy any marketing or static sites that use the script.</p>
        </div>` : ''}
        <p style="color:#aeb8b2;font-size:12px;margin:0">This is an automated alert from SkyeSecretRotation. No action needed unless this was unexpected.</p>
      </div>
    `
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { sent: res.ok, id: data.id, error: data.message };
}

async function deleteWorkerSecret(env, workerName, secretName) {
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');
  const res = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${workerName}/secrets/${secretName}`, {
    method: 'DELETE',
    headers: cfHeaders(env)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.errors?.[0]?.message || `CF API error ${res.status}`);
  return data.result;
}

function allowedWorkers(env) {
  return String(env.ALLOWED_WORKER_NAMES || '').split(',').map(s => s.trim()).filter(Boolean);
}

const UI_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkyeSecretRotation | Owner Command</title>
  <style>
    :root{color-scheme:dark;--bg:#07090b;--panel:#111817;--line:rgba(255,255,255,.14);--text:#f8fbf6;--muted:#aeb8b2;--gold:#f5d36a;--cyan:#7ae7ff;--red:#ff6b81;--green:#6affb7}
    *{box-sizing:border-box}body{margin:0;min-height:100svh;background:linear-gradient(145deg,#060708,#0d1312 48%,#100c08);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;line-height:1.55}
    main{width:min(980px,calc(100% - 32px));margin:0 auto;padding:48px 0 80px}
    .eyebrow{margin:0 0 8px;color:var(--gold);font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
    h1{margin:0 0 8px;font-size:clamp(32px,5vw,56px);line-height:1}h2{margin:0 0 12px;font-size:20px}
    p{color:var(--muted);margin:0 0 14px}
    .panel{border:1px solid var(--line);background:rgba(17,24,23,.82);border-radius:8px;padding:24px;margin-bottom:20px}
    label{display:grid;gap:6px;margin:0 0 12px;font-weight:700;color:#dce6df}
    input,select{width:100%;border:1px solid var(--line);border-radius:6px;background:#07100f;color:var(--text);padding:11px 13px;font:inherit}
    button{appearance:none;border:0;border-radius:6px;padding:10px 16px;font:inherit;font-weight:900;cursor:pointer}
    .primary{background:linear-gradient(135deg,var(--gold),var(--cyan));color:#06100d}
    .danger{background:rgba(255,107,129,.18);border:1px solid var(--red);color:var(--red)}
    .ghost{background:#16201f;border:1px solid var(--line);color:var(--text)}
    .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .status{padding:10px 14px;border-radius:6px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);margin-top:10px;min-height:40px}
    .status.ok{border-color:rgba(106,255,183,.4);color:var(--green)}.status.bad{border-color:rgba(255,107,129,.4);color:var(--red)}
    .secrets-table{width:100%;border-collapse:collapse;margin-top:12px}
    .secrets-table th{text-align:left;padding:8px 12px;font-size:12px;color:var(--muted);border-bottom:1px solid var(--line)}
    .secrets-table td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.06);font-family:monospace;font-size:13px}
    .worker-select{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}
    .worker-select select{flex:1}
    .rotate-form{display:grid;gap:10px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .warning{border:1px solid rgba(245,211,106,.3);background:rgba(245,211,106,.08);border-radius:6px;padding:12px 14px;color:var(--gold);font-size:13px;margin-bottom:16px}
    @media(max-width:640px){.two-col{grid-template-columns:1fr}}
  </style>
</head>
<body>
<main>
  <div id="login-view">
    <p class="eyebrow">SkyeSecretRotation</p>
    <h1>Rotate Worker Secrets</h1>
    <p>Enter the rotation surface PIN to unlock. This is separate from the main gate password.</p>
    <div class="panel">
      <form id="login-form">
        <label>Rotation Surface PIN
          <input type="password" name="code" autocomplete="current-password" placeholder="Rotation PIN" required>
        </label>
        <button class="primary" type="submit">Unlock Rotation Surface</button>
      </form>
      <div id="login-status" class="status">Waiting for PIN.</div>
    </div>
  </div>

  <div id="main-view" style="display:none">
    <p class="eyebrow">SkyeSecretRotation · Owner Unlocked</p>
    <h1>Worker Secret Manager</h1>
    <div class="warning">⚠️ Rotating a secret updates it live on Cloudflare. The change takes effect immediately. Old sessions signed with the previous value will be invalidated.</div>

    <div class="panel">
      <h2>List & Inspect Secrets</h2>
      <div class="worker-select">
        <label style="margin:0;flex:1">Worker
          <select id="worker-select-list"></select>
        </label>
        <button class="ghost" onclick="loadSecrets()">Load Secrets</button>
      </div>
      <div id="secrets-area"><p style="color:var(--muted)">Select a worker and click Load.</p></div>
    </div>

    <div class="panel">
      <h2>Rotate a Secret</h2>
      <div class="rotate-form">
        <div class="two-col">
          <label>Worker
            <select id="worker-select-rotate"></select>
          </label>
          <label>Secret Name
            <input id="secret-name" type="text" placeholder="e.g. FREE99_ADMIN_CODE" autocomplete="off">
          </label>
        </div>
        <label>New Value
          <input id="secret-value" type="password" placeholder="New secret value" autocomplete="new-password">
        </label>
        <div class="actions">
          <button class="primary" onclick="rotateSecret()">Rotate Secret</button>
          <button class="danger" onclick="deleteSecret()">Delete Secret</button>
        </div>
      </div>
      <div id="rotate-status" class="status">Enter worker, secret name, and new value.</div>
    </div>

    <div class="panel">
      <h2>Add New Secret</h2>
      <div class="rotate-form">
        <div class="two-col">
          <label>Worker
            <select id="worker-select-add"></select>
          </label>
          <label>Secret Name
            <input id="new-secret-name" type="text" placeholder="NEW_SECRET_NAME" autocomplete="off">
          </label>
        </div>
        <label>Value
          <input id="new-secret-value" type="password" placeholder="Secret value" autocomplete="new-password">
        </label>
        <div class="actions">
          <button class="primary" onclick="addSecret()">Add Secret</button>
        </div>
      </div>
      <div id="add-status" class="status">Enter worker, name, and value.</div>
    </div>

    <div style="margin-top:20px">
      <button class="ghost" onclick="logout()">Logout</button>
    </div>
  </div>
</main>
<script>
  let sessionPin = '';
  const workers = JSON.parse(document.body.dataset.workers || '[]');

  function populateSelects() {
    ['worker-select-list','worker-select-rotate','worker-select-add'].forEach(id => {
      const sel = document.getElementById(id);
      sel.innerHTML = workers.map(w => \`<option value="\${w}">\${w}</option>\`).join('');
    });
  }

  function setStatus(id, msg, kind) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  async function api(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, code: sessionPin })
    });
    return { res, data: await res.json().catch(() => ({})) };
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = e.target.code.value;
    setStatus('login-status', 'Checking PIN...', '');
    const { res, data } = await api('/api/auth', { code });
    if (!res.ok) { setStatus('login-status', data.error || 'Invalid PIN.', 'bad'); return; }
    sessionPin = code;
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
    populateSelects();
    setStatus('login-status', 'Unlocked.', 'ok');
  });

  async function loadSecrets() {
    const worker = document.getElementById('worker-select-list').value;
    document.getElementById('secrets-area').innerHTML = '<p style="color:var(--muted)">Loading...</p>';
    const { res, data } = await api('/api/list-secrets', { worker });
    if (!res.ok) { document.getElementById('secrets-area').innerHTML = \`<p style="color:var(--red)">\${data.error || 'Failed to load.'}</p>\`; return; }
    const secrets = data.secrets || [];
    if (!secrets.length) { document.getElementById('secrets-area').innerHTML = '<p style="color:var(--muted)">No secrets found.</p>'; return; }
    document.getElementById('secrets-area').innerHTML = \`
      <table class="secrets-table">
        <thead><tr><th>Name</th><th>Type</th></tr></thead>
        <tbody>\${secrets.map(s => \`<tr><td>\${s.name}</td><td>\${s.type || 'secret_text'}</td></tr>\`).join('')}</tbody>
      </table>
    \`;
  }

  async function rotateSecret() {
    const worker = document.getElementById('worker-select-rotate').value;
    const name = document.getElementById('secret-name').value.trim();
    const value = document.getElementById('secret-value').value;
    if (!name || !value) { setStatus('rotate-status', 'Secret name and value are required.', 'bad'); return; }
    setStatus('rotate-status', 'Rotating...', '');
    const { res, data } = await api('/api/rotate', { worker, name, value });
    if (!res.ok) { setStatus('rotate-status', data.error || 'Rotation failed.', 'bad'); return; }
    document.getElementById('secret-value').value = '';
    setStatus('rotate-status', \`✓ \${name} rotated on \${worker}. Workers using this secret will pick it up on next request.\`, 'ok');
  }

  async function deleteSecret() {
    const worker = document.getElementById('worker-select-rotate').value;
    const name = document.getElementById('secret-name').value.trim();
    if (!name) { setStatus('rotate-status', 'Secret name is required to delete.', 'bad'); return; }
    if (!confirm(\`Delete secret "\${name}" from worker "\${worker}"? This cannot be undone.\`)) return;
    setStatus('rotate-status', 'Deleting...', '');
    const { res, data } = await api('/api/delete-secret', { worker, name });
    if (!res.ok) { setStatus('rotate-status', data.error || 'Delete failed.', 'bad'); return; }
    setStatus('rotate-status', \`✓ \${name} deleted from \${worker}.\`, 'ok');
  }

  async function addSecret() {
    const worker = document.getElementById('worker-select-add').value;
    const name = document.getElementById('new-secret-name').value.trim();
    const value = document.getElementById('new-secret-value').value;
    if (!name || !value) { setStatus('add-status', 'Name and value are required.', 'bad'); return; }
    setStatus('add-status', 'Adding...', '');
    const { res, data } = await api('/api/rotate', { worker, name, value });
    if (!res.ok) { setStatus('add-status', data.error || 'Add failed.', 'bad'); return; }
    document.getElementById('new-secret-name').value = '';
    document.getElementById('new-secret-value').value = '';
    setStatus('add-status', \`✓ \${name} added to \${worker}.\`, 'ok');
  }

  function logout() {
    sessionPin = '';
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('main-view').style.display = 'none';
    document.querySelector('#login-form input').value = '';
  }
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const workers = allowedWorkers(env);

    // Serve the UI
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '') {
      const htmlWithData = UI_HTML.replace(
        'document.body.dataset.workers || \'[]\'',
        `'${JSON.stringify(workers)}'`
      );
      return html(htmlWithData);
    }

    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
    if (!url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found' }, 404);

    let body = {};
    try { body = await request.json(); } catch {}

    // Verify the rotation PIN on every API call
    if (!authPassed(request, env, body)) {
      return json({ ok: false, error: 'Invalid rotation PIN.' }, 401);
    }

    // Verify Cloudflare API credentials are set
    const cfToken = String(env.CLOUDFLARE_API_TOKEN || '').trim();
    const cfAccount = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim();

    if (url.pathname === '/api/auth') {
      const configured = Boolean(cfToken && cfAccount);
      const res = new Response(JSON.stringify({ ok: true, configured, workers }), {
        headers: { 'content-type': 'application/json', 'set-cookie': setSessionCookie(String(body.code || '')), 'cache-control': 'no-store' }
      });
      return res;
    }

    if (!cfToken || !cfAccount) {
      return json({ ok: false, error: 'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set as worker secrets.' }, 503);
    }

    const targetWorker = String(body.worker || '').trim();
    if (!targetWorker) return json({ ok: false, error: 'worker is required' }, 400);
    if (!workers.includes(targetWorker)) return json({ ok: false, error: `Worker "${targetWorker}" is not in the allowed list.` }, 400);

    if (url.pathname === '/api/list-secrets') {
      try {
        const secrets = await listWorkerSecrets(env, targetWorker);
        return json({ ok: true, worker: targetWorker, secrets });
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }

    if (url.pathname === '/api/rotate') {
      const secretName = String(body.name || '').trim();
      const secretValue = String(body.value || '');
      if (!secretName) return json({ ok: false, error: 'name is required' }, 400);
      if (!secretValue) return json({ ok: false, error: 'value is required' }, 400);
      try {
        const result = await putWorkerSecret(env, targetWorker, secretName, secretValue);
        sendRotationEmail(env, targetWorker, secretName, 'rotated').catch(() => {});
        return json({ ok: true, worker: targetWorker, name: secretName, result });
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }

    if (url.pathname === '/api/delete-secret') {
      const secretName = String(body.name || '').trim();
      if (!secretName) return json({ ok: false, error: 'name is required' }, 400);
      try {
        const result = await deleteWorkerSecret(env, targetWorker, secretName);
        return json({ ok: true, worker: targetWorker, name: secretName, result });
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }

    if (url.pathname === '/api/logout') {
      const res = new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json', 'set-cookie': clearSessionCookie(), 'cache-control': 'no-store' }
      });
      return res;
    }

    return json({ ok: false, error: 'Unknown rotation API route' }, 404);
  }
};
