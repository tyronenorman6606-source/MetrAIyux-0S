// Example adapter skeleton for Neon/Postgres. Not wired by default.
// Requires a Postgres client dependency and DATABASE_URL in production.

export class NeonSovereignDocsAdapter {
  constructor({ sql }) { this.sql = sql; }
  async saveDocument(doc) { throw new Error('Wire sql insert using database/neon/schema.sql before enabling.'); }
  async listDocuments(session) { throw new Error('Wire tenant-scoped select before enabling.'); }
  async audit(event) { throw new Error('Wire audit insert before enabling.'); }
}
