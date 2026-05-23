import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const hasArg = (name) => args.includes(name);
const argValue = (name) => {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
};

function parseEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const env = {
  ...parseEnv(path.join(root, 'SkyeVault-Drop/.env')),
  ...parseEnv(path.join(root, '.env')),
  ...process.env
};

const vaultOrigin = String(argValue('--vault-origin') || env.SKYEVAULT_DROP_WORKER_URL || 'https://skyevault-drop.graylondonskyes.workers.dev').replace(/\/+$/, '');
const zeroSOrigin = String(argValue('--0s-origin') || env.METRAIYUX_0S_WORKER_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const fs27Origin = String(argValue('--fs27-origin') || env.SKYGATEFS27_ORIGIN || env.FS27_LIVE_BASE || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev').replace(/\/+$/, '');
const requestedReceiptId = argValue('--receipt-id') || env.SKYEVAULT_LAST_SECRET_RECEIPT_ID || env.SKYEVAULT_LAST_REPO_RECEIPT_ID || '';
const allowLegacyAdmin = hasArg('--allow-legacy-admin');

function redact(value) {
  const text = String(value || '');
  if (!text) return '';
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return { text, data: JSON.parse(text || '{}') };
  } catch {
    return { text, data: {} };
  }
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const { text, data } = await readJson(response);
  return { response, text, data };
}

async function getText(url, headers = {}) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  return { response, text };
}

async function obtainFs27Bearer() {
  const direct = env.SKYEVAULT_ONE_AUTH_BEARER || env.SKYGATE_SESSION_TOKEN || env.FS27_ADMIN_BEARER || '';
  if (direct) return { bearer: direct, source: 'env-bearer', login: null };
  const password = [
    env.ADMIN_PASSWORD,
    env.FS27_ADMIN_PASSWORD,
    env.SKYGATEFS27_ADMIN_PASSWORD,
    env.SKYGATE_ADMIN_PASSWORD,
    env.SKYEGATE_ADMIN_PASSWORD,
    env.SKYGATEFS13_ADMIN_PASSWORD,
    env.QA_ADMIN_PASSWORD,
    env.PHC_OPERATOR_PASSWORD
  ].map((value) => String(value || '').trim()).find(Boolean) || '';
  if (!password) return { bearer: '', source: '', login: { ok: false, error: 'No FS27 bearer env or admin password is available.' } };
  const login = await postJson(`${fs27Origin}/admin/login`, { password });
  if (!login.response.ok || !login.data.token) {
    return { bearer: '', source: '', login: { ok: false, status: login.response.status, error: login.data.error || login.text.slice(0, 160) } };
  }
  return { bearer: login.data.token, source: 'fs27-admin-login', login: { ok: true, via: login.data.via || 'admin-login', tokenHint: redact(login.data.token) } };
}

async function introspectBearer(bearer) {
  if (!bearer) return { ok: false, active: false, error: 'No bearer available.' };
  const result = await postJson(`${fs27Origin}/auth-introspect`, { token: bearer });
  return {
    ok: result.response.ok && result.data.active === true,
    status: result.response.status,
    active: Boolean(result.data.active),
    role: result.data.role || '',
    subject: result.data.sub || '',
    email: result.data.email || result.data.username || '',
    scope: result.data.scope || '',
    gateCardId: result.data.gate_card_id || result.data.gate_card?.id || '',
    error: result.data.error || ''
  };
}

function authHeaders(bearer, adminToken = '') {
  if (bearer) {
    return {
      authorization: `Bearer ${bearer}`,
      'x-skye-platform': 'metraiyux-0s-admin',
      'x-skye-usage-lane': 'skyevault-one-auth-live-proof',
      origin: zeroSOrigin
    };
  }
  if (adminToken) return { 'x-admin-token': adminToken, origin: zeroSOrigin };
  return { origin: zeroSOrigin };
}

function pickReceipt(ledgerEntries = []) {
  if (requestedReceiptId) {
    const exact = ledgerEntries.find((entry) => entry.id === requestedReceiptId);
    if (exact) return exact;
  }
  return ledgerEntries.find((entry) => String(entry.fileName || entry.driveFile?.name || '').toLowerCase().endsWith('.skyesecrets'))
    || ledgerEntries[0]
    || null;
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeReport(report) {
  const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dir = path.join(root, 'test-artifacts/skyevault-one-auth-live-proof');
  const file = path.join(dir, `skyevault-one-auth-live-proof-${stamp}.json`);
  const latest = path.join(dir, 'latest.json');
  ensureDir(file);
  const text = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(file, text);
  fs.writeFileSync(latest, text);
  return { file, latest };
}

const startedAt = new Date().toISOString();
const report = {
  schema: 'skyevault.one-auth.live-proof.v1',
  startedAt,
  origins: { zeroSOrigin, vaultOrigin, fs27Origin },
  checks: [],
  oneAuthVerified: false,
  legacyAdminVerified: false,
  receiptDownloadVerified: false,
  failures: []
};

function check(name, ok, detail = {}, required = true) {
  const item = { name, ok: Boolean(ok), required, ...detail };
  report.checks.push(item);
  if (required && !ok) report.failures.push({ name, detail });
  return item;
}

try {
  const [dashboard, dashboardJs, skyeSecure] = await Promise.all([
    getText(`${zeroSOrigin}/admin/skyevault-command-center.html`),
    getText(`${zeroSOrigin}/admin/skyevault-command-center.js`),
    getText(`${zeroSOrigin}/skye-secure-secret-packs/app.html`)
  ]);
  check('0S command center page live', dashboard.response.ok && dashboard.text.includes('SkyeVault Command Center'), { status: dashboard.response.status });
  check('0S command center script live', dashboardJs.response.ok && dashboardJs.text.includes('SkyeVaultCommandCenter'), { status: dashboardJs.response.status });
  check('SkyeSecure unlock console live', skyeSecure.response.ok && /SkyeSecure|secret pack/i.test(skyeSecure.text), { status: skyeSecure.response.status });

  const { bearer, source, login } = await obtainFs27Bearer();
  report.fs27Bearer = { present: Boolean(bearer), source, login };
  const introspection = await introspectBearer(bearer);
  report.fs27Introspection = introspection;
  check('FS27 bearer introspects as active admin', introspection.ok && String(introspection.role || '').toLowerCase() === 'admin', {
    status: introspection.status,
    role: introspection.role,
    subject: introspection.subject,
    email: introspection.email,
    scope: introspection.scope,
    gateCardId: introspection.gateCardId
  });

  const adminToken = allowLegacyAdmin ? env.ADMIN_TOKEN || '' : '';
  const headers = authHeaders(introspection.ok ? bearer : '', adminToken);
  const config = await fetch(`${vaultOrigin}/api/admin-config?ledger=true&sessions=true&events=true`, { headers });
  const { text: configText, data: configData } = await readJson(config);
  report.vaultDashboard = {
    status: config.status,
    ok: config.ok && configData.ok !== false,
    actor: configData.actor || null,
    ledgerCount: configData.ledger?.entries?.length || 0,
    sessionCount: configData.sessions?.length || 0,
    eventCount: configData.events?.length || 0,
    error: configData.error || (!config.ok ? configText.slice(0, 180) : '')
  };
  report.oneAuthVerified = config.ok && configData.ok !== false && configData.actor?.type === 'fs27-skygate';
  report.legacyAdminVerified = config.ok && configData.ok !== false && configData.actor?.type === 'legacy-admin-token';
  check('SkyeVault dashboard accepts FS27 bearer', report.oneAuthVerified, {
    status: config.status,
    actor: configData.actor || null,
    ledgerCount: report.vaultDashboard.ledgerCount
  });

  if (!report.oneAuthVerified && allowLegacyAdmin) {
    check('SkyeVault dashboard accepts legacy admin fallback', report.legacyAdminVerified, {
      status: config.status,
      actor: configData.actor || null,
      ledgerCount: report.vaultDashboard.ledgerCount
    }, false);
  }

  const receipt = pickReceipt(configData.ledger?.entries || []);
  report.selectedReceipt = receipt ? {
    id: receipt.id,
    sessionId: receipt.sessionId || '',
    workspaceId: receipt.workspaceId || '',
    developerId: receipt.developerId || '',
    fileName: receipt.fileName || receipt.driveFile?.name || '',
    assetType: receipt.assetType || ''
  } : null;
  if (receipt?.id) {
    const download = await postJson(`${vaultOrigin}/api/admin-vault-download`, {
      receiptId: receipt.id,
      expiresInSeconds: 900
    }, headers);
    report.receiptDownload = {
      status: download.response.status,
      ok: download.response.ok && download.data.ok !== false && Boolean(download.data.downloadUrl),
      hasDownloadUrl: Boolean(download.data.downloadUrl),
      expiresAt: download.data.expiresAt || '',
      actor: download.data.actor || null,
      item: download.data.item ? {
        id: download.data.item.id,
        fileName: download.data.item.fileName,
        fileSize: download.data.item.fileSize,
        workspaceId: download.data.item.workspaceId || ''
      } : null,
      error: download.data.error || ''
    };
    report.receiptDownloadVerified = report.receiptDownload.ok && download.data.actor?.type === 'fs27-skygate';
    check('Signed receipt download created through FS27 bearer', report.receiptDownloadVerified, report.receiptDownload);
  } else {
    check('Receipt available for signed download proof', false, { error: 'No ledger receipts returned.' });
  }
} catch (error) {
  report.failures.push({ name: 'proof runner exception', detail: { error: error.message } });
}

report.finishedAt = new Date().toISOString();
report.ok = report.failures.length === 0 || (allowLegacyAdmin && report.legacyAdminVerified);
const written = writeReport(report);
report.reportPath = written.file;

console.log(`Proof report: ${written.file}`);
console.log(`0S command center: ${report.checks.find((item) => item.name === '0S command center page live')?.ok ? 'ok' : 'fail'}`);
console.log(`FS27 one-auth: ${report.oneAuthVerified ? 'ok' : 'fail'}`);
console.log(`Receipt download: ${report.receiptDownloadVerified ? 'ok' : 'fail'}`);
if (report.failures.length) {
  console.log(`Failures: ${report.failures.map((failure) => failure.name).join(', ')}`);
}

if (!report.ok) process.exit(1);
