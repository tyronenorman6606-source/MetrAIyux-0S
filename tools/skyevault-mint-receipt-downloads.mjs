#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { cleanBearer, resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

function parseArgs(argv) {
  const out = { receipts: [], expires: 3600 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--receipt') out.receipts.push(argv[++i] || '');
    else if (arg.startsWith('--receipt=')) out.receipts.push(arg.slice('--receipt='.length));
    else if (arg === '--handoff') out.handoff = argv[++i] || '';
    else if (arg.startsWith('--handoff=')) out.handoff = arg.slice('--handoff='.length);
    else if (arg === '--out') out.out = argv[++i] || '';
    else if (arg.startsWith('--out=')) out.out = arg.slice('--out='.length);
    else if (arg === '--env-file') out.envFile = argv[++i] || '';
    else if (arg.startsWith('--env-file=')) out.envFile = arg.slice('--env-file='.length);
    else if (arg === '--base-url') out.baseUrl = argv[++i] || '';
    else if (arg.startsWith('--base-url=')) out.baseUrl = arg.slice('--base-url='.length);
    else if (arg === '--zero-os-base') out.zeroOsBase = argv[++i] || '';
    else if (arg.startsWith('--zero-os-base=')) out.zeroOsBase = arg.slice('--zero-os-base='.length);
    else if (arg === '--expires') out.expires = Number(argv[++i] || out.expires);
    else if (arg.startsWith('--expires=')) out.expires = Number(arg.slice('--expires='.length));
    else if (arg === '--html-out') out.htmlOut = argv[++i] || '';
    else if (arg.startsWith('--html-out=')) out.htmlOut = arg.slice('--html-out='.length);
    else if (arg === '--quiet') out.quiet = true;
  }
  return out;
}

function parseEnvFile(file) {
  const env = {};
  if (!file || !fs.existsSync(file)) return env;
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function receiptIdsFromHandoff(file) {
  if (!file) return [];
  const handoff = readJson(file);
  return [
    {
      label: 'full-repo-artifact',
      receiptId: handoff.vault?.receipt?.id || handoff.vault?.entry?.id || handoff.vault?.receiptId || '',
      fileName: handoff.artifact?.fileName || ''
    },
    {
      label: 'skyesecure-control-pack',
      receiptId: handoff.controlUpload?.receiptId || '',
      fileName: handoff.controlPack ? path.basename(handoff.controlPack) : ''
    }
  ].filter((item) => item.receiptId);
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { response, json };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(bytes || 0);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function writeHtmlDownloadOpener(file, result) {
  const okDownloads = result.downloads.filter((item) => item.ok && item.downloadUrl);
  const rows = result.downloads.map((item) => {
    const isSecretPack = /\.skyesecrets$/i.test(item.fileName || item.requestedFileName || '') || /control|secret/i.test(item.label || '');
    const status = item.ok && item.downloadUrl
      ? `<a class="button" href="${escapeHtml(item.downloadUrl)}" target="_blank" rel="noopener">Direct Download</a>`
      : `<strong class="bad">${escapeHtml(item.error || `HTTP ${item.status}`)}</strong>`;
    const unlock = isSecretPack
      ? `<a class="button secondary" href="${escapeHtml(result.unlocker)}" target="_blank" rel="noopener">Open SkyeSecure Unlocker</a>`
      : '';
    return `<article class="download-card">
      <div>
        <p class="eyebrow">${escapeHtml(item.label || 'receipt')}</p>
        <h2>${escapeHtml(item.fileName || item.requestedFileName || item.receiptId)}</h2>
        <p>${escapeHtml(formatBytes(item.fileSize))} · receipt ${escapeHtml(item.receiptId)} · expires ${escapeHtml(item.expiresAt || 'unknown')}</p>
      </div>
      <div class="actions">${status}${unlock}</div>
    </article>`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>SkyeVault Owner Direct Downloads</title>
  <style>
    :root{color-scheme:dark;--bg:#05070b;--panel:#111827;--line:#2d3b52;--text:#eef5ff;--muted:#b4c1d5;--gold:#f2cf78;--ok:#72f0bc;--bad:#ff9d9d}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(135deg,#05070b,#101723 55%,#070a10);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{width:min(980px,calc(100% - 28px));margin:0 auto;padding:32px 0 48px;display:grid;gap:16px}
    h1,h2,p{margin-top:0}h1{font-size:clamp(2rem,5vw,4rem);line-height:.95;margin-bottom:10px}h2{font-size:1.08rem;margin-bottom:6px;overflow-wrap:anywhere}
    .lead{color:var(--muted);font-size:1.05rem;line-height:1.55}.panel,.download-card{border:1px solid var(--line);border-radius:8px;background:rgba(17,24,39,.86);box-shadow:0 24px 80px rgba(0,0,0,.32)}
    .panel{padding:18px}.truth-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.truth-grid article{border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px;background:rgba(255,255,255,.04)}
    .truth-grid b{display:block;color:var(--gold);margin-bottom:5px}.truth-grid span,.download-card p{color:var(--muted);line-height:1.45}.download-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:16px}
    .eyebrow{color:var(--gold);font-size:.76rem;text-transform:uppercase;font-weight:900;letter-spacing:0;margin-bottom:6px}.actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
    .button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border-radius:8px;padding:10px 12px;background:var(--gold);color:#10131a;font-weight:900;text-decoration:none}.button.secondary{background:transparent;color:var(--gold);border:1px solid rgba(242,207,120,.42)}
    .bad{color:var(--bad)}.ok{color:var(--ok)}code{color:var(--gold);overflow-wrap:anywhere}@media(max-width:720px){.download-card{grid-template-columns:1fr}.actions{justify-content:flex-start}}
  </style>
</head>
<body>
  <main>
    <section class="panel">
      <p class="eyebrow">Owner private handoff</p>
      <h1>SkyeVault direct downloads</h1>
      <p class="lead">These buttons are private, short-lived signed object URLs minted from the shared 0S/FS27/SkyGate/Free99 owner gate session. They are download tickets, not another login. If a ticket expires, use Refresh signed links on the local launcher page.</p>
      <div class="truth-grid">
        <article><b>One Login</b><span>The shared gate session is the owner/admin login for vault receipts and link minting.</span></article>
        <article><b>Temporary Ticket</b><span>Each Direct Download button is a signed SkyeVault object URL that expires automatically.</span></article>
        <article><b>Encryption Unlock</b><span>SkyeSecure passphrase/pepper material unlocks encrypted packs. It is not a SkyeVault login.</span></article>
        <article><b>Legacy Fallback</b><span>Old admin/operator tokens are emergency fallback only when the shared gate is unavailable.</span></article>
      </div>
    </section>
    ${rows}
    <section class="panel">
      <p><strong class="ok">${okDownloads.length}</strong> signed download link${okDownloads.length === 1 ? '' : 's'} minted at ${escapeHtml(result.createdAt)}. Open the Owner Login only when a fresh shared gate session is needed: <a class="button secondary" href="${escapeHtml(`${result.zeroOsBase}/admin/login.html`)}" target="_blank" rel="noopener">Owner Login</a> <a class="button secondary" href="/refresh">Refresh signed links</a></p>
      <p>Private JSON receipt: <code>${escapeHtml(result.outputReceipt || '')}</code></p>
    </section>
  </main>
</body>
</html>
`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, { mode: 0o600 });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = { ...parseEnvFile('.env'), ...parseEnvFile(args.envFile || 'env.txt') };
  const env = { ...fileEnv, ...process.env };
  const baseUrl = String(args.baseUrl || env.SKYEVAULT_DROP_URL || 'https://skyevault-drop.graylondonskyes.workers.dev').replace(/\/+$/, '');
  const zeroOsBase = String(args.zeroOsBase || env.ZERO_OS_BASE_URL || env.METRAIYUX_0S_ORIGIN || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
  const expiresInSeconds = Math.min(3600, Math.max(300, Number(args.expires || 3600)));

  const items = [
    ...receiptIdsFromHandoff(args.handoff),
    ...args.receipts.filter(Boolean).map((receiptId) => ({ label: 'receipt', receiptId, fileName: '' }))
  ];
  const unique = [...new Map(items.map((item) => [item.receiptId, item])).values()];
  if (!unique.length) throw new Error('No receipt IDs were provided.');

  const auth = await resolveZeroOsGateAuth({ zeroOsBase, env });
  const token = cleanBearer(auth.token);
  if (!token) throw new Error('No shared owner credential could mint a 0S bearer.');
  const headers = {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    origin: zeroOsBase
  };

  const downloads = [];
  for (const item of unique) {
    const { response, json } = await postJson(`${baseUrl}/api/admin-vault-download`, {
      receiptId: item.receiptId,
      expiresInSeconds
    }, headers);
    downloads.push({
      label: item.label,
      receiptId: item.receiptId,
      requestedFileName: item.fileName,
      ok: response.ok && json.ok !== false,
      status: response.status,
      fileName: json.item?.fileName || item.fileName || '',
      fileSize: json.item?.fileSize || null,
      downloadUrl: json.downloadUrl || '',
      expiresAt: json.expiresAt || '',
      error: response.ok ? '' : (json.error || json.raw || `HTTP ${response.status}`)
    });
  }

  const result = {
    schema: 'skyevault.receipt-download-links.v1',
    createdAt: new Date().toISOString(),
    baseUrl,
    zeroOsBase,
    authSource: auth.source,
    authModel: {
      login: 'shared 0S/FS27/SkyGate/Free99 gate bearer',
      downloadUrl: 'short-lived signed SkyeVault object URL minted after gate auth',
      unlocker: 'SkyeSecure decrypts .skyesecrets control packs; passphrase/pepper are encryption material, not app login',
      legacyFallback: 'legacy admin/operator tokens are emergency fallback only'
    },
    handoff: args.handoff || '',
    expiresInSeconds,
    downloads,
    unlocker: `${zeroOsBase}/skye-secure-secret-packs/app.html`,
    vaultDrive: `${baseUrl}/#client-vault`
  };

  if (args.out) {
    result.outputReceipt = args.out;
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  }
  if (args.htmlOut) {
    writeHtmlDownloadOpener(args.htmlOut, result);
    result.htmlOut = args.htmlOut;
  }
  if (args.quiet) {
    console.log(JSON.stringify({
      ok: result.downloads.every((item) => item.ok),
      createdAt: result.createdAt,
      authSource: result.authSource,
      expiresInSeconds: result.expiresInSeconds,
      htmlOut: args.htmlOut || '',
      outputReceipt: args.out || '',
      downloads: result.downloads.map((item) => ({
        label: item.label,
        receiptId: item.receiptId,
        ok: item.ok,
        status: item.status,
        fileName: item.fileName,
        fileSize: item.fileSize,
        expiresAt: item.expiresAt,
        hasDownloadUrl: Boolean(item.downloadUrl)
      }))
    }, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
