import { chromium } from 'playwright';
import path from 'node:path';

const outDir = '/workspaces/MetrAIyux-0S/metraiyux-portal/assets/beta-week';

const shots = [
  {
    slug: 'metraiyux-command',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/',
    label: 'MetrAIyux 0S command deck'
  },
  {
    slug: 'skygate-proof',
    url: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html',
    label: 'SkyeGateFS27 proof surface'
  },
  {
    slug: 'skyevault-drop',
    url: 'https://skyevault-drop.graylondonskyes.workers.dev/',
    label: 'SkyeVault-Drop secure intake'
  },
  {
    slug: 'citadeldb',
    url: 'https://citadeldb-ultimate.pages.dev/',
    label: 'CitadelDB proof-backed database command center'
  },
  {
    slug: 'sol-staffing',
    url: 'https://sol-staffing-agency-site.pages.dev/',
    label: 'SOL staffing agency platform'
  },
  {
    slug: 'ecosystem-portal',
    url: 'https://metraiyux-ecosystem-portal.pages.dev/',
    label: 'Skye ecosystem portal'
  }
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: 'dark'
});

const page = await context.newPage();
page.setDefaultTimeout(30000);

const results = [];

for (const shot of shots) {
  const file = path.join(outDir, `${shot.slug}.png`);
  try {
    await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: file, fullPage: false });
    results.push({ ok: true, ...shot, file });
  } catch (error) {
    results.push({ ok: false, ...shot, file, error: error.message });
  }
}

await browser.close();

console.log(JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2));
