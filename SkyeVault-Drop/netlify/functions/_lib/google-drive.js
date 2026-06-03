import crypto from 'node:crypto';

const SERVICE = 's3';
const REGION = 'auto';
const DEFAULT_BUCKET = 'client-drop-vault';
const DEFAULT_CONFIG_PREFIX = 'vault-system';
const DEFAULT_UPLOAD_PREFIX = 'client-uploads';
const MAX_SINGLE_OBJECT_BYTES = 5 * 1024 * 1024 * 1024 * 1024;
const MIN_MULTIPART_PART_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_PARTS = 10000;
const MAX_MULTIPART_CHUNK_BYTES = 512 * 1024 * 1024;

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function accountId() {
  const value = env('R2_ACCOUNT_ID') || env('CLOUDFLARE_R2_ACCOUNT_ID') || env('CLOUDFLARE_ACCOUNT_ID') || env('cloudflare_account_ID');
  if (!value) throw configuredError('R2_ACCOUNT_ID is not configured.');
  return value;
}

function accessKeyId() {
  const value = env('R2_ACCESS_KEY_ID') || env('CLOUDFLARE_R2_ACCESS_KEY') || env('S3_ACCESS_KEY');
  if (!value) throw configuredError('R2_ACCESS_KEY_ID is not configured.');
  return value;
}

function secretAccessKey() {
  const value = env('R2_SECRET_ACCESS_KEY') || env('CLOUDFLARE_R2_SECRET_KEY') || env('S3_SECRET_KEY');
  if (!value) throw configuredError('R2_SECRET_ACCESS_KEY is not configured.');
  return value;
}

function bucketName() {
  return env('R2_BUCKET') || env('S3_BUCKET') || DEFAULT_BUCKET;
}

function endpoint() {
  return env('R2_ENDPOINT') || `https://${accountId()}.r2.cloudflarestorage.com`;
}

function configuredError(message) {
  const error = new Error(message);
  error.statusCode = 500;
  return error;
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

function sha256(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function signingKey(amzDate) {
  const kDate = hmac(`AWS4${secretAccessKey()}`, dateStamp(amzDate));
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

function credentialScope(amzDate) {
  return `${dateStamp(amzDate)}/${REGION}/${SERVICE}/aws4_request`;
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalKeyPath(key) {
  return String(key || '').split('/').map(encodePathSegment).join('/');
}

function normalizePrefix(prefix, fallback = '') {
  const clean = String(prefix || fallback || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/');
  return clean;
}

function objectKey(prefix, name) {
  const base = normalizePrefix(prefix);
  const cleanName = String(name || '').replace(/^\/+|\/+$/g, '');
  return [base, cleanName].filter(Boolean).join('/');
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseXmlValue(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&') : '';
}

function parseListObjects(xml) {
  const items = [];
  const blocks = String(xml || '').match(/<Contents>[\s\S]*?<\/Contents>/g) || [];
  for (const block of blocks) {
    items.push({
      id: parseXmlValue(block, 'Key'),
      key: parseXmlValue(block, 'Key'),
      name: parseXmlValue(block, 'Key').split('/').pop() || parseXmlValue(block, 'Key'),
      size: Number(parseXmlValue(block, 'Size') || 0),
      modifiedTime: parseXmlValue(block, 'LastModified'),
      createdTime: parseXmlValue(block, 'LastModified'),
      mimeType: 'application/json'
    });
  }
  return items;
}

function parseS3Error(text, fallback) {
  return parseXmlValue(text, 'Message') || parseXmlValue(text, 'Code') || fallback;
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
  const clean = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase().trim(), String(value).trim()])
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    canonical: clean.map(([key, value]) => `${key}:${value}\n`).join(''),
    names: clean.map(([key]) => key).join(';')
  };
}

function requestUrl(key = '', query = new URLSearchParams()) {
  const base = endpoint().replace(/\/+$/g, '');
  const path = key ? `/${bucketName()}/${canonicalKeyPath(key)}` : `/${bucketName()}`;
  const qs = canonicalQuery(query);
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

async function r2Request(method, key = '', { query = new URLSearchParams(), headers = {}, body = '' } = {}) {
  const amzDate = isoBasic();
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  const payloadHash = sha256(payload || '');
  const host = new URL(endpoint()).host;
  const allHeaders = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...headers
  };
  const signed = signedHeaders(allHeaders);
  const canonicalRequest = [
    method,
    `/${bucketName()}${key ? `/${canonicalKeyPath(key)}` : ''}`,
    canonicalQuery(query),
    signed.canonical,
    signed.names,
    payloadHash
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope(amzDate),
    sha256(canonicalRequest)
  ].join('\n');
  const signature = hmac(signingKey(amzDate), stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId()}/${credentialScope(amzDate)}, SignedHeaders=${signed.names}, Signature=${signature}`;
  const response = await fetch(requestUrl(key, query), {
    method,
    headers: {
      ...headers,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization
    },
    body: method === 'GET' || method === 'HEAD' || !payload ? undefined : payload
  });
  return response;
}

function presignUrl(method, key, { query = new URLSearchParams(), expires = 3600 } = {}) {
  const amzDate = isoBasic();
  const scope = credentialScope(amzDate);
  const host = new URL(endpoint()).host;
  const params = new URLSearchParams(query);
  params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  params.set('X-Amz-Credential', `${accessKeyId()}/${scope}`);
  params.set('X-Amz-Date', amzDate);
  params.set('X-Amz-Expires', String(Math.min(604800, Math.max(60, Number(expires || 3600)))));
  params.set('X-Amz-SignedHeaders', 'host');
  const canonicalRequest = [
    method,
    `/${bucketName()}/${canonicalKeyPath(key)}`,
    canonicalQuery(params),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest)
  ].join('\n');
  params.set('X-Amz-Signature', hmac(signingKey(amzDate), stringToSign, 'hex'));
  return requestUrl(key, params);
}

async function r2JsonResponse(response, fallbackMessage) {
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(parseS3Error(text, fallbackMessage || `R2 request failed with ${response.status}.`));
    error.statusCode = response.status;
    error.r2 = { status: response.status };
    throw error;
  }
  return text;
}

export function getStorageIdentity() {
  return {
    provider: 'cloudflare-r2',
    accountIdPresent: Boolean(env('R2_ACCOUNT_ID') || env('CLOUDFLARE_R2_ACCOUNT_ID') || env('CLOUDFLARE_ACCOUNT_ID') || env('cloudflare_account_ID')),
    bucket: bucketName(),
    endpoint: endpoint()
  };
}

export function getServiceAccountIdentity() {
  const identity = getStorageIdentity();
  return {
    email: `r2:${identity.bucket}`,
    projectHint: identity.provider,
    ...identity
  };
}

export async function getAccessToken() {
  accountId();
  accessKeyId();
  secretAccessKey();
  return 'cloudflare-r2-sigv4';
}

export async function getFolderMetadata(folderId) {
  const prefix = normalizePrefix(folderId, DEFAULT_CONFIG_PREFIX);
  const query = new URLSearchParams({ 'list-type': '2', prefix: `${prefix}/`, 'max-keys': '1' });
  const response = await r2Request('GET', '', { query });
  await r2JsonResponse(response, `R2 prefix ${prefix} is not readable.`);
  return {
    id: prefix,
    key: prefix,
    name: prefix.split('/').pop() || prefix,
    mimeType: 'application/x-r2-prefix',
    driveId: null,
    capabilities: { canAddChildren: true },
    webViewLink: '',
    provider: 'cloudflare-r2',
    bucket: bucketName()
  };
}

export async function findFileInFolder(folderId, name) {
  const key = objectKey(folderId, name);
  const response = await r2Request('HEAD', key);
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(parseS3Error(text, `R2 object lookup failed with ${response.status}.`));
    error.statusCode = response.status;
    throw error;
  }
  return {
    id: key,
    key,
    name,
    mimeType: response.headers.get('content-type') || 'application/json',
    size: Number(response.headers.get('content-length') || 0),
    modifiedTime: response.headers.get('last-modified') || '',
    createdTime: response.headers.get('last-modified') || ''
  };
}

export async function headObjectByKey(key) {
  const objectKeyValue = normalizePrefix(key);
  if (!objectKeyValue) {
    const error = new Error('R2 object key is required.');
    error.statusCode = 400;
    throw error;
  }
  const response = await r2Request('HEAD', objectKeyValue);
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(parseS3Error(text, `R2 object lookup failed with ${response.status}.`));
    error.statusCode = response.status;
    throw error;
  }
  return {
    id: objectKeyValue,
    key: objectKeyValue,
    name: objectKeyValue.split('/').pop() || objectKeyValue,
    mimeType: response.headers.get('content-type') || 'application/octet-stream',
    size: Number(response.headers.get('content-length') || 0),
    modifiedTime: response.headers.get('last-modified') || '',
    createdTime: response.headers.get('last-modified') || '',
    etag: (response.headers.get('etag') || '').replace(/^"|"$/g, ''),
    provider: 'cloudflare-r2'
  };
}

export async function putObjectByKey(key, body, options = {}) {
  const objectKeyValue = normalizePrefix(key);
  if (!objectKeyValue) {
    const error = new Error('R2 object key is required.');
    error.statusCode = 400;
    throw error;
  }
  const headers = {
    'content-type': options.contentType || options.mimeType || 'application/octet-stream'
  };
  const metadata = options.metadata && typeof options.metadata === 'object' ? options.metadata : {};
  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    const metaKey = String(rawKey || '')
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!metaKey) continue;
    headers[`x-amz-meta-${metaKey}`] = appPropertyValue(rawValue, 900);
  }
  const response = await r2Request('PUT', objectKeyValue, { headers, body });
  const text = await response.text().catch(() => '');
  if (!response.ok) {
    const error = new Error(parseS3Error(text, `Could not write R2 object ${objectKeyValue}.`));
    error.statusCode = response.status;
    throw error;
  }
  return {
    id: objectKeyValue,
    key: objectKeyValue,
    name: objectKeyValue.split('/').pop() || objectKeyValue,
    size: Buffer.isBuffer(body) || body instanceof Uint8Array ? body.byteLength : Buffer.byteLength(String(body || '')),
    mimeType: headers['content-type'],
    etag: (response.headers.get('etag') || '').replace(/^"|"$/g, ''),
    provider: 'cloudflare-r2'
  };
}

export async function listJsonFilesByPrefix(folderId, prefix, pageSize = 100) {
  const keyPrefix = objectKey(folderId, prefix);
  const query = new URLSearchParams({
    'list-type': '2',
    prefix: keyPrefix,
    'max-keys': String(Math.min(1000, Math.max(1, Number(pageSize || 100))))
  });
  const response = await r2Request('GET', '', { query });
  const xml = await r2JsonResponse(response, `Could not list R2 prefix ${keyPrefix}.`);
  return parseListObjects(xml)
    .filter((item) => item.key.endsWith('.json'))
    .sort((a, b) => String(b.modifiedTime || '').localeCompare(String(a.modifiedTime || '')));
}

export async function downloadJsonFile(fileId, fallback = null) {
  const response = await r2Request('GET', fileId);
  if (response.status === 404 && fallback !== null) return fallback;
  const text = await r2JsonResponse(response, `Failed to download R2 JSON object ${fileId}.`);
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error(`R2 JSON object ${fileId} contains invalid JSON.`);
    error.statusCode = 500;
    throw error;
  }
}

export async function createJsonFile(folderId, name, data) {
  const key = objectKey(folderId, name);
  const body = JSON.stringify(data, null, 2);
  const response = await r2Request('PUT', key, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body
  });
  await r2JsonResponse(response, `Could not create R2 JSON object ${key}.`);
  return { id: key, key, name, webViewLink: '', createdTime: new Date().toISOString(), provider: 'cloudflare-r2' };
}

export async function updateJsonFile(fileId, data) {
  const body = JSON.stringify(data, null, 2);
  const response = await r2Request('PUT', fileId, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body
  });
  await r2JsonResponse(response, `Could not update R2 JSON object ${fileId}.`);
  return { id: fileId, key: fileId, name: fileId.split('/').pop(), modifiedTime: new Date().toISOString(), provider: 'cloudflare-r2' };
}

export async function upsertJsonFile(folderId, name, data) {
  const existing = await findFileInFolder(folderId, name);
  if (existing) {
    const updated = await updateJsonFile(existing.id, data);
    return { ...updated, created: false, id: existing.id };
  }
  const created = await createJsonFile(folderId, name, data);
  return { ...created, created: true };
}

export async function createAndTrashHealthcheck(folderId) {
  const created = await createJsonFile(folderId, `.skye-upload-vault-healthcheck-${Date.now()}.json`, {
    ok: true,
    checkedAt: new Date().toISOString(),
    provider: 'cloudflare-r2'
  });
  const response = await r2Request('DELETE', created.id);
  await r2JsonResponse(response, `Could not delete R2 healthcheck ${created.id}.`);
  return created;
}

export async function deleteDriveFile(fileId) {
  const key = String(fileId || '').trim();
  if (!key) {
    const error = new Error('R2 object key is required.');
    error.statusCode = 400;
    throw error;
  }
  const response = await r2Request('DELETE', key);
  if (response.status === 404) {
    return { id: key, key, deleted: false, missing: true, provider: 'cloudflare-r2' };
  }
  await r2JsonResponse(response, `Could not delete R2 object ${key}.`);
  return { id: key, key, deleted: true, missing: false, provider: 'cloudflare-r2' };
}

function appPropertyValue(value, max = 120) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function objectName(fileName) {
  const safe = String(fileName || 'upload.bin').replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 180) || 'upload.bin';
  return safe;
}

function metadataHeaders(upload, destination) {
  return {
    'x-amz-meta-source': 'client-drop-vault',
    'x-amz-meta-session-id': appPropertyValue(upload.sessionId),
    'x-amz-meta-destination-id': appPropertyValue(destination.id),
    'x-amz-meta-workspace-id': appPropertyValue(upload.workspaceId),
    'x-amz-meta-developer-id': appPropertyValue(upload.developerId),
    'x-amz-meta-custody-scope': appPropertyValue(upload.custodyScope),
    'x-amz-meta-vault-visibility': appPropertyValue(upload.vaultVisibility),
    'x-amz-meta-owner-account-id': appPropertyValue(upload.ownerAccountId),
    'x-amz-meta-owner-subject': appPropertyValue(upload.ownerSubject),
    'x-amz-meta-owner-workspace-id': appPropertyValue(upload.ownerWorkspaceId),
    'x-amz-meta-client-request-id': appPropertyValue(upload.clientRequestId),
    'x-amz-meta-submission-id': appPropertyValue(upload.submissionId),
    'x-amz-meta-file-fingerprint-algorithm': appPropertyValue(upload.fileFingerprint?.algorithm),
    'x-amz-meta-file-fingerprint-mode': appPropertyValue(upload.fileFingerprint?.mode),
    'x-amz-meta-file-fingerprint-value': appPropertyValue(upload.fileFingerprint?.value),
    'x-amz-meta-file-fingerprint-bytes': upload.fileFingerprint?.bytesHashed ? appPropertyValue(upload.fileFingerprint.bytesHashed) : '',
    'x-amz-meta-usage-rights-accepted': upload.usageRightsAccepted ? 'true' : 'false',
    'x-amz-meta-retention-acknowledged': upload.retentionAcknowledged ? 'true' : 'false'
  };
}

function chooseMultipartChunkSize(fileSize, chunkSizeBytes) {
  const size = Number(fileSize || 0);
  const requested = Math.max(MIN_MULTIPART_PART_BYTES, Number(chunkSizeBytes || 8 * 1024 * 1024));
  if (!Number.isFinite(size) || size <= 0) return requested;
  const minimumForPartCount = Math.ceil(size / MAX_MULTIPART_PARTS);
  const chunk = Math.min(MAX_MULTIPART_CHUNK_BYTES, Math.max(requested, minimumForPartCount, MIN_MULTIPART_PART_BYTES));
  return Math.ceil(chunk / (256 * 1024)) * 256 * 1024;
}

function partPlan(fileSize, chunkSizeBytes) {
  const size = Number(fileSize || 0);
  const chunk = chooseMultipartChunkSize(size, chunkSizeBytes);
  const count = Math.max(1, Math.ceil(size / chunk));
  if (count > MAX_MULTIPART_PARTS) {
    const error = new Error(`Multipart upload would require ${count} parts; the maximum is ${MAX_MULTIPART_PARTS}. Increase the chunk size or split the artifact.`);
    error.statusCode = 413;
    throw error;
  }
  return Array.from({ length: count }, (_, index) => {
    const start = index * chunk;
    const end = Math.min(size, start + chunk) - 1;
    return { partNumber: index + 1, start, end, size: Math.max(0, end - start + 1) };
  });
}

export async function createResumableSession(destination, upload) {
  const prefix = normalizePrefix(destination.folderId || destination.prefix || DEFAULT_UPLOAD_PREFIX, DEFAULT_UPLOAD_PREFIX);
  const workspacePrefix = upload.workspaceId ? `workspaces/${upload.workspaceId}` : '';
  const key = objectKey(prefix, [workspacePrefix, upload.sessionId, objectName(upload.fileName)].filter(Boolean).join('/'));
  const query = new URLSearchParams({ uploads: '' });
  const headers = {
    'content-type': upload.mimeType || 'application/octet-stream',
    ...metadataHeaders(upload, destination)
  };
  const response = await r2Request('POST', key, { query, headers, body: '' });
  const xml = await r2JsonResponse(response, `Could not create R2 multipart upload for ${destination.name}.`);
  const uploadId = parseXmlValue(xml, 'UploadId');
  if (!uploadId) {
    const error = new Error('R2 did not return a multipart upload ID.');
    error.statusCode = 502;
    throw error;
  }

  const expires = Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS || 6 * 60 * 60);
  const chunkSizeBytes = chooseMultipartChunkSize(upload.fileSize, Math.floor(Number(upload.chunkSizeMb || 8) * 1024 * 1024));
  const parts = partPlan(upload.fileSize, chunkSizeBytes).map((part) => ({
    ...part,
    uploadUrl: presignUrl('PUT', key, {
      expires,
      query: new URLSearchParams({ partNumber: String(part.partNumber), uploadId })
    })
  }));

  return {
    storageProvider: 'cloudflare-r2',
    uploadMode: 's3-multipart',
    uploadId,
    uploadUrl: parts[0]?.uploadUrl || '',
    objectKey: key,
    bucket: bucketName(),
    parts,
    expiresAt: new Date(Date.now() + expires * 1000).toISOString(),
    r2Object: {
      id: key,
      key,
      bucket: bucketName(),
      name: upload.fileName,
      size: String(upload.fileSize),
      mimeType: upload.mimeType || 'application/octet-stream'
    }
  };
}

export async function createStreamingMultipartSession(destination, upload) {
  const prefix = normalizePrefix(destination.folderId || destination.prefix || DEFAULT_UPLOAD_PREFIX, DEFAULT_UPLOAD_PREFIX);
  const workspacePrefix = upload.workspaceId ? `workspaces/${upload.workspaceId}` : '';
  const key = objectKey(prefix, [workspacePrefix, upload.sessionId, objectName(upload.fileName)].filter(Boolean).join('/'));
  const headers = {
    'content-type': upload.mimeType || 'application/octet-stream',
    ...metadataHeaders(upload, destination)
  };
  const response = await r2Request('POST', key, { query: new URLSearchParams({ uploads: '' }), headers, body: '' });
  const xml = await r2JsonResponse(response, `Could not create R2 streaming multipart upload for ${destination.name}.`);
  const uploadId = parseXmlValue(xml, 'UploadId');
  if (!uploadId) {
    const error = new Error('R2 did not return a multipart upload ID.');
    error.statusCode = 502;
    throw error;
  }
  const expires = Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS || 6 * 60 * 60);
  const chunkSizeBytes = chooseMultipartChunkSize(upload.fileSize, Math.floor(Number(upload.chunkSizeMb || 64) * 1024 * 1024));
  return {
    storageProvider: 'cloudflare-r2',
    uploadMode: 's3-multipart-streaming',
    uploadId,
    uploadUrl: '',
    objectKey: key,
    bucket: bucketName(),
    parts: [],
    chunkSize: chunkSizeBytes,
    maxParts: MAX_MULTIPART_PARTS,
    partUrlEndpoint: '/api/upload-part-url',
    expiresAt: new Date(Date.now() + expires * 1000).toISOString(),
    r2Object: {
      id: key,
      key,
      bucket: bucketName(),
      name: upload.fileName,
      size: String(upload.fileSize),
      mimeType: upload.mimeType || 'application/octet-stream'
    }
  };
}

export function createMultipartPartUrl(objectKeyValue, uploadId, partNumber, { expires = null } = {}) {
  const cleanPart = Number(partNumber);
  if (!Number.isInteger(cleanPart) || cleanPart < 1 || cleanPart > MAX_MULTIPART_PARTS) {
    const error = new Error(`Multipart part number must be between 1 and ${MAX_MULTIPART_PARTS}.`);
    error.statusCode = 400;
    throw error;
  }
  const cleanUploadId = String(uploadId || '').trim();
  if (!cleanUploadId) {
    const error = new Error('Multipart uploadId is required.');
    error.statusCode = 400;
    throw error;
  }
  return presignUrl('PUT', objectKeyValue, {
    expires: Number(expires || process.env.R2_PRESIGNED_URL_TTL_SECONDS || 6 * 60 * 60),
    query: new URLSearchParams({ partNumber: String(cleanPart), uploadId: cleanUploadId })
  });
}

export async function completeMultipartUpload(objectKeyValue, uploadId, parts = []) {
  const cleanParts = parts
    .map((part) => ({
      partNumber: Number(part.partNumber || part.PartNumber),
      eTag: String(part.eTag || part.ETag || '').trim()
    }))
    .filter((part) => Number.isFinite(part.partNumber) && part.eTag)
    .sort((a, b) => a.partNumber - b.partNumber);
  if (!cleanParts.length) {
    const error = new Error('No R2 multipart upload parts were supplied for completion.');
    error.statusCode = 400;
    throw error;
  }
  const body = [
    '<CompleteMultipartUpload>',
    ...cleanParts.map((part) => `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${xmlEscape(part.eTag)}</ETag></Part>`),
    '</CompleteMultipartUpload>'
  ].join('');
  const query = new URLSearchParams({ uploadId });
  const response = await r2Request('POST', objectKeyValue, {
    query,
    headers: { 'content-type': 'application/xml' },
    body
  });
  const xml = await r2JsonResponse(response, `Could not complete R2 multipart upload ${objectKeyValue}.`);
  return {
    id: objectKeyValue,
    key: objectKeyValue,
    bucket: bucketName(),
    etag: parseXmlValue(xml, 'ETag').replace(/^"|"$/g, ''),
    location: parseXmlValue(xml, 'Location')
  };
}

function appPropertiesFromHeaders(headers) {
  return {
    source: headers.get('x-amz-meta-source') || '',
    sessionId: headers.get('x-amz-meta-session-id') || '',
    destinationId: headers.get('x-amz-meta-destination-id') || '',
    workspaceId: headers.get('x-amz-meta-workspace-id') || '',
    developerId: headers.get('x-amz-meta-developer-id') || '',
    custodyScope: headers.get('x-amz-meta-custody-scope') || '',
    vaultVisibility: headers.get('x-amz-meta-vault-visibility') || '',
    ownerAccountId: headers.get('x-amz-meta-owner-account-id') || '',
    ownerSubject: headers.get('x-amz-meta-owner-subject') || '',
    ownerWorkspaceId: headers.get('x-amz-meta-owner-workspace-id') || '',
    clientRequestId: headers.get('x-amz-meta-client-request-id') || '',
    submissionId: headers.get('x-amz-meta-submission-id') || '',
    fileFingerprintAlgorithm: headers.get('x-amz-meta-file-fingerprint-algorithm') || '',
    fileFingerprintMode: headers.get('x-amz-meta-file-fingerprint-mode') || '',
    fileFingerprintValue: headers.get('x-amz-meta-file-fingerprint-value') || '',
    fileFingerprintBytes: headers.get('x-amz-meta-file-fingerprint-bytes') || '',
    usageRightsAccepted: headers.get('x-amz-meta-usage-rights-accepted') || '',
    retentionAcknowledged: headers.get('x-amz-meta-retention-acknowledged') || ''
  };
}

export async function getDriveFileMetadata(fileId) {
  const key = String(fileId || '').trim();
  if (!key) {
    const error = new Error('R2 object key is required.');
    error.statusCode = 400;
    throw error;
  }
  const response = await r2Request('HEAD', key);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(parseS3Error(text, `R2 object metadata lookup failed with ${response.status}.`));
    error.statusCode = response.status;
    throw error;
  }
  const parts = key.split('/');
  const parentPrefixes = [];
  for (let index = 1; index < parts.length; index += 1) {
    parentPrefixes.push(parts.slice(0, index).join('/'));
  }
  return {
    id: key,
    key,
    bucket: bucketName(),
    name: key.split('/').pop() || key,
    size: response.headers.get('content-length') || '0',
    mimeType: response.headers.get('content-type') || 'application/octet-stream',
    parents: parentPrefixes,
    appProperties: appPropertiesFromHeaders(response.headers),
    webViewLink: '',
    webContentLink: '',
    createdTime: '',
    modifiedTime: response.headers.get('last-modified') || '',
    md5Checksum: '',
    etag: response.headers.get('etag') || '',
    provider: 'cloudflare-r2'
  };
}

export function createDownloadUrl(fileId, { fileName = '', mimeType = '', expires = 900 } = {}) {
  const key = String(fileId || '').trim();
  if (!key) {
    const error = new Error('R2 object key is required.');
    error.statusCode = 400;
    throw error;
  }
  const safeName = objectName(fileName || key.split('/').pop() || 'vault-download.bin');
  const query = new URLSearchParams({
    'response-content-disposition': `attachment; filename="${safeName.replace(/"/g, '')}"`
  });
  if (mimeType) query.set('response-content-type', String(mimeType).slice(0, 160));
  return presignUrl('GET', key, { query, expires });
}

export function maxObjectBytes() {
  return MAX_SINGLE_OBJECT_BYTES;
}
