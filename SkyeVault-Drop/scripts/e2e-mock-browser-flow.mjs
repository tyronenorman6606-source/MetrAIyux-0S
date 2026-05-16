import http from 'node:http';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const sessions = new Map();
const receipts = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJson(buffer) {
  return buffer.length ? JSON.parse(buffer.toString('utf8')) : {};
}

function parseRange(header) {
  const query = String(header || '').match(/^bytes \*\/(\d+)$/i);
  if (query) return { query: true, total: Number(query[1]) };
  const chunk = String(header || '').match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
  if (!chunk) return null;
  return { start: Number(chunk[1]), end: Number(chunk[2]), total: Number(chunk[3]) };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/api/public-config') {
      return send(res, 200, {
        ok: true,
        config: {
          brandName: 'Mock SkyeVault-Drop',
          portalKeyRequired: true,
          chunkSizeMb: 0.25,
          blockedExtensions: ['.exe'],
          maxFilesPerSubmission: 10,
          maxTotalSubmissionGb: 5,
          destinations: [{ id: 'primary', name: 'Primary Intake', role: 'primary', maxFileSizeGb: 5, accept: '*' }]
        }
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/upload-session') {
      const body = parseJson(await readBody(req));
      assert.equal(req.headers['x-portal-key'], 'test-client-code');
      assert.equal(body.usageRightsAccepted, true);
      assert.equal(body.retentionAcknowledged, true);
      assert.ok(body.clientName);
      assert.ok(body.fileName);
      assert.equal(body.companyWebsite || '', '');
      const sessionId = `mock_${crypto.randomBytes(6).toString('hex')}`;
      sessions.set(sessionId, { sessionId, uploaded: 0, size: Number(body.fileSize), fileName: body.fileName, body });
      return send(res, 200, {
        ok: true,
        storageProvider: 'cloudflare-r2',
        uploadMode: 's3-multipart',
        sessionId,
        submissionId: body.submissionId,
        uploadId: `upload_${sessionId}`,
        objectKey: `client-uploads/primary/${sessionId}/${body.fileName}`,
        bucket: 'mock-r2',
        uploadUrl: `${origin}/mock-r2/upload/${sessionId}/1`,
        parts: [{ partNumber: 1, start: 0, end: Number(body.fileSize) - 1, size: Number(body.fileSize), uploadUrl: `${origin}/mock-r2/upload/${sessionId}/1` }],
        r2Object: { id: `client-uploads/primary/${sessionId}/${body.fileName}`, key: `client-uploads/primary/${sessionId}/${body.fileName}`, bucket: 'mock-r2', name: body.fileName, size: String(body.fileSize), mimeType: body.mimeType },
        chunkSize: 256 * 1024,
        destination: { id: 'primary', name: 'Primary Intake', role: 'primary', priority: 1 },
        file: { name: body.fileName, size: body.fileSize, mimeType: body.mimeType },
        manifest: { id: sessionId, status: 'pending' }
      });
    }
    if (req.method === 'PUT' && url.pathname.startsWith('/mock-r2/upload/')) {
      const parts = url.pathname.split('/');
      const sessionId = parts.at(-2);
      const partNumber = Number(parts.at(-1));
      const session = sessions.get(sessionId);
      if (!session) return send(res, 404, { ok: false, error: 'session missing' });
      const body = await readBody(req);
      session.uploaded += body.length;
      res.writeHead(200, { etag: `"mock-etag-${partNumber}"` });
      return res.end();
    }
    if (req.method === 'PUT' && url.pathname.startsWith('/mock-drive/upload/')) {
      const sessionId = url.pathname.split('/').pop();
      const session = sessions.get(sessionId);
      if (!session) return send(res, 404, { ok: false, error: 'session missing' });
      const range = parseRange(req.headers['content-range']);
      if (!range) return send(res, 400, { ok: false, error: 'bad content-range' });
      if (range.query) {
        if (session.uploaded > 0) {
          res.writeHead(308, { range: `bytes=0-${session.uploaded - 1}` });
          return res.end();
        }
        res.writeHead(308);
        return res.end();
      }
      const body = await readBody(req);
      assert.equal(range.start, session.uploaded);
      assert.equal(body.length, range.end - range.start + 1);
      session.uploaded = range.end + 1;
      if (session.uploaded < session.size) {
        res.writeHead(308, { range: `bytes=0-${session.uploaded - 1}` });
        return res.end();
      }
      return send(res, 200, {
        id: `drive_${sessionId}`,
        name: session.fileName,
        size: String(session.size),
        mimeType: session.body.mimeType,
        webViewLink: `https://drive.example/${sessionId}`,
        appProperties: { source: 'client-drop-vault', sessionId, destinationId: 'primary' }
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/upload-complete') {
      const body = parseJson(await readBody(req));
      assert.equal(req.headers['x-portal-key'], 'test-client-code');
      assert.ok(sessions.has(body.sessionId));
      assert.ok(body.driveFileId);
      assert.ok(body.driveFile?.uploadId);
      assert.ok(Array.isArray(body.driveFile?.parts));
      const receiptId = `receipt_${body.sessionId}`;
      const entry = {
        id: receiptId,
        sessionId: body.sessionId,
        submissionId: body.submissionId,
        fileName: body.fileName,
        fileSize: body.fileSize,
        destinationName: body.destinationName,
        completedAt: new Date().toISOString(),
        receiptSignature: crypto.createHash('sha256').update(receiptId).digest('hex')
      };
      receipts.set(receiptId, entry);
      return send(res, 200, { ok: true, entry, receipt: { id: receiptId, created: true }, manifest: { id: body.sessionId, updated: true } });
    }
    if (req.method === 'POST' && url.pathname === '/api/upload-status') {
      const body = parseJson(await readBody(req));
      assert.equal(req.headers['x-portal-key'], 'test-client-code');
      const manifest = body.sessionId && sessions.get(body.sessionId);
      const receipt = body.receiptId
        ? receipts.get(body.receiptId)
        : Array.from(receipts.values()).find((item) => item.sessionId === body.sessionId);
      return send(res, 200, {
        ok: true,
        manifest: manifest ? { status: receipt ? 'complete' : 'pending', sessionId: manifest.sessionId, file: { name: manifest.fileName, size: manifest.size } } : null,
        receipt: receipt || null
      });
    }
    send(res, 404, { ok: false, error: `No mock route for ${req.method} ${url.pathname}` });
  } catch (error) {
    send(res, 500, { ok: false, error: error.message, stack: error.stack });
  }
});

let origin = '';

function listen() {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      origin = `http://127.0.0.1:${port}`;
      resolve(origin);
    });
  });
}

async function api(path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: path === '/api/public-config' ? 'GET' : 'POST',
    headers: path === '/api/public-config' ? {} : { 'content-type': 'application/json', 'x-portal-key': 'test-client-code' },
    body: path === '/api/public-config' ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, data.error || `HTTP ${response.status}`);
  return data;
}

async function putChunk(uploadUrl, bytes, start, end, total) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': 'application/octet-stream',
      'content-range': `bytes ${start}-${end}/${total}`
    },
    body: bytes.subarray(start, end + 1)
  });
  return response;
}

async function queryOffset(uploadUrl, total) {
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-range': `bytes */${total}` } });
  assert.equal(response.status, 308);
  const range = response.headers.get('range') || '';
  const match = range.match(/bytes=0-(\d+)/);
  return match ? Number(match[1]) + 1 : 0;
}

await listen();
try {
  const publicConfig = await api('/api/public-config');
  assert.equal(publicConfig.config.portalKeyRequired, true);

  const fileBytes = crypto.randomBytes(700 * 1024);
  const payload = {
    clientName: 'Proof Client',
    clientEmail: 'client@example.com',
    projectName: 'Mock Browser Upload',
    notes: 'Mock browser proof path.',
    companyWebsite: '',
    usageRightsAccepted: true,
    retentionAcknowledged: true,
    portalKey: 'test-client-code',
    destinationId: '',
    clientRequestId: 'req_mock_browser',
    submissionId: 'sub_mock_browser',
    submissionFileCount: 1,
    submissionTotalBytes: fileBytes.length,
    fileName: 'mock-4k-proof-fragment.bin',
    fileSize: fileBytes.length,
    mimeType: 'application/octet-stream'
  };

  const session = await api('/api/upload-session', payload);
  assert.ok(session.uploadUrl);
  assert.equal(session.destination.id, 'primary');

  const completedParts = [];
  for (const part of session.parts) {
    const response = await fetch(part.uploadUrl, { method: 'PUT', body: fileBytes.subarray(part.start, part.end + 1) });
    assert.equal(response.ok, true);
    completedParts.push({ partNumber: part.partNumber, eTag: (response.headers.get('etag') || '').replace(/^"|"$/g, '') });
  }
  const driveFile = { ...session.r2Object, id: session.objectKey, key: session.objectKey, uploadId: session.uploadId, parts: completedParts };
  assert.ok(driveFile?.id);

  const complete = await api('/api/upload-complete', {
    ...payload,
    sessionId: session.sessionId,
    destinationId: session.destination.id,
    destinationName: session.destination.name,
    driveFileId: driveFile.id,
    driveFile
  });
  assert.equal(complete.ok, true);
  assert.ok(complete.entry.receiptSignature);

  const statusBySession = await api('/api/upload-status', { portalKey: 'test-client-code', sessionId: session.sessionId });
  assert.equal(statusBySession.manifest.status, 'complete');
  const statusByReceipt = await api('/api/upload-status', { portalKey: 'test-client-code', receiptId: complete.entry.id });
  assert.equal(statusByReceipt.receipt.id, complete.entry.id);

  console.log('✅ Mock browser E2E passed: public config, session create, R2 multipart upload, completion, receipt, and status lookup.');
} finally {
  server.close();
}
