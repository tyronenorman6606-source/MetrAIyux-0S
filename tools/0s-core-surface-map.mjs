#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const generatedAt = new Date().toISOString();
const artifactDir = path.join(repoRoot, 'test-artifacts', '0s-core-surface-map');
const latestJsonPath = path.join(artifactDir, '0s-core-surface-map-latest.json');
const siteDocPath = path.join(repoRoot, 'metraiyux_0s_site', 'docs', '0S_CORE_SURFACE_TEST_MAP_2026-05-28.md');
const obsidianNotePath = path.join(repoRoot, 'obsidian-vault', '00-command-center', '0S Core Surface Test Map.md');
const baseUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';

async function readText(relPath) {
  try {
    return await fs.readFile(path.join(repoRoot, relPath), 'utf8');
  } catch {
    return '';
  }
}

async function readJson(relPath) {
  const text = await readText(relPath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function listFiles(relDir, maxDepth = 2) {
  const root = path.join(repoRoot, relDir);
  const out = [];
  async function walk(dir, depth) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(repoRoot, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (depth < maxDepth) await walk(full, depth + 1);
      } else {
        out.push(rel);
      }
    }
  }
  await walk(root, 0);
  return out.sort();
}

function scriptCommand(scripts, key) {
  return scripts[key] ? `npm run ${key}` : '';
}

function summarizeReceipt(data) {
  if (!data) return { exists: false, ok: false };
  return {
    exists: true,
    ok: Boolean(data.ok),
    generated_at: data.generated_at || data.generatedAt || '',
    schema: data.schema || '',
    failures: Array.isArray(data.failures) ? data.failures.length : undefined
  };
}

function failedMcpCalls(receipt) {
  if (!receipt?.toolCalls) return [];
  return receipt.toolCalls.filter((call) => {
    if (!call.ok) return true;
    try {
      return JSON.parse(call.resultText)?.ok === false;
    } catch {
      return false;
    }
  }).map((call) => {
    let parsed = {};
    try {
      parsed = JSON.parse(call.resultText);
    } catch {}
    return {
      name: call.name,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 4) : [],
      message: parsed.message || call.error || ''
    };
  });
}

function skyewaySummary(text = '') {
  const total = Number(text.match(/"total":(\d+)/)?.[1] || 0);
  const generatedAt = text.match(/"generatedAt":"([^"]+)"/)?.[1] || '';
  return {
    exists: Boolean(text),
    generated_at: generatedAt,
    total_routes: total || null
  };
}

async function mcpSummary(relPath) {
  const receipt = await readJson(relPath);
  return {
    path: relPath,
    exists: Boolean(receipt),
    ok: Boolean(receipt) && failedMcpCalls(receipt).length === 0,
    inventory: receipt?.inventory || null,
    failed_calls: failedMcpCalls(receipt)
  };
}

function workflowById(workflows, id) {
  return workflows.find((workflow) => workflow.id === id) || null;
}

function route(urlPath) {
  return `${baseUrl}${urlPath}`;
}

function mdList(items) {
  if (!items.length) return '- None';
  return items.map((item) => `- ${item}`).join('\n');
}

function mdCodeList(items) {
  return mdList(items.filter(Boolean).map((item) => `\`${item}\``));
}

function tableEscape(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function asciiSafe(value) {
  return String(value || '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2192/g, '->')
    .replace(/\u00a0/g, ' ');
}

async function main() {
  const pkg = await readJson('package.json') || {};
  const scripts = pkg.scripts || {};
  const closure = await readJson('metraiyux_0s_site/data/0s-closure-workflows.json') || {};
  const workflows = closure.workflows || [];
  const aiGate = await readJson('test-artifacts/ai-gate-audit/ai-gate-audit-latest.json');
  const matrix = await readJson('test-artifacts/0s-operating-proof-matrix/0s-operating-proof-matrix-latest.json');
  const obsidianSync = await readJson('metraiyux_0s_site/brain/obsidian-sync.json');
  const skyeVaultMap = await readJson('metraiyux_0s_site/brain/skyevault-vault-map.json');
  const skyeRunnersMap = await readJson('metraiyux_0s_site/brain/skyerunners.json');
  const skyewayRoutes = skyewaySummary(await readText('metraiyux_0s_site/assets/skyeway-routes.js'));

  const files = {
    ascension: await listFiles('metraiyux_0s_site/ascension'),
    expansion: await listFiles('metraiyux_0s_site/branch-expansion'),
    government: await listFiles('metraiyux_0s_site/government'),
    saas: await listFiles('metraiyux_0s_site/saas')
  };

  const surfaces = [
    {
      id: 'shared-owner-gate',
      label: 'Shared FS27/SkyGate/Free99 owner gate',
      kind: 'core-auth',
      paths: [
        'metraiyux_0s_site/cloudflare/worker.js',
        'metraiyux_0s_site/skyegate/source/SkyeGateFS27',
        'metraiyux_0s_site/admin/login.html'
      ],
      routes: [route('/admin/login.html'), route('/api/owner/admin-login')],
      commands: [scriptCommand(scripts, '0s:ai-gate-audit'), scriptCommand(scripts, '0s:core-level-gate-map'), scriptCommand(scripts, '0s:operating-proof-matrix')],
      receipts: ['test-artifacts/ai-gate-audit/ai-gate-audit-latest.json', 'test-artifacts/0s-operating-proof-matrix/0s-operating-proof-matrix-latest.json'],
      workflow: workflowById(workflows, 'shared-owner-gate')
    },
    {
      id: 'skye-music-nexus',
      label: 'Skye Music Nexus',
      kind: 'creator-commerce',
      paths: ['metraiyux_0s_site/SkyeMusicNexus', 'metraiyux_0s_site/tests/skyemusicnexus-*.mjs'],
      routes: [route('/SkyeMusicNexus/index.html'), route('/live/skyemusicnexus-neofront.html')],
      commands: [
        scriptCommand(scripts, '0s:skyemusicnexus:smoke'),
        scriptCommand(scripts, '0s:skyemusicnexus:proof'),
        'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/SkyeMusicNexus'
      ],
      receipts: ['metraiyux_0s_site/SkyeMusicNexus/MCP_TOOLING_RECEIPT.json', 'test-artifacts/direct-mcp/SkyeMusicNexus-mcp-tooling-receipt.json'],
      mcp: await mcpSummary('test-artifacts/direct-mcp/SkyeMusicNexus-mcp-tooling-receipt.json')
    },
    {
      id: 'skyemail',
      label: 'SkyeMail',
      kind: 'mail-ops',
      paths: ['metraiyux_0s_site/live/SkyeMail', 'metraiyux_0s_site/tests/skyemail-founder-offboarding.test.mjs'],
      routes: [route('/live/SkyeMail/session-handoff.html'), 'https://skyemail-platform.graylondonskyes.workers.dev/'],
      commands: [
        scriptCommand(scripts, '0s:skyemail:offboarding-proof'),
        'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/live/SkyeMail'
      ],
      receipts: ['metraiyux_0s_site/live/SkyeMail/MCP_TOOLING_RECEIPT.json', 'test-artifacts/direct-mcp/SkyeMail-mcp-tooling-receipt.json'],
      workflow: workflowById(workflows, 'skymail-company-crm-lane'),
      mcp: await mcpSummary('test-artifacts/direct-mcp/SkyeMail-mcp-tooling-receipt.json')
    },
    {
      id: 'relay13-connectlog',
      label: 'Relay13 + ConnectLog',
      kind: 'communications',
      paths: ['metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof', 'metraiyux_0s_site/connectlog-v7.7-relay13-operator-proof'],
      routes: [route('/live/connectlog-relay13-operator-proof.html'), route('/relay13-core-v1.7-connectlog-operator-proof/public/admin/index.html')],
      commands: [
        scriptCommand(scripts, '0s:connectlog-relay13:proof'),
        scriptCommand(scripts, '0s:connectlog-relay13:prod-proof'),
        scriptCommand(scripts, '0s:relay13-chat:proof'),
        'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof',
        'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/connectlog-v7.7-relay13-operator-proof'
      ],
      receipts: [
        'test-artifacts/connectlog-relay13-production-proof.json',
        'test-artifacts/direct-mcp/relay13-core-v1.7-connectlog-operator-proof-mcp-tooling-receipt.json',
        'test-artifacts/direct-mcp/connectlog-v7.7-relay13-operator-proof-mcp-tooling-receipt.json'
      ],
      workflow: workflowById(workflows, 'relay13-communications-center'),
      mcp: [
        await mcpSummary('test-artifacts/direct-mcp/relay13-core-v1.7-connectlog-operator-proof-mcp-tooling-receipt.json'),
        await mcpSummary('test-artifacts/direct-mcp/connectlog-v7.7-relay13-operator-proof-mcp-tooling-receipt.json')
      ]
    },
    {
      id: 'signin-pro-northstar',
      label: 'Signin Pro / NorthStar',
      kind: 'identity-ui',
      paths: ['metraiyux_0s_site/signinpro', 'metraiyux_0s_site/signin-pro', 'metraiyux_0s_site/northstar'],
      routes: [route('/signinpro/'), route('/signin-pro/'), route('/northstar/index.html')],
      commands: ['node tools/proof-free99-signinpro-demo-live.mjs'],
      receipts: ['test-artifacts/free99-signinpro-demo-live/free99-signinpro-demo-live-latest.json']
    },
    {
      id: 'ascension',
      label: 'Ascension',
      kind: 'executive-sales',
      paths: ['metraiyux_0s_site/ascension'],
      routes: [route('/ascension/index.html')],
      commands: [scriptCommand(scripts, '0s:core-level-gate-map'), 'static/link check via metraiyux_0s_site/proof/ASCENSION_LINK_AUDIT.json'],
      receipts: ['metraiyux_0s_site/proof/ASCENSION_LINK_AUDIT.json'],
      file_count: files.ascension.length
    },
    {
      id: 'expansion',
      label: 'Expansion / Branch Expansion',
      kind: 'market-expansion',
      paths: ['metraiyux_0s_site/branch-expansion', 'metraiyux_0s_site/services/expansion-innovation-lab.html'],
      routes: [route('/branch-expansion/index.html'), route('/services/expansion-innovation-lab.html')],
      commands: [scriptCommand(scripts, '0s:core-level-gate-map'), 'static route audit', 'npm run 0s:operating-proof-matrix'],
      receipts: ['metraiyux_0s_site/proof/skyemusicnexus-expansion-receipt.html', 'metraiyux_0s_site/proof/connectlog-relay13-expansion-receipt.html'],
      file_count: files.expansion.length
    },
    {
      id: 'government',
      label: 'Government / Enterprise Readiness',
      kind: 'public-sector',
      paths: ['metraiyux_0s_site/government', 'metraiyux_0s_site/services/government-enterprise-readiness.html'],
      routes: [route('/government/index.html'), route('/services/government-enterprise-readiness.html')],
      commands: [scriptCommand(scripts, '0s:core-level-gate-map'), 'static route audit', 'content engine: node tools/build-0s-content-engine.mjs'],
      receipts: [],
      file_count: files.government.length
    },
    {
      id: 'saas',
      label: 'SaaS self-serve / tenant workspaces',
      kind: 'customer-platform',
      paths: ['metraiyux_0s_site/saas', 'metraiyux_0s_site/cloudflare-saas-provisioning-worker'],
      routes: [route('/saas/index.html'), route('/saas/signup.html'), route('/saas/customer-dashboard.html')],
      commands: [scriptCommand(scripts, '0s:core-level-gate-map'), scriptCommand(scripts, '0s:real-user-readiness'), scriptCommand(scripts, '0s:founder-company-enrollment')],
      receipts: ['metraiyux_0s_site/proof-vault/saas/SAAS_SELF_SERVE_LINK_AUDIT.json', 'test-artifacts/0s-real-user-readiness/2026-05-27T07-41-38-810Z/receipt.json'],
      workflow: workflowById(workflows, 'broad-real-user-saas-skymail-skynet'),
      file_count: files.saas.length
    }
  ];

  const matrixSummary = matrix ? {
    ok: Boolean(matrix.ok),
    route_failures: matrix.route_matrix?.failures ?? null,
    checked_apps: matrix.route_matrix?.checked_apps ?? null,
    behavior: {
      total_lanes: matrix.behavior_matrix?.total_lanes ?? null,
      green: matrix.behavior_matrix?.green ?? null,
      yellow: matrix.behavior_matrix?.yellow ?? null,
      red: matrix.behavior_matrix?.red ?? null,
      p0_not_green: matrix.behavior_matrix?.p0_not_green?.map((item) => item.id || item) || []
    },
    next_targets: matrix.next_targets || []
  } : null;

  const payload = {
    schema: 'metraiyux.0s.core-surface-map.v1',
    generated_at: generatedAt,
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    source_of_truth: {
      worker_gate: 'metraiyux_0s_site/cloudflare/worker.js',
      closure_manifest: 'metraiyux_0s_site/data/0s-closure-workflows.json',
      package_scripts: 'package.json',
      mcp_runner: 'tools/use-my-mcp.mjs',
      route_atlas: 'tools/build-skyeway-routes.mjs',
      neural_map: [
        'tools/sync-obsidian-brain.mjs',
        'tools/generate-obsidian-neural-map.mjs',
        'tools/generate-public-neural-map.mjs',
        'tools/skyevault-0s-neural-bridge.mjs',
        'tools/skyerunners.mjs'
      ]
    },
    learning_maps: {
      skyeway_routes: skyewayRoutes,
      obsidian_brain: {
        exists: Boolean(obsidianSync),
        generated_at: obsidianSync?.generated_at || obsidianSync?.generatedAt || '',
        notes: obsidianSync?.notes?.length ?? obsidianSync?.summary?.notes ?? null,
        chunks: obsidianSync?.chunks?.length ?? obsidianSync?.summary?.chunks ?? null
      },
      skyevault: {
        exists: Boolean(skyeVaultMap),
        generated_at: skyeVaultMap?.generated_at || '',
        repos: skyeVaultMap?.repo_count ?? null,
        receipts: skyeVaultMap?.receipt_count ?? null,
        nodes: skyeVaultMap?.nodes?.length ?? null,
        links: skyeVaultMap?.links?.length ?? null
      },
      skyerunners: {
        exists: Boolean(skyeRunnersMap),
        generated_at: skyeRunnersMap?.generated_at || '',
        package_scripts: skyeRunnersMap?.summary?.package_scripts ?? null,
        operator_commands: skyeRunnersMap?.summary?.operator_commands ?? null,
        live_surfaces: skyeRunnersMap?.summary?.live_surfaces ?? null,
        obsidian_chunks: skyeRunnersMap?.summary?.obsidian_chunks ?? null
      }
    },
    receipts: {
      ai_gate: summarizeReceipt(aiGate),
      operating_matrix: matrixSummary
    },
    surfaces
  };

  const surfaceRows = surfaces.map((surface) => {
    const workflowState = surface.workflow?.current_truth || '';
    const mcpItems = Array.isArray(surface.mcp) ? surface.mcp : surface.mcp ? [surface.mcp] : [];
    const mcpFailed = mcpItems.flatMap((item) => item.failed_calls || []).map((item) => item.name);
    return `| ${tableEscape(surface.label)} | ${tableEscape(surface.kind)} | ${tableEscape(workflowState || (mcpFailed.length ? 'runtime mapped, design audit pending' : 'mapped'))} | ${tableEscape(surface.commands.filter(Boolean).map((cmd) => `\`${cmd}\``).join('<br>'))} |`;
  }).join('\n');

  const doc = `# 0S Core Surface Test Map

Generated: ${generatedAt}

This is the quick learning and test map for the named 0S surfaces. Browser proof is intentionally not run by Codex in this repo; owner/manual browser verification handles live visual checks.

## Source Of Truth

- Gate and Worker enforcement: \`metraiyux_0s_site/cloudflare/worker.js\`
- Closure workflow manifest: \`metraiyux_0s_site/data/0s-closure-workflows.json\`
- Test/proof scripts: \`package.json\`
- MCP mining runner: \`tools/use-my-mcp.mjs\`
- Route atlas: \`tools/build-skyeway-routes.mjs\`
- Neural map generators: \`tools/sync-obsidian-brain.mjs\`, \`tools/generate-obsidian-neural-map.mjs\`, \`tools/generate-public-neural-map.mjs\`, \`tools/skyevault-0s-neural-bridge.mjs\`, \`tools/skyerunners.mjs\`

## Fresh Core Receipts

- AI gate audit: ${aiGate?.ok ? 'green' : 'not green'} at \`test-artifacts/ai-gate-audit/ai-gate-audit-latest.json\`
- Operating matrix: ${matrix?.ok ? 'green' : 'yellow'} at \`test-artifacts/0s-operating-proof-matrix/0s-operating-proof-matrix-latest.json\`
- Route matrix: ${matrixSummary?.checked_apps ?? 'unknown'} apps checked, ${matrixSummary?.route_failures ?? 'unknown'} route failures
- Behavior matrix: ${matrixSummary?.behavior?.green ?? 'unknown'} green, ${matrixSummary?.behavior?.yellow ?? 'unknown'} yellow, ${matrixSummary?.behavior?.red ?? 'unknown'} red
- Skyeway route atlas: ${skyewayRoutes.total_routes ?? 'unknown'} routes at \`metraiyux_0s_site/assets/skyeway-routes.js\`
- Obsidian brain sync: ${obsidianSync?.chunks?.length ?? obsidianSync?.summary?.chunks ?? 'unknown'} chunks at \`metraiyux_0s_site/brain/obsidian-sync.json\`
- SkyeVault neural bridge: ${skyeVaultMap?.receipt_count ?? 'unknown'} receipts, ${skyeVaultMap?.nodes?.length ?? 'unknown'} nodes at \`metraiyux_0s_site/brain/skyevault-vault-map.json\`
- SkyeRunners map: ${skyeRunnersMap?.summary?.live_surfaces ?? 'unknown'} live surfaces and ${skyeRunnersMap?.summary?.operator_commands ?? 'unknown'} operator commands at \`metraiyux_0s_site/brain/skyerunners.json\`

## Fast Commands

${mdCodeList([
    'npm run mcp:smoke',
    'npm run 0s:ai-gate-audit',
    'npm run 0s:core-level-gate-map',
    'npm run 0s:operating-proof-matrix',
    'npm run 0s:connectlog-relay13:proof',
    'npm run 0s:skyemusicnexus:smoke',
    'npm run 0s:skyemail:offboarding-proof',
    'npm run 0s:skyeway:routes',
    'npm run brain:sync:obsidian',
    'npm run obsidian:graph',
    'npm run obsidian:web-graph',
    'npm run vault:0s:map',
    'node tools/skyerunners.mjs map',
    'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/SkyeMusicNexus',
    'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/live/SkyeMail',
    'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof',
    'MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/connectlog-v7.7-relay13-operator-proof'
  ])}

## Surface Table

| Surface | Kind | Current Map Status | Main Commands |
| --- | --- | --- | --- |
${surfaceRows}

## Level Folders

- Ascension: ${files.ascension.length} files under \`metraiyux_0s_site/ascension\`; link audit says ${(await readJson('metraiyux_0s_site/proof/ASCENSION_LINK_AUDIT.json'))?.broken_internal_links?.length ?? 'unknown'} broken internal links.
- Expansion: ${files.expansion.length} files under \`metraiyux_0s_site/branch-expansion\`; use the operating matrix plus expansion receipts in \`metraiyux_0s_site/proof/*-expansion-receipt.html\`.
- Government: ${files.government.length} files under \`metraiyux_0s_site/government\`; paired with \`metraiyux_0s_site/services/government-enterprise-readiness.html\`.
- SaaS: ${files.saas.length} files under \`metraiyux_0s_site/saas\`; link audit says ${(await readJson('metraiyux_0s_site/proof-vault/saas/SAAS_SELF_SERVE_LINK_AUDIT.json'))?.broken_count ?? 'unknown'} broken links.

## Current Gaps To Keep Visible

${mdList((matrixSummary?.next_targets || []).map((item) => `${item.id}: ${item.first_gap}`))}

## MCP Design Audit Flags

${mdList(surfaces.flatMap((surface) => {
    const items = Array.isArray(surface.mcp) ? surface.mcp : surface.mcp ? [surface.mcp] : [];
    return items.flatMap((item) => (item.failed_calls || []).map((call) => `${surface.label}: ${call.name}${call.issues?.[0] ? ` - ${call.issues[0]}` : ''}`));
  }))}

## Manual Browser Check Links

${mdList([
    route('/admin/login.html'),
    route('/SkyeMusicNexus/index.html'),
    route('/live/SkyeMail/session-handoff.html?next=dashboard.html&from=founder-command'),
    route('/live/connectlog-relay13-operator-proof.html'),
    route('/signinpro/'),
    route('/ascension/index.html'),
    route('/branch-expansion/index.html'),
    route('/government/index.html'),
    route('/saas/index.html')
  ])}
`;

  const obsidian = `---
brain: true
title: 0S Core Surface Test Map
tags:
  - metraiyux
  - 0s
  - proof
  - neural-map
  - gate
---

# 0S Core Surface Test Map

Generated: ${generatedAt}

The 0S test map lives at \`metraiyux_0s_site/docs/0S_CORE_SURFACE_TEST_MAP_2026-05-28.md\` and the machine receipt lives at \`test-artifacts/0s-core-surface-map/0s-core-surface-map-latest.json\`.

Core rule: every mounted surface uses the shared FS27/SkyGate/Free99 lane through \`metraiyux_0s_site/cloudflare/worker.js\`, \`requireGateAuth\`, \`requireOperatorAuth\`, and \`enforceZeroOsGate\`. Browser proof remains owner-handled.

Fast proof commands: \`npm run mcp:smoke\`, \`npm run 0s:ai-gate-audit\`, \`npm run 0s:core-level-gate-map\`, \`npm run 0s:operating-proof-matrix\`, \`npm run 0s:connectlog-relay13:proof\`, \`npm run 0s:skyemusicnexus:smoke\`, and \`npm run 0s:skyemail:offboarding-proof\`.

Learning map commands: \`npm run 0s:skyeway:routes\`, \`npm run brain:sync:obsidian\`, \`npm run obsidian:graph\`, \`npm run obsidian:web-graph\`, \`npm run vault:0s:map\`, and \`node tools/skyerunners.mjs map\`.

Named surfaces: \`metraiyux_0s_site/SkyeMusicNexus\`, \`metraiyux_0s_site/live/SkyeMail\`, \`metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof\`, \`metraiyux_0s_site/connectlog-v7.7-relay13-operator-proof\`, \`metraiyux_0s_site/signinpro\`, \`metraiyux_0s_site/signin-pro\`, and \`metraiyux_0s_site/northstar\`.

Level surfaces: \`metraiyux_0s_site/ascension\`, \`metraiyux_0s_site/branch-expansion\`, \`metraiyux_0s_site/government\`, and \`metraiyux_0s_site/saas\`.

Latest matrix note: ${matrixSummary ? `${matrixSummary.checked_apps} apps checked, ${matrixSummary.route_failures} route failures, P0 yellow lanes ${matrixSummary.behavior.p0_not_green.join(', ') || 'none'}.` : 'matrix receipt not found.'}

Latest learning-map note: Skyeway has ${skyewayRoutes.total_routes ?? 'unknown'} routes; SkyeVault has ${skyeVaultMap?.receipt_count ?? 'unknown'} receipts; SkyeRunners has ${skyeRunnersMap?.summary?.live_surfaces ?? 'unknown'} live surfaces.
`;

  await fs.mkdir(artifactDir, { recursive: true });
  await fs.mkdir(path.dirname(siteDocPath), { recursive: true });
  await fs.mkdir(path.dirname(obsidianNotePath), { recursive: true });
  await fs.writeFile(latestJsonPath, asciiSafe(`${JSON.stringify(payload, null, 2)}\n`));
  await fs.writeFile(siteDocPath, asciiSafe(doc));
  await fs.writeFile(obsidianNotePath, asciiSafe(obsidian));

  console.log(JSON.stringify({
    ok: true,
    generated_at: generatedAt,
    surfaces: surfaces.length,
    json: path.relative(repoRoot, latestJsonPath),
    doc: path.relative(repoRoot, siteDocPath),
    obsidian: path.relative(repoRoot, obsidianNotePath),
    matrix: matrixSummary
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
