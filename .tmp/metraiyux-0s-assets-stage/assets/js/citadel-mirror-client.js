(function initCitadelMirror(global) {
  const DEFAULT_BASE = '/api/citadel';

  function cleanText(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max || 1000);
  }

  function authHeaders(options) {
    const headers = { 'content-type': 'application/json' };
    const token = cleanText(options && options.token, 4000);
    if (token) headers.authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
    return headers;
  }

  async function post(base, path, body, options) {
    const response = await fetch(`${base || DEFAULT_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(options),
      body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({ ok: false, error: 'invalid_json_response' }));
    if (!response.ok || data.ok === false) {
      const error = new Error(data.error || `Citadel mirror request failed with ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function writeReceipt(input, source) {
    const body = input || {};
    return {
      source,
      appId: cleanText(body.appId || body.app_id || body.app || 'unknown-app', 160),
      workspaceId: cleanText(body.workspaceId || body.workspace_id || '', 180),
      table: cleanText(body.table || body.tableName || '', 180),
      recordId: cleanText(body.recordId || body.record_id || body.id || '', 240),
      operation: cleanText(body.operation || body.op || 'upsert', 60),
      checksum: cleanText(body.checksum || body.rowChecksum || '', 256),
      payloadRef: cleanText(body.payloadRef || body.payload_ref || '', 500),
      note: cleanText(body.note || body.message || '', 1000),
      neon: body.neon || undefined,
      citadel: body.citadel || undefined
    };
  }

  async function recordNeonWrite(input, options) {
    return post((options && options.base) || DEFAULT_BASE, '/dual-write-receipt', writeReceipt(input, 'neon'), options);
  }

  async function recordCitadelWrite(input, options) {
    return post((options && options.base) || DEFAULT_BASE, '/dual-write-receipt', writeReceipt(input, 'citadel'), options);
  }

  async function recordDualWrite(input, options) {
    return post((options && options.base) || DEFAULT_BASE, '/dual-write-receipt', writeReceipt(input, 'both'), options);
  }

  async function requestCatchup(input, options) {
    return post((options && options.base) || DEFAULT_BASE, '/catchup/request', {
      mode: cleanText(input && input.mode, 80) || 'neon_to_citadel',
      dryRun: !input || input.dryRun !== false,
      appId: cleanText(input && (input.appId || input.app_id), 160),
      table: cleanText(input && (input.table || input.tableName), 180),
      since: cleanText(input && (input.since || input.sinceUpdatedAt), 80),
      limit: Number(input && input.limit) || 1000
    }, options);
  }

  async function markMirrored(input, options) {
    return post((options && options.base) || DEFAULT_BASE, '/catchup/mark', {
      id: cleanText(input && (input.id || input.eventId || input.event_id), 180),
      ids: Array.isArray(input && input.ids) ? input.ids : undefined,
      citadelReceiptId: cleanText(input && (input.citadelReceiptId || input.receiptId), 180),
      writtenAt: cleanText(input && input.writtenAt, 80)
    }, options);
  }

  global.MetrAIyuxCitadelMirror = {
    recordNeonWrite,
    recordCitadelWrite,
    recordDualWrite,
    requestCatchup,
    markMirrored
  };
})(window);
