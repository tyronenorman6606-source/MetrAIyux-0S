import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0, fail = 0;
async function read(rel){ return fs.readFile(path.join(DIST, rel), 'utf8'); }
async function exists(rel){ try { await fs.access(path.join(DIST, rel)); return true; } catch { return false; } }
function ok(cond, label){ if(cond){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
function json(body){ try { return JSON.parse(body); } catch { return {}; } }
const routes = ['about','how-it-works','for-businesses','advertise','network','contact'];
const home = await read('index.html');
ok(home.includes('Arizona verified business network'), 'homepage rewritten as public website');
ok(home.includes('Explore the marketplace'), 'homepage has buyer CTA');
ok(home.includes('Claim or improve a profile'), 'homepage has owner CTA');
ok(home.includes('Data honesty'), 'homepage has data honesty section');
ok(!home.includes('/ae-command/" rel="nofollow">AE Command'), 'public homepage no longer exposes crowded AE command nav');
ok(home.includes('site-footer public-footer'), 'public homepage has guardrail footer');
for(const route of routes){
  ok(await exists(`${route}/index.html`), `/${route}/ exists`);
  const body = await read(`${route}/index.html`);
  ok(body.includes('PHX Verified'), `/${route}/ carries PHX Verified copy`);
  ok(body.includes('site-footer public-footer'), `/${route}/ has footer`);
}
const directory = await read('directory/index.html');
ok(directory.includes('public-topbar'), 'directory header uses simplified public nav');
ok(!directory.includes('AE Command</a><a href="/accounts/'), 'directory no longer shows dense operator nav chain');
const data = json(await read('data/website-content.json'));
ok(data.version === '23.0.0', 'website-content JSON is v23');
ok((data.routes || []).includes('/for-businesses/'), 'website-content includes owner route');
ok((data.claims_guardrails || []).some(x => x.includes('not automatically owner-verified')), 'website-content preserves claim guardrail');
const readiness = json(await read('data/v23-website-readiness.json'));
ok(readiness.version === '23.0.0', 'v23 readiness JSON exists');
ok((readiness.proof?.header_replacements || 0) > 0, 'v23 cleaned generated headers');
const sitemap = await read('sitemap-pages.xml');
ok(sitemap.includes('/about/'), 'sitemap includes /about/');
ok(sitemap.includes('/advertise/'), 'sitemap includes /advertise/');
const llms = await read('llms.txt');
ok(llms.includes('## Public website'), 'llms.txt includes public website context');
const seed = json(await read('seed-report.json'));
ok(seed.version === '23.0.0', 'seed report promoted to v23');
ok(seed.website?.homepage === 'rewritten_for_marketplace_sales', 'seed report records website rewrite');
if(fail){ console.error(`v23 website smoke failed: ${fail} failed, ${pass} passed`); process.exit(1); }
console.log(`v23 website smoke passed: ${pass} checks passed`);
