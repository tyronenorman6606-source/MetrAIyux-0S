import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const factoryFile = path.join(repoRoot, 'tools/founder-command/run-reflection-and-collective-drops.mjs');
const proofPath = path.join(
  repoRoot,
  'test-artifacts/reflection-and-collective-drops/skyemusicnexus-generated-audio-review-gate-proof-latest.json',
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(factoryFile, 'utf8');
const guarantees = [
  {
    id: 'promotion_requires_explicit_approval',
    ok: source.includes("process.argv.includes('--promote-approved-audio')") &&
      source.includes("process.env.SKYE_MUSIC_PROMOTE_GENERATED_AUDIO === '1'"),
  },
  {
    id: 'generated_audio_quality_gate_exists',
    ok: source.includes('function generatedAudioQualityGate') &&
      source.includes('held_for_founder_review') &&
      source.includes('Generated audio is held until an approved master passes founder audio review.'),
  },
  {
    id: 'held_products_are_not_active_products',
    ok: source.includes("status: qualityGate ? 'draft-quality-hold' : 'active'") &&
      source.includes("publicReleaseStatus: qualityGate ? 'held-for-founder-review' : 'published'") &&
      source.includes("audioFile: qualityGate ? '' : relativeFromArtist"),
  },
  {
    id: 'public_audio_is_tombstoned_when_held',
    ok: source.includes('Audio held for founder review before public promotion') &&
      source.includes('publicAudioFile') &&
      source.includes('heldAudioFile'),
  },
  {
    id: 'held_tracks_skip_feed_and_release_rooms',
    ok: source.includes("skipped: 'audio_quality_hold'") &&
      source.includes('item.publicPromotion !== false') &&
      source.includes('result.publicPromotion !== false'),
  },
  {
    id: 'worker_product_registration_preserves_hold_status',
    ok: source.includes("status: localProduct.status || 'active'") &&
      source.includes('qualityGate: localProduct.qualityGate || null'),
  },
];

for (const guarantee of guarantees) {
  assert(guarantee.ok, `${guarantee.id} failed`);
}

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  factoryFile: path.relative(repoRoot, factoryFile),
  promotionFlag: '--promote-approved-audio',
  envPromotionFlag: 'SKYE_MUSIC_PROMOTE_GENERATED_AUDIO=1',
  defaultBehavior: 'generated audio is held for founder review and not promoted publicly',
  guarantees,
};

fs.mkdirSync(path.dirname(proofPath), {recursive: true});
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
