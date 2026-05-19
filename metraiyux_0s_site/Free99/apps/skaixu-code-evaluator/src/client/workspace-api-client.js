export function encodeIdentity(identity = {}) {
  const json = JSON.stringify(identity || {});
  const utf8 = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of utf8) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function workspaceIdentityHeaders(identity = {}) {
  const normalized = identity && typeof identity === 'object' ? identity : {};
  return {
    'X-SKAI-Upstream-Identity': encodeIdentity(normalized),
    'X-SKAI-Tenant-Id': String(normalized.tenantId || normalized.tenant || 'unscoped'),
    'X-SKAI-User-Id': String(normalized.userId || normalized.sub || normalized.email || 'anonymous'),
    'X-SKAI-Roles': Array.isArray(normalized.roles) ? normalized.roles.join(',') : '',
  };
}

export function workspaceUrl(endpoint, params = {}) {
  const url = new URL(endpoint, window.location.href);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  return url.toString();
}

export async function pushWorkspace({ endpoint, identity, workspace }) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...workspaceIdentityHeaders(identity) },
    body: JSON.stringify({ id: workspace.id, name: workspace.name, snapshot: workspace, expectedLatestVersionId: workspace.expectedLatestVersionId || workspace.latestVersionId || null }),
  });
  const data = await res.json().catch(async () => ({ ok: false, error: await res.text().catch(() => res.statusText) }));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Workspace API ${res.status}`);
  return data.workspace || data;
}

export async function pullWorkspace({ endpoint, identity, id }) {
  const res = await fetch(workspaceUrl(endpoint, { id }), { headers: workspaceIdentityHeaders(identity) });
  const data = await res.json().catch(async () => ({ ok: false, error: await res.text().catch(() => res.statusText) }));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Workspace API ${res.status}`);
  return data.workspace?.snapshot || data.workspace || data;
}

export async function listWorkspaceVersions({ endpoint, identity, id }) {
  const res = await fetch(workspaceUrl(endpoint, { action: 'versions', id }), { headers: workspaceIdentityHeaders(identity) });
  const data = await res.json().catch(async () => ({ ok: false, error: await res.text().catch(() => res.statusText) }));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Workspace API ${res.status}`);
  return data.versions || [];
}
