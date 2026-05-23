import { readFileSync, existsSync } from 'node:fs';
const required = ['index.html','app.html','landing.css','sitemap.xml','robots.txt','llms.txt','llms-full.txt','ai.md','proof.html','manifest.webmanifest'];
for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
}
const index = readFileSync('index.html','utf8');
for (const marker of ['SoftwareApplication','FAQPage','Launch Vault','Ten original game worlds']) {
  if (!index.includes(marker)) throw new Error(`index.html missing ${marker}`);
}
const sitemap = readFileSync('sitemap.xml','utf8');
const gameIds = ['skyeace','uptime','dns','scepter','reliquary','koatsu','leads','caseDesk','desktopQuest','vanta'];
for (const id of gameIds) {
  if (!existsSync(`games/${id}.html`)) throw new Error(`Missing game page ${id}`);
  if (!sitemap.includes(`/games/${id}.html`)) throw new Error(`Sitemap missing game page ${id}`);
}
const llms = readFileSync('llms.txt','utf8');
if (!llms.includes('Claim boundaries')) throw new Error('llms.txt missing claim boundaries');
console.log('SEO static check passed');
