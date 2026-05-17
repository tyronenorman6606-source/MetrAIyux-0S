import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolDir, '..');
const reviewsPath = path.join(siteRoot, 'data', 'reviews.public.json');
const defaultQueuePath = path.join(siteRoot, 'data', 'review-submissions.queue.json');
const batchSize = 5;

const args = process.argv.slice(2);
const sourceArg = args.find((arg) => arg.startsWith('--source='));
const dryRun = args.includes('--dry-run');
const sourcePath = sourceArg ? path.resolve(sourceArg.slice('--source='.length)) : defaultQueuePath;

function slug(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function titleCase(value = '') {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function splitName(value = '') {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: 'Skyes', lastName: 'Client' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Client' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function categoryFromService(service = '') {
  const raw = service.toLowerCase();
  if (raw.includes('staff') || raw.includes('ae')) return ['staffing'];
  if (raw.includes('automation')) return ['automation'];
  if (raw.includes('ai') || raw.includes('brain')) return ['ai'];
  if (raw.includes('deploy')) return ['deployment'];
  if (raw.includes('portal') || raw.includes('upload')) return ['portal'];
  if (raw.includes('government') || raw.includes('contract')) return ['gov'];
  if (raw.includes('seo') || raw.includes('local')) return ['seo'];
  if (raw.includes('sales') || raw.includes('funnel')) return ['sales'];
  if (raw.includes('brand')) return ['brand'];
  if (raw.includes('web') || raw.includes('site')) return ['web'];
  return ['ops'];
}

function normalizeQueue(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.submissions)) return raw.submissions;
  if (Array.isArray(raw.items)) return raw.items;
  return [];
}

function toReview(item, index, existingCount) {
  const service = item.service || 'Business Operations';
  const displayName = item.publicNameConsent ? item.reviewerName : 'Skyes Over London Client';
  const names = splitName(displayName);
  const year = item.createdAt ? String(new Date(item.createdAt).getFullYear()) : String(new Date().getFullYear());
  const safeId = slug(item.id || `${Date.now()}-${index}`);
  const id = `sol-live-${safeId}`;
  const quote = String(item.reviewText || item.quote || '').trim();

  return {
    id,
    status: 'published',
    source: 'live_submission',
    sourceSubmissionId: item.id,
    qaStatus: item.status,
    productionBatchId: item.productionBatchId || '',
    service,
    title: `${titleCase(service)} Live Review`,
    quote,
    displayName,
    categories: Array.isArray(item.categories) && item.categories.length ? item.categories : categoryFromService(service),
    year,
    impact: 'Client Proof',
    tier: 'standard',
    score: String(Math.max(100, 2000 - existingCount - index)),
    role: item.role || 'Skyes Over London Client',
    slug: id,
    firstName: names.firstName,
    lastName: names.lastName,
    nameStatus: item.publicNameConsent ? 'public_client_name' : 'client_name_withheld_by_request',
    nameStatusLabel: item.publicNameConsent ? '' : 'client name withheld by request',
    initials: `${names.firstName[0] || 'S'}${names.lastName[0] || 'C'}`.toUpperCase(),
    fullReview: [
      quote,
      item.proofNotes ? `0S QA proof note: ${item.proofNotes}` : '0S QA confirmed this review for public proof-wall use before publication.',
    ].filter(Boolean),
    infrastructureLinks: [],
  };
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Review queue file not found: ${sourcePath}`);
  process.exit(1);
}

const existing = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
const queue = normalizeQueue(JSON.parse(fs.readFileSync(sourcePath, 'utf8')));
const existingSourceIds = new Set(existing.map((item) => item.sourceSubmissionId).filter(Boolean));
const publishable = queue
  .filter((item) => ['ready_for_production', 'approved_0s_qa'].includes(item.status))
  .filter((item) => !item.publishedAt)
  .filter((item) => !existingSourceIds.has(item.id));

if (publishable.length < batchSize) {
  console.error(`Need ${batchSize} approved unpublished reviews. Found ${publishable.length}.`);
  process.exit(1);
}

const selected = publishable.slice(0, batchSize);
const nextReviews = [
  ...existing,
  ...selected.map((item, index) => toReview(item, index, existing.length)),
];

if (dryRun) {
  console.log(`Dry run: would publish ${selected.length} reviews from ${sourcePath}.`);
  console.log(selected.map((item) => item.id).join('\n'));
  process.exit(0);
}

fs.writeFileSync(reviewsPath, `${JSON.stringify(nextReviews, null, 2)}\n`);
execFileSync(process.execPath, [path.join(toolDir, 'build-review-pages.mjs')], { stdio: 'inherit' });
console.log(`Published ${selected.length} live reviews into ${reviewsPath}.`);
