#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const today = process.env.INDEXING_LASTMOD || '2026-05-25';
const wgoRoot = path.join(repoRoot, 'metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator');
const marketingRoot = path.join(repoRoot, 'marketing/metraiyux-0s');
const seoRoot = path.join(repoRoot, 'metraiyux_0s_site/seo');
const canonicalHost = 'https://solenterprises.org';
const marketingHost = 'https://metraiyux-0s-marketing.pages.dev';

const skippedDirs = new Set([
  '.git',
  '.tmp',
  '.wrangler',
  'node_modules',
  'test-artifacts',
  'test-results',
  'download-handoffs',
  'backups'
]);

const placeholderHosts = new Set([
  'example.com',
  'sovereigndocs.example',
  'sovereigndocs.local',
  'www.sitemaps.org',
  'your-domain-here'
]);

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(full, entry.name)) out.push(full);
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtml(value) {
  return escapeXml(value).replace(/'/g, '&#39;');
}

function canonicalFromHtml(html, relPath) {
  const match = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)
    || html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i);
  if (match) return match[1];
  const normalized = relPath === 'index.html' ? '' : relPath;
  return `${canonicalHost}/${normalized}`.replace(/\/$/, '/');
}

function robotsValue(html) {
  const match = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  return match ? match[1].toLowerCase() : 'index,follow';
}

function titleFromHtml(html, fallback) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return (match ? match[1] : fallback).replace(/\s+/g, ' ').trim();
}

function descriptionFromHtml(html) {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function publicMarketingUrl(relPath) {
  if (relPath === 'index.html') return `${marketingHost}/`;
  return `${marketingHost}/${relPath.replace(/\/index\.html$/, '/').replace(/\.html$/, '')}`;
}

function articleDate(html) {
  const modified = html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/);
  if (modified) return modified[1];
  const published = html.match(/"datePublished":\s*"(\d{4}-\d{2}-\d{2})"/);
  return published ? published[1] : '';
}

function priorityFor(relPath, loc) {
  if (loc === `${canonicalHost}/`) return '1.0';
  if (relPath === 'pricing.html' || relPath.startsWith('services/')) return '0.9';
  if (relPath.startsWith('service-areas/')) return '0.85';
  if (relPath === 'blog/index.html' || relPath.startsWith('blog/')) return '0.8';
  if (relPath === 'client-intake.html' || relPath === 'process.html') return '0.75';
  if (relPath.startsWith('proof/')) return '0.7';
  return '0.65';
}

function lastmodFor(relPath, html) {
  if (relPath.startsWith('blog/') && relPath !== 'blog/index.html') return articleDate(html) || today;
  if (relPath === 'blog/index.html') return today;
  if (relPath === 'index.html' || relPath === 'pricing.html' || relPath === 'client-intake.html') return today;
  if (relPath.startsWith('services/')) return today;
  return today;
}

function changefreqFor(relPath) {
  if (relPath === 'index.html' || relPath === 'pricing.html' || relPath.startsWith('services/')) return 'weekly';
  if (relPath.startsWith('blog/')) return 'monthly';
  return 'monthly';
}

function generateWebGrowthOperatorSitemap() {
  const htmlFiles = walk(wgoRoot, (_full, name) => name.endsWith('.html'));
  const pages = [];
  for (const file of htmlFiles) {
    const relPath = path.relative(wgoRoot, file).replace(/\\/g, '/');
    const html = read(file);
    const robots = robotsValue(html);
    if (robots.includes('noindex')) continue;
    if (relPath.startsWith('ae-command-hub/') || relPath.startsWith('operator-playbook/') || relPath.startsWith('client-portal/')) continue;
    const loc = canonicalFromHtml(html, relPath);
    pages.push({
      relPath,
      loc,
      title: titleFromHtml(html, relPath),
      description: descriptionFromHtml(html),
      lastmod: lastmodFor(relPath, html),
      changefreq: changefreqFor(relPath),
      priority: priorityFor(relPath, loc)
    });
  }
  pages.sort((a, b) => {
    if (a.loc === `${canonicalHost}/`) return -1;
    if (b.loc === `${canonicalHost}/`) return 1;
    return a.loc.localeCompare(b.loc);
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map((page) => [
      '  <url>',
      `    <loc>${escapeXml(page.loc)}</loc>`,
      `    <lastmod>${page.lastmod}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      '  </url>'
    ].join('\n')),
    '</urlset>',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(wgoRoot, 'sitemap.xml'), xml);

  const submitJson = {
    generated_at: new Date().toISOString(),
    canonical_domain: canonicalHost,
    primary_submit_url: `${canonicalHost}/sitemap.xml`,
    robots_url: `${canonicalHost}/robots.txt`,
    page_count: pages.length,
    pages
  };
  fs.writeFileSync(path.join(wgoRoot, 'google-indexing-submit.json'), `${JSON.stringify(submitJson, null, 2)}\n`);
  return submitJson;
}

function generateMarketingSitemap() {
  const htmlFiles = walk(marketingRoot, (_full, name) => name.endsWith('.html'));
  const pages = [];
  for (const file of htmlFiles) {
    const relPath = path.relative(marketingRoot, file).replace(/\\/g, '/');
    const html = read(file);
    const robots = robotsValue(html);
    if (robots.includes('noindex')) continue;
    if (relPath === '404.html') continue;
    pages.push({
      relPath,
      loc: publicMarketingUrl(relPath),
      title: titleFromHtml(html, relPath),
      description: descriptionFromHtml(html),
      lastmod: today,
      changefreq: relPath === 'index.html' || relPath === 'media-over-london.html' ? 'weekly' : 'monthly',
      priority: relPath === 'index.html' ? '1.0' : relPath === 'media-over-london.html' ? '0.95' : relPath.startsWith('media-over-london/') ? '0.85' : '0.75'
    });
  }
  pages.sort((a, b) => {
    if (a.loc === `${marketingHost}/`) return -1;
    if (b.loc === `${marketingHost}/`) return 1;
    if (a.relPath === 'media-over-london.html') return -1;
    if (b.relPath === 'media-over-london.html') return 1;
    return a.loc.localeCompare(b.loc);
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map((page) => [
      '  <url>',
      `    <loc>${escapeXml(page.loc)}</loc>`,
      `    <lastmod>${page.lastmod}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      '  </url>'
    ].join('\n')),
    '</urlset>',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(marketingRoot, 'sitemap.xml'), xml);

  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /404.html',
    '',
    `Sitemap: ${marketingHost}/sitemap.xml`,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(marketingRoot, 'robots.txt'), robots);

  const submitJson = {
    generated_at: new Date().toISOString(),
    canonical_domain: marketingHost,
    primary_submit_url: `${marketingHost}/sitemap.xml`,
    robots_url: `${marketingHost}/robots.txt`,
    page_count: pages.length,
    pages,
    source_of_truth: 'Media Over London public marketing surface'
  };
  fs.writeFileSync(path.join(marketingRoot, 'google-indexing-submit.json'), `${JSON.stringify(submitJson, null, 2)}\n`);
  return submitJson;
}

function addSurface(map, host, sourceFile) {
  host = String(host || '').toLowerCase();
  if (!host || placeholderHosts.has(host)) return null;
  if (!map.has(host)) {
    map.set(host, {
      host,
      origin: `https://${host}`,
      robots_url: `https://${host}/robots.txt`,
      sitemap_urls: new Set(),
      sample_urls: new Set(),
      source_files: new Set(),
      notes: []
    });
  }
  const surface = map.get(host);
  if (sourceFile) surface.source_files.add(path.relative(repoRoot, sourceFile).replace(/\\/g, '/'));
  if (host === 'metraiyux-0s-full-system.graylondonskyes.workers.dev') {
    surface.notes.push('0S mounted app routes are protected by the shared gate; submit public metadata only unless a surface has a public canonical host.');
  }
  return surface;
}

function normalizePublicUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase();
  return url.href;
}

function commonDirectoryPrefix(sampleUrls) {
  const segmentLists = sampleUrls
    .map((sampleUrl) => new URL(sampleUrl).pathname)
    .map((pathname) => pathname.split('/').filter(Boolean))
    .filter((segments) => segments.length);
  if (!segmentLists.length) return '/';
  const prefix = [];
  for (let i = 0; ; i += 1) {
    const segment = segmentLists[0][i];
    if (!segment || segment.includes('.')) break;
    if (!segmentLists.every((segments) => segments[i] === segment)) break;
    prefix.push(segment);
  }
  return prefix.length ? `/${prefix.join('/')}/` : '/';
}

function inferredSitemapUrl(file, sampleUrls) {
  const basename = path.basename(file);
  const url = new URL(sampleUrls[0]);
  const sourceRel = path.relative(repoRoot, file).replace(/\\/g, '/');
  if (sourceRel.startsWith('metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator/')) {
    return `${canonicalHost}/${basename}`;
  }
  if (sourceRel.startsWith('metraiyux_0s_site/valley-verified/')) {
    return `${url.origin}/valley-verified/${basename}`;
  }
  if (sourceRel.startsWith('metraiyux_0s_site/seo/')) {
    return `${url.origin}/seo/${basename}`;
  }
  const clientAppMatch = sourceRel.match(/^metraiyux_0s_site\/client-app-factory\/client-apps\/([^/]+)\//);
  if (clientAppMatch) {
    return `${url.origin}/client-app-factory/client-apps/${clientAppMatch[1]}/${basename}`;
  }
  const prefix = commonDirectoryPrefix(sampleUrls);
  return `${url.origin}${prefix}${basename}`;
}

function generateRepoIndexingLedger(wgoSubmit, marketingSubmit) {
  const map = new Map();
  const files = walk(repoRoot, (_full, name) => /^sitemap.*\.xml$/i.test(name) || name === 'robots.txt');
  for (const file of files) {
    const text = read(file);
    const sourceRel = path.relative(repoRoot, file).replace(/\\/g, '/');
    const sitemapLines = [...text.matchAll(/^Sitemap:\s*(https?:\/\/[^\s<>"']+)/gim)].map((m) => m[1]);
    for (const sitemapUrl of sitemapLines) {
      try {
        const normalized = normalizePublicUrl(sitemapUrl);
        const url = new URL(normalized);
        const surface = addSurface(map, url.host, file);
        if (surface) surface.sitemap_urls.add(normalized);
      } catch {}
    }
    const urls = [...text.matchAll(/https?:\/\/[^\s<>"')]+/g)].map((m) => m[0]);
    const sitemapSourceUrls = [];
    for (const rawUrl of urls) {
      try {
        const normalized = normalizePublicUrl(rawUrl);
        const url = new URL(normalized);
        const surface = addSurface(map, url.host, file);
        if (!surface) continue;
        if (/sitemap.*\.xml$/i.test(url.pathname)) surface.sitemap_urls.add(url.href);
        else if (sourceRel.endsWith('sitemap.xml') || sourceRel.includes('sitemap-')) {
          surface.sample_urls.add(url.href);
          sitemapSourceUrls.push(url.href);
        }
      } catch {}
    }
    if (/sitemap.*\.xml$/i.test(path.basename(file)) && sitemapSourceUrls.length) {
      const byHost = new Map();
      for (const url of sitemapSourceUrls) {
        const host = new URL(url).host;
        if (!byHost.has(host)) byHost.set(host, url);
      }
      for (const [host] of byHost) {
        const samples = sitemapSourceUrls.filter((url) => new URL(url).host === host);
        const surface = addSurface(map, host, file);
        if (surface) surface.sitemap_urls.add(inferredSitemapUrl(file, samples));
      }
    }
  }

  const wgo = addSurface(map, 'solenterprises.org', path.join(wgoRoot, 'sitemap.xml'));
  wgo.sitemap_urls.add(wgoSubmit.primary_submit_url);
  wgo.sample_urls.add(wgoSubmit.canonical_domain);
  wgo.notes.push('Current WebGrowthOperator catalog is integrated into Media Over London for public indexing. Submit the Media Over London sitemap first; only submit solenterprises.org after that host serves this sitemap publicly.');

  const marketing = addSurface(map, 'metraiyux-0s-marketing.pages.dev', path.join(marketingRoot, 'sitemap.xml'));
  marketing.sitemap_urls.add(marketingSubmit.primary_submit_url);
  marketing.sample_urls.add(marketingSubmit.canonical_domain);
  marketing.sample_urls.add(`${marketingSubmit.canonical_domain}/media-over-london`);
  marketing.notes.push('Media Over London is the public source-of-truth surface for the integrated growth catalog.');

  const surfaces = [...map.values()]
    .map((surface) => ({
      host: surface.host,
      origin: surface.origin,
      robots_url: surface.robots_url,
      sitemap_urls: [...surface.sitemap_urls].sort(),
      sample_urls: [...surface.sample_urls].sort().slice(0, 25),
      source_files: [...surface.source_files].sort(),
      notes: [...new Set(surface.notes)].sort()
    }))
    .filter((surface) => surface.sitemap_urls.length || surface.sample_urls.length)
    .sort((a, b) => a.host.localeCompare(b.host));

  const ledger = {
    generated_at: new Date().toISOString(),
    purpose: 'Operator list of public sitemap/robots URLs to add as properties and submit in Google Search Console.',
    submit_first: [
      {
        name: 'Media Over London / public growth catalog',
        property: 'metraiyux-0s-marketing.pages.dev',
        sitemap: marketingSubmit.primary_submit_url,
        robots: marketingSubmit.robots_url,
        page_count: marketingSubmit.page_count
      },
      {
        name: 'WebGrowthOperator 0S catalog mirror',
        property: 'metraiyux-0s-full-system.graylondonskyes.workers.dev',
        sitemap: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/WebGrowthOperator/sitemap.xml',
        robots: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/robots.txt',
        page_count: wgoSubmit.page_count,
        note: 'Mounted 0S app routes stay shared-gate protected; use the Media Over London public sitemap for Google crawling.'
      }
    ],
    google_search_console: 'https://search.google.com/search-console',
    surfaces
  };

  fs.mkdirSync(seoRoot, { recursive: true });
  fs.writeFileSync(path.join(seoRoot, 'google-indexing-submission-links.json'), `${JSON.stringify(ledger, null, 2)}\n`);

  const markdown = [
    '# Google Indexing Submission Links',
    '',
    `Generated: ${ledger.generated_at}`,
    '',
    `Open Google Search Console (${ledger.google_search_console}), add/verify each property you own, then submit the matching sitemap URL.`,
    '',
    '## Submit First',
    '',
    ...ledger.submit_first.map((item) => `- ${item.name}: ${item.sitemap} (${item.page_count} URLs)${item.note ? ` - ${item.note}` : ''}`),
    '',
    '## All Detected Public Surface Sitemaps',
    '',
    ...surfaces.map((surface) => [
      `### ${surface.host}`,
      `- Property: ${surface.origin}`,
      `- Robots: ${surface.robots_url}`,
      ...surface.sitemap_urls.map((url) => `- Sitemap: ${url}`),
      ...(surface.notes.length ? surface.notes.map((note) => `- Note: ${note}`) : []),
      ''
    ].join('\n'))
  ].join('\n');
  fs.writeFileSync(path.join(seoRoot, 'GOOGLE_INDEXING_SUBMISSION_LINKS.md'), `${markdown}\n`);

  const html = [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow">',
    '<title>Google Indexing Submission Links</title>',
    '<style>body{font-family:Inter,Arial,sans-serif;margin:0;background:#080a0f;color:#f6f3ea}main{max-width:1100px;margin:auto;padding:40px 20px}a{color:#8bdcff}section{border:1px solid #2a3342;border-radius:8px;padding:18px;margin:14px 0;background:#10141c}code{color:#ffe19a;word-break:break-all}.note{color:#c8ced8}</style>',
    '</head><body><main>',
    '<h1>Google Indexing Submission Links</h1>',
    `<p class="note">Generated ${escapeHtml(ledger.generated_at)}. Add/verify each property in <a href="${ledger.google_search_console}">Google Search Console</a>, then submit the sitemap URL.</p>`,
    '<h2>Submit First</h2>',
    ...ledger.submit_first.map((item) => `<section><h3>${escapeHtml(item.name)}</h3><p><a href="${escapeHtml(item.sitemap)}">${escapeHtml(item.sitemap)}</a></p><p class="note">${item.page_count} sitemap URLs${item.note ? ` - ${escapeHtml(item.note)}` : ''}</p></section>`),
    '<h2>All Detected Surfaces</h2>',
    ...surfaces.map((surface) => [
      '<section>',
      `<h3>${escapeHtml(surface.host)}</h3>`,
      `<p>Robots: <a href="${escapeHtml(surface.robots_url)}">${escapeHtml(surface.robots_url)}</a></p>`,
      '<ul>',
      ...surface.sitemap_urls.map((url) => `<li>Sitemap: <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`),
      '</ul>',
      ...surface.notes.map((note) => `<p class="note">${escapeHtml(note)}</p>`),
      '</section>'
    ].join('\n')),
    '</main></body></html>',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(seoRoot, 'google-indexing-submission-links.html'), html);

  return ledger;
}

const wgoSubmit = generateWebGrowthOperatorSitemap();
const marketingSubmit = generateMarketingSitemap();
const ledger = generateRepoIndexingLedger(wgoSubmit, marketingSubmit);
console.log(JSON.stringify({
  ok: true,
  webGrowthOperatorUrls: wgoSubmit.page_count,
  marketingUrls: marketingSubmit.page_count,
  surfaces: ledger.surfaces.length,
  primarySubmit: marketingSubmit.primary_submit_url,
  outputs: [
    'metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator/sitemap.xml',
    'metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator/google-indexing-submit.json',
    'marketing/metraiyux-0s/sitemap.xml',
    'marketing/metraiyux-0s/robots.txt',
    'marketing/metraiyux-0s/google-indexing-submit.json',
    'metraiyux_0s_site/seo/google-indexing-submission-links.json',
    'metraiyux_0s_site/seo/GOOGLE_INDEXING_SUBMISSION_LINKS.md',
    'metraiyux_0s_site/seo/google-indexing-submission-links.html'
  ]
}, null, 2));
