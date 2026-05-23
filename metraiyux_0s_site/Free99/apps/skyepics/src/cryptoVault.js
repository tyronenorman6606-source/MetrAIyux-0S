const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const VAULT_VERSION = 'skyepics-vault-v1';
export const DEFAULT_KDF = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 410000,
  keyLength: 256
};

export function randomBytes(length = 16) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Base64(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToBase64(new Uint8Array(digest));
}

export async function deriveVaultKey(password, saltBase64, kdf = DEFAULT_KDF) {
  if (!password || password.length < 8) {
    throw new Error('Use a vault password with at least 8 characters.');
  }
  const salt = base64ToBytes(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: kdf.iterations || DEFAULT_KDF.iterations,
      hash: kdf.hash || DEFAULT_KDF.hash
    },
    keyMaterial,
    { name: 'AES-GCM', length: kdf.keyLength || DEFAULT_KDF.keyLength },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBytes(plainBytes, key, aad = VAULT_VERSION) {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: encoder.encode(aad)
    },
    key,
    plainBytes
  );
  return {
    alg: 'AES-GCM',
    iv: bytesToBase64(iv),
    aad,
    data: bytesToBase64(new Uint8Array(encrypted))
  };
}

export async function decryptBytes(payload, key) {
  if (!payload || payload.alg !== 'AES-GCM' || !payload.iv || !payload.data) {
    throw new Error('Invalid encrypted payload.');
  }
  const plain = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(payload.iv),
      additionalData: encoder.encode(payload.aad || VAULT_VERSION)
    },
    key,
    base64ToBytes(payload.data)
  );
  return new Uint8Array(plain);
}

export async function encryptText(text, key, aad = VAULT_VERSION) {
  return encryptBytes(encoder.encode(text), key, aad);
}

export async function decryptText(payload, key) {
  const bytes = await decryptBytes(payload, key);
  return decoder.decode(bytes);
}

export async function encryptJson(value, key, aad = VAULT_VERSION) {
  return encryptText(JSON.stringify(value), key, aad);
}

export async function decryptJson(payload, key) {
  const text = await decryptText(payload, key);
  return JSON.parse(text);
}

export function makeVaultHeader() {
  return {
    vault: VAULT_VERSION,
    createdAt: new Date().toISOString(),
    salt: bytesToBase64(randomBytes(32)),
    kdf: DEFAULT_KDF,
    verifier: null
  };
}

export async function createVerifier(key) {
  const verifier = {
    phrase: 'SKYEPICS_UNLOCK_VERIFIER',
    createdAt: new Date().toISOString()
  };
  return encryptJson(verifier, key, `${VAULT_VERSION}:verifier`);
}

export async function verifyKey(header, key) {
  const value = await decryptJson(header.verifier, key);
  if (value.phrase !== 'SKYEPICS_UNLOCK_VERIFIER') {
    throw new Error('Vault password verifier did not match.');
  }
  return true;
}

export async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

export function bytesToBlob(bytes, mime = 'application/octet-stream') {
  return new Blob([bytes], { type: mime });
}
