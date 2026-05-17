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
ok(home.includes('/insights/'), 'homepage links to operating insights');
ok(!home.includes('/ae-command/" rel="nofollow">AE Command'), 'public homepage no longer exposes crowded AE command nav');
ok(home.includes('site-footer public-footer'), 'public homepage has guardrail footer');
ok(home.includes('data-skye-component="app-first-command-center"'), 'homepage uses Skye MCP app-first command center component');
ok(home.includes('data-skye-component="scroll-proof-funnel"'), 'homepage uses Skye MCP scroll proof funnel component');
ok(home.includes('/assets/valley-verified-logo.png'), 'homepage uses supplied Valley Verified logo');
ok(!home.includes('Skye UI component'), 'homepage hides internal component labels');
ok(!home.includes('client.surface.'), 'homepage hides internal component ids');
ok(!home.includes('Selected composition'), 'homepage hides component selection text');
ok(!home.includes('SCROLL PROOF FUNNEL'), 'homepage hides internal proof-funnel label');
ok(await exists('featured/index.html'), '/featured/ exists');
const featuredPage = await read('featured/index.html');
ok(featuredPage.includes('Featured businesses get a real public landing'), '/featured/ sells public landing value');
ok(featuredPage.includes('bobs-smoke-shop-litchfield-park') && featuredPage.includes('empire-pallets-phoenix'), '/featured/ includes Bob and Empire');
for(const route of routes){
  ok(await exists(`${route}/index.html`), `/${route}/ exists`);
  const body = await read(`${route}/index.html`);
  ok(body.includes('Valley Verified'), `/${route}/ carries Valley Verified copy`);
  ok(body.includes('site-footer public-footer'), `/${route}/ has footer`);
}
ok(await exists('insights/index.html'), '/insights/ exists');
const insights = await read('insights/index.html');
ok(insights.includes('Business operating journal'), '/insights/ has operating journal hero');
ok(insights.includes('Only major platforms'), '/insights/ carries major platform rule');
ok(insights.includes('MetrAIyux 0S Full System') && insights.includes('SkyeVault') && insights.includes('SOLEnterprises'), '/insights/ lists major platforms only');
ok(await exists('insights/weekly-company-command-rhythm/index.html'), 'weekly command article exists');
const weekly = await read('insights/weekly-company-command-rhythm/index.html');
ok(weekly.includes('Manual operating method') && weekly.includes('How 0S makes it easier'), 'article includes manual method and 0S bridge');
ok(weekly.includes('SBA: Write your business plan'), 'article includes source notes');
const weeklyWords = weekly.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
ok(weeklyWords >= 1800, 'weekly command article is longform');
ok(weekly.includes('Operator diagnostics') && weekly.includes('Owner worksheet') && weekly.includes('Common ways this breaks'), 'article includes operator diagnostics, worksheet, and mistakes');
const localVisibility = await read('insights/local-visibility-that-converts/index.html');
const localWords = localVisibility.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
ok(localWords >= 1700, 'local visibility article is longform');
ok(localVisibility.includes('A 30-day local visibility plan'), 'local visibility article includes implementation plan');
const articleSlugs = [
  'weekly-company-command-rhythm',
  'local-visibility-that-converts',
  'customer-intake-follow-up-system',
  'records-receipts-and-money-hygiene',
  'small-business-security-without-paranoia',
  'reviews-social-proof-without-shady-tactics',
  'market-research-before-growth-spend'
];
for (const slug of articleSlugs) {
  const articleHtml = await read(`insights/${slug}/index.html`);
  const wordCount = articleHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  ok(wordCount >= 1500, `${slug} clears longform word floor`);
}
const directory = await read('directory/index.html');
ok(directory.includes('public-topbar'), 'directory header uses simplified public nav');
ok(!directory.includes('AE Command</a><a href="/accounts/'), 'directory no longer shows dense operator nav chain');
const data = json(await read('data/website-content.json'));
ok(data.version === '23.0.0', 'website-content JSON is v23');
ok((data.routes || []).includes('/for-businesses/'), 'website-content includes owner route');
ok((data.routes || []).includes('/featured/'), 'website-content includes featured route');
ok((data.routes || []).includes('/insights/'), 'website-content includes insights route');
ok(data.counts?.insights >= 7, 'website-content records insight count');
ok((data.claims_guardrails || []).some(x => x.includes('not automatically owner-verified')), 'website-content preserves claim guardrail');
const readiness = json(await read('data/v23-website-readiness.json'));
ok(readiness.version === '23.0.0', 'v23 readiness JSON exists');
ok((readiness.proof?.header_replacements || 0) > 0, 'v23 cleaned generated headers');
const sitemap = await read('sitemap-pages.xml');
ok(sitemap.includes('/about/'), 'sitemap includes /about/');
ok(sitemap.includes('/advertise/'), 'sitemap includes /advertise/');
ok(sitemap.includes('/insights/weekly-company-command-rhythm/'), 'sitemap includes insight article routes');
const llms = await read('llms.txt');
ok(llms.includes('## Public website'), 'llms.txt includes public website context');
ok(llms.includes('## Business insights'), 'llms.txt includes business insights context');
const seed = json(await read('seed-report.json'));
ok(seed.version === '23.0.0', 'seed report promoted to v23');
ok(seed.website?.homepage === 'rewritten_for_marketplace_sales', 'seed report records website rewrite');
if(fail){ console.error(`v23 website smoke failed: ${fail} failed, ${pass} passed`); process.exit(1); }
console.log(`v23 website smoke passed: ${pass} checks passed`);
