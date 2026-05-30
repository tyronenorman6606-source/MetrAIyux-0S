#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const today = process.env.INDEXING_LASTMOD || new Date().toISOString().slice(0, 10);
const now = new Date().toISOString();
const dryRun = process.argv.includes('--dry-run');
const strict = process.argv.includes('--strict');
const configPath = path.join(repoRoot, 'metraiyux_0s_site/seo/sitemap-agent.config.json');
const seoRoot = path.join(repoRoot, 'metraiyux_0s_site/seo');

const defaultConfig = {
  workerAccountSubdomain: 'graylondonskyes',
  skipExactRoots: [
    'metraiyux_0s_site'
  ],
  skipRootPrefixes: [
    '.git',
    '.tmp',
    '.wrangler',
    '.netlify',
    '.vscode',
    'node_modules',
    'test-artifacts',
    'test-results',
    'download-handoffs',
    'backups',
    'client-app-factory/templates',
    'client-app-factory/storage/generated-apps',
    'metraiyux_0s_site/_platform-sources',
    'Zenith/skyesol-main-extracted'
  ],
  sites: []
};

const placeholderHosts = new Set([
  'example.com',
  'sovereigndocs.example',
  'sovereigndocs.local',
  'www.sitemaps.org',
  'your-domain-here'
]);

const skippedWalkDirs = new Set([
  '.git',
  '.tmp',
  '.wrangler',
  '.netlify',
  '.vscode',
  'node_modules',
  'test-artifacts',
  'test-results',
  'download-handoffs',
  'backups',
  'assets',
  'vendor',
  'dist',
  'build',
  'coverage',
  '_platform-sources',
  'data',
  'migrations',
  'scripts',
  'smoke',
  'tests'
]);

const skippedHtmlNames = new Set([
  '404.html',
  'offline.html'
]);

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeFile(file, contents) {
  if (dryRun) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function normalizeRel(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/$/, '');
}

function isUnderSkippedPrefix(relPath, config) {
  const normalized = normalizeRel(relPath);
  return (config.skipRootPrefixes || []).some((prefix) => {
    const clean = normalizeRel(prefix);
    return normalized === clean || normalized.startsWith(`${clean}/`);
  });
}

function isSkippedExactRoot(relPath, config) {
  const normalized = normalizeRel(relPath);
  return (config.skipExactRoots || []).some((root) => normalizeRel(root) === normalized);
}

function walk(dir, visitor) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (skippedWalkDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, visitor);
    } else {
      visitor(full, entry.name);
    }
  }
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

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function sameUrlHost(a, b) {
  try {
    return new URL(a).host.toLowerCase() === new URL(b).host.toLowerCase();
  } catch {
    return false;
  }
}

function validPublicUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (placeholderHosts.has(url.host.toLowerCase())) return null;
    url.protocol = 'https:';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function joinUrl(baseUrl, relPath) {
  const base = ensureTrailingSlash(baseUrl);
  return new URL(relPath.replace(/^\/+/, ''), base).href;
}

function publicPathFromRel(relPath, cleanUrls) {
  if (relPath === 'index.html') return '';
  if (relPath.endsWith('/index.html')) return `${relPath.slice(0, -'index.html'.length)}`;
  if (cleanUrls && relPath.endsWith('.html')) return relPath.slice(0, -'.html'.length);
  return relPath;
}

function canonicalFromHtml(html) {
  const canonicalMatch = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i)
    || html.match(/<link\b(?=[^>]*\bhref=["']([^"']+)["'])(?=[^>]*\brel=["']canonical["'])[^>]*>/i);
  return canonicalMatch ? validPublicUrl(canonicalMatch[1]) : null;
}

function robotsValue(html) {
  const match = html.match(/<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["']([^"']+)["'])[^>]*>/i)
    || html.match(/<meta\b(?=[^>]*\bcontent=["']([^"']+)["'])(?=[^>]*\bname=["']robots["'])[^>]*>/i);
  return match ? match[1].toLowerCase() : 'index,follow';
}

function titleFromHtml(html, fallback) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return (match ? match[1] : fallback).replace(/\s+/g, ' ').trim();
}

function descriptionFromHtml(html) {
  const match = html.match(/<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i)
    || html.match(/<meta\b(?=[^>]*\bcontent=["']([^"']*)["'])(?=[^>]*\bname=["']description["'])[^>]*>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function dateFromHtml(html) {
  const candidates = [
    html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/i),
    html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i),
    html.match(/<time\b[^>]*datetime=["'](\d{4}-\d{2}-\d{2})/i),
    html.match(/<meta\b(?=[^>]*\bproperty=["']article:modified_time["'])(?=[^>]*\bcontent=["'](\d{4}-\d{2}-\d{2})["'])[^>]*>/i)
  ];
  const match = candidates.find(Boolean);
  return match ? match[1] : today;
}

function priorityFor(relPath, config) {
  const overrides = config.priority || {};
  if (overrides[relPath]) return String(overrides[relPath]);
  if (relPath === 'index.html') return '1.0';
  if (relPath.includes('pricing') || relPath.startsWith('services/')) return '0.9';
  if (relPath.startsWith('service-areas/') || relPath.startsWith('business/')) return '0.85';
  if (relPath.includes('contact') || relPath.includes('quote') || relPath.includes('intake')) return '0.8';
  if (relPath.startsWith('blog/') || relPath.startsWith('legal/')) return '0.75';
  return '0.65';
}

function changefreqFor(relPath) {
  if (relPath === 'index.html' || relPath.includes('pricing') || relPath.startsWith('services/')) return 'weekly';
  if (relPath.startsWith('blog/') || relPath.startsWith('legal/')) return 'monthly';
  return 'monthly';
}

function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s<>"')]+/g)].map((match) => match[0]);
}

function commonPathPrefix(urls) {
  const paths = urls.map((rawUrl) => {
    try {
      return new URL(rawUrl).pathname.split('/').filter(Boolean);
    } catch {
      return [];
    }
  }).filter((parts) => parts.length);
  if (!paths.length) return '/';
  const prefix = [];
  for (let index = 0; ; index += 1) {
    const segment = paths[0][index];
    if (!segment || segment.includes('.')) break;
    if (!paths.every((parts) => parts[index] === segment)) break;
    prefix.push(segment);
  }
  return prefix.length ? `/${prefix.join('/')}/` : '/';
}

function baseFromSitemapUrl(sitemapUrl) {
  try {
    const url = new URL(sitemapUrl);
    const dir = url.pathname.replace(/\/?sitemap[^/]*\.xml$/i, '').replace(/\/$/, '');
    return `${url.origin}${dir}`;
  } catch {
    return null;
  }
}

function inferWranglerBase(rootAbs, config) {
  const wrangler = path.join(rootAbs, 'wrangler.toml');
  if (!fs.existsSync(wrangler)) return null;
  const text = fs.readFileSync(wrangler, 'utf8');
  const name = text.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
  if (!name) return null;
  if (/pages_build_output_dir\s*=/.test(text)) return `https://${name}.pages.dev`;
  if (/workers_dev\s*=\s*true/.test(text) || /\[assets\]/.test(text)) {
    return `https://${name}.${config.workerAccountSubdomain || 'graylondonskyes'}.workers.dev`;
  }
  return null;
}

function inferBaseUrl(rootAbs, rootConfig, config) {
  if (rootConfig.baseUrl) return trimTrailingSlash(rootConfig.baseUrl);

  const robots = path.join(rootAbs, 'robots.txt');
  if (fs.existsSync(robots)) {
    const sitemap = fs.readFileSync(robots, 'utf8').match(/^Sitemap:\s*(https?:\/\/[^\s<>"']+)/im)?.[1];
    const normalized = validPublicUrl(sitemap);
    const base = normalized ? baseFromSitemapUrl(normalized) : null;
    if (base) return trimTrailingSlash(base);
  }

  const sitemapFiles = fs.existsSync(rootAbs)
    ? fs.readdirSync(rootAbs).filter((name) => /^sitemap.*\.xml$/i.test(name))
    : [];
  for (const sitemapFile of sitemapFiles) {
    const urls = extractUrls(fs.readFileSync(path.join(rootAbs, sitemapFile), 'utf8'))
      .map(validPublicUrl)
      .filter(Boolean)
      .filter((url) => !/sitemaps\.org/i.test(url));
    if (!urls.length) continue;
    const origin = new URL(urls[0]).origin;
    const sameHost = urls.filter((url) => new URL(url).origin === origin);
    return trimTrailingSlash(`${origin}${commonPathPrefix(sameHost) === '/' ? '' : commonPathPrefix(sameHost).replace(/\/$/, '')}`);
  }

  const index = path.join(rootAbs, 'index.html');
  if (fs.existsSync(index)) {
    const canonical = canonicalFromHtml(fs.readFileSync(index, 'utf8'));
    if (canonical) {
      const url = new URL(canonical);
      const pathPart = url.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '');
      return trimTrailingSlash(`${url.origin}${pathPart}`);
    }
  }

  return inferWranglerBase(rootAbs, config);
}

function detectSiteRoots(config) {
  const roots = new Map();
  const addRoot = (rootRel, source, explicit = false) => {
    const normalized = normalizeRel(rootRel);
    if (!explicit && isSkippedExactRoot(normalized, config)) return;
    if (!normalized || isUnderSkippedPrefix(normalized, config)) return;
    if (!roots.has(normalized)) roots.set(normalized, { root: normalized, sources: new Set(), explicit });
    roots.get(normalized).sources.add(source);
    roots.get(normalized).explicit = roots.get(normalized).explicit || explicit;
  };

  for (const site of config.sites || []) addRoot(site.root, 'config', true);

  walk(repoRoot, (file, name) => {
    const root = rel(path.dirname(file));
    if (isUnderSkippedPrefix(root, config)) return;
    if (/^sitemap.*\.xml$/i.test(name) || name === 'robots.txt') addRoot(root, name);
    if (name === 'index.html') {
      const markerNames = ['_headers', '_redirects', 'netlify.toml', 'wrangler.toml', 'robots.txt', 'sitemap.xml'];
      if (markerNames.some((marker) => fs.existsSync(path.join(path.dirname(file), marker)))) addRoot(root, 'index+marker');
    }
  });

  return [...roots.values()].sort((a, b) => a.root.localeCompare(b.root));
}

function disallowedByConfig(relPath, config) {
  const excludes = new Set([...(config.exclude || []), ...skippedHtmlNames]);
  if (excludes.has(relPath)) return true;
  return (config.excludePrefixes || []).some((prefix) => relPath.startsWith(prefix));
}

function publicFilesForSite(rootAbs, rootConfig) {
  const files = [];
  const includeFiles = new Set(rootConfig.includeFiles || []);
  walk(rootAbs, (file, name) => {
    const siteRel = path.relative(rootAbs, file).replace(/\\/g, '/');
    if (disallowedByConfig(siteRel, rootConfig)) return;
    if (name.endsWith('.html')) {
      const html = fs.readFileSync(file, 'utf8');
      if (robotsValue(html).includes('noindex')) return;
      files.push({ file, relPath: siteRel, kind: 'html', html });
      return;
    }
    if (includeFiles.has(siteRel)) files.push({ file, relPath: siteRel, kind: 'static', html: '' });
  });
  return files;
}

function pageUrlFor(fileEntry, rootConfig, baseUrl) {
  if (fileEntry.kind === 'html') {
    const canonical = canonicalFromHtml(fileEntry.html);
    if (canonical && sameUrlHost(canonical, baseUrl)) return canonical;
  }
  return joinUrl(baseUrl, publicPathFromRel(fileEntry.relPath, Boolean(rootConfig.cleanUrls)));
}

function pagesForSite(rootAbs, rootConfig, baseUrl) {
  const seen = new Set();
  const pages = [];
  for (const fileEntry of publicFilesForSite(rootAbs, rootConfig)) {
    const loc = pageUrlFor(fileEntry, rootConfig, baseUrl);
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    pages.push({
      relPath: fileEntry.relPath,
      loc,
      title: fileEntry.kind === 'html' ? titleFromHtml(fileEntry.html, fileEntry.relPath) : fileEntry.relPath,
      description: fileEntry.kind === 'html' ? descriptionFromHtml(fileEntry.html) : '',
      lastmod: fileEntry.kind === 'html' ? dateFromHtml(fileEntry.html) : today,
      changefreq: changefreqFor(fileEntry.relPath),
      priority: priorityFor(fileEntry.relPath, rootConfig)
    });
  }
  pages.sort((a, b) => {
    if (a.relPath === 'index.html') return -1;
    if (b.relPath === 'index.html') return 1;
    return a.loc.localeCompare(b.loc);
  });
  return pages;
}

function sitemapUrlFor(baseUrl) {
  return joinUrl(baseUrl, 'sitemap.xml');
}

function robotsUrlFor(baseUrl) {
  return joinUrl(baseUrl, 'robots.txt');
}

function sitemapXml(pages) {
  return [
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
}

function robotsTxt(rootAbs, rootConfig, sitemapUrl) {
  const existing = path.join(rootAbs, 'robots.txt');
  const rawLines = fs.existsSync(existing)
    ? fs.readFileSync(existing, 'utf8').split(/\r?\n/)
    : ['User-agent: *', 'Allow: /'];
  const policyLines = rawLines.filter((line) => !/^Sitemap:/i.test(line.trim()));
  const sitemapLines = rawLines
    .filter((line) => /^Sitemap:/i.test(line.trim()))
    .map((line) => line.replace(/^Sitemap:\s*/i, '').trim())
    .filter(Boolean);
  const trimmed = policyLines.join('\n').replace(/\s+$/, '');
  const sitemaps = uniq([...sitemapLines, sitemapUrl]).map((url) => `Sitemap: ${url}`).join('\n');
  return `${trimmed}\n\n${sitemaps}\n`;
}

function generateSite(root, rootConfig, config) {
  const rootAbs = path.join(repoRoot, root);
  const baseUrl = inferBaseUrl(rootAbs, rootConfig, config);
  if (!fs.existsSync(rootAbs)) {
    return { status: 'missing_root', root, name: rootConfig.name || root, sources: [] };
  }
  if (!baseUrl) {
    if (root.startsWith('metraiyux_0s_site/')) {
      return {
        status: 'needs_public_origin',
        root,
        name: rootConfig.name || root,
        sources: [],
        reason: '0S internal/gated root needs an explicit public canonical origin or mirror before Google sitemap generation.'
      };
    }
    return { status: 'needs_origin', root, name: rootConfig.name || root, sources: [], reason: 'No baseUrl configured and no valid public URL found in sitemap, robots, canonical, or wrangler.toml.' };
  }
  const pages = pagesForSite(rootAbs, rootConfig, baseUrl);
  if (!pages.length) {
    return { status: 'no_public_pages', root, name: rootConfig.name || root, baseUrl, sitemapUrl: sitemapUrlFor(baseUrl), pages: [] };
  }

  const sitemapFile = path.join(rootAbs, 'sitemap.xml');
  const robotsFile = path.join(rootAbs, 'robots.txt');
  const submitFile = path.join(rootAbs, 'google-indexing-submit.json');
  const sitemapUrl = sitemapUrlFor(baseUrl);
  const submit = {
    generated_at: now,
    name: rootConfig.name || root,
    root,
    base_url: baseUrl,
    property: new URL(baseUrl).origin,
    primary_submit_url: sitemapUrl,
    robots_url: robotsUrlFor(baseUrl),
    page_count: pages.length,
    notes: rootConfig.notes || [],
    pages
  };

  writeFile(sitemapFile, sitemapXml(pages));
  writeFile(robotsFile, robotsTxt(rootAbs, rootConfig, sitemapUrl));
  writeFile(submitFile, `${JSON.stringify(submit, null, 2)}\n`);

  return {
    status: dryRun ? 'would_update' : 'updated',
    name: rootConfig.name || root,
    root,
    baseUrl,
    property: submit.property,
    sitemapFile: rel(sitemapFile),
    robotsFile: rel(robotsFile),
    submitFile: rel(submitFile),
    sitemapUrl,
    robotsUrl: submit.robots_url,
    pageCount: pages.length,
    notes: rootConfig.notes || []
  };
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
      notes: new Set()
    });
  }
  const surface = map.get(host);
  if (sourceFile) surface.source_files.add(rel(sourceFile));
  if (host.includes('metraiyux-0s-full-system.graylondonskyes.workers.dev')) {
    surface.notes.add('0S mounted app routes may be shared-gate protected; submit public mirrors first for Google crawling.');
  }
  return surface;
}

function scanPublicSurfaces(config) {
  const map = new Map();
  walk(repoRoot, (file, name) => {
    if (!(/^sitemap.*\.xml$/i.test(name) || name === 'robots.txt' || name === 'google-indexing-submit.json')) return;
    if (isUnderSkippedPrefix(rel(path.dirname(file)), config)) return;
    const text = fs.readFileSync(file, 'utf8');
    const sitemapLines = [...text.matchAll(/^Sitemap:\s*(https?:\/\/[^\s<>"']+)/gim)].map((match) => match[1]);
    for (const rawUrl of sitemapLines) {
      const normalized = validPublicUrl(rawUrl);
      if (!normalized) continue;
      const url = new URL(normalized);
      const surface = addSurface(map, url.host, file);
      if (surface) surface.sitemap_urls.add(url.href);
    }
    for (const rawUrl of extractUrls(text)) {
      const normalized = validPublicUrl(rawUrl);
      if (!normalized) continue;
      const url = new URL(normalized);
      const surface = addSurface(map, url.host, file);
      if (!surface) continue;
      if (/sitemap.*\.xml$/i.test(url.pathname)) surface.sitemap_urls.add(url.href);
      else if (/sitemap.*\.xml$/i.test(name)) surface.sample_urls.add(url.href);
    }
  });
  return [...map.values()].map((surface) => ({
    host: surface.host,
    origin: surface.origin,
    robots_url: surface.robots_url,
    sitemap_urls: [...surface.sitemap_urls].sort(),
    sample_urls: [...surface.sample_urls].sort().slice(0, 25),
    source_files: [...surface.source_files].sort(),
    notes: [...surface.notes].sort()
  })).filter((surface) => surface.sitemap_urls.length || surface.sample_urls.length)
    .sort((a, b) => a.host.localeCompare(b.host));
}

function deploymentLedgerUrls() {
  const ledger = path.join(repoRoot, 'metraiyux-portal/operator/deployment-ledger.html');
  if (!fs.existsSync(ledger)) return [];
  return uniq(extractUrls(fs.readFileSync(ledger, 'utf8')).map(validPublicUrl).filter(Boolean))
    .filter((url) => {
      const parsed = new URL(url);
      return /\.(pages\.dev|workers\.dev)$/.test(parsed.host) || parsed.host.includes('graylondonskyes.workers.dev');
    })
    .sort();
}

function writeReport(results, roots, surfaces) {
  const managed = results.filter((item) => item.status === 'updated' || item.status === 'would_update');
  const needsOrigin = results.filter((item) => item.status === 'needs_origin');
  const needsPublicOrigin = results.filter((item) => item.status === 'needs_public_origin');
  const noPublicPages = results.filter((item) => item.status === 'no_public_pages');
  const liveHostsWithSitemaps = new Set(surfaces.flatMap((surface) => surface.sitemap_urls.length ? [surface.host] : []));
  const liveSurfaceGaps = deploymentLedgerUrls()
    .map((url) => {
      const parsed = new URL(url);
      return { url, host: parsed.host, suggested_sitemap: `${parsed.origin}/sitemap.xml` };
    })
    .filter((item) => !liveHostsWithSitemaps.has(item.host))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.host === item.host) === index)
    .sort((a, b) => a.host.localeCompare(b.host));

  const report = {
    schema: 'metraiyux.sitemap-agent.report.v1',
    ok: needsOrigin.length === 0,
    generated_at: now,
    dry_run: dryRun,
    command: 'npm run seo:agent',
    managed_site_count: managed.length,
    discovered_root_count: roots.length,
    needs_origin_count: needsOrigin.length,
    needs_public_origin_count: needsPublicOrigin.length,
    no_public_pages_count: noPublicPages.length,
    detected_surface_count: surfaces.length,
    live_surface_gap_count: liveSurfaceGaps.length,
    submit_first: managed.slice(0, 12).map((site) => ({
      name: site.name,
      property: site.property,
      sitemap: site.sitemapUrl,
      robots: site.robotsUrl,
      page_count: site.pageCount
    })),
    managed_sites: managed,
    needs_origin: needsOrigin,
    needs_public_origin: needsPublicOrigin,
    no_public_pages: noPublicPages,
    live_surface_gaps: liveSurfaceGaps,
    detected_surfaces: surfaces
  };

  writeFile(path.join(seoRoot, 'sitemap-agent-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFile(path.join(seoRoot, 'sitemap-agent-submit-links.json'), `${JSON.stringify({
    generated_at: now,
    google_search_console: 'https://search.google.com/search-console',
    sitemaps: managed.map((site) => ({
      name: site.name,
      root: site.root,
      property: site.property,
      sitemap: site.sitemapUrl,
      robots: site.robotsUrl,
      page_count: site.pageCount
    }))
  }, null, 2)}\n`);

  const markdown = [
    '# Sitemap Agent Report',
    '',
    `Generated: ${now}`,
    '',
    'Run this agent whenever a site, route, domain, or public page changes:',
    '',
    '```bash',
    'npm run seo:agent',
    '```',
    '',
    '## Managed Sites',
    '',
    ...managed.map((site) => `- ${site.name}: ${site.sitemapUrl} (${site.pageCount} URLs) - root \`${site.root}\``),
    '',
    '## Needs Origin Before The Agent Can Write',
    '',
    ...(needsOrigin.length ? needsOrigin.map((site) => `- \`${site.root}\`: ${site.reason}`) : ['- None']),
    '',
    '## Gated 0S Roots Needing Public Mirrors',
    '',
    ...(needsPublicOrigin.length ? needsPublicOrigin.map((site) => `- \`${site.root}\`: ${site.reason}`) : ['- None']),
    '',
    '## Live Surfaces Without A Detected Sitemap',
    '',
    ...(liveSurfaceGaps.length ? liveSurfaceGaps.map((surface) => `- ${surface.host}: check or add ${surface.suggested_sitemap}`) : ['- None detected from the deployment ledger']),
    '',
    '## Search Console',
    '',
    'Submit the sitemap URL for each verified property in Google Search Console: https://search.google.com/search-console',
    ''
  ].join('\n');
  writeFile(path.join(seoRoot, 'SITEMAP_AGENT_REPORT.md'), markdown);

  const html = [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow">',
    '<title>Sitemap Agent Report</title>',
    '<style>body{margin:0;background:#080a0f;color:#f6f3ea;font:15px/1.5 Inter,Arial,sans-serif}main{max-width:1120px;margin:auto;padding:40px 20px}section{border:1px solid #2b3340;background:#10151d;border-radius:8px;padding:18px;margin:14px 0}a{color:#8bdcff}code{color:#ffe19a;word-break:break-all}.muted{color:#b9c0cc}</style>',
    '</head><body><main>',
    '<h1>Sitemap Agent Report</h1>',
    `<p class="muted">Generated ${escapeHtml(now)}. Command: <code>npm run seo:agent</code>.</p>`,
    '<h2>Managed Sites</h2>',
    ...managed.map((site) => `<section><h3>${escapeHtml(site.name)}</h3><p><a href="${escapeHtml(site.sitemapUrl)}">${escapeHtml(site.sitemapUrl)}</a></p><p class="muted">${site.pageCount} URLs. Root: <code>${escapeHtml(site.root)}</code></p></section>`),
    '<h2>Needs Origin</h2>',
    ...(needsOrigin.length ? needsOrigin.map((site) => `<section><code>${escapeHtml(site.root)}</code><p class="muted">${escapeHtml(site.reason)}</p></section>`) : ['<p class="muted">None.</p>']),
    '<h2>Gated 0S Roots Needing Public Mirrors</h2>',
    ...(needsPublicOrigin.length ? needsPublicOrigin.map((site) => `<section><code>${escapeHtml(site.root)}</code><p class="muted">${escapeHtml(site.reason)}</p></section>`) : ['<p class="muted">None.</p>']),
    '<h2>Live Surface Gaps</h2>',
    ...(liveSurfaceGaps.length ? liveSurfaceGaps.map((surface) => `<section><h3>${escapeHtml(surface.host)}</h3><p class="muted">Check or add <code>${escapeHtml(surface.suggested_sitemap)}</code></p></section>`) : ['<p class="muted">None detected from the deployment ledger.</p>']),
    '</main></body></html>',
    ''
  ].join('\n');
  writeFile(path.join(seoRoot, 'sitemap-agent-report.html'), html);

  return report;
}

function main() {
  const config = { ...defaultConfig, ...readJson(configPath, {}) };
  config.skipExactRoots = [...new Set([...(defaultConfig.skipExactRoots || []), ...(config.skipExactRoots || [])])];
  config.skipRootPrefixes = [...new Set([...(defaultConfig.skipRootPrefixes || []), ...(config.skipRootPrefixes || [])])];
  config.sites = config.sites || [];
  const configByRoot = new Map(config.sites.map((site) => [normalizeRel(site.root), site]));
  const roots = detectSiteRoots(config);
  const results = roots.map((rootInfo) => {
    const rootConfig = configByRoot.get(rootInfo.root) || {};
    return generateSite(rootInfo.root, rootConfig, config);
  });
  const surfaces = scanPublicSurfaces(config);
  const report = writeReport(results, roots, surfaces);
  console.log(JSON.stringify({
    ok: report.ok,
    dryRun,
    managedSites: report.managed_site_count,
    discoveredRoots: report.discovered_root_count,
    needsOrigin: report.needs_origin_count,
    needsPublicOrigin: report.needs_public_origin_count,
    liveSurfaceGaps: report.live_surface_gap_count,
    outputs: [
      'metraiyux_0s_site/seo/sitemap-agent-report.json',
      'metraiyux_0s_site/seo/SITEMAP_AGENT_REPORT.md',
      'metraiyux_0s_site/seo/sitemap-agent-report.html',
      'metraiyux_0s_site/seo/sitemap-agent-submit-links.json'
    ]
  }, null, 2));
  if (strict && report.needs_origin_count) process.exitCode = 2;
}

main();
