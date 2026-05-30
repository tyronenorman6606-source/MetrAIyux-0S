#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const bobBase = String(process.env.BOBS_APP_BASE || 'https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop').replace(/\/+$/, '');
const marketingBase = String(process.env.METRAIYUX_MARKETING_BASE || 'https://metraiyux-0s-marketing.pages.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'bobs-free-stack-closure');
const latestPath = path.join(artifactRoot, 'bobs-free-stack-closure-latest.json');
const credentialKeys = [
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

const ownerRecipients = [
  'grayskyes@solenterprises.org',
  'SkyesOverLondonLC@solenterprises.org',
  'skyesoverlondon222@gmail.com'
];

const bob = {
  accountId: 'founder-client:bobs-smoke-shop',
  clientId: 'bobs-smoke-shop',
  displayName: "Bob's Smoke Shop",
  workspaceId: 'ws_bobs_smoke_shop',
  workspaceSlug: 'bobs-smoke-shop',
  valleyBusinessId: 'bobs-smoke-shop-litchfield-park',
  skyemail: 'bobs-smokeshop@skyemail.solenterprises.org',
  relayInboxId: 'bobs-smoke-shop',
  connectlogCardId: 'bobs-smoke-shop-client-workspace',
  aeContactId: 'ae_contact_bobs_smoke_shop',
  ownerEmail: 'bobsmokeshopaz@gmail.com',
  phone: '(623) 935-0786',
  publicContactEmail: 'MediaOverLondon@solenterprises.org',
  publicContactPhone: '1-(800)-484-4783'
};

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

async function readEnvFile(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    const values = {};
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) values[match[1]] = unquote(match[2]);
    }
    return values;
  } catch {
    return {};
  }
}

async function liveCredential() {
  const files = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of files) Object.assign(merged, await readEnvFile(path.resolve(file)));
  for (const key of credentialKeys) {
    if (merged[key]) return { key, value: merged[key] };
  }
  return { key: '', value: '' };
}

async function fetchAny(url, init = {}) {
  const started = performance.now();
  const timeoutMs = Number(process.env.BOBS_FREE_STACK_FETCH_TIMEOUT_MS || init.timeoutMs || 30000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  const requestInit = { redirect: 'manual', ...init };
  delete requestInit.timeoutMs;
  let response;
  try {
    response = await fetch(url, { ...requestInit, signal: controller.signal });
  } catch (error) {
    const elapsedMs = Number((performance.now() - started).toFixed(2));
    return {
      status: 0,
      ok: false,
      elapsedMs,
      contentType: '',
      location: '',
      bytes: 0,
      text: '',
      body: null,
      error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
  const elapsedMs = Number((performance.now() - started).toFixed(2));
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');
  let body = null;
  if (contentType.includes('json') || text.trim().startsWith('{')) {
    try {
      body = JSON.parse(text);
    } catch {}
  }
  return {
    status: response.status,
    ok: response.ok,
    elapsedMs,
    contentType,
    location: response.headers.get('location') || '',
    bytes: Number(response.headers.get('content-length') || text.length || 0) || 0,
    text: text.slice(0, 50000),
    body
  };
}

async function retryFetchAny(url, init = {}, attempts = 5) {
  let last = null;
  for (let index = 0; index < attempts; index += 1) {
    last = await fetchAny(url, init);
    if (last.ok || [301, 302, 303, 307, 308, 401, 403].includes(last.status)) return last;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return last;
}

function responseOkJson(result) {
  return Boolean(result?.ok && result.body && result.body.ok !== false);
}

async function fetchJson(url, init = {}) {
  const result = await fetchAny(url, {
    ...init,
    headers: { accept: 'application/json', ...(init.headers || {}) }
  });
  return { ...result, okJson: responseOkJson(result) };
}

function authHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

function textHasAll(text = '', markers = []) {
  return markers.every((marker) => String(text).includes(marker));
}

function textHasNone(text = '', markers = []) {
  return markers.every((marker) => !String(text).includes(marker));
}

function check(label, ok, details = {}) {
  return { label, ok: Boolean(ok), ...details };
}

function emailIncludes(list = [], email = '') {
  const target = String(email || '').trim().toLowerCase();
  return Array.isArray(list) && list.some((item) => String(item || '').trim().toLowerCase() === target);
}

function gitValleyDirtySummary() {
  const result = spawnSync('git', ['status', '--short', '--', 'metraiyux_0s_site/valley-verified', 'metraiyux_0s_site/_platform-sources/valley-verified'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  const lines = String(result.stdout || '').split(/\r?\n/).filter(Boolean);
  return {
    dirty: lines.length > 0,
    count: lines.length,
    sample: lines.slice(0, 40)
  };
}

function readLocal(file) {
  const absolute = path.join(repoRoot, file);
  return fssync.existsSync(absolute) ? fssync.readFileSync(absolute, 'utf8') : '';
}

async function writeReceipt(receipt) {
  const stamp = receipt.generatedAt.replace(/[:.]/g, '-');
  const stamped = path.join(artifactRoot, stamp, 'receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify({ ...receipt, stampedReceipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  return { stamped, latest: latestPath };
}

function summarizeApi(result, extra = {}) {
  return {
    status: result.status,
    ok: Boolean(result.okJson || (result.ok && result.body?.ok !== false)),
    elapsedMs: result.elapsedMs,
    error: result.body?.error || '',
    route: result.body?.route || '',
    ...extra
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const runId = `bobs-free-stack-${Date.now().toString(36)}`;
  const receipt = {
    ok: false,
    generatedAt,
    runId,
    lane: 'bobs-free-stack-closure',
    zeroOsBase,
    bobBase,
    marketingBase,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: '',
    localChecks: [],
    publicChecks: [],
    authChecks: [],
    writes: [],
    links: {
      bobApp: `${bobBase}/`,
      bobWorkspace: `${bobBase}/workspace-preview/`,
      pilotReview: `${marketingBase}/bobs-smoke-shop-free-pilot`,
      pilotFlyer: `${marketingBase}/bobs-smoke-shop-free-pilot-flyer`,
      freeStackPitch: `${zeroOsBase}/sales/free-business-stack.html`,
      freeStackFlyer: `${zeroOsBase}/sales/free-business-stack-flyer.html`,
      zeroOsBrowser: `${zeroOsBase}/0s/index.html`,
      founderCommand: `${zeroOsBase}/founder-command/`
    },
    valleyDeployBoundary: gitValleyDirtySummary(),
    pendingMainWorkerDeploy: false,
    providerPending: [],
    warnings: [],
    failures: []
  };

  const localBobJson = readLocal('metraiyux_0s_site/founder-command/client-credentials/bobs-smoke-shop.json');
  const localFounderManifest = readLocal('metraiyux_0s_site/founder-command/manifest.webmanifest');
  const localFounderSw = readLocal('metraiyux_0s_site/founder-command/service-worker.js');
  const localWorker = readLocal('metraiyux_0s_site/cloudflare/worker.js');
  const localBobApp = readLocal('Skye-Clients/bobs-smoke-shop-mcp-redo/index.html');
  const localBobWorkspace = readLocal('Skye-Clients/bobs-smoke-shop-mcp-redo/workspace-preview/index.html');
  const localBobSw = readLocal('Skye-Clients/bobs-smoke-shop-mcp-redo/service-worker.js');
  const localSalesRegistry = readLocal('metraiyux_0s_site/sales/platform-surface-pricing-registry.json');

  receipt.localChecks.push(
    check('Bob founder handoff JSON parses and has public Media Over London contact', (() => {
      try {
        const data = JSON.parse(localBobJson);
        return data.public_contact?.email === bob.publicContactEmail && ownerRecipients.every((email) => emailIncludes(data.workspace_confirmation_recipients, email));
      } catch {
        return false;
      }
    })()),
    check('Founder Command manifest is a PWA with Bob Internal Handoff shortcut', (() => {
      try {
        const data = JSON.parse(localFounderManifest);
        return data.start_url === '/founder-command/' && JSON.stringify(data.shortcuts || []).includes('Bob Internal Handoff');
      } catch {
        return false;
      }
    })()),
    check('Founder Command service worker caches Bob handoff JSON and cache v4', localFounderSw.includes("founder-command-pwa-v4") && localFounderSw.includes('/founder-command/client-credentials/bobs-smoke-shop.json')),
    check('Worker default marketing contact uses Media Over London', localWorker.includes("OWNER_MARKETING_CONTACT_EMAIL = 'MediaOverLondon@solenterprises.org'")),
    check('Worker workspace confirmation fanout includes both SkyEmails plus Gmail', ownerRecipients.every((email) => localWorker.includes(email))),
    check('Bob app has cinematic MP4 and mobile playsinline hero', localBobApp.includes('bobs-cinematic-logo-hero.mp4') && localBobApp.includes('webkit-playsinline') && localBobApp.includes('preload="auto"')),
    check('Bob app copy no longer uses old trial/tester language', textHasNone(`${localBobApp}\n${localBobWorkspace}`, ['Free 7-Day Trial', 'Free 7 Days', 'Free trial', 'tester seats', 'first six months', '6232607073', 'SkyesOverLondonLC@solenterprises.org'])),
    check('Bob app service worker cache bumped after copy/video work', localBobSw.includes("bobs-smoke-shop-pwa-v26")),
    check('Sales pricing registry parses', (() => {
      try {
        JSON.parse(localSalesRegistry);
        return true;
      } catch {
        return false;
      }
    })())
  );

  for (const item of receipt.localChecks) {
    if (!item.ok) receipt.failures.push(`Local check failed: ${item.label}`);
  }

  const publicTargets = [
    {
      label: 'Bob app live hero/copy',
      url: `${bobBase}/`,
      must: ['bobs-cinematic-logo-hero.mp4', 'Free Claim Stack', 'Open Workspace Page'],
      mustNot: ['Free 7-Day Trial', 'free tester workspace', 'Open Trial Page']
    },
    {
      label: 'Bob workspace live free claim copy/contact',
      url: `${bobBase}/workspace-preview/`,
      must: ['Free Claim', 'MediaOverLondon@solenterprises.org', '1-(800)-484-4783', 'starter seats'],
      mustNot: ['Free trial', 'Free 7 Days', 'SkyesOverLondonLC@solenterprises.org', '(623) 260-7073']
    },
    {
      label: 'Bob hero MP4 live asset',
      url: `${bobBase}/assets/videos/bobs-cinematic-logo-hero.mp4`,
      binary: true
    },
    {
      label: 'Bob SkyeNet service worker cache',
      url: `${bobBase}/service-worker.js`,
      must: ['bobs-smoke-shop-pwa-v26', 'bobs-cinematic-logo-hero.mp4']
    },
    {
      label: 'Bob flyer live has two QR targets and handle-change notification copy',
      url: `${marketingBase}/bobs-smoke-shop-free-pilot-flyer`,
      must: ['skyenet.graylondonskyes.workers.dev/bobs-smoke-shop', 'bobs-smokeshop@skyemail.solenterprises.org', 'Bob can change this handle', 'MediaOverLondon@solenterprises.org'],
      mustNot: ['bobs-smoke-shop.pages.dev']
    },
    {
      label: 'Bob pilot review live contains free workspace offer',
      url: `${marketingBase}/bobs-smoke-shop-free-pilot`,
      must: ['Bob', 'workspace', 'SkyEmail']
    }
  ];

  for (const target of publicTargets) {
    const result = await retryFetchAny(target.url, {}, 6);
    const ok = target.binary
      ? result.status === 200 && /(video\/mp4|application\/octet-stream)/i.test(result.contentType) && result.bytes > 1000000
      : result.status === 200 && textHasAll(result.text, target.must || []) && textHasNone(result.text, target.mustNot || []);
    const entry = check(target.label, ok, {
      url: target.url,
      status: result.status,
      contentType: result.contentType,
      bytes: result.bytes,
      elapsedMs: result.elapsedMs
    });
    receipt.publicChecks.push(entry);
    if (!entry.ok) receipt.failures.push(`Public check failed: ${target.label} (${target.url})`);
  }

  const credential = await liveCredential();
  receipt.credentialSource = credential.key || 'missing';
  if (!credential.value) {
    receipt.failures.push('No owner credential found in process env, .env, or env.txt.');
    const paths = await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), failures: receipt.failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  const login = await fetchJson(`${zeroOsBase}/api/founder-command/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  receipt.authChecks.push(check('Owner shared-gate login returns bearer', Boolean(login.okJson && token), {
    status: login.status,
    tokenReceived: Boolean(token),
    elapsedMs: login.elapsedMs
  }));
  if (!token) receipt.failures.push(login.body?.error || 'Owner shared-gate login did not return a bearer token.');

  if (token) {
    const headers = authHeaders(token);
    const htmlHeaders = {
      accept: 'text/html,application/json,*/*;q=0.8',
      authorization: `Bearer ${token}`,
      'x-admin-token': token,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token
    };

    const unauth0s = await fetchAny(`${zeroOsBase}/0s/index.html`);
    const auth0s = await fetchAny(`${zeroOsBase}/0s/index.html`, { headers: htmlHeaders, redirect: 'follow' });
    const liveFounderManifest = await fetchAny(`${zeroOsBase}/founder-command/manifest.webmanifest`, { headers: htmlHeaders, redirect: 'follow' });
    const liveFounderSw = await fetchAny(`${zeroOsBase}/founder-command/service-worker.js`, { headers: htmlHeaders, redirect: 'follow' });
    const freeStack = await fetchAny(`${zeroOsBase}/sales/free-business-stack.html`, { headers: htmlHeaders, redirect: 'follow' });
    const pricing = await fetchAny(`${zeroOsBase}/sales/pricing-offer-router.html`, { headers: htmlHeaders, redirect: 'follow' });

    receipt.authChecks.push(
      check('0S Browser unauthenticated route redirects to shared gate', [301, 302, 303, 307, 308, 401, 403].includes(unauth0s.status) && /admin\/login|unauthorized|required/i.test(`${unauth0s.location}\n${unauth0s.text}`), { status: unauth0s.status, location: unauth0s.location }),
      check('0S Browser authenticated route renders', auth0s.status === 200 && auth0s.text.includes('MetrAIyux 0S Browser'), { status: auth0s.status, elapsedMs: auth0s.elapsedMs }),
      check('Free stack pitch renders behind shared gate', freeStack.status === 200 && freeStack.text.includes('Free business stack') && freeStack.text.includes('ConnectLog + Relay13'), { status: freeStack.status }),
      check('Pricing router renders behind shared gate', pricing.status === 200 && pricing.text.includes('Pricing Offer Router') && pricing.text.includes('Free Claim Stack'), { status: pricing.status }),
      check('Founder Command live manifest is PWA-capable', liveFounderManifest.status === 200 && liveFounderManifest.text.includes('/founder-command/') && liveFounderManifest.text.includes('display_override'), { status: liveFounderManifest.status }),
      check('Founder Command live Bob shortcut is current', liveFounderManifest.status === 200 && liveFounderManifest.text.includes('Bob Internal Handoff'), { status: liveFounderManifest.status }),
      check('Founder Command live service worker cache is current', liveFounderSw.status === 200 && liveFounderSw.text.includes('founder-command-pwa-v4'), { status: liveFounderSw.status })
    );

    if (!receipt.authChecks.find((item) => item.label === 'Founder Command live Bob shortcut is current')?.ok || !receipt.authChecks.find((item) => item.label === 'Founder Command live service worker cache is current')?.ok) {
      receipt.pendingMainWorkerDeploy = true;
      receipt.providerPending.push('Founder Command static PWA assets are updated locally but not live because the main 0S Worker deploy is held until Valley Verified dirty assets are reconciled.');
    }

    const accountPayload = {
      client_account_id: bob.accountId,
      display_name: bob.displayName,
      client_id: bob.clientId,
      workspace_id: bob.workspaceId,
      valley_business_id: bob.valleyBusinessId,
      relay_inbox_id: bob.relayInboxId,
      skyemail: bob.skyemail,
      ae_contact_id: bob.aeContactId,
      status: 'free-claim-stack-live-closure',
      source_systems: ['founder-command', 'bob-free-stack-closure', 'relay13', 'skymail', 'ae-flowpro', 'citadeldb'],
      profile: {
        email: bob.ownerEmail,
        phone: bob.phone,
        public_contact_email: bob.publicContactEmail,
        public_contact_phone: bob.publicContactPhone,
        city: 'Litchfield Park',
        state: 'AZ',
        website: `${bobBase}/`
      },
      routes: {
        app: `${bobBase}/`,
        workspace_preview: `${bobBase}/workspace-preview/`,
        pilot_review: `${marketingBase}/bobs-smoke-shop-free-pilot`,
        pilot_flyer: `${marketingBase}/bobs-smoke-shop-free-pilot-flyer`,
        zero_os_browser: `${zeroOsBase}/0s/index.html`,
        free_stack_pitch: `${zeroOsBase}/sales/free-business-stack.html`
      }
    };
    const upsert = await fetchJson(`${zeroOsBase}/api/founder-command/accounts/upsert`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(accountPayload)
    });
    receipt.writes.push({ label: 'Founder account upsert', ...summarizeApi(upsert, { accountId: upsert.body?.account?.client_account_id || '' }) });

    const operations = [
      {
        id: 'bobs-free-claim-relay13-connectlog',
        lane: 'relay13-connectlog',
        source_app: 'founder-command',
        source_record_id: bob.connectlogCardId,
        status: 'live-room-ready-or-proof-created',
        priority: 'high',
        next_action: 'Keep Bob workspace tied to ConnectLog/Relay13 live room, owner review, proof exports, and team invite path.',
        links: [
          { label: 'Bob app', href: `${bobBase}/`, kind: 'client-app' },
          { label: 'Workspace preview', href: `${bobBase}/workspace-preview/`, kind: 'workspace-preview' }
        ]
      },
      {
        id: 'bobs-free-claim-skyemail',
        lane: 'skyemail',
        source_app: 'founder-command',
        source_record_id: bob.skyemail,
        status: 'reserved-changeable-handoff-written',
        priority: 'high',
        next_action: 'Reserve Bob SkyEmail handle, allow handle-change requests to persist, and send owner fanout notification when submitted.',
        links: [
          { label: 'SkyEmail handle request API', href: `${zeroOsBase}/api/valley-verified/skyemail-handle-request`, kind: 'api' }
        ]
      },
      {
        id: 'bobs-free-claim-ae-flowpro',
        lane: 'ae-flowpro',
        source_app: 'founder-command',
        source_record_id: bob.aeContactId,
        status: 'starter-crm-record-created',
        priority: 'normal',
        next_action: 'Use AE-FlowPro as Bob starter CRM lane for lead notes, next actions, and follow-up after shared-gate claim.',
        links: [
          { label: 'AE FlowPro', href: `${zeroOsBase}/Marketing-Made-Easy/AE-FlowPro/`, kind: 'app' }
        ]
      },
      {
        id: 'bobs-free-claim-citadeldb-biweekly',
        lane: 'citadeldb-backup',
        source_app: 'founder-command',
        source_record_id: 'bobs-biweekly-backup-posture',
        status: 'biweekly-posture-ready-after-claim',
        priority: 'normal',
        next_action: 'Keep Bob on free biweekly CitadelDB export/backup posture after claim; daily backups remain paid upgrade.',
        links: [
          { label: 'CitadelDB', href: `${zeroOsBase}/citadeldb/`, kind: 'app' }
        ]
      }
    ];
    for (const operation of operations) {
      const op = await fetchJson(`${zeroOsBase}/api/founder-command/accounts/${encodeURIComponent(bob.accountId)}/operations`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify(operation)
      });
      receipt.writes.push({ label: `Operation ${operation.id}`, ...summarizeApi(op, { operationId: op.body?.operation?.id || operation.id, citadelOk: Boolean(op.body?.citadel?.ok) }) });
    }

    const identityLinks = [
      ['valley-verified', 'businesses', bob.valleyBusinessId, 'valley-business'],
      ['relay13', 'workspaces', bob.workspaceId, 'relay13-workspace'],
      ['connectlog', 'cards', bob.connectlogCardId, 'connectlog-card'],
      ['skymail', 'mailboxes', bob.skyemail, 'mailbox'],
      ['ae-flowpro', 'contacts', bob.aeContactId, 'crm-contact'],
      ['citadeldb', 'client_accounts', bob.accountId, 'backup-account']
    ];
    for (const [system, table, sourceId, type] of identityLinks) {
      const link = await fetchJson(`${zeroOsBase}/api/founder-command/identity/link`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          client_account_id: bob.accountId,
          source_system: system,
          source_table: table,
          source_id: sourceId,
          source_email: system === 'skymail' ? bob.skyemail : bob.ownerEmail,
          link_type: type,
          metadata: { run_id: runId, client: bob.clientId }
        })
      });
      receipt.writes.push({ label: `Identity link ${system}`, ...summarizeApi(link, { linkId: link.body?.link?.id || '' }) });
    }

    const aeCapture = await fetchJson(`${zeroOsBase}/api/founder-command/ae-flow/capture`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'bobs-free-stack-closure',
        source_id: runId,
        name: "Bob's Smoke Shop",
        company: "Bob's Smoke Shop",
        email: bob.ownerEmail,
        phone: bob.phone,
        website: `${bobBase}/`,
        city: 'Litchfield Park',
        state: 'AZ',
        route: 'bobs-free-claim-stack',
        notes: 'Closure proof for Bob free claim stack: landing app, Relay13/ConnectLog room, SkyEmail handle, AE FlowPro starter CRM, and CitadelDB biweekly posture.'
      })
    });
    receipt.writes.push({ label: 'AE FlowPro capture', ...summarizeApi(aeCapture, { contactId: aeCapture.body?.captured?.contact_id || '' }) });

    const skyemailHandoff = await fetchJson(`${zeroOsBase}/api/founder-command/skyemail/handoffs`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        company_name: bob.displayName,
        workspace_handle: bob.workspaceSlug,
        workspace_slug: bob.workspaceSlug,
        workspace_id: bob.workspaceId,
        customer_id: 'cust_bobs_smoke_shop',
        owner_email: bob.ownerEmail,
        local_part: 'bobs-smokeshop',
        domain: 'skyemail.solenterprises.org',
        mailbox_email: bob.skyemail,
        plan_id: 'free-claim-stack',
        send_email: false,
        public_contact_email: bob.publicContactEmail,
        workspace_confirmation_recipients: ownerRecipients,
        welcome_title: "Bob's Smoke Shop SkyeMail workspace handoff",
        welcome_message: 'Your free claim SkyeMail lane is staged with a changeable handle. Confirm the handoff through the shared 0S gate and set your own vault key.'
      })
    });
    const skyemailStatus = skyemailHandoff.body?.record?.status || '';
    receipt.writes.push({
      label: 'SkyeMail handoff staged/provisioned',
      ...summarizeApi(skyemailHandoff, {
        handoffId: skyemailHandoff.body?.record?.id || '',
        statusText: skyemailStatus,
        provisionOk: Boolean(skyemailHandoff.body?.record?.provision?.ok),
        providerSkipped: Boolean(skyemailHandoff.body?.record?.provision?.skipped),
        recipients: skyemailHandoff.body?.record?.workspace_confirmation_recipients || []
      })
    });
    if (skyemailHandoff.body?.record?.provision?.skipped) {
      receipt.providerPending.push(`SkyeMail provider provisioning skipped: ${skyemailHandoff.body?.record?.provision?.reason || 'service token not configured'}`);
    }

    const relayConversation = await fetchJson(`${zeroOsBase}/api/founder-command/inbox/conversations`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        workspace: bob.workspaceSlug,
        workspace_slug: bob.workspaceSlug,
        customer_name: bob.displayName,
        customer_email: bob.ownerEmail,
        subject: `Bob free stack closure proof ${runId}`,
        message: 'Founder Command closure proof: Bob free claim workspace live room, ConnectLog card, SkyEmail handoff, AE FlowPro CRM, and CitadelDB backup posture are being tied together.',
        source_url: `${bobBase}/workspace-preview/`,
        external_user_id: `bob-free-stack:${runId}`,
        connectlog_card_id: bob.connectlogCardId,
        connectlog_card_label: "Bob's Smoke Shop client workspace",
        connectlog_campaign: 'bobs-free-claim-stack',
        connectlog_owner_name: 'Media Over London',
        connectlog_owner_company: 'MetrAIyux 0S',
        connectlog_welcome_message: 'Bob workspace room opened from Founder Command.'
      })
    });
    receipt.writes.push({
      label: 'Relay13/ConnectLog conversation',
      ...summarizeApi(relayConversation, {
        mode: relayConversation.body?.mode || '',
        conversationId: relayConversation.body?.record?.relay13?.conversation_id || '',
        workspace: relayConversation.body?.record?.workspace || null
      })
    });
    if (!responseOkJson(relayConversation)) {
      receipt.failures.push(`Relay13/ConnectLog conversation did not create live room: ${relayConversation.body?.error || relayConversation.status}`);
    }

    const ownerEmailProof = process.env.BOBS_CLOSURE_SEND_OWNER_EMAIL === '0' ? null : await fetchJson(`${zeroOsBase}/api/valley-verified/skyemail-handle-request`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        business_id: bob.valleyBusinessId,
        business_name: bob.displayName,
        current_mailbox: bob.skyemail,
        preferred_handle: 'bobs-smokeshop',
        domain: 'skyemail.solenterprises.org',
        owner_name: "Bob's Smoke Shop",
        owner_email: bob.ownerEmail,
        owner_phone: bob.phone,
        source_url: `${bobBase}/workspace-preview/`,
        notes: `Closure proof ${runId}: handle stays bobs-smokeshop unless Bob requests a different handle. Owner fanout should receive this system notification.`
      })
    });
    if (ownerEmailProof) {
      const delivery = ownerEmailProof.body?.request?.email_delivery || {};
      receipt.writes.push({
        label: 'SkyEmail handle-change owner notification',
        ...summarizeApi(ownerEmailProof, {
          requestId: ownerEmailProof.body?.request?.id || '',
          preferredMailbox: ownerEmailProof.body?.request?.preferred_mailbox || '',
          emailDeliveryOk: Boolean(delivery.ok),
          emailSkipped: Boolean(delivery.skipped),
          recipients: delivery.recipients || []
        })
      });
      if (!delivery.ok && !delivery.skipped) receipt.failures.push(`SkyEmail handle-change owner notification did not send or skip cleanly: ${delivery.reason || ownerEmailProof.body?.error || ownerEmailProof.status}`);
      if (delivery.skipped) receipt.providerPending.push(`Owner notification email skipped: ${delivery.reason || 'mail provider not configured'}`);
      for (const email of ownerRecipients) {
        if (!emailIncludes(delivery.recipients, email)) {
          receipt.failures.push(`SkyEmail handle-change notification missing recipient ${email}`);
        }
      }
    }

    const accountDetail = await fetchJson(`${zeroOsBase}/api/founder-command/accounts/${encodeURIComponent(bob.accountId)}`, { headers });
    const inboxRead = await fetchJson(`${zeroOsBase}/api/founder-command/inbox?workspace=${encodeURIComponent(bob.workspaceSlug)}&limit=5`, { headers });
    const skyemailRead = await fetchJson(`${zeroOsBase}/api/founder-command/skyemail/handoffs?limit=20`, { headers });
    const aeStatus = await fetchJson(`${zeroOsBase}/api/founder-command/ae-flow/status`, { headers });
    const products = await fetchJson(`${zeroOsBase}/api/founder-command/ae-flow/products`, { headers });

    receipt.authChecks.push(
      check('Founder account detail reads back Bob operations', responseOkJson(accountDetail) && accountDetail.body?.account?.client_account_id === bob.accountId && Number(accountDetail.body?.counts?.operations || 0) >= 4, { status: accountDetail.status, operations: accountDetail.body?.counts?.operations || 0 }),
      check('Founder inbox reads back Relay13 mode/receipts', responseOkJson(inboxRead) && typeof inboxRead.body?.mode === 'string', { status: inboxRead.status, mode: inboxRead.body?.mode || '', receipts: inboxRead.body?.receipts?.length || 0 }),
      check('SkyeMail handoff ledger reads back', responseOkJson(skyemailRead) && Array.isArray(skyemailRead.body?.handoffs), { status: skyemailRead.status, count: skyemailRead.body?.count || 0 }),
      check('AE FlowPro status reads back', responseOkJson(aeStatus), { status: aeStatus.status, storage: aeStatus.body?.storage?.storage || aeStatus.body?.storage || '' }),
      check('AE FlowPro products route reads back', responseOkJson(products), { status: products.status, count: products.body?.products?.length || 0 })
    );

    for (const item of receipt.authChecks) {
      if (!item.ok) receipt.failures.push(`Authenticated check failed: ${item.label}`);
    }
    for (const item of receipt.writes) {
      if (!item.ok) receipt.failures.push(`Write failed: ${item.label}`);
    }
  }

  if (receipt.valleyDeployBoundary.dirty) {
    receipt.warnings.push(`Valley Verified still has ${receipt.valleyDeployBoundary.count} dirty files in git status; this is tracked as active working state, not a proof failure after live checks pass.`);
  }

  receipt.ok = receipt.failures.length === 0 && receipt.providerPending.length === 0;
  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, paths.latest),
    stampedReceipt: path.relative(repoRoot, paths.stamped),
    failures: receipt.failures,
    providerPending: receipt.providerPending,
    pendingMainWorkerDeploy: receipt.pendingMainWorkerDeploy
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'bobs-free-stack-closure',
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    fatal: error?.stack || error?.message || String(error)
  };
  const paths = await writeReceipt(receipt);
  console.error(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
