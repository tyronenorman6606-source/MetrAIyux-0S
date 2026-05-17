import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const syncPath = path.join(repoRoot, 'metraiyux_0s_site', 'brain', 'obsidian-sync.json');
const outputPath = path.join(repoRoot, 'metraiyux_0s_site', 'assets', 'public-neural-map-data.js');

const clusterRules = [
  ['production', /production|deploy|worker|cloudflare|live|surface|domain|dns|forge/i],
  ['proof', /proof|receipt|evidence|qa|audit|verify|verified|screenshot|report/i],
  ['sales', /sales|buyer|handoff|proposal|client|ae|valuation|offer/i],
  ['operator', /operator|action|blocker|gate|approval|command center/i],
  ['brain', /brain|knowledge|local brain|vault|obsidian|sync/i]
];

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'node';
}

function cleanText(value, length = 190) {
  return String(value || '')
    .replace(/`[^`]+`/g, 'local source')
    .replace(/\b(?:obsidian-vault|ops|tools|docs|metraiyux_0s_site|test-artifacts)\/[^\s)]+/g, 'internal source')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length);
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

function addLink(links, source, target, type, strength = 1) {
  if (!source || !target || source === target) return;
  const key = `${source}::${target}::${type}`;
  if (!links.has(key)) links.set(key, { source, target, type, strength });
}

function clustersFor(text, tags = []) {
  const hay = `${text} ${tags.join(' ')}`;
  const matches = clusterRules.filter(([, rule]) => rule.test(hay)).map(([name]) => name);
  return matches.length ? matches : ['brain'];
}

async function main() {
  const sync = JSON.parse(await fs.readFile(syncPath, 'utf8'));
  const nodes = new Map();
  const links = new Map();
  const notes = sync.notes || [];
  const chunks = sync.chunks || [];
  const noteByTitle = new Map(notes.map(note => [note.title, note]));

  addNode(nodes, {
    id: 'hub:metraiyux',
    label: 'MetrAIyux 0S Knowledge Map',
    type: 'hub',
    group: 'hub',
    size: 30,
    summary: 'Public-safe visual map of curated project knowledge.'
  });

  for (const [cluster] of clusterRules) {
    addNode(nodes, {
      id: `cluster:${cluster}`,
      label: cluster[0].toUpperCase() + cluster.slice(1),
      type: 'cluster',
      group: cluster,
      size: 20,
      summary: `${cluster} knowledge lane`
    });
    addLink(links, 'hub:metraiyux', `cluster:${cluster}`, 'cluster', 1.7);
  }

  for (const note of notes) {
    const noteId = `note:${slug(note.title)}`;
    const tags = note.tags || [];
    const noteText = `${note.title} ${tags.join(' ')}`;
    const noteClusters = clustersFor(noteText, tags);

    addNode(nodes, {
      id: noteId,
      label: note.title,
      type: 'note',
      group: noteClusters[0],
      size: Math.min(22, 12 + (note.chunk_count || 1)),
      tags,
      summary: `${note.chunk_count || 0} curated knowledge chunks`
    });
    addLink(links, 'hub:metraiyux', noteId, 'note', 1.2);
    noteClusters.forEach(cluster => addLink(links, `cluster:${cluster}`, noteId, 'cluster-note', 1.8));

    tags.forEach(tag => {
      const tagId = `tag:${slug(tag)}`;
      addNode(nodes, {
        id: tagId,
        label: `#${tag}`,
        type: 'tag',
        group: 'tag',
        size: 11,
        summary: 'Curated vault tag'
      });
      addLink(links, tagId, noteId, 'tag', 1.2);
    });
  }

  chunks.forEach((chunk, index) => {
    const note = noteByTitle.get(chunk.title);
    if (!note) return;
    const noteId = `note:${slug(chunk.title)}`;
    const chunkId = `signal:${slug(chunk.title)}-${index + 1}`;
    const text = cleanText(`${chunk.heading}. ${chunk.text}`);
    const chunkClusters = clustersFor(`${chunk.heading} ${chunk.text}`, chunk.tags || []);

    addNode(nodes, {
      id: chunkId,
      label: cleanText(chunk.heading || chunk.title, 46),
      type: 'signal',
      group: chunkClusters[0],
      size: 8,
      summary: text
    });
    addLink(links, noteId, chunkId, 'signal', 0.9);
    chunkClusters.forEach(cluster => addLink(links, `cluster:${cluster}`, chunkId, 'cluster-signal', 0.6));
  });

  const payload = {
    generated_at: new Date().toISOString(),
    source: 'curated-obsidian-sync',
    safety: 'public-safe: generated only from brain:true Obsidian export with internal paths removed',
    note_count: notes.length,
    chunk_count: chunks.length,
    node_count: nodes.size,
    link_count: links.size,
    nodes: [...nodes.values()],
    links: [...links.values()]
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `window.METRAIYUX_PUBLIC_NEURAL_MAP = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(`Generated public neural map with ${payload.node_count} nodes and ${payload.link_count} links.`);
  console.log(path.relative(repoRoot, outputPath));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
