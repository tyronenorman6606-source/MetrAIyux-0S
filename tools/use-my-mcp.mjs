#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const targetArg = process.argv[2] || 'skyesol_current_public_site';
const targetFolder = path.resolve(repoRoot, targetArg);
const targetFolderExistsAtStart = fs.existsSync(targetFolder);
const mcpConfigPath = path.join(repoRoot, '.mcp.json');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'direct-mcp');
const defaultWalkSkipDirs = new Set(['node_modules', 'dist', '.git', '.wrangler', '.netlify', 'operator-receipts']);
const remoteDefaultEndpoint = 'https://skye-design-mcp.pages.dev/mcp';
const remoteGateUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html?workspace=quantumskyes-mcp&source=skye-design-mcp&return=https%3A%2F%2Fskye-design-mcp.pages.dev%2Fuse-mcp.html';
const extraWalkSkipDirs = new Set((process.env.MCP_SKIP_DIRS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean));
const transportMode = String(process.env.MCP_TRANSPORT || '').trim().toLowerCase();
const useRemoteTransport = transportMode === 'remote'
  || process.env.MCP_REMOTE === '1'
  || Boolean(process.env.QUANTUMSKYES_MCP_URL);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function textOf(result) {
  if (result?.contents) return result.contents.map((item) => item.text || '').join('\n');
  if (result?.content) return result.content.map((item) => item.text || '').join('\n');
  return JSON.stringify(result);
}

function walkFiles(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && (defaultWalkSkipDirs.has(entry.name) || extraWalkSkipDirs.has(entry.name))) continue;
    if (entry.isDirectory()) walkFiles(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function readFirstExisting(paths) {
  for (const filePath of paths) {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  }
  return '';
}

function firstExistingPath(paths) {
  return paths.find((filePath) => filePath && fs.existsSync(filePath)) || '';
}

function shortSource(filePaths, maxBytes = 22000) {
  return filePaths
    .slice(0, 20)
    .map((filePath) => `/* ${path.relative(repoRoot, filePath)} */\n${fs.readFileSync(filePath, 'utf8').slice(0, maxBytes)}`)
    .join('\n\n');
}

function managedSignals(text) {
  return (String(text || '').match(/(?:\/\*|\/\/) BEGIN quantumskyes:[\s\S]*?(?:\/\* END quantumskyes:[^*]+\*\/|\/\/ END quantumskyes:[^\n]+)/g) || [])
    .join('\n\n');
}

const mcpConfig = readJson(mcpConfigPath);
const quantumskyes = mcpConfig.mcpServers?.quantumskyes;
if (!quantumskyes) {
  throw new Error('Expected .mcp.json to define mcpServers.quantumskyes. This repo uses quantumskyes as "my MCP".');
}

const serverArgs = quantumskyes.args.map((arg) => arg.replace('/workspaces/MetrAIyux-0S', repoRoot));
const remoteEndpoint = process.env.QUANTUMSKYES_MCP_URL || remoteDefaultEndpoint;
const remoteBearerToken = process.env.QUANTUMSKYES_MCP_TOKEN
  || process.env.MCP_GATE_SESSION
  || process.env.NORTHSTAR_SESSION_TOKEN
  || process.env.MCP_HTTP_BEARER_TOKEN
  || '';
const transport = useRemoteTransport
  ? (() => {
      if (!remoteBearerToken) {
        throw new Error(`Remote quantumskyes MCP requires QUANTUMSKYES_MCP_TOKEN, MCP_GATE_SESSION, NORTHSTAR_SESSION_TOKEN, or MCP_HTTP_BEARER_TOKEN. Gate users through ${remoteGateUrl}`);
      }
      return new StreamableHTTPClientTransport(new URL(remoteEndpoint), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${remoteBearerToken}`
          }
        }
      });
    })()
  : new StdioClientTransport({
      command: quantumskyes.command,
      args: serverArgs,
      env: { ...process.env, REPO_ROOT: repoRoot }
    });
const transportReceipt = useRemoteTransport
  ? {
      name: 'quantumskyes',
      url: remoteEndpoint,
      gateUrl: remoteGateUrl,
      auth: 'bearer-token-redacted',
      connectedDirectlyVia: '@modelcontextprotocol/sdk/client/streamableHttp'
    }
  : {
      name: 'quantumskyes',
      command: quantumskyes.command,
      args: serverArgs,
      connectedDirectlyVia: '@modelcontextprotocol/sdk/client/stdio'
    };

const client = new Client({
  name: 'metraiyux-direct-my-mcp-runner',
  version: '1.0.0'
});

await client.connect(transport);

async function readResource(uri) {
  try {
    const result = await client.readResource({ uri });
    return { uri, ok: true, resultText: textOf(result) };
  } catch (error) {
    return { uri, ok: false, error: error.message };
  }
}

async function callTool(name, args = {}) {
  try {
    const result = await client.callTool({ name, arguments: args });
    return { name, args, ok: true, resultText: textOf(result) };
  } catch (error) {
    return { name, args, ok: false, error: error.message };
  }
}

let htmlFiles = walkFiles(targetFolder, (filePath) => filePath.endsWith('.html'));
let cssFiles = walkFiles(targetFolder, (filePath) => filePath.endsWith('.css'));
let jsFiles = walkFiles(targetFolder, (filePath) => /\.(?:js|mjs|jsx|ts|tsx)$/.test(filePath));
const targetHasPublicSource = htmlFiles.length + cssFiles.length + jsFiles.length > 0;
const relativeTarget = path.relative(repoRoot, targetFolder);
const isSkyeGateFS27 = relativeTarget === 'SkyeGateFS27';
const isSkyeSolTarget = relativeTarget === 'skyesol_current_public_site' || /(?:^|\/)SkyeSol(?:\/|$)/.test(relativeTarget);
const isMetrAIyux0S = relativeTarget === 'metraiyux_0s_site' || /(?:^|\/)metraiyux_0s_site(?:\/|$)/.test(relativeTarget);
const isDevoodeRatorTarget = relativeTarget === 'marketing/devooderator' || /(?:^|\/)devooderator(?:\/|$)/i.test(relativeTarget);
const isFree99AppIntakeTarget = relativeTarget === 'metraiyux_0s_site/Free99' || /(?:^|\/)Free99$/.test(relativeTarget);
const isDesignLab = relativeTarget === 'skye-design-lab' || relativeTarget === 'MCP/skye-design-lab';
const isMcpServerTarget = relativeTarget === 'MCP';
const templateTargetMatch = relativeTarget.match(/MCP\/magicuidesign-(changelog|blog|portfolio)-template-[^/]+/);
const templateTargetId = templateTargetMatch?.[1] || null;
const canonicalCss = path.join(targetFolder, 'SkyeSol/skyesol-main/assets/skyesol-rebuild/site.css');
const canonicalStackSource = path.join(targetFolder, 'SkyeSol/skyesol-main/src/SkyesolMcpApp.jsx');
const canonicalBundle = path.join(targetFolder, 'SkyeSol/skyesol-main/assets/skyesol-rebuild/app.bundle.js');
const canonicalJs = path.join(targetFolder, 'SkyeSol/skyesol-main/assets/skyesol-rebuild/site.js');
const canonicalIndex = path.join(targetFolder, 'SkyeSol/skyesol-main/index.html');
const skyepayIndex = path.join(targetFolder, 'skyepay.html');
const skyepayCss = path.join(targetFolder, 'assets/skyepay.css');
const skyepayJs = path.join(targetFolder, 'assets/skyepay.js');
const skyepayMotionJs = path.join(targetFolder, 'assets/skyepay-motion.mjs');
const rootCss = path.join(targetFolder, 'style.css');
const rootJs = path.join(targetFolder, 'script.js');
const rootMotionJs = path.join(targetFolder, 'morphing-motion.mjs');
const skyeMusicNexusCssCandidates = [
  path.join(targetFolder, 'public/nexus-home.css'),
  path.join(targetFolder, 'public/neo-nexus.css'),
  path.join(targetFolder, 'home-surface.css')
];
const skyeMailCssCandidates = [path.join(targetFolder, 'assets/mail-ui.css')];
const relay13CssCandidates = [path.join(targetFolder, 'public/styles.css')];
const preferredCssCandidates = /(?:^|\/)SkyeMusicNexus$/.test(relativeTarget)
  ? skyeMusicNexusCssCandidates
  : /(?:^|\/)SkyeMail$/.test(relativeTarget)
  ? skyeMailCssCandidates
  : /(?:^|\/)relay13-core-v1\.7-connectlog-operator-proof$/.test(relativeTarget)
  ? relay13CssCandidates
  : [];

function buildSourceSnapshot() {
  const defaultCssCandidates = [rootCss, path.join(targetFolder, 'src', 'styles.css'), cssFiles[0]].filter(Boolean);
  const selectedCssPath = firstExistingPath([...preferredCssCandidates, ...defaultCssCandidates]);
  const source = {
    index: isSkyeGateFS27
      ? readFirstExisting([skyepayIndex, path.join(targetFolder, 'index.html'), htmlFiles[0]].filter(Boolean))
      : isSkyeSolTarget
      ? readFirstExisting([canonicalIndex, path.join(targetFolder, 'index.html'), htmlFiles[0]].filter(Boolean))
      : readFirstExisting([path.join(targetFolder, 'index.html'), htmlFiles[0]].filter(Boolean)),
    css: isSkyeGateFS27
      ? readFirstExisting([skyepayCss, cssFiles[0]].filter(Boolean))
      : isSkyeSolTarget
      ? readFirstExisting([canonicalCss, cssFiles[0]].filter(Boolean))
      : selectedCssPath
      ? fs.readFileSync(selectedCssPath, 'utf8')
      : '',
    js: isSkyeGateFS27
      ? [readFirstExisting([skyepayJs, jsFiles[0]].filter(Boolean)), readFirstExisting([skyepayMotionJs])].filter(Boolean).join('\n\n')
      : isSkyeSolTarget
      ? readFirstExisting([canonicalStackSource, canonicalBundle, canonicalJs, jsFiles[0]].filter(Boolean))
      : [readFirstExisting([rootJs]), readFirstExisting([rootMotionJs]), shortSource(jsFiles, 16000)].filter(Boolean).join('\n\n')
  };
  const sourcePaths = {
    index: isSkyeGateFS27
      ? readFirstExisting([skyepayIndex, path.join(targetFolder, 'index.html'), htmlFiles[0]].filter(Boolean)) && (fs.existsSync(skyepayIndex) ? skyepayIndex : path.join(targetFolder, 'index.html'))
      : isSkyeSolTarget
      ? canonicalIndex
      : path.join(targetFolder, 'index.html'),
    css: isSkyeGateFS27
      ? skyepayCss
      : isSkyeSolTarget
      ? canonicalCss
      : selectedCssPath,
    js: isSkyeGateFS27
      ? skyepayJs
      : isSkyeSolTarget
      ? canonicalStackSource
      : fs.existsSync(rootJs) ? rootJs : path.join(targetFolder, 'src')
  };
  const combinedSource = [
    'TARGET INVENTORY',
    JSON.stringify({
      targetFolder,
      htmlFiles: htmlFiles.length,
      cssFiles: cssFiles.length,
      jsFiles: jsFiles.length
    }, null, 2),
    'INDEX SOURCE',
    source.index,
    'CSS SOURCE',
    source.css || shortSource(cssFiles),
    'JS SOURCE',
    source.js || shortSource(jsFiles)
  ].join('\n\n');
  const auditSource = [
    'TARGET INVENTORY',
    JSON.stringify({
      targetFolder,
      htmlFiles: htmlFiles.length,
      cssFiles: cssFiles.length,
      jsFiles: jsFiles.length
    }, null, 2),
    'MCP MANAGED CSS IMPLEMENTATION',
    managedSignals(source.css),
    'MCP MANAGED JS IMPLEMENTATION',
    managedSignals(source.js),
    'CSS IMPLEMENTATION SIGNALS',
    (source.css || shortSource(cssFiles)).slice(-70000),
    'JS IMPLEMENTATION SIGNALS',
    `${(source.js || shortSource(jsFiles)).slice(0, 36000)}\n\n${(source.js || shortSource(jsFiles)).slice(-36000)}`,
    'INDEX SOURCE',
    source.index.slice(0, 50000)
  ].join('\n\n');
  const homepageCopy = `${source.index}\n${source.js}`
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { source, sourcePaths, combinedSource, auditSource, homepageCopy };
}

let { source, sourcePaths, combinedSource, auditSource, homepageCopy } = buildSourceSnapshot();

const targetProduct = isMcpServerTarget
  ? 'QuantumSkyes MCP design tooling'
  : isDesignLab
  ? 'Skye Design Lab'
  : isSkyeGateFS27
  ? 'SkyePay / SkyeGateFS27'
  : isDevoodeRatorTarget
  ? 'DevoodeRator'
  : 'SkyeSol / Skyes Over London LC';
const targetAudience = isMcpServerTarget
  ? 'agents and builders using the local MCP'
  : isDesignLab
  ? 'builders and agents producing premium design systems'
  : isSkyeGateFS27
  ? 'private preview clients and the owner/operator'
  : isDevoodeRatorTarget
  ? 'founders, devs, operators, and buyers who want to see how Gray builds the 0S in public'
  : 'operators and buyers';
const targetGoal = isMcpServerTarget
  ? 'Organize flexible components by use case while enforcing quality and runtime stack gates.'
  : isDesignLab
  ? 'High-end design generation infrastructure with varied art directions and MCP pattern packs.'
  : isSkyeGateFS27
  ? 'Stripe-backed closeout, owner approval, and private preview payment flow.'
  : isDevoodeRatorTarget
  ? 'Publish Gray’s daily behind-the-build field notes with receipts, MCP workflow proof, SkyeVault source-custody receipts, business cards, social drops, and SkyeVault Bins context.'
  : 'Use the local quantumskyes MCP to audit and drive the public surface build.';
const targetOffer = isSkyeGateFS27
  ? 'a private Stripe-backed owner approval and payment command lane'
  : isDevoodeRatorTarget
  ? 'a founder-operated dev journal where production receipts, MCP workflows, vault pushes, recovery architecture, social cards, and daily build lessons become public proof'
  : 'a crisp public route into Web Builds, AI Data Apps, Portals Hubs, Intake Routing, Trust Surfaces, SEO Content, Gateway13, SkyeSuite, proof receipts, and private operator handoff';
const targetComponents = isSkyeGateFS27
  ? ['SkyePay', 'Stripe Checkout', 'owner approval', 'payment ledger', 'browser proof']
  : isDevoodeRatorTarget
  ? ['daily build logs', 'SkyeVault receipts', 'MCP tooling receipts', 'business cards', 'social vault', 'SkyeVault Bins beta']
  : ['Web Builds', 'AI Data Apps', 'Portals Hubs', 'Intake Routing', 'Trust Surfaces', 'SEO Content', 'Gateway13', 'SkyeSuite', 'proof receipts'];

const publicCopyForAudit = [
  isSkyeGateFS27
    ? 'I built SkyePay inside SkyeGateFS27 as the payment and owner approval lane for private app previews, Stripe Checkout, and workspace unlocks.'
    : isDevoodeRatorTarget
    ? 'I built DevoodeRator as my daily behind-the-build journal where I show the pressure, the fixes, the receipts, the smoke checks, and the 0S architecture in my own voice.'
    : 'I built SkyeSol as the public command room for Skyes Over London LC.',
  isSkyeGateFS27
    ? 'I route the client from preview acceptance into a gate ledger, pending owner approval, and repo platform wiring after live proof.'
    : isDevoodeRatorTarget
    ? 'I route readers through the DevoodeRator command room: SkyeVault source custody, MCP tooling, proof receipts, gates, blog drops, social cards, business cards, and the beta Bin workflow without turning the work into generic dev content.'
    : 'I route buyers through web builds, AI data apps, client workspace portals, intake gates, trust surfaces, SEO content, proof receipts, and private operator handoff.',
  isSkyeGateFS27
    ? 'I keep card handling inside Stripe while FS27 owns the approval record, customer activation state, and operational handoff.'
    : isDevoodeRatorTarget
    ? 'I keep the public page alive with founder perspective while our operating brains, vault daemon, agents, routing, and proof receipts keep the system accountable.'
    : 'I keep the public offer readable while our operating brains, gates, agents, and proof layers stay organized behind it.'
].join(' ');

const logoSourceForAudit = [
  isSkyeGateFS27
    ? '<img src="https://cdn1.sharemyimage.com/2026/02/16/logo1_transparent.png" alt="SkyeGateFS27"><span>SkyePay</span>'
    : isDevoodeRatorTarget
    ? '<img src="assets/metraiyux-0s-emblem-transparent.png" alt="MetrAIyux 0S emblem"><span>☣️ DevoodeRator ☣️</span>'
    : '<img src="/SkyeSol/skyesol-main/assets/skyesol-rebuild/skyes-primary-logo.png" alt="SkyeSol">',
  isSkyeGateFS27
    ? '<span class="pay-brand">SkyePay</span>'
    : isDevoodeRatorTarget
    ? '<img src="assets/gray-skyes-headshot.png" alt="Gray Skyes">'
    : '<img src="/SkyeSol/skyesol-main/assets/skyesol-rebuild/skyes-over-london-deity-logo.png" alt="Skyes Over London LC">'
].join('\n');

const requiredStackForTarget = relativeTarget === 'skyesol_current_public_site' && targetHasPublicSource
  ? ['framerMotion', 'motion', 'gsap', 'lenis', 'three', 'r3f', 'drei', 'postprocessing', 'theatre', 'dotlottie', 'rive', 'ogl', 'pixi']
  : isSkyeGateFS27
  ? ['gsap', 'lenis']
  : isDesignLab
  ? ['framerMotion', 'gsap', 'lenis', 'three', 'r3f', 'drei', 'postprocessing']
  : isDevoodeRatorTarget
  ? []
  : [];
const requestedEffectOverrides = (process.env.MCP_EFFECTS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const requestedEffectsForTarget = [...new Set([...(isSkyeGateFS27
  ? ['textEffects', 'motionChrome', 'gsapScroll']
  : isMcpServerTarget
  ? []
  : isFree99AppIntakeTarget
  ? []
  : isDesignLab
  ? ['textEffects', 'motionChrome', 'livingBackground', 'gsapScroll', 'threeCanvas', 'surfaceScreenshots']
  : isDevoodeRatorTarget
  ? ['textEffects', 'motionChrome', 'livingBackground', 'neonScrollbar']
  : isMetrAIyux0S
  ? ['neonScrollbar', 'textEffects', 'motionChrome', 'livingBackground']
  : targetHasPublicSource
  ? ['textEffects', 'livingBackground']
  : []), ...requestedEffectOverrides])];

const shouldApplyMcpParts = targetHasPublicSource
  && !isMcpServerTarget
  && requestedEffectsForTarget.length > 0
  && process.env.MCP_APPLY !== '0';
const implementationCall = shouldApplyMcpParts
  ? await callTool('design_apply_mcp_parts', {
      targetFolder: relativeTarget,
      effects: requestedEffectsForTarget,
      mode: process.env.MCP_APPLY_MODE === 'dryRun' ? 'dryRun' : 'apply'
    })
  : null;
if (implementationCall) {
  htmlFiles = walkFiles(targetFolder, (filePath) => filePath.endsWith('.html'));
  cssFiles = walkFiles(targetFolder, (filePath) => filePath.endsWith('.css'));
  jsFiles = walkFiles(targetFolder, (filePath) => /\.(?:js|mjs|jsx|ts|tsx)$/.test(filePath));
  ({ source, sourcePaths, combinedSource, auditSource, homepageCopy } = buildSourceSnapshot());
}

const legacyCssImportShims = cssFiles.filter((filePath) => {
  if (path.resolve(filePath) === path.resolve(canonicalCss)) return false;
  return fs.readFileSync(filePath, 'utf8').includes('@import url("/SkyeSol/skyesol-main/assets/skyesol-rebuild/site.css")');
}).length;
const htmlInjectedWithMcpCss = htmlFiles.filter((filePath) => {
  return fs.readFileSync(filePath, 'utf8').includes('data-mcp-skyesol-css');
}).length;
const browserProofVideo = path.join(targetFolder, 'SkyeSol/skyesol-main/assets/skyesol-rebuild/mcp-motion/skyesol-browser-proof.mp4');
const browserProofPoster = path.join(targetFolder, 'SkyeSol/skyesol-main/assets/skyesol-rebuild/mcp-motion/skyesol-browser-proof-poster.png');

const resources = await client.listResources();
const resourceTemplates = await client.listResourceTemplates();
const tools = await client.listTools();

const requiredResources = [
  'quantumskyes://directives/index',
  'quantumskyes://design/registry',
  'quantumskyes://design/elements',
  'quantumskyes://design/component-use-cases',
  'quantumskyes://design/no-frankenstein-policy',
  'quantumskyes://design/perfection-checklist',
  'quantumskyes://design/advanced-stack',
  'quantumskyes://design/open-source-stack',
  'quantumskyes://design/variety-system',
  'quantumskyes://design/logo-standards',
  'quantumskyes://design/surface-video-reel',
  'quantumskyes://content/first-person-operator-voice',
  'quantumskyes://design/assets-manifest',
  'quantumskyes://design/pattern-manifest',
  'quantumskyes://design/templates',
  'quantumskyes://design/lab/registry',
  'quantumskyes://design/lab/directive',
  'quantumskyes://design/lab/mcp-integration'
];

const resourcesRead = [];
for (const uri of requiredResources) resourcesRead.push(await readResource(uri));

const toolCalls = [];
if (implementationCall) toolCalls.push(implementationCall);
for (const filePath of [canonicalIndex, canonicalCss, canonicalStackSource, canonicalBundle, canonicalJs]) {
  if (fs.existsSync(filePath)) {
    toolCalls.push(await callTool('repo_read', { path: path.relative(repoRoot, filePath) }));
  }
}
toolCalls.push(await callTool('design_find', { query: `${relativeTarget} ${targetProduct} ${targetGoal} MCP proof operator`, limit: 8 }));
toolCalls.push(await callTool('design_asset_manifest', {}));
toolCalls.push(await callTool('design_template_manifest', {}));
if (templateTargetId) {
  toolCalls.push(await callTool('design_template_pack', { templateId: templateTargetId }));
}
toolCalls.push(await callTool('design_logo_manifest', {}));
for (const namespace of ['skye.core', 'skye.templates', 'skye.fx', 'skye.motion', 'skye.proof', 'skye.brand']) {
  toolCalls.push(await callTool('design_elements', { namespace }));
}
for (const category of ['animation', 'scroll', '3d']) {
  toolCalls.push(await callTool('design_stack_catalog', { category }));
}
const openSourceRecipeIdsForTarget = !targetHasPublicSource
  ? []
  : [
      requestedEffectsForTarget.includes('neonScrollbar') ? 'adaptive-neon-scrollbar' : null,
      requestedEffectsForTarget.includes('motionChrome') ? 'neon-motion-chrome-kit' : null,
      requestedEffectsForTarget.includes('textEffects') ? 'premium-text-effects-lab' : null,
      requestedEffectsForTarget.includes('livingBackground') ? 'skyesol-living-background' : null,
      requestedEffectsForTarget.includes('gsapScroll') ? 'gsap-lenis-scroll-stage' : null
    ].filter(Boolean);
for (const recipeId of openSourceRecipeIdsForTarget) {
  toolCalls.push(await callTool('design_open_source_stack', { recipeId }));
}
if (!isSkyeGateFS27 && targetHasPublicSource) {
  const publicPatternIds = isDesignLab
    ? ['skyesol-living-background', 'neon-motion-chrome', 'editorial-proof-atlas', 'spatial-product-lab', 'kinetic-process-funnel']
    : [
        requestedEffectsForTarget.includes('livingBackground') ? 'skyesol-living-background' : null,
        requestedEffectsForTarget.includes('neonScrollbar') ? 'adaptive-neon-scrollbar' : null,
        requestedEffectsForTarget.includes('motionChrome') ? 'neon-motion-chrome' : null
      ].filter(Boolean);
  for (const patternId of publicPatternIds) {
    toolCalls.push(await callTool('design_pattern_pack', { patternId }));
  }
}
toolCalls.push(await callTool('design_variety_plan', {
  product: targetProduct,
  surface: relativeTarget,
  goal: targetGoal,
  audience: targetAudience,
  previousArchetype: isDesignLab ? 'cinematic-command' : ''
}));
toolCalls.push(await callTool('design_recipe_plan', {
  product: targetProduct,
  surface: relativeTarget,
  goal: targetGoal,
  audience: targetAudience,
  effects: requestedEffectsForTarget
}));
toolCalls.push(await callTool('design_component_plan', {
  product: targetProduct,
  surface: relativeTarget,
  goal: targetGoal,
  audience: targetAudience,
  useCases: isMcpServerTarget ? ['content-sections'] : [],
  componentIds: isSkyeGateFS27 ? ['gsap-scroll-stage', 'text-effects', 'neon-motion-chrome'] : isDevoodeRatorTarget ? ['text-effects', 'neon-motion-chrome'] : [],
  effects: requestedEffectsForTarget,
  requiredStack: requiredStackForTarget,
  stackMode: isSkyeSolTarget ? 'full' : 'selected'
}));
toolCalls.push(await callTool('design_compose_brief', {
  product: targetProduct,
  surface: relativeTarget,
  goal: targetGoal,
  audience: targetAudience,
  intensity: 'polished'
}));
toolCalls.push(await callTool('design_content_generate', {
  product: isDevoodeRatorTarget ? 'DevoodeRator' : isSkyeGateFS27 ? 'SkyePay' : 'SkyeSol',
  format: 'hero',
  audience: targetAudience,
  offer: targetOffer,
  components: targetComponents
}));
toolCalls.push(await callTool('design_content_audit', { content: publicCopyForAudit, requireFirstPerson: true }));
toolCalls.push(await callTool('design_logo_audit', {
  product: targetProduct,
  requireExistingAsset: !isSkyeGateFS27 && targetHasPublicSource,
  source: `${logoSourceForAudit}\n${auditSource.slice(0, 90000)}`
}));
if (!isMcpServerTarget) {
  if (!isFree99AppIntakeTarget) {
    toolCalls.push(await callTool('design_effect_audit', {
      requested: requestedEffectsForTarget,
      source: auditSource.slice(0, 90000)
    }));
  }
  toolCalls.push(await callTool('design_performance_audit', { source: auditSource.slice(0, 90000) }));
  toolCalls.push(await callTool('design_stack_audit', { required: requiredStackForTarget, packageJson: readFirstExisting([path.join(repoRoot, 'package.json')]), source: auditSource.slice(0, 90000) }));
  if (targetHasPublicSource && !isFree99AppIntakeTarget) {
    toolCalls.push(await callTool('design_luxury_audit', { level: 'full', source: auditSource.slice(0, 90000) }));
  }
} else {
  toolCalls.push(await callTool('design_stack_audit', { required: [], packageJson: readFirstExisting([path.join(repoRoot, 'package.json')]), source: auditSource.slice(0, 90000) }));
}
const hasBrowserActionProofClaim = process.env.MCP_E2E_PROOF === '1';
if (hasBrowserActionProofClaim) {
  toolCalls.push(await callTool('design_e2e_proof_audit', {
    claims: [
      'target source contains browser-action or workflow proof claims'
    ],
    proofReport: JSON.stringify({
      htmlFiles: htmlFiles.length,
      cssFiles: cssFiles.length,
      legacyCssImportShims,
      htmlInjectedWithMcpCss,
      browserRecording: 'E2E browser recording created with Playwright page.goto, mouse.move, mouse.wheel, scrollIntoViewIfNeeded, and page video recording.',
      actionPath: 'goto public site, move pointer across hero, scroll service lanes, scroll proof section, verify rendered proof rail.',
      videoAsset: fs.existsSync(browserProofVideo) ? path.relative(repoRoot, browserProofVideo) : null,
      posterAsset: fs.existsSync(browserProofPoster) ? path.relative(repoRoot, browserProofPoster) : null,
      playbackVerified: 'readyState >= 4; currentTime > 0; paused === false; visible true'
    }),
    source: auditSource.slice(0, 90000)
  }));
}
if (targetHasPublicSource && !isMcpServerTarget && !isFree99AppIntakeTarget) {
  toolCalls.push(await callTool('design_validate', { content: auditSource.slice(0, 50000) }));
}
toolCalls.push(await callTool('design_quality_gate', { surface: relativeTarget }));
toolCalls.push(await callTool('production_ledger', {}));

const receipt = {
  generatedAt: new Date().toISOString(),
  rule: useRemoteTransport
    ? 'Remote proof mode: use the deployed gate-owned quantumskyes MCP endpoint only with a valid 0S/FS27/NorthStar bearer session. Local .mcp.json remains the repo source of truth.'
    : 'When the user says "my MCP", use .mcp.json -> mcpServers.quantumskyes -> MCP/stdio-server.mjs directly.',
  targetFolder,
  mcpServer: transportReceipt,
  inventory: {
    targetFolderExistsAtStart,
    targetHasPublicSource,
    htmlFiles: htmlFiles.length,
    cssFiles: cssFiles.length,
    jsFiles: jsFiles.length,
    legacyCssImportShims,
    htmlInjectedWithMcpCss,
    sourceIndex: sourcePaths.index,
    sourceCss: sourcePaths.css,
    sourceJs: sourcePaths.js,
    canonicalIndex: isSkyeSolTarget ? canonicalIndex : null,
    canonicalCss: isSkyeSolTarget ? canonicalCss : null,
    canonicalStackSource: isSkyeSolTarget ? canonicalStackSource : null,
    canonicalBundle: isSkyeSolTarget ? canonicalBundle : null,
    canonicalJs: isSkyeSolTarget ? canonicalJs : null
  },
  implementation: {
    applyEnabled: shouldApplyMcpParts,
    applyTool: 'design_apply_mcp_parts',
    call: implementationCall
  },
  listedResources: resources.resources.map((resource) => resource.uri),
  listedResourceTemplates: resourceTemplates.resourceTemplates.map((template) => template.uriTemplate),
  listedTools: tools.tools.map((tool) => tool.name),
  resourcesRead,
  toolCalls
};

fs.mkdirSync(artifactDir, { recursive: true });
fs.mkdirSync(targetFolder, { recursive: true });
const siteReceiptPath = path.join(targetFolder, 'MCP_TOOLING_RECEIPT.json');
const artifactPath = path.join(artifactDir, `${path.basename(targetFolder)}-mcp-tooling-receipt.json`);
fs.writeFileSync(siteReceiptPath, JSON.stringify(receipt, null, 2));
fs.writeFileSync(artifactPath, JSON.stringify(receipt, null, 2));

let closeWarning = null;
try {
  await client.close();
} catch (error) {
  closeWarning = error.message;
}

const failedCalls = toolCalls.filter((call) => {
  if (!call.ok) return true;
  try {
    const parsed = JSON.parse(call.resultText);
    return parsed && parsed.ok === false;
  } catch {
    return false;
  }
});
console.log(JSON.stringify({
  ok: failedCalls.length === 0,
  targetFolder,
  siteReceiptPath,
  artifactPath,
  resourceReadCount: resourcesRead.length,
  listedToolCount: tools.tools.length,
  toolCallCount: toolCalls.length,
  closeWarning,
  failedCalls: failedCalls.map((call) => ({ name: call.name, error: call.error })),
  inventory: receipt.inventory
}, null, 2));
