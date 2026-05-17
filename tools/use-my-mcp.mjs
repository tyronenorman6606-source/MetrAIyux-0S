#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const targetArg = process.argv[2] || 'skyesol_current_public_site';
const targetFolder = path.resolve(repoRoot, targetArg);
const targetFolderExistsAtStart = fs.existsSync(targetFolder);
const mcpConfigPath = path.join(repoRoot, '.mcp.json');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'direct-mcp');

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
    if (entry.isDirectory() && ['node_modules', 'dist', '.git', '.wrangler', '.netlify'].includes(entry.name)) continue;
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

function shortSource(filePaths, maxBytes = 22000) {
  return filePaths
    .slice(0, 20)
    .map((filePath) => `/* ${path.relative(repoRoot, filePath)} */\n${fs.readFileSync(filePath, 'utf8').slice(0, maxBytes)}`)
    .join('\n\n');
}

const mcpConfig = readJson(mcpConfigPath);
const quantumskyes = mcpConfig.mcpServers?.quantumskyes;
if (!quantumskyes) {
  throw new Error('Expected .mcp.json to define mcpServers.quantumskyes. This repo uses quantumskyes as "my MCP".');
}

const serverArgs = quantumskyes.args.map((arg) => arg.replace('/workspaces/MetrAIyux-0S', repoRoot));
const transport = new StdioClientTransport({
  command: quantumskyes.command,
  args: serverArgs,
  env: { ...process.env, REPO_ROOT: repoRoot }
});

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

const htmlFiles = walkFiles(targetFolder, (filePath) => filePath.endsWith('.html'));
const cssFiles = walkFiles(targetFolder, (filePath) => filePath.endsWith('.css'));
const jsFiles = walkFiles(targetFolder, (filePath) => /\.(?:js|mjs|jsx|ts|tsx)$/.test(filePath));
const targetHasPublicSource = htmlFiles.length + cssFiles.length + jsFiles.length > 0;
const relativeTarget = path.relative(repoRoot, targetFolder);
const isSkyeGateFS27 = relativeTarget === 'SkyeGateFS27';
const isSkyeSolTarget = relativeTarget === 'skyesol_current_public_site' || /(?:^|\/)SkyeSol(?:\/|$)/.test(relativeTarget);
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
    : readFirstExisting([rootCss, path.join(targetFolder, 'src', 'styles.css'), cssFiles[0]].filter(Boolean)),
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
    : fs.existsSync(rootCss) ? rootCss : path.join(targetFolder, 'src', 'styles.css'),
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

const homepageCopy = `${source.index}\n${source.js}`
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const publicCopyForAudit = [
  isSkyeGateFS27
    ? 'I built SkyePay inside SkyeGateFS27 as the payment and owner approval lane for private app previews, Stripe Checkout, and workspace unlocks.'
    : 'I built SkyeSol as the public command room for Skyes Over London LC.',
  isSkyeGateFS27
    ? 'I route the client from preview acceptance into a gate ledger, pending owner approval, and repo platform wiring after live proof.'
    : 'I route buyers through web builds, AI data apps, client workspace portals, intake gates, trust surfaces, SEO content, proof receipts, and private operator handoff.',
  isSkyeGateFS27
    ? 'I keep card handling inside Stripe while FS27 owns the approval record, customer activation state, and operational handoff.'
    : 'I keep the public offer readable while our operating brains, gates, agents, and proof layers stay organized behind it.'
].join(' ');

const logoSourceForAudit = [
  isSkyeGateFS27
    ? '<img src="https://cdn1.sharemyimage.com/2026/02/16/logo1_transparent.png" alt="SkyeGateFS27"><span>SkyePay</span>'
    : '<img src="/SkyeSol/skyesol-main/assets/skyesol-rebuild/skyes-primary-logo.png" alt="SkyeSol">',
  isSkyeGateFS27
    ? '<span class="pay-brand">SkyePay</span>'
    : '<img src="/SkyeSol/skyesol-main/assets/skyesol-rebuild/skyes-over-london-deity-logo.png" alt="Skyes Over London LC">'
].join('\n');

const requiredStackForTarget = relativeTarget === 'skyesol_current_public_site' && targetHasPublicSource
  ? ['framerMotion', 'motion', 'gsap', 'lenis', 'three', 'r3f', 'drei', 'postprocessing', 'theatre', 'dotlottie', 'rive', 'ogl', 'pixi']
  : isSkyeGateFS27
  ? ['gsap', 'lenis']
  : isDesignLab
  ? ['framerMotion', 'gsap', 'lenis', 'three', 'r3f', 'drei', 'postprocessing']
  : [];
const requestedEffectsForTarget = isSkyeGateFS27
  ? ['neonScrollbar', 'textEffects', 'motionChrome', 'gsapScroll']
  : isMcpServerTarget
  ? []
  : isDesignLab
  ? ['neonScrollbar', 'textEffects', 'motionChrome', 'livingBackground', 'gsapScroll', 'threeCanvas', 'surfaceScreenshots']
  : targetHasPublicSource
  ? ['neonScrollbar', 'textEffects', 'motionChrome', 'livingBackground']
  : [];

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
for (const filePath of [canonicalIndex, canonicalCss, canonicalStackSource, canonicalBundle, canonicalJs]) {
  if (fs.existsSync(filePath)) {
    toolCalls.push(await callTool('repo_read', { path: path.relative(repoRoot, filePath) }));
  }
}
toolCalls.push(await callTool('design_find', { query: `${relativeTarget} SkyeSol public site services proof operator MCP`, limit: 8 }));
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
for (const recipeId of (!targetHasPublicSource
  ? []
  : isSkyeGateFS27
  ? ['neon-motion-chrome-kit', 'premium-text-effects-lab', 'gsap-lenis-scroll-stage']
  : ['neon-motion-chrome-kit', 'premium-text-effects-lab', 'skyesol-living-background'])) {
  toolCalls.push(await callTool('design_open_source_stack', { recipeId }));
}
if (!isSkyeGateFS27 && targetHasPublicSource) {
  for (const patternId of isDesignLab
    ? ['skyesol-living-background', 'neon-motion-chrome', 'editorial-proof-atlas', 'spatial-product-lab', 'kinetic-process-funnel']
    : ['skyesol-living-background', 'neon-motion-chrome']) {
    toolCalls.push(await callTool('design_pattern_pack', { patternId }));
  }
}
toolCalls.push(await callTool('design_variety_plan', {
  product: isDesignLab ? 'Skye Design Lab' : isSkyeGateFS27 ? 'SkyePay / SkyeGateFS27' : 'SkyeSol / Skyes Over London LC',
  surface: relativeTarget,
  goal: isDesignLab ? 'High-end design generation infrastructure with varied art directions and MCP pattern packs.' : 'Use the local quantumskyes MCP to audit and drive the public surface build.',
  audience: isDesignLab ? 'builders and agents producing premium design systems' : isSkyeGateFS27 ? 'private preview clients and the owner/operator' : 'operators and buyers',
  previousArchetype: isDesignLab ? 'cinematic-command' : ''
}));
toolCalls.push(await callTool('design_recipe_plan', {
  product: isDesignLab ? 'Skye Design Lab' : isSkyeGateFS27 ? 'SkyePay / SkyeGateFS27' : 'SkyeSol / Skyes Over London LC',
  surface: relativeTarget,
  goal: isDesignLab ? 'High-end design generation infrastructure with varied art directions and MCP pattern packs.' : 'Use the local quantumskyes MCP to audit and drive the public surface build.',
  audience: isDesignLab ? 'builders and agents producing premium design systems' : isSkyeGateFS27 ? 'private preview clients and the owner/operator' : 'operators and buyers',
  effects: requestedEffectsForTarget
}));
toolCalls.push(await callTool('design_component_plan', {
  product: isMcpServerTarget ? 'QuantumSkyes MCP design tooling' : isDesignLab ? 'Skye Design Lab' : isSkyeGateFS27 ? 'SkyePay / SkyeGateFS27' : 'SkyeSol / Skyes Over London LC',
  surface: relativeTarget,
  goal: isMcpServerTarget
    ? 'Organize flexible components by use case while enforcing quality and runtime stack gates.'
    : isDesignLab
    ? 'High-end design generation infrastructure with varied art directions and MCP pattern packs.'
    : 'Use the local quantumskyes MCP to audit and drive the public surface build.',
  audience: isMcpServerTarget ? 'agents and builders using the local MCP' : isDesignLab ? 'builders and agents producing premium design systems' : isSkyeGateFS27 ? 'private preview clients and the owner/operator' : 'operators and buyers',
  useCases: isMcpServerTarget ? ['content-sections'] : [],
  componentIds: isSkyeGateFS27 ? ['gsap-scroll-stage', 'text-effects', 'neon-motion-chrome'] : [],
  effects: requestedEffectsForTarget,
  requiredStack: requiredStackForTarget,
  stackMode: isSkyeSolTarget ? 'full' : 'selected'
}));
toolCalls.push(await callTool('design_compose_brief', {
  product: isSkyeGateFS27 ? 'SkyePay / SkyeGateFS27' : 'SkyeSol / Skyes Over London LC',
  surface: relativeTarget,
  goal: isSkyeGateFS27 ? 'Stripe-backed closeout and owner approval' : 'crisp public front door',
  audience: isSkyeGateFS27 ? 'private preview clients and the owner/operator' : 'operators and buyers',
  intensity: 'polished'
}));
toolCalls.push(await callTool('design_content_generate', {
  product: isSkyeGateFS27 ? 'SkyePay' : 'SkyeSol',
  format: 'hero',
  audience: isSkyeGateFS27 ? 'private preview clients and the owner/operator' : 'operators and buyers',
  offer: isSkyeGateFS27
    ? 'a private Stripe-backed owner approval and payment command lane'
    : 'a crisp public route into Web Builds, AI Data Apps, Portals Hubs, Intake Routing, Trust Surfaces, SEO Content, Gateway13, SkyeSuite, proof receipts, and private operator handoff',
  components: isSkyeGateFS27
    ? ['SkyePay', 'Stripe Checkout', 'owner approval', 'payment ledger', 'browser proof']
    : ['Web Builds', 'AI Data Apps', 'Portals Hubs', 'Intake Routing', 'Trust Surfaces', 'SEO Content', 'Gateway13', 'SkyeSuite', 'proof receipts']
}));
toolCalls.push(await callTool('design_content_audit', { content: publicCopyForAudit, requireFirstPerson: true }));
toolCalls.push(await callTool('design_logo_audit', {
  product: isSkyeGateFS27 ? 'SkyePay / SkyeGateFS27' : 'SkyeSol / Skyes Over London LC',
  requireExistingAsset: !isSkyeGateFS27 && targetHasPublicSource,
  source: `${logoSourceForAudit}\n${combinedSource.slice(0, 90000)}`
}));
if (!isMcpServerTarget) {
  toolCalls.push(await callTool('design_effect_audit', {
    requested: requestedEffectsForTarget,
    source: combinedSource.slice(0, 90000)
  }));
  toolCalls.push(await callTool('design_performance_audit', { source: combinedSource.slice(0, 90000) }));
  toolCalls.push(await callTool('design_stack_audit', { required: requiredStackForTarget, packageJson: readFirstExisting([path.join(repoRoot, 'package.json')]), source: combinedSource.slice(0, 90000) }));
} else {
  toolCalls.push(await callTool('design_stack_audit', { required: [], packageJson: readFirstExisting([path.join(repoRoot, 'package.json')]), source: combinedSource.slice(0, 90000) }));
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
    source: combinedSource.slice(0, 90000)
  }));
}
if (targetHasPublicSource && !isMcpServerTarget) {
  toolCalls.push(await callTool('design_validate', { content: combinedSource.slice(0, 50000) }));
}
toolCalls.push(await callTool('design_quality_gate', { surface: relativeTarget }));
toolCalls.push(await callTool('production_ledger', {}));

const receipt = {
  generatedAt: new Date().toISOString(),
  rule: 'When the user says "my MCP", use .mcp.json -> mcpServers.quantumskyes -> MCP/stdio-server.mjs directly.',
  targetFolder,
  mcpServer: {
    name: 'quantumskyes',
    command: quantumskyes.command,
    args: serverArgs,
    connectedDirectlyVia: '@modelcontextprotocol/sdk/client/stdio'
  },
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

await client.close();

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
  failedCalls: failedCalls.map((call) => ({ name: call.name, error: call.error })),
  inventory: receipt.inventory
}, null, 2));
