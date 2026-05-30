import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyemusicnexus-ad-layer-${safeStamp}`);
const CANONICAL_PROOF_DIR = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeMusicNexus', 'proof');
const ADMIN_CODE = 'music-ads-admin';

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
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'admin', email = `${role}@music-ads.local`] = token.split(':');
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `music-ads-${role}-${email}`,
        role,
        scope: role === 'admin' ? 'admin.read admin.write music.write' : 'music.read music.write',
        isAdmin: role === 'admin',
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

async function call(method, route, { body, token = 'admin:music-ads@example.com', admin = false, expectOk = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-free99-admin-code'] = ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://music-ads.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  if (expectOk && !response.ok) throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 900)}`);
  return { status: response.status, ok: response.ok, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifest = (await call('GET', '/api/skymusicnexus/routes/manifest')).payload;
assert(manifest.functions.includes('music-ads'), 'manifest does not expose music-ads');

const inventory = (await call('GET', '/api/skymusicnexus/music-ads?action=inventory')).payload;
assert(inventory.inventory.some((slot) => slot.slotId === 'discover_chart_rail'), 'ad inventory missing discover chart rail');
assert(inventory.inventory.some((slot) => slot.slotId === 'artist_store_sidebar'), 'ad inventory missing artist store sidebar');

const campaign = (await call('POST', '/api/skymusicnexus/music-ads', {
  body: {
    action: 'create-campaign',
    campaignId: 'ad_campaign_proof_001',
    businessName: 'Proof Sponsor LLC',
    contactEmail: 'ads@example.com',
    slotIds: ['discover_chart_rail'],
    budgetCents: 20000,
    creative: {
      title: 'Proof Sponsor Launch',
      body: 'A local campaign record for the Music Nexus sponsor layer.',
      ctaLabel: 'Open',
      ctaUrl: 'https://example.com/proof-sponsor',
    },
  },
})).payload.campaign;

assert(campaign.status === 'pending_owner_approval', 'campaign should start pending owner approval');
assert(campaign.checkoutIntent?.provider === 'skypay', 'campaign missing SkyePay intent boundary');

const approved = (await call('POST', '/api/skymusicnexus/music-ads', {
  body: { action: 'approve-campaign', campaignId: campaign.campaignId },
})).payload.campaign;
assert(approved.status === 'approved', 'campaign did not approve');

const placed = (await call('POST', '/api/skymusicnexus/music-ads', {
  body: { action: 'place-campaign', campaignId: campaign.campaignId, slotId: 'discover_chart_rail' },
})).payload.placement;
assert(placed.status === 'active', 'placement did not activate');
assert(placed.surface === 'discover', 'placement surface should be discover');

const impression = (await call('POST', '/api/skymusicnexus/music-ads', {
  body: { action: 'record-event', placementId: placed.placementId, eventType: 'impression' },
})).payload.adEvent;
const click = (await call('POST', '/api/skymusicnexus/music-ads', {
  body: { action: 'record-event', placementId: placed.placementId, eventType: 'click' },
})).payload.adEvent;

assert(impression.eventType === 'impression', 'impression event not recorded');
assert(click.eventType === 'click', 'click event not recorded');

const placements = (await call('GET', '/api/skymusicnexus/music-ads?action=placements&surface=discover')).payload;
assert(placements.placements.some((item) => item.placementId === placed.placementId && item.disclosure === 'Sponsored'), 'discover placement not returned publicly');
assert(placements.summary.activePlacements === 1, 'ad summary active placement count mismatch');
assert(placements.summary.impressions === 1 && placements.summary.clicks === 1, 'ad event summary mismatch');

const report = {
  ok: true,
  checkedAt,
  campaignId: campaign.campaignId,
  placementId: placed.placementId,
  inventorySlots: inventory.inventory.map((slot) => slot.slotId),
  summary: placements.summary,
};

await mkdir(ARTIFACT_DIR, { recursive: true });
await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = path.join(ARTIFACT_DIR, 'receipt.json');
const latestPath = path.join(CANONICAL_PROOF_DIR, 'skyemusicnexus-ad-layer-latest.json');
await writeFile(reportPath, reportJson);
await writeFile(latestPath, reportJson);
console.log(JSON.stringify({ ok: true, report: reportPath, latest: latestPath, campaignId: campaign.campaignId, placementId: placed.placementId }, null, 2));
