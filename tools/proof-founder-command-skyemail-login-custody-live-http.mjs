#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const baseUrl = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'founder-command-skyemail-login-custody');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const latestPath = path.join(artifactRoot, 'founder-command-skyemail-login-custody-live-http-latest.json');

function gateHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

async function fetchJson(route, init = {}) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${route}`, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 1000) };
  }
  return {
    route,
    status: response.status,
    ok: response.ok && body?.ok !== false,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    body
  };
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function cleanEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function loginComplete(mailbox = {}) {
  const login = mailbox.login || {};
  return Boolean(
    login.auth_mode
    && login.owner_login_url
    && login.skyemail_session_handoff
    && login.mailbox_dashboard_url
    && /shared FS27|SkyeGate|Free99/i.test(login.auth_mode)
    && /session-handoff\.html/i.test(login.skyemail_session_handoff)
    && /session-handoff\.html/i.test(login.mailbox_dashboard_url)
    && /mailbox=/i.test(login.skyemail_session_handoff + login.mailbox_dashboard_url)
    && /passwords? are .*not|no app-local mailbox passwords|never returns provider passwords/i.test(login.credential_policy || '')
  );
}

function findForbiddenSecretKeys(value, prefix = '') {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...findForbiddenSecretKeys(item, `${prefix}[${index}]`)));
    return hits;
  }
  if (!value || typeof value !== 'object') return hits;
  for (const [key, child] of Object.entries(value)) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    if (
      /(?:^|_)(?:password|password_once|token|bearer|cookie|private_key|client_secret|refresh_token|access_token|secret)(?:$|_)/i.test(key)
      && !/credential_policy|auth_mode|auth_boundary/i.test(key)
      && !/(?:configured|present|ready|status)$/i.test(key)
    ) {
      hits.push(pathName);
    }
    hits.push(...findForbiddenSecretKeys(child, pathName));
  }
  return hits;
}

function findFounderMailboxes(mailboxes = []) {
  return mailboxes.filter((mailbox) => {
    const mailboxEmail = cleanEmail(mailbox.mailbox_email);
    const ownerEmail = cleanEmail(mailbox.owner_email);
    const ownerHandle = String(mailbox.owner_handle || '').toLowerCase();
    return ownerEmail === 'grayskyes@solenterprises.org'
      || ownerHandle === 'grayskyes'
      || ['metraiyux-0s@solenterprises.org', 'skyeroutex-logistics@solenterprises.org'].includes(mailboxEmail);
  });
}

function mailboxStatusCounts(mailboxes = []) {
  return mailboxes.reduce((acc, mailbox) => {
    const status = String(mailbox.status || 'unknown').toLowerCase() || 'unknown';
    const provider = String(mailbox.provider || 'unknown').toLowerCase() || 'unknown';
    acc.by_status[status] = (acc.by_status[status] || 0) + 1;
    acc.by_provider[provider] = (acc.by_provider[provider] || 0) + 1;
    if (!['released', 'offboarded', 'disabled'].includes(status)) acc.active_or_retained += 1;
    if (status === 'active') acc.active += 1;
    if (provider === 'zoho') acc.zoho += 1;
    return acc;
  }, { total: mailboxes.length, active: 0, active_or_retained: 0, zoho: 0, by_status: {}, by_provider: {} });
}

function mailboxInventoryClass(mailbox = {}) {
  const provider = String(mailbox.provider || 'unknown').toLowerCase();
  const status = String(mailbox.status || 'unknown').toLowerCase();
  const provisioning = String(mailbox.provisioning_status || 'unknown').toLowerCase();
  if (provider === 'zoho' && status === 'active' && provisioning === 'provisioned') {
    return {
      inventory_class: 'production_sellable',
      sellable_production: true,
      customer_facing_state: 'SkyeMail production mailbox',
      needs_action: ''
    };
  }
  if (provider === 'skymail-local-route') {
    return {
      inventory_class: 'internal_local_route_not_sellable',
      sellable_production: false,
      customer_facing_state: 'internal SkyeMail route only',
      needs_action: 'Do not sell as a production mailbox until a real SkyeMail production mailbox is provisioned.'
    };
  }
  if (provider === 'resend' && provisioning === 'resend-proof-demo') {
    return {
      inventory_class: 'proof_demo_not_sellable',
      sellable_production: false,
      customer_facing_state: 'proof/demo route',
      needs_action: 'Keep for proof history or archive; do not count as production mailbox inventory.'
    };
  }
  if (provider === 'zoho' && ['failed', 'error'].includes(status)) {
    return {
      inventory_class: 'routing_failed_not_sellable',
      sellable_production: false,
      customer_facing_state: 'SkyeMail routing failed',
      needs_action: 'Retry provisioning, repair routing state, or quarantine before customer use.'
    };
  }
  if (provider === 'stalwart' && (status === 'pending' || provisioning === 'missing-provider-env')) {
    return {
      inventory_class: 'pending_mail_server_not_sellable',
      sellable_production: false,
      customer_facing_state: 'pending mail server configuration',
      needs_action: 'Complete mail server environment setup before customer use.'
    };
  }
  return {
    inventory_class: 'unclassified_not_sellable',
    sellable_production: false,
    customer_facing_state: 'unclassified mailbox row',
    needs_action: 'Review routing/status/provisioning fields before customer use.'
  };
}

function mailboxInventoryClassCounts(mailboxes = []) {
  return mailboxes.reduce((acc, mailbox) => {
    const classification = mailboxInventoryClass(mailbox);
    acc[classification.inventory_class] = (acc[classification.inventory_class] || 0) + 1;
    if (classification.sellable_production) acc.production_sellable_total += 1;
    if (!classification.sellable_production) acc.not_sellable_total += 1;
    return acc;
  }, { production_sellable_total: 0, not_sellable_total: 0 });
}

function safeLoginRoster(mailboxes = []) {
  return mailboxes.map((mailbox) => {
    const login = mailbox.login || {};
    const classification = mailboxInventoryClass(mailbox);
    return {
      mailbox_email: mailbox.mailbox_email,
      owner_email: mailbox.owner_email,
      owner_handle: mailbox.owner_handle,
      workspace_id: mailbox.workspace_id,
      provider: mailbox.provider,
      status: mailbox.status,
      provisioning_status: mailbox.provisioning_status,
      inventory_class: classification.inventory_class,
      sellable_production: classification.sellable_production,
      customer_facing_state: classification.customer_facing_state,
      needs_action: classification.needs_action,
      login_complete: loginComplete(mailbox),
      auth_mode: login.auth_mode || '',
      owner_login_url: login.owner_login_url || '',
      skyemail_session_handoff: login.skyemail_session_handoff || '',
      mailbox_dashboard_url: login.mailbox_dashboard_url || '',
      credential_policy: login.credential_policy || ''
    };
  });
}

async function writeReceipt(receipt) {
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

async function main() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = auth.token || '';
  const receipt = {
    ok: false,
    schema: 'metraiyux.founder-command.skyemail-login-custody-live-http.v1',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    credential_source: auth.credential?.key || auth.credential?.source || 'missing',
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    login: {
      ok: Boolean(token),
      token_received: Boolean(token),
      status: auth.response?.status || 0,
      elapsed_ms: Number(Number(auth.response?.elapsedMs || 0).toFixed(2))
    },
    checks: [],
    failures: []
  };

  if (!token) {
    receipt.failures.push('No shared SkyeGate FS27/Free99 bearer was available for Founder Command custody proof.');
    await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: rel(latestPath), failures: receipt.failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  const headers = gateHeaders(token);
  const skyemail = await fetchJson('/api/founder-command/skyemail?include_inventory=1', { headers });
  const backfill = await fetchJson('/api/founder-command/skyemail/mailboxes/backfill', {
    method: 'POST',
    headers: gateHeaders(token, { 'content-type': 'application/json' }),
    body: JSON.stringify({ confirm: true, limit: 500 })
  });
  const accounts = await fetchJson('/api/founder-command/accounts?limit=1000', { headers });
  const workSystem = await fetchJson('/api/founder-command/work-system', { headers });

  const inventory = skyemail.body?.inventory || {};
  const mailboxes = Array.isArray(inventory.mailboxes) ? inventory.mailboxes : [];
  const missingLogin = mailboxes.filter((mailbox) => !loginComplete(mailbox)).map((mailbox) => mailbox.mailbox_email);
  const founderMailboxes = findFounderMailboxes(mailboxes);
  const founderMissingLogin = founderMailboxes.filter((mailbox) => !loginComplete(mailbox)).map((mailbox) => mailbox.mailbox_email);
  const statusCounts = mailboxStatusCounts(mailboxes);
  const inventoryClassCounts = mailboxInventoryClassCounts(mailboxes);
  const loginRoster = safeLoginRoster(mailboxes);
  const sellableRoster = loginRoster.filter((mailbox) => mailbox.sellable_production);
  const nonSellableRoster = loginRoster.filter((mailbox) => !mailbox.sellable_production);
  const forbiddenSecretKeys = findForbiddenSecretKeys({
    skyemail: skyemail.body,
    backfill: backfill.body,
    accounts: {
      skyemail_custody: accounts.body?.skyemail_custody,
      account_samples: Array.isArray(accounts.body?.accounts) ? accounts.body.accounts.slice(0, 20) : []
    },
    work_system: workSystem.body?.communications?.skyemail || {}
  });
  const custody = {
    inventory_count: Number(inventory.count || mailboxes.length || 0),
    inventory_total: Number(inventory.counts?.total || mailboxes.length || 0),
    provider_missing: Number(accounts.body?.skyemail_custody?.provider_missing ?? backfill.body?.custody?.provider_missing ?? -1),
    provider_represented: Number(accounts.body?.skyemail_custody?.provider_represented ?? backfill.body?.custody?.provider_represented ?? 0),
    work_system_missing: Number(workSystem.body?.communications?.skyemail?.custody?.provider_missing ?? workSystem.body?.metrics?.skyemail_provider_missing ?? -1),
    work_system_represented: Number(workSystem.body?.metrics?.skyemail_provider_represented || 0),
    status_counts: statusCounts,
    inventory_class_counts: inventoryClassCounts,
    sellable_mailbox_count: sellableRoster.length,
    non_sellable_mailbox_count: nonSellableRoster.length,
    sellable_mailboxes: sellableRoster.map((mailbox) => ({
      mailbox_email: mailbox.mailbox_email,
      owner_email: mailbox.owner_email,
      owner_handle: mailbox.owner_handle,
      workspace_id: mailbox.workspace_id,
      provider: mailbox.provider,
      status: mailbox.status,
      provisioning_status: mailbox.provisioning_status,
      customer_facing_state: mailbox.customer_facing_state
    })),
    non_sellable_inventory: nonSellableRoster.map((mailbox) => ({
      mailbox_email: mailbox.mailbox_email,
      owner_email: mailbox.owner_email,
      owner_handle: mailbox.owner_handle,
      workspace_id: mailbox.workspace_id,
      provider: mailbox.provider,
      status: mailbox.status,
      provisioning_status: mailbox.provisioning_status,
      inventory_class: mailbox.inventory_class,
      needs_action: mailbox.needs_action
    })),
    safe_login_roster: loginRoster,
    founder_mailboxes: founderMailboxes.map((mailbox) => ({
      mailbox_email: mailbox.mailbox_email,
      owner_email: mailbox.owner_email,
      owner_handle: mailbox.owner_handle,
      status: mailbox.status,
      provider: mailbox.provider,
      login_complete: loginComplete(mailbox)
    }))
  };

  receipt.checks = [
    { label: 'Founder Command SkyEmail inventory route returns live inventory', ok: skyemail.ok && mailboxes.length > 0, status: skyemail.status, elapsed_ms: skyemail.elapsed_ms },
    { label: 'SkyEmail mailbox custody backfill is idempotent and complete', ok: backfill.ok && Number(backfill.body?.custody?.provider_missing || 0) === 0, status: backfill.status, elapsed_ms: backfill.elapsed_ms },
    { label: 'Founder Command accounts represent every provider mailbox', ok: accounts.ok && custody.provider_missing === 0 && custody.provider_represented >= custody.inventory_count, status: accounts.status, elapsed_ms: accounts.elapsed_ms },
    { label: 'Founder Command work-system represents every provider mailbox', ok: workSystem.ok && custody.work_system_missing === 0, status: workSystem.status, elapsed_ms: workSystem.elapsed_ms },
    { label: 'Founder Command safe login roster covers every mailbox row', ok: loginRoster.length === mailboxes.length && loginRoster.every((mailbox) => mailbox.mailbox_email && mailbox.login_complete), roster_count: loginRoster.length, inventory_count: mailboxes.length },
    { label: 'Founder Command separates sellable SkyeMail production mailboxes from proof, local, failed, and pending rows', ok: inventoryClassCounts.production_sellable_total > 0 && loginRoster.every((mailbox) => mailbox.inventory_class), sellable_mailboxes: sellableRoster.length, non_sellable_mailboxes: nonSellableRoster.length, inventory_class_counts: inventoryClassCounts },
    { label: 'Founder Command live inventory is sellable-only after internal-route cleanup', ok: custody.inventory_count === custody.sellable_mailbox_count && custody.non_sellable_mailbox_count === 0, inventory_count: custody.inventory_count, sellable_mailbox_count: custody.sellable_mailbox_count, non_sellable_mailbox_count: custody.non_sellable_mailbox_count, status_counts: statusCounts.by_status },
    { label: 'Every mailbox has shared-gate login handoff metadata', ok: missingLogin.length === 0, missing: missingLogin.slice(0, 25) },
    { label: 'Founder-owned mailboxes are present and have login handoff metadata', ok: founderMailboxes.length > 0 && founderMissingLogin.length === 0, founder_mailboxes: custody.founder_mailboxes, missing: founderMissingLogin },
    { label: 'Founder Command response does not expose raw mailbox/provider secret fields', ok: forbiddenSecretKeys.length === 0, forbidden_secret_keys: forbiddenSecretKeys.slice(0, 25) }
  ];
  receipt.custody = custody;
  receipt.credential_policy = inventory.credential_policy || skyemail.body?.credential_policy || backfill.body?.credential_policy || '';
  receipt.safe_login_interpretation = 'Founder Command must expose shared SkyeGate FS27/Free99 login and SkyeMail session-handoff metadata for each mailbox. It must not expose raw routing passwords, bearer tokens, cookies, private keys, or app-local admin credentials.';
  receipt.sellable_inventory_interpretation = 'Only real SkyeMail production rows with status=active and provisioning_status=provisioned are counted as customer-sellable production mailboxes. Local-route rows, proof-demo rows, failed/provider-error rows, and pending/missing-provider-env rows are quarantined or disabled and never count as sellable customer inventory.';
  receipt.failures = receipt.checks.filter((check) => !check.ok).map((check) => check.label);
  receipt.ok = receipt.failures.length === 0;
  await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    inventory_count: custody.inventory_count,
    sellable_mailbox_count: custody.sellable_mailbox_count,
    non_sellable_mailbox_count: custody.non_sellable_mailbox_count,
    inventory_class_counts: custody.inventory_class_counts,
    provider_missing: custody.provider_missing,
    work_system_missing: custody.work_system_missing,
    founder_mailboxes: custody.founder_mailboxes,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    schema: 'metraiyux.founder-command.skyemail-login-custody-live-http.v1',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    error: error?.stack || error?.message || String(error)
  };
  await writeReceipt(receipt);
  console.error(JSON.stringify({ ok: false, receipt: rel(latestPath), error: error?.message || String(error) }, null, 2));
  process.exitCode = 1;
});
