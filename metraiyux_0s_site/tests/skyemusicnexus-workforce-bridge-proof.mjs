import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyemusicnexus-workforce-bridge-${safeStamp}`);
const CANONICAL_PROOF_DIR = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeMusicNexus', 'proof');
const ADMIN_CODE = 'music-workforce-admin';

function memoryKv() {
  const store = new Map();
  return {
    async get(key, opts = {}) {
      const value = store.get(key);
      if (value == null) return null;
      return opts.type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
  };
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/admin/login') {
        return Response.json({
          ok: true,
          token: 'admin:owner@example.com',
          active: true,
          email: 'owner@example.com',
          username: 'owner@example.com',
          sub: 'music-workforce-admin-owner',
          role: 'admin',
          routex_role: 'admin',
          isAdmin: true,
          scope: 'admin.read admin.write music.write routex.write',
          phone: '+15550001111',
          sms_opt_in: true,
        });
      }
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [rawRole = 'artist', email = `${rawRole}@music-workforce.local`] = token.split(':');
      const role = rawRole === 'house' ? 'house_command' : rawRole;
      const isAdmin = ['admin', 'house_command', 'owner'].includes(role);
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `music-workforce-${role}-${email}`,
        role,
        routex_role: role,
        isAdmin,
        scope: isAdmin ? 'admin.read admin.write music.write routex.write' : 'music.read music.write',
        artistId: `artist_${email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
        phone: '+15550001111',
        sms_opt_in: true,
      });
    },
  };
}

const env = {
  SITE_EVENTS_KV: memoryKv(),
  SKYGATEFS27_WORKER: fakeGateWorker(),
  FREE99_ADMIN_CODE: ADMIN_CODE,
  SKYGATE_SOURCE_APP: 'metraiyux-0s',
};

async function call(method, route, { body, token = 'artist:nexus-artist@example.com', admin = false, expectOk = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-free99-admin-code'] = ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://music-workforce-bridge.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  if (expectOk && (!response.ok || payload?.ok === false)) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 900)}`);
  }
  return { status: response.status, ok: response.ok, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const denied = await call('POST', '/api/skymusicnexus/music-workforce', {
  expectOk: false,
  body: { action: 'create-release-job', artistId: 'artist_guard', title: 'Should not route' },
});
assert([401, 403].includes(denied.status), `artist-only workforce job creation must be operator blocked, got ${denied.status}`);

const artist = (await call('POST', '/api/skymusicnexus/music-artists', {
  body: {
    action: 'register',
    id: 'artist_bridge_001',
    name: 'Bridge Proof Artist',
    email: 'bridge-proof-artist@example.com',
    genre: ['trap metal', 'launch proof'],
    bio: 'Workforce bridge proof artist.',
  },
})).payload.artist;
assert(artist.id === 'artist_bridge_001', 'artist registration did not persist');

const release = (await call('POST', '/api/skymusicnexus/music-releases', {
  body: {
    action: 'submit',
    id: 'rel_bridge_001',
    artistId: artist.id,
    title: 'Bridge Proof Drop',
    type: 'single',
    tracks: [{ title: 'Bridge Proof Drop', previewUrl: '/proof/audio.mp3', duration: 164 }],
    rights: { ownershipAttested: true, previewUseAuthorized: true },
  },
})).payload.release;
assert(release.id === 'rel_bridge_001', 'release submission did not persist');

const created = (await call('POST', '/api/skymusicnexus/music-workforce', {
  token: 'admin:owner@example.com',
  admin: true,
  body: {
    action: 'create-release-job',
    releaseId: release.id,
    artistId: artist.id,
    packageType: 'content_launch_package',
    city: 'Phoenix',
    state: 'Arizona',
    payAmountCents: 12500,
    slots: 1,
    deliverables: ['launch clips', 'social feed proof', 'stream engagement report'],
  },
})).payload;
const bridge = created.bridge;
assert(bridge.bridgeId && bridge.routexJobId, 'workforce bridge did not return RouteX job link');
assert(bridge.job?.source_app === 'skymusicnexus', 'RouteX job missing SkyeMusicNexus source marker');
assert(bridge.job?.release_id === release.id, 'RouteX job missing release link');
assert(bridge.job?.pay_amount_cents === 12500, 'RouteX job budget did not persist');

const routexJob = (await call('GET', `/api/routex/jobs/${bridge.routexJobId}`, {
  token: 'house:ops@example.com',
})).payload.job;
assert(routexJob?.music_workforce_bridge_id === bridge.bridgeId, 'RouteX job is not queryable from Workforce Command with bridge id');

const assigned = (await call('POST', '/api/skymusicnexus/music-workforce', {
  token: 'admin:owner@example.com',
  admin: true,
  body: {
    action: 'assign',
    bridgeId: bridge.bridgeId,
    contractor: {
      email: 'launch-contractor@example.com',
      name: 'Launch Contractor',
      skills: ['content_launch_package', 'social proof'],
    },
  },
})).payload;
assert(assigned.assignment?.id, 'bridge assignment did not create RouteX assignment');
assert(assigned.bridge.status === 'assigned', `bridge should be assigned, got ${assigned.bridge.status}`);

const proof = (await call('POST', '/api/skymusicnexus/music-workforce', {
  token: 'admin:owner@example.com',
  admin: true,
  body: {
    action: 'submit-proof',
    bridgeId: bridge.bridgeId,
    assignmentId: assigned.assignment.id,
    proofType: 'launch_receipt',
    proofBody: 'Launch clips delivered, social feed queued, and stream engagement report attached.',
  },
})).payload;
assert(proof.proof?.id, 'proof submission did not create RouteX proof row');
assert(proof.bridge.status === 'proof_submitted', `bridge should be proof_submitted, got ${proof.bridge.status}`);

const approved = (await call('POST', '/api/skymusicnexus/music-workforce', {
  token: 'admin:owner@example.com',
  admin: true,
  body: {
    action: 'approve-work',
    bridgeId: bridge.bridgeId,
    assignmentId: assigned.assignment.id,
  },
})).payload;
assert(approved.assignment.status === 'completed', 'assignment was not completed after approval');
assert(approved.payment.status === 'payout_eligible', 'payment ledger was not marked payout eligible');
assert(approved.bridge.status === 'completed', `bridge should be completed, got ${approved.bridge.status}`);

const hub = (await call('GET', '/api/skymusicnexus/music-workforce?action=hub')).payload;
assert(hub.summary.links === 1, `workforce hub summary should show one bridge, got ${hub.summary.links}`);
assert(hub.summary.assignments === 1, 'workforce hub summary should show one assignment');
assert(hub.summary.proofItems === 1, 'workforce hub summary should show one proof item');
assert(hub.summary.payoutEligible === 1, 'workforce hub summary should show one payout-eligible row');

const operations = (await call('GET', '/api/skymusicnexus/music-releases?action=operations-board')).payload;
const releaseWorkflow = operations.workflows.find(item => item.releaseId === release.id);
assert(releaseWorkflow?.routexJobId === bridge.routexJobId, 'Music release operations board did not retain RouteX job id');
assert(releaseWorkflow?.status === 'completed', `Music release workflow should sync completed, got ${releaseWorkflow?.status}`);

const paymentLedger = (await call('GET', '/api/routex/payments/ledger', {
  token: 'house:ops@example.com',
})).payload;
assert(paymentLedger.payments.some(item => item.assignment_id === assigned.assignment.id && item.status === 'payout_eligible'), 'RouteX payment ledger missing payout-eligible assignment row');

const workflowBoard = (await call('GET', '/api/routex/house-command/jobs', {
  token: 'house:ops@example.com',
})).payload;
assert(workflowBoard.jobs.some(item => item.id === bridge.routexJobId && item.source_app === 'skymusicnexus'), 'RouteX House Command jobs did not include Music Nexus job');

const report = {
  ok: true,
  checkedAt,
  assertions: [
    'artist-only Music Nexus workforce job creation is operator-blocked',
    'Music Nexus creates a canonical RouteX job with source app, artist, release, package, and budget links',
    'RouteX can read the created job through the shared gate lane',
    'Music Nexus assigns a contractor through the bridge and RouteX stores the assignment/payment/compliance rows',
    'Music Nexus proof submission creates a RouteX proof row and moves the bridge to proof_submitted',
    'Music Nexus approval marks the assignment completed and the payment payout_eligible',
    'Music release operations board syncs the completed RouteX workflow status',
    'RouteX House Command and payment ledger include the Music Nexus linked job',
  ],
  bridge: {
    bridgeId: bridge.bridgeId,
    routexJobId: bridge.routexJobId,
    assignmentId: assigned.assignment.id,
    proofId: proof.proof.id,
    paymentId: approved.payment.id,
    status: approved.bridge.status,
  },
  summary: hub.summary,
};

await mkdir(ARTIFACT_DIR, { recursive: true });
await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = path.join(ARTIFACT_DIR, 'receipt.json');
const latestPath = path.join(CANONICAL_PROOF_DIR, 'skyemusicnexus-workforce-bridge-latest.json');
await writeFile(reportPath, reportJson);
await writeFile(latestPath, reportJson);
console.log(JSON.stringify({ ok: true, report: reportPath, latest: latestPath, bridge: report.bridge }, null, 2));
