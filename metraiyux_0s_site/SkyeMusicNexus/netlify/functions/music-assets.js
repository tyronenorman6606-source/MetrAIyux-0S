'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const R2_SERVICE = 's3';
const R2_REGION = 'auto';
const MUSIC_NEXUS_DIR =
  process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');
const MAX_UPLOAD_BYTES = Math.max(1024 * 1024, Number(process.env.MUSIC_NEXUS_MAX_UPLOAD_BYTES || 50 * 1024 * 1024));
const MAX_DIRECT_UPLOAD_BYTES = Math.max(MAX_UPLOAD_BYTES, Number(process.env.MUSIC_NEXUS_MAX_DIRECT_UPLOAD_BYTES || 5 * 1024 * 1024 * 1024));

const ALLOWED_AUDIO_TYPES = new Map([
  ['audio/mpeg', '.mp3'],
  ['audio/mp3', '.mp3'],
  ['audio/wav', '.wav'],
  ['audio/x-wav', '.wav'],
  ['audio/ogg', '.ogg'],
  ['audio/webm', '.webm'],
  ['audio/mp4', '.m4a'],
  ['audio/aac', '.aac'],
  ['audio/flac', '.flac'],
]);

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function assetsDir() {
  return path.join(MUSIC_NEXUS_DIR, 'uploaded-audio');
}

function assetsFile() {
  return path.join(MUSIC_NEXUS_DIR, 'music-assets.json');
}

function ensureFile(filePath, defaultValue) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
  }
}

function loadAssets() {
  ensureFile(assetsFile(), []);
  try {
    return JSON.parse(fs.readFileSync(assetsFile(), 'utf8'));
  } catch {
    return [];
  }
}

function saveAssets(assets) {
  ensureFile(assetsFile(), []);
  fs.writeFileSync(assetsFile(), JSON.stringify(assets, null, 2) + '\n', 'utf8');
}

function storageMode() {
  const mode = env('MUSIC_NEXUS_STORAGE_BACKEND') || env('SKYE_MUSIC_NEXUS_STORAGE_BACKEND');
  const useR2 = ['1', 'true', 'yes', 'on'].includes(env('MUSIC_NEXUS_USE_R2').toLowerCase());
  if (useR2 || ['r2', 'cloudflare-r2', 'skyevault-r2'].includes(mode.toLowerCase())) return 'cloudflare-r2';
  return 'local';
}

function isR2Storage() {
  return storageMode() === 'cloudflare-r2';
}

function r2AccountId() {
  return env('MUSIC_NEXUS_R2_ACCOUNT_ID') || env('R2_ACCOUNT_ID') || env('CLOUDFLARE_R2_ACCOUNT_ID') || env('CLOUDFLARE_ACCOUNT_ID');
}

function r2AccessKeyId() {
  return env('MUSIC_NEXUS_R2_ACCESS_KEY_ID') || env('R2_ACCESS_KEY_ID') || env('CLOUDFLARE_R2_ACCESS_KEY') || env('S3_ACCESS_KEY');
}

function r2SecretAccessKey() {
  return env('MUSIC_NEXUS_R2_SECRET_ACCESS_KEY') || env('R2_SECRET_ACCESS_KEY') || env('CLOUDFLARE_R2_SECRET_KEY') || env('S3_SECRET_KEY');
}

function r2BucketName() {
  return env('MUSIC_NEXUS_R2_BUCKET') || env('R2_BUCKET') || env('S3_BUCKET') || 'client-drop-vault';
}

function r2Endpoint() {
  return env('MUSIC_NEXUS_R2_ENDPOINT') || env('R2_ENDPOINT') || `https://${r2AccountId()}.r2.cloudflarestorage.com`;
}

function r2Prefix() {
  return normalizePrefix(env('MUSIC_NEXUS_R2_PREFIX') || env('SKYEVAULT_MUSIC_NEXUS_PREFIX') || 'skye-music-nexus');
}

function r2Configured() {
  return Boolean(r2AccountId() && r2AccessKeyId() && r2SecretAccessKey() && r2BucketName());
}

function directUploadEnabled() {
  return isR2Storage() && r2Configured() && ['1', 'true', 'yes', 'on'].includes(env('MUSIC_NEXUS_ENABLE_DIRECT_UPLOAD').toLowerCase());
}

function requireR2Config() {
  if (r2Configured()) return;
  const error = new Error('MusicNexus R2 storage is enabled but R2 account, access key, secret, or bucket is missing.');
  error.statusCode = 503;
  throw error;
}

function normalizePrefix(prefix, fallback = '') {
  return String(prefix || fallback || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/');
}

function objectKey(prefix, name) {
  return [normalizePrefix(prefix), String(name || '').replace(/^\/+|\/+$/g, '')].filter(Boolean).join('/');
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalKeyPath(key) {
  return String(key || '').split('/').map(encodePathSegment).join('/');
}

function isoBasic(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function dateStamp(amzDate) {
  return amzDate.slice(0, 8);
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function sha256Buffer(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function r2SigningKey(amzDate) {
  const kDate = hmac(`AWS4${r2SecretAccessKey()}`, dateStamp(amzDate));
  const kRegion = hmac(kDate, R2_REGION);
  const kService = hmac(kRegion, R2_SERVICE);
  return hmac(kService, 'aws4_request');
}

function r2CredentialScope(amzDate) {
  return `${dateStamp(amzDate)}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
}

function canonicalQuery(params) {
  return [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => {
      const left = encodePathSegment(aKey);
      const right = encodePathSegment(bKey);
      if (left !== right) return left < right ? -1 : 1;
      const leftValue = encodePathSegment(aValue);
      const rightValue = encodePathSegment(bValue);
      if (leftValue === rightValue) return 0;
      return leftValue < rightValue ? -1 : 1;
    })
    .map(([key, value]) => `${encodePathSegment(key)}=${encodePathSegment(value)}`)
    .join('&');
}

function signedHeaders(headers) {
  const cleanHeaders = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase().trim(), String(value).trim()])
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    canonical: cleanHeaders.map(([key, value]) => `${key}:${value}\n`).join(''),
    names: cleanHeaders.map(([key]) => key).join(';'),
  };
}

function parseXmlValue(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&') : '';
}

function parseR2Error(text, fallback) {
  return parseXmlValue(text, 'Message') || parseXmlValue(text, 'Code') || fallback;
}

function r2RequestUrl(key = '', query = new URLSearchParams()) {
  const base = r2Endpoint().replace(/\/+$/g, '');
  const keyPath = key ? `/${canonicalKeyPath(key)}` : '';
  const qs = canonicalQuery(query);
  return `${base}/${r2BucketName()}${keyPath}${qs ? `?${qs}` : ''}`;
}

function r2PresignUrl(method, key, { expires = 900 } = {}) {
  requireR2Config();
  const amzDate = isoBasic();
  const scope = r2CredentialScope(amzDate);
  const host = new URL(r2Endpoint()).host;
  const params = new URLSearchParams();
  params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  params.set('X-Amz-Credential', `${r2AccessKeyId()}/${scope}`);
  params.set('X-Amz-Date', amzDate);
  params.set('X-Amz-Expires', String(Math.min(3600, Math.max(60, Number(expires || 900)))));
  params.set('X-Amz-SignedHeaders', 'host');
  const canonicalRequest = [
    method,
    `/${r2BucketName()}/${canonicalKeyPath(key)}`,
    canonicalQuery(params),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Buffer(Buffer.from(canonicalRequest)),
  ].join('\n');
  params.set('X-Amz-Signature', hmac(r2SigningKey(amzDate), stringToSign, 'hex'));
  return r2RequestUrl(key, params);
}

async function r2Request(method, key = '', { query = new URLSearchParams(), headers = {}, body = Buffer.alloc(0) } = {}) {
  requireR2Config();
  const amzDate = isoBasic();
  const payload = body == null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  const payloadHash = sha256Buffer(payload);
  const host = new URL(r2Endpoint()).host;
  const allHeaders = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...headers,
  };
  const signed = signedHeaders(allHeaders);
  const canonicalRequest = [
    method,
    `/${r2BucketName()}${key ? `/${canonicalKeyPath(key)}` : ''}`,
    canonicalQuery(query),
    signed.canonical,
    signed.names,
    payloadHash,
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    r2CredentialScope(amzDate),
    sha256Buffer(Buffer.from(canonicalRequest)),
  ].join('\n');
  const signature = hmac(r2SigningKey(amzDate), stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${r2AccessKeyId()}/${r2CredentialScope(amzDate)}, SignedHeaders=${signed.names}, Signature=${signature}`;
  return fetch(r2RequestUrl(key, query), {
    method,
    headers: {
      ...headers,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization,
    },
    body: method === 'GET' || method === 'HEAD' ? undefined : payload,
  });
}

async function assertR2Response(response, fallbackMessage) {
  if (response.ok) return response;
  const text = await response.text().catch(() => '');
  const error = new Error(parseR2Error(text, fallbackMessage || `R2 request failed with ${response.status}.`));
  error.statusCode = response.status;
  throw error;
}

async function loadR2Assets() {
  const key = objectKey(r2Prefix(), 'music-assets.json');
  const response = await r2Request('GET', key);
  if (response.status === 404) return [];
  await assertR2Response(response, 'MusicNexus R2 asset index could not be read.');
  const text = await response.text();
  try {
    return JSON.parse(text || '[]');
  } catch {
    return [];
  }
}

async function saveR2Assets(assets) {
  const key = objectKey(r2Prefix(), 'music-assets.json');
  const body = Buffer.from(JSON.stringify(assets, null, 2) + '\n', 'utf8');
  const response = await r2Request('PUT', key, {
    headers: { 'content-type': 'application/json' },
    body,
  });
  await assertR2Response(response, 'MusicNexus R2 asset index could not be saved.');
}

async function loadAssetIndex() {
  if (isR2Storage()) return loadR2Assets();
  return loadAssets();
}

async function saveAssetIndex(assets) {
  if (isR2Storage()) return saveR2Assets(assets);
  return saveAssets(assets);
}

function r2AudioKey(id, ext) {
  return objectKey(r2Prefix(), `audio/${id}${ext}`);
}

async function putAudioObject(asset, buffer, ext) {
  if (!isR2Storage()) {
    fs.mkdirSync(assetsDir(), { recursive: true });
    fs.writeFileSync(path.join(assetsDir(), `${asset.id}${ext}`), buffer);
    return { storage: 'music-nexus-local-gated-audio' };
  }

  const key = r2AudioKey(asset.id, ext);
  const response = await r2Request('PUT', key, {
    headers: {
      'content-type': asset.contentType || 'application/octet-stream',
      'x-amz-meta-skye-music-asset-id': asset.id,
      'x-amz-meta-skye-music-sha256': asset.sha256,
    },
    body: buffer,
  });
  await assertR2Response(response, 'MusicNexus R2 audio upload failed.');
  return { storage: 'skyevault-r2-gated-audio', storageKey: key, bucket: r2BucketName() };
}

async function readAudioObject(asset) {
  if (asset.storage === 'skyevault-r2-gated-audio' || asset.storageKey) {
    const response = await r2Request('GET', asset.storageKey || r2AudioKey(asset.id, extensionFor(asset.contentType, asset.originalName)));
    if (response.status === 404) return null;
    await assertR2Response(response, 'MusicNexus R2 audio stream failed.');
    return Buffer.from(await response.arrayBuffer());
  }
  const filePath = path.join(assetsDir(), `${asset.id}${extensionFor(asset.contentType, asset.originalName)}`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

async function deleteAudioObject(asset) {
  if (asset.storage === 'skyevault-r2-gated-audio' || asset.storageKey) {
    const response = await r2Request('DELETE', asset.storageKey || r2AudioKey(asset.id, extensionFor(asset.contentType, asset.originalName)));
    if (response.status === 404) return;
    await assertR2Response(response, 'MusicNexus R2 audio delete failed.');
    return;
  }
  const filePath = path.join(assetsDir(), `${asset.id}${extensionFor(asset.contentType, asset.originalName)}`);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function makeId() {
  return crypto.randomBytes(10).toString('hex');
}

function nowIso() {
  return new Date().toISOString();
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

function clean(value, max = 300) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function sanitizeFileName(value) {
  const base = path.basename(clean(value, 180)).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'uploaded-track';
}

function extensionFor(contentType, fileName) {
  const typeExt = ALLOWED_AUDIO_TYPES.get(String(contentType || '').toLowerCase());
  if (typeExt) return typeExt;
  const ext = path.extname(fileName || '').toLowerCase();
  return [...ALLOWED_AUDIO_TYPES.values()].includes(ext) ? ext : '';
}

function decodeBase64Audio(payload) {
  const raw = clean(payload.dataBase64 || payload.base64 || payload.data || '', MAX_UPLOAD_BYTES * 2);
  const base64 = raw.includes(',') ? raw.split(',').pop() : raw;
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

function storageSummary() {
  return {
    mode: storageMode(),
    durable: isR2Storage(),
    r2Configured: isR2Storage() ? r2Configured() : false,
    directUploadEnabled: directUploadEnabled(),
    directUploadAvailable: directUploadEnabled(),
    maxBase64UploadBytes: MAX_UPLOAD_BYTES,
    maxDirectUploadBytes: MAX_DIRECT_UPLOAD_BYTES,
    r2Prefix: isR2Storage() ? r2Prefix() : '',
  };
}

async function handleList(params) {
  const artistId = clean(params.artistId || '', 80);
  const releaseId = clean(params.releaseId || '', 80);
  let assets = await loadAssetIndex();
  if (artistId) assets = assets.filter((asset) => asset.artistId === artistId);
  if (releaseId) assets = assets.filter((asset) => asset.releaseId === releaseId);
  assets.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
  return respond(200, {
    ok: true,
    assets,
    total: assets.length,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    storage: storageSummary(),
  });
}

function validateAudioIntent(payload) {
  const contentType = clean(payload.contentType || payload.type || '', 80).toLowerCase();
  const originalName = sanitizeFileName(payload.fileName || payload.name || 'uploaded-track');
  const ext = extensionFor(contentType, originalName);
  if (!ext) {
    return {
      ok: false,
      response: respond(415, {
        ok: false,
        error: 'Only audio uploads are accepted: mp3, wav, ogg, webm, m4a/aac, or flac.',
      }),
    };
  }
  return { ok: true, contentType: contentType || 'audio/mpeg', originalName, ext };
}

async function handleUpload(payload) {
  const intent = validateAudioIntent(payload);
  if (!intent.ok) return intent.response;
  const { contentType, originalName, ext } = intent;

  const buffer = decodeBase64Audio(payload);
  if (!buffer || buffer.length < 16) return respond(400, { ok: false, error: 'Audio upload payload is missing or invalid.' });
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return respond(413, { ok: false, error: `Audio upload exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` });
  }

  const id = `aud_${makeId()}`;

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  let asset = {
    id,
    originalName,
    title: clean(payload.title || path.basename(originalName, path.extname(originalName)), 160),
    artistId: clean(payload.artistId || '', 80),
    releaseId: clean(payload.releaseId || '', 80),
    contentType,
    bytes: buffer.length,
    sha256,
    storage: 'pending',
    streamUrl: `/.netlify/functions/music-assets?action=stream&id=${encodeURIComponent(id)}`,
    createdAt: nowIso(),
  };
  asset = { ...asset, ...(await putAudioObject(asset, buffer, ext)) };

  const assets = (await loadAssetIndex()).filter((item) => item.id !== id);
  assets.push(asset);
  await saveAssetIndex(assets);

  return respond(201, { ok: true, asset });
}

async function handleCreateUploadSession(payload) {
  if (!directUploadEnabled()) {
    return respond(409, {
      ok: false,
      error: 'Direct upload sessions are wired but disabled. Set MUSIC_NEXUS_STORAGE_BACKEND=r2 and MUSIC_NEXUS_ENABLE_DIRECT_UPLOAD=1 after R2/CORS are configured.',
      storage: storageSummary(),
    });
  }
  const intent = validateAudioIntent(payload);
  if (!intent.ok) return intent.response;
  const { contentType, originalName, ext } = intent;
  const declaredBytes = Number(payload.bytes || payload.fileSize || 0);
  if (!Number.isFinite(declaredBytes) || declaredBytes < 16) return respond(400, { ok: false, error: 'A valid file size is required for direct upload sessions.' });
  if (declaredBytes > MAX_DIRECT_UPLOAD_BYTES) {
    return respond(413, { ok: false, error: `Direct upload exceeds ${Math.round(MAX_DIRECT_UPLOAD_BYTES / 1024 / 1024 / 1024)}GB.` });
  }

  const id = `aud_${makeId()}`;
  const storageKey = r2AudioKey(id, ext);
  const expiresInSeconds = Math.min(3600, Math.max(60, Number(process.env.MUSIC_NEXUS_DIRECT_UPLOAD_URL_SECONDS || 900)));
  const asset = {
    id,
    originalName,
    title: clean(payload.title || path.basename(originalName, path.extname(originalName)), 160),
    artistId: clean(payload.artistId || '', 80),
    releaseId: clean(payload.releaseId || '', 80),
    contentType,
    bytes: declaredBytes,
    sha256: clean(payload.sha256 || '', 90),
    storage: 'skyevault-r2-gated-audio',
    storageKey,
    bucket: r2BucketName(),
    status: 'awaiting-direct-upload',
    streamUrl: `/.netlify/functions/music-assets?action=stream&id=${encodeURIComponent(id)}`,
    createdAt: nowIso(),
    directUpload: {
      requestedAt: nowIso(),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      mode: 'r2-presigned-put',
    },
  };

  const assets = (await loadAssetIndex()).filter((item) => item.id !== id);
  assets.push(asset);
  await saveAssetIndex(assets);

  return respond(201, {
    ok: true,
    asset,
    upload: {
      method: 'PUT',
      url: r2PresignUrl('PUT', storageKey, { expires: expiresInSeconds }),
      headers: { 'content-type': contentType },
      expiresInSeconds,
      completeAction: 'complete-upload',
    },
  });
}

async function handleCompleteUpload(payload) {
  const id = clean(payload.id || payload.assetId || '', 80);
  if (!id) return respond(400, { ok: false, error: 'id is required' });
  const assets = await loadAssetIndex();
  const asset = assets.find((item) => item.id === id);
  if (!asset) return respond(404, { ok: false, error: 'Audio asset not found.' });
  if (!asset.storageKey) return respond(409, { ok: false, error: 'This asset was not created through direct upload.' });

  const head = await r2Request('HEAD', asset.storageKey);
  if (head.status === 404) return respond(404, { ok: false, error: 'Direct upload object was not found in R2 yet.' });
  await assertR2Response(head, 'MusicNexus R2 direct upload could not be verified.');

  const completed = {
    ...asset,
    bytes: Number(head.headers.get('content-length') || asset.bytes || payload.bytes || 0),
    etag: clean(head.headers.get('etag') || '', 120).replace(/^"|"$/g, ''),
    sha256: clean(payload.sha256 || asset.sha256 || '', 90),
    status: 'ready',
    completedAt: nowIso(),
  };
  await saveAssetIndex(assets.map((item) => (item.id === id ? completed : item)));
  return respond(200, { ok: true, asset: completed });
}

async function handleStream(params) {
  const id = clean(params.id || '', 80);
  if (!id) return respond(400, { ok: false, error: 'id is required' });
  const asset = (await loadAssetIndex()).find((item) => item.id === id);
  if (!asset) return respond(404, { ok: false, error: 'Audio asset not found.' });
  if (asset.status === 'awaiting-direct-upload') return respond(409, { ok: false, error: 'Audio asset is still awaiting direct upload completion.' });
  const body = await readAudioObject(asset);
  if (!body) return respond(404, { ok: false, error: 'Audio file is missing from configured storage.' });
  return {
    statusCode: 200,
    headers: {
      'content-type': asset.contentType || 'application/octet-stream',
      'cache-control': 'private, no-store',
      'content-length': String(body.length),
      'x-skye-music-asset-id': asset.id,
    },
    isBase64Encoded: true,
    body: body.toString('base64'),
  };
}

async function handleDelete(payload, params) {
  const id = clean((payload && payload.id) || params.id || '', 80);
  if (!id) return respond(400, { ok: false, error: 'id is required' });
  const assets = await loadAssetIndex();
  const asset = assets.find((item) => item.id === id);
  if (!asset) return respond(404, { ok: false, error: 'Audio asset not found.' });
  await deleteAudioObject(asset);
  await saveAssetIndex(assets.filter((item) => item.id !== id));
  return respond(200, { ok: true, deleted: id });
}

module.exports.handler = async (event) => {
  try {
    const denied = requireSkyGate(event);
    if (denied) return denied;

    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};
    const action = clean(params.action || '', 40) || 'list';

    if (method === 'GET') {
      if (action === 'list') return await handleList(params);
      if (action === 'storage-status') return respond(200, { ok: true, storage: storageSummary() });
      if (action === 'stream') return await handleStream(params);
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }

    if (method === 'POST') {
      const payload = parseBody(event);
      if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body' });
      const postAction = clean(payload.action || action, 40);
      if (postAction === 'upload') return await handleUpload(payload);
      if (postAction === 'create-upload-session') return await handleCreateUploadSession(payload);
      if (postAction === 'complete-upload') return await handleCompleteUpload(payload);
      if (postAction === 'delete') return await handleDelete(payload, params);
      return respond(400, { ok: false, error: `Unknown POST action: ${postAction}` });
    }

    return respond(405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return respond(500, { ok: false, error: err.message || 'Internal server error' });
  }
};
