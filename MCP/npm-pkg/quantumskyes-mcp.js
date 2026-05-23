#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = __dirname;
const parent = path.dirname(mcpRoot);
const runtimeProcess = globalThis.process || { env: {}, argv: [] };
const repoRoot = runtimeProcess.env.REPO_ROOT
  ? path.resolve(runtimeProcess.env.REPO_ROOT)
  : mcpRoot;

const designRoot = path.join(mcpRoot, 'design');
const referenceRoot = path.join(repoRoot, 'skyesol_spectacle_reference');
const repoLabRoot = path.join(repoRoot, 'skye-design-lab');
const mcpLabRoot = path.join(mcpRoot, 'skye-design-lab');
const labRoot = fs.existsSync(mcpLabRoot) ? mcpLabRoot : repoLabRoot;

const magicTemplateDefinitions = [
  {
    id: 'changelog',
    title: 'Skye Production Changelog Template',
    folder: 'magicuidesign-changelog-template-2ad04a0',
    kind: 'release notes and production changelog surface',
    source: 'Magic UI changelog template, revised with Skye MCP chrome and production-ledger content',
    bestFor: ['changelog', 'release receipt', 'production ledger', 'public proof timeline'],
    requiredPatterns: ['skyesol-living-background', 'neon-motion-chrome', 'editorial-proof-atlas'],
    keyFiles: [
      'README.md',
      'package.json',
      'app/page.tsx',
      'app/layout.tsx',
      'app/globals.css',
      'components/skye-mcp-chrome.tsx',
      'changelog/content/2026-05-17-skyepay.mdx',
      'changelog/content/2026-05-16-reviews.mdx',
      'changelog/content/2026-05-16-ledger.mdx'
    ]
  },
  {
    id: 'blog',
    title: 'Skye MCP Field Notes Blog Template',
    folder: 'magicuidesign-blog-template-bc0cb81',
    kind: 'field notes, article library, and proof-backed editorial surface',
    source: 'Magic UI blog template, revised with Skye MCP chrome and production-ledger article content',
    bestFor: ['blog', 'field notes', 'technical writing', 'proof narrative', 'content engine'],
    requiredPatterns: ['skyesol-living-background', 'neon-motion-chrome', 'luxury-editorial-command'],
    keyFiles: [
      'README.md',
      'package.json',
      'app/page.tsx',
      'app/layout.tsx',
      'app/globals.css',
      'components/blog-card.tsx',
      'components/skye-mcp-chrome.tsx',
      'blog/content/skye-production-ledger.mdx',
      'lib/site.ts'
    ]
  },
  {
    id: 'portfolio',
    title: 'Skye Production Operator Portfolio Template',
    folder: 'magicuidesign-portfolio-5ef12e4',
    kind: 'operator portfolio, resume, and proof-of-work surface',
    source: 'Magic UI portfolio template, revised with Skye MCP chrome and production-ledger proof section',
    bestFor: ['portfolio', 'operator profile', 'resume', 'proof-of-work', 'case-study index'],
    requiredPatterns: ['skyesol-living-background', 'neon-motion-chrome', 'founder-authority'],
    keyFiles: [
      'README.md',
      'package.json',
      'src/app/page.tsx',
      'src/app/layout.tsx',
      'src/app/globals.css',
      'src/components/skye-mcp-chrome.tsx',
      'src/data/resume.tsx'
    ]
  }
].map((template) => ({
  ...template,
  root: path.join(mcpRoot, template.folder)
}));

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
  gsap: [/from\s+['"]gsap['"]/, /from\s+['"]gsap\/ScrollTrigger['"]/],
  lenis: [/from\s+['"]lenis['"]/],
  motion: [/from\s+['"]motion\/react['"]/, /from\s+['"]motion['"]/, /from\s+['"]framer-motion['"]/],
  r3f: [/from\s+['"]@react-three\/fiber['"]/],
  drei: [/from\s+['"]@react-three\/drei['"]/],
  postprocessing: [/from\s+['"]@react-three\/postprocessing['"]/],
  theatre: [/from\s+['"]@theatre\/core['"]/],
  dotlottie: [/from\s+['"]@lottiefiles\/dotlottie-(?:web|react)['"]/],
  rive: [/from\s+['"]@rive-app\/react-canvas['"]/],
  ogl: [/from\s+['"]ogl['"]/],
  pixi: [/from\s+['"]pixi\.js['"]/]
};
const advancedStackRuntime = {
  framerMotion: [/<motion\./, /useMotionValue\s*\(/, /useSpring\s*\(/, /useScroll\s*\(/, /whileHover\s*=/, /whileInView\s*=/],
  three: [/THREE\./, /new\s+THREE\./, /<(?:icosahedronGeometry|torusGeometry|pointsMaterial|meshStandardMaterial)\b/],
  gsap: [/gsap\.(?:registerPlugin|to|fromTo|timeline)\s*\(/, /ScrollTrigger/],
  lenis: [/new\s+Lenis\s*\(/, /\.raf\s*\(/],
  motion: [/<motion\./, /motionNext\.\w+/, /useMotionValue\s*\(/, /useScroll\s*\(/],
  r3f: [/<Canvas\b/, /useFrame\s*\(/],
  drei: [/<(?:Float|PerspectiveCamera|Stars)\b/],
  postprocessing: [/<(?:EffectComposer|Bloom|Vignette)\b/],
  theatre: [/getProject\s*\(/, /sheet\s*\(/, /sheet\.object|theatreSheet\.object/, /onValuesChange\s*\(/, /theatreScene\.value/],
  dotlottie: [/new\s+DotLottie\s*\([\s\S]{0,700}(?:src\s*:|\.lottie|\.json)/, /data-motion-asset=["'{][\s\S]{0,180}\.(?:lottie|json)/],
  rive: [/useRive\s*\([\s\S]{0,700}src\s*:[\s\S]{0,220}\.riv/, /data-rive-src=["'{][\s\S]{0,180}\.riv/, /useStateMachineInput\s*\(/],
  ogl: [/new\s+(?:OglRenderer|OglProgram|OglMesh|Renderer|Program|Mesh)\s*\(/, /new\s+OglTriangle\s*\(/],
  pixi: [/new\s+(?:PixiApplication|Application)\s*\(/, /\.init\s*\([\s\S]{0,260}canvas/, /new\s+PixiGraphics\s*\(/]
};
const advancedStackPackages = {
  framerMotion: ['framer-motion'],
  three: ['three'],
  gsap: ['gsap'],
  lenis: ['lenis'],
  motion: ['motion', 'framer-motion'],
  r3f: ['@react-three/fiber'],
  drei: ['@react-three/drei'],
  postprocessing: ['@react-three/postprocessing'],
  theatre: ['@theatre/core', '@theatre/studio'],
  dotlottie: ['@lottiefiles/dotlottie-web', '@lottiefiles/dotlottie-react'],
  rive: ['@rive-app/react-canvas'],
  ogl: ['ogl'],
  pixi: ['pixi.js']
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
  neonScrollbar: [/::-webkit-scrollbar/, /scrollbar-color/, /scrollbar-thumb/, /scrollbar-track/, /mcp-neon-scroll-rail/, /mcp-neon-scroll-thumb/],
  textEffects: [/text-shadow/, /background-clip:\s*text/, /glow-text/, /neon-text/, /split[-_\s]?text/, /text-scan/],
  motionChrome: [/scroll-progress/, /motion-chrome/, /neon-motion/, /scanline/, /magnetic[-_\s]?/, /pointer-reactive/, /useScroll/, /useTransform/],
  livingBackground: [/skyesol-living-field/, /living-background/, /alive-background/, /liquid-field/, /aurora wave|aurora[-_\s]?band|drawWave/, /requestAnimationFrame[\s\S]{0,600}(?:particle|canvas|wave)/i, /pointer parallax|mouse parallax|pointermove|mousemove[\s\S]{0,400}(?:tx|ty|parallax)/i],
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
  browserRecording: [/recordVideo/i, /record-proof-walkthrough\.mjs/i, /proof-recipes\//i, /proof-report\.json/i, /\bE2E browser recording\b/i, /\bbrowser recording\b/i, /\bPlaywright\b/i, /page\.(?:click|fill|goto|mouse|keyboard|locator|screenshot|waitForSelector)/i],
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
  neonScrollbar: ['adaptive-neon-scrollbar'],
  textEffects: ['premium-text-effects-lab'],
  motionChrome: ['neon-motion-chrome-kit', 'framer-motion-interaction-system', 'premium-text-effects-lab'],
  livingBackground: ['skyesol-living-background', 'neon-motion-chrome-kit'],
  surfaceScreenshots: ['actual-surface-screenshot-stage', 'actual-surface-video-reel'],
  theatre: ['theatre-directed-scene'],
  gsapScroll: ['gsap-lenis-scroll-stage'],
  threeCanvas: ['three-r3f-shader-scene', 'drei-postprocessing-cinema']
};
const effectToStack = {
  cursorTrail: ['framerMotion'],
  neonScrollbar: [],
  textEffects: ['framerMotion'],
  motionChrome: ['framerMotion'],
  livingBackground: [],
  surfaceScreenshots: [],
  theatre: ['theatre'],
  gsapScroll: ['gsap', 'lenis'],
  threeCanvas: ['three', 'r3f']
};
const runtimeBrowserEvidencePatterns = {
  framerMotion: [/framer[-_\s]?motion[\s\S]{0,80}true/i, /motionReady["'\s:]*true/i, /animated(?:Element|Motion|Runtime)?["'\s:]*true/i, /<motion\./i],
  motion: [/motion(?:Ready|Runtime|Active)["'\s:]*true/i, /motionReady["'\s:]*true/i, /from\s+['"]motion\/react['"]/i],
  gsap: [/gsap(?:Ready|Global|Runtime|Active)?["'\s:]*true/i, /ScrollTrigger(?:Ready|Global|Runtime|Active)?["'\s:]*true/i, /mcp-scroll-stage/i, /motionReady["'\s:]*true/i],
  lenis: [/lenis(?:Ready|Global|Runtime|Active)?["'\s:]*true/i, /htmlClass["'\s:]*[^{}\n]*\blenis\b/i, /\blenis\b[\s\S]{0,80}(?:true|running|ready)/i],
  three: [/three(?:Ready|Runtime|Active)?["'\s:]*true/i, /webgl(?:Ready|Runtime|Active)?["'\s:]*true/i, /canvas(?:Nonblank|Pixels|Ready)["'\s:]*true/i, /canvasPixels["'\s:]*[1-9]/i],
  r3f: [/r3f(?:Ready|Runtime|Active)?["'\s:]*true/i, /react[-_\s]?three[\s\S]{0,80}true/i, /canvas(?:Nonblank|Pixels|Ready)["'\s:]*true/i],
  drei: [/drei(?:Ready|Runtime|Active)?["'\s:]*true/i, /Float|PerspectiveCamera|Stars/i],
  postprocessing: [/postprocessing(?:Ready|Runtime|Active)?["'\s:]*true/i, /EffectComposer|Bloom|Vignette/i],
  theatre: [/theatre(?:Ready|Runtime|Active)?["'\s:]*true/i, /sheet(?:Ready|Runtime|Active)?["'\s:]*true/i, /theatreScene|onValuesChange/i],
  dotlottie: [/dotlottie(?:Ready|Runtime|Active)?["'\s:]*true/i, /lottie(?:Ready|Runtime|Active)?["'\s:]*true/i, /\.(?:lottie|json)\b/i],
  rive: [/rive(?:Ready|Runtime|Active)?["'\s:]*true/i, /stateMachine(?:Ready|Runtime|Active)?["'\s:]*true/i, /\.riv\b/i],
  ogl: [/ogl(?:Ready|Runtime|Active)?["'\s:]*true/i, /canvas(?:Nonblank|Pixels|Ready)["'\s:]*true/i],
  pixi: [/pixi(?:Ready|Runtime|Active)?["'\s:]*true/i, /canvas(?:Nonblank|Pixels|Ready)["'\s:]*true/i]
};
const stackCatalogData = {
  name: 'skye-advanced-frontend-stack-catalog',
  version: '0.1.0',
  purpose: 'Single source of truth for the free/open-source motion, scroll, WebGL, and visual-design libraries this MCP should recommend and audit.',
  rule: 'Use these as implementation primitives. The generated project must install/import them in the target app when selected; the MCP server itself only exposes the recipes and audits.',
  installSets: {
    essentialMotion: ['framer-motion', 'motion', 'gsap', 'lenis'],
    essential3d: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
    directedMotion: ['@theatre/core', '@theatre/studio'],
    vectorMotion: ['@lottiefiles/dotlottie-web', '@lottiefiles/dotlottie-react', '@rive-app/react-canvas'],
    shaderAndCanvas: ['ogl', 'pixi.js'],
    usefulUi: ['lucide-react']
  },
  libraries: [
    {
      id: 'framer-motion',
      package: 'framer-motion',
      category: 'animation',
      useFor: ['React UI motion', 'layout transitions', 'scroll transforms', 'cursor trails', 'microinteractions'],
      recipeIds: ['framer-motion-interaction-system', 'neon-scrollbar-cursor-trail', 'neon-motion-chrome-kit', 'premium-text-effects-lab'],
      imports: ["import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';"],
      auditStack: 'framerMotion'
    },
    {
      id: 'motion',
      package: 'motion',
      category: 'animation',
      useFor: ['Modern Motion package', 'motion/react component animation', 'lighter UI animation when the project standardizes on Motion'],
      recipeIds: ['framer-motion-interaction-system'],
      imports: ["import { motion } from 'motion/react';"],
      auditStack: 'motion'
    },
    {
      id: 'gsap',
      package: 'gsap',
      category: 'scroll',
      useFor: ['timelines', 'ScrollTrigger', 'pinning', 'scrubbed funnels', 'text/stage choreography'],
      recipeIds: ['gsap-lenis-scroll-stage', 'premium-text-effects-lab'],
      imports: ["import gsap from 'gsap';", "import { ScrollTrigger } from 'gsap/ScrollTrigger';", 'gsap.registerPlugin(ScrollTrigger);'],
      auditStack: 'gsap'
    },
    {
      id: 'lenis',
      package: 'lenis',
      category: 'scroll',
      useFor: ['smooth scroll feel', 'ScrollTrigger integration', 'scroll-led pages'],
      recipeIds: ['gsap-lenis-scroll-stage'],
      imports: ["import Lenis from 'lenis';", 'new Lenis({ lerp: 0.18, smoothWheel: true });'],
      auditStack: 'lenis'
    },
    {
      id: 'three',
      package: 'three',
      category: '3d',
      useFor: ['raw Three.js scenes', 'custom geometry/materials', 'shader objects', 'WebGL product symbols'],
      recipeIds: ['three-r3f-shader-scene', 'drei-postprocessing-cinema'],
      imports: ["import * as THREE from 'three';"],
      auditStack: 'three'
    },
    {
      id: 'react-three-fiber',
      package: '@react-three/fiber',
      category: '3d',
      useFor: ['React Three canvas', 'useFrame runtime animation', 'interactive hero scenes'],
      recipeIds: ['three-r3f-shader-scene', 'drei-postprocessing-cinema'],
      imports: ["import { Canvas, useFrame } from '@react-three/fiber';"],
      auditStack: 'r3f'
    },
    {
      id: 'drei',
      package: '@react-three/drei',
      category: '3d',
      useFor: ['Float', 'PerspectiveCamera', 'Stars', 'Environment', 'ScrollControls', 'loader helpers'],
      recipeIds: ['drei-postprocessing-cinema'],
      imports: ["import { Float, PerspectiveCamera, Stars } from '@react-three/drei';"],
      auditStack: 'drei'
    },
    {
      id: 'postprocessing',
      package: '@react-three/postprocessing',
      category: '3d',
      useFor: ['Bloom', 'Vignette', 'DepthOfField', 'cinematic finish'],
      recipeIds: ['drei-postprocessing-cinema'],
      imports: ["import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';"],
      auditStack: 'postprocessing'
    },
    {
      id: 'theatre',
      package: '@theatre/core',
      companionPackages: ['@theatre/studio'],
      category: 'directed-motion',
      useFor: ['keyframed scene direction', 'camera beats', 'art-directed 3D state', 'timeline-controlled hero moments'],
      recipeIds: ['theatre-directed-scene'],
      imports: ["import { getProject } from '@theatre/core';"],
      auditEffect: 'theatre'
    },
    {
      id: 'dotlottie',
      package: '@lottiefiles/dotlottie-web',
      companionPackages: ['@lottiefiles/dotlottie-react'],
      category: 'vector-motion',
      useFor: ['real Lottie/dotLottie animation assets', 'workflow illustrations', 'animated brand/system media'],
      recipeIds: ['dotlottie-web-motion-asset'],
      imports: ["import { DotLottie } from '@lottiefiles/dotlottie-web';"],
      auditEffect: 'surfaceScreenshots'
    },
    {
      id: 'rive',
      package: '@rive-app/react-canvas',
      category: 'vector-motion',
      useFor: ['interactive state-machine vector animations', 'animated mascots/icons/product diagrams when a real Rive asset exists'],
      recipeIds: ['rive-interactive-motion-asset'],
      imports: ["import { useRive, useStateMachineInput } from '@rive-app/react-canvas';"],
      auditNote: 'Must include a real .riv asset and reduced-motion/static fallback.'
    },
    {
      id: 'ogl',
      package: 'ogl',
      category: 'shader-canvas',
      useFor: ['lightweight shader backgrounds', 'custom WebGL planes', 'generative visual fields outside React Three'],
      recipeIds: ['ogl-shader-backdrop'],
      imports: ["import { Renderer, Program, Mesh, Triangle } from 'ogl';"],
      auditNote: 'Treat like WebGL: cap DPR, pause when hidden, provide reduced-motion fallback.'
    },
    {
      id: 'pixi',
      package: 'pixi.js',
      category: 'canvas-2d',
      useFor: ['sprite-heavy 2D scenes', 'particles', 'game-like interfaces', 'interactive canvas layers'],
      recipeIds: ['pixi-sprite-stage'],
      imports: ["import { Application, Container, Sprite } from 'pixi.js';"],
      auditNote: 'Use when sprite/canvas rendering beats DOM or Three. Keep DPR and particle counts controlled.'
    },
    {
      id: 'react-bits',
      package: 'copy/adapt source',
      category: 'inspiration',
      useFor: ['animated component ideas', 'text effects', 'buttons', 'backgrounds', 'loaders'],
      recipeIds: ['open-component-motion-inspiration'],
      imports: ['Copy source into the project, then own accessibility, tokens, and reduced-motion fallback.'],
      auditNote: 'Do not stack random effects from demos; adapt one visual language.'
    },
    {
      id: 'animata',
      package: 'copy/adapt source',
      category: 'inspiration',
      useFor: ['copyable animated UI/component references'],
      recipeIds: ['open-component-motion-inspiration'],
      imports: ['Copy source into the project, then rewrite to local style and QA it.'],
      auditNote: 'Use as reference, not as an unreviewed dependency dump.'
    }
  ]
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
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return readText(filePath);
  } catch {
    return fallback;
  }
}

function templateDefinition(templateId) {
  return magicTemplateDefinitions.find((template) => template.id === templateId || template.folder === templateId);
}

function templateReceiptSummary(root) {
  const receiptPath = path.join(root, 'MCP_TOOLING_RECEIPT.json');
  if (!fs.existsSync(receiptPath)) return null;
  const receipt = readJson(receiptPath, {});
  const toolCalls = Array.isArray(receipt.toolCalls) ? receipt.toolCalls : [];
  const failedCalls = toolCalls.filter((call) => call && (call.ok === false || call.error || call.status === 'error'));
  return {
    path: path.relative(repoRoot, receiptPath),
    generatedAt: receipt.generatedAt || null,
    listedTools: Array.isArray(receipt.listedTools) ? receipt.listedTools.length : null,
    resourcesRead: Array.isArray(receipt.resourcesRead) ? receipt.resourcesRead.length : null,
    toolCalls: toolCalls.length,
    failedCalls: failedCalls.length,
    inventory: receipt.inventory || null
  };
}

function templateManifest() {
  return {
    generatedAt: new Date().toISOString(),
    rule: 'These are first-class design templates inside the local QuantumSkyes MCP. Use them as design/source packs with Skye MCP pattern packs and audits; do not treat them as unrelated extracted folders.',
    sourceFoldersStayIntact: true,
    templates: magicTemplateDefinitions.map((template) => ({
      id: template.id,
      title: template.title,
      kind: template.kind,
      source: template.source,
      folder: template.folder,
      path: path.relative(repoRoot, template.root),
      exists: fs.existsSync(template.root),
      bestFor: template.bestFor,
      requiredPatterns: template.requiredPatterns,
      keyFiles: template.keyFiles,
      mcpReceipt: templateReceiptSummary(template.root)
    }))
  };
}

function templatePack(templateId, includeFiles = []) {
  const template = templateDefinition(templateId);
  if (!template) {
    return {
      ok: false,
      error: `Unknown template: ${templateId}`,
      available: magicTemplateDefinitions.map((item) => item.id)
    };
  }
  if (!fs.existsSync(template.root)) {
    return {
      ok: false,
      error: `Template folder is missing: ${path.relative(repoRoot, template.root)}`,
      template: { id: template.id, title: template.title, folder: template.folder }
    };
  }

  const requestedFiles = [...new Set([...(template.keyFiles || []), ...(includeFiles || [])])];
  const files = {};
  const missing = [];
  for (const relativePath of requestedFiles) {
    const filePath = safeJoin(template.root, relativePath);
    if (!fs.existsSync(filePath)) {
      missing.push(relativePath);
      continue;
    }
    files[relativePath] = readText(filePath, 180_000);
  }

  return {
    ok: true,
    template: {
      id: template.id,
      title: template.title,
      kind: template.kind,
      source: template.source,
      path: path.relative(repoRoot, template.root),
      bestFor: template.bestFor,
      requiredPatterns: template.requiredPatterns,
      mcpReceipt: templateReceiptSummary(template.root)
    },
    files,
    missing,
    implementationRule: 'Use this template pack as a base or reference, then run design_variety_plan, design_pattern_pack, design_effect_audit, design_performance_audit, and browser QA before shipping.'
  };
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
      if (entry.name === 'MCP_TOOLING_RECEIPT.json' || entry.name === 'package-lock.json' || entry.name === '.package-lock.json') continue;
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
  if (raw.startsWith('template/')) {
    const parts = raw.slice('template/'.length).split('/').filter(Boolean);
    const template = templateDefinition(parts.shift());
    if (!template) throw new Error(`Unknown design template: ${raw}`);
    return safeJoin(template.root, parts.join('/'));
  }
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
- quantumskyes://design/component-use-cases
- quantumskyes://design/fifty-k-standard
- quantumskyes://design/no-frankenstein-policy
- quantumskyes://design/perfection-checklist
- quantumskyes://design/advanced-stack
- quantumskyes://design/stack-catalog
- quantumskyes://design/open-source-stack
- quantumskyes://design/variety-system
- quantumskyes://design/logo-standards
- quantumskyes://design/surface-video-reel
- quantumskyes://design/proof-recording-playbook
- quantumskyes://content/first-person-operator-voice
- quantumskyes://design/assets-manifest
- quantumskyes://design/pattern-manifest
- quantumskyes://design/templates
- quantumskyes://design/template/{templateId}
- quantumskyes://design/lab/registry
- quantumskyes://design/lab/directive
- quantumskyes://design/lab/user-guide
- quantumskyes://design/lab/builder-guide
- quantumskyes://design/lab/mcp-integration
- quantumskyes://directives/index
- quantumskyes://design/user-guide
- quantumskyes://design/builder-guide
- quantumskyes://design/reference/style-system

## Design Template Packs

${templateManifest().templates.map((template) => `- ${template.id}: ${template.title} (${template.path})`).join('\n')}

## Skye Design Lab Root

${path.relative(repoRoot, labRoot) || '.'}

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
    ['skye-design-lab.public', path.join(labRoot, 'public', 'assets')],
    ['skye-design-lab.dist', path.join(labRoot, 'dist', 'assets')],
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

function componentUseCaseCatalog() {
  return readJson(path.join(designRoot, 'registry', 'skye-component-use-cases.json'), {
    useCases: [],
    fullRuntimeStack: []
  });
}

function normalizeIdList(value = []) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

function inferComponentUseCases(text) {
  const lower = String(text || '').toLowerCase();
  const inferred = [];
  if (/\bintro|opening|loader|loading|gate|splash|age gate|launch\b/.test(lower)) inferred.push('intro-opening-sequence');
  if (/\bsite|website|landing|homepage|home page|public|hero|service page|product launch\b/.test(lower)) inferred.push('public-landing-hero');
  if (/\bapp|dashboard|admin|tool|console|control plane|editor|quote|scan|portal|crm|workspace\b/.test(lower)) inferred.push('app-tool-surface');
  if (/\bchat|widget|message lane|conversation|relay13|password gate|account-tied|support lane\b/.test(lower)) inferred.push('workspace-chat-lane');
  if (/\bscroll|funnel|process|journey|stage|route|handoff|scrub|pin|pinned\b/.test(lower)) inferred.push('scroll-story');
  if (/\bthree|r3f|webgl|3d|shader|spatial|canvas product|product object\b/.test(lower)) inferred.push('webgl-product-scene');
  if (/\bproof|screenshot|video|reel|receipt|case study|browser recording|workflow\b/.test(lower)) inferred.push('proof-surface');
  if (/\bchrome|neon|scrollbar|cursor|magnetic|shine|beam|meteor|highlighter|text effect|brand polish\b/.test(lower)) inferred.push('brand-motion-chrome');
  if (/\bform|table|faq|pricing|inventory|accordion|card|metric|content|details\b/.test(lower)) inferred.push('content-sections');
  if (/\blottie|dotlottie|rive|vector motion|state machine\b/.test(lower)) inferred.push('vector-motion-asset');
  if (/\bogl|pixi|sprite|2d canvas|particles|generative background\b/.test(lower)) inferred.push('canvas-special-effect');
  return [...new Set(inferred)];
}

function componentPlan({
  product = 'the product',
  surface = 'public page',
  goal = 'premium design',
  audience = 'buyers and users',
  useCases = [],
  componentIds = [],
  effects = [],
  requiredStack = [],
  stackMode = 'full'
} = {}) {
  const catalog = componentUseCaseCatalog();
  const aliases = catalog.componentAliases || {};
  const requestedUseCases = normalizeIdList(useCases);
  const requestedComponents = normalizeIdList(componentIds);
  const aliasUseCases = requestedComponents.map((id) => aliases[id] || aliases[id.toLowerCase()] || null).filter(Boolean);
  const inferred = inferComponentUseCases(`${product} ${surface} ${goal} ${audience} ${requestedComponents.join(' ')}`);
  const selectedIds = [...new Set([
    ...requestedUseCases,
    ...aliasUseCases,
    ...inferred
  ])];
  if (selectedIds.length === 0) selectedIds.push('public-landing-hero', 'brand-motion-chrome');

  const allUseCases = Array.isArray(catalog.useCases) ? catalog.useCases : [];
  const selectedUseCases = selectedIds
    .map((id) => allUseCases.find((item) => item.id === id))
    .filter(Boolean);
  const missingUseCases = selectedIds.filter((id) => !selectedUseCases.some((item) => item.id === id));
  const selectedComponentIds = [...new Set([
    ...requestedComponents,
    ...selectedUseCases.flatMap((item) => item.components || [])
  ])];
  const selectedEffects = [...new Set([
    ...normalizeIdList(effects),
    ...selectedUseCases.flatMap((item) => item.effects || []),
    ...inferRequestedEffects(`${product} ${surface} ${goal} ${audience} ${selectedComponentIds.join(' ')}`)
  ])];
  const selectedRecipeIds = [...new Set([
    ...selectedUseCases.flatMap((item) => item.recipes || []),
    ...selectedEffects.flatMap((effect) => effectToRecipes[effect] || [])
  ])];
  const optionalRecipeIds = [...new Set([
    ...selectedUseCases.flatMap((item) => item.optionalRecipes || [])
  ])].filter((recipeId) => !selectedRecipeIds.includes(recipeId));
  const optionalEffectIds = [...new Set([
    ...selectedUseCases.flatMap((item) => item.optionalEffects || [])
  ])].filter((effect) => !selectedEffects.includes(effect));
  const selectedStack = [...new Set([
    ...normalizeIdList(requiredStack),
    ...selectedUseCases.flatMap((item) => item.stack || []),
    ...selectedEffects.flatMap((effect) => effectToStack[effect] || [])
  ])];
  const fullStack = Array.isArray(catalog.fullRuntimeStack) ? catalog.fullRuntimeStack : [];
  const effectiveStackMode = stackMode === 'selected' ? 'selected' : 'full';
  const mandatoryStack = effectiveStackMode === 'full' ? fullStack : selectedStack;
  const recipes = openSourceRecipes();
  const selectedRecipes = selectedRecipeIds
    .map((recipeId) => (recipes.recipes || []).find((recipe) => recipe.id === recipeId))
    .filter(Boolean);
  const optionalRecipes = optionalRecipeIds
    .map((recipeId) => (recipes.recipes || []).find((recipe) => recipe.id === recipeId))
    .filter(Boolean);

  return {
    product,
    surface,
    goal,
    audience,
    stackMode: effectiveStackMode,
    selectedUseCases,
    missingUseCases,
    selectedComponentIds,
    requestedEffects: selectedEffects,
    optionalEffects: optionalEffectIds,
    requiredOpenSourceRecipes: selectedRecipeIds,
    selectedRecipes,
    optionalOpenSourceRecipes: optionalRecipeIds,
    optionalRecipes,
    selectedStack,
    mandatoryStack,
    fullRuntimeStack: fullStack,
    implementationContract: [
      'Choose components from selected use cases only, unless the user explicitly changes the use-case plan.',
      'Every selected component/use case must map to visible UI or visible runtime behavior in the target app.',
      'Every selected stack item must be installed, imported, and used at runtime.',
      'Package availability is not enough. Source runtime and browser runtime evidence are required.',
      'If stackMode is full, every fullRuntimeStack item is mandatory. If the user explicitly narrows scope, use stackMode selected and record why.',
      'Run design_runtime_stack_gate with source, packageJson, mandatoryStack, and browserReport before calling the implementation done.'
    ],
    requiredAudits: [
      'design_validate',
      'design_component_plan',
      'design_stack_audit',
      'design_runtime_stack_gate',
      'design_effect_audit',
      'design_performance_audit',
      'design_quality_gate',
      'browser QA: 1440x1000 and 390x844 screenshots, no horizontal scroll, no JS errors'
    ],
    browserEvidenceRequired: [...new Set(selectedUseCases.flatMap((item) => item.browserEvidence || []))],
    rejectIf: [...new Set(selectedUseCases.flatMap((item) => item.rejectIf || []))],
    availableUseCases: allUseCases.map(({ id, title, bestFor }) => ({ id, title, bestFor })),
    rule: 'This plan is flexible by component/use case, but strict about runtime proof. Do not ship merely available stack packages or decorative pasted components.'
  };
}

function runtimeStackGate({
  source = '',
  packageJson = '',
  required = [],
  selectedComponents = [],
  product = 'the product',
  surface = 'public page',
  goal = 'premium design',
  audience = 'buyers and users',
  browserReport = '',
  stackMode = 'full',
  requireBrowserEvidence = true
} = {}) {
  const effectiveStackMode = stackMode === 'selected' ? 'selected' : 'full';
  const requestedStack = normalizeIdList(required);
  const requestedComponents = normalizeIdList(selectedComponents);
  const catalog = componentUseCaseCatalog();
  const knownUseCaseIds = new Set((catalog.useCases || []).map((item) => item.id));
  const selectedUseCaseIds = requestedComponents.filter((id) => knownUseCaseIds.has(id));
  const selectedComponentIds = requestedComponents.filter((id) => !knownUseCaseIds.has(id));
  const plan = requestedComponents.length
    ? componentPlan({
        product,
        surface,
        goal,
        audience,
        useCases: selectedUseCaseIds,
        componentIds: selectedComponentIds,
        requiredStack: requestedStack,
        stackMode: effectiveStackMode
      })
    : null;
  const requiredStack = [...new Set([
    ...(effectiveStackMode === 'full' ? catalog.fullRuntimeStack || [] : []),
    ...requestedStack,
    ...(plan?.mandatoryStack || [])
  ])];
  const sourceAudit = stackAudit({ source, packageJson, required: requiredStack });
  const reportText = String(browserReport || '');
  const missingBrowserEvidence = [];
  if (reportText.trim()) {
    for (const stackName of requiredStack) {
      const patterns = runtimeBrowserEvidencePatterns[stackName] || [];
      const proved = patterns.some((pattern) => pattern.test(reportText));
      if (!proved) missingBrowserEvidence.push(stackName);
    }
  }

  const issues = [];
  if (sourceAudit.missingDependencies.length) {
    issues.push(`Missing package dependencies: ${sourceAudit.missingDependencies.join(', ')}`);
  }
  if (sourceAudit.missingImports.length) {
    issues.push(`Missing source imports: ${sourceAudit.missingImports.join(', ')}`);
  }
  if (sourceAudit.missingRuntime.length) {
    issues.push(`Imported but not visibly used at runtime in source: ${sourceAudit.missingRuntime.join(', ')}`);
  }
  if (requiredStack.length && requireBrowserEvidence && !reportText.trim()) {
    issues.push('Browser runtime report is required. Include Playwright/browser notes proving each required stack item is active in the rendered app.');
  }
  if (requiredStack.length && requireBrowserEvidence && reportText.trim() && missingBrowserEvidence.length) {
    issues.push(`Browser runtime evidence missing for: ${missingBrowserEvidence.join(', ')}`);
  }

  return {
    ok: issues.length === 0,
    stackMode: effectiveStackMode,
    requiredStack,
    selectedComponents: requestedComponents,
    componentPlan: plan || {
      stackMode: effectiveStackMode,
      selectedUseCases: [],
      selectedComponentIds: [],
      mandatoryStack: requiredStack,
      rule: 'No components were selected, so this gate enforces the explicit required stack or the full runtime stack.'
    },
    sourceAudit,
    browserEvidence: {
      required: Boolean(requireBrowserEvidence && requiredStack.length),
      provided: Boolean(reportText.trim()),
      missingBrowserEvidence,
      acceptedEvidenceExamples: {
        motion: 'motionReady true, visible animated element, transform changed after wait',
        gsap: 'gsapReady true, ScrollTrigger active, timeline progressed in browser',
        lenis: 'lenisReady true, html/body lenis class present, scroll RAF active',
        webgl: 'canvasNonblank true, canvasPixels > 0, WebGL context acquired',
        vector: 'dotlottie/rive ready true with .lottie/.json/.riv asset loaded'
      }
    },
    issues,
    rule: 'The selected or full MCP stack must be installed, imported, used in source, and proven active in browser. Package availability alone fails.'
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

function resolveWorkspaceTarget(requestedPath = '.') {
  const raw = String(requestedPath || '.');
  const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(repoRoot, raw);
  if (resolved !== repoRoot && !resolved.startsWith(repoRoot + path.sep)) {
    throw new Error(`Path escapes workspace root: ${requestedPath}`);
  }
  return resolved;
}

function walkTargetFiles(root, predicate, acc = []) {
  if (!fs.existsSync(root)) return acc;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === '.wrangler' || entry.name === '.netlify') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkTargetFiles(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function firstExistingPath(paths) {
  return paths.find((filePath) => filePath && fs.existsSync(filePath)) || null;
}

function targetImplementationPaths(targetFolder) {
  const htmlFiles = walkTargetFiles(targetFolder, (filePath) => filePath.endsWith('.html'));
  const cssFiles = walkTargetFiles(targetFolder, (filePath) => filePath.endsWith('.css'));
  const jsFiles = walkTargetFiles(targetFolder, (filePath) => /\.(?:js|mjs)$/.test(filePath));
  const assetDir = path.join(targetFolder, 'assets', 'mcp-implementation');
  const indexPath = firstExistingPath([path.join(targetFolder, 'index.html'), htmlFiles[0]]);
  const cssPath = firstExistingPath([
    path.join(targetFolder, 'style.css'),
    path.join(targetFolder, 'assets', 'styles.css'),
    path.join(targetFolder, 'src', 'styles.css'),
    cssFiles[0]
  ]) || path.join(assetDir, 'mcp-effects.css');
  const jsPath = firstExistingPath([
    path.join(targetFolder, 'script.js'),
    path.join(targetFolder, 'assets', 'app.js'),
    path.join(targetFolder, 'src', 'main.js'),
    jsFiles[0]
  ]) || path.join(assetDir, 'mcp-effects.js');
  return { htmlFiles, cssFiles, jsFiles, assetDir, indexPath, cssPath, jsPath };
}

function managedBlock(text, id, body, kind = 'css') {
  const start = kind === 'js' ? `// BEGIN quantumskyes:${id}` : `/* BEGIN quantumskyes:${id} */`;
  const end = kind === 'js' ? `// END quantumskyes:${id}` : `/* END quantumskyes:${id} */`;
  const block = `${start}\n${String(body || '').trim()}\n${end}`;
  const pattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (pattern.test(text)) return text.replace(pattern, block);
  return `${String(text || '').replace(/\s*$/, '')}\n\n${block}\n`;
}

function addClassToTag(html, tagName, className) {
  const tagPattern = new RegExp(`<${tagName}\\b([^>]*)>`, 'i');
  return html.replace(tagPattern, (match, attrs) => {
    if (new RegExp(`\\b${className}\\b`).test(match)) return match;
    const classAttr = attrs.match(/\sclass=(["'])(.*?)\1/i);
    if (classAttr) {
      return match.replace(classAttr[0], ` class=${classAttr[1]}${classAttr[2]} ${className}${classAttr[1]}`);
    }
    return `<${tagName}${attrs} class="${className}">`;
  });
}

function addAttributeToHtmlTag(html, attrName) {
  if (new RegExp(`\\b${attrName}\\b`, 'i').test(html.match(/<html\b[^>]*>/i)?.[0] || '')) return html;
  return html.replace(/<html\b([^>]*)>/i, `<html ${attrName}$1>`);
}

function injectAfterBodyOpen(html, marker, snippet) {
  if (html.includes(marker)) return html;
  return html.replace(/<body\b([^>]*)>/i, (match, attrs) => `<body${attrs}>\n${snippet}`);
}

function injectAssetTagsIfNeeded(html, indexPath, cssPath, jsPath) {
  let next = html;
  const rel = (filePath) => path.relative(path.dirname(indexPath), filePath).split(path.sep).join('/');
  if (!next.includes('data-mcp-generated-css') && cssPath.includes(`${path.sep}mcp-implementation${path.sep}`)) {
    next = next.replace(/<\/head>/i, `<link rel="stylesheet" href="${rel(cssPath)}" data-mcp-generated-css>\n</head>`);
  }
  if (!next.includes('data-mcp-generated-js') && jsPath.includes(`${path.sep}mcp-implementation${path.sep}`)) {
    next = next.replace(/<\/body>/i, `<script src="${rel(jsPath)}" data-mcp-generated-js></script>\n</body>`);
  }
  return next;
}

function applyMcpParts({
  targetFolder: requestedTarget = '.',
  effects = [],
  componentIds = [],
  patternIds = [],
  mode = 'apply'
} = {}) {
  const targetFolder = resolveWorkspaceTarget(requestedTarget);
  const dryRun = mode === 'dryRun';
  const requestedEffects = [...new Set([...(effects || []), ...inferRequestedEffects(`${componentIds.join(' ')} ${patternIds.join(' ')}`)])];
  const requestedPatterns = new Set(patternIds || []);
  const requestedComponentText = `${componentIds.join(' ')} ${patternIds.join(' ')}`;
  if (requestedEffects.includes('neonScrollbar')) requestedPatterns.add('adaptive-neon-scrollbar');
  if (requestedEffects.includes('livingBackground')) requestedPatterns.add('skyesol-living-background');
  if (requestedEffects.includes('motionChrome') || requestedEffects.includes('cursorTrail')) requestedPatterns.add('neon-motion-chrome');
  if (/\b(workspace-chat-widget|workspace-chat|chat-widget|relay13-widget|password-gate)\b/i.test(requestedComponentText)) requestedPatterns.add('workspace-chat-widget');

  const paths = targetImplementationPaths(targetFolder);
  const changedFiles = [];
  const skipped = [];
  const cssBlocks = [];
  const jsBlocks = [];
  let html = paths.indexPath && fs.existsSync(paths.indexPath) ? readIfExists(paths.indexPath) : '';

  if (!fs.existsSync(targetFolder)) {
    return { ok: false, error: `Target folder does not exist: ${path.relative(repoRoot, targetFolder)}` };
  }

  if (requestedPatterns.has('adaptive-neon-scrollbar')) {
    const pack = patternPack('adaptive-neon-scrollbar');
    cssBlocks.push({ id: 'adaptive-neon-scrollbar-css', body: pack.files['adaptive-neon-scrollbar/adaptive-neon-scrollbar.css'] || '' });
    jsBlocks.push({ id: 'adaptive-neon-scrollbar-js', body: pack.files['adaptive-neon-scrollbar/adaptive-neon-scrollbar.js'] || '' });
    if (html) html = addAttributeToHtmlTag(html, 'data-mcp-neon-scrollbar');
  }

  if (requestedPatterns.has('skyesol-living-background')) {
    const pack = patternPack('skyesol-living-background');
    const livingJs = String(pack.files['skyesol-living-background/skyesol-living-background.js'] || '')
      .replace(/^\s*export\s+function\s+mountSkyeSolLivingBackground/, 'function mountSkyeSolLivingBackground');
    cssBlocks.push({ id: 'skyesol-living-background-css', body: pack.files['skyesol-living-background/skyesol-living-background.css'] || '' });
    jsBlocks.push({
      id: 'skyesol-living-background-js',
      body: `
${livingJs}

(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();`
    });
    if (html) {
      html = addClassToTag(html, 'body', 'skyesol-living-page');
      html = injectAfterBodyOpen(html, 'skyesol-living-field', '<canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas><div class="skyesol-grain" aria-hidden="true"></div><div class="skyesol-scanline" aria-hidden="true"></div>');
    }
  }

  if (requestedPatterns.has('neon-motion-chrome')) {
    const pack = patternPack('neon-motion-chrome');
    cssBlocks.push({ id: 'neon-motion-chrome-css', body: pack.files['neon-motion-chrome/neon-motion-chrome.css'] || '' });
    jsBlocks.push({
      id: 'neon-motion-chrome-vanilla-js',
      body: `
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();`
    });
    if (html) html = injectAfterBodyOpen(html, 'neon-motion-chrome', '<div class="neon-motion-chrome" data-motion-chrome aria-hidden="true"></div>');
  }

  if (requestedPatterns.has('workspace-chat-widget')) {
    const pack = patternPack('workspace-chat-widget');
    const widgetJs = pack.files['workspace-chat-widget/workspace-chat-widget.js'] || '';
    jsBlocks.push({ id: 'workspace-chat-widget-js', body: widgetJs });
    if (html) {
      html = injectAfterBodyOpen(html, 'MetrAIyuxWorkspaceChatConfig', `<script>
window.MetrAIyuxWorkspaceChatConfig = window.MetrAIyuxWorkspaceChatConfig || {
  workspaceId: (document.documentElement.dataset.workspaceId || location.hostname || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace',
  workspaceSlug: (document.documentElement.dataset.workspaceSlug || location.hostname || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace',
  clientName: document.title || 'Workspace',
  appName: document.title || 'Workspace App',
  launcherText: 'Workspace chat',
  operatorName: 'MetrAIyux Operator',
  accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#64d6ff',
  accountDisclaimer: 'Messages are tied to this workspace account and may be used for support, proof receipts, QA, and follow-up inside the client build lane.'
};
</script>`);
    }
  }

  if (requestedEffects.includes('textEffects')) {
    cssBlocks.push({
      id: 'premium-text-effects-css',
      body: `
.neon-gradient-text,.premium-text-effects-lab,.skye-gradient-text{
  color:transparent;
  background:linear-gradient(90deg,#fff 0%,var(--mcp-neon-scrollbar-a,#f3d483) 31%,var(--mcp-neon-scrollbar-b,#35b7ff) 63%,var(--mcp-neon-scrollbar-c,#6ff2c7) 100%);
  -webkit-background-clip:text;
  background-clip:text;
  text-shadow:0 0 28px rgba(53,183,255,.18),0 0 34px rgba(243,212,131,.12);
}`
    });
    if (html) html = addClassToTag(html, 'h1', 'neon-gradient-text');
  }

  if (cssBlocks.length === 0 && jsBlocks.length === 0 && !html) {
    skipped.push('No implementable MCP parts were selected for this static apply pass.');
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(paths.cssPath), { recursive: true });
    fs.mkdirSync(path.dirname(paths.jsPath), { recursive: true });
    let cssText = readIfExists(paths.cssPath);
    for (const block of cssBlocks) cssText = managedBlock(cssText, block.id, block.body, 'css');
    if (cssBlocks.length) {
      fs.writeFileSync(paths.cssPath, cssText);
      changedFiles.push(path.relative(repoRoot, paths.cssPath));
    }

    let jsText = readIfExists(paths.jsPath);
    for (const block of jsBlocks) jsText = managedBlock(jsText, block.id, block.body, 'js');
    if (jsBlocks.length) {
      fs.writeFileSync(paths.jsPath, jsText);
      changedFiles.push(path.relative(repoRoot, paths.jsPath));
    }

    if (paths.indexPath && html) {
      html = injectAssetTagsIfNeeded(html, paths.indexPath, paths.cssPath, paths.jsPath);
      fs.writeFileSync(paths.indexPath, html);
      changedFiles.push(path.relative(repoRoot, paths.indexPath));
    }
  }

  const combined = [
    paths.indexPath ? readIfExists(paths.indexPath) : html,
    readIfExists(paths.cssPath),
    readIfExists(paths.jsPath)
  ].join('\n\n');
  return {
    ok: true,
    mode,
    targetFolder: path.relative(repoRoot, targetFolder),
    appliedPatterns: [...requestedPatterns],
    appliedEffects: requestedEffects,
    changedFiles: [...new Set(changedFiles)],
    skipped,
    sourcePaths: {
      index: paths.indexPath ? path.relative(repoRoot, paths.indexPath) : null,
      css: path.relative(repoRoot, paths.cssPath),
      js: path.relative(repoRoot, paths.jsPath)
    },
    audits: {
      effects: effectAudit({ source: combined, requested: requestedEffects }),
      performance: performanceAudit({ source: combined })
    },
    rule: 'This tool writes selected MCP implementation parts into the target source. It is intentionally stronger than a receipt.'
  };
}

function stackAudit({ source = '', packageJson = '', required = [] } = {}) {
  const combined = `${source}\n${packageJson}`;
  const lowerPackage = String(packageJson || '').toLowerCase();
  const detected = {};
  for (const [name, patterns] of Object.entries(advancedStackImports)) {
    const packageNames = advancedStackPackages[name] || [name];
    detected[name] = {
      imported: patterns.some((pattern) => pattern.test(combined)),
      runtime: (advancedStackRuntime[name] || []).some((pattern) => pattern.test(combined)),
      dependency: packageNames.some((packageName) => lowerPackage.includes(`"${packageName.toLowerCase()}"`))
    };
  }
  const missing = required.filter((name) => !detected[name]?.imported);
  const missingRuntime = required.filter((name) => detected[name]?.imported && !detected[name]?.runtime);
  const missingDependencies = required.filter((name) => !detected[name]?.dependency);
  const unusedDependencies = Object.entries(detected)
    .filter(([, value]) => value.dependency && !value.imported)
    .map(([name]) => name);
  return {
    ok: missing.length === 0 && missingRuntime.length === 0 && missingDependencies.length === 0,
    required,
    detected,
    missingImports: missing,
    missingRuntime,
    missingDependencies,
    unusedDependencies,
    rule: 'Advanced design claims must be backed by real imports, dependencies, and visible runtime use; shallow labels, package installs, or prose do not pass.'
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
    const customRailY = text.match(/\.mcp-neon-scroll-rail-y\s*\{[\s\S]{0,260}?width\s*:\s*(?:(\d+)px|var\(--mcp-neon-scrollbar-size\))/i);
    const customRailX = text.match(/\.mcp-neon-scroll-rail-x\s*\{[\s\S]{0,260}?height\s*:\s*(?:(\d+)px|var\(--mcp-neon-scrollbar-size\))/i);
    const customRailSize = Number(text.match(/--mcp-neon-scrollbar-size\s*:\s*(\d+)px/i)?.[1] || 0);
    const hasCustomRail = /mcp-neon-scroll-rail-y/i.test(text)
      && /mcp-neon-scroll-rail-x/i.test(text)
      && /mcp-neon-scroll-thumb/i.test(text)
      && /pointerdown|setPointerCapture|scrollTo|scrollLeft/i.test(text);
    const hasWideCustomRail = hasCustomRail
      && ((Number(customRailY?.[1] || customRailSize) >= 12)
        && (Number(customRailX?.[1] || customRailSize) >= 12));
    const hasWideScrollbar = widthMatches.some((value) => value >= 14) || hasWideCustomRail;
    const hasVisibleTrack = /::-webkit-scrollbar-track[\s\S]{0,260}(?:rgba\([^)]+(?:0?\.(?:0[5-9]|[1-9][0-9]?))[)]*\)|box-shadow|linear-gradient|border|background\s*:\s*(?!transparent))/i.test(text)
      || /\.mcp-neon-scroll-rail[\s\S]{0,520}(?:rgba\([^)]+(?:0?\.(?:0[5-9]|[1-9][0-9]?))[)]*\)|box-shadow|linear-gradient|border|backdrop-filter)/i.test(text);
    const hasNeonThumb = /::-webkit-scrollbar-thumb[\s\S]{0,360}(?:box-shadow|linear-gradient|radial-gradient|cyan|gold|violet|neon|#(?:64d9ff|27f2ff|f8cb5e|f4c75b|a88cff|8a63ff))/i.test(text)
      || /\.mcp-neon-scroll-thumb[\s\S]{0,520}(?:box-shadow|linear-gradient|radial-gradient|cyan|gold|violet|neon|#(?:64d9ff|27f2ff|f8cb5e|f4c75b|a88cff|8a63ff))/i.test(text);
    const scrollbarBlocks = text.match(/::-webkit-scrollbar(?:-[\w-]+)?\s*\{[^}]*\}/gi) || [];
    const hidesScrollbar = /scrollbar-width\s*:\s*none/i.test(text)
      || scrollbarBlocks.some((block) => /display\s*:\s*none|opacity\s*:\s*0(?:[;\s}]|\.0)/i.test(block));
    if (!hasWideScrollbar) issues.push('Neon scrollbar must be visibly present: use a 14px+ native scrollbar or 12px+ always-visible custom rail.');
    if (!hasVisibleTrack) issues.push('Neon scrollbar track must stay slightly opaque/visible with border, gradient, or inset glow.');
    if (!hasNeonThumb) issues.push('Neon scrollbar thumb must include visible neon highlight: gradient, glow, or bright brand color.');
    if (hidesScrollbar && !hasCustomRail) issues.push('Native scrollbars may only be hidden when an always-visible custom rail is implemented.');
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
    : ['public front door', 'client workspace', 'founder control room', 'SkyeGateFS27 access', 'proof receipts', 'operating brains']).map(contentComponentLabel);
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

function proofRecipe({ name = 'Client proof walkthrough', slug = '', siteRoot = '', baseUrl = '', workflow = [] } = {}) {
  const cleanSlug = slug || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client-proof';
  const steps = workflow.length
    ? workflow
    : [
        { path: 'index.html', title: 'Open the real product surface', body: 'Show the actual first screen, not a mockup.', actions: [{ type: 'screenshot', name: 'first-screen' }] },
        { path: 'index.html', title: 'Prove the claimed workflow', body: 'Click, fill, route, submit, or scroll through the behavior the copy claims.', actions: [{ type: 'scroll', y: 900, afterMs: 600 }, { type: 'screenshot', name: 'workflow-proof' }] }
      ];
  const recipe = {
    name,
    slug: cleanSlug,
    mode: 'frames',
    ...(siteRoot ? { siteRoot } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    outDir: `test-artifacts/proof-recordings/${cleanSlug}`,
    viewport: { width: 1440, height: 900 },
    videoSize: { width: 1440, height: 900 },
    frameSeconds: 7,
    boundaries: [
      'No .env values, private keys, bearer tokens, or owner-only credentials are shown.',
      'Show real browser-visible behavior; do not call a static landing screenshot proof of app workflow.'
    ],
    chapters: steps.map((step, index) => ({
      path: step.path || 'index.html',
      ...(step.url ? { url: step.url } : {}),
      title: step.title || `Proof step ${index + 1}`,
      body: step.body || 'Browser-visible proof state.',
      actions: step.actions || [{ type: 'screenshot', name: `proof-step-${index + 1}` }],
      capture: step.capture ?? false
    }))
  };
  return {
    ok: true,
    command: `npm run proof:record -- --config proof-recipes/${cleanSlug}.json`,
    recipe,
    writeTo: `proof-recipes/${cleanSlug}.json`,
    rule: 'Use this recipe with tools/record-proof-walkthrough.mjs, then render the generated MP4 in the public proof page and run design_e2e_proof_audit.'
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
  if (/motion chrome|scroll progress|progress rail|scanline|magnetic|pointer reactive|neon motion/.test(lower)) effects.push('motionChrome');
  if (/skyesol|living background|alive background|alive page|command field|aurora|liquid field|moving background|animated background/.test(lower)) effects.push('livingBackground');
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

function varietyPlan({ product = 'the product', surface = 'public page', goal = 'premium design', audience = 'buyers and users', previousArchetype = '', preferredArchetype = '' } = {}) {
  const text = `${product} ${surface} ${goal} ${audience}`.toLowerCase();
  const isPublicSurface = /\b(?:public|website|site|landing|home|homepage|brand|marketing|showcase|portfolio|editorial|service)\b/.test(text);
  const explicitAppSurface = /\b(?:dashboard|admin|console|control plane|control-panel|control panel|app shell|actual app|product ui|tool ui|portal ui|database console|inbox ui)\b/.test(text);
  const wantsProof = /proof|receipt|case study|screenshot|video|workflow|browser|e2e|audit/.test(text);
  const wantsProcess = /signup|onboarding|funnel|flow|route|gate|provision|intake|handoff|staffing|mailbox|auth/.test(text);
  const wantsProduct = /ai|brain|engine|infra|server|database|mcp|gpu|ollama|technical|developer|api/.test(text);
  const wantsFounder = /founder|gray|operator|personal|authority|portfolio/.test(text);
  const wantsMinimal = /minimal|quiet|luxury|editorial|restraint|white|light/.test(text);
  const archetypes = [
    {
      id: 'app-operating-surface',
      patternPack: 'app-first-command-center',
      firstViewportStructure: 'actual tool surface as the first screen',
      visualSubject: 'working dashboard shell with controls, states, and proof',
      motionLanguage: 'restrained interface motion and status transitions',
      proofFormat: 'live app screenshot or browser-action reel',
      paletteDiscipline: 'functional dark or light OS palette with one accent',
      typographyPosture: 'compact operational headings, scannable labels',
      conversionPath: 'open tool, inspect status, perform action'
    },
    {
      id: 'editorial-proof-atlas',
      patternPack: 'editorial-proof-atlas',
      firstViewportStructure: 'large editorial proof/media spread',
      visualSubject: 'one dominant screenshot, receipt, founder note, or video',
      motionLanguage: 'staggered editorial reveals, minimal hover lift',
      proofFormat: 'annotated screenshots, receipt timeline, before-after panels',
      paletteDiscipline: 'warm ivory/ink/red or white/charcoal/gold',
      typographyPosture: 'architectural serif with sparse body copy',
      conversionPath: 'proof, trust, qualified CTA'
    },
    {
      id: 'kinetic-process-funnel',
      patternPack: 'kinetic-process-funnel',
      firstViewportStructure: 'scroll-led workflow stages',
      visualSubject: 'process rail with one stage per viewport',
      motionLanguage: 'GSAP/Lenis scrubbed progression',
      proofFormat: 'stage receipts and browser-action video where behavior is claimed',
      paletteDiscipline: 'black/metal/gold or charcoal/cyan/red',
      typographyPosture: 'oversized stage words, short explanations',
      conversionPath: 'intake, gate, provision, proof, handoff'
    },
    {
      id: 'spatial-product-lab',
      patternPack: 'spatial-product-lab',
      firstViewportStructure: 'interactive inspection scene',
      visualSubject: 'single WebGL product/system object',
      motionLanguage: 'pointer-reactive 3D with restrained bloom',
      proofFormat: 'spec chips, live metrics, surface screenshot below',
      paletteDiscipline: 'deep green/gold, silver/black, or white/ink',
      typographyPosture: 'technical-luxury display with compact controls',
      conversionPath: 'inspect, compare, request access'
    },
    {
      id: 'cinematic-command',
      patternPack: 'cinematic-command-hero',
      firstViewportStructure: 'full-bleed command scene',
      visualSubject: 'living WebGL artifact or command room',
      motionLanguage: 'cinematic 3D drift plus proof strip',
      proofFormat: 'operator proof panel and QA receipts',
      paletteDiscipline: 'obsidian/gold/cyan with strict restraint',
      typographyPosture: 'large serif headline, short operator copy',
      conversionPath: 'claim, proof, primary action'
    },
    {
      id: 'founder-authority',
      patternPack: 'luxury-editorial-command',
      firstViewportStructure: 'founder/media authority scene',
      visualSubject: 'transparent founder media or signature proof artifact',
      motionLanguage: 'slow editorial reveal and pointer accents',
      proofFormat: 'operator notes, metrics, receipts',
      paletteDiscipline: 'ivory/black/gold or documentary monochrome',
      typographyPosture: 'editorial authority with first-person copy',
      conversionPath: 'trust, proof, call or private access'
    },
    {
      id: 'minimal-luxury',
      patternPack: 'luxury-editorial-command',
      firstViewportStructure: 'high-whitespace editorial stack',
      visualSubject: 'one photo, object, or proof artifact',
      motionLanguage: 'almost still; one bespoke interaction',
      proofFormat: 'small verified receipts and sharp claims',
      paletteDiscipline: 'light neutral, ink, one metallic/accent',
      typographyPosture: 'architectural type with quiet labels',
      conversionPath: 'positioning, proof, invitation'
    }
  ];
  const scored = archetypes.map((item) => {
    let score = 0;
    if (preferredArchetype && item.id === preferredArchetype) score += 9;
    if (previousArchetype && item.id === previousArchetype) score -= 7;
    if (explicitAppSurface && item.id === 'app-operating-surface') score += 6;
    if (isPublicSurface && item.id === 'app-operating-surface') score -= 5;
    if (wantsProof && item.id === 'editorial-proof-atlas') score += 4;
    if (wantsProcess && item.id === 'kinetic-process-funnel') score += 4;
    if (wantsProduct && item.id === 'spatial-product-lab') score += 4;
    if (wantsFounder && item.id === 'founder-authority') score += 4;
    if (wantsMinimal && item.id === 'minimal-luxury') score += 4;
    if (isPublicSurface && item.id === 'editorial-proof-atlas') score += 2;
    if (isPublicSurface && item.id === 'cinematic-command') score += 1;
    if (!score && item.id === 'editorial-proof-atlas') score += 1;
    return { ...item, score };
  }).sort((a, b) => b.score - a.score);
  const directions = scored.slice(0, 4).map((item, index) => ({
    rank: index + 1,
    ...item,
    requiredPatternPacks: [item.patternPack, item.id === 'kinetic-process-funnel' ? 'neon-motion-chrome' : null].filter(Boolean),
    requiredAudits: ['design_stack_audit', 'design_effect_audit', 'design_performance_audit', 'desktop/mobile browser QA'],
    rejectIf: [
      `Looks like previous archetype: ${previousArchetype || 'unknown'}`,
      'First viewport can be rebranded by swapping logo/headline',
      'Proof is decorative instead of tied to the product workflow',
      'All sections collapse into identical cards'
    ]
  }));
  return {
    product,
    surface,
    goal,
    audience,
    rule: 'Choose one design DNA before coding. Do not default every product to the same SkyeSol dark command-card style. App-first is allowed only for explicit app/admin/dashboard/control-plane surfaces, not because copy says operator, system, tool, or MCP.',
    selectionSignals: {
      isPublicSurface,
      explicitAppSurface,
      wantsProof,
      wantsProcess,
      wantsProduct,
      wantsFounder,
      wantsMinimal
    },
    previousArchetype: previousArchetype || null,
    selected: directions[0],
    alternates: directions.slice(1),
    allArchetypes: archetypes.map(({ id, patternPack, paletteDiscipline }) => ({ id, patternPack, paletteDiscipline })),
    receiptFieldsRequired: ['chosenArchetype', 'patternPack', 'visualSubject', 'motionLanguage', 'proofFormat', 'paletteDiscipline', 'browserQaPaths']
  };
}

function composeBrief({ product = 'the product', surface = 'public page', goal = 'premium conversion', audience = 'buyers and developers', intensity = 'cinematic but usable' }) {
  const text = `${product} ${surface} ${goal} ${audience}`;
  const variety = varietyPlan({ product, surface, goal, audience });
  const primaryPattern = variety.selected.patternPack;
  const isInfrastructure = primaryPattern === 'cinematic-command-hero' || primaryPattern === 'spatial-product-lab';
  const isApp = primaryPattern === 'app-first-command-center';
  const implementationPatterns = [
    primaryPattern,
    /funnel|flow|route|gate|provision|intake|handoff|onboarding/i.test(text) ? 'scroll-proof-funnel' : null
  ].filter(Boolean);
  const requiredStack = isInfrastructure
    ? ['framerMotion', 'three', 'r3f', 'drei', 'postprocessing', 'gsap', 'lenis']
    : primaryPattern === 'kinetic-process-funnel'
      ? ['framerMotion', 'gsap', 'lenis']
      : ['framerMotion'];
  const plan = recipePlan({ product, surface, goal, audience });
  const wantsNeonScrollbar = plan.requestedEffects.includes('neonScrollbar');
  const wantsMotionChrome = plan.requestedEffects.includes('motionChrome');
  const wantsCursorTrail = plan.requestedEffects.includes('cursorTrail');
  const mergedRequiredStack = [...new Set([...requiredStack, ...plan.requiredStack.filter((item) => item !== 'theatre')])];
  const isLuxury = /luxury|bespoke|fifty.?k|\$50k|premium.?agency|high.?end|editorial|flagship/i.test(text);
  const supporting = [
    'skye.motion.reveal-system',
    'skye.proof.operator-proof-panel',
    'skye.proof.quality-gates'
  ];
  if (isInfrastructure) supporting.splice(1, 0, 'skye.webgl.living-command-field');
  if (isLuxury) {
    supporting.unshift('skye.luxury.singular-visual-thesis', 'skye.luxury.editorial-headline-system', 'skye.luxury.strategic-whitespace', 'skye.motion.staggered-reveal-choreography', 'skye.luxury.custom-easing-signature', 'skye.luxury.bespoke-interaction-layer');
  }
  supporting.push('skye.fx.text-effects');
  if (wantsNeonScrollbar) supporting.push('skye.fx.neon-scrollbar');
  if (wantsMotionChrome) supporting.push('skye.fx.neon-motion-chrome');
  if (wantsCursorTrail) supporting.push('skye.fx.cursor-trail');
  supporting.push('client.surface.actual-screenshot-stage', 'client.surface.actual-video-reel', 'skye.brand.existing-logo-system');
  const baseOpenSourceRecipes = isInfrastructure
    ? ['framer-motion-interaction-system', 'three-r3f-shader-scene', 'drei-postprocessing-cinema', 'gsap-lenis-scroll-stage', 'actual-surface-screenshot-stage', 'premium-text-effects-lab']
    : isApp
      ? ['framer-motion-interaction-system', 'gsap-lenis-scroll-stage', 'actual-surface-screenshot-stage']
      : ['framer-motion-interaction-system', 'premium-text-effects-lab'];
  if (wantsNeonScrollbar) baseOpenSourceRecipes.push('adaptive-neon-scrollbar');
  if (wantsMotionChrome) baseOpenSourceRecipes.push('neon-motion-chrome-kit');
  if (wantsCursorTrail) baseOpenSourceRecipes.push('neon-scrollbar-cursor-trail');
  return {
    product,
    surface,
    goal,
    audience,
    intensity,
    primaryPattern,
    implementationPatterns,
    chosenArchetype: variety.selected.id,
    varietySelection: variety.selected,
    requiredStack: mergedRequiredStack,
    mustUsePatternPackTool: true,
    mustUseRecipePlanTool: true,
    advancedStackEnforcement: 'Call design_component_plan, call design_pattern_pack for every implementation pattern, wire the returned files/concepts into source code, then call design_stack_audit and design_runtime_stack_gate with source, package.json, and browser runtime evidence.',
    openSourceRecipeRule: 'Call design_open_source_stack and pick recipes by library/behavior before applying any brand styling.',
    openSourceRecipes: [...new Set([...baseOpenSourceRecipes,
      ...(isLuxury ? ['fifty-k-typography-whitespace-system', 'framer-motion-interaction-system', 'gsap-lenis-scroll-stage', 'premium-text-effects-lab'] : []),
      ...plan.requiredOpenSourceRecipes])],
    templateSources: templateManifest().templates.map((template) => ({
      id: template.id,
      title: template.title,
      bestFor: template.bestFor,
      resource: `quantumskyes://design/template/${template.id}`
    })),
    requestedEffects: plan.requestedEffects,
    noveltyRules: [
      'Do not reuse the previous dark command-card page shape.',
      'Do not turn a design, changelog, blog, portfolio, proof-note, or editorial surface into a command dashboard by default.',
      'Choose a distinct first viewport composition before coding: vault, orbital scene, proof tunnel, founder authority, or product object.',
      'The primary visual subject must be browser-visible in the first viewport.',
      'A page fails if it could be mistaken for a generic SaaS template after changing the logo.',
      'Use actual product/app screenshots when the surface itself matters more than illustration.',
      'When proof copy claims a workflow, record the actual browser performing that workflow and render the MP4/WebM proof.',
      'Use premium text effects with restraint: glow, shimmer, reveal, split-line, or chromatic edge only where it raises the composition.',
      'Use adaptive-neon-scrollbar only when the user asks for a visible custom scrollbar or the experience is explicitly scroll-led.',
      'When the request references the Legal Skyes neon scrollbar or stronger motion chrome, pull adaptive-neon-scrollbar for the rail; pull neon-motion-chrome only when cursor/progress/scanline chrome is also wanted.',
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
      'No app-first command surface unless the user explicitly asked for an app/admin/dashboard/control-plane UI.',
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
- quantumskyes://design/templates
- quantumskyes://design/lab/registry
- quantumskyes://directives/index
- quantumskyes://design/reference/style-system

Design MCP purpose:

- Stop ugly default landing pages.
- Prevent giant left-column hero text.
- Keep public pages free of internal MCP/database proof junk.
- Use design/template packs when the user asks for changelog, blog, portfolio, proof notes, release receipts, or operator profile surfaces.
- Do not default to an app-first command surface unless the user explicitly asks for an app, dashboard, admin console, command center, or control plane.
- Require browser QA before deploy.
`;
}

function runtimeApps() {
  const candidates = [
    'SkyeWebCreatorMax',
    'MCP/skye-design-lab',
    'MCP/magicuidesign-changelog-template-2ad04a0',
    'MCP/magicuidesign-blog-template-bc0cb81',
    'MCP/magicuidesign-portfolio-5ef12e4',
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
    for (const missing of audit.missingRuntime) {
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
      'design_component_plan recorded selected use cases/components before coding',
      'design_stack_audit passes when advanced stack is required',
      'design_runtime_stack_gate passes with browser evidence for required stack',
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

function stackCatalog({ category, libraryId, packageName } = {}) {
  let libraries = stackCatalogData.libraries;
  if (category) libraries = libraries.filter((library) => library.category === category);
  if (libraryId) libraries = libraries.filter((library) => library.id === libraryId);
  if (packageName) {
    const needle = String(packageName).toLowerCase();
    libraries = libraries.filter((library) => {
      const packages = [library.package, ...(library.companionPackages || [])]
        .filter(Boolean)
        .map((item) => String(item).toLowerCase());
      return packages.some((item) => item.includes(needle));
    });
  }
  return {
    name: stackCatalogData.name,
    version: stackCatalogData.version,
    purpose: stackCatalogData.purpose,
    rule: stackCatalogData.rule,
    installSets: stackCatalogData.installSets,
    categories: [...new Set(stackCatalogData.libraries.map((library) => library.category))],
    libraries,
    available: stackCatalogData.libraries.map((library) => library.id)
  };
}

const luxuryTypographySignals = {
  architecturalScale: [/clamp\(\s*(?:3\.[5-9]|[4-9])\s*rem/, /font-size\s*:\s*(?:[4-9]\d*(?:\.\d+)?rem|[6-9]\d*(?:\.\d+)?vw)/i],
  tightLineHeight: [/line-height\s*:\s*0\.(?:9[0-9]|[89]\d)/, /line-height\s*:\s*1\.0[0-5]/],
  negativeTracking: [/letter-spacing\s*:\s*-0\.0[1-4]em/],
  displayWeight: [/font-weight\s*:\s*(?:700|800|900|bold|extrabold|black)\b/, /font-weight:\s*(?:7|8|9)00/],
  bodyWeightContrast: [/font-weight\s*:\s*(?:300|400|light|regular|normal)\b/]
};
const luxuryWhitespaceSignals = {
  heroScale: [/padding-block\s*:\s*clamp\(\s*(?:[89]|1[0-9])\s*rem/, /padding-top\s*:\s*(?:clamp\(\s*(?:[89]|1[0-9])\s*rem|(?:[89]|1[0-9])\s*rem)/i],
  sectionScale: [/padding-block\s*:\s*clamp\(\s*[6-9]\s*rem/, /padding-(?:top|bottom)\s*:\s*(?:clamp\(\s*[6-9]\s*rem|[7-9]\s*rem|1[0-9]\s*rem)/i],
  horizontalRoom: [/padding-inline\s*:\s*clamp\(\s*[2-9]\s*rem/, /padding-(?:left|right)\s*:\s*(?:clamp\(\s*[2-9]\s*rem|[4-9]\s*rem)/i]
};
const luxuryMotionSignals = {
  customEasing: [/cubic-bezier\(0\.1[0-9],\s*1,/, /cubic-bezier\(0(?:\.[0-9]+)?,\s*0\.5[5-9]/, /--ease-(?:expo|circ|back)-out/],
  staggerPattern: [/delay\s*:\s*i\s*\*\s*0\.0[5-9]/, /delay\s*:\s*(?:0\.0[5-9]|0\.1[0-5])/, /stagger\s*(?::|=)\s*0\.0[5-9]/],
  durationRange: [/duration\s*:\s*0\.[4-9]/, /duration\s*:\s*0\.[5-7]/],
  revealOrder: [/custom\s*=\s*\{?[0-3]\}?/, /delay.*i\s*\*/, /variants.*hidden.*visible/i]
};
const luxuryInteractionSignals = {
  magneticOrTilt: [/magnetic/, /useMotionValue.*pointermove|pointermove.*useMotionValue/, /perspective\s*:\s*\d{3,4}px.*rotateX|rotateY/i],
  cursorBespoke: [/cursor-trail/, /useSpring.*mouse|mouse.*useSpring/, /cursor-reactive/],
  hoverReveal: [/whileHover.*textDecoration|textDecoration.*whileHover/, /hover.*translate(?:X|Y)\s*\(-?[1-9]/, /hover.*clipPath|clipPath.*hover/i],
  drawUnderline: [/strokeDashoffset|strokeDasharray/, /draw.*underline|underline.*draw/i, /svg.*line.*animate|animate.*svg.*line/i]
};

function luxuryAudit({ source = '', level = 'full' } = {}) {
  const text = String(source || '');
  const issues = [];
  const detected = { typography: {}, whitespace: {}, motion: {}, interaction: {} };

  // Typography checks
  detected.typography.architecturalScale = luxuryTypographySignals.architecturalScale.some((p) => p.test(text));
  detected.typography.tightLineHeight = luxuryTypographySignals.tightLineHeight.some((p) => p.test(text));
  detected.typography.negativeTracking = luxuryTypographySignals.negativeTracking.some((p) => p.test(text));
  detected.typography.displayWeight = luxuryTypographySignals.displayWeight.some((p) => p.test(text));
  detected.typography.bodyWeightContrast = luxuryTypographySignals.bodyWeightContrast.some((p) => p.test(text));

  if (!detected.typography.architecturalScale) issues.push('Typography: hero headline must use architectural scale — clamp(3.5rem, 8vw, 9rem) or larger. Default font sizes read as $5K, not $50K.');
  if (!detected.typography.tightLineHeight) issues.push('Typography: display headline must have tight line-height (0.9–1.05). Auto or 1.5 line-height on a hero reads as template.');
  if (!detected.typography.negativeTracking) issues.push('Typography: display headline needs intentional tracking (letter-spacing: -0.02em to -0.04em). Zero or positive tracking on a hero headline reads as unstyled.');
  if (!detected.typography.displayWeight) issues.push('Typography: display headline must use a heavy weight (700+). A medium-weight hero headline looks generic.');
  if (!detected.typography.bodyWeightContrast) issues.push('Typography: body text must contrast with the display weight (300 or 400). Uniform weight throughout reads as template.');

  // Whitespace checks
  detected.whitespace.heroScale = luxuryWhitespaceSignals.heroScale.some((p) => p.test(text));
  detected.whitespace.sectionScale = luxuryWhitespaceSignals.sectionScale.some((p) => p.test(text));
  detected.whitespace.horizontalRoom = luxuryWhitespaceSignals.horizontalRoom.some((p) => p.test(text));

  if (!detected.whitespace.heroScale) issues.push('Whitespace: hero needs generous padding-block — clamp(8rem, 15vw, 14rem) or equivalent. Tight hero padding reads as kit-built.');
  if (!detected.whitespace.sectionScale) issues.push('Whitespace: sections need ≥6rem padding-block (desktop). Below that, the page reads dense and cheap.');
  if (!detected.whitespace.horizontalRoom) issues.push('Whitespace: content needs horizontal breathing room — clamp(2rem, 6vw, 6rem) padding-inline. Content touching viewport edges reads as unstyled.');

  // Motion choreography checks
  detected.motion.customEasing = luxuryMotionSignals.customEasing.some((p) => p.test(text));
  detected.motion.staggerPattern = luxuryMotionSignals.staggerPattern.some((p) => p.test(text));
  detected.motion.durationRange = luxuryMotionSignals.durationRange.some((p) => p.test(text));

  const hasMotion = /motion|framer|gsap|animation|transition/i.test(text);
  if (hasMotion) {
    if (!detected.motion.customEasing) issues.push('Motion: all transitions must use a custom cubic-bezier, not the default ease. Add --ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1) and use it throughout.');
    if (!detected.motion.staggerPattern) issues.push('Motion: entrance reveals must stagger — delay: i * 0.08 or equivalent. Simultaneous reveals read as template code, not choreography.');
    if (!detected.motion.durationRange) issues.push('Motion: reveal duration must be 400ms–700ms. Faster reads as functional, slower reads as heavy. Neither reads as premium.');
  }

  // Bespoke interaction check
  detected.interaction.hasBespoke = Object.values(luxuryInteractionSignals).some((patterns) => patterns.some((p) => p.test(text)));
  if (hasMotion && !detected.interaction.hasBespoke) issues.push('Interaction: at least one hover/cursor/transition treatment must be bespoke — magnetic pull, cursor spring, tilt parallax, clip-path reveal, or SVG draw. UI-kit defaults do not qualify.');

  const score = {
    typography: Object.values(detected.typography).filter(Boolean).length,
    whitespace: Object.values(detected.whitespace).filter(Boolean).length,
    motion: Object.values(detected.motion).filter(Boolean).length,
    interaction: detected.interaction.hasBespoke ? 1 : 0
  };
  const maxScore = { typography: 5, whitespace: 3, motion: hasMotion ? 3 : 0, interaction: hasMotion ? 1 : 0 };
  const totalPossible = Object.values(maxScore).reduce((a, b) => a + b, 0);
  const totalScore = Object.values(score).reduce((a, b) => a + b, 0);
  const pct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 100;

  return {
    ok: issues.length === 0,
    fiftyKScore: `${pct}%`,
    grade: pct >= 90 ? '$50K' : pct >= 70 ? '$20K' : pct >= 50 ? '$10K' : '$5K template',
    issues,
    detected,
    score,
    maxScore,
    rule: 'A $50K website has architectural typography, strategic whitespace, choreographed motion with custom easing, and at least one bespoke interaction. Template output cannot command bespoke pricing.'
  };
}

export function createQuantumSkyesMcpServer() {
const server = new McpServer({
  name: 'quantumskyes-design-mcp',
  version: '0.5.0'
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

server.registerResource('design-component-use-cases', 'quantumskyes://design/component-use-cases', {
  title: 'Skye Component Use Case Registry',
  description: 'Use-case groups for choosing UI components while enforcing selected/full runtime stack gates.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'registry', 'skye-component-use-cases.json')), 'application/json'));

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

server.registerResource('stack-catalog', 'quantumskyes://design/stack-catalog', {
  title: 'Advanced Frontend Stack Catalog',
  description: 'Query-friendly catalog for GSAP, Framer Motion, Motion, Lenis, Three/R3F/Drei/postprocessing, Theatre, dotLottie, Rive, OGL, Pixi, and inspiration sources.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, JSON.stringify(stackCatalog(), null, 2), 'application/json'));

server.registerResource('open-source-stack', 'quantumskyes://design/open-source-stack', {
  title: 'Open Source Spectacle Recipes',
  description: 'Concrete recipes for Framer Motion, Three/R3F, Drei, postprocessing, GSAP, Lenis, Theatre, screenshots, cursor trails, scrollbar chrome, and text effects.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'recipes', 'open-source-stack.json')), 'application/json'));

server.registerResource('variety-system', 'quantumskyes://design/variety-system', {
  title: 'Skye Design Variety System',
  description: 'Design DNA, archetypes, variation axes, and anti-sameness rules for high-end generation.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readText(path.join(designRoot, 'docs', 'VARIETY_SYSTEM.md'))));

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

server.registerResource('design-templates', 'quantumskyes://design/templates', {
  title: 'Skye MCP Template Manifest',
  description: 'Extracted and revised changelog, blog, and portfolio design template packs available to MCP generation.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, JSON.stringify(templateManifest(), null, 2), 'application/json'));

server.registerResource('design-template', new ResourceTemplate('quantumskyes://design/template/{templateId}', {
  list: undefined
}), {
  title: 'Skye MCP Template Pack',
  description: 'Read one revised template pack by id: changelog, blog, or portfolio.',
  mimeType: 'application/json'
}, (uri, variables) => {
  return textResource(uri, JSON.stringify(templatePack(variables.templateId), null, 2), 'application/json');
});

server.registerResource('design-lab-registry', 'quantumskyes://design/lab/registry', {
  title: 'Skye Design Lab Registry',
  description: 'Pattern metadata from the actual MCP/skye-design-lab package.',
  mimeType: 'application/json'
}, (uri) => textResource(uri, readIfExists(path.join(labRoot, 'registry', 'skye-spectacle-registry.json'), '{}'), 'application/json'));

server.registerResource('design-lab-directive', 'quantumskyes://design/lab/directive', {
  title: 'Skye Design Lab Agent Directive',
  description: 'Hard design-generation rules from MCP/skye-design-lab.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readIfExists(path.join(labRoot, 'registry', 'agent-directive.md'), 'Skye Design Lab directive not found.')));

server.registerResource('design-lab-user-guide', 'quantumskyes://design/lab/user-guide', {
  title: 'Skye Design Lab User Guide',
  description: 'User documentation from MCP/skye-design-lab.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readIfExists(path.join(labRoot, 'docs', 'USER_GUIDE.md'), 'Skye Design Lab user guide not found.')));

server.registerResource('design-lab-builder-guide', 'quantumskyes://design/lab/builder-guide', {
  title: 'Skye Design Lab Builder Guide',
  description: 'Builder documentation from MCP/skye-design-lab.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readIfExists(path.join(labRoot, 'docs', 'BUILDER_GUIDE.md'), 'Skye Design Lab builder guide not found.')));

server.registerResource('design-lab-mcp-integration', 'quantumskyes://design/lab/mcp-integration', {
  title: 'Skye Design Lab MCP Integration Notes',
  description: 'Integration notes explaining how the lab should be exposed to MCP agents.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readIfExists(path.join(labRoot, 'docs', 'MCP_INTEGRATION.md'), 'Skye Design Lab MCP integration notes not found.')));

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

server.registerTool('design_apply_mcp_parts', {
  title: 'Apply MCP Parts To Target',
  description: 'Write selected MCP design parts into a workspace target. This is the implementation side: it edits CSS/JS/HTML for supported effects instead of only producing a receipt.',
  inputSchema: {
    targetFolder: z.string().describe('Workspace-relative or absolute target folder to modify'),
    effects: z.array(z.enum(['cursorTrail', 'neonScrollbar', 'textEffects', 'motionChrome', 'livingBackground', 'surfaceScreenshots', 'theatre', 'gsapScroll', 'threeCanvas'])).optional().describe('Effects to apply when supported by static MCP parts'),
    componentIds: z.array(z.string()).optional().describe('Component ids or aliases to infer effects/patterns'),
    patternIds: z.array(z.string()).optional().describe('Pattern ids from quantumskyes://design/pattern-manifest to apply when supported'),
    mode: z.enum(['apply', 'dryRun']).optional().describe('apply writes files; dryRun reports planned writes only')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(applyMcpParts(args), null, 2) }] };
});

server.registerTool('design_find', {
  title: 'Search Design References',
  description: 'Search MCP design resources and Skye reference notes for a query.',
  inputSchema: {
    query: z.string().min(1),
    limit: z.number().int().positive().max(50).optional()
  }
}, async ({ query, limit = 12 }) => {
  const roots = [
    designRoot,
    referenceRoot,
    path.join(labRoot, 'registry'),
    path.join(labRoot, 'docs'),
    path.join(labRoot, 'src'),
    ...magicTemplateDefinitions.map((template) => template.root)
  ];
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
  description: 'Fail generated work that claims advanced design but does not actually import/use Three, GSAP, Lenis, Motion, R3F, Drei, postprocessing, Theatre, dotLottie, Rive, OGL, or Pixi.',
  inputSchema: {
    source: z.string().optional().describe('Concatenated relevant source files: TS/TSX/JS/JSX/CSS/HTML'),
    packageJson: z.string().optional().describe('package.json text'),
    required: z.array(z.enum(['framerMotion', 'three', 'gsap', 'lenis', 'motion', 'r3f', 'drei', 'postprocessing', 'theatre', 'dotlottie', 'rive', 'ogl', 'pixi'])).optional().describe('Required stack imports for this brief')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(stackAudit(args), null, 2) }] };
});

server.registerTool('design_runtime_stack_gate', {
  title: 'Audit Runtime Stack Evidence',
  description: 'Fail MCP-driven work unless the selected or full stack is installed, imported, used in source, and proven active in browser QA.',
  inputSchema: {
    source: z.string().optional().describe('Concatenated relevant source files: TS/TSX/JS/JSX/CSS/HTML'),
    packageJson: z.string().optional().describe('package.json text'),
    required: z.array(z.enum(['framerMotion', 'three', 'gsap', 'lenis', 'motion', 'r3f', 'drei', 'postprocessing', 'theatre', 'dotlottie', 'rive', 'ogl', 'pixi'])).optional().describe('Required stack items to enforce'),
    selectedComponents: z.array(z.string()).optional().describe('Use-case ids or component ids selected from quantumskyes://design/component-use-cases'),
    product: z.string().optional(),
    surface: z.string().optional(),
    goal: z.string().optional(),
    audience: z.string().optional(),
    browserReport: z.string().optional().describe('Browser QA report proving required libraries are active in the rendered app'),
    stackMode: z.enum(['selected', 'full']).optional().describe('full enforces every MCP runtime stack item; selected enforces only chosen use cases/components'),
    requireBrowserEvidence: z.boolean().optional().describe('Require browser runtime evidence; defaults to true')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(runtimeStackGate(args), null, 2) }] };
});

server.registerTool('design_effect_audit', {
  title: 'Audit Requested Visual Effects',
  description: 'Fail generated work that claims cursor trails, neon scrollbars, motion chrome, screenshots, text effects, Theatre direction, GSAP scroll, or Three/R3F scenes without source signals.',
  inputSchema: {
    source: z.string().optional().describe('Concatenated generated source files'),
    requested: z.array(z.enum(['cursorTrail', 'neonScrollbar', 'textEffects', 'motionChrome', 'livingBackground', 'surfaceScreenshots', 'theatre', 'gsapScroll', 'threeCanvas'])).optional().describe('Requested effects to verify')
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

server.registerTool('design_component_plan', {
  title: 'Compose Component Use Case Plan',
  description: 'Choose Skye UI/component use cases flexibly while forcing selected/full stack, runtime proof, quality gates, and browser evidence.',
  inputSchema: {
    product: z.string().optional(),
    surface: z.string().optional(),
    goal: z.string().optional(),
    audience: z.string().optional(),
    useCases: z.array(z.string()).optional().describe('Use-case ids from quantumskyes://design/component-use-cases'),
    componentIds: z.array(z.string()).optional().describe('Component ids or aliases such as highlighter, tabs, orbiting-circles, gsap-scroll-stage'),
    effects: z.array(z.enum(['cursorTrail', 'neonScrollbar', 'textEffects', 'motionChrome', 'livingBackground', 'surfaceScreenshots', 'theatre', 'gsapScroll', 'threeCanvas'])).optional(),
    requiredStack: z.array(z.enum(['framerMotion', 'three', 'gsap', 'lenis', 'motion', 'r3f', 'drei', 'postprocessing', 'theatre', 'dotlottie', 'rive', 'ogl', 'pixi'])).optional(),
    stackMode: z.enum(['selected', 'full']).optional().describe('full is the default MCP contract; selected is for explicitly narrowed scope')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(componentPlan(args), null, 2) }] };
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

server.registerTool('design_template_manifest', {
  title: 'List Skye MCP Templates',
  description: 'Return extracted/revised changelog, blog, and portfolio template packs now wired into the local MCP.',
  inputSchema: {}
}, async () => {
  return { content: [{ type: 'text', text: JSON.stringify(templateManifest(), null, 2) }] };
});

server.registerTool('design_template_pack', {
  title: 'Get Skye MCP Template Pack',
  description: 'Return key files from one revised template pack: changelog, blog, or portfolio.',
  inputSchema: {
    templateId: z.string().describe('Template id: changelog, blog, portfolio, or the full magicuidesign folder name'),
    includeFiles: z.array(z.string()).optional().describe('Optional additional template-relative files to include')
  }
}, async ({ templateId, includeFiles = [] }) => {
  return { content: [{ type: 'text', text: JSON.stringify(templatePack(templateId, includeFiles), null, 2) }] };
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

server.registerTool('design_stack_catalog', {
  title: 'Get Advanced Frontend Stack Catalog',
  description: 'Return the MCP-approved frontend stack catalog: GSAP, Framer Motion, Motion, Lenis, Three/R3F/Drei/postprocessing, Theatre, dotLottie, Rive, OGL, Pixi, React Bits, Animata.',
  inputSchema: {
    category: z.string().optional().describe('Optional category, e.g. animation, scroll, 3d, directed-motion, vector-motion, shader-canvas, canvas-2d, inspiration'),
    libraryId: z.string().optional().describe('Optional library id, e.g. gsap, framer-motion, three, react-three-fiber, dotlottie'),
    packageName: z.string().optional().describe('Optional npm package name or partial package name')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(stackCatalog(args), null, 2) }] };
});

server.registerTool('design_recipe_plan', {
  title: 'Compose Open Source Recipe Plan',
  description: 'Turn a product/surface/effect request into required open-source recipes, stack imports, and audits.',
  inputSchema: {
    product: z.string().optional(),
    surface: z.string().optional(),
    goal: z.string().optional(),
    audience: z.string().optional(),
    effects: z.array(z.enum(['cursorTrail', 'neonScrollbar', 'textEffects', 'motionChrome', 'livingBackground', 'surfaceScreenshots', 'theatre', 'gsapScroll', 'threeCanvas'])).optional()
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(recipePlan(args), null, 2) }] };
});

server.registerTool('design_variety_plan', {
  title: 'Compose Design Variety Plan',
  description: 'Choose distinct design DNA and pattern packs so high-end pages do not all become the same SkyeSol-style site.',
  inputSchema: {
    product: z.string().optional(),
    surface: z.string().optional(),
    goal: z.string().optional(),
    audience: z.string().optional(),
    previousArchetype: z.string().optional().describe('Prior page archetype to avoid repeating'),
    preferredArchetype: z.string().optional().describe('Optional archetype to force when the user already chose one')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(varietyPlan(args), null, 2) }] };
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
      'Read quantumskyes://design/component-use-cases',
      'Read quantumskyes://design/variety-system',
      'Read quantumskyes://design/templates when the user asks for changelog, blog, portfolio, release receipt, field notes, or operator-profile work',
      'Read quantumskyes://design/lab/registry for Skye Design Lab patterns and do not ignore MCP/skye-design-lab',
      'Call design_variety_plan and record the chosen design DNA before coding',
      'Read quantumskyes://design/logo-standards before creating or replacing any logo/mark',
      'Pick an approved first-viewport pattern',
      'Call design_component_plan and record selected use cases/components before coding',
      'Call design_recipe_plan for the requested product/effects',
      'Call design_open_source_stack and select concrete open-source recipes before applying brand styling',
      'Call design_logo_manifest and use existing logo assets before inventing a new mark',
      'Call design_template_manifest or design_template_pack when a revised template can serve the requested surface',
      'Call design_logo_audit when a logo, brand mark, wordmark, or nav identity appears in source',
      'Read quantumskyes://design/surface-video-reel when app surfaces, workflows, screenshots, or proof video are requested',
      'Read quantumskyes://content/first-person-operator-voice for founder/operator public copy',
      'Run design_content_generate or design_content_audit when writing public copy',
      'Run design_validate on public copy/markup',
      'Run design_stack_audit when the brief requires Motion, GSAP, Lenis, Three, R3F, Drei, or postprocessing',
      'Run design_runtime_stack_gate with source, packageJson, selected components/required stack, and browserReport proving the stack is active in the rendered app',
      'Run design_effect_audit when screenshots, cursor trail, neon scrollbar, motion chrome, text effects, Theatre, scroll stage, or Three/R3F canvas are requested',
      'Run design_e2e_proof_audit whenever copy says the app routes, logs in, signs up, restores, monitors, filters, deploys, or does another workflow',
      'Run design_performance_audit before browser QA; reject lazy Lenis, high DPR, high particles, eager screenshots, and missing reduced-motion/mobile fallbacks',
      'Capture browser screenshot at 1440x1000',
      'Capture browser screenshot at 390x844',
      'Include runtime evidence in browser QA: motion transforms changed, GSAP/ScrollTrigger progressed, Lenis is active, WebGL canvas has nonblank pixels, and vector/scene assets reported ready when selected',
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

Read the directive, registry, component use-case registry, elements registry, open-source stack recipes, pattern manifest, advanced stack guide, and no-frankenstein policy first. Avoid long left-column hero text, disconnected images, internal MCP/proof copy, negative letter spacing, and repeated dark SaaS templates. Choose one primary visual subject, call design_component_plan, call design_open_source_stack for concrete recipes, call design_pattern_pack for the required implementation patterns, run design_stack_audit and design_runtime_stack_gate if advanced stack is required, run design_e2e_proof_audit when workflow claims appear, then verify desktop/mobile screenshots, runtime evidence, and video playback before completion.`
      }
    }
  ]
}));

server.registerResource('fifty-k-standard', 'quantumskyes://design/fifty-k-standard', {
  title: '$50K Design Standard',
  description: 'What separates $50K bespoke digital work from $5K templates — typography, whitespace, choreography, and singular visual thesis.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, `# $50K Design Standard

## What a $50K website has that a $5K template does not

### Visual Thesis
One dominant idea drives every composition decision. Not a list of features. Not a card grid. One idea — fully committed to — visible in the first viewport.

### Typographic Intention
- **Architectural scale**: hero headline at \`clamp(3.5rem, 8vw, 9rem)\` or larger
- **Intentional tracking**: \`letter-spacing: -0.02em\` to \`-0.04em\` on display text
- **Tight line-height**: \`0.9\`–\`1.05\` on headlines, never auto
- **Weight contrast**: Black/ExtraBold display + Regular/Light body
- **No system fonts** in hero headlines

### Strategic Whitespace
The most expensive-looking ingredient is space.
- First viewport ≥30% negative space
- Section \`padding-block: clamp(6rem, 12vw, 10rem)\`
- Hero inner \`padding-block: clamp(8rem, 15vw, 14rem)\`
- Content \`padding-inline: clamp(2rem, 6vw, 6rem)\`
- Hero body copy ≤2 lines on first load

### Motion Choreography
Every animation has purpose, timing, and arc.
- Custom easing: \`--ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1)\`
- Staggered entrance: headline (0ms) → subtext (80ms) → CTA (160ms) → visual (240ms)
- Duration: \`400ms\`–\`700ms\` for reveals
- Scroll stagger: elements reveal at offset positions

### Bespoke Interaction
At least one treatment that could not come from a UI kit:
- Magnetic button pull
- Cursor-reactive spring with custom lerp
- Clip-path or mask reveal on hover
- SVG underline draw timing
- Tilt/parallax surface panel

## Audit
Run \`design_luxury_audit\` to score typography, whitespace, choreography, and bespoke interaction.

- **$50K**: ≥90% score, 0 critical issues
- **$20K**: 70%–89%, ≤2 issues
- **$10K**: 50%–69%, resolvable with targeted fixes
- **$5K template**: <50%, requires redesign
`));

server.registerTool('design_luxury_audit', {
  title: '$50K Design Quality Audit',
  description: 'Score the output against $50K design criteria: architectural typography scale, intentional tracking/line-height/weight-contrast, strategic whitespace (hero ≥8rem, sections ≥6rem, horizontal room), custom cubic-bezier motion choreography, staggered entrance sequence, and at least one bespoke interaction.',
  inputSchema: {
    source: z.string().optional().describe('Concatenated source: CSS, HTML, JSX, TSX — all styling and motion code'),
    level: z.enum(['typography', 'whitespace', 'motion', 'full']).optional().describe('Audit scope; defaults to full')
  }
}, async (args) => {
  return { content: [{ type: 'text', text: JSON.stringify(luxuryAudit(args), null, 2) }] };
});

server.registerResource('production-ledger', 'quantumskyes://production/ledger', {
  title: 'CEO Live Deployment Ledger',
  description: 'Canonical production surface inventory — 13 Cloudflare Pages, 11 Workers, 36 HTTP checks. Source of truth pulled from API, not estimates.',
  mimeType: 'text/markdown'
}, (uri) => textResource(uri, readIfExists(path.join(repoRoot, 'LIVE_DEPLOYMENT_LEDGER.md'), 'Ledger not found.')));

server.registerTool('production_ledger', {
  title: 'CEO Live Deployment Ledger',
  description: 'Return the canonical LIVE_DEPLOYMENT_LEDGER.md — all deployed Cloudflare Pages projects, Workers, HTTP verification results, and the CEO Contribution Map.',
  inputSchema: {}
}, async () => {
  const ledgerPath = path.join(repoRoot, 'LIVE_DEPLOYMENT_LEDGER.md');
  const text = readIfExists(ledgerPath, 'Ledger not found at LIVE_DEPLOYMENT_LEDGER.md.');
  return { content: [{ type: 'text', text }] };
});

return server;
}

export async function runStdioServer() {
  const server = createQuantumSkyesMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.resume();
  setInterval(() => {}, 1 << 30);
}

// Always run as CLI when installed via npm
await runStdioServer();
