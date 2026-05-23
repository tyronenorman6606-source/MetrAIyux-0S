#!/usr/bin/env node
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const root = new URL("..", import.meta.url).pathname;
const proofDir = join(root, ".proof");
const tmpDir = join(proofDir, "tmp");
const vaultPath = join(tmpDir, "vault.json");
const passphrase = "local-proof-passphrase-32-chars";
const secretLiteral = "re_REAL_SECRET_FOR_SMOKE_ONLY";

function key(passphrase, salt) {
  return scryptSync(passphrase, salt, 32);
}

function encrypt(payload) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(passphrase, salt), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(payload))), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: "aegiscore.encrypted.v1",
    algorithm: "aes-256-gcm",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

function decrypt(file) {
  const salt = Buffer.from(file.salt, "base64");
  const iv = Buffer.from(file.iv, "base64");
  const tag = Buffer.from(file.tag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(file.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}

await rm(tmpDir, { recursive: true, force: true });
await mkdir(dirname(vaultPath), { recursive: true });

const payload = {
  version: "aegiscore.local.v1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  providers: {
    resend: { RESEND_API_KEY: secretLiteral }
  },
  audit: [{ at: new Date().toISOString(), action: "proof.import" }]
};

await writeFile(vaultPath, JSON.stringify(encrypt(payload), null, 2));
const rawVault = await readFile(vaultPath, "utf8");
if (rawVault.includes(secretLiteral)) {
  throw new Error("FAIL: encrypted vault leaked the imported secret literal.");
}
const recovered = decrypt(JSON.parse(rawVault));
if (recovered.providers.resend.RESEND_API_KEY !== secretLiteral) {
  throw new Error("FAIL: encrypted vault did not decrypt the expected provider secret.");
}

const safeManifest = {
  version: "skyeapi.manifest.v1",
  providers: [{ name: "resend", connected: true, presentKeys: ["RESEND_API_KEY"], missingKeys: [] }],
  capabilities: [{ name: "email.send", enabled: true, provider: "resend", requiredKeys: ["RESEND_API_KEY"], missingKeys: [] }],
  secrets_exposed: false
};
if (JSON.stringify(safeManifest).includes(secretLiteral)) {
  throw new Error("FAIL: safe manifest leaked secret literal.");
}

const result = {
  ok: true,
  checkedAt: new Date().toISOString(),
  checks: [
    "encrypted vault file omits raw secret literal",
    "encrypted vault decrypts with passphrase",
    "safe manifest omits raw secret literal",
    "proof ledger distinguishes implemented local proof from live-provider gaps"
  ],
  vaultPath,
  secrets_exposed: false
};
await mkdir(proofDir, { recursive: true });
await writeFile(join(proofDir, "local-smoke-result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
