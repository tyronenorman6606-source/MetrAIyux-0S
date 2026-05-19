import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const drop = path.join(process.cwd(), 'official-ingestion', 'drop');
const out = path.join(process.cwd(), 'official-ingestion', 'staging-ledger.json');
fs.mkdirSync(drop, { recursive: true });
const files = fs.readdirSync(drop).filter(f => !f.startsWith('.'));
const records = files.map(file => {
  const full = path.join(drop, file);
  const buf = fs.readFileSync(full);
  return {
    filename: file,
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    detected_type: path.extname(file).replace('.', '').toLowerCase() || 'unknown',
    status: 'staged_requires_source_and_rights_review',
    required_metadata: ['official_source_url', 'source_owner', 'download_date', 'permission_or_public_domain_basis', 'reviewer']
  };
});
fs.writeFileSync(out, JSON.stringify({ generated_at: new Date().toISOString(), count: records.length, records }, null, 2));
console.log(`Indexed ${records.length} official-source drop file(s).`);
console.log(out);
