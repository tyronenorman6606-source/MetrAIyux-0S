#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const BASE_URL = String(process.env.ZERO_OS_LIVE_BASE || process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.join(repoRoot, 'test-artifacts', 'founder-company-enrollment-live-http');
const LATEST = path.join(OUT_DIR, 'founder-company-enrollment-live-http-latest.json');
const CREDENTIAL_KEYS = [
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

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
  const envFiles = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of envFiles) Object.assign(merged, await readEnvFile(path.resolve(file)));
  for (const key of CREDENTIAL_KEYS) {
    if (merged[key]) return { key, value: merged[key] };
  }
  return { key: '', value: '' };
}

async function fetchJson(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timeoutMs = Number(init.timeoutMs || 20000) || 20000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    clearTimeout(timer);
    return {
      status: 0,
      ok: false,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      body: { ok: false, error: error?.name === 'AbortError' ? 'request_timeout' : (error?.message || String(error)) }
    };
  }
  clearTimeout(timer);
  const elapsedMs = Number((performance.now() - started).toFixed(2));
  const text = await response.text().catch(() => '');
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { text: text.slice(0, 1200) };
  }
  return {
    status: response.status,
    ok: response.ok && body?.ok !== false,
    elapsedMs,
    body
  };
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

function compact(call, extra = {}) {
  return {
    status: call.status,
    ok: Boolean(call.ok),
    elapsedMs: call.elapsedMs,
    error: call.body?.error || '',
    ...extra
  };
}

function check(label, ok, details = {}) {
  return { label, ok: Boolean(ok), ...details };
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeReceipt(receipt) {
  const stamp = receipt.generatedAt.replace(/[:.]/g, '-');
  const stamped = path.join(OUT_DIR, stamp, 'receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify({ ...receipt, stampedReceipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  return { stamped, latest: LATEST };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const runId = `founder-company-enrollment-${stamp}`;
  const clientId = `proof-company-${stamp}`;
  const accountId = `founder-client:${clientId}`;
  const workspaceId = `ws_${clientId}`;
  const companyName = `Founder Enrollment Proof ${stamp}`;
  const ownerEmail = `${clientId}@metraiyux.local`;
  const skyemail = `${clientId}@skyemail.solenterprises.org`;
  const aeContactId = `ae_contact_${clientId}`;
  const receipt = {
    ok: false,
    generatedAt,
    lane: 'founder-company-enrollment-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: '',
    login: null,
    calls: {},
    checks: [],
    stress: null,
    failures: [],
    boundaries: [
      'This proof uses existing Founder Command APIs and shared FS27/SkyGate/Free99 owner session headers.',
      'No Worker source, browser verifier, app-local admin password, external payout, or live legal filing is created.',
      'Provider handoffs are staged/ledgered where external delivery is not configured.'
    ]
  };

  const credential = await liveCredential();
  receipt.credentialSource = credential.key || 'missing';
  if (!credential.value) {
    receipt.failures.push('No owner credential found in process env, .env, or env.txt.');
    const paths = await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), failures: receipt.failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  const login = await fetchJson(`${BASE_URL}/api/founder-command/login`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  receipt.login = compact(login, { tokenReceived: Boolean(token) });
  if (!token) receipt.failures.push(login.body?.error || 'Founder Command login did not return shared gate bearer.');

  if (token) {
    const h = authHeaders(token);
    const jsonH = authHeaders(token, { 'content-type': 'application/json' });
    const catalog = await fetchJson(`${BASE_URL}/api/founder-command/actions/catalog`, { headers: h });
    const enrollmentPlan = await fetchJson(`${BASE_URL}/api/founder-command/actions/plan`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        action_id: 'client.enrollment.prepare',
        params: {
          client_id: clientId,
          display_name: companyName,
          owner_email: ownerEmail,
          owner_name: 'Founder Enrollment Proof Owner',
          company: companyName,
          workspace_id: workspaceId,
          priority: 'high',
          notes: 'Non-browser live proof of Founder Command company enrollment orchestration.'
        }
      })
    });
    const enrollmentExecute = await fetchJson(`${BASE_URL}/api/founder-command/actions/execute`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        action_id: 'client.enrollment.prepare',
        confirm: true,
        params: {
          client_id: clientId,
          display_name: companyName,
          owner_email: ownerEmail,
          owner_name: 'Founder Enrollment Proof Owner',
          company: companyName,
          workspace_id: workspaceId,
          priority: 'high',
          notes: 'Founder started enrollment from Founder Command; downstream lane writes are receipt-backed in this proof.'
        }
      })
    });
    const account = await fetchJson(`${BASE_URL}/api/founder-command/accounts/upsert`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        client_account_id: accountId,
        display_name: companyName,
        client_id: clientId,
        workspace_id: workspaceId,
        valley_business_id: clientId,
        relay_inbox_id: clientId,
        skyemail,
        ae_contact_id: aeContactId,
        routex_user_id: `routex_${clientId}`,
        music_artist_id: `artist_${clientId}`,
        commerce_merchant_id: `merchant_${clientId}`,
        skyepay_refs: `skypay-proof-${runId}`,
        status: 'founder-company-enrollment-proof',
        source_systems: ['founder-command', 'valley-verified', 'aeflow', 'skymail', 'skynet', 'sovereigndocs', 'skyecommerce', 'routex', 'musicnexus', 'relay13', 'client_app_factory'],
        profile: {
          email: ownerEmail,
          phone: '555-010-0S00',
          city: 'Phoenix',
          state: 'AZ',
          website: `${BASE_URL}/skyenet/${clientId}/`,
          run_id: runId
        },
        routes: {
          founder_command: `${BASE_URL}/founder-command/index.html?view=operations`,
          workspace: `${BASE_URL}/0s/index.html`,
          skynet: `${BASE_URL}/skyenet/${clientId}/`,
          sovereigndocs: `${BASE_URL}/Free99/apps/sovereigndocs/`,
          skyemail: `${BASE_URL}/live/SkyeMail/`,
          routex: `${BASE_URL}/SkyeRouteX/workforce-command-v0.4.0/public/`,
          nexus: `${BASE_URL}/skymusicnexus/`
        },
        paperwork: {
          enrollment_packet: 'staged',
          owner_approval: 'shared-gate-founder-session',
          legal_filing: 'not_auto_filed'
        },
        billing: {
          plan: 'founder-proof-unlimited-no-charge',
          status: 'ledgered_no_external_charge',
          external_payout: false
        }
      })
    });

    const operationSpecs = [
      ['crm-account', 'sales-crm', 'Client account created/linked, owner contact staged, and Valley Verified profile queued for review.'],
      ['ae-flow', 'ae-flowpro', 'AEFlow contact, paperwork, assignment, task, and commission proof staged.'],
      ['skyemail', 'skyemail', 'SkyeMail handoff staged with changeable owner mailbox and provider-safe ledger.'],
      ['skynet', 'deployment-crm', 'SkyeNet lane queued for static app/workspace route proof and owner deploy review.'],
      ['sovereigndocs', 'docs-crm', 'SovereignDocs client packet lane queued without public legal filing.'],
      ['billing-plan', 'billing-crm', 'Founder proof unlimited/no-charge billing state ledgered without external charge or payout.'],
      ['workspace', 'northstar-workspace', 'NorthStar/workspace setup linked to shared 0S account graph.'],
      ['workforce', 'workforce-crm', 'RouteX workforce/provider slot queued for owner-reviewed assignment.'],
      ['nexus', 'music-crm', 'Music Nexus/artist CRM lane linked for ad, campaign, and creator workflow proof.']
    ];
    const operations = [];
    for (const [id, lane, nextAction] of operationSpecs) {
      operations.push(await fetchJson(`${BASE_URL}/api/founder-command/accounts/${encodeURIComponent(accountId)}/operations`, {
        method: 'POST',
        headers: jsonH,
        body: JSON.stringify({
          id: `${runId}:${id}`,
          lane,
          source_app: 'founder-command',
          source_record_id: runId,
          status: id === 'billing-plan' ? 'ledgered_no_external_charge' : 'queued_for_founder_review',
          priority: 'high',
          next_action: nextAction,
          links: [
            { label: 'Founder Command', href: `${BASE_URL}/founder-command/index.html?view=operations`, kind: 'owner-command' }
          ]
        })
      }));
    }

    const identitySystems = [
      ['valley-verified', 'businesses', clientId, 'valley-business'],
      ['aeflow', 'contacts', aeContactId, 'ae-contact'],
      ['skymail', 'mailboxes', skyemail, 'mailbox'],
      ['skynet', 'routes', `/skyenet/${clientId}/`, 'deployment-route'],
      ['sovereigndocs', 'client_packets', `${clientId}:packet`, 'docs-packet'],
      ['skyepay', 'billing_refs', `skypay-proof-${runId}`, 'billing-plan'],
      ['skyecommerce', 'merchants', `merchant_${clientId}`, 'merchant'],
      ['routex', 'workforce_users', `routex_${clientId}`, 'workforce-user'],
      ['musicnexus', 'artists', `artist_${clientId}`, 'music-nexus-profile'],
      ['relay13', 'inboxes', clientId, 'relay-inbox'],
      ['northstar', 'workspaces', workspaceId, 'workspace'],
      ['client_app_factory', 'client_apps', clientId, 'client-app']
    ];
    const identityLinks = [];
    for (const [system, table, sourceId, linkType] of identitySystems) {
      identityLinks.push(await fetchJson(`${BASE_URL}/api/founder-command/identity/link`, {
        method: 'POST',
        headers: jsonH,
        body: JSON.stringify({
          client_account_id: accountId,
          source_system: system,
          source_table: table,
          source_id: sourceId,
          source_email: system === 'skymail' ? skyemail : ownerEmail,
          link_type: linkType,
          metadata: { run_id: runId, proof_lane: 'founder-company-enrollment-live-http' }
        })
      }));
    }

    const aeCapture = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/capture`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        id: aeContactId,
        source: 'founder-company-enrollment',
        source_id: runId,
        collection: 'accounts',
        kind: 'client-enrollment',
        status: 'assigned_for_founder_review',
        name: companyName,
        company: companyName,
        email: ownerEmail,
        phone: '555-010-0S00',
        route: 'founder-company-enrollment',
        city: 'Phoenix',
        state: 'AZ',
        tags: ['company-enrollment', 'founder-command', 'ae-assignment', 'proof-no-payout'],
        notes: 'Company enrollment proof record linking CRM, AEFlow, SkyeMail, SkyeNet, docs, billing, workspace, workforce, and Nexus lanes.'
      })
    });
    const aeImport = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/import-batch`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        source: 'founder-company-enrollment',
        records: [
          { source: 'company-enrollment-account', source_id: `${runId}:account`, collection: 'accounts', kind: 'client', status: 'owner-managed', name: companyName, company: companyName, email: ownerEmail },
          { source: 'company-enrollment-paperwork', source_id: `${runId}:paperwork`, collection: 'handoff_log', kind: 'paperwork', status: 'packet_staged_not_publicly_filed', name: companyName, company: companyName, email: ownerEmail },
          { source: 'company-enrollment-commission', source_id: `${runId}:commission`, collection: 'deals', kind: 'commission', status: 'tracked_no_external_payout', name: companyName, company: companyName, email: ownerEmail },
          { source: 'company-enrollment-task', source_id: `${runId}:task`, collection: 'visits', kind: 'task', status: 'queued_for_founder_closeout', name: companyName, company: companyName, email: ownerEmail }
        ]
      })
    });
    const skyemailHandoff = await fetchJson(`${BASE_URL}/api/founder-command/skyemail/handoffs`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        company_name: companyName,
        workspace_handle: clientId,
        workspace_slug: clientId,
        workspace_id: workspaceId,
        customer_id: `cust_${clientId}`,
        owner_email: ownerEmail,
        owner_name: 'Founder Enrollment Proof Owner',
        local_part: clientId,
        domain: 'skyemail.solenterprises.org',
        mailbox_email: skyemail,
        plan_id: 'founder-proof-unlimited-no-charge',
        send_email: false,
        public_contact_email: 'MediaOverLondon@solenterprises.org',
        workspace_confirmation_recipients: [
          'grayskyes@solenterprises.org',
          'SkyesOverLondonLC@solenterprises.org',
          'skyesoverlondon222@gmail.com'
        ],
        welcome_title: `${companyName} SkyeMail handoff`,
        welcome_message: 'Provider-safe enrollment proof handoff staged through shared Founder Command gate.'
      })
    });
    const relayConversation = await fetchJson(`${BASE_URL}/api/founder-command/inbox/conversations`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        workspace: clientId,
        workspace_slug: clientId,
        customer_name: companyName,
        customer_email: ownerEmail,
        subject: `Founder company enrollment proof ${runId}`,
        message: 'Founder Command enrollment proof tying account, workspace, AEFlow, SkyeMail, SkyeNet, docs, billing, workforce, Nexus, and Command Bridge receipts together.',
        source_url: `${BASE_URL}/founder-command/index.html?view=operations`,
        external_user_id: runId,
        connectlog_card_id: `${clientId}-enrollment-card`,
        connectlog_card_label: `${companyName} enrollment card`,
        connectlog_campaign: 'founder-company-enrollment-proof',
        connectlog_owner_name: 'Gray Skyes',
        connectlog_owner_company: 'Skyes Over London LC'
      })
    });
    const commandBridge = await fetchJson(`${BASE_URL}/api/founder-command/actions/execute`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        action_id: 'command-bridge.event.record',
        params: {
          source_app: 'founder-command',
          source_surface: 'company-enrollment-live-http',
          event_type: 'founder_command.company_enrollment.proof',
          status: 'recorded',
          summary: `Founder company enrollment proof recorded for ${companyName}`,
          entity_kind: 'client-account',
          entity_id: accountId,
          entity_label: companyName,
          amount_cents: 0,
          currency: 'USD',
          provider: 'internal-ledger-no-external-charge'
        }
      })
    });
    const deployQueue = await fetchJson(`${BASE_URL}/api/founder-command/actions/execute`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({
        action_id: 'deploy.proof.queue',
        confirm: true,
        params: {
          surface: companyName,
          route: `/skyenet/${clientId}/`,
          proof_command: 'node tools/proof-founder-company-enrollment-live-http.mjs',
          expected_receipt: 'test-artifacts/founder-company-enrollment-live-http/founder-company-enrollment-live-http-latest.json',
          notes: 'Queue owner manual deploy/proof review; Codex browser proof is disabled.'
        }
      })
    });
    const skynetStatus = await fetchJson(`${BASE_URL}/api/skyenet/status`, { headers: h });
    const skynetCost = await fetchJson(`${BASE_URL}/api/skyenet/cost-model`, { headers: h });
    let accountRead = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      accountRead = await fetchJson(`${BASE_URL}/api/founder-command/accounts/${encodeURIComponent(accountId)}`, { headers: h });
      if (Number(accountRead.body?.counts?.operations || 0) >= operationSpecs.length && Number(accountRead.body?.counts?.identity_links || 0) >= identitySystems.length) break;
      await delay(1500);
    }
    const identityResolve = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({ client_account_id: accountId, source_system: 'skymail', source_id: skyemail })
    });
    const aeContacts = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/contacts?limit=100&detail=1`, { headers: h });
    const skyemailRead = await fetchJson(`${BASE_URL}/api/founder-command/skyemail/handoffs?limit=30`, { headers: h });
    const inboxRead = await fetchJson(`${BASE_URL}/api/founder-command/inbox?workspace=${encodeURIComponent(clientId)}&limit=5`, { headers: h, timeoutMs: 60000 });
    const workSystem = await fetchJson(`${BASE_URL}/api/founder-command/work-system`, { headers: h });

    receipt.calls = {
      catalog: compact(catalog, { actions: catalog.body?.counts?.actions || 0 }),
      enrollmentPlan: compact(enrollmentPlan, { queueOnly: Boolean(enrollmentPlan.body?.execution?.queue_only), approvalRequired: Boolean(enrollmentPlan.body?.approval?.required) }),
      enrollmentExecute: compact(enrollmentExecute, { receiptId: enrollmentExecute.body?.receipt?.id || '', statusText: enrollmentExecute.body?.receipt?.status || '' }),
      account: compact(account, { accountId: account.body?.account?.client_account_id || '' }),
      operations: operations.map((item) => compact(item, { operationId: item.body?.operation?.id || '' })),
      identityLinks: identityLinks.map((item) => compact(item, { linkId: item.body?.link?.id || '' })),
      aeCapture: compact(aeCapture, { contactId: aeCapture.body?.captured?.contact_id || '' }),
      aeImport: compact(aeImport, { accepted: aeImport.body?.imported?.accepted || 0 }),
      skyemailHandoff: compact(skyemailHandoff, { handoffId: skyemailHandoff.body?.record?.id || '', statusText: skyemailHandoff.body?.record?.status || '', provisionOk: Boolean(skyemailHandoff.body?.record?.provision?.ok) }),
      relayConversation: compact(relayConversation, { conversationId: relayConversation.body?.record?.relay13?.conversation_id || '', mode: relayConversation.body?.mode || '' }),
      commandBridge: compact(commandBridge, { receiptId: commandBridge.body?.receipt?.id || '' }),
      deployQueue: compact(deployQueue, { receiptId: deployQueue.body?.receipt?.id || '', statusText: deployQueue.body?.receipt?.status || '' }),
      skynetStatus: compact(skynetStatus, { targetPath: skynetStatus.body?.target_path || '' }),
      skynetCost: compact(skynetCost, { source: skynetCost.body?.skynet?.source || skynetCost.body?.source || '' }),
      accountRead: compact(accountRead, { operations: accountRead.body?.counts?.operations || 0, links: accountRead.body?.counts?.identity_links || 0 }),
      identityResolve: compact(identityResolve, { resolvedAccount: identityResolve.body?.account?.client_account_id || '' }),
      aeContacts: compact(aeContacts, { count: aeContacts.body?.count || 0 }),
      skyemailRead: compact(skyemailRead, { count: skyemailRead.body?.count || 0 }),
      inboxRead: compact(inboxRead, { mode: inboxRead.body?.mode || '', receipts: inboxRead.body?.receipts?.length || 0 }),
      workSystem: compact(workSystem, { clientAccounts: workSystem.body?.metrics?.client_accounts || 0 })
    };

    const contactRows = Array.isArray(aeContacts.body?.contacts) ? aeContacts.body.contacts : [];
    const handoffRows = Array.isArray(skyemailRead.body?.handoffs) ? skyemailRead.body.handoffs : [];
    receipt.checks.push(
      check('Founder action catalog exposes client enrollment action', catalog.ok && (catalog.body?.actions || []).some((item) => item.id === 'client.enrollment.prepare'), { actionCount: catalog.body?.counts?.actions || 0 }),
      check('Founder starts enrollment through queue-only Founder Command action', enrollmentExecute.ok && enrollmentExecute.body?.receipt?.action_id === 'client.enrollment.prepare' && enrollmentExecute.body?.receipt?.status === 'queued_for_owner_runner', { status: enrollmentExecute.status }),
      check('Founder account upsert persisted company', account.status === 201 && account.body?.account?.client_account_id === accountId, { accountId }),
      check('All lane operations persisted for CRM, AEFlow, SkyeMail, SkyeNet, docs, billing, workspace, workforce, and Nexus', operations.length === operationSpecs.length && operations.every((item) => item.status === 201 && item.ok), { count: operations.filter((item) => item.ok).length }),
      check('Canonical identity links persisted across core and expansion systems', identityLinks.length === identitySystems.length && identityLinks.every((item) => item.status === 201 && item.ok), { count: identityLinks.filter((item) => item.ok).length }),
      check('AEFlow client enrollment contact and batch records persisted', aeCapture.status === 201 && aeImport.status === 201 && Number(aeImport.body?.imported?.accepted || 0) >= 4, { accepted: aeImport.body?.imported?.accepted || 0 }),
      check('SkyeMail handoff ledger accepted enrollment without external email send', [200, 201, 202].includes(skyemailHandoff.status) && skyemailHandoff.ok && skyemailHandoff.body?.record?.id, { statusText: skyemailHandoff.body?.record?.status || '' }),
      check('Relay13/ConnectLog conversation created for company enrollment', relayConversation.status === 201 && relayConversation.ok, { mode: relayConversation.body?.mode || '' }),
      check('Command Bridge event and deploy proof queue receipts persisted', commandBridge.ok && [200, 201].includes(commandBridge.status) && deployQueue.ok && [200, 201, 202].includes(deployQueue.status), { statuses: [commandBridge.status, deployQueue.status] }),
      check('SkyeNet status/cost lane is shared-gate reachable', skynetStatus.ok && skynetCost.ok, { statuses: [skynetStatus.status, skynetCost.status] }),
      check('Account readback shows operations and identity links', accountRead.ok && accountRead.body?.account?.client_account_id === accountId && Number(accountRead.body?.counts?.operations || 0) >= operationSpecs.length && Number(accountRead.body?.counts?.identity_links || 0) >= identitySystems.length, { operations: accountRead.body?.counts?.operations || 0, links: accountRead.body?.counts?.identity_links || 0 }),
      check('Identity resolve returns same founder-owned company account', identityResolve.ok && identityResolve.body?.account?.client_account_id === accountId, { resolved: identityResolve.body?.account?.client_account_id || '' }),
      check('AEFlow roster readback includes enrollment company', contactRows.some((row) => row.id === aeContactId || row.email === ownerEmail), { count: contactRows.length }),
      check('SkyeMail handoff ledger readback includes proof mailbox or company', handoffRows.some((row) => row.mailbox_email === skyemail || row.company_name === companyName || row.workspace_id === workspaceId), { count: handoffRows.length }),
      check('Founder inbox reads back the company workspace lane', inboxRead.ok && typeof inboxRead.body?.mode === 'string', { mode: inboxRead.body?.mode || '' }),
      check('Founder work system remains available after enrollment writes', workSystem.ok && Number(workSystem.body?.metrics?.client_accounts || 0) > 0, { clientAccounts: workSystem.body?.metrics?.client_accounts || 0 })
    );

    const stressRoutes = [
      `/api/founder-command/accounts/${encodeURIComponent(accountId)}`,
      '/api/founder-command/work-system',
      '/api/founder-command/ae-flow/status',
      `/api/founder-command/inbox?workspace=${encodeURIComponent(clientId)}&limit=5`,
      '/api/founder-command/skyemail/handoffs?limit=10',
      '/api/skyenet/status'
    ];
    const samples = [];
    for (let i = 0; i < 18; i += 1) samples.push(await fetchJson(`${BASE_URL}${stressRoutes[i % stressRoutes.length]}`, { headers: h }));
    const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.ok),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...durations).toFixed(2))
    };
  }

  for (const item of receipt.checks) {
    if (!item.ok) receipt.failures.push(`Check failed: ${item.label}`);
  }
  if (receipt.stress && !receipt.stress.ok) receipt.failures.push('Founder company enrollment stress failed.');
  receipt.ok = Boolean(receipt.login?.tokenReceived && receipt.checks.length > 0 && receipt.checks.every((item) => item.ok) && receipt.stress?.ok && receipt.failures.length === 0);
  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, paths.latest),
    stampedReceipt: path.relative(repoRoot, paths.stamped),
    checks: receipt.checks.map((item) => ({ label: item.label, ok: item.ok })),
    stress: receipt.stress,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'founder-company-enrollment-live-http',
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    fatal: error?.stack || error?.message || String(error)
  };
  const paths = await writeReceipt(receipt);
  console.error(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
