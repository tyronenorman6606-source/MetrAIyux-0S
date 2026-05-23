import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const lib = path.join(root, 'template-library');
const manifest = JSON.parse(fs.readFileSync(path.join(lib, 'manifest.json'), 'utf8'));
const records = manifest.records || [];
const index = records.map(r => ({ id:r.id, title:r.title, category:r.category_slug, categoryName:r.category_name, jurisdiction:r.jurisdiction_id, stateCode:r.state_code, stateName:r.state_name, riskLevel:r.risk_level, status:r.status, path:r.path, baseId:r.base_id, url:`/templates/${r.jurisdiction_id}/${r.category_slug}/${r.base_id.split('/').pop()}/`, buildUrl:`/build/${r.jurisdiction_id}/${r.category_slug}/${r.base_id.split('/').pop()}/`, searchText:`${r.title} ${r.category_name} ${r.state_name} ${r.base_id} ${r.risk_level}`.toLowerCase() }));
fs.writeFileSync(path.join(lib, 'search-index.json'), JSON.stringify({ version:'6.0.0', count:index.length, generatedAt:new Date().toISOString(), index }, null, 2) + '\n');
console.log(`✅ Search index built for ${index.length} v2.1 template records`);
