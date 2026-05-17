import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const vaultDir = path.join(repoRoot, 'obsidian-vault');
const mapDir = path.join(vaultDir, '_neural-map');
const outputPath = path.join(mapDir, 'graph-data.js');

function cleanScalar(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(v => cleanScalar(v)).filter(Boolean);
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return [{}, raw];
  const end = raw.indexOf('\n---', 4);
  if (end === -1) return [{}, raw];
  const frontmatterRaw = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, '');
  const data = {};
  let currentKey = null;

  frontmatterRaw.split(/\r?\n/).forEach(line => {
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(cleanScalar(listMatch[1]));
      return;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) return;
    currentKey = match[1];
    const value = match[2].trim();
    data[currentKey] = value === '' ? [] : cleanScalar(value);
  });

  return [data, body];
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'node';
}

function titleFrom(relPath, frontmatter, body) {
  if (frontmatter.title) return String(frontmatter.title);
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return path.basename(relPath, '.md').replace(/[-_]/g, ' ');
}

function folderGroup(relPath) {
  const folder = relPath.split('/')[0] || 'root';
  if (folder.startsWith('00-')) return 'command';
  if (folder.startsWith('10-')) return 'production';
  if (folder.startsWith('20-')) return 'proof';
  if (folder.startsWith('30-')) return 'sales';
  if (folder.startsWith('90-')) return 'templates';
  return folder === 'Home.md' ? 'home' : 'vault';
}

function extractWikiLinks(body) {
  const links = [];
  const pattern = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = pattern.exec(body))) links.push(match[1].trim());
  return links;
}

function extractPathMentions(body) {
  const mentions = new Set();
  const pattern = /\b(?:metraiyux_0s_site|ops|docs|tools|proof-recipes|test-artifacts|obsidian-vault)\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g;
  let match;
  while ((match = pattern.exec(body))) mentions.add(match[0].replace(/[.,;)]+$/g, ''));
  return [...mentions];
}

async function listMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.obsidian' || entry.name === 'attachments' || entry.name === '_neural-map') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdownFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath);
  }

  return files;
}

function addLink(links, source, target, type, strength = 1) {
  if (!source || !target || source === target) return;
  const key = `${source}::${target}::${type}`;
  if (!links.has(key)) links.set(key, { source, target, type, strength });
}

async function main() {
  const files = await listMarkdownFiles(vaultDir);
  const notes = [];
  const nodes = new Map();
  const links = new Map();
  const byTitle = new Map();
  const byBase = new Map();

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const relPath = path.relative(vaultDir, filePath).split(path.sep).join('/');
    const [frontmatter, body] = parseFrontmatter(raw);
    const title = titleFrom(relPath, frontmatter, body);
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const id = `note:${relPath}`;
    const group = folderGroup(relPath);
    const brain = frontmatter.brain === true;
    const linksOut = extractWikiLinks(body);
    const mentions = extractPathMentions(body);

    const note = { id, relPath, title, tags, group, brain, linksOut, mentions };
    notes.push(note);
    nodes.set(id, {
      id,
      label: title,
      type: 'note',
      group,
      brain,
      path: `obsidian-vault/${relPath}`,
      size: brain ? 16 : 12,
      tags
    });
    byTitle.set(title.toLowerCase(), id);
    byBase.set(path.basename(relPath, '.md').toLowerCase(), id);
  }

  nodes.set('hub:metraiyux', {
    id: 'hub:metraiyux',
    label: 'MetrAIyux 0S Vault',
    type: 'hub',
    group: 'hub',
    brain: true,
    path: 'obsidian-vault/Home.md',
    size: 28,
    tags: ['metraiyux', 'vault']
  });

  for (const note of notes) {
    addLink(links, 'hub:metraiyux', note.id, 'vault', note.brain ? 1.8 : 1);

    const folderId = `folder:${note.group}`;
    if (!nodes.has(folderId)) {
      nodes.set(folderId, {
        id: folderId,
        label: note.group.replace(/-/g, ' '),
        type: 'folder',
        group: note.group,
        size: 18,
        tags: []
      });
    }
    addLink(links, folderId, note.id, 'folder', 1.2);

    for (const tag of note.tags) {
      const tagId = `tag:${slug(tag)}`;
      if (!nodes.has(tagId)) {
        nodes.set(tagId, {
          id: tagId,
          label: `#${tag}`,
          type: 'tag',
          group: 'tag',
          size: 13,
          tags: [tag]
        });
      }
      addLink(links, tagId, note.id, 'tag', 1.5);
    }

    for (const target of note.linksOut) {
      const normalized = target.toLowerCase();
      const targetId = byTitle.get(normalized) || byBase.get(normalized) || byBase.get(path.basename(target, '.md').toLowerCase());
      if (targetId) addLink(links, note.id, targetId, 'wikilink', 2);
      else {
        const missingId = `missing:${slug(target)}`;
        if (!nodes.has(missingId)) {
          nodes.set(missingId, {
            id: missingId,
            label: target,
            type: 'missing',
            group: 'missing',
            size: 9,
            tags: []
          });
        }
        addLink(links, note.id, missingId, 'unresolved', 0.6);
      }
    }

    for (const mention of note.mentions) {
      const sourceId = `source:${slug(mention)}`;
      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, {
          id: sourceId,
          label: mention.split('/').slice(-2).join('/'),
          type: 'source',
          group: 'source',
          path: mention,
          size: 10,
          tags: []
        });
      }
      addLink(links, note.id, sourceId, 'source', 0.8);
    }
  }

  const graph = {
    generated_at: new Date().toISOString(),
    vault: 'obsidian-vault',
    node_count: nodes.size,
    link_count: links.size,
    notes: notes.length,
    nodes: [...nodes.values()],
    links: [...links.values()]
  };

  await fs.mkdir(mapDir, { recursive: true });
  await fs.writeFile(outputPath, `window.METRAIYUX_OBSIDIAN_GRAPH = ${JSON.stringify(graph, null, 2)};\n`);
  console.log(`Generated neural map with ${graph.node_count} nodes and ${graph.link_count} links.`);
  console.log(path.relative(repoRoot, outputPath));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
