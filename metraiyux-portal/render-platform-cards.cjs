const { chromium } = require('../node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = path.resolve(__dirname, '..');

const CARDS = [
  // LinkedIn
  { id: 'li01', dir: 'marketing/social/linkedin/visuals', file: 'li-01.png' },
  { id: 'li02', dir: 'marketing/social/linkedin/visuals', file: 'li-02.png' },
  { id: 'li03', dir: 'marketing/social/linkedin/visuals', file: 'li-03.png' },
  { id: 'li04', dir: 'marketing/social/linkedin/visuals', file: 'li-04.png' },
  { id: 'li05', dir: 'marketing/social/linkedin/visuals', file: 'li-05.png' },
  { id: 'li06', dir: 'marketing/social/linkedin/visuals', file: 'li-06.png' },
  { id: 'li07', dir: 'marketing/social/linkedin/visuals', file: 'li-07.png' },
  { id: 'li08', dir: 'marketing/social/linkedin/visuals', file: 'li-08.png' },
  { id: 'li09', dir: 'marketing/social/linkedin/visuals', file: 'li-09.png' },
  { id: 'li10', dir: 'marketing/social/linkedin/visuals', file: 'li-10.png' },
  { id: 'li11', dir: 'marketing/social/linkedin/visuals', file: 'li-11.png' },
  { id: 'li12', dir: 'marketing/social/linkedin/visuals', file: 'li-12.png' },
  { id: 'li13', dir: 'marketing/social/linkedin/visuals', file: 'li-13.png' },
  { id: 'li14', dir: 'marketing/social/linkedin/visuals', file: 'li-14.png' },
  { id: 'li15', dir: 'marketing/social/linkedin/visuals', file: 'li-15.png' },
  { id: 'li16', dir: 'marketing/social/linkedin/visuals', file: 'li-16.png' },
  { id: 'li17', dir: 'marketing/social/linkedin/visuals', file: 'li-17.png' },
  { id: 'li18', dir: 'marketing/social/linkedin/visuals', file: 'li-18.png' },
  { id: 'li19', dir: 'marketing/social/linkedin/visuals', file: 'li-19.png' },
  { id: 'li20', dir: 'marketing/social/linkedin/visuals', file: 'li-20.png' },
  // Facebook
  { id: 'fb01', dir: 'marketing/social/facebook/visuals', file: 'fb-01.png' },
  { id: 'fb02', dir: 'marketing/social/facebook/visuals', file: 'fb-02.png' },
  { id: 'fb03', dir: 'marketing/social/facebook/visuals', file: 'fb-03.png' },
  { id: 'fb04', dir: 'marketing/social/facebook/visuals', file: 'fb-04.png' },
  { id: 'fb05', dir: 'marketing/social/facebook/visuals', file: 'fb-05.png' },
  { id: 'fb06', dir: 'marketing/social/facebook/visuals', file: 'fb-06.png' },
  { id: 'fb07', dir: 'marketing/social/facebook/visuals', file: 'fb-07.png' },
  { id: 'fb08', dir: 'marketing/social/facebook/visuals', file: 'fb-08.png' },
  { id: 'fb09', dir: 'marketing/social/facebook/visuals', file: 'fb-09.png' },
  { id: 'fb10', dir: 'marketing/social/facebook/visuals', file: 'fb-10.png' },
  { id: 'fb11', dir: 'marketing/social/facebook/visuals', file: 'fb-11.png' },
  { id: 'fb12', dir: 'marketing/social/facebook/visuals', file: 'fb-12.png' },
  { id: 'fb13', dir: 'marketing/social/facebook/visuals', file: 'fb-13.png' },
  { id: 'fb14', dir: 'marketing/social/facebook/visuals', file: 'fb-14.png' },
  { id: 'fb15', dir: 'marketing/social/facebook/visuals', file: 'fb-15.png' },
  { id: 'fb16', dir: 'marketing/social/facebook/visuals', file: 'fb-16.png' },
  { id: 'fb17', dir: 'marketing/social/facebook/visuals', file: 'fb-17.png' },
  { id: 'fb18', dir: 'marketing/social/facebook/visuals', file: 'fb-18.png' },
  { id: 'fb19', dir: 'marketing/social/facebook/visuals', file: 'fb-19.png' },
  { id: 'fb20', dir: 'marketing/social/facebook/visuals', file: 'fb-20.png' },
  // Reddit
  { id: 'rd01', dir: 'marketing/social/reddit/visuals', file: 'rd-01.png' },
  { id: 'rd02', dir: 'marketing/social/reddit/visuals', file: 'rd-02.png' },
  { id: 'rd03', dir: 'marketing/social/reddit/visuals', file: 'rd-03.png' },
  { id: 'rd04', dir: 'marketing/social/reddit/visuals', file: 'rd-04.png' },
  { id: 'rd05', dir: 'marketing/social/reddit/visuals', file: 'rd-05.png' },
  { id: 'rd06', dir: 'marketing/social/reddit/visuals', file: 'rd-06.png' },
  { id: 'rd07', dir: 'marketing/social/reddit/visuals', file: 'rd-07.png' },
  { id: 'rd08', dir: 'marketing/social/reddit/visuals', file: 'rd-08.png' },
  { id: 'rd09', dir: 'marketing/social/reddit/visuals', file: 'rd-09.png' },
  { id: 'rd10', dir: 'marketing/social/reddit/visuals', file: 'rd-10.png' },
  { id: 'rd11', dir: 'marketing/social/reddit/visuals', file: 'rd-11.png' },
  { id: 'rd12', dir: 'marketing/social/reddit/visuals', file: 'rd-12.png' },
  { id: 'rd13', dir: 'marketing/social/reddit/visuals', file: 'rd-13.png' },
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 1200 });
  await page.goto('file:///tmp/platform-cards.html', { waitUntil: 'networkidle' });

  for (const card of CARDS) {
    const outDir = path.join(BASE, card.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const el = await page.$('#' + card.id);
    if (!el) { console.error('MISSING:', card.id); continue; }
    await el.screenshot({ path: path.join(outDir, card.file) });
    console.log('Rendered:', card.file);
  }

  await browser.close();
  console.log('Done — all 53 platform cards rendered.');
})();
