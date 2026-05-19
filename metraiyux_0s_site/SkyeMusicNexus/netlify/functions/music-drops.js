'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate, verifySkyGateBearer } = require('./_lib/skygate-auth');
const { resolveDropEnv, secretValue, clean } = require('./_lib/drop-env.cjs');

const MUSIC_NEXUS_DIR = process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');
const MUSIC_ROOT = path.resolve(__dirname, '../..');
const PRICE_FILE = path.join(MUSIC_ROOT, 'data/skyemusicnexus-pricing.json');
const BUILD_ROOT = process.env.MUSIC_NEXUS_DROPS_BUILD_DIR || path.join(os.tmpdir(), 'skye-musicnexus-drop-build');
const DROP_SITE_BASE = clean(process.env.MUSIC_NEXUS_DROPS_BASE_URL || '').replace(/\/+$/g, '');
const CREDIT_BUDGET = Number(process.env.MUSIC_NEXUS_DROPS_MONTHLY_CREDIT_BUDGET || 3000);
const MIN_CREDIT_RESERVE = Number(process.env.MUSIC_NEXUS_DROPS_MIN_CREDIT_RESERVE || 600);

function nowIso(date = new Date()) {
  return date.toISOString();
}

function respond(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function hmac(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value)).digest('base64url');
}

function slug(value, fallback = 'drop') {
  const out = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return out || fallback;
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function ensureFile(filePath, defaultValue) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
}

function readJsonFile(filePath, defaultValue) {
  ensureFile(filePath, defaultValue);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed == null ? defaultValue : parsed;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function storeFile(name) {
  return path.join(MUSIC_NEXUS_DIR, name);
}

function loadDrops() {
  return readJsonFile(storeFile('drops.json'), []);
}

function saveDrops(rows) {
  writeJsonFile(storeFile('drops.json'), rows);
}

function loadBatches() {
  return readJsonFile(storeFile('drop-batches.json'), []);
}

function saveBatches(rows) {
  writeJsonFile(storeFile('drop-batches.json'), rows);
}

function loadApprovals() {
  return readJsonFile(storeFile('drop-approvals.json'), []);
}

function saveApprovals(rows) {
  writeJsonFile(storeFile('drop-approvals.json'), rows);
}

function loadDeploys() {
  return readJsonFile(storeFile('drop-deploys.json'), []);
}

function saveDeploys(rows) {
  writeJsonFile(storeFile('drop-deploys.json'), rows);
}

function loadTraffic() {
  return readJsonFile(storeFile('drop-traffic.json'), []);
}

function saveTraffic(rows) {
  writeJsonFile(storeFile('drop-traffic.json'), rows);
}

function loadReleases() {
  return readJsonFile(storeFile('releases.json'), []);
}

function saveReleases(rows) {
  writeJsonFile(storeFile('releases.json'), rows);
}

function loadAssets() {
  return readJsonFile(storeFile('music-assets.json'), []);
}

function loadPricing() {
  try {
    return JSON.parse(fs.readFileSync(PRICE_FILE, 'utf8'));
  } catch {
    return {
      drop_limits: {
        'free99-lite': {
          singleDropsPerMonth: 1,
          releaseDropsPerMonth: 0,
          campaignDropsPerMonth: 0,
          privateDeliveriesPerMonth: 0,
          maxPublicPreviewBytes: 12582912,
          publicPreviewFormats: ['mp3', 'mpeg', 'aac', 'm4a'],
          wavUploads: 'admin_only',
          flacUploads: 'admin_only',
          stemsMasters: false,
          priorityDeploy: false,
          monthlyBandwidthWarningGb: 3,
        },
      },
      aliases: {},
    };
  }
}

function normalizeTier(value) {
  const raw = slug(value || 'free99-lite');
  const pricing = loadPricing();
  return pricing.aliases && pricing.aliases[raw] ? pricing.aliases[raw] : raw;
}

function tierPolicy(value) {
  const pricing = loadPricing();
  const tier = normalizeTier(value);
  return {
    tier,
    ...(pricing.drop_limits && pricing.drop_limits[tier] ? pricing.drop_limits[tier] : pricing.drop_limits['free99-lite']),
  };
}

function actorFromGuard(event) {
  const guard = verifySkyGateBearer(event);
  if (!guard.ok) return { ownerUserId: '', role: '', email: '', artistId: '' };
  const claims = guard.claims || {};
  return {
    ownerUserId: clean(claims.sub || claims.email || claims.artistId || 'skygate-user'),
    role: clean(claims.role || 'user'),
    email: clean(claims.email || ''),
    artistId: clean(claims.artistId || ''),
  };
}

function canModify(actor, record) {
  if (!record) return false;
  return actor.role === 'admin'
    || actor.role === 'operator'
    || clean(record.ownerUserId) === actor.ownerUserId
    || (actor.artistId && clean(record.artistId) === actor.artistId);
}

function normalizeDropType(value) {
  const type = clean(value || 'single_drop').toLowerCase().replace(/-/g, '_');
  const allowed = ['single_drop', 'release_drop', 'campaign_drop', 'private_delivery', 'hub_drop'];
  return allowed.includes(type) ? type : 'single_drop';
}

function normalizeVisibility(value) {
  const visibility = clean(value || 'public').toLowerCase();
  return ['public', 'unlisted', 'private'].includes(visibility) ? visibility : 'public';
}

function normalizeRightsStatus(value, releaseId = '') {
  const raw = clean(value || '').toLowerCase();
  if (['preview-ready', 'distribution-ready', 'needs-clearance', 'blocked'].includes(raw)) return raw;
  const release = releaseId ? loadReleases().find((item) => item.id === releaseId) : null;
  if (release && release.rights && release.rights.status) return release.rights.status;
  return 'needs-clearance';
}

function normalizeTracks(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks.map((track, index) => ({
    id: clean(track.id || track.assetId || `track_${index + 1}`, 80),
    title: clean(track.title || `Track ${index + 1}`, 180) || `Track ${index + 1}`,
    duration: Number(track.duration || 0) || 180,
    previewUrl: clean(track.previewUrl || track.streamUrl || track.audioUrl || '', 700),
    downloadUrl: clean(track.downloadUrl || '', 700),
    contentType: clean(track.contentType || '', 100),
    bytes: Number(track.bytes || 0) || 0,
    fileName: clean(track.fileName || track.originalName || '', 180),
  }));
}

function assetsForDrop(payload) {
  const payloadAssets = Array.isArray(payload.assets) ? payload.assets : [];
  const tracks = normalizeTracks(payload.tracks);
  const knownAssets = loadAssets();
  const byId = new Map(knownAssets.map((asset) => [asset.id, asset]));
  const merged = [];

  for (const item of payloadAssets) {
    const id = clean(item.id || item.assetId || '', 80);
    const known = id ? byId.get(id) : null;
    merged.push({
      ...known,
      ...item,
      id: id || clean(item.id || makeId('asset'), 80),
      contentType: clean(item.contentType || known?.contentType || '', 100),
      bytes: Number(item.bytes || known?.bytes || 0) || 0,
      fileName: clean(item.fileName || item.originalName || known?.originalName || known?.fileName || '', 180),
      streamUrl: clean(item.streamUrl || known?.streamUrl || item.previewUrl || '', 700),
    });
  }

  for (const track of tracks) {
    merged.push({
      id: track.id || makeId('track_asset'),
      title: track.title,
      contentType: track.contentType,
      bytes: track.bytes,
      fileName: track.fileName,
      streamUrl: track.previewUrl,
      kind: 'track-preview',
    });
  }
  return merged;
}

function extensionFor(asset) {
  const name = clean(asset.fileName || asset.originalName || asset.title || '').toLowerCase();
  const ext = path.extname(name).replace(/^\./, '');
  if (ext) return ext === 'jpeg' ? 'jpg' : ext;
  const contentType = clean(asset.contentType || '').toLowerCase();
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('flac')) return 'flac';
  if (contentType.includes('aac')) return 'aac';
  if (contentType.includes('mp4')) return 'm4a';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('webm')) return 'webm';
  return '';
}

function isExpensiveAudio(asset) {
  return ['wav', 'flac'].includes(extensionFor(asset));
}

function isStemOrMaster(asset) {
  const text = `${asset.kind || ''} ${asset.fileName || ''} ${asset.title || ''}`.toLowerCase();
  return /\b(stem|stems|master|mix|bounce|alternate)\b/.test(text);
}

function monthKey(dateValue = nowIso()) {
  return String(dateValue).slice(0, 7);
}

function dropsThisMonth(drops, drop, type) {
  const month = monthKey();
  return drops.filter((item) => item.ownerUserId === drop.ownerUserId
    && item.dropType === type
    && monthKey(item.createdAt || item.updatedAt) === month
    && item.status !== 'rejected'
    && item.status !== 'blocked').length;
}

function validateDropForPool(drop, allDrops = loadDrops()) {
  const policy = tierPolicy(drop.tierPolicy);
  const assets = assetsForDrop(drop);
  const checks = [];
  const errors = [];
  const rightsStatus = normalizeRightsStatus(drop.rightsStatus, drop.releaseId);
  const totalBytes = assets.reduce((sum, item) => sum + Number(item.bytes || 0), 0);

  if (!drop.artistId) errors.push('artistId is required.');
  if (!drop.title) errors.push('title is required.');
  if (!drop.tracks.length && drop.dropType !== 'hub_drop') errors.push('at least one track or selected asset is required.');
  if (rightsStatus === 'blocked') errors.push('rights are blocked.');
  if (!['preview-ready', 'distribution-ready'].includes(rightsStatus) && drop.dropType !== 'private_delivery') {
    errors.push('public drops require preview-ready or distribution-ready rights.');
  }

  const singleCount = dropsThisMonth(allDrops, drop, 'single_drop');
  const releaseCount = dropsThisMonth(allDrops, drop, 'release_drop');
  const campaignCount = dropsThisMonth(allDrops, drop, 'campaign_drop');
  const privateCount = dropsThisMonth(allDrops, drop, 'private_delivery');
  if (drop.dropType === 'single_drop' && singleCount > Number(policy.singleDropsPerMonth || 0)) errors.push(`${policy.label || policy.tier} monthly single drop limit reached.`);
  if (drop.dropType === 'release_drop' && releaseCount > Number(policy.releaseDropsPerMonth || 0)) errors.push(`${policy.label || policy.tier} monthly release drop limit reached.`);
  if (drop.dropType === 'campaign_drop' && campaignCount > Number(policy.campaignDropsPerMonth || 0)) errors.push(`${policy.label || policy.tier} monthly campaign drop limit reached.`);
  if (drop.dropType === 'private_delivery' && privateCount > Number(policy.privateDeliveriesPerMonth || 0)) errors.push(`${policy.label || policy.tier} private delivery limit reached.`);

  for (const asset of assets) {
    const ext = extensionFor(asset);
    if (drop.visibility !== 'private' && Number(asset.bytes || 0) > Number(policy.maxPublicPreviewBytes || 0)) {
      errors.push(`${asset.title || asset.fileName || 'asset'} exceeds public preview byte limit.`);
    }
    if (['wav'].includes(ext) && policy.wavUploads !== 'allowed') errors.push('WAV upload requires a higher tier or admin approval.');
    if (['flac'].includes(ext) && policy.flacUploads !== 'allowed') errors.push('FLAC upload requires a higher tier or admin approval.');
    if (drop.visibility !== 'private' && ext && Array.isArray(policy.publicPreviewFormats) && !policy.publicPreviewFormats.includes(ext)) {
      errors.push(`${ext.toUpperCase()} is not allowed as a public preview format for this tier.`);
    }
    if (isStemOrMaster(asset) && policy.stemsMasters !== true) errors.push('Stems and masters require Pro Artist or higher.');
  }

  checks.push({ id: 'tier', ok: errors.length === 0, tier: policy.tier, label: policy.label });
  checks.push({ id: 'rights', ok: ['preview-ready', 'distribution-ready'].includes(rightsStatus) || drop.dropType === 'private_delivery', status: rightsStatus });
  checks.push({ id: 'bytes', ok: totalBytes <= Number(policy.maxPrivateFileBytes || policy.maxPublicPreviewBytes || 0) || drop.visibility !== 'private', bytes: totalBytes });
  return { ok: errors.length === 0, errors, checks, policy, totalBytes, assets, rightsStatus };
}

function estimateCreditsForDrops(drops) {
  const bytes = drops.flatMap((drop) => assetsForDrop(drop)).reduce((sum, asset) => sum + Number(asset.bytes || 0), 0);
  const estimatedBandwidthGb = bytes / 1024 / 1024 / 1024;
  const estimatedRequests = Math.max(1, drops.length) * 12;
  const productionDeployCredits = 15;
  const webBandwidthCredits = estimatedBandwidthGb * 20;
  const webRequestCredits = estimatedRequests / 10000 * 2;
  const estimatedCredits = productionDeployCredits + webBandwidthCredits + webRequestCredits;
  return {
    dropCount: drops.length,
    totalAssetBytes: bytes,
    estimatedBandwidthGb,
    estimatedRequests,
    productionDeployCredits,
    webBandwidthCredits,
    webRequestCredits,
    estimatedCredits,
    monthlyCreditBudget: CREDIT_BUDGET,
    minimumCreditReserve: MIN_CREDIT_RESERVE,
    fitsReserve: estimatedCredits <= Math.max(0, CREDIT_BUDGET - MIN_CREDIT_RESERVE),
  };
}

function telemetrySecret() {
  const secret = clean(process.env.MUSIC_NEXUS_DROP_EVENT_SECRET || process.env.MUSIC_NEXUS_DROPS_EVENT_SECRET);
  if (secret) return secret;
  const file = storeFile('drop-event-secret.txt');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('base64url'), 'utf8');
  return fs.readFileSync(file, 'utf8').trim();
}

function signDropToken(dropId) {
  return `${dropId}.${hmac(dropId, telemetrySecret())}`;
}

function verifyDropToken(dropId, token) {
  const expected = signDropToken(dropId);
  const left = Buffer.from(expected);
  const right = Buffer.from(clean(token));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function publicDropPath(drop) {
  const id = drop.slug || slug(`${drop.title}-${drop.dropId}`, drop.dropId);
  if (drop.dropType === 'release_drop') return `/drops/releases/${id}/`;
  if (drop.dropType === 'campaign_drop') return `/drops/campaigns/${id}/`;
  if (drop.dropType === 'private_delivery') return `/drops/private/${id}/`;
  if (drop.dropType === 'hub_drop') return `/hubs/${id}/`;
  return `/drops/singles/${id}/`;
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, String(value), 'utf8');
}

function jsonScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildGrowthPackage(drop, batch) {
  const title = `${drop.artistName || drop.artistId || 'Artist'} - ${drop.title}`;
  const description = clean(drop.story || drop.description || `${drop.title} from ${drop.artistName || drop.artistId || 'MusicNexus artist'}.`).slice(0, 240);
  return {
    sourceSystem: 'WebGrowthOperator',
    bridgeMode: 'local-operator-payload',
    sourcePath: 'metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator',
    dropId: drop.dropId,
    batchId: batch.batchId,
    seo: { title, description, canonicalPath: publicDropPath(drop) },
    openGraph: {
      title,
      description,
      type: 'music.song',
      image: drop.coverArtUrl || '',
    },
    twitterCard: {
      card: drop.coverArtUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      image: drop.coverArtUrl || '',
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': drop.dropType === 'release_drop' ? 'MusicAlbum' : 'MusicRecording',
      name: drop.title,
      byArtist: { '@type': 'MusicGroup', name: drop.artistName || drop.artistId || 'MusicNexus Artist' },
      url: publicDropPath(drop),
    },
    launchChecklist: [
      'Rights state verified before public launch.',
      'OpenGraph and schema generated.',
      'Traffic estimate attached to approval receipt.',
      'No ranking, playlisting, royalty, legal, or DSP guarantee claims.',
    ],
    guardrails: ['no-guaranteed-results', 'no-dsp-claim', 'no-legal-claim'],
  };
}

function buildWebCreatorPackage(drop, batch, growth) {
  return {
    sourceSystem: 'SkyeWebCreatorMax',
    bridgeMode: 'local-static-package',
    sourcePath: 'metraiyux_0s_site/Marketing-Made-Easy/SkyeWebCreatorMax',
    lanes: [
      'webcreator.project.requested',
      'webcreator.project.generated',
      'webcreator.asset.persisted',
      'webcreator.delivery.queued',
      'app.generated',
      'ae.requested',
    ],
    request: {
      tenantId: 'metraiyux-0s',
      workspaceId: 'skyemusicnexus',
      actorId: drop.ownerUserId,
      name: `${drop.artistName || drop.artistId} - ${drop.title}`,
      brief: {
        dropId: drop.dropId,
        dropType: drop.dropType,
        artistName: drop.artistName || drop.artistId,
        title: drop.title,
        story: drop.story || growth.seo.description,
        tierPolicy: drop.tierPolicy,
        visibility: drop.visibility,
      },
      pages: ['drop', 'artist', 'batch-hub'],
      features: ['audio-player', 'download-button', 'telemetry', 'share-links'],
    },
  };
}

function renderDropPage(drop, batch, growth, webCreator) {
  const tracks = normalizeTracks(drop.tracks);
  const telemetryToken = signDropToken(drop.dropId);
  const publicPath = publicDropPath(drop);
  const privateDelivery = drop.dropType === 'private_delivery' || drop.visibility === 'private';
  const player = privateDelivery
    ? '<div class="drop-private">SkyGate is required for private stems, masters, and client delivery downloads.</div>'
    : tracks.map((track, index) => `
      <article class="drop-track">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div><strong>${escapeHtml(track.title)}</strong><small>${escapeHtml(Math.round(track.duration || 0))} sec</small></div>
        ${track.previewUrl ? `<audio controls preload="none" data-track-index="${index}" src="${escapeHtml(track.previewUrl)}"></audio>` : '<small>No preview URL linked yet</small>'}
      </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(growth.seo.title)}</title>
  <meta name="description" content="${escapeHtml(growth.seo.description)}" />
  <meta property="og:title" content="${escapeHtml(growth.openGraph.title)}" />
  <meta property="og:description" content="${escapeHtml(growth.openGraph.description)}" />
  <meta property="og:type" content="${escapeHtml(growth.openGraph.type)}" />
  ${growth.openGraph.image ? `<meta property="og:image" content="${escapeHtml(growth.openGraph.image)}" />` : ''}
  <meta name="twitter:card" content="${escapeHtml(growth.twitterCard.card)}" />
  <link rel="stylesheet" href="/styles.css" />
  <script type="application/ld+json">${jsonScript(growth.schema)}</script>
</head>
<body data-drop-id="${escapeHtml(drop.dropId)}" data-batch-id="${escapeHtml(batch.batchId)}">
  <main class="drop-shell">
    <header class="drop-hero">
      <a class="brand" href="/">SkyeMusicNexus Drops</a>
      <p>${escapeHtml(drop.dropType.replace(/_/g, ' '))}</p>
      <h1>${escapeHtml(drop.title)}</h1>
      <h2>${escapeHtml(drop.artistName || drop.artistId || 'MusicNexus Artist')}</h2>
      ${drop.coverArtUrl ? `<img class="cover" src="${escapeHtml(drop.coverArtUrl)}" alt="" />` : '<div class="cover generated-cover">SMN</div>'}
    </header>
    <section class="drop-story">
      <p>${escapeHtml(drop.story || growth.seo.description)}</p>
      <div class="meta">
        <span>${escapeHtml(drop.rightsStatus || 'rights')}</span>
        <span>${escapeHtml(drop.visibility)}</span>
        <span>${escapeHtml(drop.tierPolicy)}</span>
      </div>
    </section>
    <section class="track-list">${player}</section>
    ${drop.downloadAllowed && !privateDelivery ? `<a class="download" href="${escapeHtml(tracks[0]?.downloadUrl || tracks[0]?.previewUrl || '#')}">Download</a>` : ''}
    <footer>
      <a href="/catalog.json">Catalog JSON</a>
      <a href="${escapeHtml(publicPath)}drop.json">Drop JSON</a>
      <a href="https://metraiyux.com">Back to MetrAIyux</a>
    </footer>
  </main>
  <script>window.SKYE_DROP=${jsonScript({ dropId: drop.dropId, token: telemetryToken })};</script>
  <script src="/app.js"></script>
  <script type="application/json" id="webcreator-package">${jsonScript(webCreator)}</script>
</body>
</html>`;
}

function sharedCss() {
  return `:root{color-scheme:dark;--bg:#05060a;--panel:#111526;--line:rgba(255,255,255,.16);--text:#f8fbff;--soft:#aab6c7;--cyan:#66f4ff;--gold:#ffd166;--pink:#ff5cd7}
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:var(--text);background:radial-gradient(circle at 20% 0,rgba(102,244,255,.18),transparent 30rem),linear-gradient(135deg,#05060a,#111526)}
a{color:inherit}.drop-shell,.hub-shell{width:min(980px,100%);margin:0 auto;padding:32px 18px 56px}.drop-hero{display:grid;gap:12px;min-height:58vh;align-content:end;border-bottom:1px solid var(--line);padding-bottom:24px}.brand,.download{width:max-content;text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.06);font-weight:900}.drop-hero p,.meta span{margin:0;text-transform:uppercase;font-size:12px;font-weight:900;color:var(--gold)}h1{font-size:clamp(48px,11vw,120px);line-height:.82;margin:0;letter-spacing:0}h2{font-size:clamp(22px,4vw,42px);margin:0;color:var(--soft)}.cover{width:min(420px,100%);aspect-ratio:1;border-radius:8px;object-fit:cover;border:1px solid var(--line);background:linear-gradient(135deg,var(--cyan),var(--gold));color:#071018;display:grid;place-items:center;font-size:64px;font-weight:1000}.drop-story{font-size:20px;line-height:1.5;color:var(--soft);padding:28px 0}.meta{display:flex;gap:8px;flex-wrap:wrap}.meta span{border:1px solid var(--line);border-radius:999px;padding:6px 10px;color:var(--cyan)}.track-list{display:grid;gap:12px}.drop-track{display:grid;grid-template-columns:42px minmax(0,1fr);gap:14px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:14px;background:rgba(255,255,255,.05)}.drop-track audio{grid-column:1/-1;width:100%}.drop-track span{color:var(--gold);font-weight:1000}.drop-track small{display:block;color:var(--soft)}footer{display:flex;gap:10px;flex-wrap:wrap;margin-top:32px;color:var(--soft)}.hub-grid{display:grid;gap:12px}.hub-card{display:block;text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:18px;background:rgba(255,255,255,.05)}.drop-private{border:1px solid var(--line);border-radius:8px;padding:18px;color:var(--gold);background:rgba(255,209,102,.08)}`;
}

function sharedAppJs() {
  return `(function(){var cfg=window.SKYE_DROP||{};function send(type,extra){if(!cfg.dropId||!cfg.token)return;try{navigator.sendBeacon('/.netlify/functions/music-drops?action=track-public-event',JSON.stringify(Object.assign({action:'track-public-event',dropId:cfg.dropId,token:cfg.token,eventType:type},extra||{})));}catch(e){fetch('/.netlify/functions/music-drops?action=track-public-event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({action:'track-public-event',dropId:cfg.dropId,token:cfg.token,eventType:type},extra||{}))}).catch(function(){})}}send('page_view');document.querySelectorAll('audio').forEach(function(audio){var started=false;audio.addEventListener('play',function(){started=true;send('play_start',{trackIndex:audio.dataset.trackIndex||0})});audio.addEventListener('timeupdate',function(){if(started&&audio.currentTime>=30){started=false;send('qualified_stream',{trackIndex:audio.dataset.trackIndex||0,listenSeconds:Math.round(audio.currentTime)})}});audio.addEventListener('ended',function(){send('complete_play',{trackIndex:audio.dataset.trackIndex||0})})});document.querySelectorAll('.download').forEach(function(link){link.addEventListener('click',function(){send('download')})})})();`;
}

function renderHubPage(batch, drops) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SkyeMusicNexus Batch ${escapeHtml(batch.batchId)}</title><link rel="stylesheet" href="/styles.css"/></head><body><main class="hub-shell"><p class="brand">SkyeMusicNexus Drops</p><h1>Batch ${escapeHtml(batch.batchId)}</h1><p>${escapeHtml(drops.length)} drops published in this hub.</p><section class="hub-grid">${drops.map((drop) => `<a class="hub-card" href="${escapeHtml(publicDropPath(drop))}"><strong>${escapeHtml(drop.title)}</strong><small>${escapeHtml(drop.artistName || drop.artistId || '')} - ${escapeHtml(drop.dropType)}</small></a>`).join('')}</section></main></body></html>`;
}

function buildStaticBundle(batchId) {
  const drops = loadDrops();
  const batches = loadBatches();
  const batch = batches.find((item) => item.batchId === batchId);
  if (!batch) {
    const error = new Error('Batch not found.');
    error.statusCode = 404;
    throw error;
  }
  const batchDrops = batch.dropIds.map((id) => drops.find((drop) => drop.dropId === id)).filter(Boolean);
  const outDir = path.join(BUILD_ROOT, batch.batchId);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  writeText(path.join(outDir, 'styles.css'), sharedCss());
  writeText(path.join(outDir, 'app.js'), sharedAppJs());

  const catalog = [];
  const packageReports = [];
  for (const drop of batchDrops) {
    const growth = buildGrowthPackage(drop, batch);
    const webCreator = buildWebCreatorPackage(drop, batch, growth);
    const pagePath = publicDropPath(drop);
    const dir = path.join(outDir, pagePath);
    writeText(path.join(dir, 'index.html'), renderDropPage(drop, batch, growth, webCreator));
    writeJsonFile(path.join(dir, 'drop.json'), {
      ...drop,
      telemetryToken: undefined,
      publicPath: pagePath,
      liveUrl: DROP_SITE_BASE ? `${DROP_SITE_BASE}${pagePath}` : pagePath,
    });
    writeJsonFile(path.join(dir, 'seo.json'), growth);
    writeJsonFile(path.join(dir, 'webcreator-package.json'), webCreator);
    catalog.push({
      dropId: drop.dropId,
      dropType: drop.dropType,
      artistId: drop.artistId,
      artistName: drop.artistName || drop.artistId,
      title: drop.title,
      path: pagePath,
      url: DROP_SITE_BASE ? `${DROP_SITE_BASE}${pagePath}` : pagePath,
      rightsStatus: drop.rightsStatus,
      visibility: drop.visibility,
    });
    packageReports.push({ dropId: drop.dropId, growthOperator: growth.bridgeMode, webCreator: webCreator.bridgeMode });
  }

  const artistIds = [...new Set(batchDrops.map((drop) => drop.artistId).filter(Boolean))];
  for (const artistId of artistIds) {
    const artistDrops = batchDrops.filter((drop) => drop.artistId === artistId);
    const dir = path.join(outDir, 'artists', slug(artistId));
    writeText(path.join(dir, 'index.html'), renderHubPage({ batchId: `artist-${artistId}` }, artistDrops));
    writeJsonFile(path.join(dir, 'artist.json'), { artistId, drops: artistDrops.map((drop) => drop.dropId) });
  }

  writeText(path.join(outDir, 'index.html'), renderHubPage(batch, batchDrops));
  writeText(path.join(outDir, 'hubs/batches', batch.batchId, 'index.html'), renderHubPage(batch, batchDrops));
  writeJsonFile(path.join(outDir, 'catalog.json'), catalog);
  writeJsonFile(path.join(outDir, 'asset-manifest.json'), {
    batchId: batch.batchId,
    generatedAt: nowIso(),
    drops: batchDrops.map((drop) => ({ dropId: drop.dropId, assets: assetsForDrop(drop) })),
  });
  writeJsonFile(path.join(outDir, 'quality-report.json'), {
    ok: true,
    batchId: batch.batchId,
    packageReports,
    bridgeFallbacksAllowed: true,
  });
  writeJsonFile(path.join(outDir, 'deploy-receipt.json'), {
    batchId: batch.batchId,
    status: 'bundle-built',
    outputDir: outDir,
    estimate: estimateCreditsForDrops(batchDrops),
    generatedAt: nowIso(),
  });
  return { batch, drops: batchDrops, outDir, catalog, packageReports };
}

function listFiles(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(filePath, base, out);
    if (entry.isFile()) {
      const rel = '/' + path.relative(base, filePath).replace(/\\/g, '/');
      out.push({ path: rel, filePath, bytes: fs.statSync(filePath).size });
    }
  }
  return out;
}

async function publishNetlifyBundle(batch, outDir) {
  const envStatus = resolveDropEnv();
  const files = listFiles(outDir);
  const intent = {
    batchId: batch.batchId,
    liveDeployEnabled: envStatus.netlify.liveDeployEnabled,
    netlifyConfigured: envStatus.netlify.configured,
    fileCount: files.length,
    bytes: files.reduce((sum, item) => sum + item.bytes, 0),
    outputDir: outDir,
    createdAt: nowIso(),
  };
  writeJsonFile(path.join(outDir, 'deploy-intent.json'), intent);
  if (!envStatus.netlify.liveDeployEnabled) {
    return { ok: true, published: false, mode: 'deploy-intent', intent, reason: 'live deploy disabled' };
  }
  if (!envStatus.netlify.configured) {
    return { ok: false, published: false, mode: 'deploy-intent', intent, error: 'Netlify token or site ID missing.' };
  }

  const token = secretValue('netlifyAuthToken');
  const siteId = secretValue('netlifySiteId');
  const fileDigests = {};
  for (const item of files) fileDigests[item.path] = sha1(fs.readFileSync(item.filePath));
  const createResponse = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ files: fileDigests, draft: false }),
  });
  const deploy = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok) {
    return { ok: false, published: false, mode: 'netlify-api', status: createResponse.status, error: deploy.message || 'Netlify deploy create failed.' };
  }

  const required = Array.isArray(deploy.required) ? deploy.required : files.map((item) => item.path);
  const requiredSet = new Set(required);
  for (const item of files) {
    if (requiredSet.size && !requiredSet.has(item.path)) continue;
    const uploadPath = item.path.split('/').map((part) => encodeURIComponent(part)).join('/');
    const upload = await fetch(`https://api.netlify.com/api/v1/deploys/${encodeURIComponent(deploy.id)}/files${uploadPath}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
      body: fs.readFileSync(item.filePath),
    });
    if (!upload.ok) {
      return { ok: false, published: false, mode: 'netlify-api', status: upload.status, error: `Netlify file upload failed for ${item.path}.` };
    }
  }
  return {
    ok: true,
    published: true,
    mode: 'netlify-api',
    deployId: deploy.id,
    url: deploy.ssl_url || deploy.deploy_ssl_url || deploy.url || '',
    state: deploy.state || 'uploaded',
  };
}

function batchSafety(batch, drops) {
  const blockers = [];
  for (const drop of drops) {
    const validation = validateDropForPool(drop, loadDrops());
    if (!validation.ok) blockers.push(...validation.errors.map((error) => `${drop.dropId}: ${error}`));
    if (drop.dropType === 'private_delivery') blockers.push(`${drop.dropId}: private delivery requires manual approval.`);
    for (const asset of validation.assets) {
      if (isExpensiveAudio(asset)) blockers.push(`${drop.dropId}: WAV/FLAC requires manual approval.`);
      if (isStemOrMaster(asset)) blockers.push(`${drop.dropId}: stems/masters require manual approval.`);
    }
  }
  const estimate = estimateCreditsForDrops(drops);
  if (!estimate.fitsReserve) blockers.push('estimated credits exceed monthly reserve.');
  return { ok: blockers.length === 0, blockers, estimate };
}

function updateDropStatuses(dropIds, status, patch = {}) {
  const drops = loadDrops();
  const updated = drops.map((drop) => dropIds.includes(drop.dropId) ? { ...drop, ...patch, status, updatedAt: nowIso() } : drop);
  saveDrops(updated);
  return updated.filter((drop) => dropIds.includes(drop.dropId));
}

function handleHub() {
  const drops = loadDrops();
  const batches = loadBatches();
  const deploys = loadDeploys();
  const traffic = loadTraffic();
  return respond(200, {
    ok: true,
    drops,
    batches,
    deploys,
    trafficSummary: summarizeTraffic(traffic),
    env: resolveDropEnv(),
    estimate: estimateCreditsForDrops(drops.filter((drop) => ['deploy_pool', 'approval_pending', 'approved'].includes(drop.status))),
  });
}

function handleList(params) {
  let drops = loadDrops();
  if (params.artistId) drops = drops.filter((drop) => drop.artistId === clean(params.artistId));
  if (params.status) drops = drops.filter((drop) => drop.status === clean(params.status));
  return respond(200, { ok: true, drops, total: drops.length });
}

function handleGet(params) {
  const id = clean(params.id || params.dropId, 80);
  const drop = loadDrops().find((item) => item.dropId === id);
  if (!drop) return respond(404, { ok: false, error: 'Drop not found.' });
  return respond(200, { ok: true, drop });
}

function handleDeployPool() {
  const drops = loadDrops().filter((drop) => drop.status === 'deploy_pool');
  return respond(200, { ok: true, drops, estimate: estimateCreditsForDrops(drops) });
}

function handleBatchPreview(params) {
  const dropIds = clean(params.dropIds || '', 2000).split(',').map(clean).filter(Boolean);
  const drops = loadDrops().filter((drop) => dropIds.length ? dropIds.includes(drop.dropId) : drop.status === 'deploy_pool');
  const safety = batchSafety({ batchId: 'preview' }, drops);
  return respond(200, { ok: true, drops, ...safety });
}

function handleTrafficEstimate(params) {
  const ids = clean(params.dropIds || params.dropId || '', 2000).split(',').map(clean).filter(Boolean);
  const drops = loadDrops().filter((drop) => ids.length ? ids.includes(drop.dropId) : true);
  return respond(200, { ok: true, estimate: estimateCreditsForDrops(drops) });
}

function handleCreateDrop(payload, actor) {
  if (!payload.artistId && !actor.artistId) return respond(400, { ok: false, error: 'artistId is required.' });
  if (!payload.title) return respond(400, { ok: false, error: 'title is required.' });
  const now = nowIso();
  const drop = {
    dropId: makeId('drop'),
    dropType: normalizeDropType(payload.dropType),
    artistId: clean(payload.artistId || actor.artistId, 120),
    artistName: clean(payload.artistName || '', 180),
    ownerUserId: actor.ownerUserId || clean(payload.ownerUserId || '', 120),
    releaseId: clean(payload.releaseId || '', 120),
    title: clean(payload.title, 180),
    slug: slug(payload.slug || payload.title),
    story: clean(payload.story || payload.description || '', 1400),
    status: 'draft',
    visibility: normalizeVisibility(payload.visibility),
    rightsStatus: normalizeRightsStatus(payload.rightsStatus, payload.releaseId),
    tierPolicy: normalizeTier(payload.tierPolicy || payload.tier || 'free99-lite'),
    assets: assetsForDrop(payload),
    tracks: normalizeTracks(payload.tracks),
    coverArtUrl: clean(payload.coverArtUrl || '', 700),
    downloadAllowed: payload.downloadAllowed === true,
    approval: {},
    builder: { webCreator: 'pending', growthOperator: 'pending' },
    createdAt: now,
    updatedAt: now,
  };
  const drops = loadDrops();
  drops.push(drop);
  saveDrops(drops);
  return respond(201, { ok: true, drop, validation: validateDropForPool(drop, drops) });
}

function handleUpdateDrop(payload, actor) {
  const id = clean(payload.dropId || payload.id, 120);
  if (!id) return respond(400, { ok: false, error: 'dropId is required.' });
  const drops = loadDrops();
  const idx = drops.findIndex((drop) => drop.dropId === id);
  if (idx === -1) return respond(404, { ok: false, error: 'Drop not found.' });
  if (!canModify(actor, drops[idx])) return respond(403, { ok: false, error: 'This SkyGate session cannot update this drop.' });
  const existing = drops[idx];
  const next = {
    ...existing,
    dropType: payload.dropType ? normalizeDropType(payload.dropType) : existing.dropType,
    artistId: payload.artistId ? clean(payload.artistId, 120) : existing.artistId,
    artistName: payload.artistName !== undefined ? clean(payload.artistName, 180) : existing.artistName,
    releaseId: payload.releaseId !== undefined ? clean(payload.releaseId, 120) : existing.releaseId,
    title: payload.title ? clean(payload.title, 180) : existing.title,
    slug: payload.slug || payload.title ? slug(payload.slug || payload.title) : existing.slug,
    story: payload.story !== undefined ? clean(payload.story, 1400) : existing.story,
    visibility: payload.visibility ? normalizeVisibility(payload.visibility) : existing.visibility,
    rightsStatus: payload.rightsStatus ? normalizeRightsStatus(payload.rightsStatus, payload.releaseId || existing.releaseId) : existing.rightsStatus,
    tierPolicy: payload.tierPolicy || payload.tier ? normalizeTier(payload.tierPolicy || payload.tier) : existing.tierPolicy,
    assets: payload.assets || payload.tracks ? assetsForDrop({ ...existing, ...payload }) : existing.assets,
    tracks: payload.tracks ? normalizeTracks(payload.tracks) : existing.tracks,
    coverArtUrl: payload.coverArtUrl !== undefined ? clean(payload.coverArtUrl, 700) : existing.coverArtUrl,
    downloadAllowed: payload.downloadAllowed !== undefined ? payload.downloadAllowed === true : existing.downloadAllowed,
    updatedAt: nowIso(),
  };
  drops[idx] = next;
  saveDrops(drops);
  return respond(200, { ok: true, drop: next, validation: validateDropForPool(next, drops) });
}

function handleSubmitDrop(payload, actor) {
  const id = clean(payload.dropId || payload.id, 120);
  const drops = loadDrops();
  const idx = drops.findIndex((drop) => drop.dropId === id);
  if (idx === -1) return respond(404, { ok: false, error: 'Drop not found.' });
  if (!canModify(actor, drops[idx])) return respond(403, { ok: false, error: 'This SkyGate session cannot submit this drop.' });
  const validation = validateDropForPool(drops[idx], drops);
  if (!validation.ok) {
    drops[idx] = { ...drops[idx], status: 'blocked', blockReasons: validation.errors, updatedAt: nowIso() };
    saveDrops(drops);
    return respond(409, { ok: false, error: validation.errors.join(' '), drop: drops[idx], validation });
  }
  drops[idx] = {
    ...drops[idx],
    status: 'deploy_pool',
    rightsStatus: validation.rightsStatus,
    blockReasons: [],
    submittedAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveDrops(drops);
  return respond(200, { ok: true, drop: drops[idx], validation });
}

function handleSimpleDropStatus(payload, actor, status) {
  const id = clean(payload.dropId || payload.id, 120);
  const drops = loadDrops();
  const idx = drops.findIndex((drop) => drop.dropId === id);
  if (idx === -1) return respond(404, { ok: false, error: 'Drop not found.' });
  if (!canModify(actor, drops[idx])) return respond(403, { ok: false, error: 'This SkyGate session cannot update this drop.' });
  drops[idx] = { ...drops[idx], status, statusReason: clean(payload.reason || payload.notes || '', 600), updatedAt: nowIso() };
  saveDrops(drops);
  return respond(200, { ok: true, drop: drops[idx] });
}

function handleFormBatch(payload) {
  const drops = loadDrops();
  const requestedIds = Array.isArray(payload.dropIds)
    ? payload.dropIds.map(clean).filter(Boolean)
    : clean(payload.dropIds || '', 2000).split(',').map(clean).filter(Boolean);
  const candidates = drops.filter((drop) => requestedIds.length ? requestedIds.includes(drop.dropId) : drop.status === 'deploy_pool');
  if (!candidates.length) return respond(409, { ok: false, error: 'No deploy-pool drops are available for this batch.' });
  const safety = batchSafety({ batchId: 'preview' }, candidates);
  const batch = {
    batchId: makeId('batch'),
    status: 'queued',
    dropIds: candidates.map((drop) => drop.dropId),
    deployMode: 'batched',
    requiresOwnerApproval: true,
    autoApprovalEligibleAt: '',
    estimatedCredits: safety.estimate.estimatedCredits,
    estimatedBandwidthGb: safety.estimate.estimatedBandwidthGb,
    netlifyDeployId: '',
    liveBaseUrl: '',
    blockers: safety.blockers,
    createdAt: nowIso(),
    publishedAt: '',
  };
  const batches = loadBatches();
  batches.push(batch);
  saveBatches(batches);
  updateDropStatuses(batch.dropIds, 'approval_pending', { batchId: batch.batchId });
  return respond(201, { ok: true, batch, safety });
}

async function sendApprovalEmail(batch, drops, approval) {
  const env = resolveDropEnv();
  const payload = {
    batchId: batch.batchId,
    dropCount: drops.length,
    artists: drops.map((drop) => drop.artistName || drop.artistId),
    estimatedCredits: batch.estimatedCredits,
    approvalId: approval.approvalId,
    sentAt: approval.sentAt,
  };
  if (process.env.MUSIC_NEXUS_DROPS_DISABLE_EMAIL === '1' || !env.email.configured || env.email.provider !== 'resend') {
    return { attempted: false, provider: env.email.provider, payload };
  }
  const apiKey = secretValue('resendApiKey');
  const from = secretValue('resendFromEmail');
  const to = secretValue('approvalEmail').split(',').map(clean).filter(Boolean);
  if (!apiKey || !from || !to.length) return { attempted: false, provider: 'resend', payload };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `SkyeMusicNexus drop batch approval: ${batch.batchId}`,
      text: [
        `Batch: ${batch.batchId}`,
        `Drops: ${drops.length}`,
        `Estimated credits: ${Number(batch.estimatedCredits || 0).toFixed(2)}`,
        `Auto approval eligible at: ${approval.autoApprovalEligibleAt}`,
        '',
        'Review in SkyeMusicNexus Drops. No secret values are included in this email.',
      ].join('\n'),
    }),
  });
  const result = await response.json().catch(() => ({}));
  return { attempted: true, provider: 'resend', ok: response.ok, status: response.status, id: result.id || '', payload };
}

async function handleSendApproval(payload) {
  const batchId = clean(payload.batchId || payload.id, 120);
  const batches = loadBatches();
  const idx = batches.findIndex((batch) => batch.batchId === batchId);
  if (idx === -1) return respond(404, { ok: false, error: 'Batch not found.' });
  const batch = batches[idx];
  const drops = loadDrops().filter((drop) => batch.dropIds.includes(drop.dropId));
  const sentAt = nowIso();
  const approval = {
    approvalId: makeId('approval'),
    batchId,
    status: 'approval_pending',
    sentAt,
    autoApprovalEligibleAt: new Date(Date.parse(sentAt) + 72 * 60 * 60 * 1000).toISOString(),
    estimatedCredits: batch.estimatedCredits,
    dropIds: batch.dropIds,
    decisions: [],
    email: { provider: resolveDropEnv().email.provider, sent: false },
  };
  approval.email = await sendApprovalEmail(batch, drops, approval);
  const approvals = loadApprovals();
  approvals.push(approval);
  saveApprovals(approvals);
  batches[idx] = {
    ...batch,
    status: 'approval_pending',
    approvalSentAt: sentAt,
    autoApprovalEligibleAt: approval.autoApprovalEligibleAt,
    updatedAt: nowIso(),
  };
  saveBatches(batches);
  return respond(200, { ok: true, batch: batches[idx], approval });
}

function handleApproveBatch(payload, actor) {
  const batchId = clean(payload.batchId || payload.id, 120);
  const batches = loadBatches();
  const idx = batches.findIndex((batch) => batch.batchId === batchId);
  if (idx === -1) return respond(404, { ok: false, error: 'Batch not found.' });
  const now = nowIso();
  batches[idx] = { ...batches[idx], status: 'approved', approvedAt: now, approvedBy: actor.email || actor.ownerUserId, approvalReason: clean(payload.reason || 'manual approval', 500), updatedAt: now };
  saveBatches(batches);
  updateDropStatuses(batches[idx].dropIds, 'approved', { approvedAt: now });
  const approvals = loadApprovals();
  approvals.push({
    approvalId: makeId('approval'),
    batchId,
    status: 'approved',
    decision: 'manual-approved',
    decidedAt: now,
    decidedBy: actor.email || actor.ownerUserId,
    reason: batches[idx].approvalReason,
  });
  saveApprovals(approvals);
  return respond(200, { ok: true, batch: batches[idx] });
}

function handleApprovalBrain(payload) {
  const batchId = clean(payload.batchId || payload.id, 120);
  const now = payload.now ? new Date(payload.now) : new Date();
  const batches = loadBatches();
  const idx = batches.findIndex((batch) => batch.batchId === batchId);
  if (idx === -1) return respond(404, { ok: false, error: 'Batch not found.' });
  const batch = batches[idx];
  const drops = loadDrops().filter((drop) => batch.dropIds.includes(drop.dropId));
  const safety = batchSafety(batch, drops);
  const approvalSentAt = Date.parse(batch.approvalSentAt || '');
  const elapsed = Number.isFinite(approvalSentAt) ? now.getTime() - approvalSentAt : 0;
  const checks = [
    { id: 'approval-window', ok: elapsed >= 72 * 60 * 60 * 1000 },
    { id: 'safe-batch', ok: safety.ok, blockers: safety.blockers },
    { id: 'credit-reserve', ok: safety.estimate.fitsReserve },
  ];
  const ok = checks.every((check) => check.ok);
  const receipt = {
    approvalId: makeId('approval'),
    batchId,
    decision: ok ? 'auto-approved' : 'blocked',
    reason: ok ? '72-hour safe batch policy' : 'auto-approval checks failed',
    checks,
    decidedAt: nowIso(now),
  };
  const approvals = loadApprovals();
  approvals.push(receipt);
  saveApprovals(approvals);
  if (!ok) return respond(409, { ok: false, error: 'Batch is not eligible for auto-approval.', receipt, safety });
  batches[idx] = { ...batch, status: 'approved', approvedAt: receipt.decidedAt, approvedBy: '72-hour-approval-brain', updatedAt: receipt.decidedAt };
  saveBatches(batches);
  updateDropStatuses(batch.dropIds, 'approved', { approvedAt: receipt.decidedAt });
  return respond(200, { ok: true, batch: batches[idx], receipt });
}

function handleBuildBundle(payload) {
  const batchId = clean(payload.batchId || payload.id, 120);
  const result = buildStaticBundle(batchId);
  const batches = loadBatches();
  const idx = batches.findIndex((batch) => batch.batchId === batchId);
  if (idx !== -1) {
    batches[idx] = { ...batches[idx], status: 'bundle_built', bundleDir: result.outDir, updatedAt: nowIso() };
    saveBatches(batches);
  }
  return respond(200, { ok: true, batch: result.batch, outputDir: result.outDir, catalog: result.catalog, packageReports: result.packageReports });
}

async function handlePublishBatch(payload) {
  const batchId = clean(payload.batchId || payload.id, 120);
  const batches = loadBatches();
  const idx = batches.findIndex((batch) => batch.batchId === batchId);
  if (idx === -1) return respond(404, { ok: false, error: 'Batch not found.' });
  if (!['approved', 'bundle_built'].includes(batches[idx].status)) {
    return respond(409, { ok: false, error: 'Batch must be approved before publish.' });
  }
  const built = buildStaticBundle(batchId);
  const deployResult = await publishNetlifyBundle(batches[idx], built.outDir);
  const deploy = {
    deployReceiptId: makeId('deploy'),
    batchId,
    status: deployResult.published ? 'live' : deployResult.ok ? 'deploy-intent' : 'failed',
    mode: deployResult.mode,
    netlifyDeployId: deployResult.deployId || '',
    liveBaseUrl: deployResult.url || '',
    outputDir: built.outDir,
    fileCount: listFiles(built.outDir).length,
    publishedAt: deployResult.published ? nowIso() : '',
    createdAt: nowIso(),
    error: deployResult.error || '',
    redacted: true,
  };
  const deploys = loadDeploys();
  deploys.push(deploy);
  saveDeploys(deploys);
  batches[idx] = {
    ...batches[idx],
    status: deploy.status === 'live' ? 'live' : deploy.status,
    netlifyDeployId: deploy.netlifyDeployId,
    liveBaseUrl: deploy.liveBaseUrl,
    deployReceiptId: deploy.deployReceiptId,
    publishedAt: deploy.publishedAt,
    updatedAt: nowIso(),
  };
  saveBatches(batches);
  if (deploy.status === 'live') {
    updateDropStatuses(batches[idx].dropIds, 'live', { liveBatchId: batchId, liveBaseUrl: deploy.liveBaseUrl, liveAt: deploy.publishedAt });
    writeLiveUrlsToReleases(batches[idx], built.drops, deploy.liveBaseUrl);
  }
  return respond(deployResult.ok ? 200 : 502, { ok: deployResult.ok, batch: batches[idx], deploy, deployResult });
}

function writeLiveUrlsToReleases(batch, drops, baseUrl) {
  const releases = loadReleases();
  let changed = false;
  for (const drop of drops) {
    if (!drop.releaseId) continue;
    const idx = releases.findIndex((release) => release.id === drop.releaseId);
    if (idx === -1) continue;
    const liveDropUrl = `${String(baseUrl || DROP_SITE_BASE || '').replace(/\/+$/g, '')}${publicDropPath(drop)}`;
    releases[idx].dropUrls = [...(Array.isArray(releases[idx].dropUrls) ? releases[idx].dropUrls : []), {
      dropId: drop.dropId,
      batchId: batch.batchId,
      url: liveDropUrl,
      publishedAt: nowIso(),
    }].slice(-50);
    changed = true;
  }
  if (changed) saveReleases(releases);
}

function summarizeTraffic(events) {
  const summary = { total: events.length, pageViews: 0, playStarts: 0, qualifiedStreams: 0, completePlays: 0, downloads: 0 };
  for (const event of events) {
    if (event.eventType === 'page_view') summary.pageViews += 1;
    if (event.eventType === 'play_start') summary.playStarts += 1;
    if (event.eventType === 'qualified_stream') summary.qualifiedStreams += 1;
    if (event.eventType === 'complete_play') summary.completePlays += 1;
    if (event.eventType === 'download') summary.downloads += 1;
  }
  return summary;
}

function handleTrackPublicEvent(payload) {
  const dropId = clean(payload.dropId || payload.id, 120);
  const token = clean(payload.token, 240);
  const eventType = clean(payload.eventType || payload.type || 'page_view', 80);
  const allowed = ['page_view', 'play_start', 'qualified_stream', 'complete_play', 'download'];
  if (!dropId || !token || !allowed.includes(eventType)) return respond(400, { ok: false, error: 'Valid dropId, token, and eventType are required.' });
  if (!verifyDropToken(dropId, token)) return respond(401, { ok: false, error: 'Invalid drop telemetry token.' });
  const drops = loadDrops();
  const drop = drops.find((item) => item.dropId === dropId);
  if (!drop) return respond(404, { ok: false, error: 'Drop not found.' });
  const traffic = loadTraffic();
  const event = {
    eventId: makeId('evt'),
    dropId,
    eventType,
    trackIndex: Number(payload.trackIndex || 0) || 0,
    listenSeconds: Number(payload.listenSeconds || 0) || 0,
    at: nowIso(),
  };
  traffic.push(event);
  saveTraffic(traffic.slice(-5000));
  return respond(202, { ok: true, event: { ...event, token: undefined }, summary: summarizeTraffic(traffic) });
}

function handleRevokePrivateDelivery(payload, actor) {
  const id = clean(payload.dropId || payload.id, 120);
  const drops = loadDrops();
  const idx = drops.findIndex((drop) => drop.dropId === id);
  if (idx === -1) return respond(404, { ok: false, error: 'Drop not found.' });
  if (!canModify(actor, drops[idx])) return respond(403, { ok: false, error: 'This SkyGate session cannot revoke this delivery.' });
  drops[idx] = { ...drops[idx], status: 'takedown_hold', revokedAt: nowIso(), revokeReason: clean(payload.reason || 'private delivery revoked', 500), updatedAt: nowIso() };
  saveDrops(drops);
  return respond(200, { ok: true, drop: drops[idx] });
}

module.exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};
    const action = clean(params.action || '', 80) || 'hub';

    if (method === 'POST') {
      const payload = parseBody(event);
      if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body.' });
      const postAction = clean(payload.action || action, 80);
      if (postAction === 'track-public-event') return handleTrackPublicEvent(payload);
      const denied = requireSkyGate(event);
      if (denied) return denied;
      const actor = actorFromGuard(event);
      if (postAction === 'create-drop') return handleCreateDrop(payload, actor);
      if (postAction === 'update-drop') return handleUpdateDrop(payload, actor);
      if (postAction === 'submit-drop') return handleSubmitDrop(payload, actor);
      if (postAction === 'hold-drop') return handleSimpleDropStatus(payload, actor, 'blocked');
      if (postAction === 'reject-drop') return handleSimpleDropStatus(payload, actor, 'rejected');
      if (postAction === 'form-batch') return handleFormBatch(payload, actor);
      if (postAction === 'send-approval') return await handleSendApproval(payload, actor);
      if (postAction === 'approve-batch') return handleApproveBatch(payload, actor);
      if (postAction === 'run-approval-brain') return handleApprovalBrain(payload, actor);
      if (postAction === 'build-static-bundle') return handleBuildBundle(payload, actor);
      if (postAction === 'publish-batch') return await handlePublishBatch(payload, actor);
      if (postAction === 'revoke-private-delivery') return handleRevokePrivateDelivery(payload, actor);
      return respond(400, { ok: false, error: `Unknown POST action: ${postAction}` });
    }

    if (method === 'GET') {
      const denied = requireSkyGate(event);
      if (denied) return denied;
      if (action === 'hub') return handleHub(params);
      if (action === 'list') return handleList(params);
      if (action === 'get') return handleGet(params);
      if (action === 'deploy-pool') return handleDeployPool(params);
      if (action === 'batch-preview') return handleBatchPreview(params);
      if (action === 'traffic-estimate') return handleTrafficEstimate(params);
      if (action === 'env-status') return respond(200, { ok: true, env: resolveDropEnv() });
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }

    return respond(405, { ok: false, error: 'Method not allowed.' });
  } catch (err) {
    return respond(err.statusCode || 500, { ok: false, error: err.message || 'Internal server error.' });
  }
};

module.exports._internal = {
  buildGrowthPackage,
  buildStaticBundle,
  buildWebCreatorPackage,
  estimateCreditsForDrops,
  loadBatches,
  loadDrops,
  publishNetlifyBundle,
  renderDropPage,
  renderHubPage,
  resolveDropEnv,
  validateDropForPool,
};
