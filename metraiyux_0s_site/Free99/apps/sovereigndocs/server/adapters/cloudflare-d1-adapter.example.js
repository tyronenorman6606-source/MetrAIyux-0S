// Example Cloudflare D1 adapter skeleton. Not wired by default.
// Intended for a Worker with env.DB bound to D1.

export class D1SovereignDocsAdapter {
  constructor(env) { this.env = env; }
  async saveDocument(doc) { throw new Error('Wire env.DB insert using database/cloudflare-d1/schema.sql before enabling.'); }
  async listDocuments(session) { throw new Error('Wire tenant-scoped select before enabling.'); }
  async audit(event) { throw new Error('Wire audit insert before enabling.'); }
}
