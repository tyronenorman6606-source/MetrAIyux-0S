#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const outDir = path.resolve(argValue('--out-dir', path.join(repoRoot, '.vscode/Handoffs')));
const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
const jsonPath = path.join(outDir, `contact-info-inventory-${stamp}.json`);
const mdPath = path.join(outDir, `contact-info-inventory-${stamp}.md`);

const rgGlobs = [
  '!.git/**',
  '!node_modules/**',
  '!**/node_modules/**',
  '!.skyevault-out/**',
  '!test-artifacts/**',
  '!test-results/**',
  '!.pw-browsers/**',
  '!.vscode/Handoffs/contact-info-inventory-*.json',
  '!.vscode/Handoffs/contact-info-inventory-*.md',
  '!**/.wrangler/**',
  '!**/.netlify/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/*.map',
  '!**/MCP_TOOLING_RECEIPT.json',
  '!**/package-lock.json',
  '!**/*.png',
  '!**/*.jpg',
  '!**/*.jpeg',
  '!**/*.gif',
  '!**/*.webp',
  '!**/*.mp4',
  '!**/*.mov',
  '!**/*.zip',
  '!**/*.tar',
  '!**/*.gz',
  '!**/*.tgz',
  '!**/*.7z',
  '!**/*.skyesecrets'
];

function runRg(pattern) {
  const result = spawnSync('rg', [
    '--hidden',
    '--no-ignore',
    '-I',
    '-n',
    '--with-filename',
    ...rgGlobs.flatMap((glob) => ['--glob', glob]),
    pattern,
    '.'
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024
  });
  if (result.status && result.status !== 1) {
    throw new Error(`rg failed for ${pattern}: ${result.stderr || result.stdout}`);
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function parseLine(raw) {
  const match = raw.match(/^([^:\r\n]+):(\d+):(.*)$/);
  if (!match) return null;
  return {
    file: match[1].replace(/^\.\//, ''),
    line: Number(match[2]),
    text: match[3]
  };
}

function add(map, value, source, tag = '') {
  const clean = String(value || '').trim().replace(/\s+/g, ' ');
  if (!clean) return;
  const key = clean.toLowerCase();
  const entry = map.get(key) || { value: clean, count: 0, tags: new Set(), sources: [] };
  entry.count += 1;
  if (tag) entry.tags.add(tag);
  if (source && entry.sources.length < 12) entry.sources.push(source);
  map.set(key, entry);
}

function finalize(map) {
  return [...map.values()]
    .map((entry) => ({
      value: entry.value,
      count: entry.count,
      tags: [...entry.tags].sort(),
      sources: entry.sources
    }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

function sourceOf(item) {
  return `${item.file}:${item.line}`;
}

function usableLine(item) {
  if (!item || !item.text || item.text.length > 2000) return false;
  if (!item.file || item.file.length > 300 || /[\r\n\0]/.test(item.file)) return false;
  return fs.existsSync(path.join(repoRoot, item.file));
}

const emailPattern = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}';
const emailRegex = /[A-Za-z0-9][A-Za-z0-9._+-]{0,63}@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g;
const allowedEmailTlds = new Set(['agency', 'ai', 'app', 'biz', 'cloud', 'co', 'com', 'design', 'dev', 'digital', 'edu', 'gov', 'info', 'invalid', 'io', 'local', 'marketing', 'me', 'media', 'net', 'org', 'services', 'site', 'solutions', 'studio', 'systems', 'tech', 'us']);
const phonePattern = '(\\+?1[ .-]?)?(\\(?[2-9][0-9]{2}\\)?[ .-]?[2-9][0-9]{2}[ .-]?[0-9]{4})([ ]?(x|ext\\.?)[ ]?[0-9]{1,6})?';
const phoneRegex = /(?:\+?1[\s.-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?[2-9]\d{2}[\s.-]?\d{4}(?:\s*(?:x|ext\.?)\s*\d{1,6})?/g;
const linkPattern = `(mailto:|tel:)[^"' <>)]{3,}`;
const linkRegex = /(mailto:|tel:)[^"' <>)]{3,}/g;
const addressPattern = '(address|street|suite|ste\\.|avenue|blvd|boulevard|road|pkwy|parkway|phoenix|scottsdale|glendale|tempe|mesa|goodyear|avondale|litchfield)';
const addressRegex = /\b\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9'.-]*(?:\s+[A-Za-z0-9&'.-]+){0,8}\s+(?:St\.?|Street|Ave\.?|Avenue|Rd\.?|Road|Blvd\.?|Boulevard|Dr\.?|Drive|Ln\.?|Lane|Way|Pkwy\.?|Parkway|Loop|Ct\.?|Court|Pl\.?|Place|Suite|Ste\.?)\b(?:\s*(?:#|Suite|Ste\.?)\s*[A-Za-z0-9-]+)?(?:,\s*[A-Za-z .-]+)?(?:,\s*[A-Z]{2})?(?:\s+\d{5})?/gi;

const emails = new Map();
const phones = new Map();
const contactLinks = new Map();
const addresses = new Map();

for (const raw of runRg(emailPattern)) {
  const item = parseLine(raw);
  if (!usableLine(item)) continue;
  for (const match of item.text.matchAll(emailRegex)) {
    const value = match[0];
    if (value.includes('%')) continue;
    const tld = value.split('.').pop().toLowerCase();
    if (!allowedEmailTlds.has(tld)) continue;
    const tag = /example\.com|localhost|\.local$/i.test(value)
      ? 'placeholder-or-local'
      : /graylondonskyes|metraiyux|skye|sol/i.test(value)
        ? 'company-or-owned-lane'
        : '';
    add(emails, value, sourceOf(item), tag);
  }
}

for (const raw of runRg(phonePattern)) {
  const item = parseLine(raw);
  if (!usableLine(item)) continue;
  for (const match of item.text.matchAll(phoneRegex)) {
    const value = match[0];
    const digits = value.replace(/\D/g, '');
    const normalizedDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (normalizedDigits.length !== 10) continue;
    if (/^(\d)\1{9}$/.test(normalizedDigits)) continue;
    if (normalizedDigits === '4294967295') continue;
    const tag = /555/.test(normalizedDigits) ? 'placeholder-or-test' : '';
    add(phones, value, sourceOf(item), tag);
  }
}

for (const raw of runRg(linkPattern)) {
  const item = parseLine(raw);
  if (!usableLine(item)) continue;
  for (const match of item.text.matchAll(linkRegex)) add(contactLinks, match[0], sourceOf(item));
}

for (const raw of runRg(addressPattern)) {
  const item = parseLine(raw);
  if (!usableLine(item)) continue;
  const text = item.text.replace(/<[^>]*>/g, ' ');
  for (const match of text.matchAll(addressRegex)) add(addresses, match[0].replace(/[",;]+$/g, ''), sourceOf(item));
}

const inventory = {
  schema: 'metraiyux.contact-info-inventory.v1',
  generatedAt: new Date().toISOString(),
  repoRoot,
  scope: {
    included: 'repo text scan with hidden files included',
    excluded: rgGlobs
  },
  counts: {
    emails: emails.size,
    phones: phones.size,
    contactLinks: contactLinks.size,
    addresses: addresses.size
  },
  emails: finalize(emails),
  phones: finalize(phones),
  contactLinks: finalize(contactLinks),
  addresses: finalize(addresses),
  flags: []
};

for (const entry of inventory.emails) {
  if (entry.tags.includes('placeholder-or-local')) inventory.flags.push({ type: 'email-placeholder-or-local', value: entry.value, firstSource: entry.sources[0] || '' });
}
for (const entry of inventory.phones) {
  if (entry.tags.includes('placeholder-or-test')) inventory.flags.push({ type: 'phone-placeholder-or-test', value: entry.value, firstSource: entry.sources[0] || '' });
}

function renderSection(title, items) {
  const lines = [`## ${title}`, ''];
  if (!items.length) {
    lines.push('- None found.', '');
    return lines;
  }
  for (const item of items) {
    const tags = item.tags.length ? ` [${item.tags.join(', ')}]` : '';
    const firstSource = item.sources[0] ? ` first source: \`${item.sources[0]}\`` : '';
    lines.push(`- \`${item.value}\` (${item.count} hits)${tags}${firstSource}`);
  }
  lines.push('');
  return lines;
}

const md = [
  '# Repo Contact Information Inventory',
  '',
  `Generated UTC: ${inventory.generatedAt}`,
  '',
  'Scope: repo text scan with hidden files included. Excluded `.git`, `node_modules`, `.skyevault-out`, test artifacts, browser artifacts, binary/media/archive files, and SkyeSecure packs so credentials and vault payloads are not reprinted.',
  '',
  `Counts: ${inventory.counts.emails} emails, ${inventory.counts.phones} phone numbers, ${inventory.counts.contactLinks} mailto/tel links, ${inventory.counts.addresses} street-address-looking strings.`,
  '',
  'Accuracy directive: every public company-owned contact item below must be reconciled against the current owner-approved source of truth before shipping public copy. Placeholder/local contacts must not be presented as customer-facing support.',
  '',
  ...renderSection('Emails', inventory.emails),
  ...renderSection('Phone Numbers', inventory.phones),
  ...renderSection('Mailto And Tel Links', inventory.contactLinks),
  ...renderSection('Street Address Candidates', inventory.addresses),
  '## Flags',
  '',
  ...(
    inventory.flags.length
      ? inventory.flags.map((flag) => `- ${flag.type}: \`${flag.value}\` first source: \`${flag.firstSource}\``)
      : ['- None.']
  ),
  ''
].join('\n');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`);
fs.writeFileSync(mdPath, md);
fs.writeFileSync(path.join(outDir, 'contact-info-inventory-latest.json'), `${JSON.stringify(inventory, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'contact-info-inventory-latest.md'), md);

console.log(JSON.stringify({ ok: true, jsonPath, mdPath, counts: inventory.counts, flags: inventory.flags.length }, null, 2));
