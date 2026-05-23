import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
const ROOT = process.cwd();
const fail = msg => { console.error(`❌ ${msg}`); process.exitCode = 1; };
const ok = msg => console.log(`✅ ${msg}`);
async function exists(rel){ try{ await stat(path.join(ROOT, rel)); return true; } catch{ fail(`${rel} missing`); return false; } }
const manifest = JSON.parse(await readFile(path.join(ROOT,'template-library/manifest.json'),'utf8'));
const categories = JSON.parse(await readFile(path.join(ROOT,'template-library/categories.json'),'utf8'));
const jurisdictions = JSON.parse(await readFile(path.join(ROOT,'template-library/jurisdictions.json'),'utf8'));
const required = ['index.html','documents/index.html','builder/index.html','workspace/index.html','vault/index.html','audit/index.html','api/index.html','not-legal-advice/index.html','official-sources/index.html','template-governance/index.html','review-queue/index.html','trust-center/index.html','template-health/index.html','assets/multipage.js'];
for (const rel of required) await exists(rel);
for (const c of categories) await exists(`categories/${c.slug}/index.html`);
const stateSlug = j => j.state_name.toLowerCase().replaceAll(' ', '-').replaceAll('.', '');
for (const j of jurisdictions) await exists(`states/${stateSlug(j)}/index.html`);
let checked = 0;
for (const r of (manifest.records || []).filter((_, i) => i % 137 === 0)) { const slug = r.base_id.split('/').pop(); await exists(`templates/${r.jurisdiction_id}/${r.category_slug}/${slug}/index.html`); await exists(`build/${r.jurisdiction_id}/${r.category_slug}/${slug}/index.html`); checked++; }
ok(`${checked} sampled template detail/build pages checked`);
const sitemap = await readFile(path.join(ROOT,'sitemap.xml'),'utf8');
for (const rel of ['/documents/','/builder/','/official-sources/','/template-governance/','/review-queue/','/templates/US-AZ/business-formation-governance/single-member-llc-operating-agreement/','/build/US-AZ/business-formation-governance/single-member-llc-operating-agreement/']) { if(!sitemap.includes(rel)) fail(`sitemap missing ${rel}`); }
async function countIndexFiles(dir){ let total = 0; const entries = await (await import('node:fs/promises')).readdir(dir, { withFileTypes: true }); for(const entry of entries){ if(entry.name === 'node_modules') continue; const full = path.join(dir, entry.name); if(entry.isDirectory()) total += await countIndexFiles(full); else if(entry.isFile() && entry.name === 'index.html') total += 1; } return total; }
const pageCount = await countIndexFiles(ROOT);
if(pageCount < 20000) fail(`expected 20,000+ crawlable index pages, found ${pageCount}`); else ok(`${pageCount} crawlable index pages checked`);
if(!process.exitCode) ok('SovereignDocs v6 multipage smoke passed');
