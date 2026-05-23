// Playwright render: founder Instagram cards → marketing/metraiyux-0s/assets/social/founder/
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '../marketing/metraiyux-0s/assets/social/founder');
fs.mkdirSync(OUT, { recursive: true });

const CARDS = [
  { id: 'c1',  out: 'ig-01.png' },
  { id: 'c2',  out: 'ig-02.png' },
  { id: 'c3',  out: 'ig-03.png' },
  { id: 'c4',  out: 'ig-04.png' },
  { id: 'c5',  out: 'ig-05.png' },
  { id: 'c6',  out: 'ig-06.png' },
  { id: 'c7',  out: 'ig-07.png' },
  { id: 'c8',  out: 'ig-08.png' },
  { id: 'c9',  out: 'ig-09.png' },
  { id: 'c10', out: 'ig-10.png' },
  { id: 'c11', out: 'ig-11.png' },
  { id: 'c12', out: 'ig-12.png' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });

  const fileUrl = 'file:///tmp/founder-ig-cards.html';
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  for (const { id, out } of CARDS) {
    const el = await page.$(`#${id}`);
    if (!el) { console.warn(`Missing #${id}`); continue; }
    const dest = path.join(OUT, out);
    await el.screenshot({ path: dest });
    console.log('✓', out);
  }

  await browser.close();
  console.log(`\nDone — ${CARDS.length} cards → ${OUT}`);
})();
