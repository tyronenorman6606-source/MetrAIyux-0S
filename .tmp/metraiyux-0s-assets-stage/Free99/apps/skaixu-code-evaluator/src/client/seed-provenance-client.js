export function hashString(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function chunkRecords(records = [], size = 500) {
  const chunks = [];
  const chunkSize = Math.max(1, Number(size) || 500);
  for (let i = 0; i < records.length; i += chunkSize) chunks.push(records.slice(i, i + chunkSize));
  return chunks;
}

export function buildRuntimeSeedProvenance(seedRegistry = [], rawRecords = []) {
  const sources = new Map();
  for (const seed of seedRegistry) {
    const key = seed.source || 'runtime';
    if (!sources.has(key)) sources.set(key, { source: key, loaded: 0, types: new Set() });
    const item = sources.get(key);
    item.loaded += 1;
    item.types.add(seed.type || 'unknown');
  }
  return {
    generatedAt: new Date().toISOString(),
    sources: [...sources.values()].map(s => ({ ...s, types: [...s.types].sort() })),
    records: rawRecords.map((record, index) => ({ index, source: record.source || 'runtime', recordHash: hashString(JSON.stringify(record.raw || record)) })),
  };
}
