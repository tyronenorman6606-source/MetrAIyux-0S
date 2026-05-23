// Render Gray Skyes social cards — 19 cards total
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const DEPLOY_ROOT = path.resolve(__dirname, '../marketing/metraiyux-0s/assets/social/grayskyes');
const HTML_FILE = '/tmp/gs-cards.html';

const CARDS = [
  // LinkedIn
  { id: 'gs-li-01', file: 'li-01.png' },
  { id: 'gs-li-02', file: 'li-02.png' },
  { id: 'gs-li-03', file: 'li-03.png' },
  { id: 'gs-li-04', file: 'li-04.png' },
  { id: 'gs-li-05', file: 'li-05.png' },
  // Facebook
  { id: 'gs-fb-01', file: 'fb-01.png' },
  { id: 'gs-fb-02', file: 'fb-02.png' },
  { id: 'gs-fb-03', file: 'fb-03.png' },
  { id: 'gs-fb-04', file: 'fb-04.png' },
  // Instagram
  { id: 'gs-ig-01', file: 'ig-01.png' },
  { id: 'gs-ig-02', file: 'ig-02.png' },
  { id: 'gs-ig-03', file: 'ig-03.png' },
  { id: 'gs-ig-04', file: 'ig-04.png' },
  { id: 'gs-ig-05', file: 'ig-05.png' },
  { id: 'gs-ig-06', file: 'ig-06.png' },
  { id: 'gs-ig-07', file: 'ig-07.png' },
  { id: 'gs-ig-08', file: 'ig-08.png' },
  // Reddit
  { id: 'gs-rd-01', file: 'rd-01.png' },
  { id: 'gs-rd-02', file: 'rd-02.png' },
];

(async () => {
  if (!fs.existsSync(DEPLOY_ROOT)) fs.mkdirSync(DEPLOY_ROOT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 1200 });
  await page.goto('file://' + HTML_FILE, { waitUntil: 'networkidle' });

  for (const card of CARDS) {
    const el = await page.$('#' + card.id);
    if (!el) { console.error('MISSING:', card.id); continue; }
    const out = path.join(DEPLOY_ROOT, card.file);
    await el.screenshot({ path: out });
    console.log('✓', card.id, '->', card.file);
  }

  await browser.close();
  console.log('\nDone —', CARDS.length, 'cards rendered to', DEPLOY_ROOT);
})();
