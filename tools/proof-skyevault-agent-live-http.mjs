#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyevault-agent-live-http');
const latestPath = path.join(artifactDir, 'latest.json');
const fs27 = process.env.FS27_LIVE_BASE || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
const zeroOs = process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const drop = process.env.SKYEVAULT_DROP_LIVE_BASE || 'https://skyevault-drop.graylondonskyes.workers.dev';
const offer = process.env.SKYEVAULT_AGENT_PROOF_OFFER || 'skyevault-pro-access';

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function publicSession(value = '') {
  const clean = String(value || '');
  return clean ? `${clean.slice(0, 10)}...${clean.slice(-4)}` : '';
}

async function textFetch(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') || '',
    text
  };
}

async function jsonFetch(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 500) }; }
  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') || '',
    body,
    text
  };
}

async function bytesFetch(url, init = {}) {
  const response = await fetch(url, init);
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') || '',
    bytes,
    headers: Object.fromEntries(response.headers.entries())
  };
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function ownerHeaders(token) {
  return {
    accept: 'application/octet-stream, application/json',
    authorization: `Bearer ${token}`,
    'x-skye-gate-session': token,
    'x-free99-gate-session': token
  };
}

async function createCheckout() {
  const stamp = Date.now();
  return await jsonFetch(`${fs27}/skyepay/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_slug: 'metraiyux-0s',
      offer_id: offer,
      customer_email: `skyevault-agent-proof+${stamp}@example.com`,
      customer_name: 'Reape0r Live Proof',
      company_name: 'Reape0r Proof Co',
      idempotency_key: `skyevault-agent-live-proof-${stamp}`,
      legal_acceptance: {
        legal_terms_accepted: true,
        arbitration_accepted: true,
        payments_policy_accepted: true,
        no_outcome_guarantee_accepted: true,
        truthful_review_boundary_acknowledged: true,
        privacy_policy_accepted: true,
        accepted_at: new Date().toISOString(),
        acceptance_surface: 'skyevault-agent-live-http-proof'
      }
    })
  });
}

const receipt = {
  ok: false,
  schema: 'skyevault.agent-live-http-proof.v1',
  generatedAt: new Date().toISOString(),
  surfaces: {
    publicAgentPage: `${fs27}/skyevault-agent.html`,
    publicAgentAlias: `${fs27}/skyevault-agent`,
    skyepayStore: `${fs27}/skyepay-store?client=metraiyux-0s&offer=${offer}`,
    stripeWebhook: `${fs27}/.netlify/functions/stripe-webhook`,
    installCenter: `${zeroOs}/skye-vault-os/agent/`,
    agentPackage: `${zeroOs}/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz`,
    drop: `${drop}/#client-vault`
  },
  checks: [],
  blockers: []
};

function check(name, ok, details = {}) {
  const row = { name, ok: Boolean(ok), ...details };
  receipt.checks.push(row);
  if (!row.ok) receipt.blockers.push(row);
  return row;
}

const publicAgentPage = await textFetch(receipt.surfaces.publicAgentPage, { headers: { accept: 'text/html' } });
check('Public Reape0r page is live buyer HTML', publicAgentPage.status === 200
  && publicAgentPage.contentType.includes('text/html')
  && publicAgentPage.text.includes('Reape0r')
  && publicAgentPage.text.includes('agentCheckoutForm')
  && publicAgentPage.text.includes('/skyepay/checkout'), {
  status: publicAgentPage.status,
  contentType: publicAgentPage.contentType
});

const publicAlias = await textFetch(receipt.surfaces.publicAgentAlias, { headers: { accept: 'text/html' } });
check('Public Reape0r alias resolves to the buyer page', publicAlias.status === 200
  && publicAlias.contentType.includes('text/html')
  && publicAlias.text.includes('Reape0r')
  && publicAlias.text.includes('Starter, Pro, Command, and Auto-Install')
  && publicAlias.text.includes('agentCheckoutForm')
  && publicAlias.text.includes('/skyepay/checkout'), {
  status: publicAlias.status,
  contentType: publicAlias.contentType
});

const store = await textFetch(receipt.surfaces.skyepayStore, { headers: { accept: 'text/html' } });
check('SkyePay store route is live HTML', store.status === 200 && store.contentType.includes('text/html'), {
  status: store.status,
  contentType: store.contentType
});

const webhook = await jsonFetch(receipt.surfaces.stripeWebhook, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ type: 'checkout.session.completed' })
});
check('SkyePay payment-provider webhook route is mounted on FS27 Worker', webhook.status === 400 && webhook.body?.error === 'Missing stripe-signature', {
  status: webhook.status,
  error: webhook.body?.error || null
});

const checkout = await createCheckout();
const sessionId = String(checkout.body?.id || '');
const deliveryUrl = String(checkout.body?.delivery_success_url || checkout.body?.url || '');
check('Live SkyePay checkout session is created for SkyeVault offer', checkout.status === 200 && checkout.body?.ok === true && sessionId.startsWith('cs_'), {
  status: checkout.status,
  session: publicSession(sessionId),
  checkoutHost: checkout.body?.url ? new URL(checkout.body.url).host : '',
  deliveryPath: deliveryUrl ? new URL(deliveryUrl).pathname : '',
  paymentStatus: checkout.body?.payment_status || null,
  activationPath: checkout.body?.activation_path || null
});

let status = { status: 0, body: {} };
if (sessionId) {
  status = await jsonFetch(`${fs27}/skyepay/status?session_id=${encodeURIComponent(sessionId)}&offer=${encodeURIComponent(offer)}`, {
    headers: { accept: 'application/json' }
  });
}
check('SkyePay status reports the pending paid-workspace state', status.status === 200 && status.body?.order?.offer_id === offer, {
  status: status.status,
  paymentStatus: status.body?.order?.payment_status || null,
  provisioningStatus: status.body?.order?.provisioning_status || null,
  agentDelivery: Boolean(status.body?.order?.agent_delivery),
  repoEnvReturnedBeforePayment: Boolean(status.body?.order?.agent_delivery?.repo_env)
});
check('Pending SkyePay session does not expose workspace portal key before payment', !status.body?.order?.agent_delivery?.repo_env?.SKYEVAULT_PORTAL_KEY, {
  portalKeyReturned: Boolean(status.body?.order?.agent_delivery?.repo_env?.SKYEVAULT_PORTAL_KEY)
});

const installUrl = `${zeroOs}/skye-vault-os/agent/?session_id=${encodeURIComponent(sessionId)}&offer=${encodeURIComponent(offer)}`;
const install = sessionId ? await textFetch(installUrl, { headers: { accept: 'text/html' } }) : { status: 0, text: '', contentType: '' };
check('Reape0r install page opens from the live SkyePay return session', install.status === 200 && install.text.includes('Reape0r: the Autonomous Cloud Repo Mirror'), {
  status: install.status,
  contentType: install.contentType,
  hasPendingCopy: install.text.includes('Download unlocks after provisioning')
});

const packageUrl = `${receipt.surfaces.agentPackage}?session_id=${encodeURIComponent(sessionId)}&offer=${encodeURIComponent(offer)}`;
const pkg = sessionId ? await textFetch(packageUrl, { headers: { accept: 'application/json' } }) : { status: 0, text: '', contentType: '' };
check('Agent package stays locked until payment and workspace provisioning complete', pkg.status === 402 && pkg.text.includes('skyevault_agent_entitlement_not_unlocked'), {
  status: pkg.status,
  contentType: pkg.contentType
});

let ownerAuth = { ok: false, token: '', credential: { key: '', source: '' }, response: {} };
try {
  ownerAuth = await resolveZeroOsGateAuth({ zeroOsBase: zeroOs });
} catch (error) {
  ownerAuth = { ok: false, token: '', credential: { key: '', source: '' }, response: { error: error?.message || String(error) } };
}
check('Shared 0S/FS27 owner gate credential is available for package download proof', ownerAuth.ok && Boolean(ownerAuth.token), {
  credentialKey: ownerAuth.credential?.key || '',
  credentialSource: ownerAuth.credential?.source || '',
  status: ownerAuth.response?.status || 0
});

let ownerManifest = { status: 0, body: {} };
let ownerPackage = { status: 0, bytes: Buffer.alloc(0), contentType: '' };
if (ownerAuth.ok && ownerAuth.token) {
  ownerManifest = await jsonFetch(`${zeroOs}/downloads/skyevault-agent/latest.json`, {
    headers: ownerHeaders(ownerAuth.token)
  });
  ownerPackage = await bytesFetch(receipt.surfaces.agentPackage, {
    headers: ownerHeaders(ownerAuth.token)
  });
}
const livePackageSha = ownerPackage.bytes.length ? sha256(ownerPackage.bytes) : '';
const manifestSha = ownerManifest.body?.release?.latestSha256 || ownerManifest.body?.release?.sha256 || '';
check('Owner/shared-gate download returns the live Reape0r tarball', ownerPackage.status === 200
  && ownerPackage.bytes.length > 0
  && livePackageSha
  && manifestSha
  && livePackageSha === manifestSha, {
  manifestStatus: ownerManifest.status,
  packageStatus: ownerPackage.status,
  bytes: ownerPackage.bytes.length,
  sha256: livePackageSha,
  manifestSha
});

const dropHome = await textFetch(drop, { headers: { accept: 'text/html' } });
check('SkyeVault Drop public surface is live', dropHome.status === 200, {
  status: dropHome.status,
  contentType: dropHome.contentType
});

receipt.ok = receipt.blockers.length === 0;
receipt.summary = {
  checks: receipt.checks.length,
  blockers: receipt.blockers.length
};

const stamped = path.join(artifactDir, `${receipt.generatedAt.replace(/[:.]/g, '-')}.json`);
writeJson(stamped, receipt);
writeJson(latestPath, { ...receipt, receiptPath: path.relative(repoRoot, stamped).split(path.sep).join('/') });
console.log(JSON.stringify({ ...receipt, receiptPath: path.relative(repoRoot, stamped).split(path.sep).join('/') }, null, 2));
if (!receipt.ok) process.exit(1);
