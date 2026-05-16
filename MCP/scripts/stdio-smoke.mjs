#!/usr/bin/env node

import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, '..');
const parent = path.dirname(mcpRoot);
const repoRoot = path.basename(parent) === 'mcp_design_reference'
  ? path.resolve(mcpRoot, '..', '..')
  : path.resolve(mcpRoot, '..');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(mcpRoot, 'stdio-server.mjs')],
  env: {
    ...process.env,
    REPO_ROOT: repoRoot
  }
});

const client = new Client({
  name: 'quantumskyes-stdio-smoke',
  version: '0.1.0'
});

await client.connect(transport);

try {
  const resources = await client.listResources();
  const resourceUris = resources.resources.map((resource) => resource.uri);
  assert(resourceUris.includes('quantumskyes://workspace/overview'), 'workspace overview resource missing');
  assert(resourceUris.includes('quantumskyes://runtime/apps'), 'runtime app index resource missing');
  assert(resourceUris.includes('quantumskyes://design/index'), 'design index resource missing');
  assert(resourceUris.includes('quantumskyes://directives/index'), 'directives index resource missing');
  assert(resourceUris.includes('quantumskyes://design/elements'), 'design elements resource missing');
  assert(resourceUris.includes('quantumskyes://design/no-frankenstein-policy'), 'no-frankenstein policy resource missing');
  assert(resourceUris.includes('quantumskyes://design/perfection-checklist'), 'perfection checklist resource missing');
  assert(resourceUris.includes('quantumskyes://design/advanced-stack'), 'advanced stack resource missing');
  assert(resourceUris.includes('quantumskyes://design/stack-catalog'), 'advanced stack catalog resource missing');
  assert(resourceUris.includes('quantumskyes://design/open-source-stack'), 'open-source stack resource missing');
  assert(resourceUris.includes('quantumskyes://design/logo-standards'), 'logo standards resource missing');
  assert(resourceUris.includes('quantumskyes://design/surface-video-reel'), 'surface video reel resource missing');
  assert(resourceUris.includes('quantumskyes://content/first-person-operator-voice'), 'first-person content voice resource missing');
  assert(resourceUris.includes('quantumskyes://design/assets-manifest'), 'assets manifest resource missing');
  assert(resourceUris.includes('quantumskyes://design/pattern-manifest'), 'pattern manifest resource missing');

  const templates = await client.listResourceTemplates();
  const templateUris = templates.resourceTemplates.map((template) => template.uriTemplate);
  assert(templateUris.includes('quantumskyes://file/{path}'), 'repo file template missing');
  assert(templateUris.includes('quantumskyes://design/file/{path}'), 'design file template missing');

  const overview = await client.readResource({ uri: 'quantumskyes://workspace/overview' });
  const overviewText = overview.contents.map((item) => item.text || '').join('\n');
  assert(overviewText.includes('Standalone apps'), 'overview did not include app count');
  assert(overviewText.includes('Use local design references first'), 'overview did not include design rule');

  const apps = await client.readResource({ uri: 'quantumskyes://runtime/apps' });
  const appsText = apps.contents.map((item) => item.text || '').join('\n');
  assert(appsText.includes('SkyeWebCreatorMax'), 'runtime app index did not include SkyeWebCreatorMax');

  const voice = await client.readResource({ uri: 'quantumskyes://content/first-person-operator-voice' });
  const voiceText = voice.contents.map((item) => item.text || '').join('\n');
  assert(voiceText.includes('I do not sell websites'), 'content voice resource did not include public spectacle reference');

  const logoStandards = await client.readResource({ uri: 'quantumskyes://design/logo-standards' });
  const logoStandardsText = logoStandards.contents.map((item) => item.text || '').join('\n');
  assert(logoStandardsText.includes('Rounded-square initial tiles'), 'logo standards should reject initial tiles');

  const surfaceVideo = await client.readResource({ uri: 'quantumskyes://design/surface-video-reel' });
  const surfaceVideoText = surfaceVideo.contents.map((item) => item.text || '').join('\n');
  assert(surfaceVideoText.includes('ffmpeg'), 'surface video resource should document ffmpeg workflow');
  assert(surfaceVideoText.includes('browser doing'), 'surface video resource should require browser-action proof');

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  assert(toolNames.includes('repo_read'), 'repo_read tool missing');
  assert(toolNames.includes('design_find'), 'design_find tool missing');
  assert(toolNames.includes('design_validate'), 'design_validate tool missing');
  assert(toolNames.includes('design_content_audit'), 'design_content_audit tool missing');
  assert(toolNames.includes('design_content_generate'), 'design_content_generate tool missing');
  assert(toolNames.includes('design_quality_gate'), 'design_quality_gate tool missing');
  assert(toolNames.includes('design_stack_audit'), 'design_stack_audit tool missing');
  assert(toolNames.includes('design_effect_audit'), 'design_effect_audit tool missing');
  assert(toolNames.includes('design_e2e_proof_audit'), 'design_e2e_proof_audit tool missing');
  assert(toolNames.includes('design_performance_audit'), 'design_performance_audit tool missing');
  assert(toolNames.includes('design_elements'), 'design_elements tool missing');
  assert(toolNames.includes('design_compose_brief'), 'design_compose_brief tool missing');
  assert(toolNames.includes('design_asset_manifest'), 'design_asset_manifest tool missing');
  assert(toolNames.includes('design_logo_manifest'), 'design_logo_manifest tool missing');
  assert(toolNames.includes('design_logo_audit'), 'design_logo_audit tool missing');
  assert(toolNames.includes('design_pattern_pack'), 'design_pattern_pack tool missing');
  assert(toolNames.includes('design_open_source_stack'), 'design_open_source_stack tool missing');
  assert(toolNames.includes('design_stack_catalog'), 'design_stack_catalog tool missing');
  assert(toolNames.includes('design_recipe_plan'), 'design_recipe_plan tool missing');

  const elements = await client.callTool({
    name: 'design_elements',
    arguments: { namespace: 'skye.core', type: 'hero' }
  });
  const elementsText = elements.content.map((item) => item.text || '').join('\n');
  assert(elementsText.includes('skye.core.full-width-command-hero'), 'elements tool did not return core hero');

  const brief = await client.callTool({
    name: 'design_compose_brief',
    arguments: {
      product: 'Skye Design MCP',
      surface: 'developer MCP server docs',
      goal: 'developer adoption'
    }
  });
  const briefText = brief.content.map((item) => item.text || '').join('\n');
  assert(briefText.includes('primaryPattern'), 'compose brief did not return primary pattern');
  assert(briefText.includes('requiredStack'), 'compose brief did not return required stack');
  assert(briefText.includes('openSourceRecipes'), 'compose brief did not return open-source recipes');
  assert(briefText.includes('design_stack_audit'), 'compose brief did not require stack audit');
  assert(briefText.includes('No left-column text wall'), 'compose brief did not include forbidden layout rule');

  const pattern = await client.callTool({
    name: 'design_pattern_pack',
    arguments: { patternId: 'cinematic-command-hero' }
  });
  const patternText = pattern.content.map((item) => item.text || '').join('\n');
  assert(patternText.includes('CinematicCommandHero.tsx'), 'pattern pack did not return hero implementation');
  assert(patternText.includes('@react-three/fiber'), 'pattern pack did not include R3F dependency');
  assert(patternText.includes('EffectComposer'), 'pattern pack did not include postprocessing usage');

  const chromePattern = await client.callTool({
    name: 'design_pattern_pack',
    arguments: { patternId: 'neon-motion-chrome' }
  });
  const chromePatternText = chromePattern.content.map((item) => item.text || '').join('\n');
  assert(chromePatternText.includes('NeonMotionChrome.tsx'), 'pattern pack did not return neon motion chrome implementation');
  assert(chromePatternText.includes('::-webkit-scrollbar'), 'neon motion chrome pattern should include custom scrollbar CSS');
  assert(chromePatternText.includes('useScroll'), 'neon motion chrome pattern should include scroll progress motion');

  const recipe = await client.callTool({
    name: 'design_open_source_stack',
    arguments: { recipeId: 'framer-motion-interaction-system' }
  });
  const recipeText = recipe.content.map((item) => item.text || '').join('\n');
  assert(recipeText.includes('framer-motion'), 'open-source recipe did not return Framer Motion recipe');
  assert(recipeText.includes('useMotionValue'), 'open-source recipe did not include concrete Framer Motion import');

  const stackCatalog = await client.callTool({
    name: 'design_stack_catalog',
    arguments: { category: '3d' }
  });
  const stackCatalogText = stackCatalog.content.map((item) => item.text || '').join('\n');
  assert(stackCatalogText.includes('@react-three/fiber'), 'stack catalog should expose React Three Fiber');
  assert(stackCatalogText.includes('@react-three/drei'), 'stack catalog should expose Drei');
  assert(stackCatalogText.includes('@react-three/postprocessing'), 'stack catalog should expose postprocessing');

  const motionCatalog = await client.callTool({
    name: 'design_stack_catalog',
    arguments: { category: 'animation' }
  });
  const motionCatalogText = motionCatalog.content.map((item) => item.text || '').join('\n');
  assert(motionCatalogText.includes('framer-motion'), 'stack catalog should expose Framer Motion');
  assert(motionCatalogText.includes('"motion"'), 'stack catalog should expose Motion');

  const vectorRecipe = await client.callTool({
    name: 'design_open_source_stack',
    arguments: { tag: 'rive' }
  });
  const vectorRecipeText = vectorRecipe.content.map((item) => item.text || '').join('\n');
  assert(vectorRecipeText.includes('@rive-app/react-canvas'), 'open-source stack should expose Rive recipe');

  const recipePlan = await client.callTool({
    name: 'design_recipe_plan',
    arguments: {
      product: 'Advanced website',
      surface: 'public page with Framer Motion, Three.js, cursor trail, neon scrollbar, screenshots, GSAP Lenis, Theatre',
      effects: ['cursorTrail', 'neonScrollbar', 'textEffects', 'motionChrome', 'surfaceScreenshots', 'theatre', 'gsapScroll', 'threeCanvas']
    }
  });
  const recipePlanText = recipePlan.content.map((item) => item.text || '').join('\n');
  assert(recipePlanText.includes('theatre-directed-scene'), 'recipe plan should include Theatre recipe');
  assert(recipePlanText.includes('neon-scrollbar-cursor-trail'), 'recipe plan should include cursor/scrollbar recipe');
  assert(recipePlanText.includes('neon-motion-chrome-kit'), 'recipe plan should include neon motion chrome recipe');
  assert(recipePlanText.includes('actual-surface-video-reel'), 'recipe plan should include screenshot video reel recipe');

  const logoManifest = await client.callTool({
    name: 'design_logo_manifest',
    arguments: {}
  });
  const logoManifestText = logoManifest.content.map((item) => item.text || '').join('\n');
  assert(logoManifestText.includes('metraiyux-0s-logo-transparent.png'), 'logo manifest should include MetrAIyux transparent logo');
  assert(logoManifestText.includes('skyes-primary-logo.png'), 'logo manifest should include Skye primary logo');

  const badLogo = await client.callTool({
    name: 'design_logo_audit',
    arguments: {
      product: 'MetrAIyux 0S',
      source: '<a class="brand"><span class="brand-mark-text">M</span>MetrAIyux 0S</a>.brand-mark-text{border-radius:18px;background:linear-gradient(#f8cb5e,#64d9ff);box-shadow:0 0 18px #64d9ff}'
    }
  });
  const badLogoText = badLogo.content.map((item) => item.text || '').join('\n');
  assert(badLogoText.includes('"ok": false'), 'logo audit should reject generated initial badge');
  assert(badLogoText.includes('Text-only initial badge'), 'logo audit should name the initial badge issue');

  const goodLogo = await client.callTool({
    name: 'design_logo_audit',
    arguments: {
      product: 'MetrAIyux 0S',
      source: '<a class="brand"><img src="assets/metraiyux-0s-logo-transparent.png" alt="MetrAIyux 0S"></a>'
    }
  });
  const goodLogoText = goodLogo.content.map((item) => item.text || '').join('\n');
  assert(goodLogoText.includes('"ok": true'), 'logo audit should pass existing logo asset usage');

  const generatedContent = await client.callTool({
    name: 'design_content_generate',
    arguments: {
      product: 'MetrAIyux 0S',
      audience: 'serious operators',
      components: ['public front door', 'client workspace', 'founder command deck', 'SkyeGateFS27 access', 'proof receipts', 'sixteen operating brains'],
      format: 'hero'
    }
  });
  const generatedContentText = generatedContent.content.map((item) => item.text || '').join('\n');
  assert(generatedContentText.includes('I do not sell websites'), 'content generator should use first-person hero pattern');
  assert(generatedContentText.includes('SkyeGateFS27 access'), 'content generator should include concrete components');
  assert(generatedContentText.includes('"ok": true'), 'generated content should pass its own audit');

  const badContent = await client.callTool({
    name: 'design_content_audit',
    arguments: {
      content: 'We help businesses streamline operations with best-in-class innovative solutions.'
    }
  });
  const badContentText = badContent.content.map((item) => item.text || '').join('\n');
  assert(badContentText.includes('"ok": false'), 'content audit should reject generic agency voice');
  assert(badContentText.includes('first-person'), 'content audit should require first-person voice');

  const goodCollectiveContent = await client.callTool({
    name: 'design_content_audit',
    arguments: {
      content: 'I built the command room. We route the work through our brains, agents, networks, gates, and proof receipts before it hits the protected rooms.'
    }
  });
  const goodCollectiveContentText = goodCollectiveContent.content.map((item) => item.text || '').join('\n');
  assert(goodCollectiveContentText.includes('"ok": true'), 'content audit should allow first-person plural company-machine voice');

  const badCopy = await client.callTool({
    name: 'design_validate',
    arguments: {
      content: 'Public landing hero with left-column hero copy. MCP smoke proof not found during build. h1{letter-spacing:-.06em}'
    }
  });
  const badCopyText = badCopy.content.map((item) => item.text || '').join('\n');
  assert(badCopyText.includes('"ok": false'), 'design_validate should reject bad public copy');
  assert(badCopyText.includes('Negative letter-spacing'), 'design_validate should catch negative letter spacing');

  const fakeAdvanced = await client.callTool({
    name: 'design_validate',
    arguments: {
      content: 'This premium page uses Three.js, GSAP, Lenis, and motion, but it is only a static dark SaaS template.'
    }
  });
  const fakeAdvancedText = fakeAdvanced.content.map((item) => item.text || '').join('\n');
  assert(fakeAdvancedText.includes('Advanced stack claimed but missing real import'), 'design_validate should reject fake advanced-stack claims');
  assert(fakeAdvancedText.includes('Generic/repeated template signal'), 'design_validate should reject generic template signals');

  const badStack = await client.callTool({
    name: 'design_stack_audit',
    arguments: {
      packageJson: '{"dependencies":{"three":"latest","gsap":"latest","lenis":"latest"}}',
      source: 'export function StaticCards(){ return null }',
      required: ['three', 'gsap', 'lenis']
    }
  });
  const badStackText = badStack.content.map((item) => item.text || '').join('\n');
  assert(badStackText.includes('"ok": false'), 'design_stack_audit should fail missing imports');
  assert(badStackText.includes('missingImports'), 'design_stack_audit should list missing imports');

  const goodStack = await client.callTool({
    name: 'design_stack_audit',
    arguments: {
      packageJson: '{"dependencies":{"three":"latest","gsap":"latest","lenis":"latest","framer-motion":"latest","@react-three/fiber":"latest","@react-three/drei":"latest","@react-three/postprocessing":"latest","@theatre/core":"latest","@lottiefiles/dotlottie-web":"latest","@rive-app/react-canvas":"latest","ogl":"latest","pixi.js":"latest"}}',
      source: "import * as THREE from 'three';\nimport gsap from 'gsap';\nimport { ScrollTrigger } from 'gsap/ScrollTrigger';\nimport Lenis from 'lenis';\nimport { motion } from 'framer-motion';\nimport { Canvas } from '@react-three/fiber';\nimport { Float } from '@react-three/drei';\nimport { EffectComposer } from '@react-three/postprocessing';\nimport { getProject } from '@theatre/core';\nimport { DotLottie } from '@lottiefiles/dotlottie-web';\nimport { useRive } from '@rive-app/react-canvas';\nimport { Renderer } from 'ogl';\nimport { Application } from 'pixi.js';\ngsap.registerPlugin(ScrollTrigger); new Lenis(); new DotLottie({ canvas: document.createElement('canvas'), src: '/motion.lottie' }); useRive({ src: '/motion.riv' }); new Renderer(); new Application(); console.log(THREE.Scene, motion, Canvas, Float, EffectComposer, getProject);",
      required: ['three', 'gsap', 'lenis', 'framerMotion', 'r3f', 'drei', 'postprocessing', 'theatre', 'dotlottie', 'rive', 'ogl', 'pixi']
    }
  });
  const goodStackText = goodStack.content.map((item) => item.text || '').join('\n');
  assert(goodStackText.includes('"ok": true'), 'design_stack_audit should pass real imports');

  const badEffects = await client.callTool({
    name: 'design_effect_audit',
    arguments: {
      source: 'export function Plain(){ return <main /> }',
      requested: ['cursorTrail', 'neonScrollbar', 'surfaceScreenshots']
    }
  });
  const badEffectsText = badEffects.content.map((item) => item.text || '').join('\n');
  assert(badEffectsText.includes('"ok": false'), 'design_effect_audit should fail missing requested effects');

  const goodEffects = await client.callTool({
    name: 'design_effect_audit',
    arguments: {
      source: "import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion'; window.addEventListener('pointermove', () => {}); const css = '::-webkit-scrollbar{width:16px}::-webkit-scrollbar-track{border:1px solid rgba(100,217,255,.08);background:rgba(255,255,255,.08)}::-webkit-scrollbar-thumb{background:linear-gradient(#f8cb5e,#64d9ff);box-shadow:0 0 18px #64d9ff}.glow-text{text-shadow:0 0 12px #fff;background-clip:text}.scroll-progress{}.motion-chrome .scanline{}.neon-magnetic{}'; const img = <img className='surface-frame' src='/proof.png' />;",
      requested: ['cursorTrail', 'neonScrollbar', 'textEffects', 'motionChrome', 'surfaceScreenshots']
    }
  });
  const goodEffectsText = goodEffects.content.map((item) => item.text || '').join('\n');
  assert(goodEffectsText.includes('"ok": true'), 'design_effect_audit should pass real effect signals');

  const badE2eProof = await client.callTool({
    name: 'design_e2e_proof_audit',
    arguments: {
      claims: ['The app routes buyers to the right proof surface after signup.'],
      source: '<section class="proof"><img src="/landing.png" alt="Landing page proof"></section>',
      proofReport: 'Desktop screenshot captured.'
    }
  });
  const badE2eProofText = badE2eProof.content.map((item) => item.text || '').join('\n');
  assert(badE2eProofText.includes('"ok": false'), 'design_e2e_proof_audit should reject static-only workflow proof');
  assert(badE2eProofText.includes('browser doing'), 'design_e2e_proof_audit should explain browser action proof');

  const goodE2eProof = await client.callTool({
    name: 'design_e2e_proof_audit',
    arguments: {
      claims: ['The app routes buyers to the right proof surface after signup.'],
      source: '<video autoplay muted loop playsinline poster="/route-proof-poster.png"><source src="/route-proof.mp4" type="video/mp4"><source src="/route-proof.webm" type="video/webm"></video>',
      proofReport: 'Playwright E2E browser recording saved to /route-proof.mp4. recordVideo enabled. page.goto, page.click, page.fill, page.mouse.wheel, and page.click submit completed the route. Browser check: video readyState >= 2, currentTime > 0, paused === false, visible in viewport.'
    }
  });
  const goodE2eProofText = goodE2eProof.content.map((item) => item.text || '').join('\n');
  assert(goodE2eProofText.includes('"ok": true'), 'design_e2e_proof_audit should pass browser-recorded workflow proof');

  const badPerformance = await client.callTool({
    name: 'design_performance_audit',
    arguments: {
      source: "import Lenis from 'lenis'; import { Canvas } from '@react-three/fiber'; new Lenis({ lerp: 0.08 }); const count = 1800; const App = () => <><Canvas dpr={2}/><img src='/proof.png' /></>;"
    }
  });
  const badPerformanceText = badPerformance.content.map((item) => item.text || '').join('\n');
  assert(badPerformanceText.includes('"ok": false'), 'design_performance_audit should fail lazy/heavy output');
  assert(badPerformanceText.includes('Lenis lerp'), 'design_performance_audit should catch lazy Lenis');
  assert(badPerformanceText.includes('DPR'), 'design_performance_audit should catch high DPR');

  const goodPerformance = await client.callTool({
    name: 'design_performance_audit',
    arguments: {
      source: "import Lenis from 'lenis'; import { Canvas } from '@react-three/fiber'; const isCompact = window.innerWidth < 700; new Lenis({ lerp: 0.18, smoothWheel: true }); const count = isCompact ? 520 : 980; const App = () => <><Canvas dpr={[1, isCompact ? 1.05 : 1.25]} /><img src='/proof.png' loading='lazy' decoding='async' /></>; const css = '@media (pointer: coarse), (prefers-reduced-motion: reduce){.cursor-trail{display:none}}';"
    }
  });
  const goodPerformanceText = goodPerformance.content.map((item) => item.text || '').join('\n');
  assert(goodPerformanceText.includes('"ok": true'), 'design_performance_audit should pass tuned output');

  const proof = {
    ok: true,
    resources: resourceUris,
    templates: templateUris,
    tools: toolNames
  };
  console.log(JSON.stringify(proof, null, 2));
} finally {
  await client.close();
}
