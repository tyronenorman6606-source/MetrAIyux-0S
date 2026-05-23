
const { chromium } = require('playwright-core');
const path = require('path');

const OUT = '/workspaces/MetrAIyux-0S/marketing/social/instagram/visuals/';
const HTML = 'file:///workspaces/MetrAIyux-0S/marketing/social/instagram/ig-cards.html';

const cards = [
  { sel: '.c1', name: '01-platform-hero' },
  { sel: '.c2', name: '02-auren' },
  { sel: '.c3', name: '03-no-competitors' },
  { sel: '.c4', name: '04-valuation' },
  { sel: '.c5', name: '05-sovereignty' },
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 6000 });
  await page.goto(HTML, { waitUntil: 'networkidle' });
  for (const c of cards) {
    const el = await page.$(c.sel);
    await el.screenshot({ path: OUT + c.name + '.png' });
    console.log('rendered', c.name);
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
