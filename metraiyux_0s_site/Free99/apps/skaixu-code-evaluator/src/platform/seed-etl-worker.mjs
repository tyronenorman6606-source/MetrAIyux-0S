import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_ALLOWED_OUTPUT_ROOTS = ['generated/platform-data', '.skaixu/generated/platform-data'];
const DEFAULT_ALLOWED_SEED_ROOTS = ['platform-seed'];
const DEFAULT_MAX_SEED_FILES = 5000;
const DEFAULT_MAX_SEED_FILE_BYTES = 2_000_000;
const DEFAULT_CHUNK_SIZE = 500;

async function exists(filePath) { try { await fs.access(filePath); return true; } catch { return false; } }
async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
function hash(value) { return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex'); }
function normalizeRel(value) { return String(value || '').replace(/\\/g, '/').replace(/^\/+/, ''); }

export function safeResolveInside(rootDir, requestedPath, { allowedPrefixes = [], allowFile = true, label = 'path' } = {}) {
  const root = path.resolve(rootDir);
  const rel = normalizeRel(requestedPath);
  if (!rel || rel.includes('\0') || rel.split('/').includes('..')) throw new Error(`${label} rejected: unsafe relative path`);
  if (path.isAbsolute(requestedPath)) throw new Error(`${label} rejected: absolute paths are not allowed`);
  const normalizedPrefixes = allowedPrefixes.map(prefix => normalizeRel(prefix).replace(/\/$/, ''));
  if (normalizedPrefixes.length && !normalizedPrefixes.some(prefix => rel === prefix || rel.startsWith(`${prefix}/`))) {
    throw new Error(`${label} rejected: ${rel} is outside allowed prefixes [${normalizedPrefixes.join(', ')}]`);
  }
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error(`${label} rejected: resolved outside project root`);
  if (!allowFile && path.extname(rel)) throw new Error(`${label} rejected: expected directory path`);
  return { fullPath: resolved, relPath: rel, root };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell.trim()); cell = ''; }
    else if (ch === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map(h => h.trim());
  return rows.filter(r => r.some(Boolean)).map((r, rowIndex) => ({ ...Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])), __rowNumber: rowIndex + 2 }));
}

export function parseSeedText(source, text) {
  const lower = source.toLowerCase();
  if (lower.endsWith('.csv')) return { type: 'csv', records: parseCsv(text) };
  if (lower.endsWith('.ndjson')) return { type: 'ndjson', records: text.split(/\n+/).map(line => line.trim()).filter(Boolean).map((line, i) => ({ ...JSON.parse(line), __rowNumber: i + 1 })) };
  if (lower.endsWith('.json')) {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { type: 'json-array', records: parsed.map((record, i) => ({ ...record, __rowNumber: i + 1 })) };
    if (Array.isArray(parsed.records)) return { type: parsed.type || 'json-records', records: parsed.records.map((record, i) => ({ ...record, __rowNumber: i + 1 })), raw: parsed };
    if (Array.isArray(parsed.items)) return { type: parsed.type || 'json-items', records: parsed.items.map((record, i) => ({ ...record, __rowNumber: i + 1 })), raw: parsed };
    return { type: parsed.type || 'json-object', records: [{ ...parsed, __rowNumber: 1 }], raw: parsed };
  }
  return { type: 'text', records: [{ source, body: text, __rowNumber: 1 }] };
}

export async function loadSeedManifest(rootDir, manifestPath = 'platform-seed/manifest.json') {
  const { fullPath, relPath } = safeResolveInside(rootDir, manifestPath, { allowedPrefixes: DEFAULT_ALLOWED_SEED_ROOTS, label: 'manifestPath' });
  if (!(await exists(fullPath))) return { assets: [], manifestPath: relPath };
  const manifest = JSON.parse(await fs.readFile(fullPath, 'utf8'));
  return { ...manifest, manifestPath: relPath };
}

async function walkSeedFiles(rootDir, seedDir, { maxFiles = DEFAULT_MAX_SEED_FILES, maxFileBytes = DEFAULT_MAX_SEED_FILE_BYTES } = {}) {
  const { fullPath, relPath } = safeResolveInside(rootDir, seedDir, { allowedPrefixes: DEFAULT_ALLOWED_SEED_ROOTS, allowFile: false, label: 'seedDir' });
  const out = [];
  async function walk(current) {
    if (out.length >= maxFiles) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (out.length >= maxFiles) break;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(current, entry.name);
      const rel = path.relative(rootDir, full).replaceAll(path.sep, '/');
      if (entry.isDirectory()) await walk(full);
      else if (/\.(json|ndjson|csv|md|txt)$/i.test(entry.name)) {
        const stat = await fs.stat(full);
        if (stat.size <= maxFileBytes) out.push({ path: rel, sourceDir: relPath, size: stat.size });
      }
    }
  }
  if (await exists(fullPath)) await walk(fullPath);
  return out;
}

function normalizeAsset(asset) {
  if (typeof asset === 'string') return { path: asset };
  return { ...asset, path: asset.path || asset.source || asset.file || asset.dir || asset.directory };
}

export async function loadSeedEntries({ rootDir = process.cwd(), manifestPath = 'platform-seed/manifest.json', scanDirectories = true, maxFiles = DEFAULT_MAX_SEED_FILES, maxFileBytes = DEFAULT_MAX_SEED_FILE_BYTES } = {}) {
  const manifest = await loadSeedManifest(rootDir, manifestPath);
  const manifestAssets = Array.isArray(manifest.assets) ? manifest.assets : (Array.isArray(manifest.files) ? manifest.files : []);
  const assets = [];
  for (const asset of manifestAssets.map(normalizeAsset)) {
    if (!asset.path) continue;
    const rel = normalizeRel(asset.path);
    if (scanDirectories && (asset.kind === 'directory' || asset.type === 'directory' || !path.extname(rel))) {
      const files = await walkSeedFiles(rootDir, rel, { maxFiles, maxFileBytes }).catch(error => [{ path: rel, error: error.message }]);
      assets.push(...files.map(file => ({ ...asset, path: file.path, sourceDir: file.sourceDir, error: file.error, scannedFromDirectory: true })));
    } else {
      assets.push(asset);
    }
  }
  const entries = [];
  for (const asset of assets.slice(0, maxFiles)) {
    const assetPath = asset.path;
    if (!assetPath) continue;
    let resolved;
    try { resolved = safeResolveInside(rootDir, assetPath, { allowedPrefixes: DEFAULT_ALLOWED_SEED_ROOTS, label: 'seed asset' }); }
    catch (error) { entries.push({ source: assetPath, error: error.message }); continue; }
    if (asset.error) { entries.push({ source: assetPath, error: asset.error }); continue; }
    if (!(await exists(resolved.fullPath))) { entries.push({ source: assetPath, error: 'missing' }); continue; }
    const stat = await fs.stat(resolved.fullPath);
    if (stat.size > maxFileBytes) { entries.push({ source: assetPath, error: `file too large (${stat.size} bytes > ${maxFileBytes})` }); continue; }
    const text = await fs.readFile(resolved.fullPath, 'utf8');
    const parsed = parseSeedText(assetPath, text);
    entries.push({
      source: assetPath,
      sourceHash: hash(text),
      sourceSize: stat.size,
      sourceDir: asset.sourceDir || null,
      label: asset.name || asset.label || assetPath,
      assetType: asset.type || asset.kind || '',
      loadedAt: new Date().toISOString(),
      ...parsed,
    });
  }
  return { manifest, entries, limits: { maxFiles, maxFileBytes } };
}

export function inferSeedSchema(records = []) {
  const stats = new Map();
  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    for (const [key, value] of Object.entries(record)) {
      if (key.startsWith('__')) continue;
      if (!stats.has(key)) stats.set(key, { name: key, count: 0, present: 0, types: new Set(), examples: [] });
      const field = stats.get(key);
      field.count++;
      if (value !== '' && value !== null && value !== undefined) {
        field.present++;
        field.types.add(Array.isArray(value) ? 'array' : typeof value);
        if (field.examples.length < 3) field.examples.push(String(value).slice(0, 90));
      }
    }
  }
  return [...stats.values()].map(field => ({
    name: field.name,
    coverage: records.length ? Math.round((field.present / records.length) * 100) : 0,
    types: [...field.types].sort(),
    examples: field.examples,
  })).sort((a, b) => b.coverage - a.coverage || a.name.localeCompare(b.name));
}

function pick(record, keys) {
  for (const key of keys) {
    const value = record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function slugify(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'unnamed'; }
function canonicalBusinessKey(business = {}) { return [business.name, business.city, business.state, business.website || business.phone || business.address].map(v => String(v || '').trim().toLowerCase()).join('|'); }

export function businessProjection(record = {}, source = 'seed', provenance = {}) {
  const name = pick(record, ['name', 'business', 'company', 'title']);
  if (!name) return null;
  const city = pick(record, ['city', 'locality', 'town']);
  const state = pick(record, ['state', 'stateCode', 'region']) || 'AZ';
  const category = pick(record, ['category', 'industry', 'service', 'type']) || 'Uncategorized';
  const website = pick(record, ['website', 'url', 'domain']);
  return {
    id: slugify(`${name}-${city || 'unknown'}-${state}`),
    name,
    category,
    city,
    state,
    website,
    phone: pick(record, ['phone', 'telephone']),
    email: pick(record, ['email']),
    address: pick(record, ['address', 'street']),
    description: pick(record, ['description', 'summary', 'notes']),
    source,
    provenance,
    verifiedStatus: pick(record, ['verifiedStatus', 'verified']) || 'seeded-unverified',
    tags: [category, city, state].filter(Boolean),
  };
}

function isLikelyBusinessSeedRecord(record = {}, entry = {}) {
  const assetType = String(entry.assetType || '').toLowerCase();
  const source = String(entry.source || '').toLowerCase();
  if (assetType.includes('business') || assetType.includes('directory') || source.includes('sample-businesses') || source.includes('business')) return true;
  if (!record || typeof record !== 'object') return false;
  const keys = new Set(Object.keys(record).map(k => k.toLowerCase()));
  const hasName = keys.has('name') || keys.has('business') || keys.has('company');
  const hasBusinessShape = keys.has('city') || keys.has('state') || keys.has('category') || keys.has('website') || keys.has('phone') || keys.has('address');
  return hasName && hasBusinessShape;
}

export function validateSeedRecords(records = []) {
  const issues = [];
  const duplicateMap = new Map();
  const projected = [];
  const provenance = [];
  for (const item of records) {
    const rowNumber = item.record?.__rowNumber || null;
    const recordHash = hash({ source: item.source, rowNumber, record: item.record });
    const business = businessProjection(item.record, item.source, { source: item.source, rowNumber, recordHash, sourceHash: item.sourceHash || null, loadedAt: item.loadedAt || null });
    if (!business) {
      issues.push({ severity: 'medium', source: item.source, rowNumber, message: 'Record missing business/company/name field' });
      continue;
    }
    projected.push(business);
    provenance.push({ id: business.id, source: item.source, rowNumber, recordHash, sourceHash: item.sourceHash || null });
    const key = canonicalBusinessKey(business);
    duplicateMap.set(key, [...(duplicateMap.get(key) || []), { source: item.source, rowNumber, id: business.id }]);
    if (!business.city) issues.push({ severity: 'low', source: item.source, business: business.name, rowNumber, message: 'Missing city' });
    if (!business.website) issues.push({ severity: 'low', source: item.source, business: business.name, rowNumber, message: 'Missing website' });
  }
  const duplicates = [...duplicateMap.entries()].filter(([, sources]) => sources.length > 1).map(([key, sources]) => ({ key, sources }));
  for (const duplicate of duplicates) issues.push({ severity: 'medium', source: duplicate.sources.map(s => s.source).join(', '), message: `Possible duplicate business: ${duplicate.key}` });
  const deduped = [];
  const seen = new Set();
  for (const business of projected) {
    const key = canonicalBusinessKey(business);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(business);
  }
  return { ok: !issues.some(i => i.severity === 'high'), totalRecords: records.length, projectedCount: projected.length, dedupedCount: deduped.length, issues, duplicates, projected, deduped, provenance };
}

function chunkArray(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

export async function materializeSeeds({ rootDir = process.cwd(), manifestPath = 'platform-seed/manifest.json', outDir = 'generated/platform-data', chunkSize = DEFAULT_CHUNK_SIZE, maxFiles = DEFAULT_MAX_SEED_FILES, maxFileBytes = DEFAULT_MAX_SEED_FILE_BYTES } = {}) {
  const output = safeResolveInside(rootDir, outDir, { allowedPrefixes: DEFAULT_ALLOWED_OUTPUT_ROOTS, label: 'outDir' });
  const { manifest, entries, limits } = await loadSeedEntries({ rootDir, manifestPath, maxFiles, maxFileBytes });
  const records = [];
  const loadIssues = [];
  for (const entry of entries) {
    if (entry.error) { loadIssues.push({ severity: 'high', source: entry.source, message: entry.error }); continue; }
    for (const record of entry.records || []) {
      if (isLikelyBusinessSeedRecord(record, entry)) records.push({ source: entry.source, sourceHash: entry.sourceHash, loadedAt: entry.loadedAt, record });
    }
  }
  const validation = validateSeedRecords(records);
  validation.issues.unshift(...loadIssues);
  const schema = inferSeedSchema(records.map(r => r.record));
  const businessDirectory = validation.deduped.sort((a, b) => a.name.localeCompare(b.name));
  const searchIndex = businessDirectory.map(b => ({ id: b.id, q: [b.name, b.category, b.city, b.state, b.website, b.description].filter(Boolean).join(' ').toLowerCase() }));
  const chunks = chunkArray(businessDirectory, Math.max(1, Number(chunkSize) || DEFAULT_CHUNK_SIZE));
  await ensureDir(output.fullPath);
  await fs.rm(path.join(output.fullPath, 'chunks'), { recursive: true, force: true });
  await ensureDir(path.join(output.fullPath, 'chunks'));
  const chunkManifest = [];
  for (const [index, chunk] of chunks.entries()) {
    const name = `business-directory.chunk-${String(index + 1).padStart(3, '0')}.json`;
    await fs.writeFile(path.join(output.fullPath, 'chunks', name), `${JSON.stringify(chunk, null, 2)}\n`);
    chunkManifest.push({ path: `chunks/${name}`, records: chunk.length, firstId: chunk[0]?.id || null, lastId: chunk.at(-1)?.id || null });
  }
  const provenance = {
    generatedAt: new Date().toISOString(),
    rootPolicy: { seedPrefixes: DEFAULT_ALLOWED_SEED_ROOTS, outputPrefixes: DEFAULT_ALLOWED_OUTPUT_ROOTS, limits },
    sourceFiles: entries.map(entry => ({ source: entry.source, sourceHash: entry.sourceHash || null, sourceSize: entry.sourceSize || null, recordCount: entry.records?.length || 0, error: entry.error || null })),
    records: validation.provenance,
    chunks: chunkManifest,
  };
  const outputs = {
    'business-directory.json': businessDirectory,
    'business-search-index.json': searchIndex,
    'seed-validation.json': validation,
    'seed-schema.json': schema,
    'seed-manifest.snapshot.json': manifest,
    'seed-provenance.json': provenance,
    'chunk-manifest.json': { generatedAt: provenance.generatedAt, chunkSize, chunks: chunkManifest },
  };
  for (const [name, value] of Object.entries(outputs)) await fs.writeFile(path.join(output.fullPath, name), `${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(path.join(output.fullPath, 'README.md'), `# Generated Platform Data\n\nGenerated: ${new Date().toISOString()}\n\nRecords: ${businessDirectory.length}\nInput records: ${records.length}\nChunks: ${chunkManifest.length}\nValidation issues: ${validation.issues.length}\n\nThese files are generated from platform-seed assets. Do not hardcode business data into app components.\n`);
  return { manifest, entries: entries.length, records: records.length, businessDirectory, validation, schema, provenance, chunks: chunkManifest, outDir: output.relPath };
}
