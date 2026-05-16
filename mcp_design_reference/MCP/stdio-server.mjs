#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = __dirname;
const parent = path.dirname(mcpRoot);
const repoRoot = process.env.REPO_ROOT
  ? path.resolve(process.env.REPO_ROOT)
  : path.basename(parent) === 'mcp_design_reference'
    ? path.resolve(mcpRoot, '..', '..')
    : path.resolve(mcpRoot, '..');

const designRoot = path.join(mcpRoot, 'design');
const referenceRoot = path.join(repoRoot, 'skyesol_spectacle_reference');
const labRoot = path.join(repoRoot, 'skye-design-lab');

const textExtensions = new Set(['.md', '.json', '.txt', '.css', '.html', '.js', '.mjs', '.ts', '.tsx']);
const forbiddenPublicTerms = [
  'mcp smoke proof',
  'smoke proof not found',
  'open across 0 checks',
  'artifact not found during build',
  'schema bootstrap',
  'worker debug',
  'internal script',
  'database smoke output'
];
const advancedStackImports = {
  framerMotion: [/from\s+['"]framer-motion['"]/],
  three: [/from\s+['"]three['"]/, /import\s+\*\s+as\s+THREE\s+from\s+['"]three['"]/],
  gsap: [/from\s+['"]gsap['"]/, /from\s+['"]gsap\/ScrollTrigger['"]/, /gsap\.registerPlugin/],
  lenis: [/from\s+['"]lenis['"]/, /new\s+Lenis\s*\(/],
  motion: [/from\s+['"]motion\/react['"]/, /from\s+['"]motion['"]/, /from\s+['"]framer-motion['"]/],
  r3f: [/from\s+['"]@react-three\/fiber['"]/],
  drei: [/from\s+['"]@react-three\/drei['"]/],
  postprocessing: [/from\s+['"]@react-three\/postprocessing['"]/]
};
const genericTemplateSignals = [
  /dark\s+saas/i,
  /starter\s+ops[\s\S]{0,500}business\s+command[\s\S]{0,500}white-glove/i,
  /proof-backed\s+postgres\s+access/i,
  /app owners see the command path before they buy/i,
  /display:grid;grid-template-columns:minmax\(0,1fr\)\s+auto/i,
  /card grid/i,
  /generic landing/i,
  /generic\s+(?:landing|page)\s+template/i,
  /card\s+template/i
];
const effectSignals = {
  cursorTrail: [/cursor-trail/, /pointermove/, /useMotionValue/, /useSpring/],
  neonScrollbar: [/::-webkit-scrollbar/, /scrollbar-color/, /scrollbar-thumb/, /scrollbar-track/],
  textEffects: [/text-shadow/, /background-clip:\s*text/, /glow-text/, /neon-text/, /split[-_\s]?text/, /text-scan/],
  surfaceScreenshots: [/<img[\s\S]+src=/, /<video[\s\S]+src=|<source[\s\S]+src=/, /\.(?:png|jpg|jpeg|webp|avif|mp4|webm)['")]/, /screenshot/i, /surface-frame/, /surface-reel/, /proof capture/i, /recordVideo/i, /page\.(?:click|fill|goto|mouse|keyboard|locator)/i],
  theatre: [/from\s+['"]@theatre\/core['"]/, /getProject\s*\(/, /sheet\.object/, /@theatre\/studio/],
  gsapScroll: [/ScrollTrigger/, /gsap\.registerPlugin/, /scrub\s*:/, /pin\s*:/],
  threeCanvas: [/<Canvas\b/, /from\s+['"]@react-three\/fiber['"]/, /useFrame\s*\(/, /new\s+THREE\./]
};
const proofActionSignals = [
  /\bapp\s+(?:does|routes|opens|validates|authenticates|scores|filters|searches|submits|uploads|downloads|deploys|restores|monitors|records|creates|updates|deletes)\b/i,
  /\b(?:route|routes|routing|login|log in|sign up|signup|authenticate|auth|checkout|purchase|submit|filter|search|score|validate|upload|download|restore|backup|deploy|monitor|approve|gate|open|create|update|delete|handoff)\b/i
];
const e2eProofSignals = {
  video: [/<video\b/i, /<source[^>]+src=["'][^"']+\.(?:mp4|webm)["']/i, /\.(?:mp4|webm)\b/i],
  browserRecording: [/recordVideo/i, /\bE2E browser recording\b/i, /\bbrowser recording\b/i, /\bPlaywright\b/i, /page\.(?:click|fill|goto|mouse|keyboard|locator|screenshot|waitForSelector)/i],
  actionPath: [/\b(?:click|fill|type|scroll|wheel|route|login|submit|filter|search|score|validate|open|gate|approve|restore|backup|deploy|monitor|handoff)\b/i, /page\.(?:click|fill|goto|mouse|keyboard|locator)/i],
  playbackVerified: [/readyState\s*(?:>=?|={2,3})\s*[2-4]/i, /currentTime\s*>\s*0/i, /paused\s*(?:={2,3}|is)\s*false/i, /\bvisible\b/i],
  poster: [/<video\b[^>]*\bposter\s*=/i],
  autoplayOrControls: [/<video\b[^>]*\bautoplay\b/i, /<video\b[^>]*\bcontrols\b/i],
  mutedInline: [/<video\b[^>]*\bmuted\b/i, /<video\b[^>]*\bplaysinline\b/i],
  staticImage: [/<img\b[^>]+src=["'][^"']+\.(?:png|jpg|jpeg|webp|avif)["']/i]
};
const firstPersonSignals = [
  /\bI\s+(?:built|build|use|route|show|keep|give|turn|separate|protect|open|created|designed)\b/i,
  /\bmy\s+(?:system|command|proof|platform|gate|route|work|build)\b/i,
  /\bwe\s+(?:built|build|use|route|show|keep|give|turn|separate|protect|open|run|operate|created|designed)\b/i,
  /\bour\s+(?:brains|agents|AEs|networks|systems|gates|proof|platform|command|workspaces|operators|routes|stack|company|team)\b/i
];
const genericAgencyVoiceSignals = [
  /\bwe\s+(?:help|provide|offer)\b[\s\S]{0,90}\b(?:solutions|services|businesses|brands|companies|clients)\b/i,
  /\bour\s+(?:solutions|services|experts|agency)\b/i,
  /\b(?:best-in-class|seamless|cutting-edge|innovative solutions|tailored solutions|streamline your business)\b/i
];
const performanceNumberPatterns = {
  lenisLerp: /lerp\s*:\s*([0-9]*\.?[0-9]+)/g,
  dpr: /dpr\s*=\s*(?:\{\s*)?(?:\[?\s*1\s*,\s*)?([0-9]*\.?[0-9]+)/g,
  particleCount: /\b(?:count|particleCount|instanceCount|pointsCount)\b\s*(?:=|:)\s*(?:\{\s*)?([0-9]{4,})/gi
};
const effectToRecipes = {
  cursorTrail: ['framer-motion-interaction-system', 'neon-scrollbar-cursor-trail'],
  neonScrollbar: ['neon-scrollbar-cursor-trail'],
  textEffects: ['premium-text-effects-lab'],
  surfaceScreenshots: ['actual-surface-screenshot-stage', 'actual-surface-video-reel'],
  theatre: ['theatre-directed-scene'],
  gsapScroll: ['gsap-lenis-scroll-stage'],
  threeCanvas: ['three-r3f-shader-scene', 'drei-postprocessing-cinema']
};
const effectToStack = {
  cursorTrail: ['framerMotion'],
  neonScrollbar: [],
  textEffects: ['framerMotion'],
  surfaceScreenshots: [],
  theatre: ['theatre'],
  gsapScroll: ['gsap', 'lenis'],
  threeCanvas: ['three', 'r3f']
};

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return fallback;
  }
}

function safeJoin(root, requestedPath) {
  const normalized = String(requestedPath || '').replace(/^\/+/, '');
  const resolved = path.resolve(root, normalized);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path escapes allowed root: ${requestedPath}`);
  }
  return resolved;
}

function readText(filePath, maxBytes = 250_000) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error(`Not a file: ${filePath}`);
  if (stat.size > maxBytes) throw new Error(`File is too large for MCP read: ${stat.size} bytes`);
  return fs.readFileSync(filePath, 'utf8');
}

function textResource(uri, text, mimeType = 'text/markdown') {
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType,
        text
      }
    ]
  };
}

function readIfExists(filePath, fallback = '') {
  return fs.existsSync(filePath) ? readText(filePath) : fallback;
}

function walkFiles(root, options = {}) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const maxFiles = options.maxFiles || 300;
  const stack = [root];
  while (stack.length && out.length < maxFiles) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      if (entry.isFile() && textExtensions.has(path.extname(entry.name))) out.push(full);
    }
  }
  return out;
}

function walkAssetFiles(root, options = {}) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const maxFiles = options.maxFiles || 500;
  const stack = [root];
  while (stack.length && out.length < maxFiles) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      if (entry.isFile()) out.push(full);
      if (out.length >= maxFiles) break;
    }
  }
  return out;
}

function designFilePath(requestedPath) {
  const raw = String(requestedPath || '').replace(/^\/+/, '');
  if (raw.startsWith('reference/')) return safeJoin(referenceRoot, raw.slice('reference/'.length));
  if (raw.startsWith('lab/')) return safeJoin(labRoot, raw.slice('lab/'.length));
  return safeJoin(designRoot, raw);
}

function designIndex() {
  const registry = JSON.parse(readIfExists(path.join(designRoot, 'registry', 'skye-spectacle-registry.json'), '{}'));
  const elements = readJson(path.join(designRoot, 'registry', 'skye-elements-registry.json'), {});
  const styleNotes = readIfExists(path.join(referenceRoot, 'notes', 'spectacle-style-system.md'), 'Reference style notes not found.');
  return `# Skye Design MCP Index

This MCP is design-only. It exposes rules, patterns, reference notes, and QA tools.

## Primary Resources

- quantumskyes://design/registry
- quantumskyes://design/elements
- quantumskyes://design/no-frankenstein-policy
- quantumskyes://design/perfection-checklist
- quantumskyes://design/advanced-stack
- quantumskyes://design/open-source-stack
- quantumskyes://design/logo-standards
- quantumskyes://design/surface-video-reel
- quantumskyes://content/first-person-operator-voice
- quantumskyes://design/assets-manifest
- quantumskyes://design/pattern-manifest
- quantumskyes://directives/index
- quantumskyes://design/user-guide
- quantumskyes://design/builder-guide
- quantumskyes://design/reference/style-system

## Forbidden Public Copy

${forbiddenPublicTerms.map((term) => `- ${term}`).join('\n')}

## Pattern Count

${Array.isArray(registry.patterns) ? registry.patterns.length : 0}

## Element Count

${Array.isArray(elements.elements) ? elements.elements.length : 0}

## Reference Summary

${styleNotes.split('\n').slice(0, 34).join('\n')}
`;
}

function assetManifest() {
  const roots = [
    ['skyesol.reference', path.join(referenceRoot, 'assets')],
    ['skye-design-lab', path.join(labRoot, 'public', 'assets')],
    ['metraiyux.brand', path.join(repoRoot, 'metraiyux_0s_site', 'assets')],
    ['legal-skyes.brand', path.join(repoRoot, 'legalskyes-website', 'assets')],
    ['skyevault.brand', path.join(repoRoot, 'SkyeVault-Drop', 'public', 'assets')]
  ];
  const assets = [];
  for (const [namespace, root] of roots) {
    if (!fs.existsSync(root)) continue;
    for (const filePath of walkAssetFiles(root, { maxFiles: 500 })) {
      const ext = path.extname(filePath).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif'].includes(ext)) continue;
      const name = path.basename(filePath);
      const stat = fs.statSync(filePath);
      assets.push({
        namespace,
        name,
        path: path.relative(repoRoot, filePath),
        bytes: stat.size,
        role: /logo|mark|emblem|icon/i.test(name) ? 'logo-or-mark' : 'visual-asset',
        useRule: name.includes('founder')
          ? 'Founder/operator authority scene only.'
          : /logo|mark|emblem|icon/i.test(name)
            ? 'Use as the real brand identity asset. Prefer transparent/floating placement; do not replace with generated initials.'
            : 'Use only when it clarifies the product or story.'
      });
    }
  }
  return { generatedAt: new Date().toISOString(), assets };
}

function logoManifest() {
  const assets = assetManifest().assets
    .filter((asset) => asset.role === 'logo-or-mark')
    .sort((a, b) => a.path.localeCompare(b.path));
  return {
    generatedAt: new Date().toISOString(),
    rule: 'Use existing logo/mark/emblem assets before generating a new logo. Never replace these with rounded-square initial badges.',
    assets,
    preferredUse: [
      'Transparent/floating PNG/WebP/SVG in navigation when available.',
      'Large poster/logo assets only when the first viewport has enough room.',
      'Parent brand mark as endorsement for sub-brands that do not yet have their own logo.',
      'Clean wordmark instead of generated icon when no approved asset exists.'
    ],
    reject: [
      'Text-only initials inside a rounded gradient square.',
      'CSS-generated brand badges pretending to be finished logos.',
      'Random shield/cube/spark/circuit marks disconnected from the brand system.',
      'Swapping out a real logo asset for a generic generated mark.'
    ]
  };
}

function logoAudit({ source = '', product = '', requireExistingAsset = false } = {}) {
  const text = String(source || '');
  const lower = text.toLowerCase();
  const assets = logoManifest().assets;
  const productNeedle = String(product || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const relevantAssets = productNeedle
    ? assets.filter((asset) => asset.name.toLowerCase().replace(/[^a-z0-9]+/g, '').includes(productNeedle)
      || asset.path.toLowerCase().replace(/[^a-z0-9]+/g, '').includes(productNeedle))
    : assets;
  const hasLogoImage = /<img\b[^>]+src\s*=\s*["'][^"']*(?:logo|mark|emblem|icon)[^"']*["']/i.test(text)
    || /background(?:-image)?\s*:\s*url\(["']?[^"')]*(?:logo|mark|emblem|icon)[^"')]*["']?\)/i.test(text);
  const hasInlineInitialBadge = /<span\b[^>]*(?:brand|logo)[\w\s"'=-]*(?:mark|badge|tile|initial|icon|text)[\w\s"'=-]*>\s*[A-Z0-9&]{1,6}\s*<\/span>/i.test(text);
  const generatedLogoClassPattern = /\b(?:brand|logo)[\w-]*(?:[-_](?:mark|badge|tile|icon|initial|text)\b|(?:Mark|Badge|Tile|Icon|Initial|Text)\b)/;
  const generatedLogoCssPattern = /\.(?:brand|logo)[\w-]*(?:[-_](?:mark|badge|tile|icon|initial|text)\b|(?:Mark|Badge|Tile|Icon|Initial|Text)\b)[\w-]*\s*\{/;
  const hasGeneratedMarkClass = generatedLogoClassPattern.test(text);
  const generatedCssBlocks = [...text.matchAll(new RegExp(`${generatedLogoCssPattern.source}[\\s\\S]{0,620}?\\}`, 'g'))].map((match) => match[0]);
  const hasGeneratedBadgeCss = generatedCssBlocks.some((block) => /linear-gradient|radial-gradient|border-radius|box-shadow/i.test(block));
  const hasHardLogoContainer = generatedCssBlocks.some((block) => /border-radius\s*:\s*(?:999px|[1-9]\dpx|[2-9]rem|50%)/i.test(block));
  const mentionsLogo = /\blogo|brand mark|wordmark|emblem\b/i.test(text);
  const issues = [];

  if ((requireExistingAsset || relevantAssets.length > 0) && mentionsLogo && !hasLogoImage) {
    issues.push('Existing logo assets are available, but the source does not use an image/logo asset.');
  }
  if (hasInlineInitialBadge) issues.push('Text-only initial badge detected. Use an approved logo asset or clean wordmark instead.');
  if (hasGeneratedBadgeCss && !hasLogoImage) issues.push('CSS-generated logo badge detected without a real logo asset.');
  if (hasHardLogoContainer && !hasLogoImage) issues.push('Hard rounded logo container detected. Existing workspace marks should float transparent when possible.');
  if (hasGeneratedMarkClass && !hasLogoImage && relevantAssets.length > 0) issues.push('Generated brand/logo mark class appears where an existing asset should be used.');

  return {
    ok: issues.length === 0,
    product,
    issues,
    detected: {
      relevantAssetCount: relevantAssets.length,
      hasLogoImage,
      hasInlineInitialBadge,
      hasGeneratedMarkClass,
      hasGeneratedBadgeCss,
      hasHardLogoContainer
    },
    relevantAssets: relevantAssets.slice(0, 30),
    rule: 'Logos must come from approved assets or deliberate wordmark design, not generic rounded initial badges.'
  };
}

function elementsFiltered({ type, namespace, tier } = {}) {
  const registry = readJson(path.join(designRoot, 'registry', 'skye-elements-registry.json'), { elements: [] });
  let elements = Array.isArray(registry.elements) ? registry.elements : [];
  if (type) elements = elements.filter((element) => element.type === type);
  if (tier) elements = elements.filter((element) => element.tier === tier);
  if (namespace) elements = elements.filter((element) => element.id.startsWith(`${namespace}.`));
  return {
    policy: registry.compositionPolicy,
    namespaces: registry.namespaces,
    elements
  };
}

function patternManifest() {
  return readJson(path.join(designRoot, 'patterns', 'pattern-manifest.json'), { patterns: [] });
}

function patternPack(patternId) {
  const manifest = patternManifest();
  const pattern = (manifest.patterns || []).find((item) => item.id === patternId);
  if (!pattern) {
    return {
      ok: false,
      error: `Unknown pattern: ${patternId}`,
      available: (manifest.patterns || []).map((item) => item.id)
    };
  }

  const files = {};
  for (const relativePath of pattern.files || []) {
    const filePath = safeJoin(path.join(designRoot, 'patterns'), relativePath);
    files[relativePath] = readText(filePath, 500_000);
  }

  return {
    ok: true,
    pattern,
    dependencies: manifest.dependencies,
    files,
    implementationRule: 'Use these files as the implementation baseline. Modify product copy/assets, but preserve the composition and quality gates.'
  };
}

function stackAudit({ source = '', packageJson = '', required = [] } = {}) {
  const combined = `${source}\n${packageJson}`;
  const lowerPackage = String(packageJson || '').toLowerCase();
  const detected = {};
  for (const [name, patterns] of Object.entries(advancedStackImports)) {
    detected[name] = {
      imported: patterns.some((pattern) => pattern.test(combined)),
      dependency: lowerPackage.includes(`"${name}"`) || (name === 'framerMotion' && lowerPackage.includes('"framer-motion"')) || (name === 'r3f' && lowerPackage.includes('"@react-three/fiber"')) || (name === 'drei' && lowerPackage.includes('"@react-three/drei"')) || (name === 'postprocessing' && lowerPackage.includes('"@react-three/postprocessing"'))
    };
  }
  const missing = required.filter((name) => !detected[name]?.imported);
  const unusedDependencies = Object.entries(detected)
    .filter(([, value]) => value.dependency && !value.imported)
    .map(([name]) => name);
  return {
    ok: missing.length === 0,
    required,
    detected,
    missingImports: missing,
    unusedDependencies,
    rule: 'Advanced design claims must be backed by real imports and visible runtime use, not package installs or prose.'
  };
}

function effectAudit({ source = '', requested = [] } = {}) {
  const text = String(source || '');
  const detected = {};
  for (const [name, patterns] of Object.entries(effectSignals)) {
    detected[name] = patterns.some((pattern) => pattern.test(text));
  }
  const missing = requested.filter((name) => !detected[name]);
  const issues = [];
  if ((requested || []).includes('neonScrollbar')) {
    const widthMatches = [...text.matchAll(/::-webkit-scrollbar\s*\{[\s\S]{0,120}?(?:width|height)\s*:\s*(\d+)px/gi)].map((match) => Number(match[1]));
    const hasWideScrollbar = widthMatches.some((value) => value >= 14);
    const hasVisibleTrack = /::-webkit-scrollbar-track[\s\S]{0,260}(?:rgba\([^)]+0\.[4-9][^)]+\)|box-shadow|linear-gradient|border)/i.test(text);
    const hasNeonThumb = /::-webkit-scrollbar-thumb[\s\S]{0,360}(?:box-shadow|linear-gradient|radial-gradient|cyan|gold|violet|neon|#(?:64d9ff|27f2ff|f8cb5e|f4c75b|a88cff|8a63ff))/i.test(text);
  const scrollbarBlocks = text.match(/::-webkit-scrollbar(?:-[\w-]+)?\s*\{[^}]*\}/gi) || [];
  const hidesScrollbar = /scrollbar-width\s*:\s*none/i.test(text)
    || scrollbarBlocks.some((block) => /display\s*:\s*none|opacity\s*:\s*0(?:[;\s}]|\.0)/i.test(block));
    if (!hasWideScrollbar) issues.push('Neon scrollbar must be visibly present: use a 14px+ scrollbar width/height, not a thin hidden default.');
    if (!hasVisibleTrack) issues.push('Neon scrollbar track must stay slightly opaque/visible with border, gradient, or inset glow.');
    if (!hasNeonThumb) issues.push('Neon scrollbar thumb must include visible neon highlight: gradient, glow, or bright brand color.');
    if (hidesScrollbar) issues.push('Scrollbar must not be hidden or fully transparent.');
  }
  return {
    ok: missing.length === 0 && issues.length === 0,
    requested,
    detected,
    missingEffects: missing,
    issues,
    rule: 'Requested visual/interactivity effects must be visible in source and browser screenshots, not merely named in copy.'
  };
}

function e2eProofAudit({ source = '', proofReport = '', claims = [] } = {}) {
  const sourceText = String(source || '');
  const reportText = String(proofReport || '');
  const claimList = (claims || []).map((claim) => String(claim || '').trim()).filter(Boolean);
  const claimText = claimList.join('\n');
  const combined = `${sourceText}\n${reportText}\n${claimText}`;
  const detected = {
    actionClaim: claimList.length > 0 || proofActionSignals.some((pattern) => pattern.test(combined)),
    video: e2eProofSignals.video.some((pattern) => pattern.test(combined)),
    browserRecording: e2eProofSignals.browserRecording.some((pattern) => pattern.test(combined)),
    actionPath: e2eProofSignals.actionPath.some((pattern) => pattern.test(combined)),
    playbackVerified: e2eProofSignals.playbackVerified.every((pattern) => pattern.test(combined)),
    poster: e2eProofSignals.poster.some((pattern) => pattern.test(sourceText)),
    autoplayOrControls: e2eProofSignals.autoplayOrControls.some((pattern) => pattern.test(sourceText)),
    mutedInline: e2eProofSignals.mutedInline.every((pattern) => pattern.test(sourceText)),
    staticImage: e2eProofSignals.staticImage.some((pattern) => pattern.test(sourceText))
  };
  const issues = [];

  if (detected.actionClaim && !detected.video) {
    issues.push('Action proof needs a real MP4/WebM rendered as video. A static screenshot cannot prove the app did the claimed workflow.');
  }
  if (detected.actionClaim && !detected.browserRecording) {
    issues.push('Action proof needs an E2E browser recording or Playwright proof report that names the recording/action capture path.');
  }
  if (detected.actionClaim && !detected.actionPath) {
    issues.push('Action proof must include the actual browser action path: goto, click, fill, scroll/wheel, submit, route, restore, login, or the equivalent claimed action.');
  }
  if (detected.actionClaim && !detected.playbackVerified) {
    issues.push('Browser proof must verify video playback: readyState, currentTime > 0, paused === false, and visible in viewport.');
  }
  if (detected.video && !detected.poster) {
    issues.push('Video proof needs a poster image so the surface still proves itself before playback starts.');
  }
  if (detected.video && !detected.autoplayOrControls) {
    issues.push('Video proof needs autoplay for ambient proof or controls for user-driven proof.');
  }
  if (detected.video && /autoplay/i.test(sourceText) && !detected.mutedInline) {
    issues.push('Autoplay proof video must include muted and playsinline for reliable desktop/mobile playback.');
  }
  if (detected.actionClaim && detected.staticImage && !detected.video) {
    issues.push('Static image-only proof is rejected for app behavior claims. Record the browser doing the workflow.');
  }

  return {
    ok: issues.length === 0,
    claims: claimList,
    detected,
    issues,
    rule: 'When copy says the app does XYZ, proof must show the browser doing XYZ through an E2E recording, rendered as video, then verified in browser playback.'
  };
}

function contentAudit({ content = '', requireFirstPerson = true } = {}) {
  const text = String(content || '');
  const issues = [];
  const detected = {
    firstPersonOperator: firstPersonSignals.some((pattern) => pattern.test(text)),
    genericAgencyVoice: genericAgencyVoiceSignals.some((pattern) => pattern.test(text)),
    hasConcreteSystemTerms: /\b(?:command room|control room|front door|client workspace|founder command|SkyeGateFS27|proof receipts?|operating brains?|gates?|workspaces?|routing|D1 proof|protected room)\b/i.test(text),
    hasUnsafeInternalTerms: forbiddenPublicTerms.some((term) => text.toLowerCase().includes(term))
  };

  if (requireFirstPerson && !detected.firstPersonOperator) issues.push('Content must be written from first-person builder/operator POV: I built, I use, I route, I show, I keep, we route, our brains.');
  if (detected.genericAgencyVoice) issues.push('Generic agency/platform voice detected. Use first-person operator/company voice instead: I built, we route, our brains, our gates, our network.');
  if (!detected.hasConcreteSystemTerms) issues.push('Content needs concrete system nouns: command room, client workspace, SkyeGateFS27, proof receipts, gates, operating brains, routing.');
  if (detected.hasUnsafeInternalTerms) issues.push('Content contains forbidden internal/proof/debug language that must stay out of public copy.');

  return {
    ok: issues.length === 0,
    issues,
    detected,
    rule: 'Public content should feel immersive and first-person: Gray speaks as the operator, with occasional we/our for the company machine, brains, agents, networks, and gates.'
  };
}

function contentComponentLabel(component) {
  const value = String(component || '').trim();
  if (!value) return value;
  if (/^(?:a|an|the|my|sixteen|16|eight|8|proof|SkyeGate|D1|0meg4kAI)\b/i.test(value)) return value;
  if (/^(?:public|client|founder|command|control|front|workspace|gate|dashboard|deck|room)\b/i.test(value)) return `a ${value}`;
  return value;
}

function contentGenerate({ product = 'the system', audience = 'serious operators', offer = 'a business command layer', components = [], format = 'hero' } = {}) {
  const namedComponents = (components.length
    ? components
    : ['public front door', 'client workspace', 'founder command deck', 'SkyeGateFS27 access', 'proof receipts', 'operating brains']).map(contentComponentLabel);
  const componentPhrase = namedComponents.length > 1
    ? `${namedComponents.slice(0, -1).join(', ')}, and ${namedComponents[namedComponents.length - 1]}`
    : namedComponents[0];
  const formats = {
    hero: [
      `I do not sell websites. I build control rooms for the business behind them.`,
      `I built ${product} to give ${audience} ${componentPhrase} that can route the work after someone says yes. ⚡`
    ],
    section: [
      `I built this for the part of the business that usually gets hidden behind the homepage.`,
      `The public side explains the offer. Our protected side routes the pressure through ${componentPhrase}, so the operation knows what to do next.`
    ],
    cta: [
      `Open the route, inspect the proof, and decide whether ${product} belongs inside your operation.`
    ],
    proof: [
      `I do not publish private setup to prove control.`,
      `I show the public-safe receipts: ${componentPhrase}. Our protected rooms stay protected.`
    ],
    pitch: [
      `I built ${product} because ${audience} do not need another brochure. They need ${offer}.`,
      `That means ${componentPhrase}, wired into our route from first click to proof-backed handoff. ✨`
    ]
  };

  const selected = formats[format] || formats.hero;
  return {
    ok: true,
    format,
    product,
    audience,
    offer,
    components: namedComponents,
    copy: selected.join('\n'),
    voice: 'first-person operator/company POV',
    audit: contentAudit({ content: selected.join('\n'), requireFirstPerson: true })
  };
}

function numericMatches(pattern, text) {
  const values = [];
  for (const match of text.matchAll(pattern)) {
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

function performanceAudit({ source = '' } = {}) {
  const text = String(source || '');
  const lower = text.toLowerCase();
  const issues = [];
  const lenisLerps = numericMatches(performanceNumberPatterns.lenisLerp, text);
  const dprs = numericMatches(performanceNumberPatterns.dpr, text);
  const particleCounts = numericMatches(performanceNumberPatterns.particleCount, text);
  const imageTags = text.match(/<img\b[^>]*>/gi) || [];
  const proofImageTags = imageTags.filter((tag) => /product-shots|screenshot|surface|proof-shot|hero-proof|proof-window|surface-frame|app-preview/i.test(tag));
  const optimizedProofImageCount = proofImageTags.filter((tag) => {
    const isPriority = /fetchpriority\s*=\s*["']high["']|loading\s*=\s*["']eager["']/i.test(tag);
    const isLazyDecoded = /loading\s*=\s*["']lazy["']/i.test(tag) && /decoding\s*=\s*["']async["']/i.test(tag);
    return isPriority || isLazyDecoded;
  }).length;
  const hasCanvas = /<Canvas\b|@react-three\/fiber|new\s+THREE\./.test(text);
  const hasLenis = /new\s+Lenis\s*\(|from\s+['"]lenis['"]/.test(text);
  const hasResponsivePerf = /isCompact|innerWidth|matchMedia|max-width|pointer:\s*coarse|prefers-reduced-motion|useReducedMotion/.test(text);
  const hasReducedMotion = /prefers-reduced-motion|useReducedMotion|reducedMotion/.test(text);
  const hasCursorTrail = /cursor-trail|pointermove|useMotionValue|useSpring/.test(text);
  const hasHeavyFixedOverlay = /position\s*:\s*fixed[\s\S]{0,220}(?:repeating-linear-gradient|mix-blend-mode|filter\s*:|backdrop-filter\s*:)/i.test(text);

  if (hasLenis && lenisLerps.length === 0) issues.push('Lenis is used without an explicit lerp; set a responsive lerp so scrolling does not feel lazy.');
  for (const lerp of lenisLerps) {
    if (lerp < 0.12) issues.push(`Lenis lerp ${lerp} is too low for this MCP; use 0.14 or higher for a crisp premium page.`);
  }
  for (const dpr of dprs) {
    if (dpr > 1.5) issues.push(`Canvas DPR ${dpr} is too high for a default generated page; cap WebGL DPR at 1.5 or lower.`);
  }
  for (const count of particleCounts) {
    if (count > 1200) issues.push(`Particle/instance count ${count} is too high; cap default particle counts near 1000 and lower them on mobile.`);
  }
  if (hasCanvas && !hasResponsivePerf) issues.push('Three/R3F canvas is present without responsive DPR, particle, pointer-coarse, or reduced-motion performance guards.');
  if (proofImageTags.length && optimizedProofImageCount !== proofImageTags.length) issues.push('Below-fold/app screenshot images must use loading="lazy" and decoding="async"; first-viewport hero proof may use fetchpriority="high" or loading="eager".');
  if ((hasCanvas || hasCursorTrail || lower.includes('gsap') || lower.includes('scrolltrigger')) && !hasReducedMotion) issues.push('Advanced motion needs a prefers-reduced-motion or useReducedMotion fallback.');
  if (hasHeavyFixedOverlay && !/pointer:\s*coarse|max-width:\s*960|max-width:\s*768|prefers-reduced-motion/.test(text)) issues.push('Heavy fixed overlays need mobile/coarse-pointer fallbacks so scrolling stays crisp.');

  return {
    ok: issues.length === 0,
    issues,
    detected: {
      hasLenis,
      lenisLerps,
      hasCanvas,
      dprs,
      particleCounts,
      imageTags: imageTags.length,
      proofImageTags: proofImageTags.length,
      optimizedProofImages: optimizedProofImageCount,
      hasResponsivePerf,
      hasReducedMotion,
      hasCursorTrail,
      hasHeavyFixedOverlay
    },
    rule: 'Premium motion must feel immediate: capped WebGL, capped particles, explicit Lenis tuning, lazy decoded screenshots, and reduced-motion/mobile fallbacks.'
  };
}

function inferRequestedEffects(text) {
  const lower = String(text || '').toLowerCase();
  const effects = [];
  if (/cursor[-\s]?trail|pointer[-\s]?trail|usemotionvalue|usespring/.test(lower)) effects.push('cursorTrail');
  if (/scrollbar|scroll bar|thicker scroll|neon thumb/.test(lower)) effects.push('neonScrollbar');
  if (/text effect|glow text|glowing text|neon text|shimmer|split text|typography effect/.test(lower)) effects.push('textEffects');
  if (/screenshot|actual surface|browser proof|app surface|product surface/.test(lower)) effects.push('surfaceScreenshots');
  if (/@theatre|theatre\/core|theatre\/studio|getproject\s*\(|sheet\.object/.test(lower)) effects.push('theatre');
  if (/gsap|lenis|scrolltrigger|pinned|scrub|scroll funnel|scroll stage/.test(lower)) effects.push('gsapScroll');
  if (/three\.js|react three fiber|@react-three|from\s+['"]three['"]|webgl|r3f|shader scene|3d canvas|webgl canvas/.test(lower)) effects.push('threeCanvas');
  return [...new Set(effects)];
}

function recipePlan({ product = 'the product', surface = 'public page', goal = 'premium design', effects = [], audience = 'buyers and users' } = {}) {
  const inferredEffects = inferRequestedEffects(`${product} ${surface} ${goal} ${audience}`);
  const requestedEffects = [...new Set([...(effects || []), ...inferredEffects])];
  const recipeIds = [...new Set(requestedEffects.flatMap((effect) => effectToRecipes[effect] || []))];
  const stack = [...new Set(requestedEffects.flatMap((effect) => effectToStack[effect] || []))];
  const catalog = openSourceRecipes();
  const selectedRecipes = recipeIds
    .map((recipeId) => (catalog.recipes || []).find((recipe) => recipe.id === recipeId))
    .filter(Boolean);

  return {
    product,
    surface,
    goal,
    audience,
    requestedEffects,
    requiredOpenSourceRecipes: recipeIds,
    requiredStack: stack,
    selectedRecipes,
    implementationOrder: [
      'Pick one dominant visual subject before styling.',
      'Call design_logo_manifest before drawing or replacing any logo.',
      'Wire the open-source recipes in source code.',
      'Capture real app/browser screenshots when surfaceScreenshots is requested.',
      'When the copy says the app does XYZ, record the browser doing XYZ with Playwright before calling it proof.',
      'Encode an actual MP4/WebM browser-action reel for live proof; screenshot reels are secondary fallback proof.',
      'Run design_stack_audit for required imports.',
      'Run design_logo_audit when a logo/wordmark/brand mark exists in source.',
      'Run design_effect_audit for requested effects.',
      'Run design_e2e_proof_audit for action claims, product workflows, signup/auth, dashboards, restores, routing, and proof surfaces.',
      'Run design_performance_audit for scroll/WebGL/image/motion responsiveness.',
      'Run desktop/mobile browser screenshots and fix visible failures.'
    ],
    failIfMissing: [
      'No source import/runtime proof for requested libraries.',
      'No visible source signal for requested effects.',
      'Generated initial logo badge when an existing logo asset or clean wordmark should be used.',
      'Static screenshot proof for app behavior claims.',
      'CSS-only animated screenshot claims when Playwright/ffmpeg can generate a real browser-action video reel.',
      'Lazy scroll, high DPR, high particles, eager screenshots, or missing reduced-motion/mobile fallbacks.',
      'No browser screenshot proof.',
      'SkyeSol-only restyling without recipe-driven implementation.'
    ]
  };
}

function composeBrief({ product = 'the product', surface = 'public page', goal = 'premium conversion', audience = 'buyers and developers', intensity = 'cinematic but usable' }) {
  const text = `${product} ${surface} ${goal} ${audience}`;
  const isInfrastructure = /infrastructure|ai|database|mcp|server|control|postgres|auth|gateway|skyegate/i.test(text);
  const isApp = /app|dashboard|tool|editor|operator|portal/i.test(text);
  const primaryPattern = isInfrastructure
    ? 'cinematic-command-hero'
    : isApp
      ? 'app-first-command-center'
      : 'cinematic-command-hero';
  const implementationPatterns = isInfrastructure
    ? ['cinematic-command-hero', 'scroll-proof-funnel']
    : isApp
      ? ['app-first-command-center', 'scroll-proof-funnel']
      : ['cinematic-command-hero'];
  const requiredStack = isInfrastructure
    ? ['framerMotion', 'three', 'r3f', 'drei', 'postprocessing', 'gsap', 'lenis']
    : isApp
      ? ['framerMotion', 'gsap', 'lenis']
      : ['framerMotion'];
  const plan = recipePlan({ product, surface, goal, audience });
  const mergedRequiredStack = [...new Set([...requiredStack, ...plan.requiredStack.filter((item) => item !== 'theatre')])];
  const supporting = [
    'skye.motion.reveal-system',
    'skye.proof.operator-proof-panel',
    'skye.proof.quality-gates'
  ];
  if (isInfrastructure) supporting.splice(1, 0, 'skye.webgl.living-command-field');
  supporting.push('skye.fx.text-effects', 'skye.fx.neon-scrollbar', 'skye.fx.cursor-trail', 'client.surface.actual-screenshot-stage', 'client.surface.actual-video-reel', 'skye.brand.existing-logo-system');
  return {
    product,
    surface,
    goal,
    audience,
    intensity,
    primaryPattern,
    implementationPatterns,
    requiredStack: mergedRequiredStack,
    mustUsePatternPackTool: true,
    mustUseRecipePlanTool: true,
    advancedStackEnforcement: 'Call design_pattern_pack for every implementation pattern, wire the returned files/concepts into source code, then call design_stack_audit with source and package.json.',
    openSourceRecipeRule: 'Call design_open_source_stack and pick recipes by library/behavior before applying any brand styling.',
    openSourceRecipes: [...new Set([...(isInfrastructure
      ? ['framer-motion-interaction-system', 'three-r3f-shader-scene', 'drei-postprocessing-cinema', 'gsap-lenis-scroll-stage', 'actual-surface-screenshot-stage', 'neon-scrollbar-cursor-trail', 'premium-text-effects-lab']
      : isApp
        ? ['framer-motion-interaction-system', 'gsap-lenis-scroll-stage', 'actual-surface-screenshot-stage', 'neon-scrollbar-cursor-trail']
        : ['framer-motion-interaction-system', 'premium-text-effects-lab']), ...plan.requiredOpenSourceRecipes])],
    requestedEffects: plan.requestedEffects,
    noveltyRules: [
      'Do not reuse the previous dark command-card page shape.',
      'Choose a distinct first viewport composition before coding: vault, orbital scene, proof tunnel, founder authority, or product object.',
      'The primary visual subject must be browser-visible in the first viewport.',
      'A page fails if it could be mistaken for a generic SaaS template after changing the logo.',
      'Use actual product/app screenshots when the surface itself matters more than illustration.',
      'When proof copy claims a workflow, record the actual browser performing that workflow and render the MP4/WebM proof.',
      'Use premium text effects with restraint: glow, shimmer, reveal, split-line, or chromatic edge only where it raises the composition.',
      'Use a visible branded scrollbar treatment when the experience is scroll-led.',
      'Use approved logo assets first; reject rounded-square initial badges unless the user explicitly approved that as the logo.',
      'Use first-person operator copy for founder-built products: I built, I route, I show, I keep.',
      'Use cursor trails or pointer-reactive accents only when they improve the premium feel and do not block usability.'
    ],
    supportingElements: supporting,
    compositionOrder: [
      'Define the product promise in one short title, not a stacked text wall.',
      'Choose one visual subject: WebGL product object, app surface, founder, proof artifact, or scroll scene.',
      'Build the first viewport around that subject.',
      'Use the required advanced stack in source code when this brief requires it.',
      'Translate proof into public-safe buyer language.',
      'Run design_validate, design_content_audit, design_stack_audit, then browser QA.'
    ],
    forbidden: [
      'No left-column text wall.',
      'No random pasted logo.',
      'No generated initial badge replacing a real logo asset.',
      'No raw MCP smoke/debug/proof output.',
      'No negative letter spacing.',
      'No mobile overflow.',
      'No fake advanced-stack claims without imports.',
      'No repeating the same command-center template.',
      'No generic agency voice when the product is founder-built.'
    ],
    browserQa: validateDesignText('').requiredBrowserChecks
  };
}

function workspaceOverview() {
  return `# QuantumSkyes Workspace Overview

Standalone apps and reference folders are available in this workspace, but design generation must use local design references first.

Use local design references first:

- quantumskyes://design/index
- quantumskyes://design/registry
- quantumskyes://directives/index
- quantumskyes://design/reference/style-system

Design MCP purpose:

- Stop ugly default landing pages.
- Prevent giant left-column hero text.
- Keep public pages free of internal MCP/database proof junk.
- Require browser QA before deploy.
`;
}

function runtimeApps() {
  const candidates = [
    'SkyeWebCreatorMax',
    'skye-design-lab',
    'skyesol_spectacle_reference',
    'metraiyux_0s_public_spectacle_site',
    'skye-business-command-center'
  ];
  return `# Runtime Apps

These names help agents understand the workspace map. SkyeWebCreatorMax is the expected design-generation class of app/workflow.

${candidates.map((name) => `- ${name}`).join('\n')}
`;
}

function validateDesignText(input) {
  const text = String(input || '');
  const lower = text.toLowerCase();
  const issues = [];

  for (const term of forbiddenPublicTerms) {
    if (lower.includes(term)) issues.push(`Public copy contains forbidden internal/proof phrase: "${term}"`);
  }
  if (/letter-spacing\s*:\s*-\s*(?:\d|\.)/.test(lower)) issues.push('Negative letter-spacing found. Use letter-spacing: 0 for generated pages.');
  const leftColumnMention = /left[-_\s]?column/.test(lower) && /hero/.test(lower);
  const leftColumnIsBan = /no\s+left[-_\s]?column|avoid\s+left[-_\s]?column|forbid[^.]*left[-_\s]?column/.test(lower);
  if (leftColumnMention && !leftColumnIsBan) issues.push('Hero/left-column pattern detected. Avoid skinny hero copy columns.');
  for (const signal of genericTemplateSignals) {
    if (signal.test(text)) issues.push(`Generic/repeated template signal detected: ${signal.toString()}`);
  }
  const claimsAdvanced = /framer|three\.?js|webgl|gsap|lenis|scrolltrigger|react three fiber|@react-three|framer-motion|motion\/react|from\s+['"]motion['"]/i.test(text);
  if (claimsAdvanced) {
    const required = [];
    if (/framer/i.test(text)) required.push('framerMotion');
    if (/three\.?js|webgl|react three fiber|@react-three/i.test(text)) required.push('three');
    if (/gsap|scrolltrigger/i.test(text)) required.push('gsap');
    if (/lenis/i.test(text)) required.push('lenis');
    if (/motion\/react|from\s+['"]motion['"]/i.test(text)) required.push('motion');
    const audit = stackAudit({ source: text, packageJson: text, required: [...new Set(required)] });
    for (const missing of audit.missingImports) {
      issues.push(`Advanced stack claimed but missing real import/runtime use: ${missing}`);
    }
  }
  const requestedEffects = inferRequestedEffects(text);
  if (requestedEffects.length) {
    const audit = effectAudit({ source: text, requested: requestedEffects });
    for (const missing of audit.missingEffects) {
      issues.push(`Requested effect claimed but missing source signal: ${missing}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    requiredBrowserChecks: [
      '1440x1000 screenshot',
      '390x844 screenshot',
      'No mobile horizontal scroll',
      'Main subject visible',
      'CTA visible',
      'No internal proof/debug copy',
      'design_stack_audit passes when advanced stack is required',
      'design_effect_audit passes when cursor/screenshot/scrollbar/text/Theatre/scroll/3D effects are requested',
      'design_performance_audit passes for Lenis/WebGL/screenshots/motion fallbacks',
      'Screenshot proves the output is not the repeated dark SaaS/card template'
    ]
  };
}

function openSourceRecipes({ recipeId, tag } = {}) {
  const data = readJson(path.join(designRoot, 'recipes', 'open-source-stack.json'), { recipes: [] });
  let recipes = Array.isArray(data.recipes) ? data.recipes : [];
  if (recipeId) recipes = recipes.filter((recipe) => recipe.id === recipeId);
  if (tag) recipes = recipes.filter((recipe) => (recipe.tags || []).includes(tag));
  return {
    name: data.name,
    version: data.version,
    purpose: data.purpose,
    rule: data.rule,
    recipes,
    available: (data.recipes || []).map((recipe) => recipe.id)
  };
}

const server = new McpServer({
  name: 'quantumskyes-design-mcp',
  version: '0.2.0'
});

server.registerResource('workspace-overview', 'quantumskyes://workspace/overview', {
  title: 'Workspace Overview',
  description: 'Workspace overview with design-first generation rules.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, workspaceOverview()));

server.registerResource('runtime-apps', 'quantumskyes://runtime/apps', {
  title: 'Runtime Apps',
  description: 'Known app/workflow names for design generation context.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, runtimeApps()));

server.registerResource('design-index', 'quantumskyes://design/index', {
  title: 'Design Index',
  description: 'Entry point for Skye/Spectacle design MCP resources.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, designIndex()));

server.registerResource('directive-index', 'quantumskyes://directives/index', {
  title: 'Agent Directive',
  description: 'Hard rules for design agents.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'directives', 'agent-directive.md'))));

server.registerResource('design-registry', 'quantumskyes://design/registry', {
  title: 'Skye Spectacle Registry',
  description: 'Pattern registry and quality gates for premium design generation.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'registry', 'skye-spectacle-registry.json')), 'application/json'));

server.registerResource('design-elements', 'quantumskyes://design/elements', {
  title: 'Skye Elements Registry',
  description: 'Composable namespaced elements for MCP design generation.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'registry', 'skye-elements-registry.json')), 'application/json'));

server.registerResource('design-user-guide', 'quantumskyes://design/user-guide', {
  title: 'User Guide',
  description: 'Plain-English guide for people allowed to use the design MCP.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'USER_GUIDE.md'))));

server.registerResource('design-builder-guide', 'quantumskyes://design/builder-guide', {
  title: 'Builder Guide',
  description: 'Builder documentation for using and extending the design MCP.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'BUILDER_GUIDE.md'))));

server.registerResource('design-client-setup', 'quantumskyes://design/client-setup', {
  title: 'Client Setup',
  description: 'Plain setup instructions for connecting users to the design MCP server.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'CLIENT_SETUP.md'))));

server.registerResource('no-frankenstein-policy', 'quantumskyes://design/no-frankenstein-policy', {
  title: 'No-Frankenstein Composition Policy',
  description: 'Rules for combining design MCP sources without creating visual sludge.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'NO_FRANKENSTEIN_POLICY.md'))));

server.registerResource('perfection-checklist', 'quantumskyes://design/perfection-checklist', {
  title: 'MCP Server Perfection Checklist',
  description: 'Checklist for whether the MCP server is actually improving generation.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'PERFECTION_CHECKLIST.md'))));

server.registerResource('advanced-stack', 'quantumskyes://design/advanced-stack', {
  title: 'Advanced Stack Guidance',
  description: 'When to use Motion, GSAP, Lenis, Three.js, and related advanced frontend tools.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'ADVANCED_STACK.md'))));

server.registerResource('open-source-stack', 'quantumskyes://design/open-source-stack', {
  title: 'Open Source Spectacle Recipes',
  description: 'Concrete recipes for Framer Motion, Three/R3F, Drei, postprocessing, GSAP, Lenis, Theatre, screenshots, cursor trails, scrollbar chrome, and text effects.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'recipes', 'open-source-stack.json')), 'application/json'));

server.registerResource('logo-standards', 'quantumskyes://design/logo-standards', {
  title: 'Logo Standards',
  description: 'Rules for using existing logo assets and rejecting generic generated badges.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'LOGO_STANDARDS.md'))));

server.registerResource('surface-video-reel', 'quantumskyes://design/surface-video-reel', {
  title: 'Actual E2E Surface Video Reel',
  description: 'Rules for recording real browser workflows as video proof surfaces.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'SURFACE_VIDEO_REEL.md'))));

server.registerResource('first-person-operator-voice', 'quantumskyes://content/first-person-operator-voice', {
  title: 'First-Person Operator Voice',
  description: 'Content-generation rules and examples based on the MetrAIyux 0S public spectacle voice.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'content', 'first-person-operator-voice.md'))));

server.registerResource('assets-manifest', 'quantumskyes://design/assets-manifest', {
  title: 'Design Asset Manifest',
  description: 'Available visual assets with usage rules.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, JSON.stringify(assetManifest(), null, 2), 'application/json'));

server.registerResource('pattern-manifest', 'quantumskyes://design/pattern-manifest', {
  title: 'Advanced Implementation Pattern Manifest',
  description: 'Implementation patterns that actually use Motion, GSAP, Lenis, Three.js, R3F, Drei, and postprocessing.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'patterns', 'pattern-manifest.json')), 'application/json'));

server.registerResource('reference-style-system', 'quantumskyes://design/reference/style-system', {
  title: 'SkyeSol Spectacle Style System',
  description: 'Local style reference extracted from SkyeSol.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readIfExists(path.join(referenceRoot, 'notes', 'spectacle-style-system.md'), 'Style reference not found.')));

server.registerResource('reference-deep-scan', 'quantumskyes://design/reference/deep-scan', {
  title: 'SkyeSol Deep Scan',
  description: 'Deep scan summary from the SkyeSol reference folder.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readIfExists(path.join(referenceRoot, 'notes', 'deep-scan-summary.md'), 'Deep scan reference not found.')));

server.registerResource('repo-file', new ResourceTemplate('quantumskyes://file/{path}', {
  list: undefined
}), {
  title: 'Workspace File',
  description: 'Read a bounded text file from the workspace.',
  mimeType: 'text/plain'
}, (uri, variables) => {
  const filePath = safeJoin(repoRoot, variables.path);
  return textResource(uri, readText(filePath), 'text/plain');
});

server.registerResource('design-file', new ResourceTemplate('quantumskyes://design/file/{path}', {
  list: undefined
}), {
  title: 'Design File',
  description: 'Read a design MCP/reference/lab text file. Use reference/... or lab/... prefixes for external design references.',
  mimeType: 'text/plain'
}, (uri, variables) => {
  const filePath = designFilePath(variables.path);
  return textResource(uri, readText(filePath), 'text/plain');
});

server.registerTool('repo_read', {
  title: 'Read Workspace File',
  description: 'Read a bounded text file from the workspace.',
  inputSchema: {
    path: z.string().describe('Workspace-relative file path')
  }
}, async ({ path: requestedPath }) => {
  const filePath = safeJoin(repoRoot, requestedPath);
  return { content: [{ type: 'text', text: readText(filePath) }] };
});

server.registerTool('design_find', {
  title: 'Search Design References',
  description: 'Search MCP design resources and Skye reference notes for a query.',
  inputSchema: {
    query: z.string().min(1),
    limit: z.number().int().positive().max(50).optional()
  }
}, async ({ query, limit = 12 }) => {
  const roots = [designRoot, referenceRoot, path.join(labRoot, 'registry'), path.join(labRoot, 'docs')];
  const needle = query.toLowerCase();
  const matches = [];
  for (const root of roots) {
    for (const file of walkFiles(root)) {
      const text = readIfExists(file);
      const lower = text.toLowerCase();
      const index = lower.indexOf(needle);
      if (index !== -1) {
        matches.push({
          path: path.relative(repoRoot, file),
          excerpt: text.slice(Math.max(0, index - 120), index + query.length + 180)
        });
      }
      if (matches.length >= limit) break;
    }
    if (matches.length >= limit) break;
  }
  return { content: [{ type: 'text', text: JSON.stringify({ query, matches }, null, 2) }] };
});

server.registerTool('design_validate', {
  title: 'Validate Public Design Copy',
  description: 'Detect forbidden ugly/default/public-internal patterns and fake advanced-stack claims in proposed copy, HTML, CSS, or source.',
  inputSchema: {
    content: z.string().describe('Copy, HTML, CSS, or design brief to validate')
  }
}, async ({ content }) => {
  return { content: [{ type: 'text', text: JSON.stringify(validateDesignText(content), null, 2) }] };
});

server.registerTool('design_content_audit', {
  title: 'Audit First-Person Operator Content',
  description: 'Reject generic agency/platform copy and require immersive first-person builder/operator language for founder-built systems.',
  inputSchema: {
    content: z.string().describe('Public copy, section text, hero text, or generated content'),
    requireFirstPerson: z.boolean().optional().describe('Require first-person operator POV; defaults to true')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(contentAudit(args), null, 2) }] };
});

server.registerTool('design_stack_audit', {
  title: 'Audit Advanced Stack Usage',
  description: 'Fail generated work that claims advanced design but does not actually import/use Three, GSAP, Lenis, Motion, R3F, Drei, or postprocessing.',
  inputSchema: {
    source: z.string().optional().describe('Concatenated relevant source files: TS/TSX/JS/JSX/CSS/HTML'),
    packageJson: z.string().optional().describe('package.json text'),
    required: z.array(z.enum(['framerMotion', 'three', 'gsap', 'lenis', 'motion', 'r3f', 'drei', 'postprocessing'])).optional().describe('Required stack imports for this brief')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(stackAudit(args), null, 2) }] };
});

server.registerTool('design_effect_audit', {
  title: 'Audit Requested Visual Effects',
  description: 'Fail generated work that claims cursor trails, neon scrollbars, screenshots, text effects, Theatre direction, GSAP scroll, or Three/R3F scenes without source signals.',
  inputSchema: {
    source: z.string().optional().describe('Concatenated generated source files'),
    requested: z.array(z.enum(['cursorTrail', 'neonScrollbar', 'textEffects', 'surfaceScreenshots', 'theatre', 'gsapScroll', 'threeCanvas'])).optional().describe('Requested effects to verify')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(effectAudit(args), null, 2) }] };
});

server.registerTool('design_e2e_proof_audit', {
  title: 'Audit E2E Browser Proof Surfaces',
  description: 'Fail product/action proof that only shows static screenshots instead of recording the browser doing the claimed workflow.',
  inputSchema: {
    source: z.string().optional().describe('Relevant HTML/JSX/TSX/CSS that renders the proof surface'),
    proofReport: z.string().optional().describe('Browser QA report, Playwright trace notes, video path, or E2E proof summary'),
    claims: z.array(z.string()).optional().describe('Specific app behavior claims that must be proven in browser')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(e2eProofAudit(args), null, 2) }] };
});

server.registerTool('design_performance_audit', {
  title: 'Audit Premium Motion Performance',
  description: 'Fail generated spectacle pages that use lazy Lenis settings, oversized WebGL DPR/particle counts, eager screenshot images, or missing motion fallbacks.',
  inputSchema: {
    source: z.string().optional().describe('Concatenated source files: TS/TSX/JS/JSX/CSS/HTML')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(performanceAudit(args), null, 2) }] };
});

server.registerTool('design_elements', {
  title: 'List Design Elements',
  description: 'List namespaced composable design elements without mixing sources randomly.',
  inputSchema: {
    type: z.string().optional().describe('Optional element type, e.g. hero, motion, proof, visual-system'),
    namespace: z.string().optional().describe('Optional namespace, e.g. skye.core, skye.motion, skye.webgl'),
    tier: z.string().optional().describe('Optional tier, e.g. primary, support, enhancement, required')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(elementsFiltered(args), null, 2) }] };
});

server.registerTool('design_compose_brief', {
  title: 'Compose Design Brief',
  description: 'Create a no-frankenstein design brief using approved MCP elements and QA rules.',
  inputSchema: {
    product: z.string().optional(),
    surface: z.string().optional(),
    goal: z.string().optional(),
    audience: z.string().optional(),
    intensity: z.string().optional()
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(composeBrief(args), null, 2) }] };
});

server.registerTool('design_asset_manifest', {
  title: 'List Design Assets',
  description: 'Return available design assets and usage rules.',
  inputSchema: {}
}, async () => {
  return { content: [{ type: 'text', text: JSON.stringify(assetManifest(), null, 2) }] };
});

server.registerTool('design_logo_manifest', {
  title: 'List Logo Assets',
  description: 'Return approved logo, mark, emblem, and icon assets plus usage rules.',
  inputSchema: {}
}, async () => {
  return { content: [{ type: 'text', text: JSON.stringify(logoManifest(), null, 2) }] };
});

server.registerTool('design_logo_audit', {
  title: 'Audit Logo Usage',
  description: 'Reject generic generated initial badges when existing brand assets or a clean wordmark should be used.',
  inputSchema: {
    source: z.string().optional().describe('HTML, CSS, JSX, or generated source to audit'),
    product: z.string().optional().describe('Optional product or brand name to match against known logo assets'),
    requireExistingAsset: z.boolean().optional().describe('When true, fail if no real logo asset is used')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(logoAudit(args), null, 2) }] };
});

server.registerTool('design_content_generate', {
  title: 'Generate First-Person Operator Copy',
  description: 'Generate immersive first-person public copy in the MetrAIyux/Gray operator voice.',
  inputSchema: {
    product: z.string().optional().describe('Product/system name'),
    audience: z.string().optional().describe('Audience or buyer type'),
    offer: z.string().optional().describe('What the product gives them'),
    components: z.array(z.string()).optional().describe('Concrete rooms/gates/proof/components to mention'),
    format: z.enum(['hero', 'section', 'cta', 'proof', 'pitch']).optional().describe('Copy format to generate')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(contentGenerate(args), null, 2) }] };
});

server.registerTool('design_open_source_stack', {
  title: 'Get Open Source Spectacle Recipes',
  description: 'Return concrete open-source implementation recipes by id or tag so generation does not fall back to SkyeSol styling.',
  inputSchema: {
    recipeId: z.string().optional().describe('Optional recipe id, e.g. framer-motion-interaction-system'),
    tag: z.string().optional().describe('Optional tag, e.g. framer-motion, three, gsap, screenshot, cursor-trail')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(openSourceRecipes(args), null, 2) }] };
});

server.registerTool('design_recipe_plan', {
  title: 'Compose Open Source Recipe Plan',
  description: 'Turn a product/surface/effect request into required open-source recipes, stack imports, and audits.',
  inputSchema: {
    product: z.string().optional(),
    surface: z.string().optional(),
    goal: z.string().optional(),
    audience: z.string().optional(),
    effects: z.array(z.enum(['cursorTrail', 'neonScrollbar', 'textEffects', 'surfaceScreenshots', 'theatre', 'gsapScroll', 'threeCanvas'])).optional()
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(recipePlan(args), null, 2) }] };
});

server.registerTool('design_pattern_pack', {
  title: 'Get Advanced Pattern Pack',
  description: 'Return real implementation files for an advanced design pattern.',
  inputSchema: {
    patternId: z.string().describe('Pattern id from quantumskyes://design/pattern-manifest')
  }
}, async ({ patternId }) => {
  return { content: [{ type: 'text', text: JSON.stringify(patternPack(patternId), null, 2) }] };
});

server.registerTool('design_quality_gate', {
  title: 'Design Quality Gate',
  description: 'Return the required browser QA checklist before a generated page can ship.',
  inputSchema: {
    surface: z.string().optional().describe('Optional page/app name')
  }
}, async ({ surface = 'public page' }) => {
  const gate = {
    surface,
    required: [
      'Read quantumskyes://directives/index',
      'Read quantumskyes://design/registry',
      'Read quantumskyes://design/logo-standards before creating or replacing any logo/mark',
      'Pick an approved first-viewport pattern',
      'Call design_recipe_plan for the requested product/effects',
      'Call design_open_source_stack and select concrete open-source recipes before applying brand styling',
      'Call design_logo_manifest and use existing logo assets before inventing a new mark',
      'Call design_logo_audit when a logo, brand mark, wordmark, or nav identity appears in source',
      'Read quantumskyes://design/surface-video-reel when app surfaces, workflows, screenshots, or proof video are requested',
      'Read quantumskyes://content/first-person-operator-voice for founder/operator public copy',
      'Run design_content_generate or design_content_audit when writing public copy',
      'Run design_validate on public copy/markup',
      'Run design_stack_audit when the brief requires Motion, GSAP, Lenis, Three, R3F, Drei, or postprocessing',
      'Run design_effect_audit when screenshots, cursor trail, neon scrollbar, text effects, Theatre, scroll stage, or Three/R3F canvas are requested',
      'Run design_e2e_proof_audit whenever copy says the app routes, logs in, signs up, restores, monitors, filters, deploys, or does another workflow',
      'Run design_performance_audit before browser QA; reject lazy Lenis, high DPR, high particles, eager screenshots, and missing reduced-motion/mobile fallbacks',
      'Capture browser screenshot at 1440x1000',
      'Capture browser screenshot at 390x844',
      'For workflow proof, record the browser doing the workflow and verify video readyState, currentTime, paused === false, and visibility',
      'Verify no mobile horizontal scroll',
      'Verify main subject and CTA are visible',
      'Verify no MCP smoke/debug/build text on public page',
      'Reject repeated dark SaaS/card-template output even if the build passes'
    ]
  };
  return { content: [{ type: 'text', text: JSON.stringify(gate, null, 2) }] };
});

server.registerPrompt('premium_page_repair', {
  title: 'Premium Page Repair',
  description: 'Prompt for repairing an ugly generated page using the Skye design MCP.',
  argsSchema: {
    product: z.string().optional(),
    problem: z.string().optional()
  }
}, ({ product = 'the product', problem = 'the current page feels generic or ugly' }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Use the Skye Design MCP to repair ${product}. Problem: ${problem}.

Read the directive, registry, elements registry, open-source stack recipes, pattern manifest, advanced stack guide, and no-frankenstein policy first. Avoid long left-column hero text, disconnected images, internal MCP/proof copy, negative letter spacing, and repeated dark SaaS templates. Choose one primary visual subject, call design_open_source_stack for concrete recipes, call design_pattern_pack for the required implementation patterns, run design_stack_audit if advanced stack is required, run design_e2e_proof_audit when workflow claims appear, then verify desktop/mobile screenshots and video playback before completion.`
      }
    }
  ]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
