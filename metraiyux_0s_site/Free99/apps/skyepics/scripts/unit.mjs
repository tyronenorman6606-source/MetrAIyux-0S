import { detectSecrets, toSecretEditorDraft } from '../src/secretDetector.js';
import {
  makeVaultHeader,
  deriveVaultKey,
  createVerifier,
  verifyKey,
  encryptJson,
  decryptJson,
  encryptBytes,
  decryptBytes
} from '../src/cryptoVault.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sample = `
OPENAI_API_KEY=sk-test_1234567890abcdef1234567890
DATABASE_URL=postgresql://user:pass@example.neon.tech/db
JWT_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signaturepart
`;
const hits = detectSecrets(sample);
assert(hits.length >= 3, 'secret detector should find env-style keys');
assert(hits.some((hit) => hit.kind === 'api_key'), 'secret detector should classify API keys');
assert(hits.some((hit) => hit.kind === 'database_url'), 'secret detector should classify database URLs');

const privateKeyHits = detectSecrets('-----BEGIN PRIVATE KEY-----\nabcdefghi1234567890abcdefghijklmnop\n-----END PRIVATE KEY-----');
assert(privateKeyHits.some((hit) => hit.kind === 'private_key'), 'secret detector should preserve multiline private key blocks');
const draft = toSecretEditorDraft(hits[0], 'photo-1', sample);
assert(Array.isArray(draft.tags) && 'provider' in draft && 'rotationDue' in draft, 'secret editor draft should include v1.2 metadata fields');

const header = makeVaultHeader();
const key = await deriveVaultKey('correct horse battery', header.salt, header.kdf);
header.verifier = await createVerifier(key);
assert(await verifyKey(header, key), 'derived key should verify');

const payload = { photos: 1, secrets: ['alpha', 'beta'] };
const encryptedJson = await encryptJson(payload, key, 'unit:json');
const decryptedJson = await decryptJson(encryptedJson, key);
assert(decryptedJson.secrets[1] === 'beta', 'encrypted JSON should round trip');

const encryptedBytes = await encryptBytes(new TextEncoder().encode('camera-secret'), key, 'unit:bytes');
const decryptedBytes = await decryptBytes(encryptedBytes, key);
assert(new TextDecoder().decode(decryptedBytes) === 'camera-secret', 'encrypted bytes should round trip');

console.log(JSON.stringify({ ok: true, detected: hits.length, cryptoRoundTrip: true }, null, 2));
