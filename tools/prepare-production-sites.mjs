import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PUBLIC_ROOT = 'metraiyux_0s_public_spectacle_site';
const FULL_ROOT = 'metraiyux_0s_site';
const PUBLIC_URL = 'https://metraiyux-0s-public-spectacle.pages.dev';
const FULL_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OLD_FULL_URLS = [
  'https://metraiyux-0s-logo-rollout.pages.dev'
];
const LASTMOD = '2026-05-15';

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(filePath) : filePath;
  });
}

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  writeFileSync(filePath, content);
}

function updateFile(filePath, updater) {
  const before = read(filePath);
  const after = updater(before);
  if (after !== before) write(filePath, after);
}

function htmlFiles(root) {
  return walk(root).filter((filePath) => filePath.endsWith('.html'));
}

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sitemapFor(root, baseUrl, filter = () => true) {
  const urls = htmlFiles(root)
    .map((filePath) => path.relative(root, filePath).replaceAll(path.sep, '/'))
    .filter(filter)
    .sort((a, b) => {
      if (a === 'index.html') return -1;
      if (b === 'index.html') return 1;
      return a.localeCompare(b);
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((urlPath) => {
      const loc = `${baseUrl}/${urlPath}`;
      return `  <url><loc>${xmlEscape(loc)}</loc><lastmod>${LASTMOD}</lastmod></url>`;
    }),
    '</urlset>',
    '',
  ].join('\n');
}

function updatePublicSiteBridge() {
  for (const filePath of walk(PUBLIC_ROOT).filter((filePath) => /\.(html|js|md|txt|xml)$/i.test(filePath))) {
    updateFile(filePath, (content) => OLD_FULL_URLS.reduce((next, oldUrl) => next.replaceAll(oldUrl, FULL_URL), content));
  }
  for (const filePath of walk(FULL_ROOT).filter((filePath) => /\.(html|js|md|txt|xml)$/i.test(filePath))) {
    updateFile(filePath, (content) => OLD_FULL_URLS.reduce((next, oldUrl) => next.replaceAll(oldUrl, FULL_URL), content));
  }

  const fullSiteFooterLink = `<a href="${FULL_URL}/" target="_blank" rel="noopener">Open Full Website</a>`;
  const originalFooter = '<div class="foot-links"><a href="fit-check.html">Take the Fit Check</a><a href="download.html">Download Packet</a><a href="operator-notes.html">Operator Notes</a></div>';
  const productionFooter = `<div class="foot-links">${fullSiteFooterLink}<a href="fit-check.html">Take the Fit Check</a><a href="download.html">Download Packet</a><a href="operator-notes.html">Operator Notes</a></div>`;

  for (const filePath of htmlFiles(PUBLIC_ROOT)) {
    updateFile(filePath, (content) => content.replace(originalFooter, productionFooter));
  }

  updateFile(path.join(PUBLIC_ROOT, 'index.html'), (content) =>
    content.replace(
      '<a class="btn" href="guided-tour.html">Start the Guided Tour</a><a class="btn secondary" href="fit-check.html">Take the Fit Check</a><a class="btn secondary" href="tech-stack.html">View the Tech Stack</a>',
      `<a class="btn" href="guided-tour.html">Start the Guided Tour</a><a class="btn secondary" href="${FULL_URL}/" target="_blank" rel="noopener">Open Full Website</a><a class="btn secondary" href="fit-check.html">Take the Fit Check</a><a class="btn secondary" href="tech-stack.html">View the Tech Stack</a>`,
    ),
  );

  updateFile(path.join(PUBLIC_ROOT, 'download.html'), (content) =>
    content.replace(
      '<button class="btn" onclick="exportBrief()">Export JSON Brief</button><a class="btn secondary" href="index.html">Return Home</a>',
      `<button class="btn" onclick="exportBrief()">Export JSON Brief</button><a class="btn secondary" href="${FULL_URL}/" target="_blank" rel="noopener">Open Full Website</a><a class="btn secondary" href="index.html">Return Home</a>`,
    ),
  );

  updateFile(path.join(PUBLIC_ROOT, 'script.js'), (content) =>
    content.replace(
      "const data={platform:'MetrAIyux 0S',summary:'Protected autonomous business operating system with owner admin command, customer SaaS layer, 16 lightweight brains, 0meg4kAI QA/security, Resend approvals, Cloudflare Worker/D1/KV/Queues architecture.',generatedAt:new Date().toISOString()};",
      `const data={platform:'MetrAIyux 0S',publicOverviewUrl:'${PUBLIC_URL}/',fullWebsiteUrl:'${FULL_URL}/',summary:'Protected autonomous business operating system with owner admin command, customer SaaS layer, 16 lightweight brains, 0meg4kAI QA/security, Resend approvals, Cloudflare Worker/D1/KV/Queues architecture.',generatedAt:new Date().toISOString()};`,
    ),
  );

  updateFile(path.join(PUBLIC_ROOT, 'README.md'), (content) => {
    if (content.includes('Full website:')) return content;
    return `${content.trim()}\n\n## Production Links\n\n- Public overview: ${PUBLIC_URL}/\n- Full website: ${FULL_URL}/\n`;
  });

  updateFile(path.join(PUBLIC_ROOT, 'PUBLIC_SITE_MANIFEST.md'), (content) => {
    if (content.includes('Full website target:')) return content;
    return `${content.trim()}\n\nProduction public URL: ${PUBLIC_URL}/\nFull website target: ${FULL_URL}/\n`;
  });

  updateFile(path.join(PUBLIC_ROOT, 'llms.txt'), (content) => {
    if (content.includes('Full website:')) return content;
    return `${content.trim()}\n\nPublic overview: ${PUBLIC_URL}/\nFull website: ${FULL_URL}/\n`;
  });
}

function updateSitemapsAndRobots() {
  const publicSitemap = sitemapFor(PUBLIC_ROOT, PUBLIC_URL);
  write(path.join(PUBLIC_ROOT, 'sitemap.xml'), publicSitemap);
  write(path.join(PUBLIC_ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${PUBLIC_URL}/sitemap.xml\n`);

  const indexableFullPath = (urlPath) => !urlPath.startsWith('admin/');
  const fullSitemap = sitemapFor(FULL_ROOT, FULL_URL, indexableFullPath);
  write(path.join(FULL_ROOT, 'sitemap.xml'), fullSitemap);
  write(path.join(FULL_ROOT, 'seo', 'sitemap.xml'), fullSitemap);
  write(
    path.join(FULL_ROOT, 'robots.txt'),
    [
      'User-agent: *',
      'Disallow: /admin/',
      'Disallow: /cloudflare-admin-automation-worker/',
      'Disallow: /cloudflare-crown-operator/',
      'Disallow: /cloudflare-saas-provisioning-worker/',
      'Disallow: /cloudflare-security-gateway-worker/',
      'Disallow: /cloudflare-sentinel-operator/',
      'Disallow: /cloudflare-worker-nexus/',
      'Disallow: /cloudflare-worker-site-operator/',
      `Sitemap: ${FULL_URL}/sitemap.xml`,
      '',
    ].join('\n'),
  );
  write(path.join(FULL_ROOT, 'seo', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${FULL_URL}/seo/sitemap.xml\n`);

  updateFile(path.join(FULL_ROOT, 'llms.txt'), (content) => {
    if (content.includes('Production full website:')) return content;
    return `${content.trim()}\n\nProduction full website: ${FULL_URL}/\nPublic overview website: ${PUBLIC_URL}/\n`;
  });
}

if (!existsSync(PUBLIC_ROOT) || !existsSync(FULL_ROOT)) {
  throw new Error('Expected unpacked site directories were not found.');
}

updatePublicSiteBridge();
updateSitemapsAndRobots();

console.log(JSON.stringify({
  publicUrl: `${PUBLIC_URL}/`,
  fullUrl: `${FULL_URL}/`,
  publicHtml: htmlFiles(PUBLIC_ROOT).length,
  fullHtml: htmlFiles(FULL_ROOT).length,
}, null, 2));
