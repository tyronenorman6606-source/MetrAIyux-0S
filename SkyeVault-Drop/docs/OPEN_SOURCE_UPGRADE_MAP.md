# Open Source Upgrade Map

## Adopted in v1.2.0

✅ `google-auth-library`

Used for Google service-account authentication. This replaces manual JWT signing with Google's maintained Node.js auth library while keeping the same Netlify + Drive resumable upload architecture.

✅ `p-retry`

Used for bounded exponential backoff around Google auth and retryable Google Drive API calls. This improves behavior under transient 408, 425, 429, 500, 502, 503, and 504 responses without pretending quota or permission errors are recoverable.

## Evaluated but not dropped in blindly

☐ Uppy

Uppy is a proven browser uploader with strong UX, plugin architecture, and recovery features. It is not yet wired in because this app uploads to Google Drive resumable session URLs, not a standard tus/S3 endpoint. A clean Uppy integration would require either a custom Uppy uploader plugin for Google Drive resumable URLs or a backend upload service.

☐ tus / tusd / tus-js-client

tus is a serious open resumable-upload protocol with official server and client implementations. It is not a clean Netlify-only upgrade because it expects a tus server and storage backend. It becomes the right move if this platform grows beyond Google Drive into Cloudflare R2/S3/VPS storage.

☐ rclone

rclone is excellent for operator-side syncing, backup, mirroring, and recovery across Drive/storage providers. It does not belong inside the browser upload path, but it is a strong companion for nightly backups, Drive-to-R2 mirroring, or migration jobs.

## Next serious upgrade path

1. Add optional Cloudflare R2 destination support for cheaper long-term video storage.
2. Add a tus server path only if you deploy a real backend outside Netlify Functions.
3. Add background Drive-to-R2 mirroring with rclone or provider-native workers.
4. Add malware scanning and client/project-level retention policies before this becomes client-scale infrastructure.
