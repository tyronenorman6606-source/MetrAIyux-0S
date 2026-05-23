import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TEXT_DECODER_FIELDS = ['text', 'content'];
const DEFAULT_LIMITS = Object.freeze({
  maxFiles: 10_000,
  maxFileBytes: 2_500_000,
  maxTotalBytes: 25_000_000,
  maxVersions: 100,
});
const BLOCKED_PATH_SEGMENTS = new Set(['..', '.git', 'node_modules', '.env', '.ssh']);

export function normalizeIdentity(identity = {}) {
  const roles = Array.isArray(identity.roles) ? identity.roles.map(String) : [];
  return {
    tenantId: String(identity.tenantId || identity.tenant || 'unscoped'),
    userId: String(identity.userId || identity.sub || identity.email || 'anonymous'),
    roles: [...new Set(roles.map(r => r.toLowerCase()).filter(Boolean))],
    claims: identity.claims && typeof identity.claims === 'object' ? identity.claims : {},
  };
}

export function assertWorkspaceRole(identity = {}, required = ['owner', 'admin', 'operator']) {
  const normalized = normalizeIdentity(identity);
  const allowed = new Set(required.map(r => String(r).toLowerCase()));
  const ok = normalized.roles.some(role => allowed.has(role));
  if (!ok) {
    const err = new Error(`Workspace action blocked: inherited identity lacks one of [${[...allowed].join(', ')}]`);
    err.code = 'UPSTREAM_ROLE_REQUIRED';
    err.identity = normalized;
    throw err;
  }
  return normalized;
}

export function normalizeWorkspaceId(value) {
  const raw = String(value || '').trim();
  if (!raw) return `workspace_${Date.now().toString(36)}`;
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 96);
}

function normalizeStoredPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function mergeLimits(limits = {}) {
  return { ...DEFAULT_LIMITS, ...(limits || {}) };
}

function pathIssues(filePath) {
  const issues = [];
  if (!filePath) issues.push('path is required');
  if (path.isAbsolute(filePath)) issues.push('path cannot be absolute');
  if (/\0/.test(filePath)) issues.push('path cannot contain null bytes');
  const segments = filePath.split('/').filter(Boolean);
  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (BLOCKED_PATH_SEGMENTS.has(lower)) issues.push(`path cannot contain blocked segment: ${segment}`);
  }
  if (filePath.includes('..')) issues.push('path cannot contain ..');
  return issues;
}

export function validateWorkspaceSnapshot(snapshot = {}, options = {}) {
  const limits = mergeLimits(options.limits);
  const issues = [];
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) issues.push('snapshot must be an object');
  const files = Array.isArray(snapshot.files) ? snapshot.files : [];
  if (!files.length) issues.push('snapshot.files must include at least one file');
  if (files.length > limits.maxFiles) issues.push(`snapshot.files exceeds maxFiles ${limits.maxFiles}`);
  const seen = new Set();
  let totalBytes = 0;
  for (const [index, file] of files.entries()) {
    if (!file || typeof file !== 'object' || Array.isArray(file)) {
      issues.push(`files[${index}] must be an object`);
      continue;
    }
    const filePath = normalizeStoredPath(file.path);
    for (const problem of pathIssues(filePath)) issues.push(`files[${index}].${problem}`);
    if (seen.has(filePath)) issues.push(`duplicate file path: ${filePath}`);
    seen.add(filePath);
    const textField = TEXT_DECODER_FIELDS.find(field => typeof file[field] === 'string');
    const hasBase64 = typeof file.base64 === 'string';
    if (!textField && !hasBase64) issues.push(`${filePath || `files[${index}]`} must include text/content or base64`);
    const rawSize = Number(file.size || (textField ? file[textField].length : 0) || file.base64?.length || 0);
    const size = Number.isFinite(rawSize) && rawSize >= 0 ? rawSize : 0;
    if (size > limits.maxFileBytes) issues.push(`${filePath || `files[${index}]`} exceeds maxFileBytes ${limits.maxFileBytes}`);
    totalBytes += size;
  }
  if (totalBytes > limits.maxTotalBytes) issues.push(`snapshot totalBytes exceeds maxTotalBytes ${limits.maxTotalBytes}`);
  return { ok: issues.length === 0, issues, fileCount: files.length, totalBytes, limits };
}

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
async function exists(filePath) { try { await fs.access(filePath); return true; } catch { return false; } }
async function readJson(filePath, fallback = null) { try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return fallback; } }
async function atomicWriteJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(tmp, filePath);
}

function tenantDir(rootDir, tenantId) { return path.join(rootDir, normalizeWorkspaceId(tenantId)); }
function versionsDir(rootDir, tenantId, workspaceId) { return path.join(tenantDir(rootDir, tenantId), '_versions', normalizeWorkspaceId(workspaceId)); }
function workspaceFile(rootDir, tenantId, workspaceId) { return path.join(tenantDir(rootDir, tenantId), `${normalizeWorkspaceId(workspaceId)}.json`); }
function versionFile(rootDir, tenantId, workspaceId, versionId) { return path.join(versionsDir(rootDir, tenantId, workspaceId), `${normalizeWorkspaceId(versionId)}.json`); }
function publicRecord(record) { const { snapshot, ...meta } = record; return meta; }
function publicVersion(record) { const { snapshot, ...meta } = record; return meta; }

function hash(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function fileMap(snapshot = {}) {
  const out = new Map();
  for (const file of snapshot.files || []) {
    const filePath = normalizeStoredPath(file.path);
    out.set(filePath, {
      path: filePath,
      hash: hash(file.text ?? file.content ?? file.base64 ?? ''),
      size: Number(file.size || file.text?.length || file.content?.length || file.base64?.length || 0),
    });
  }
  return out;
}

export function createWorkspaceDiff(previousSnapshot = null, nextSnapshot = {}) {
  const before = fileMap(previousSnapshot || { files: [] });
  const after = fileMap(nextSnapshot || { files: [] });
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];
  for (const [filePath, file] of after.entries()) {
    if (!before.has(filePath)) added.push(filePath);
    else if (before.get(filePath).hash !== file.hash) changed.push(filePath);
    else unchanged.push(filePath);
  }
  for (const filePath of before.keys()) if (!after.has(filePath)) removed.push(filePath);
  return {
    added,
    changed,
    removed,
    unchanged: unchanged.length,
    summary: { added: added.length, changed: changed.length, removed: removed.length, unchanged: unchanged.length },
  };
}

function createVersionRecord({ record, previous, actor }) {
  const versionId = `${new Date(record.updatedAt).toISOString().replace(/[:.]/g, '-')}_${hash(`${record.id}:${record.updatedAt}:${record.updatedBy}`).slice(0, 10)}`;
  return {
    versionId,
    workspaceId: record.id,
    tenantId: actor.tenantId,
    name: record.name,
    fileCount: record.fileCount,
    totalBytes: record.totalBytes,
    entryPath: record.entryPath || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    updatedBy: actor.userId,
    previousVersionId: previous?.latestVersionId || null,
    previousUpdatedAt: previous?.updatedAt || null,
    diff: createWorkspaceDiff(previous?.snapshot || null, record.snapshot),
    snapshotHash: hash(record.snapshot),
    snapshot: record.snapshot,
  };
}

function buildRecord({ id, actor, name, snapshot, previous, validation, latestVersionId = null }) {
  const updatedAt = new Date().toISOString();
  return {
    id,
    tenantId: actor.tenantId,
    name: String(name || snapshot.name || id),
    fileCount: validation.fileCount,
    totalBytes: validation.totalBytes,
    entryPath: snapshot.entryPath || null,
    deterministic: snapshot.proof?.deterministic || null,
    latestVersionId,
    createdAt: previous?.createdAt || updatedAt,
    updatedAt,
    updatedBy: actor.userId,
    snapshotHash: hash(snapshot),
    snapshot,
  };
}

function assertExpectedVersion(previous, expectedLatestVersionId) {
  if (!expectedLatestVersionId || !previous) return;
  if (String(previous.latestVersionId || '') !== String(expectedLatestVersionId)) {
    const err = new Error(`Workspace conflict: expected latest version ${expectedLatestVersionId}, found ${previous.latestVersionId || 'none'}`);
    err.code = 'WORKSPACE_VERSION_CONFLICT';
    err.expectedLatestVersionId = expectedLatestVersionId;
    err.actualLatestVersionId = previous.latestVersionId || null;
    throw err;
  }
}

function pruneMemoryVersions(list, maxVersions) {
  return list.slice(0, Math.max(1, Number(maxVersions) || DEFAULT_LIMITS.maxVersions));
}

export function createMemoryWorkspaceStore({ limits = {}, maxVersions = DEFAULT_LIMITS.maxVersions } = {}) {
  const mergedLimits = mergeLimits({ ...limits, maxVersions });
  const records = new Map();
  const versions = new Map();
  const versionKey = (tenantId, workspaceId) => `${tenantId}:${workspaceId}`;
  return {
    async saveWorkspace({ identity, workspaceId, name, snapshot, expectedLatestVersionId = null }) {
      const actor = assertWorkspaceRole(identity);
      const validation = validateWorkspaceSnapshot(snapshot, { limits: mergedLimits });
      if (!validation.ok) {
        const err = new Error(`Workspace snapshot invalid: ${validation.issues.join('; ')}`);
        err.code = 'WORKSPACE_INVALID';
        err.validation = validation;
        throw err;
      }
      const id = normalizeWorkspaceId(workspaceId || snapshot.id || name);
      const key = `${actor.tenantId}:${id}`;
      const previous = records.get(key);
      assertExpectedVersion(previous, expectedLatestVersionId);
      let record = buildRecord({ id, actor, name, snapshot, previous, validation });
      const version = createVersionRecord({ record, previous, actor });
      record = { ...record, latestVersionId: version.versionId };
      records.set(key, record);
      const listKey = versionKey(actor.tenantId, id);
      const versionsForWorkspace = pruneMemoryVersions([version, ...(versions.get(listKey) || [])], mergedLimits.maxVersions);
      versions.set(listKey, versionsForWorkspace);
      return { ...publicRecord(record), latestVersionId: version.versionId, diff: version.diff };
    },
    async listWorkspaces({ identity }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      return [...records.values()].filter(r => r.tenantId === actor.tenantId).map(publicRecord).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async loadWorkspace({ identity, workspaceId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      return records.get(`${actor.tenantId}:${normalizeWorkspaceId(workspaceId)}`) || null;
    },
    async deleteWorkspace({ identity, workspaceId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin']);
      const id = normalizeWorkspaceId(workspaceId);
      versions.delete(versionKey(actor.tenantId, id));
      return records.delete(`${actor.tenantId}:${id}`);
    },
    async listWorkspaceVersions({ identity, workspaceId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      return (versions.get(versionKey(actor.tenantId, normalizeWorkspaceId(workspaceId))) || []).map(publicVersion);
    },
    async loadWorkspaceVersion({ identity, workspaceId, versionId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      const list = versions.get(versionKey(actor.tenantId, normalizeWorkspaceId(workspaceId))) || [];
      return list.find(v => v.versionId === versionId) || null;
    },
  };
}

async function pruneFileVersions({ rootDir, tenantId, workspaceId, maxVersions }) {
  const dir = versionsDir(rootDir, tenantId, workspaceId);
  if (!(await exists(dir))) return;
  const files = (await fs.readdir(dir)).filter(name => name.endsWith('.json')).sort().reverse();
  const keep = new Set(files.slice(0, Math.max(1, Number(maxVersions) || DEFAULT_LIMITS.maxVersions)));
  for (const file of files) if (!keep.has(file)) await fs.rm(path.join(dir, file), { force: true });
}

export function createFileWorkspaceStore({ rootDir = '.skaixu/workspaces', limits = {}, maxVersions = DEFAULT_LIMITS.maxVersions } = {}) {
  const mergedLimits = mergeLimits({ ...limits, maxVersions });
  return {
    async saveWorkspace({ identity, workspaceId, name, snapshot, expectedLatestVersionId = null }) {
      const actor = assertWorkspaceRole(identity);
      const validation = validateWorkspaceSnapshot(snapshot, { limits: mergedLimits });
      if (!validation.ok) {
        const err = new Error(`Workspace snapshot invalid: ${validation.issues.join('; ')}`);
        err.code = 'WORKSPACE_INVALID';
        err.validation = validation;
        throw err;
      }
      const id = normalizeWorkspaceId(workspaceId || snapshot.id || name);
      const dir = tenantDir(rootDir, actor.tenantId);
      await ensureDir(dir);
      const target = workspaceFile(rootDir, actor.tenantId, id);
      const previous = await readJson(target, null);
      assertExpectedVersion(previous, expectedLatestVersionId);
      let record = buildRecord({ id, actor, name, snapshot, previous, validation });
      const version = createVersionRecord({ record, previous, actor });
      record = { ...record, latestVersionId: version.versionId };
      await atomicWriteJson(target, record);
      await atomicWriteJson(versionFile(rootDir, actor.tenantId, id, version.versionId), version);
      await pruneFileVersions({ rootDir, tenantId: actor.tenantId, workspaceId: id, maxVersions: mergedLimits.maxVersions });
      await this.writeManifest({ identity: actor });
      return { ...publicRecord(record), latestVersionId: version.versionId, diff: version.diff };
    },
    async listWorkspaces({ identity }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      const dir = tenantDir(rootDir, actor.tenantId);
      if (!(await exists(dir))) return [];
      const files = (await fs.readdir(dir)).filter(name => name.endsWith('.json') && name !== 'manifest.json');
      const out = [];
      for (const file of files) {
        const record = await readJson(path.join(dir, file), null);
        if (record) out.push(publicRecord(record));
      }
      return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async loadWorkspace({ identity, workspaceId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      const target = workspaceFile(rootDir, actor.tenantId, workspaceId);
      if (!(await exists(target))) return null;
      return readJson(target, null);
    },
    async deleteWorkspace({ identity, workspaceId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin']);
      const id = normalizeWorkspaceId(workspaceId);
      const target = workspaceFile(rootDir, actor.tenantId, id);
      if (!(await exists(target))) return false;
      await fs.unlink(target);
      await fs.rm(versionsDir(rootDir, actor.tenantId, id), { recursive: true, force: true });
      await this.writeManifest({ identity: actor });
      return true;
    },
    async listWorkspaceVersions({ identity, workspaceId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      const dir = versionsDir(rootDir, actor.tenantId, workspaceId);
      if (!(await exists(dir))) return [];
      const files = (await fs.readdir(dir)).filter(name => name.endsWith('.json'));
      const out = [];
      for (const file of files) {
        const version = await readJson(path.join(dir, file), null);
        if (version) out.push(publicVersion(version));
      }
      return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async loadWorkspaceVersion({ identity, workspaceId, versionId }) {
      const actor = assertWorkspaceRole(identity, ['owner', 'admin', 'operator', 'viewer']);
      const target = versionFile(rootDir, actor.tenantId, workspaceId, versionId);
      if (!(await exists(target))) return null;
      return readJson(target, null);
    },
    async writeManifest({ identity }) {
      const actor = normalizeIdentity(identity);
      const dir = tenantDir(rootDir, actor.tenantId);
      await ensureDir(dir);
      const list = await this.listWorkspaces({ identity: { ...actor, roles: ['owner'] } });
      const manifest = { generatedAt: new Date().toISOString(), tenantId: actor.tenantId, workspaces: list };
      await atomicWriteJson(path.join(dir, 'manifest.json'), manifest);
      return manifest;
    },
  };
}
