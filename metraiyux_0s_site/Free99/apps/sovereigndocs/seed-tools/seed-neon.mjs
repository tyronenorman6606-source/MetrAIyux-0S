import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const root = process.env.SOVEREIGNDOCS_LIBRARY_ROOT || "./template-library";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing. Add it to .env first.");
  process.exit(1);
}

const schemaSql = fs.readFileSync("./seed-tools/schema.sql", "utf8");
const categories = JSON.parse(fs.readFileSync(path.join(root, "categories.json"), "utf8"));
const jurisdictions = JSON.parse(fs.readFileSync(path.join(root, "jurisdictions.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

const pool = new Pool({ connectionString: databaseUrl, ssl: databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined });

try {
  await pool.query("BEGIN");
  await pool.query(schemaSql);

  for (const c of categories) {
    await pool.query(
      `INSERT INTO sovereigndocs_categories (slug, name, template_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, template_count = EXCLUDED.template_count`,
      [c.slug, c.name, c.template_count]
    );
  }

  for (const j of jurisdictions) {
    await pool.query(
      `INSERT INTO sovereigndocs_jurisdictions (jurisdiction_id, country, state_code, state_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (jurisdiction_id) DO UPDATE SET country = EXCLUDED.country, state_code = EXCLUDED.state_code, state_name = EXCLUDED.state_name`,
      [j.jurisdiction_id, j.country, j.state_code, j.state_name]
    );
  }

  let count = 0;
  for (const rec of manifest.records) {
    const record = JSON.parse(fs.readFileSync(rec.path, "utf8"));
    await pool.query(
      `INSERT INTO sovereigndocs_templates
       (id, base_id, slug, title, category_slug, category_name, jurisdiction_id, state_code, state_name, risk_level, status, checksum, path, record, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       ON CONFLICT (id) DO UPDATE SET
         base_id = EXCLUDED.base_id,
         slug = EXCLUDED.slug,
         title = EXCLUDED.title,
         category_slug = EXCLUDED.category_slug,
         category_name = EXCLUDED.category_name,
         jurisdiction_id = EXCLUDED.jurisdiction_id,
         state_code = EXCLUDED.state_code,
         state_name = EXCLUDED.state_name,
         risk_level = EXCLUDED.risk_level,
         status = EXCLUDED.status,
         checksum = EXCLUDED.checksum,
         path = EXCLUDED.path,
         record = EXCLUDED.record,
         updated_at = NOW()`,
      [
        record.id,
        record.base_id,
        record.slug,
        record.title,
        record.category.slug,
        record.category.name,
        record.jurisdiction.jurisdiction_id,
        record.jurisdiction.state_code,
        record.jurisdiction.state_name,
        record.risk_level,
        record.status,
        record.checksum,
        rec.path,
        record
      ]
    );
    count++;
  }

  await pool.query("COMMIT");
  console.log(JSON.stringify({ ok: true, insertedOrUpdated: count }, null, 2));
} catch (err) {
  await pool.query("ROLLBACK");
  console.error(err);
  process.exit(1);
} finally {
  await pool.end();
}
