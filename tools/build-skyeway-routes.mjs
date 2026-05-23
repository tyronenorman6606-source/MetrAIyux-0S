import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'metraiyux_0s_site');
const output = path.join(root, 'assets', 'skyeway-routes.js');
const htmlExt = /\.(html|htm)$/i;
const skippedRoutePatterns = [
  /^_platform-sources(?:\/|$)/,
  /^cloudflare(?:-[^/]+)?(?:\/|$)/,
  /^api(?:\/|$)/,
  /(?:^|\/)(?:src|server|scripts|smoke|tests?|proof)(?:\/|$)/,
  /(?:^|\/)(?:netlify|migrations|runtime\/data|runtime\/db|runtime\/state)(?:\/|$)/,
  /^Free99\/apps\/sovereigndocs\/(?:template-library|templates|build)(?:\/|$)/
];

const platformRoots = new Set([
  'Auren',
  'HouseOperations',
  'Marketing-Made-Easy',
  'SkyeMediaCenter',
  'SkyeMusicNexus',
  'SkyeProfitConsole',
  'SkyeRouteX',
  'SkyeSplitEngine',
  'connectlog-v7.7-relay13-operator-proof',
  'relay13-core-v1.7-connectlog-operator-proof'
]);

const clientRoots = new Set([
  'account',
  'client-os',
  'client-preview',
  'portal-layer',
  'portals',
  'saas'
]);

const salesRoots = new Set([
  'ae-command',
  'buyer-intelligence',
  'conversion',
  'market',
  'pricing',
  'proposal-center',
  'revenue-ops',
  'sales',
  'sales-enablement'
]);

const proofRoots = new Set([
  'ai-readiness',
  'autonomous-business',
  'brain',
  'brain-governance',
  'changelog',
  'crown-os',
  'nexus',
  'operator',
  'proof',
  'proof-export',
  'proof-vault',
  'quantum-ops',
  'sentinel',
  'sentinel-os',
  'skye-vault-os'
]);

const externalRoutes = [
  [
    'https://merser-mcp.pages.dev/',
    'Merser MCP by Skyes Over London',
    'MCP and Developer Tools',
    'remote-mcp',
    'fs27-gated-remote-mcp'
  ],
  [
    'https://merser-mcp.pages.dev/health',
    'Merser MCP Health',
    'MCP and Developer Tools',
    'remote-mcp',
    'fs27-gated-remote-mcp'
  ]
];

const governanceRoots = new Set([
  'certification-readiness',
  'contracts',
  'governance',
  'government',
  'legal-readiness',
  'policies'
]);

const contentRoots = new Set([
  'blog',
  'brand',
  'case-studies',
  'company',
  'industries',
  'seo',
  'services'
]);

const operationsRoots = new Set([
  'apex',
  'branch-expansion',
  'calculators',
  'candidates',
  'dominion-upgrade',
  'download-center',
  'downloads',
  'executive-rooms',
  'investor',
  'launch',
  'member',
  'recruiting',
  'resumes',
  'training-academy',
  'walkthroughs'
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.wrangler') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (htmlExt.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
}

function labelFromPath(routePath) {
  const withoutIndex = routePath
    .replace(/\/index\.html?$/i, '')
    .replace(/\.html?$/i, '')
    .replace(/^index$/i, 'Home');
  const last = withoutIndex.split('/').filter(Boolean).pop() || 'Home';
  return last
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .replace(/\b0s\b/i, '0S');
}

function titleFor(file, routePath) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8').slice(0, 65536);
  } catch (_error) {
    return labelFromPath(routePath);
  }
  const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    || text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    || '';
  const clean = decodeEntities(title)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean || labelFromPath(routePath)).slice(0, 140);
}

function categoryFor(routePath) {
  const parts = routePath.split('/');
  const rootName = parts[0];
  const second = parts[1] || '';
  const third = parts[2] || '';

  if (routePath === 'skyeway.html') return 'SkyeWay';
  if (!second) return 'Root';
  if (rootName === '_platform-sources') return 'Source Mirrors';
  if (rootName === 'client-app-factory' && second === 'client-apps') return 'Client Apps';
  if (rootName === 'Free99' && second === 'apps' && third === 'sovereigndocs') return 'SovereignDocs';
  if (rootName === 'Free99') return 'Free99 Apps';
  if (rootName === 'valley-verified' && second === 'business') return 'Valley Verified Businesses';
  if (rootName === 'valley-verified' && second === 'niche') return 'Valley Verified Niches';
  if (rootName === 'valley-verified' && second === 'market') return 'Valley Verified Markets';
  if (rootName === 'valley-verified') return 'Valley Verified';
  if (rootName === 'live' && second === 'SkyeMail') return 'SkyeMail';
  if (rootName === 'live' && second === 'sol_staffing_agency_site') return 'Live SOL Staffing';
  if (rootName === 'live') return 'Live Surfaces';
  if (platformRoots.has(rootName)) return 'Platform Apps';
  if (clientRoots.has(rootName)) return 'Client and SaaS';
  if (salesRoots.has(rootName)) return 'Sales and Revenue';
  if (proofRoots.has(rootName)) return 'Brains, Proof, and Infra';
  if (governanceRoots.has(rootName)) return 'Governance and Legal';
  if (contentRoots.has(rootName)) return 'Public Content';
  if (operationsRoots.has(rootName)) return 'Operating Rooms';
  if (rootName.startsWith('cloudflare') || rootName === 'sdk') return 'Workers and SDK';
  return '0S Core';
}

function folderFor(routePath) {
  const parts = routePath.split('/');
  if (parts[0] === 'Free99' && parts[1] === 'apps' && parts[2]) return parts.slice(0, 3).join('/');
  if (parts[0] === 'valley-verified' && parts[1]) return parts.slice(0, 2).join('/');
  if (parts[0] === 'live' && parts[1]) return parts.slice(0, 2).join('/');
  return parts.length > 1 ? parts[0] : 'root';
}

function shouldSkipRoute(routePath) {
  return skippedRoutePatterns.some(pattern => pattern.test(routePath));
}

function gatePolicyFor(routePath) {
  if (routePath === 'skyeway.html') return 'fs27-owner-gated';
  if (routePath.startsWith('client-app-factory/client-apps/')) return 'fs27-owner-gated-client-app';
  if (routePath.startsWith('Free99/apps/')) return 'fs27-free99-gated-app';
  if (routePath.startsWith('Free99/')) return 'fs27-free99-gated';
  if (routePath.startsWith('admin/')) return 'fs27-owner-gated-admin';
  if (routePath.startsWith('valley-verified/business/')) return 'public-valley-profile';
  if (routePath.startsWith('valley-verified/')) return 'fs27-gated-valley-ops';
  if (routePath.startsWith('live/')) return 'fs27-gated-live-surface';
  return 'fs27-owner-gated';
}

const routes = walk(root)
  .map(file => path.relative(root, file).split(path.sep).join('/'))
  .filter(routePath => !shouldSkipRoute(routePath))
  .sort((a, b) => a.localeCompare(b))
  .map(routePath => {
    const file = path.join(root, routePath);
    return [routePath, titleFor(file, routePath), categoryFor(routePath), folderFor(routePath), gatePolicyFor(routePath)];
  })
  .concat(externalRoutes);

const categories = routes.reduce((counts, route) => {
  counts[route[2]] = (counts[route[2]] || 0) + 1;
  return counts;
}, {});

const payload = JSON.stringify({
  generatedAt: new Date().toISOString(),
  gateAuthority: 'FS27 / 0S owner gate',
  gateRule: 'All 0S mounted app and platform routes require the FS27/0S gate unless explicitly marked as a public Valley profile or public proof/documentation route.',
  total: routes.length,
  categories,
  routes
}).replace(/</g, '\\u003c');

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  `// Generated by tools/build-skyeway-routes.mjs. Do not hand-edit this route inventory.\nwindow.METRAIYUX_SKYEWAY_ROUTES = ${payload};\n`
);

console.log(`Wrote ${routes.length} routes to ${path.relative(process.cwd(), output)}`);
