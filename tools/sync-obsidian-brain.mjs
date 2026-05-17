import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const vaultDir = path.join(repoRoot, 'obsidian-vault');
const outputPath = path.join(repoRoot, 'metraiyux_0s_site', 'brain', 'obsidian-sync.json');
const maxChunkLength = 900;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'note';
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

function cleanScalar(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(v => cleanScalar(v)).filter(Boolean);
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, block => block.replace(/```[a-zA-Z0-9_-]*\n?|\n?```/g, ' '))
    .replace(/!\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFrom(filePath, frontmatter, body) {
  if (frontmatter.title) return String(frontmatter.title);
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return path.basename(filePath, '.md').replace(/[-_]/g, ' ');
}

function chunkNote({ relPath, title, body, tags }) {
  const sections = [];
  const lines = body.split(/\r?\n/);
  let currentHeading = title;
  let buffer = [];

  const flush = () => {
    const text = stripMarkdown(buffer.join('\n'));
    if (text) sections.push({ heading: currentHeading, text });
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      currentHeading = heading[2].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  const chunks = [];
  sections.forEach((section, sectionIndex) => {
    const sentences = section.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [section.text];
    let text = '';
    let part = 1;

    const push = () => {
      const trimmed = text.trim();
      if (!trimmed) return;
      chunks.push({
        id: `obsidian-${slugify(relPath)}-${sectionIndex + 1}-${part}`,
        source: `obsidian-vault/${relPath}`,
        title,
        heading: section.heading,
        tags,
        text: trimmed
      });
      part += 1;
      text = '';
    };

    sentences.forEach(sentence => {
      if ((text + sentence).length > maxChunkLength) push();
      text += `${sentence.trim()} `;
    });
    push();
  });

  return chunks;
}

async function listMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.obsidian' || entry.name === 'attachments') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = await listMarkdownFiles(vaultDir);
  const notes = [];
  const chunks = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const [frontmatter, body] = parseFrontmatter(raw);
    if (frontmatter.brain !== true) continue;

    const relPath = path.relative(vaultDir, filePath).split(path.sep).join('/');
    const title = titleFrom(filePath, frontmatter, body);
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const noteChunks = chunkNote({ relPath, title, body, tags });

    notes.push({ source: `obsidian-vault/${relPath}`, title, tags, chunk_count: noteChunks.length });
    chunks.push(...noteChunks);
  }

  const payload = {
    generated_at: new Date().toISOString(),
    source_vault: 'obsidian-vault',
    note_count: notes.length,
    chunk_count: chunks.length,
    notes,
    chunks
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Synced ${payload.note_count} Obsidian notes into ${payload.chunk_count} local-brain chunks.`);
  console.log(path.relative(repoRoot, outputPath));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
