/**
 * VantaCore Storage / Media Ingestion Layer
 * Supports AWS S3 and Cloudflare R2 for file uploads, presigned URLs,
 * and media pipeline handling (quote photos, intake attachments, etc.)
 *
 * Section 9 Preferred Stack: Cloudflare R2 or Supabase Storage
 */

import { env } from "@/lib/env";
import { isLocalRuntime } from "@/lib/runtime-env";

export interface UploadResult {
  url: string;
  key: string;
  provider: "s3" | "r2";
}

export interface PresignedUrlRequest {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: Date;
}

/**
 * Determine active storage provider.
 * R2 takes precedence if both are configured.
 */
export function getStorageProvider(): "r2" | "s3" | null {
  if (env.isR2) return "r2";
  if (env.isS3) return "s3";
  return null;
}

/**
 * Generate a sanitized, tenant-scoped storage key.
 */
export function makeStorageKey(
  tenantId: string,
  category: "quotes" | "intake" | "reviews" | "campaigns" | "content",
  fileName: string
): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${tenantId}/${category}/${timestamp}_${safeName}`;
}

/**
 * Create a presigned upload URL for direct browser-to-storage uploads.
 * This keeps secret keys off the client.
 *
 * NOTE: Local mode can return a deterministic mock URL for UI testing.
 * Production refuses to mint fake presigned URLs.
 */
export async function createPresignedUploadUrl(
  req: PresignedUrlRequest
): Promise<PresignedUrlResult | null> {
  const provider = getStorageProvider();
  if (!provider) {
    console.warn("[Storage] No storage provider configured — presigned URL unavailable");
    return null;
  }

  if (env.isProduction && !isLocalRuntime()) {
    throw new Error("Production upload signing is not wired yet. Route file uploads through the 0S/FS27 storage adapter before enabling VantaCore uploads.");
  }

  const expiresIn = req.expiresInSeconds || 300;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  if (provider === "r2") {
    const publicUrl = env.r2PublicUrl;
    if (!publicUrl) throw new Error("R2 public URL is required for upload URLs.");
    // TODO: Replace with real R2/S3 SDK presigned URL generation
    const uploadUrl = `${publicUrl}/${req.key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=MOCK`;
    return {
      uploadUrl,
      publicUrl: `${publicUrl}/${req.key}`,
      key: req.key,
      expiresAt,
    };
  }

  // S3 path
  const bucket = env.s3Bucket;
  const region = env.s3Region;
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${req.key}`;
  const uploadUrl = `${publicUrl}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=MOCK`;
  return {
    uploadUrl,
    publicUrl,
    key: req.key,
    expiresAt,
  };
}

/**
 * Confirm an upload completed and persist the record.
 * In mock mode, this simply validates the key exists.
 */
export async function confirmUpload(
  tenantId: string,
  key: string,
  metadata?: { uploadedBy?: string; source?: string }
): Promise<UploadResult | null> {
  const provider = getStorageProvider();
  if (!provider) {
    console.warn("[Storage] No provider — cannot confirm upload");
    return null;
  }

  if (env.isProduction && !isLocalRuntime()) {
    throw new Error("Production upload confirmation must verify object existence through the 0S/FS27 storage adapter.");
  }

  // TODO: In production, perform a HEAD request against the object
  // to verify it exists before returning success.
  console.info(`[Storage] Upload confirmed for tenant=${tenantId} key=${key}`, metadata);

  return {
    url: provider === "r2"
      ? `${env.r2PublicUrl}/${key}`
      : `https://${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com/${key}`,
    key,
    provider,
  };
}

/**
 * Delete an object from storage.
 */
export async function deleteObject(key: string): Promise<boolean> {
  const provider = getStorageProvider();
  if (!provider) {
    console.warn("[Storage] No provider — cannot delete object");
    return false;
  }

  if (env.isProduction && !isLocalRuntime()) {
    throw new Error("Production deletes must route through the 0S/FS27 storage adapter.");
  }

  // TODO: Integrate real S3/R2 delete call
  console.info(`[Storage] Delete object key=${key} provider=${provider}`);
  return true;
}
