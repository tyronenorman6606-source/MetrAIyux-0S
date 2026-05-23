import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import {
  buildSafeManifest,
  detectProviders,
  parseDotEnv,
  PROVIDER_DEFINITIONS,
  type ProviderName,
  type SafeManifest
} from "@skyeapi/core";

export interface AegisCoreOptions {
  vaultPath: string;
  passphrase: string;
  projectId?: string;
}

export interface AegisAuditEvent {
  at: string;
  action: string;
  details?: Record<string, unknown>;
}

export interface AegisPayload {
  version: "aegiscore.local.v1";
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  providers: Record<string, Record<string, string>>;
  audit: AegisAuditEvent[];
}

export interface EncryptedVaultFile {
  version: "aegiscore.encrypted.v1";
  algorithm: "aes-256-gcm";
  kdf: "scrypt";
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  if (!passphrase || passphrase.length < 12) {
    throw new Error("AegisCore passphrase must be at least 12 characters.");
  }
  return scryptSync(passphrase, salt, 32);
}

function encryptPayload(payload: AegisPayload, passphrase: string): EncryptedVaultFile {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: "aegiscore.encrypted.v1",
    algorithm: "aes-256-gcm",
    kdf: "scrypt",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

function decryptPayload(file: EncryptedVaultFile, passphrase: string): AegisPayload {
  const salt = Buffer.from(file.salt, "base64");
  const iv = Buffer.from(file.iv, "base64");
  const tag = Buffer.from(file.tag, "base64");
  const ciphertext = Buffer.from(file.ciphertext, "base64");
  const key = deriveKey(passphrase, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as AegisPayload;
}

export class LocalAegisCore {
  private readonly vaultPath: string;
  private readonly passphrase: string;
  private readonly projectId?: string;

  constructor(options: AegisCoreOptions) {
    this.vaultPath = options.vaultPath;
    this.passphrase = options.passphrase;
    this.projectId = options.projectId;
  }

  async init(): Promise<AegisPayload> {
    const now = new Date().toISOString();
    const payload: AegisPayload = {
      version: "aegiscore.local.v1",
      projectId: this.projectId,
      createdAt: now,
      updatedAt: now,
      providers: {},
      audit: [{ at: now, action: "vault.init" }]
    };
    await this.save(payload);
    return payload;
  }

  async exists(): Promise<boolean> {
    try {
      await readFile(this.vaultPath, "utf8");
      return true;
    } catch {
      return false;
    }
  }

  async load(): Promise<AegisPayload> {
    const raw = await readFile(this.vaultPath, "utf8");
    const encrypted = JSON.parse(raw) as EncryptedVaultFile;
    return decryptPayload(encrypted, this.passphrase);
  }

  async save(payload: AegisPayload): Promise<void> {
    payload.updatedAt = new Date().toISOString();
    await mkdir(dirname(this.vaultPath), { recursive: true });
    const encrypted = encryptPayload(payload, this.passphrase);
    await writeFile(this.vaultPath, `${JSON.stringify(encrypted, null, 2)}\n`, "utf8");
  }

  async importEnvText(envText: string): Promise<SafeManifest> {
    const env = parseDotEnv(envText);
    const payload = (await this.exists()) ? await this.load() : await this.init();
    for (const detection of detectProviders(env)) {
      const definition = PROVIDER_DEFINITIONS.find((item) => item.provider === detection.provider);
      const providerSecrets: Record<string, string> = {};
      for (const key of [...detection.requiredKeys, ...(definition?.optionalKeys ?? [])]) {
        if (env[key]) providerSecrets[key] = env[key];
      }
      if (Object.keys(providerSecrets).length > 0) {
        payload.providers[detection.provider] = {
          ...(payload.providers[detection.provider] ?? {}),
          ...providerSecrets
        };
      }
    }
    payload.audit.push({
      at: new Date().toISOString(),
      action: "vault.import_env",
      details: { keys_seen: Object.keys(env).length }
    });
    await this.save(payload);
    return this.safeManifest();
  }

  async safeManifest(): Promise<SafeManifest> {
    const payload = await this.load();
    const flattened: Record<string, string> = {};
    for (const providerSecrets of Object.values(payload.providers)) {
      for (const [key, value] of Object.entries(providerSecrets)) {
        flattened[key] = value;
      }
    }
    return buildSafeManifest(flattened, payload.projectId);
  }

  async listProviderNames(): Promise<ProviderName[]> {
    const manifest = await this.safeManifest();
    return manifest.providers.filter((provider) => provider.connected).map((provider) => provider.name);
  }

  async getProviderSecrets(provider: ProviderName): Promise<Record<string, string>> {
    const payload = await this.load();
    return { ...(payload.providers[provider] ?? {}) };
  }


  async getAllProviderSecrets(): Promise<Record<string, Record<string, string>>> {
    const payload = await this.load();
    return JSON.parse(JSON.stringify(payload.providers)) as Record<string, Record<string, string>>;
  }

  async audit(action: string, details?: Record<string, unknown>): Promise<void> {
    const payload = await this.load();
    payload.audit.push({ at: new Date().toISOString(), action, details });
    await this.save(payload);
  }
}

export function defaultVaultPath(): string {
  return process.env.SKYEAPI_VAULT_PATH || ".aegiscore/vault.json";
}

export function defaultPassphrase(): string {
  const passphrase = process.env.SKYEAPI_VAULT_PASSPHRASE;
  if (!passphrase) {
    throw new Error("Set SKYEAPI_VAULT_PASSPHRASE before using AegisCore Lite.");
  }
  return passphrase;
}
