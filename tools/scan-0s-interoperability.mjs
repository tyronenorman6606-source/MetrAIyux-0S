import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');
const auditRoot = path.join(siteRoot, 'audits');
const generatedAt = new Date().toISOString();
const date = generatedAt.slice(0, 10);

function readText(rel) {
  const file = path.join(repoRoot, rel);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function readJson(rel, fallback) {
  try {
    return JSON.parse(readText(rel));
  } catch {
    return fallback;
  }
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const liveRegistry = readJson('metraiyux_0s_site/brain/live-surface-registry.json', {});
const free99Manifest = readJson('metraiyux_0s_site/Free99/app-manifest.json', {});
const factoryIndex = readJson('metraiyux_0s_site/client-app-factory/data/client-app-factory-index.json', {});
const contentEngine = readJson('metraiyux_0s_site/blog/content-engine.json', {});
const valleyMount = readJson('metraiyux_0s_site/valley-verified/MOUNTED_IN_0S.json', {});
const northstarMount = readJson('metraiyux_0s_site/northstar/MOUNTED_IN_0S.json', {});
const marketplaceSync = readJson('metraiyux_0s_site/brain/marketplace-sync.json', {});

const coreFiles = [
  'metraiyux_0s_site/cloudflare/worker.js',
  'metraiyux_0s_site/cloudflare/client-app-factory-adapter.mjs',
  'metraiyux_0s_site/cloudflare/marketing-made-easy-adapter.mjs',
  'metraiyux_0s_site/cloudflare/relay13-ai-lanes.mjs',
  'metraiyux_0s_site/northstar/assets/workspace-client.js',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/assets/app.js',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/skye-docx-max/app/sd-bridge.js',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/skye-docx-max/app/index.html',
  'metraiyux_0s_site/admin/content-engine-lane.js',
  'tools/build-0s-content-engine.mjs'
];

const scannedFiles = coreFiles.map((rel) => {
  const text = readText(rel);
  return {
    path: rel,
    bytes: Buffer.byteLength(text),
    apiRoutes: countMatches(text, /\/api\/[a-z0-9/_-]+/gi),
    storageSignals: {
      kv: /\bKV\b|SITE_EVENTS_KV|CONTENT_ENGINE_KV|SOVEREIGNDOCS_KV|CLIENT_APP_FACTORY_KV|MARKETING_MADE_EASY_KV/.test(text),
      d1: /\bD1\b|SOVEREIGNDOCS_DB|NEON|DATABASE_URL/.test(text),
      localStorage: /localStorage/.test(text),
      indexedDB: /indexedDB/.test(text),
      queue: /SITE_TASK_QUEUE|Queue|queued_for_operator_review/.test(text)
    },
    bridgeSignals: {
      skygate: /SkyGate|skygate|mirrorSkygateEvent|auth-introspect/.test(text),
      skyeDocxMax: /SkyeDocxMax|skye-docx-max/.test(text),
      relay13: /Relay13|relay13/.test(text),
      valleyVerified: /Valley Verified|valley-verified|VALLEY_SYNC/.test(text),
      contentEngine: /content-engine|ContentEngine|local_brain/.test(text),
      postMessage: /postMessage/.test(text)
    }
  };
});

const workerText = readText('metraiyux_0s_site/cloudflare/worker.js');
const appApiMounts = [...workerText.matchAll(/id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'[\s\S]{0,260}?base:\s*'([^']+)'/g)]
  .map((match) => ({ id: match[1], name: match[2], base: match[3] }))
  .filter((item, index, list) => list.findIndex((other) => other.id === item.id && other.base === item.base) === index);

const systems = [
  { id:'0s-worker', name:'MetrAIyux 0S Worker', kind:'router-api', apiBase:'/', persistence:'SITE_EVENTS_KV plus app-specific KV/D1 when configured' },
  { id:'skygate-fs27', name:'SkyeGate FS27', kind:'auth-event-gate', apiBase:'/api/skygate/*', persistence:'FS27/Citadel side; mirrored events only from 0S' },
  { id:'sovereigndocs', name:'SovereignDocs', kind:'document-workflow', apiBase:'/api/sovereigndocs', persistence:'SOVEREIGNDOCS_KV or SITE_EVENTS_KV' },
  { id:'skye-docx-max', name:'SkyeDocxMax', kind:'document-editor', apiBase:'/api/sovereigndocs/editor/skye-docx-max/*', persistence:'IndexedDB locally plus SovereignDocs handoffs/returns when launched from 0S' },
  { id:'client-app-factory', name:'Client App Factory', kind:'client-app-production', apiBase:'/api/client-app-factory', persistence:'CLIENT_APP_FACTORY_KV or SITE_EVENTS_KV' },
  { id:'valley-verified', name:'Valley Verified', kind:'local-market-network', apiBase:'/api/valley-verified/relay-leads', persistence:'SITE_EVENTS_KV relay and static Pages profile data' },
  { id:'marketing-made-easy', name:'Marketing Made Easy', kind:'marketing-suite', apiBase:'/api/marketing-made-easy', persistence:'MARKETING_MADE_EASY_KV or SITE_EVENTS_KV' },
  { id:'relay13-connectlog', name:'Relay13 / ConnectLog', kind:'message-inbox', apiBase:'/api/v1 or dedicated Relay13 worker', persistence:'Relay13 D1/KV plus 0S adapter events' },
  { id:'northstar-signinpro', name:'NorthStar / SignIn Pro', kind:'workspace-auth-sync', apiBase:'/api/northstar', persistence:'NorthStar database/functions; 0S mount uses workspace sync' },
  { id:'content-engine', name:'0S Content Engine', kind:'content-generation-approval', apiBase:'/api/admin/content-engine/*', persistence:'CONTENT_ENGINE_KV or SITE_EVENTS_KV' },
  { id:'skye-media-center', name:'SkyeMediaCenter', kind:'media-workflow', apiBase:'/api/media/*', persistence:'SKYE_MEDIA_CENTER_KV or SITE_EVENTS_KV' },
  { id:'skymusicnexus', name:'SkyeMusicNexus', kind:'music-ops', apiBase:'/api/skymusicnexus', persistence:'SKYMUSICNEXUS_KV/MUSIC_NEXUS_KV or SITE_EVENTS_KV' },
  { id:'skyeprofit-houseops', name:'SkyeProfitConsole / HouseOps', kind:'review-execution-dispatch', apiBase:'/api/profit and /api/houseops', persistence:'app-specific KV or SITE_EVENTS_KV' }
];

const integrations = [
  {
    from:'SovereignDocs',
    to:'SkyeDocxMax',
    status:'wired-now',
    route:'/api/sovereigndocs/editor/skye-docx-max/session and /return',
    evidence:['worker.js editor endpoints', 'sd-bridge.js import/return bridge', 'SovereignDocs vault sync button'],
    value:'Drafts open in the editor, editor returns persist back as documents and vault records.'
  },
  {
    from:'SkyeDocxMax',
    to:'SkyeBlog / SkyeDrive / SkyeMail',
    status:'local-bridge',
    route:'localStorage bridge drafts plus device/share fallbacks',
    evidence:['skye-docx-max/app/index.html pushToSkyeBlog/pushToSkyeDrive/pushToSkyeMail'],
    value:'Document content can be moved into blog, drive, mail, and device-share lanes locally; remote persistence still needs a shared 0S API contract.'
  },
  {
    from:'Client App Factory',
    to:'Valley Verified',
    status:'wired-now',
    route:'VALLEY_SYNC_PAYLOAD.json and /valley-verified mounted profiles',
    evidence:['client-app-factory-index.json', 'valley-verified/MOUNTED_IN_0S.json'],
    value:'Client apps can become Valley Verified profiles with media, QR, proof receipts, and business IDs.'
  },
  {
    from:'Client App Factory',
    to:'Relay13 AI Lanes',
    status:'wired-now',
    route:'client-app-factory-adapter imports relay13-ai-lanes.mjs',
    evidence:['client-app-factory-adapter.mjs'],
    value:'Client app lead/chat response tiers can use local-brain first and AI add-on routing without auto-spending.'
  },
  {
    from:'Marketing Made Easy',
    to:'SovereignDocs',
    status:'wired-now',
    route:'MME_AE_VENDOR_DOCS links into SovereignDocs document builders',
    evidence:['marketing-made-easy-adapter.mjs'],
    value:'Marketing/vendor onboarding can route contractor, W-9, ACH, and commission docs into SovereignDocs.'
  },
  {
    from:'0S Content Engine',
    to:'Local Brain / Website / Email / Social / Repo',
    status:'wired-now',
    route:'/api/admin/content-engine/activate, /dispatch, /local-brain-feed',
    evidence:['admin/content-engine-lane.js', 'cloudflare/worker.js'],
    value:'One article can create approval-gated content packages and local-brain chunks without external auto-posting.'
  },
  {
    from:'Valley Verified',
    to:'0S Worker',
    status:'wired-now',
    route:'/api/valley-verified/relay-leads and /api/valley/content-schedule',
    evidence:['worker.js valley relay and schedule tick'],
    value:'Public Valley leads and content calendar ticks can land in 0S storage/task queues.'
  },
  {
    from:'NorthStar / SignIn Pro',
    to:'0S',
    status:'partial',
    route:'/api/northstar/workspace-sync',
    evidence:['northstar/assets/workspace-client.js', 'northstar/MOUNTED_IN_0S.json'],
    value:'Workspace state sync exists, but more app lanes should standardize on workspace identity payloads.'
  },
  {
    from:'Relay13',
    to:'ConnectLog',
    status:'wired-now',
    route:'Relay13 admin inbox and bridge proof pages',
    evidence:['connectlog-v7.7-relay13-operator-proof/relay13-inbox.js', 'relay13-core-v1.7-connectlog-operator-proof'],
    value:'Messages can route into the operator inbox and proof surfaces; client app widgets need consistent tenant mapping.'
  },
  {
    from:'SkyeMediaCenter',
    to:'0S Worker',
    status:'wired-now',
    route:'/api/media/* boards and publish routes',
    evidence:['worker.js media route handler'],
    value:'Media assets can move through intake, review, execution, dispatch, publish, stats, and file-delivery states.'
  }
];

const gaps = [
  {
    area:'Shared workspace identity',
    severity:'high',
    detail:'Several apps use their own local workspace/session shape. Standardize orgId, workspaceId, clientId, actor, sourceApp, and proofReceipt fields across all app posts.'
  },
  {
    area:'Remote persistence for local-first Free99 apps',
    severity:'high',
    detail:'Many Free99 apps rely on localStorage/IndexedDB. They need a shared /api/0s/workspace-events or app-specific adapter before they can guarantee cross-device continuity.'
  },
  {
    area:'SkyeDocxMax suite bridges',
    severity:'medium',
    detail:'SkyeDocxMax can push locally to Blog/Drive/Mail, but those should be promoted to shared Worker endpoints once the exact product boundaries are chosen.'
  },
  {
    area:'Connector dispatch',
    severity:'medium',
    detail:'The content engine now produces approval packages and connector events. Real external posting remains gated until provider tokens, pricing, and owner approval are present.'
  },
  {
    area:'Client app tenant mapping',
    severity:'medium',
    detail:'Client apps, Valley profiles, Relay13 inboxes, and NorthStar workspaces need one canonical tenant map so lead capture, QR installs, and inbox messages always land in the right company workspace.'
  }
];

const recommendedBackbone = [
  'Use the 0S Worker as the cross-app event router, not each static app.',
  'Use SkyGate FS27 for identity and event evidence, with no secrets mirrored into public repo files.',
  'Use app-specific KV namespaces when cost/volume justifies it; SITE_EVENTS_KV is acceptable for low-volume proof and bridge receipts.',
  'Make every generated client/business artifact carry clientId, valleyBusinessId, workspaceId, sourceApp, and receiptId.',
  'Keep local-first apps functional offline, then sync to 0S when a gate session or admin token is present.',
  'Keep AI lanes package-gated and local-brain-first so external provider costs only happen when the paid add-on is active.'
];

const summary = {
  generatedAt,
  repoRoot,
  counts:{
    liveSurfaces:liveRegistry.surface_count || liveRegistry.surfaces?.length || 0,
    free99Apps:free99Manifest.apps?.length || 0,
    clientFactoryRecords:factoryIndex.records?.length || 0,
    contentEngineArticles:contentEngine.articles?.length || contentEngine.totalArticles || 0,
    marketplaceChunks:marketplaceSync.chunks?.length || 0,
    appApiMounts:appApiMounts.length,
    scannedCoreFiles:scannedFiles.length
  },
  appApiMounts,
  systems,
  integrations,
  gaps,
  recommendedBackbone,
  mountedLanes:{
    valleyVerified:{publicRoute:valleyMount.public_route || null, appBuildLane:valleyMount.app_build_lane || null, operatorWorkspaceRoutes:valleyMount.operator_workspace_routes || []},
    northstar:{mountedRoute:northstarMount.mounted_route || null, apiBase:northstarMount.api_base || null}
  },
  scannedFiles
};

function mdList(items, render) {
  return items.map(render).join('\n');
}

const markdown = `# 0S Interoperability Scan - ${date}

Generated: ${generatedAt}

## Counts

- Live registry surfaces: ${summary.counts.liveSurfaces}
- Free99 / paid app manifest entries: ${summary.counts.free99Apps}
- Client App Factory records: ${summary.counts.clientFactoryRecords}
- Content engine articles: ${summary.counts.contentEngineArticles}
- Worker API mounts detected: ${summary.counts.appApiMounts}
- Core files scanned: ${summary.counts.scannedCoreFiles}

## Wired Now

${mdList(integrations.filter(item => item.status === 'wired-now'), item => `- **${item.from} -> ${item.to}** via \`${item.route}\`: ${item.value}`)}

## Partial Or Local Bridges

${mdList(integrations.filter(item => item.status !== 'wired-now'), item => `- **${item.from} -> ${item.to}** (${item.status}) via \`${item.route}\`: ${item.value}`)}

## Main Gaps

${mdList(gaps, item => `- **${item.severity.toUpperCase()} - ${item.area}:** ${item.detail}`)}

## Recommended Backbone

${mdList(recommendedBackbone, item => `- ${item}`)}

## Content Engine Status

- Public/admin UI: \`metraiyux_0s_site/admin/content-engine-lane.html\`
- Canonical article map: \`metraiyux_0s_site/blog/content-engine.json\`
- Worker package endpoints: \`/api/admin/content-engine/activate\`, \`/api/admin/content-engine/runs\`, \`/api/admin/content-engine/dispatch\`, \`/api/admin/content-engine/local-brain-feed\`
- Dispatch rule: provider calls are blocked until operator approval plus configured provider connectors.

## SkyeDocxMax Persistence Status

- SovereignDocs session create/fetch/open/return endpoints are mounted under \`/api/sovereigndocs/editor/skye-docx-max/*\`.
- Returned editor packages now become \`returns\`, \`documents\`, and \`vault_records\` in SovereignDocs storage.
- The public vault UI can sync local bridge returns and API returns back into the local vault view.

## Core File Signals

${mdList(scannedFiles, file => `- \`${file.path}\`: ${file.apiRoutes} API route signals; storage ${Object.entries(file.storageSignals).filter(([, value]) => value).map(([key]) => key).join(', ') || 'none detected'}; bridges ${Object.entries(file.bridgeSignals).filter(([, value]) => value).map(([key]) => key).join(', ') || 'none detected'}.`)}
`;

mkdirSync(auditRoot, {recursive:true});
const jsonPath = path.join(auditRoot, `0S_INTEROPERABILITY_SCAN_${date}.json`);
const mdPath = path.join(auditRoot, `0S_INTEROPERABILITY_SCAN_${date}.md`);
writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(mdPath, markdown);
console.log(JSON.stringify({ok:true, jsonPath, mdPath, counts:summary.counts}, null, 2));
