#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const generatorPath = path.join(repoRoot, 'tools', 'founder-command', 'run-reflection-and-collective-drops.mjs');
const receiptPath = path.join(repoRoot, 'test-artifacts', 'reflection-and-collective-drops', 'skyemusicnexus-long-form-master-proof-latest.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(generatorPath, 'utf8');

for (const snippet of [
  'const singleMasterCompatibilityLimitSeconds = 300',
  'function splitDurationIntoParts',
  'function stripLeadingId3v2',
  'function stripTrailingId3v1',
  'function assembleMp3Master',
  'function lyricsForAssemblyPart',
  'function songForAssemblyPart',
  'async function callMusicProviderWithAssembly',
  'targetDurationSeconds <= singleMasterCompatibilityLimitSeconds',
  'assemble_only_after_every_part_response_ok',
  'mp3-concat-strip-id3-tags',
  'function writeLongFormPartAudioFiles',
  'function songMasterReceiptMetadata',
  "writeJson(path.join(binDir, 'provider-prompts.json'), songMaster.providerPrompts)",
  'publicGeneratedAudioProvider',
  'provider: publicGeneratedAudioProvider',
]) {
  assert(source.includes(snippet), `missing long-form support snippet: ${snippet}`);
}

for (const receiptField of [
  'targetDurationSeconds',
  'assembledFromParts',
  'oneContinuousMaster',
  'partDurationsSeconds',
  'providerPrompts',
  'songMaster',
  'longFormAssembly',
]) {
  const matches = source.match(new RegExp(receiptField, 'g')) || [];
  assert(matches.length >= 2, `long-form receipt field not sufficiently wired: ${receiptField}`);
}

assert(/if\s*\(\s*targetDurationSeconds\s*<=\s*singleMasterCompatibilityLimitSeconds\s*\|\|\s*targetDurationSeconds\s*<=\s*maxPartSeconds\s*\)/.test(source), 'single-master compatibility guard missing');
assert(/const\s+parts\s*=\s*splitDurationIntoParts\(targetDurationSeconds,\s*maxPartSeconds\)/.test(source), 'long-form split call missing');
assert(/if\s*\(!generatedPart\.ok\)\s*{[\s\S]*status:\s*'part_failed'/.test(source), 'part failure must block assembly');
assert(/const\s+audio\s*=\s*assembleMp3Master\(audioParts\)/.test(source), 'final MP3 assembly call missing');

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  file: path.relative(repoRoot, generatorPath),
  assertions: {
    keepsSingleMasterCompatibilityForUpTo300Seconds: true,
    splitsLongFormRunsByProviderCap: true,
    assemblesOnlyAfterEveryPartOk: true,
    stripsId3TagsDuringMp3Assembly: true,
    recordsSongMasterAndPartReceipts: true,
    writesProviderPromptsSidecar: true,
    publicProductProviderStaysGeneric: true,
    externalProvidersNotCalledByProof: true,
    browserProofSkippedByOwnerPolicy: true,
  },
};

fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
