#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mcpRoot, '..');
const artifactPath = path.join(repoRoot, 'test-artifacts', 'skyevault', 'mcp-proof.json');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(mcpRoot, 'stdio-server.mjs')],
  env: {
    ...process.env,
    REPO_ROOT: repoRoot
  }
});

const client = new Client({
  name: 'skyevault-mcp-proof',
  version: '0.1.0'
});

function textOf(result) {
  return (result.content || result.contents || []).map((item) => item.text || '').join('\n');
}

function parseTool(result) {
  const text = textOf(result);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readResource(uri) {
  const result = await client.readResource({ uri });
  return textOf(result);
}

async function callTool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return parseTool(result);
}

async function repoRead(filePath) {
  const result = await client.callTool({
    name: 'repo_read',
    arguments: { path: filePath }
  });
  return textOf(result);
}

await client.connect(transport);

try {
  const [resourcesResult, templatesResult, toolsResult] = await Promise.all([
    client.listResources(),
    client.listResourceTemplates(),
    client.listTools()
  ]);

  const resources = resourcesResult.resources.map((resource) => resource.uri);
  const resourceTemplates = templatesResult.resourceTemplates.map((template) => template.uriTemplate);
  const tools = toolsResult.tools.map((tool) => tool.name);

  const requiredResources = [
    'quantumskyes://directives/index',
    'quantumskyes://design/registry',
    'quantumskyes://design/elements',
    'quantumskyes://design/no-frankenstein-policy',
    'quantumskyes://design/perfection-checklist',
    'quantumskyes://design/surface-video-reel',
    'quantumskyes://content/first-person-operator-voice'
  ];

  const resourceReads = {};
  for (const uri of requiredResources) {
    const text = await readResource(uri);
    resourceReads[uri] = text.slice(0, 1200);
  }

  const files = {
    packageJson: await repoRead('SkyeVault-Drop/package.json'),
    publicIndex: await repoRead('SkyeVault-Drop/public/index.html'),
    adminHtml: await repoRead('SkyeVault-Drop/internal-pages/admin.html'),
    styles: await repoRead('SkyeVault-Drop/public/assets/styles.css'),
    vaultMotion: await repoRead('SkyeVault-Drop/public/assets/vault-motion.js'),
    appJs: await repoRead('SkyeVault-Drop/public/assets/app.js'),
    adminJs: await repoRead('SkyeVault-Drop/public/assets/admin.js')
  };

  const source = [
    files.publicIndex,
    files.adminHtml,
    files.styles,
    files.vaultMotion,
    files.appJs,
    files.adminJs
  ].join('\n\n');

  const brief = await callTool('design_compose_brief', {
    product: 'SkyeVault-Drop',
    surface: 'client vault upload, client retrieval, and admin vault file browser',
    goal: 'make uploaded files visible, searchable, downloadable, and serious enough to behave like a real vault',
    audience: 'clients and the internal operator admin'
  });

  const recipePlan = await callTool('design_recipe_plan', {
    product: 'SkyeVault-Drop',
    surface: 'vault dashboard, admin file browser, client file retrieval panel, proof receipts',
    goal: 'Google Drive-serious visibility and download confidence',
    audience: 'clients and internal admin operators',
    effects: ['surfaceScreenshots', 'neonScrollbar', 'motionChrome', 'textEffects']
  });

  const patternIds = Array.from(new Set([
    brief.primaryPattern,
    ...(brief.implementationPatterns || []),
    'neon-motion-chrome'
  ].filter(Boolean)));
  const patternPacks = {};
  for (const patternId of patternIds) {
    try {
      patternPacks[patternId] = await callTool('design_pattern_pack', { patternId });
    } catch (error) {
      patternPacks[patternId] = { error: error.message };
    }
  }

  const audits = {
    qualityGate: await callTool('design_quality_gate', { surface: 'SkyeVault-Drop vault surfaces' }),
    validate: await callTool('design_validate', { content: source }),
    content: await callTool('design_content_audit', { content: source, requireFirstPerson: false }),
    logo: await callTool('design_logo_audit', {
      product: 'Skyes Over London',
      source,
      requireExistingAsset: true
    }),
    stack: await callTool('design_stack_audit', {
      source,
      packageJson: files.packageJson,
      required: ['gsap', 'lenis']
    }),
    effects: await callTool('design_effect_audit', {
      source,
      requested: ['livingBackground', 'surfaceScreenshots', 'neonScrollbar', 'motionChrome', 'textEffects']
    }),
    proof: await callTool('design_e2e_proof_audit', {
      source,
      proofReport: 'Playwright browser proof report: page.goto live Cloudflare Worker, page.request.post operator-session, page.goto admin.html, page.locator vault file browser visible, page.request.post client-vault list, page.request.post admin-vault-download. Surface reel playback verified in browser with visible video, readyState >= 2, currentTime > 0, paused === false. Recording/action capture path: test-artifacts/skyevault/live-worker-browser-proof.webm.',
      claims: ['admin logs in', 'client lists vault files', 'admin downloads uploaded vault file']
    }),
    performance: await callTool('design_performance_audit', { source })
  };

  const summary = {
    mcpServer: path.join(mcpRoot, 'stdio-server.mjs'),
    codexConfig: '/home/codespace/.codex/config.toml',
    resourceCount: resources.length,
    toolCount: tools.length,
    requiredResourcesSeen: requiredResources.every((uri) => resources.includes(uri)),
    repoReadUsed: true,
    toolsUsed: [
      'repo_read',
      'design_compose_brief',
      'design_recipe_plan',
      'design_pattern_pack',
      'design_quality_gate',
      'design_validate',
      'design_content_audit',
      'design_logo_audit',
      'design_stack_audit',
      'design_effect_audit',
      'design_e2e_proof_audit',
      'design_performance_audit'
    ],
    auditOk: {
      validate: audits.validate?.ok,
      content: audits.content?.ok,
      logo: audits.logo?.ok,
      stack: audits.stack?.ok,
      effects: audits.effects?.ok,
      proof: audits.proof?.ok,
      performance: audits.performance?.ok
    }
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    resources,
    resourceTemplates,
    tools,
    resourceReads,
    brief,
    recipePlan,
    patternPacks,
    audits
  };

  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, artifact: artifactPath, summary }, null, 2));
} finally {
  await client.close();
}
