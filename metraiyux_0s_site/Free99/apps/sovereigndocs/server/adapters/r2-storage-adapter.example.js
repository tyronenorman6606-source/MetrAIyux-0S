// Example Cloudflare R2 storage adapter skeleton. Not wired by default.

export class R2SovereignDocsStorageAdapter {
  constructor(env) { this.bucket = env.R2_BUCKET; }
  async putExport(key, body, contentType) {
    if(!this.bucket) throw new Error('R2_BUCKET binding missing.');
    await this.bucket.put(key, body, { httpMetadata: { contentType } });
    return { storageKey: key };
  }
}
