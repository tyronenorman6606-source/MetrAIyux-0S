import { readFile } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyemusicnexus-social-pr-parity-${safeStamp}`);
const CANONICAL_PROOF_DIR = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeMusicNexus', 'proof');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
      const role = token.includes('fan') ? 'user' : 'admin';
      const email = token.includes('@') ? token.replace(/^admin:|^user:/, '') : `${role}@social-pr.local`;
      return Response.json({
        active: true,
        ok: true,
        email,
        username: email,
        sub: `social-pr-${role}-${email}`,
        role,
        scope: role === 'admin' ? 'admin.read admin.write music.write gateway.invoke' : 'music.read music.write',
        isAdmin: role === 'admin',
      });
    },
  };
}

const ADMIN_CODE = 'social-pr-admin';
const env = {
  SITE_EVENTS_KV: memoryKv(),
  SKYGATEFS27_WORKER: fakeGateWorker(),
  FREE99_ADMIN_CODE: ADMIN_CODE,
  SKYGATE_SOURCE_APP: 'metraiyux-0s',
  ZERO_OS_PROVIDER_SANDBOX: '1',
  FEDIVERSE_ACCESS_TOKEN: 'fediverse-test-token-not-returned',
};

async function call(method, route, { body, token = 'admin:social-pr@example.com', admin = false, expectOk = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-free99-admin-code'] = ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://social-pr.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  if (expectOk && !response.ok) throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 1000)}`);
  return { status: response.status, ok: response.ok, payload };
}

async function read(relativePath) {
  return readFile(path.resolve(REPO_ROOT, relativePath), 'utf8');
}

const [workerJs, neoJs, feedHtml, contestsHtml] = await Promise.all([
  read('metraiyux_0s_site/cloudflare/worker.js'),
  read('metraiyux_0s_site/SkyeMusicNexus/public/neo-nexus.js'),
  read('metraiyux_0s_site/SkyeMusicNexus/public/feed.html'),
  read('metraiyux_0s_site/SkyeMusicNexus/public/contests.html'),
]);

for (const snippet of ['music-contests', 'run-pr-agent', 'featured_blog_pr_package', 'providerCallMade:false', 'musicSafeSubmittedUrl']) {
  assert(workerJs.includes(snippet), `Worker missing ${snippet}`);
}
for (const snippet of ['standalonePagesHost', 'socialPrAgentForm', 'contestCreateForm', 'featuredBlogPublishForm', 'music-contests']) {
  assert(neoJs.includes(snippet), `neo-nexus missing ${snippet}`);
}
assert(feedHtml.includes('./nexus-player.js') && feedHtml.includes('./nexus-player.css'), 'feed must load local canonical player assets');
assert(!feedHtml.includes('https://skye-music-nexus.pages.dev/public/nexus-player'), 'feed still loads production player assets directly');
assert(contestsHtml.includes('contestEntryForm') && contestsHtml.includes('socialPrAgentForm'), 'contest page missing entry or PR forms');

const manifest = (await call('GET', '/api/skymusicnexus/routes/manifest')).payload;
assert(manifest.functions.includes('music-social'), 'manifest missing music-social');
assert(manifest.functions.includes('music-contests'), 'manifest missing music-contests');

const connector = (await call('POST', '/api/skymusicnexus/music-social', {
  body: {
    action: 'save-connector',
    id: 'proof_pixelfed',
    platform: 'pixelfed',
    name: 'Proof Pixelfed',
    instanceUrl: 'https://pixelfed.example',
    handle: '@proof@pixelfed.example',
    tokenEnvKey: 'MISSING_PROOF_TOKEN',
  },
})).payload.connector;
assert(connector.tokenStatus === 'provider-token-required', 'connector should require provider token when env is missing');

const queued = (await call('POST', '/api/skymusicnexus/music-social', {
  body: {
    action: 'queue-post',
    connectorId: connector.id,
    artistId: '444666666666',
    releaseId: 'reflection-proof',
    caption: 'Proof social post for the upgraded MusicNexus feed.',
    hashtags: 'proof, musicnexus',
  },
})).payload.post;
assert(queued.status === 'queued', 'social post did not queue');

const published = (await call('POST', '/api/skymusicnexus/music-social', {
  body: { action: 'publish-post', postId: queued.id },
})).payload;
assert(published.post.status === 'provider-token-required', 'publish without token should create provider-token-required receipt');
assert(published.publication.providerTokenRequired === true, 'publish receipt missing providerTokenRequired');

const runtimeConnector = (await call('POST', '/api/skymusicnexus/music-social', {
  body: {
    action: 'save-connector',
    id: 'proof_runtime_mastodon',
    platform: 'mastodon',
    name: 'Proof Runtime Mastodon',
    instanceUrl: 'https://mastodon.example',
    handle: '@proof@mastodon.example',
    tokenEnvKey: 'FEDIVERSE_ACCESS_TOKEN',
  },
})).payload.connector;
assert(runtimeConnector.tokenStatus === 'env-key-set', 'runtime connector should see redacted env-token readiness');

const runtimeQueued = (await call('POST', '/api/skymusicnexus/music-social', {
  body: {
    action: 'queue-post',
    connectorId: runtimeConnector.id,
    artistId: '444666666666',
    releaseId: 'reflection-proof',
    caption: 'Provider runtime social publish proof.',
    hashtags: 'proof, runtime',
  },
})).payload.post;
const runtimePublished = (await call('POST', '/api/skymusicnexus/music-social', {
  body: { action: 'publish-post', postId: runtimeQueued.id },
})).payload;
assert(runtimePublished.post.status === 'published', 'runtime social post should publish through sandbox provider runtime');
assert(runtimePublished.publication.providerRuntime?.status === 'executed_sandbox', 'runtime social publish missing provider runtime receipt');

const feedPost = (await call('POST', '/api/skymusicnexus/music-social', {
  body: {
    action: 'create-feed-post',
    artistId: '444666666666',
    releaseId: 'reflection-proof',
    caption: 'The upgraded social feed is live with real counters.',
    hashtags: 'proof, social',
  },
})).payload.post;
assert(feedPost.status === 'published', 'local feed post should publish');

const liked = (await call('POST', '/api/skymusicnexus/music-social', {
  body: { action: 'feed-action', feedAction: 'like', targetId: feedPost.id, artistId: '444666666667' },
})).payload;
assert(liked.stats.likes >= 1, 'feed like did not increment unified stats');

const prRun = (await call('POST', '/api/skymusicnexus/music-social', {
  body: {
    action: 'run-pr-agent',
    artistId: '444666666666',
    releaseId: 'reflection-proof',
    focus: 'proof drop and social feature',
    keywords: 'SkyeMusicNexus, proof, artist feature',
  },
})).payload;
assert(prRun.run.providerCallMade === false, 'PR run should be local/provider-free');
assert(prRun.skynetIntent.readyForOwnerDeploy === true, 'PR package missing SkyeNet deploy intent');

const contest = (await call('POST', '/api/skymusicnexus/music-contests', {
  body: {
    action: 'create-contest',
    contestId: 'proof_feature_contest',
    title: 'Proof Featured Artist Contest',
    prizeType: 'featured_blog_pr_package',
    maxEntries: 5,
  },
})).payload.contest;
assert(contest.prizeType === 'featured_blog_pr_package', 'contest prize type mismatch');

const unsafe = await call('POST', '/api/skymusicnexus/music-contests', {
  body: {
    action: 'enter-contest',
    contestId: contest.contestId,
    artistId: '444666666666',
    submittedLinks: 'javascript:alert(1)',
  },
  expectOk: false,
});
assert(unsafe.status === 400 && /unsafe_url/.test(unsafe.payload.error), 'unsafe contest link should be rejected');

const entry = (await call('POST', '/api/skymusicnexus/music-contests', {
  body: {
    action: 'enter-contest',
    contestId: contest.contestId,
    artistId: '444666666666',
    artistName: 'Gray Skyes',
    submittedLinks: 'https://skye-music-nexus.pages.dev/public/player.html',
    note: 'Feature the proof drop.',
  },
})).payload.entry;
assert(entry.submittedLinks[0].reviewStatus === 'pending_review', 'submitted link should remain pending review');

const drawn = (await call('POST', '/api/skymusicnexus/music-contests', {
  body: { action: 'draw-winner', contestId: contest.contestId },
})).payload;
assert(drawn.prizeReceipt.status === 'owner_approval_required', 'contest winner package should require owner approval');

const generated = (await call('POST', '/api/skymusicnexus/music-contests', {
  body: {
    action: 'generate-feature-package',
    featurePackageId: drawn.featurePackage.featurePackageId,
    releaseId: 'reflection-proof',
    focus: 'contest winner proof feature',
  },
})).payload;
assert(generated.marketingPackage.providerCallMade === false, 'contest feature package should be local/provider-free');
assert(generated.blog.status === 'drafted_for_owner_review', 'contest feature blog should require owner review');

const hub = (await call('GET', '/api/skymusicnexus/music-social?action=hub')).payload;
assert(hub.summary.prRuns >= 2, 'social hub should include PR run count');
assert(hub.featuredBlogs.length >= 2, 'social hub should include featured blogs');

const report = {
  ok: true,
  checkedAt,
  assertions: {
    localPlayerAssets: true,
    standalonePagesFallback: true,
    socialProviderReceipt: true,
    feedActionsTracked: true,
    localPrBrain: true,
    contestFeaturePackage: true,
    unsafeBacklinksRejected: true,
  },
  ids: {
    connectorId: connector.id,
    feedPostId: feedPost.id,
    prRunId: prRun.run.prRunId,
    contestId: contest.contestId,
    contestEntryId: entry.contestEntryId,
    featurePackageId: drawn.featurePackage.featurePackageId,
  },
};

await mkdir(ARTIFACT_DIR, { recursive: true });
await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = path.join(ARTIFACT_DIR, 'receipt.json');
const latestPath = path.join(CANONICAL_PROOF_DIR, 'skyemusicnexus-social-pr-parity-latest.json');
await writeFile(reportPath, reportJson);
await writeFile(latestPath, reportJson);
console.log(JSON.stringify({ ok: true, report: reportPath, latest: latestPath, ids: report.ids }, null, 2));
