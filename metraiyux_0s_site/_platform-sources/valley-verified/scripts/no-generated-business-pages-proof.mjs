import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC_HAND = path.join(ROOT, 'src', 'handbuilt-pages');
const DIST = path.join(ROOT, 'dist');
const BUSINESS_DIST = path.join(DIST, 'business');
const RECEIPT = path.join(ROOT, 'proof', 'no-generated-business-pages.json');
const ASSIGNMENTS = path.join(ROOT, 'proof', 'custom-page-redesign-assignments.json');

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readText(file) {
  return fs.readFile(file, 'utf8');
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function dirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function fail(message, details = {}) {
  const receipt = {
    ok: false,
    checkedAt: new Date().toISOString(),
    message,
    ...details
  };
  await fs.mkdir(path.dirname(RECEIPT), { recursive: true });
  await fs.writeFile(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
}

function hasSkyEmailAction(body) {
  return [
    'Accept SkyEmail',
    'Accept the free SkyEmail account',
    '/live/SkyeMail/login.html?workspace=valley-verified',
    '/live/SkyeMail/login.html%3Fworkspace=valley-verified',
    '%2Flive%2FSkyeMail%2Flogin.html%3Fworkspace%3Dvalley-verified'
  ].some((fragment) => body.includes(fragment));
}

const data = await readJson(path.join(DIST, 'data', 'businesses.json'));
const businesses = Array.isArray(data.businesses) ? data.businesses : [];
const businessIds = businesses.map((business) => business.id).sort();
const sourceDirs = new Set(await dirs(SRC_HAND));
const distDirs = new Set((await dirs(BUSINESS_DIST)).filter((id) => id !== 'page'));

const missingSource = businessIds.filter((id) => !sourceDirs.has(id));
const missingDist = businessIds.filter((id) => !distDirs.has(id));
const extraDist = [...distDirs].filter((id) => !businessIds.includes(id));

if (missingSource.length || missingDist.length) {
  await fail('Every Valley business must have a static source page and a published static route.', {
    businessCount: businesses.length,
    sourceStaticPages: sourceDirs.size,
    distStaticPages: distDirs.size,
    missingSource,
    missingDist,
    extraDist
  });
}

const fallbackFiles = [
  'business-profile/index.html',
  '_redirects',
  'profile-template-preview/index.html',
  'data/profile-template-options.json'
];
const fallbackPresent = [];
for (const rel of fallbackFiles) {
  if (await exists(path.join(DIST, rel))) fallbackPresent.push(rel);
}
if (fallbackPresent.length) {
  await fail('Generated/fallback business-page artifacts are still present in dist.', { fallbackPresent });
}

const deletedGeneratorFiles = [
  'scripts/v21-enhance.mjs',
  'scripts/v21-smoke.mjs'
];
const deletedGeneratorFilesPresent = [];
for (const rel of deletedGeneratorFiles) {
  if (await exists(path.join(ROOT, rel))) deletedGeneratorFilesPresent.push(rel);
}
if (deletedGeneratorFilesPresent.length) {
  await fail('Deleted bulk business-page generator scripts are present again.', {
    deletedGeneratorFilesPresent
  });
}

const activeReferenceFiles = [
  'package.json',
  'scripts/build.mjs'
];
const activeGeneratorReferences = [];
for (const rel of activeReferenceFiles) {
  const text = await readText(path.join(ROOT, rel));
  for (const banned of ['v21-enhance', 'v21-smoke', 'build:v21-enhance']) {
    if (text.includes(banned)) activeGeneratorReferences.push({ file: rel, banned });
  }
}
if (activeGeneratorReferences.length) {
  await fail('Active build/package references still point at deleted v21 business-page generator lanes.', {
    activeGeneratorReferences
  });
}

const bannedBusinessFragments = [
  'generated company template',
  'generated business profile',
  'generated company page',
  'generated profile page',
  'profile-template-preview',
  'profile-template-options'
];
const badBusinessPages = [];
for (const id of businessIds) {
  const sourceFile = path.join(SRC_HAND, id, 'index.html');
  const sourceBody = await fs.readFile(sourceFile, 'utf8');
  if (!sourceBody.includes('data-static-hand-page="true"')) badBusinessPages.push({ id, target: 'source', reason: 'missing static hand page marker' });
  if (!hasSkyEmailAction(sourceBody)) {
    badBusinessPages.push({ id, target: 'source', reason: 'missing SkyEmail acceptance action' });
  }
  const file = path.join(BUSINESS_DIST, id, 'index.html');
  const body = await fs.readFile(file, 'utf8');
  const lower = body.toLowerCase();
  if (!body.includes('data-static-hand-page="true"')) badBusinessPages.push({ id, target: 'dist', reason: 'missing static hand page marker' });
  if (!hasSkyEmailAction(body)) {
    badBusinessPages.push({ id, target: 'dist', reason: 'missing SkyEmail acceptance action' });
  }
  const banned = bannedBusinessFragments.find((fragment) => lower.includes(fragment));
  if (banned) badBusinessPages.push({ id, target: 'dist', reason: `banned generated-page copy: ${banned}` });
}
if (badBusinessPages.length) {
  await fail('Business routes did not pass static/SkyEmail/generated-copy checks.', {
    failures: badBusinessPages.slice(0, 50),
    failureCount: badBusinessPages.length
  });
}

const policy = await readJson(path.join(DIST, 'data', 'static-page-policy.json'));
if (policy.generated_profile_pages_enabled !== false) {
  await fail('Static page policy must explicitly keep generated profile pages disabled.', { policy });
}

const assignments = await readJson(ASSIGNMENTS);
const assignedPages = (assignments.batches || []).flatMap((batch) => (batch.pages || []).map((page) => ({
  agent: batch.agent,
  id: page.id,
  path: page.path
})));
const assignedIds = assignedPages.map((page) => page.id).sort();
const duplicateAssignedIds = assignedIds.filter((id, index) => id === assignedIds[index - 1]);
const assignedUnknownBusinesses = assignedIds.filter((id) => !businessIds.includes(id));
const assignedMissingSource = assignedPages.filter((page) => !sourceDirs.has(page.id));
const expectedAssignedTotal = assignments.remaining_redesign_count || assignedIds.length;
const expectedBusinessCount = assignments.business_count || businesses.length;
const expectedCustomCount = assignments.already_custom_full_build_count || 0;
if (
  duplicateAssignedIds.length ||
  assignedUnknownBusinesses.length ||
  assignedMissingSource.length ||
  assignedIds.length !== expectedAssignedTotal ||
  expectedBusinessCount !== businesses.length ||
  expectedCustomCount + assignedIds.length !== businesses.length
) {
  await fail('Custom-page redesign assignment coverage is not clean.', {
    businessCount: businesses.length,
    expectedBusinessCount,
    expectedCustomCount,
    assignedCount: assignedIds.length,
    expectedAssignedTotal,
    duplicateAssignedIds,
    assignedUnknownBusinesses,
    assignedMissingSource: assignedMissingSource.slice(0, 50)
  });
}

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  businessCount: businesses.length,
  sourceStaticPages: sourceDirs.size,
  publishedStaticBusinessPages: distDirs.size,
  generatedBusinessPagesRemaining: 0,
  generatedFallbackArtifactsPresent: 0,
  deletedGeneratorFilesAbsent: true,
  activeGeneratorReferences: 0,
  assignmentCoverage: {
    alreadyCustomFullBuildCount: expectedCustomCount,
    assignedForOneByOneRedesign: assignedIds.length,
    batches: (assignments.batches || []).map((batch) => ({
      agent: batch.agent,
      count: (batch.pages || []).length
    }))
  },
  skyemailAcceptanceRequired: true,
  staticPagePolicy: '/data/static-page-policy.json'
};
await fs.mkdir(path.dirname(RECEIPT), { recursive: true });
await fs.writeFile(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
