import { createFileWorkspaceStore } from '../../src/platform/shared-workspace-store.mjs';

const store = createFileWorkspaceStore({ rootDir: process.env.SKAI_WORKSPACE_STORE_DIR || '/tmp/skaixu-workspaces' });

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': process.env.SKAI_CORS_ORIGIN || '*',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,x-skai-upstream-identity,x-skai-tenant-id,x-skai-user-id,x-skai-roles,x-skai-expected-version',
    },
    body: JSON.stringify(body),
  };
}

function header(event, name) {
  const target = name.toLowerCase();
  return Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === target)?.[1];
}

function parseIdentityHeader(value) {
  if (!value) return null;
  for (const encoding of ['base64url', 'base64']) {
    try { return JSON.parse(Buffer.from(value, encoding).toString('utf8')); }
    catch { /* try next */ }
  }
  return null;
}

function inheritedIdentity(event) {
  const encoded = header(event, 'x-skai-upstream-identity');
  const parsed = parseIdentityHeader(encoded);
  if (parsed) return parsed;
  return {
    tenantId: header(event, 'x-skai-tenant-id') || 'unscoped',
    userId: header(event, 'x-skai-user-id') || 'anonymous',
    roles: String(header(event, 'x-skai-roles') || '').split(',').map(s => s.trim()).filter(Boolean),
  };
}

function parseBody(event) {
  try { return event.body ? JSON.parse(event.body) : {}; }
  catch (error) {
    const err = new Error(`invalid_json: ${error.message}`);
    err.code = 'INVALID_JSON';
    throw err;
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, { ok: true });
  try {
    const identity = inheritedIdentity(event);
    const params = event.queryStringParameters || {};
    if (event.httpMethod === 'GET') {
      const workspaceId = params.id;
      if (params.action === 'versions' && workspaceId) return json(200, { ok: true, versions: await store.listWorkspaceVersions({ identity, workspaceId }) });
      if (params.action === 'version' && workspaceId && params.versionId) return json(200, { ok: true, version: await store.loadWorkspaceVersion({ identity, workspaceId, versionId: params.versionId }) });
      if (workspaceId) return json(200, { ok: true, workspace: await store.loadWorkspace({ identity, workspaceId }) });
      return json(200, { ok: true, workspaces: await store.listWorkspaces({ identity }) });
    }
    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      const snapshot = body.snapshot || body.workspace?.snapshot || body;
      const expectedLatestVersionId = body.expectedLatestVersionId || body.workspace?.expectedLatestVersionId || header(event, 'x-skai-expected-version') || null;
      const workspace = await store.saveWorkspace({
        identity,
        workspaceId: body.id || body.workspace?.id || snapshot.id,
        name: body.name || body.workspace?.name || snapshot.name,
        snapshot,
        expectedLatestVersionId,
      });
      return json(200, { ok: true, workspace });
    }
    if (event.httpMethod === 'DELETE') {
      const workspaceId = params.id;
      if (!workspaceId) return json(400, { ok: false, error: 'workspace id is required', code: 'WORKSPACE_ID_REQUIRED' });
      const deleted = await store.deleteWorkspace({ identity, workspaceId });
      return json(200, { ok: true, deleted });
    }
    return json(405, { ok: false, error: 'method_not_allowed' });
  } catch (error) {
    const status = error.code === 'UPSTREAM_ROLE_REQUIRED' ? 403 : (error.code === 'WORKSPACE_VERSION_CONFLICT' ? 409 : 400);
    return json(status, { ok: false, error: error.message, code: error.code || 'workspace_error', expectedLatestVersionId: error.expectedLatestVersionId, actualLatestVersionId: error.actualLatestVersionId });
  }
}
