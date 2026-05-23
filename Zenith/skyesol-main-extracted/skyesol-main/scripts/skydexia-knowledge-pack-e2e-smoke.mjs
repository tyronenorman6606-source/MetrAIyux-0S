#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDesignSystemPrompt } from '../../../AbovetheSkye-Platforms/SkyDexia/skydexia-orchestrator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skyeSolRoot = path.resolve(__dirname, '..');
const skyeHandsRoot = path.resolve(skyeSolRoot, '../..');

const packRoot = 'SkyDexia-Additional-Knowledge/SkyDexia_Knowledge_Pack_2026-05-02/SkyDexia_Knowledge_Pack_2026-05-02';
const packFiles = [
  'README_SKYDEXIA_INGEST.md',
  'SKYDEXIA_AI_BOOT_PROMPT.md',
  'SKYDEXIA_FAST_PASTE_BLOCK.md',
  'SKYDEXIA_INGEST_MANIFEST.json',
  'SKYDEXIA_KNOWLEDGE_CORE.md',
  'SKYDEXIA_KNOWLEDGE_GAP_LEDGER.md',
  'SKYES_OVER_LONDON_MASTER_CONTEXT_PACK_2026-05-01.md',
  'skydexia_knowledge.json',
  'skydexia_knowledge_chunks.jsonl',
  'source/SKYES_OVER_LONDON_MASTER_CONTEXT_PACK_2026-05-01.md',
  'source/Pasted_text_26_memory_dump.txt',
];

function abs(relativePath) {
  return path.join(skyeHandsRoot, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(abs(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(abs(relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const missingPackFiles = packFiles
  .map((file) => `${packRoot}/${file}`)
  .filter((relativePath) => !exists(relativePath));

const wiring = readJson('SkyDexia-Additional-Knowledge/manifests/skydexia-knowledge-wiring.json');
const requiredKnowledgeFiles = wiring.requiredKnowledgeFiles || [];
const prompt = buildDesignSystemPrompt();
const brainLinks = readJson('SkyDexia-Additional-Knowledge/skydexia-ai-brain-drive-90gb-edition-v0.2.0-integrated-static-smoke/skydexia-ai-brain-drive-90gb-edition-v0.2.0-integrated/configs/skydexia/knowledge-links.json');
const neuralManifest = readJson('AbovetheSkye-Platforms/SkyeDexiaNeural/RELEASE_MANIFEST.json');
const neuralIndex = read('AbovetheSkye-Platforms/SkyeDexiaNeural/index.html');
const neuralOriginal = read('AbovetheSkye-Platforms/SkyeDexiaNeural/neural-space-pro.html');
const skydexiaPlatform = readJson('Dynasty-Versions/platform/user-platforms/skydexia/skyehands.platform.json');
const neuralPlatform = readJson('Dynasty-Versions/platform/user-platforms/skyedexia-neural/skyehands.platform.json');
const trustedSource = readJson('AbovetheSkye-Platforms/SkyDexia/knowledge-base/trusted-sources/skydexia-knowledge-pack-2026-05-02.source.json');

const expectedPackRefs = packFiles.map((file) => `${packRoot}/${file}`);
const missingManifestRefs = expectedPackRefs.filter((relativePath) => !requiredKnowledgeFiles.includes(relativePath));

assert(missingPackFiles.length === 0, `Missing pack files: ${missingPackFiles.join(', ')}`);
assert(wiring.version >= 4, `Wiring manifest version is not updated: ${wiring.version}`);
assert(wiring.canonicalRoots?.knowledgePack20260502 === packRoot, 'Wiring manifest missing canonical pack root');
assert((wiring.knowledgeByCategory?.knowledgePack20260502 || []).length === 11, 'Wiring manifest pack category must list 11 files');
assert(missingManifestRefs.length === 0, `Manifest missing pack references: ${missingManifestRefs.join(', ')}`);
assert(prompt.includes('SKYDEXIA_AI_BOOT_PROMPT.md'), 'Orchestrator prompt is missing the pack boot prompt');
assert(prompt.includes('SKYDEXIA_KNOWLEDGE_CORE.md'), 'Orchestrator prompt is missing the pack core knowledge');
assert(prompt.includes('skydexia_knowledge.json'), 'Orchestrator prompt is missing structured pack memory');
assert(prompt.includes('skydexia_knowledge_chunks.jsonl'), 'Orchestrator prompt is missing RAG chunks');
assert((brainLinks.mustLoadWhenAvailable || []).some((entry) => entry.includes('SKYDEXIA_AI_BOOT_PROMPT.md')), '90GB brain link map is missing the pack boot prompt');
assert(brainLinks.latestKnowledgePack?.version === '2026-05-02', '90GB brain link map is missing latest pack metadata');
assert(neuralManifest.knowledgeSources?.totalRegistered === 60, 'Neural release manifest knowledge count is not 60');
assert(neuralManifest.knowledgeSources?.categories?.includes('pack'), 'Neural release manifest is missing the pack category');
assert(neuralIndex.includes('60 registered files across 8 categories'), 'Neural index does not show the updated knowledge count');
assert(neuralIndex.includes('SkyDexia Knowledge Pack 2026-05-02'), 'Neural index does not show the latest pack');
assert(neuralOriginal.includes('60 knowledge files registered across 8 categories'), 'Original neural surface does not show the updated knowledge count');
assert(skydexiaPlatform.knowledgeBinding?.packVersion === '2026-05-02', 'SkyDexia platform registration is missing the pack binding');
assert(neuralPlatform.knowledgeBinding?.packVersion === '2026-05-02', 'SkyeDexia Neural platform registration is missing the pack binding');
assert(trustedSource.id === 'skydexia-knowledge-pack-2026-05-02', 'Trusted source record is missing or incorrect');

const result = {
  ok: true,
  checkedAt: new Date().toISOString(),
  packRoot,
  packFiles: packFiles.length,
  wiringVersion: wiring.version,
  registeredKnowledgeFiles: requiredKnowledgeFiles.length,
  promptChars: prompt.length,
  surfaces: {
    orchestratorPrompt: true,
    wiringManifest: true,
    brainDriveKnowledgeLinks: true,
    neuralIndex: true,
    neuralReleaseManifest: true,
    dynastyPlatformRegistrations: true,
    trustedSource: true
  }
};

console.log(JSON.stringify(result, null, 2));
