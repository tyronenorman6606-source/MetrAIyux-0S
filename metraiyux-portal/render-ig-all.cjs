const { chromium } = require('../node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../marketing/social/instagram/visuals');

const CARDS = [
  { id: 'c01', file: '01-platform-hero.png' },
  { id: 'c02', file: '02-auren.png' },
  { id: 'c03', file: '03-no-competitors.png' },
  { id: 'c04', file: '04-valuation.png' },
  { id: 'c05', file: '05-sovereignty.png' },
  { id: 'c06', file: '06-music.png' },
  { id: 'c07', file: '07-skyevault.png' },
  { id: 'c08', file: '08-skyepay.png' },
  { id: 'c09', file: '09-crown-os.png' },
  { id: 'c10', file: '10-sol-staffing.png' },
  { id: 'c11', file: '11-free99.png' },
  { id: 'c12', file: '12-valley-verified.png' },
  { id: 'c13', file: '13-white-label.png' },
  { id: 'c14', file: '14-kaixu.png' },
  { id: 'c15', file: '15-the-build.png' },
  { id: 'c16', file: '16-relay13.png' },
  { id: 'c17', file: '17-legalskyes.png' },
  { id: 'c18', file: '18-citadeldb.png' },
  { id: 'c19', file: '19-ascension.png' },
  { id: 'c20', file: '20-13-cabinets.png' },
  { id: 'c21', file: '21-pre-revenue.png' },
  { id: 'c22', file: '22-skyeway.png' },
  { id: 'c23', file: '23-investors.png' },
  { id: 'c24', file: '24-quantum-ops.png' },
  { id: 'c25', file: '25-category-creator.png' },
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 1200 });

  const htmlPath = 'file:///tmp/ig-cards-full.html';
  await page.goto(htmlPath, { waitUntil: 'networkidle' });

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const card of CARDS) {
    const el = await page.$('#' + card.id);
    if (!el) {
      console.error('MISSING element:', card.id);
      continue;
    }
    const outPath = path.join(OUT_DIR, card.file);
    await el.screenshot({ path: outPath });
    console.log('Rendered:', card.file);
  }

  await browser.close();
  console.log('Done — all 25 cards rendered.');
})();
