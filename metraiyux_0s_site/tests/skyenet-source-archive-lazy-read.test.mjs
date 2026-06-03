import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateRawSync, gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { handleSkyeNetDeployRequest } = await import('../skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs');

class MemoryKV {
  constructor() {
    this.map = new Map();
  }

  async put(key, value, options = {}) {
    this.map.set(key, { value: String(value), options });
  }

  async get(key, options = {}) {
    const stored = this.map.get(key);
    if (!stored) return null;
    return options?.type === 'json' ? JSON.parse(stored.value) : stored.value;
  }

  async list({ prefix = '', limit = 1000 } = {}) {
    return {
      keys: [...this.map.keys()]
        .filter((key) => key.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name, metadata: this.map.get(name)?.options?.metadata || null })),
      list_complete: true
    };
  }
}

class MemoryR2 {
  constructor() {
    this.map = new Map();
    this.getCalls = [];
  }

  async put(key, value, options = {}) {
    const body = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(await new Response(value).arrayBuffer());
    this.map.set(key, { body, options, size: body.byteLength, uploaded: new Date() });
  }

  async get(key, options = {}) {
    this.getCalls.push({ key, options });
    const stored = this.map.get(key);
    if (!stored) return null;
    const range = options?.range;
    const body = range && Number.isFinite(range.offset) && Number.isFinite(range.length)
      ? stored.body.slice(Math.max(0, range.offset), Math.max(0, range.offset) + Math.max(0, range.length))
      : stored.body;
    return {
      key,
      size: body.byteLength,
      body: new Response(body).body,
      async text() {
        return new TextDecoder().decode(body);
      },
      async arrayBuffer() {
        return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
      },
      async json() {
        return JSON.parse(await this.text());
      },
      writeHttpMetadata(headers) {
        const type = stored.options?.httpMetadata?.contentType;
        if (type) headers.set('content-type', type);
      }
    };
  }
}

function env() {
  const kv = new MemoryKV();
  const bucket = new MemoryR2();
  return {
    bucket,
    DEPLOYMENT_ASSET_BUCKET: bucket,
    SKYENET_SOURCE_TRANSFER_BUCKET: bucket,
    ROUTING_KV: kv,
    SKYENET_WORKSPACES_KV: kv,
    SKYENET_RECEIPTS_KV: kv
  };
}

function headers(extra = {}) {
  return {
    authorization: 'Bearer source-archive-test-session',
    'x-0s-customer-id': '42',
    'x-0s-role': 'owner',
    'x-0s-admin-override': 'true',
    'x-0s-email': 'owner@example.invalid',
    ...extra
  };
}

async function call(e, pathname, { method = 'GET', body, contentType = 'application/json' } = {}) {
  const response = await handleSkyeNetDeployRequest(new Request(`https://fs27.example.test${pathname}`, {
    method,
    headers: headers({ 'content-type': contentType }),
    body
  }), { env: e });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function callRaw(e, pathname, { method = 'GET', body, contentType = 'application/json' } = {}) {
  const response = await handleSkyeNetDeployRequest(new Request(`https://fs27.example.test${pathname}`, {
    method,
    headers: headers({ 'content-type': contentType }),
    body
  }), { env: e });
  const text = await response.text().catch(() => '');
  return { response, text };
}

function octal(value, width) {
  return String(value.toString(8)).padStart(width - 1, '0').slice(0, width - 1) + '\0';
}

function tarHeader(name, size) {
  const header = new Uint8Array(512);
  const text = new TextEncoder();
  header.set(text.encode(name).slice(0, 100), 0);
  header.set(text.encode(octal(0o644, 8)), 100);
  header.set(text.encode(octal(0, 8)), 108);
  header.set(text.encode(octal(0, 8)), 116);
  header.set(text.encode(octal(size, 12)), 124);
  header.set(text.encode(octal(0, 12)), 136);
  header.fill(32, 148, 156);
  header[156] = '0'.charCodeAt(0);
  header.set(text.encode('ustar\0'), 257);
  header.set(text.encode('00'), 263);
  let sum = 0;
  for (const byte of header) sum += byte;
  header.set(text.encode(octal(sum, 8)), 148);
  return header;
}

function tarPadding(size) {
  const remainder = size % 512;
  return remainder ? new Uint8Array(512 - remainder) : new Uint8Array();
}

function tarBytes(entries) {
  const chunks = [];
  for (const entry of entries) {
    const body = new TextEncoder().encode(entry.text);
    chunks.push(tarHeader(entry.path, body.byteLength), body, tarPadding(body.byteLength));
  }
  chunks.push(new Uint8Array(1024));
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const tar = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    tar.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return tar;
}

function tarGz(entries) {
  return gzipSync(tarBytes(entries));
}

function zstdCliAvailable() {
  const result = spawnSync('zstd', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
}

function tarZst(entries) {
  const tar = tarBytes(entries);
  const result = spawnSync('zstd', ['-q', '-c', '-3'], {
    input: Buffer.from(tar),
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`zstd failed: ${result.stderr?.toString?.() || 'unknown error'}`);
  }
  return new Uint8Array(result.stdout);
}

function le16(value) {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
}

function le32(value) {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function zipDeflated(entries) {
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const body = encoder.encode(entry.text);
    const compressed = deflateRawSync(body);
    const localHeader = concatBytes([
      le32(0x04034b50),
      le16(20),
      le16(0x0800),
      le16(8),
      le16(0),
      le16(0),
      le32(0),
      le32(compressed.byteLength),
      le32(body.byteLength),
      le16(name.byteLength),
      le16(0)
    ]);
    localChunks.push(localHeader, name, compressed);
    centralChunks.push(concatBytes([
      le32(0x02014b50),
      le16(20),
      le16(20),
      le16(0x0800),
      le16(8),
      le16(0),
      le16(0),
      le32(0),
      le32(compressed.byteLength),
      le32(body.byteLength),
      le16(name.byteLength),
      le16(0),
      le16(0),
      le16(0),
      le16(0),
      le32(0),
      le32(localOffset)
    ]), name);
    localOffset += localHeader.byteLength + name.byteLength + compressed.byteLength;
  }
  const centralDir = concatBytes(centralChunks);
  const eocd = concatBytes([
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(entries.length),
    le16(entries.length),
    le32(centralDir.byteLength),
    le32(localOffset),
    le16(0)
  ]);
  return concatBytes([...localChunks, centralDir, eocd]);
}

test('source-file reads a named file from archive-backed tar.gz without materializing every source file', async () => {
  const e = env();
  const workspaceId = 'archive-lazy';
  const projectId = 'archive-backed-project';
  const deploymentId = 'dep_archive_lazy';
  const targetPath = 'src/arbitrary-target.txt';
  const fileCount = 1200;
  const entries = [
    { path: 'README.md', text: 'archive-backed package\n' },
    { path: 'src/bootstrap.js', text: 'console.log("boot");\n' },
    { path: targetPath, text: 'TARGET: archive lazy read works\n' },
    ...Array.from({ length: fileCount - 3 }, (_, index) => ({
      path: `vendor/generated/file-${String(index).padStart(4, '0')}.txt`,
      text: `trailing file ${index}\n`
    }))
  ];
  const index = entries.map((entry) => JSON.stringify({
    path: entry.path,
    size: new TextEncoder().encode(entry.text).byteLength,
    content_type: 'text/plain; charset=utf-8'
  })).join('\n') + '\n';

  const indexUpload = await call(e, `/deploy/source-index?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}`, {
    method: 'PUT',
    body: index,
    contentType: 'application/x-ndjson; charset=utf-8'
  });
  assert.equal(indexUpload.response.status, 200);
  assert.equal(indexUpload.data.source_index.file_count, fileCount);

  const archive = tarGz(entries);
  const archiveUpload = await call(e, `/deploy/source-archive?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&filename=source.tar.gz`, {
    method: 'PUT',
    body: archive,
    contentType: 'application/gzip'
  });
  assert.equal(archiveUpload.response.status, 200);
  assert.equal(archiveUpload.data.source_archive.filename, 'source.tar.gz');

  const read = await call(e, `/deploy/source-file?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${encodeURIComponent(targetPath)}`);
  assert.equal(read.response.status, 200);
  assert.equal(read.data.path, targetPath);
  assert.equal(read.data.text, 'TARGET: archive lazy read works\n');
  assert.equal(read.data.archive_lazy_read.decompressed_stream, true);
  assert.equal(read.data.archive_lazy_read.compression, 'gzip');
  assert.ok(read.data.archive_lazy_read.scanned_entries < 10, 'scanner should stop after the target entry, not walk every file');
  assert.equal(read.data.source_package.file_count, fileCount);

  const materializedTargetKey = [...e.bucket.map.keys()].find((key) => key.endsWith(`/${targetPath}`));
  assert.equal(materializedTargetKey, undefined, 'source-file must not extract the target as a separate R2 object');
  assert.equal([...e.bucket.map.keys()].some((key) => key.includes('/vendor/generated/file-1196.txt')), false, 'trailing archive files must not be materialized');
});

test('source-file reads a named deflated file from archive-backed zip without materializing every source file', async () => {
  const e = env();
  const workspaceId = 'archive-lazy';
  const projectId = 'archive-backed-zip-project';
  const deploymentId = 'dep_archive_lazy_zip';
  const targetPath = 'src/arbitrary-target.txt';
  const fileCount = 1200;
  const entries = [
    { path: 'README.md', text: 'zip archive-backed package\n' },
    { path: 'src/bootstrap.js', text: 'console.log("zip boot");\n' },
    { path: targetPath, text: 'TARGET: zip archive lazy read works\n' },
    ...Array.from({ length: fileCount - 3 }, (_, index) => ({
      path: `vendor/generated/file-${String(index).padStart(4, '0')}.txt`,
      text: `trailing zip file ${index}\n`
    }))
  ];
  const index = entries.map((entry) => JSON.stringify({
    path: entry.path,
    size: new TextEncoder().encode(entry.text).byteLength,
    content_type: 'text/plain; charset=utf-8'
  })).join('\n') + '\n';

  const indexUpload = await call(e, `/deploy/source-index?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}`, {
    method: 'PUT',
    body: index,
    contentType: 'application/x-ndjson; charset=utf-8'
  });
  assert.equal(indexUpload.response.status, 200);
  assert.equal(indexUpload.data.source_index.file_count, fileCount);

  const archive = zipDeflated(entries);
  const archiveUpload = await call(e, `/deploy/source-archive?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&filename=source.zip`, {
    method: 'PUT',
    body: archive,
    contentType: 'application/zip'
  });
  assert.equal(archiveUpload.response.status, 200);
  assert.equal(archiveUpload.data.source_archive.filename, 'source.zip');

  const read = await call(e, `/deploy/source-file?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${encodeURIComponent(targetPath)}`);
  assert.equal(read.response.status, 200);
  assert.equal(read.data.path, targetPath);
  assert.equal(read.data.text, 'TARGET: zip archive lazy read works\n');
  assert.equal(read.data.archive_lazy_read.compression, 'zip');
  assert.equal(read.data.archive_lazy_read.zip_method, 'deflate');
  assert.ok(read.data.archive_lazy_read.scanned_entries < 10, 'central directory scan should stop after the target entry');
  assert.equal(read.data.archive_lazy_read.materialized_file_object, false);
  assert.equal(read.data.source_package.file_count, fileCount);

  const materializedTargetKey = [...e.bucket.map.keys()].find((key) => key.endsWith(`/${targetPath}`));
  assert.equal(materializedTargetKey, undefined, 'source-file must not extract the zip target as a separate R2 object');
  assert.equal([...e.bucket.map.keys()].some((key) => key.includes('/vendor/generated/file-1196.txt')), false, 'trailing zip files must not be materialized');
});

test('source-file reads a named file from archive-backed tar.zst without materializing every source file', { skip: zstdCliAvailable() ? false : 'zstd CLI unavailable' }, async () => {
  const e = env();
  const workspaceId = 'archive-lazy';
  const projectId = 'archive-backed-zstd-project';
  const deploymentId = 'dep_archive_lazy_zstd';
  const targetPath = 'src/arbitrary-target.txt';
  const fileCount = 1200;
  const entries = [
    { path: 'README.md', text: 'zstd archive-backed package\n' },
    { path: 'src/bootstrap.js', text: 'console.log("zstd boot");\n' },
    { path: targetPath, text: 'TARGET: zstd archive lazy read works\n' },
    ...Array.from({ length: fileCount - 3 }, (_, index) => ({
      path: `vendor/generated/file-${String(index).padStart(4, '0')}.txt`,
      text: `trailing zstd file ${index}\n`
    }))
  ];
  const index = entries.map((entry) => JSON.stringify({
    path: entry.path,
    size: new TextEncoder().encode(entry.text).byteLength,
    content_type: 'text/plain; charset=utf-8'
  })).join('\n') + '\n';

  const indexUpload = await call(e, `/deploy/source-index?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}`, {
    method: 'PUT',
    body: index,
    contentType: 'application/x-ndjson; charset=utf-8'
  });
  assert.equal(indexUpload.response.status, 200);
  assert.equal(indexUpload.data.source_index.file_count, fileCount);

  const archive = tarZst(entries);
  const archiveUpload = await call(e, `/deploy/source-archive?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&filename=source.tar.zst`, {
    method: 'PUT',
    body: archive,
    contentType: 'application/zstd'
  });
  assert.equal(archiveUpload.response.status, 200);
  assert.equal(archiveUpload.data.source_archive.filename, 'source.tar.zst');

  const read = await call(e, `/deploy/source-file?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${encodeURIComponent(targetPath)}`);
  assert.equal(read.response.status, 200);
  assert.equal(read.data.path, targetPath);
  assert.equal(read.data.text, 'TARGET: zstd archive lazy read works\n');
  assert.equal(read.data.archive_lazy_read.decompressed_stream, true);
  assert.equal(read.data.archive_lazy_read.compression, 'zstd');
  assert.ok(read.data.archive_lazy_read.scanned_entries < 10, 'zstd tar scanner should stop after the target entry');
  assert.equal(read.data.archive_lazy_read.materialized_file_object, false);
  assert.equal(read.data.source_package.file_count, fileCount);

  const raw = await callRaw(e, `/deploy/source-file?workspace_id=${workspaceId}&project_id=${projectId}&deployment_id=${deploymentId}&path=${encodeURIComponent(targetPath)}&raw=1`);
  assert.equal(raw.response.status, 200);
  assert.equal(raw.text, 'TARGET: zstd archive lazy read works\n');
  assert.equal(raw.response.headers.get('x-skynet-source-file-mode'), 'archive-lazy-zstd');
  assert.equal(raw.response.headers.get('x-skynet-source-archive-compression'), 'zstd');

  const materializedTargetKey = [...e.bucket.map.keys()].find((key) => key.endsWith(`/${targetPath}`));
  assert.equal(materializedTargetKey, undefined, 'source-file must not extract the zstd target as a separate R2 object');
  assert.equal([...e.bucket.map.keys()].some((key) => key.includes('/vendor/generated/file-1196.txt')), false, 'trailing zstd files must not be materialized');
});
