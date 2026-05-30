#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = path.resolve(repoRoot, 'Zenith/skyesol-main-extracted/skyesol-main');
const destRoot = path.resolve(repoRoot, 'metraiyux_0s_site/skyenet-drops/skyesol-company-public');
const mountPath = process.env.SKYESOL_SKYENET_MOUNT_PATH || '';
const solEnterprisesMountPath = process.env.SOLENTERPRISES_SKYENET_PUBLIC_ORIGIN || 'https://skyenet.solenterprises';
const origin = process.env.SKYESOL_SKYENET_PUBLIC_ORIGIN || 'https://skyenet.skyesol';
const liveBase = `${origin}${mountPath}`;

const allowedTopLevel = new Set([
  'Blogs',
  'Bundles',
  'Case Studies',
  'Pages',
  'Platforms-Apps',
  'Platforms-Apps-Infrastructure',
  'Service-Page-Makeover',
  'Services',
  'SkyeArchive',
  'SkyeCollab',
  'SkyeDocx',
  'SkyeDrive',
  'SkyeFlow',
  'SkyeLedger',
  'SkyeOps',
  'SkyePWA Forge',
  'SkyeSheets',
  'SkyeSlides',
  'SolenteAI',
  'SovereignVariables',
  'THE NET WORKS',
  'Valley Verified ',
  'Valuationx',
  '_shared',
  'ai-workflow-systems-for-service-businesses',
  'assets',
  'business-command-center-for-contractors',
  'case-study-collections-collapse',
  'case-study-home-occupation',
  'case-study-tpt-surprise',
  'contact',
  'credibility',
  'css',
  'custom-ai-automation-for-small-businesses',
  'custom-business-portals-for-local-companies',
  'directory',
  'divisions',
  'docs',
  'document-automation-for-creators-and-businesses',
  'get-started',
  'index',
  'insights',
  'js',
  'kAIxu',
  'kaixu',
  'leadership',
  'markets',
  'partials',
  'platforms-apps-infrastructure',
  'pricing',
  'privacy',
  'resources',
  'seo-content-systems-for-small-businesses',
  'skyefuelstation',
  'status',
  'terms',
  'welcome'
]);

const deniedNames = new Set([
  '.git',
  '.skyenet',
  '.vscode',
  'node_modules',
  'netlify',
  'functions',
  'functions-disabled',
  'scripts',
  'sql',
  'lib',
  'DEV NOTES AND  DIRECTIVES',
  'Operating-Systems',
  'WebPile ProтАФMonaco Editor',
  '0s-auth-sdk',
  'account',
  'members',
  'gateway',
  'vault',
  'reports',
  'xxDEVONLY',
  'cdn-cgi',
  'skyesol-main'
]);

const deniedRelPrefixes = [
  'docs/proof/',
  'SkyeLeticXOfficialWebsite/netlify/',
  'WebPile ProтАФMonaco Editor/netlify/'
];

const allowedExtensions = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.webmanifest',
  '.manifest',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.ico',
  '.txt',
  '.xml',
  '.pdf'
]);

const textExtensions = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.webmanifest',
  '.manifest',
  '.txt',
  '.xml',
  '.svg'
]);

function slash(rel) {
  return rel.replace(/\\/g, '/');
}

function shouldSkip(rel, entryName = '') {
  const clean = slash(rel);
  const parts = clean.split('/').filter(Boolean);
  if (!parts.length) return false;
  const top = parts[0];
  if (!allowedTopLevel.has(top)) return true;
  if (parts.some((part) => deniedNames.has(part) || /dumbass/i.test(part))) return true;
  if (deniedRelPrefixes.some((prefix) => clean === prefix.slice(0, -1) || clean.startsWith(prefix))) return true;
  if (entryName && /(?:^|\/)\.[^.]/.test(entryName) && entryName !== '.well-known') return true;
  return false;
}

function isDeployableFile(rel) {
  const ext = path.extname(rel).toLowerCase();
  if (rel.endsWith('/_redirects') || path.basename(rel) === '_redirects') return false;
  return allowedExtensions.has(ext);
}

function needsTextRewrite(rel) {
  return textExtensions.has(path.extname(rel).toLowerCase());
}

function rewriteInternalUrls(text) {
  let out = text;
  out = out.replace(/<base\s+href=(["'])\/\1/gi, `<base href="${mountPath}/"`);
  out = out.replace(/https:\/\/skyesol\.netlify\.app\/?/gi, `${liveBase}/`);
  out = out.replace(/https:\/\/skyesoverlondon\.netlify\.app\/?/gi, `${liveBase}/leadership/SkyesOverLondon.html`);
  out = out.replace(/skyesol\.netlify\.app/gi, 'skyenet.skyesol');
  out = out.replace(/https:\/\/www\.solenterprises\.org\/?/gi, `${solEnterprisesMountPath}/`);
  out = out.replace(/https:\/\/solenterprises\.org\/?/gi, `${solEnterprisesMountPath}/`);

  out = out.replace(/\b(href|src|action)=("|')\/(?!\/|#|api(?:\/|$)|skyenet(?:\/|$)|admin\/login(?:\.html)?(?:\?|$))([^"']*)\2/gi, (_m, attr, quote, target) => {
    return `${attr}=${quote}${mountPath}/${target}${quote}`;
  });

  out = out.replace(/\b(content)=("|')\/(?!\/|#|api(?:\/|$)|skyenet(?:\/|$)|admin\/login(?:\.html)?(?:\?|$))([^"']*)\2/gi, (_m, attr, quote, target) => {
    return `${attr}=${quote}${mountPath}/${target}${quote}`;
  });

  out = out.replace(/(url=)\/(?!\/|#|api(?:\/|$)|skyenet(?:\/|$)|admin\/login(?:\.html)?(?:\?|$))([^"'<>\s;]+)/gi, (_m, prefix, target) => {
    return `${prefix}${mountPath}/${target}`;
  });

  out = out.replace(/url\((['"]?)\/(?!\/|#|api(?:\/|$)|skyenet(?:\/|$)|admin\/login(?:\.html)?(?:\?|$))([^'")]+)\1\)/gi, (_m, quote, target) => {
    return `url(${quote}${mountPath}/${target}${quote})`;
  });

  out = out.replace(/(["'`])\/(?!\/|#|api(?:\/|$)|skyenet(?:\/|$)|admin\/login(?:\.html)?(?:\?|$)|mailto:|tel:|data:)([A-Za-z0-9._~!$&()*+,;=:@%/-]+)\1/g, (_m, quote, target) => {
    return `${quote}${mountPath}/${target}${quote}`;
  });

  const mountedRewrites = [
    ['case-studies/', 'Case Studies/'],
    ['editorials/index.html', 'Blogs/Editorials/index.html'],
    ['editorials/glendale-clubs/', 'Blogs/Editorials/ArizonaClubScene/GlendaleArizona/'],
    ['editorials/mesa-clubs/', 'Blogs/Editorials/ArizonaClubScene/MesaArizona/'],
    ['editorials/phoenix-clubs/', 'Blogs/Editorials/ArizonaClubScene/PhoenixArizona/'],
    ['editorials/scottsdale-clubs/', 'Blogs/Editorials/ArizonaClubScene/ScottsdaleArizona/'],
    ['editorials/tempe-clubs/', 'Blogs/Editorials/ArizonaClubScene/TempeArizona/'],
    ['editorials/little-linguist-jumpstart-kit/', 'Blogs/Editorials/APPS WEVE ENGINEERED/LittleLinguist.html'],
    ['editorials/kaixu-super-ide/', 'Blogs/Editorials/APPS WEVE ENGINEERED/kAIxuSuperIDE.html'],
    ['0megagate/', 'Services/0megaGate/'],
    ['services/website-builds-executive-authority/', 'Services/WebBuilds/ExecutiveAuthority.html']
  ];
  for (const [from, to] of mountedRewrites) {
    out = out.replaceAll(`${mountPath}/${from}`, `${mountPath}/${to}`);
  }
  out = out.replace(new RegExp(`${mountPath.replace(/\//g, '\\/')}/Platforms-Apps-Infrastructure/2026/[^"'<>\\n]+`, 'g'), `${mountPath}/Platforms-Apps-Infrastructure/index.html`);
  out = out.replace(new RegExp(`${mountPath.replace(/\//g, '\\/')}/Platforms-Apps-Infrastructure/(?!index\\.html|JWTSecretGenerator\\.html|RetroFighter\\.html)[^"'<>\\n]+`, 'g'), `${mountPath}/Platforms-Apps-Infrastructure/index.html`);
  out = out.replace(new RegExp(`${mountPath.replace(/\//g, '\\/')}/editorials/[^"'<>\\n]+`, 'g'), `${mountPath}/Blogs/Editorials/index.html`);
  out = out.replace(new RegExp(`${mountPath.replace(/\//g, '\\/')}/SkyeLeticXOfficialWebsite/?[^"'<>\\n]*`, 'g'), `${mountPath}/Case Studies/skyeleticx-league-governance-launch.html`);

  const gateReturn = encodeURIComponent(`${mountPath}/`);
  out = out.replaceAll(`${mountPath}/admin.html`, `/admin/login.html?return=${gateReturn}`);
  out = out.replaceAll(`${mountPath}/admin-menu.html`, `/admin/login.html?return=${gateReturn}`);
  out = out.replaceAll(`${mountPath}/gateway/dashboard.html`, `/admin/login.html?return=${gateReturn}`);
  out = out.replace(/\bhref=(["'])admin(?:-menu)?\.html\1/gi, (_match, quote) => `href=${quote}/admin/login.html?return=${gateReturn}${quote}`);
  out = out.replace(/\bhref=(["'])dashboard\.html\1/gi, (_match, quote) => `href=${quote}/admin/login.html?return=${gateReturn}${quote}`);
  out = out.replace(new RegExp(`${mountPath.replace(/\//g, '\\/')}/(?:account|members)(?:/index\\.html|/)?`, 'g'), `/admin/login.html?return=${gateReturn}`);
  out = out.replace(new RegExp(`${mountPath.replace(/\//g, '\\/')}/gateway(?:/|(?=["'<>\\s]))`, 'g'), `/admin/login.html?return=${gateReturn}`);

  return out;
}

function rewriteCohortServicePage(text) {
  const livePage = `${liveBase}/Service-Page-Makeover/Service-Page-Standard.html`;
  const linkRewrites = new Map([
    ['../manifest.webmanifest', `${mountPath}/manifest.webmanifest`],
    ['../icons/icon-192.png', `${mountPath}/SkyeDocx/assets/icons/icon-192.png`],
    ['../index.html', `${mountPath}/`],
    ['pricing.html', `${mountPath}/pricing.html`],
    ['curriculum.html', `${mountPath}/Services/0megaGate/0megagate-product-page.html`],
    ['proof.html', `${mountPath}/credibility.html`],
    ['./proof.html', `${mountPath}/credibility.html`],
    ['founder.html', `${mountPath}/about.html`],
    ['trust.html', `${mountPath}/trust.html`],
    ['editorials/index.html', `${mountPath}/Blogs/Editorials/index.html`],
    ['./editorials/community-pillar.html', `${mountPath}/Blogs/Editorials/index.html`],
    ['./editorials/rising-stars.html', `${mountPath}/Blogs/Editorials/index.html`],
    ['mercy-home.html', `${mountPath}/Service-Page-Makeover/Service-Page-Standard.html`],
    ['apply.html', `${mountPath}/contact.html`]
  ]);

  let out = text
    .replace(/https:\/\/kaixu-0s-founder-cohort-platform\.netlify\.app\/pages\/mercy-home\.html/g, livePage)
    .replace(/\.\.\/assets\/media\/skyes-primary-logo\.png/g, 'https://cdn1.sharemyimage.com/2026/02/16/logo1_transparent.png')
    .replace(/\.\.\/assets\/media\/founder\.png/g, 'https://cdn1.sharemyimage.com/2026/02/23/ChatGPTImageFeb23202610_24_00AM.png');

  for (const [from, to] of linkRewrites) {
    out = out.replace(new RegExp(`(href|src)=(["'])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\2`, 'g'), (_match, attr, quote) => {
      return `${attr}=${quote}${to}${quote}`;
    });
  }
  return out;
}

function rewriteSovereignVariablesPage(text) {
  return text.replace(/\bhref=(["'])\.\/icon-192\.png\1/gi, (_match, quote) => {
    return `href=${quote}${mountPath}/SovereignVariables/SKYESOVERLONDONDIETYLOGO.png${quote}`;
  });
}

function injectNetworkStrip(html) {
  if (!html.includes('<body') || html.includes('data-skynet-network-strip="skyesol"')) return html;
  const strip = `
<section class="skynet-network-strip" data-skynet-network-strip="skyesol" style="padding:28px 20px;border-top:1px solid rgba(201,168,76,.18);border-bottom:1px solid rgba(201,168,76,.18);background:rgba(5,5,10,.72);">
  <div style="max-width:1120px;margin:0 auto;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
    <div>
      <p style="margin:0 0 6px;color:#c9a84c;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">SkyeNet Company Network</p>
      <h2 style="margin:0;color:#f5f1e7;font-size:clamp(22px,3vw,34px);font-family:Georgia,serif;">Skyes Over London LC now shares the SkyeNet lane with SkyeRouteX Logistics and SOLEnterprises.</h2>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <a href="${mountPath}/" style="border:1px solid rgba(201,168,76,.45);color:#c9a84c;padding:10px 14px;border-radius:4px;text-decoration:none;">SkyeSol Home</a>
      <a href="https://skyenet.skyeroutex-logistics/" style="border:1px solid rgba(201,168,76,.45);color:#c9a84c;padding:10px 14px;border-radius:4px;text-decoration:none;">SkyeRouteX Logistics</a>
      <a href="${solEnterprisesMountPath}/" style="border:1px solid rgba(201,168,76,.45);color:#c9a84c;padding:10px 14px;border-radius:4px;text-decoration:none;">SOLEnterprises</a>
    </div>
  </div>
</section>`;
  return html.replace(/<footer\b/i, `${strip}\n<footer`);
}

async function copyTree(src, dest, relBase = '') {
  const entries = await fs.readdir(src, { withFileTypes: true });
  let copied = 0;
  let skipped = 0;
  for (const entry of entries) {
    const rel = slash(path.join(relBase, entry.name));
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (shouldSkip(rel, entry.name)) {
      skipped += 1;
      continue;
    }
    if (entry.isDirectory()) {
      await fs.mkdir(to, { recursive: true });
      const result = await copyTree(from, to, rel);
      copied += result.copied;
      skipped += result.skipped;
      continue;
    }
    if (!entry.isFile() || !isDeployableFile(rel)) {
      skipped += 1;
      continue;
    }
    await fs.mkdir(path.dirname(to), { recursive: true });
    if (needsTextRewrite(rel)) {
      let text = await fs.readFile(from, 'utf8');
      text = rewriteInternalUrls(text);
      if (rel === 'Service-Page-Makeover/Service-Page-Standard.html') text = rewriteCohortServicePage(text);
      if (rel === 'SovereignVariables/index.html') text = rewriteSovereignVariablesPage(text);
      if (rel === 'index/index.html') text = injectNetworkStrip(text);
      await fs.writeFile(to, text);
    } else {
      await fs.copyFile(from, to);
    }
    copied += 1;
  }
  return { copied, skipped };
}

async function listFiles(root) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(slash(path.relative(root, full)));
      }
    }
  }
  await walk(root);
  return out.sort();
}

function htmlToUrl(rel) {
  const encodedRel = encodeURI(rel);
  if (encodedRel === 'index.html' || encodedRel === 'index/index.html') return `${liveBase}/`;
  if (encodedRel.endsWith('/index.html')) return `${liveBase}/${encodedRel.slice(0, -'index.html'.length)}`;
  return `${liveBase}/${encodedRel}`;
}

function aliasHtml({ title, target }) {
  const targetUrl = `${mountPath}/${target}`.replace(/\/+/g, '/');
  const liveTarget = `${origin}${targetUrl}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <link rel="canonical" href="${liveTarget}">
  <title>${title} | Skyes Over London LC</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07070f;color:#ece9e2;font-family:Inter,Segoe UI,system-ui,sans-serif}
    a{color:#c9a84c}
  </style>
</head>
<body>
  <p>Opening <a href="${targetUrl}">${title}</a>.</p>
  <script>location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>
`;
}

async function writeAliasPages() {
  async function maybeWriteAlias(alias, target, title) {
    const targetPath = path.join(destRoot, target);
    if (!existsSync(targetPath)) return false;
    const aliasPath = path.join(destRoot, alias);
    await fs.mkdir(path.dirname(aliasPath), { recursive: true });
    await fs.writeFile(aliasPath, aliasHtml({ title, target }));
    return true;
  }

  const aliases = [
    ['about/index.html', 'leadership/SkyesOverLondon.html', 'Founder'],
    ['about.html', 'leadership/SkyesOverLondon.html', 'Founder'],
    ['case-studies/index.html', 'Case Studies/index.html', 'Case Studies'],
    ['platforms.html', 'Platforms-Apps-Infrastructure/index.html', 'Platforms And Apps'],
    ['network.html', 'divisions/index.html', 'Network'],
    ['blog.html', 'Blogs/PhoenixValleyBlogHome.html', 'Blog'],
    ['blog/index.html', 'Blogs/PhoenixValleyBlogHome.html', 'Blog'],
    ['portfolio.html', 'Case Studies/index.html', 'Portfolio'],
    ['credibility.html', 'credibility/index.html', 'Credibility'],
    ['contact.html', 'contact/index.html', 'Contact'],
    ['status.html', 'status/index.html', 'Status'],
    ['pricing.html', 'pricing/index.html', 'Pricing'],
    ['privacy.html', 'privacy/index.html', 'Privacy'],
    ['terms.html', 'terms/index.html', 'Terms'],
    ['vault.html', 'docs/index.html', 'Public Docs'],
    ['sitemap/index.html', 'sitemap.xml', 'Sitemap'],
    ['sitemap-visual.html', 'sitemap.xml', 'Sitemap'],
    ['thank-you.html', 'contact/index.html', 'Contact'],
    ['thanks.html', 'contact/index.html', 'Contact'],
    ['get-started.html', 'get-started/index.html', 'Get Started'],
    ['trust.html', 'kAIxu/trust.html', 'Trust'],
    ['trust/index.html', 'kAIxu/trust.html', 'Trust'],
    ['how-to-start-an-llc-in-arizona-phoenix/index.html', 'Blogs/Phoenix Arizona/02_how_to_start_llc_arizona_phoenix.html', 'How To Start An LLC In Arizona'],
    ['arizona-tpt-license-who-needs-it/index.html', 'Blogs/Phoenix Arizona/05_arizona_tpt_license_who_needs_it.html', 'Arizona TPT License'],
    ['arizona-llc-cost-breakdown/index.html', 'Blogs/Phoenix Arizona/03_arizona_llc_cost_breakdown.html', 'Arizona LLC Cost Breakdown'],
    ['phoenix-business-license-requirements/index.html', 'Blogs/Phoenix Arizona/04_phoenix_business_license_requirements.html', 'Phoenix Business License Requirements'],
    ['how-to-get-an-ein-arizona/index.html', 'Blogs/Phoenix Arizona/06_how_to_get_an_ein_arizona.html', 'How To Get An EIN In Arizona'],
    ['phoenix-start-business-llc-compliance-playbook/index.html', 'Blogs/PhoenixValleyBlogHome.html', 'Phoenix Business Compliance Playbook'],
    ['accessibility/index.html', 'contact/index.html', 'Accessibility'],
    ['skyeleticx-portal.html', 'Case Studies/skyeleticx-league-governance-launch.html', 'SkyeLeticX'],
    ['Blogs/Phoenix Arizona/index.html', 'Blogs/PhoenixValleyBlogHome.html', 'Phoenix Valley Blog'],
    ['Services/kAIxUGatedPlatform.html', 'Services/kAIxU-Powered-Platforms/kAIxUGatedPlatform.html', 'kAIxU Gated Platform'],
    ['blog/posts/my-new-post.html', 'Blogs/PhoenixValleyBlogHome.html', 'Blog'],
    ['blog/posts/phoenix-llc-checklist.html', 'Blogs/Phoenix Arizona/02_how_to_start_llc_arizona_phoenix.html', 'Phoenix LLC Checklist'],
    ['access-222/routing/index.html', 'contact/index.html', 'Access Routing'],
    ['WebPile Pro—Monaco Editor/index.html', 'Blogs/Editorials/WebPile ProтАФMonaco Editor.html', 'WebPile Pro'],
    ['Blogs/Editorials/WebPile Pro—Monaco Editor.html', 'Blogs/Editorials/WebPile ProтАФMonaco Editor.html', 'WebPile Pro']
  ];
  for (const [alias, target, title] of aliases) {
    await maybeWriteAlias(alias, target, title);
  }

  const caseStudy2026 = path.join(destRoot, 'Case Studies/2026');
  if (existsSync(caseStudy2026)) {
    for (const entry of await fs.readdir(caseStudy2026, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      await maybeWriteAlias(`Case Studies/${entry.name}`, `Case Studies/2026/${entry.name}`, 'Case Study');
    }
  }

  const editorialCities = [
    ['glendale-clubs', 'GlendaleArizona'],
    ['mesa-clubs', 'MesaArizona'],
    ['phoenix', 'PhoenixArizona'],
    ['phoenix-clubs', 'PhoenixArizona'],
    ['scottsdale-clubs', 'ScottsdaleArizona'],
    ['tempe-clubs', 'TempeArizona']
  ];
  for (const [aliasSlug, sourceSlug] of editorialCities) {
    const sourceDir = path.join(destRoot, 'Blogs/Editorials/ArizonaClubScene', sourceSlug);
    if (!existsSync(sourceDir)) continue;
    for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      await maybeWriteAlias(`editorials/${aliasSlug}/${entry.name}`, `Blogs/Editorials/ArizonaClubScene/${sourceSlug}/${entry.name}`, 'Editorial');
    }
  }
}

async function writeEncodedPathCopies() {
  const files = await listFiles(destRoot);
  let copied = 0;
  for (const rel of files) {
    const encodedRel = rel.split('/').map((part) => encodeURIComponent(part)).join('/');
    if (encodedRel === rel) continue;
    const from = path.join(destRoot, rel);
    const to = path.join(destRoot, encodedRel);
    if (existsSync(to)) continue;
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    copied += 1;
  }
  return copied;
}

async function writeSkyeNetFiles(stats) {
  const sourceIndex = path.join(destRoot, 'index/index.html');
  const rootIndex = path.join(destRoot, 'index.html');
  if (!existsSync(sourceIndex)) throw new Error(`Missing staged source homepage: ${sourceIndex}`);
  await fs.copyFile(sourceIndex, rootIndex);

  const manifest = {
    name: 'Skyes Over London LC',
    short_name: 'SkyeSol',
    start_url: `${mountPath}/`,
    scope: `${mountPath}/`,
    display: 'standalone',
    background_color: '#05050a',
    theme_color: '#05050a',
    icons: [
      { src: `${mountPath}/SkyeDocx/assets/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${mountPath}/SkyeDocx/assets/icons/icon-512.png`, sizes: '512x512', type: 'image/png' }
    ]
  };
  await fs.writeFile(path.join(destRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(destRoot, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);

  let files = await listFiles(destRoot);
  let htmlFiles = files.filter((file) => file.endsWith('.html'));
  const urls = Array.from(new Set(htmlFiles.map(htmlToUrl))).sort();
  const now = new Date().toISOString();

  await fs.writeFile(path.join(destRoot, 'robots.txt'), [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${liveBase}/sitemap.xml`,
    ''
  ].join('\n'));

  await fs.writeFile(path.join(destRoot, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc><lastmod>${now.slice(0, 10)}</lastmod></url>`),
    '</urlset>',
    ''
  ].join('\n'));

  await writeAliasPages();
  const encodedPathCopies = await writeEncodedPathCopies();
  files = await listFiles(destRoot);
  htmlFiles = files.filter((file) => file.endsWith('.html'));

  const receipt = {
    ok: true,
    generated_at: now,
    source_root: path.relative(repoRoot, sourceRoot),
    destination_root: path.relative(repoRoot, destRoot),
    project_id: 'skyesol-company-public',
    workspace_id: 'skyesol',
    mount_path: mountPath,
    live_url: `${liveBase}/`,
    source_homepage: 'index/index.html',
    root_homepage: 'index.html',
    copied_files: stats.copied,
    skipped_entries: stats.skipped,
    staged_files: files.length,
    staged_html_files: htmlFiles.length,
    encoded_path_copies: encodedPathCopies,
    excluded_private_or_server_lanes: [
      'netlify/',
      'netlify/functions/',
      'scripts/',
      'sql/',
      'lib/',
      'DEV NOTES AND  DIRECTIVES/',
      'Operating-Systems/',
      '0s-auth-sdk/',
      'account/',
      'members/',
      'gateway/',
      'vault/',
      'reports/',
      'xxDEVONLY/',
      'cdn-cgi/'
    ],
    notes: [
      'Root index.html is copied from the imported SkyeSol index/index.html.',
      'Internal SkyeSol absolute paths and SkyeSol Netlify canonicals are rewritten for the host-native SkyeNet public route.',
      'SOLEnterprises now links to the host-native SkyeNet umbrella site because a standalone source root was not present.'
    ]
  };
  await fs.writeFile(path.join(destRoot, 'skyenet-migration.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

if (!existsSync(sourceRoot)) {
  throw new Error(`SkyeSol source root not found: ${sourceRoot}`);
}

await fs.rm(destRoot, { recursive: true, force: true });
await fs.mkdir(destRoot, { recursive: true });
const stats = await copyTree(sourceRoot, destRoot);
const receipt = await writeSkyeNetFiles(stats);
console.log(JSON.stringify(receipt, null, 2));
