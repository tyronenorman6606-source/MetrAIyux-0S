import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIRECT_PROVIDER_RE = /https:\/\/api\.openai\.com|anthropic\.com\/v1|generativelanguage\.googleapis\.com|api\.mistral\.ai|api\.groq\.com/i;

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
async function readJsonMaybe(filePath, fallback) { try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return fallback; } }

export function normalizeProviderPack(pack = {}) {
  const id = String(pack.id || pack.name || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return {
    id,
    name: String(pack.name || id || 'Unnamed provider pack'),
    version: String(pack.version || '0.0.0'),
    description: String(pack.description || ''),
    gatewayOnly: pack.gatewayOnly !== false,
    endpoints: Array.isArray(pack.endpoints) ? pack.endpoints : [],
    capabilities: Array.isArray(pack.capabilities) ? pack.capabilities.map(String) : [],
    policies: Array.isArray(pack.policies) ? pack.policies : [],
    raw: pack,
  };
}

export function validateProviderPack(pack = {}) {
  const normalized = normalizeProviderPack(pack);
  const issues = [];
  if (!normalized.id) issues.push({ severity: 'high', message: 'Provider pack missing id/name' });
  if (!normalized.gatewayOnly) issues.push({ severity: 'high', message: 'Provider pack must route through gatewayOnly=true' });
  for (const endpoint of normalized.endpoints) {
    const url = typeof endpoint === 'string' ? endpoint : endpoint.url || endpoint.href || '';
    if (DIRECT_PROVIDER_RE.test(url)) issues.push({ severity: 'high', message: `Direct provider endpoint blocked: ${url}` });
  }
  return { ok: !issues.some(i => i.severity === 'high'), pack: normalized, issues };
}

export function auditProviderRegistry(registry = {}) {
  const packs = Object.values(registry.packs || registry || {}).map(normalizeProviderPack);
  const results = packs.map(pack => validateProviderPack(pack));
  return {
    ok: results.every(r => r.ok),
    total: results.length,
    enabled: packs.filter(p => p.enabled !== false).length,
    issues: results.flatMap(r => r.issues.map(issue => ({ ...issue, packId: r.pack.id }))),
    packs,
  };
}

export function createProviderRegistry({ registryPath = 'platform-ledgers/provider-registry.json' } = {}) {
  const fullPath = path.resolve(registryPath);
  return {
    async load() {
      return readJsonMaybe(fullPath, { generatedAt: new Date().toISOString(), packs: {} });
    },
    async save(registry) {
      await ensureDir(path.dirname(fullPath));
      const next = { ...registry, generatedAt: new Date().toISOString() };
      await fs.writeFile(fullPath, `${JSON.stringify(next, null, 2)}\n`);
      return next;
    },
    async install(pack, { enabled = true } = {}) {
      const validation = validateProviderPack(pack);
      if (!validation.ok) {
        const err = new Error(`Provider pack rejected: ${validation.issues.map(i => i.message).join('; ')}`);
        err.code = 'PROVIDER_PACK_REJECTED';
        err.validation = validation;
        throw err;
      }
      const registry = await this.load();
      registry.packs ||= {};
      registry.packs[validation.pack.id] = { ...validation.pack, enabled, installedAt: new Date().toISOString() };
      return this.save(registry);
    },
    async setEnabled(id, enabled) {
      const registry = await this.load();
      const packId = String(id || '').toLowerCase();
      if (!registry.packs?.[packId]) throw new Error(`Provider pack not installed: ${packId}`);
      registry.packs[packId].enabled = Boolean(enabled);
      registry.packs[packId].updatedAt = new Date().toISOString();
      return this.save(registry);
    },
    async audit() {
      return auditProviderRegistry(await this.load());
    },
  };
}
