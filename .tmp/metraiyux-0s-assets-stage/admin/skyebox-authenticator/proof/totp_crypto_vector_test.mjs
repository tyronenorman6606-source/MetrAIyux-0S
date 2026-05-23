import { webcrypto as crypto } from 'node:crypto';

const enc = new TextEncoder();
const dec = new TextDecoder();
function normalizeSecret(secret) { return String(secret || '').toUpperCase().replace(/[\s=-]/g, ''); }
function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = normalizeSecret(base32);
  let bits = '';
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value === -1) throw new Error('bad base32');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}
async function getHmacKey(secret, algorithm) {
  return crypto.subtle.importKey('raw', base32ToBytes(secret), { name: 'HMAC', hash: { name: algorithm } }, false, ['sign']);
}
async function generateTotp(secret, { period = 30, digits = 8, algorithm = 'SHA-1', timestamp }) {
  const counter = Math.floor(timestamp / 1000 / period);
  const key = await getHmacKey(secret, algorithm);
  const counterBytes = new ArrayBuffer(8);
  const view = new DataView(counterBytes);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary = ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  return String(binary % (10 ** digits)).padStart(digits, '0');
}
function toBase64(bytes) { return Buffer.from(bytes).toString('base64'); }
function fromBase64(value) { return new Uint8Array(Buffer.from(value, 'base64')); }
async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // RFC 6238 SHA-1 test seed, base32 encoded
const vectors = [
  [59_000, '94287082'],
  [1111111109_000, '07081804'],
  [1111111111_000, '14050471'],
  [1234567890_000, '89005924'],
  [2000000000_000, '69279037']
];
for (const [timestamp, expected] of vectors) {
  const got = await generateTotp(secret, { timestamp, digits: 8, algorithm: 'SHA-1' });
  if (got !== expected) throw new Error(`TOTP vector failed: ${timestamp} got ${got}, expected ${expected}`);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await deriveKey('correct horse battery staple', salt, 310000);
const payload = enc.encode(JSON.stringify({ accounts: [{ issuer: 'Example', label: 'a@example.com', secret: 'JBSWY3DPEHPK3PXP', algorithm: 'SHA-1', digits: 6, period: 30 }] }));
const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(toBase64(iv)) }, key, fromBase64(toBase64(encrypted)));
const parsed = JSON.parse(dec.decode(decrypted));
if (parsed.accounts[0].issuer !== 'Example') throw new Error('AES-GCM roundtrip failed');
console.log('totp_crypto_vector_test: ok');
