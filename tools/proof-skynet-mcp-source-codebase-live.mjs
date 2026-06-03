#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetApi = String(process.env.SKYENET_API || 'https://skyenet.graylondonskyes.workers.dev/api/skyenet').replace(/\/+$/, '');
const projectId = process.env.SKYENET_MCP_PROJECT || 'quantumskyes-source-custody';
const workspaceId = process.env.SKYENET_MCP_WORKSPACE || 'quantumskyes';
const deploymentId = process.env.SKYENET_MCP_DEPLOYMENT || 'dep_quantumskyes_6a01d319';
const customerId = process.env.SKYENET_MCP_CUSTOMER_ID || process.env.SKYENET_MCP_SOURCE_CUSTOMER_ID || '';
const sourceFilePath = process.env.SKYENET_MCP_SOURCE_FILE || '_shared/auth-unlock.js';
const searchQuery = process.env.SKYENET_MCP_SEARCH || 'three.min.js';
const expectedMinFiles = Number(process.env.SKYENET_MCP_EXPECTED_MIN_FILES || 165144);
const expectedTreeEntries = String(process.env.SKYENET_MCP_EXPECTED_TREE_ENTRIES || '_shared,vendor')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const expectedSourceContains = String(process.env.SKYENET_MCP_EXPECTED_SOURCE_CONTAINS || 'unlock');
const expectedSearchPath = String(process.env.SKYENET_MCP_EXPECTED_SEARCH_PATH || searchQuery);
const proveTransfer = /^(1|true|yes|on)$/i.test(String(process.env.SKYENET_MCP_PROVE_TRANSFER || process.env.SKYENET_MCP_SOURCE_TRANSFER || '0'));
const transferMethod = process.env.SKYENET_MCP_TRANSFER_METHOD || 'download';
const toolTimeoutMs = Math.max(60000, Number(process.env.SKYENET_MCP_TOOL_TIMEOUT_MS || 240000) || 240000);
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-mcp-source-codebase');
const latestReceipt = path.join(artifactRoot, 'skyenet-mcp-source-codebase-live-latest.json');

function parseToolJson(result) {
  const text = (result.content || []).map((item) => item.text || '').join('\n').trim();
  assert.ok(text, 'MCP tool returned no text content.');
  return JSON.parse(text);
}

async function callTool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: toolTimeoutMs });
  return parseToolJson(result);
}

function authSummary(auth) {
  return {
    ok: auth.ok === true,
    credential_key: auth.credential?.key || '',
    credential_source: auth.credential?.source || '',
    response_status: Number(auth.response?.status || 0) || 0,
    response_via: auth.response?.body?.via || auth.response?.via || ''
  };
}

await fs.mkdir(artifactRoot, { recursive: true });

const auth = await resolveZeroOsGateAuth({ zeroOsBase });
assert.equal(auth.ok, true, auth.response?.body?.error || auth.response?.error || 'Shared 0S/FS27 gate auth failed.');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(repoRoot, 'MCP', 'stdio-server.mjs')],
  env: {
    ...process.env,
    REPO_ROOT: repoRoot,
    SKYENET_API: skynetApi,
    MCP_GATE_SESSION: auth.token
  }
});

const client = new Client({
  name: 'skyenet-mcp-source-codebase-live-proof',
  version: '0.1.0'
});

const receipt = {
  schema: 'skyenet.mcp_source_codebase.live_proof.v1',
  ok: false,
  generated_at: new Date().toISOString(),
  no_browser_proof_run: true,
  owner_manual_browser_verification: true,
  bases: {
    zero_os: zeroOsBase,
    skynet_api: skynetApi
  },
  target: {
    workspace_id: workspaceId,
    customer_id: customerId || undefined,
    project_id: projectId,
    deployment_id: deploymentId,
    source_file_path: sourceFilePath,
    search_query: searchQuery,
    expected_min_files: expectedMinFiles,
    expected_tree_entries: expectedTreeEntries,
    expected_source_contains: expectedSourceContains,
    expected_search_path: expectedSearchPath,
    prove_transfer: proveTransfer,
    transfer_method: proveTransfer ? transferMethod : '',
    tool_timeout_ms: toolTimeoutMs
  },
  credential_source: authSummary(auth),
  checks: {},
  failures: []
};

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  const requiredTools = [
    'skyenet_source_status',
    'skyenet_list_codebases',
    'skyenet_source_manifest',
    'skyenet_source_tree',
    'skyenet_source_file',
    'skyenet_source_search',
    'skyenet_source_transfer'
  ];
  receipt.checks.tools = {
    ok: requiredTools.every((tool) => toolNames.includes(tool)),
    required: requiredTools,
    found_count: toolNames.length
  };

  const status = await callTool(client, 'skyenet_source_status');
  receipt.checks.status = {
    ok: status.ok === true && status.shared_gate_token_configured === true,
    api_base: status.api_base,
    shared_gate_token_configured: status.shared_gate_token_configured === true,
    read_only_tools: status.read_only_tools || []
  };

  const list = await callTool(client, 'skyenet_list_codebases', {
    workspace_id: workspaceId,
    customer_id: customerId || undefined,
    project_id: projectId
  });
  const codebases = Array.isArray(list.codebases) ? list.codebases : [];
  const matchedCodebase = codebases.find((item) => item.project_id === projectId && item.deployment_id === deploymentId)
    || codebases.find((item) => item.project_id === projectId)
    || null;
  receipt.checks.list_codebases = {
    ok: list.ok === true && Boolean(matchedCodebase),
    workspace_id: list.workspace_id || workspaceId,
    count: list.count || 0,
    matched: matchedCodebase
      ? {
          project_id: matchedCodebase.project_id,
          deployment_id: matchedCodebase.deployment_id,
          status: matchedCodebase.status,
          live_url: matchedCodebase.live_url,
          has_source_manifest_url: Boolean(matchedCodebase.source_manifest_url),
          has_source_tree_url: Boolean(matchedCodebase.source_tree_url),
          has_source_search_url: Boolean(matchedCodebase.source_search_url),
          source_custody: matchedCodebase.source_custody || null
        }
      : null
  };

  const sourceArgs = {
    workspace_id: workspaceId,
    customer_id: customerId || undefined,
    project_id: projectId,
    deployment_id: deploymentId
  };

  const manifest = await callTool(client, 'skyenet_source_manifest', {
    ...sourceArgs,
    limit: 25
  });
  receipt.checks.manifest = {
    ok: manifest.ok !== false
      && manifest.source_mode === 'private-full-project'
      && Number(manifest.file_count || 0) >= expectedMinFiles
      && Array.isArray(manifest.files)
      && manifest.files.length > 0,
    source_mode: manifest.source_mode || '',
    file_count: Number(manifest.file_count || 0) || 0,
    listed_count: Array.isArray(manifest.files) ? manifest.files.length : 0,
    next_cursor_present: Boolean(manifest.next_cursor),
    source_package: manifest.source_package
      ? {
          source_mode: manifest.source_package.source_mode || '',
          file_count: Number(manifest.source_package.file_count || 0) || 0,
          index_paged: Boolean(manifest.source_package.index_paged),
          archive_bytes: Number(manifest.source_package.archive?.bytes || 0) || 0
        }
      : null
  };

  const tree = await callTool(client, 'skyenet_source_tree', {
    ...sourceArgs,
    limit: 50
  });
  receipt.checks.tree = {
    ok: tree.ok !== false
      && Array.isArray(tree.entries)
      && expectedTreeEntries.every((expected) => tree.entries.some((entry) => entry.path === expected || entry.name === expected)),
    entry_count: Number(tree.entry_count || 0) || 0,
    entries_sample: Array.isArray(tree.entries)
      ? tree.entries.slice(0, 8).map((entry) => ({ type: entry.type, name: entry.name, path: entry.path }))
      : []
  };

  const sourceFile = await callTool(client, 'skyenet_source_file', {
    ...sourceArgs,
    path: sourceFilePath
  });
  receipt.checks.source_file = {
    ok: sourceFile.ok !== false
      && sourceFile.path === sourceFilePath
      && Number(sourceFile.bytes || 0) > 0
      && (!expectedSourceContains || String(sourceFile.text || '').includes(expectedSourceContains)),
    path: sourceFile.path || '',
    bytes: Number(sourceFile.bytes || 0) || 0,
    text_sample: String(sourceFile.text || '').slice(0, 180)
  };

  const search = await callTool(client, 'skyenet_source_search', {
    ...sourceArgs,
    q: searchQuery,
    limit: 20
  });
  const results = Array.isArray(search.results) ? search.results : [];
  receipt.checks.search = {
    ok: search.ok !== false && results.some((item) => String(item.path || '').includes(expectedSearchPath)),
    result_count: Number(search.result_count || results.length || 0) || 0,
    searched_file_count: Number(search.searched_file_count || 0) || 0,
    results_sample: results.slice(0, 8).map((item) => item.path || '')
  };

  if (proveTransfer) {
    const transfer = await callTool(client, 'skyenet_source_transfer', {
      ...sourceArgs,
      method: transferMethod,
      confirm: true
    });
    receipt.checks.source_transfer = {
      ok: transfer.ok !== false
        && Boolean(transfer.transfer_id)
        && transfer.custody_policy?.client_access_without_transfer === false
        && transfer.custody_policy?.transfer_required_for_client_source_handoff === true
        && (transferMethod !== 'download' || Boolean(transfer.source_download_url)),
      transfer_id: transfer.transfer_id || '',
      method: transfer.method?.id || transfer.method?.method || transferMethod,
      status: transfer.status || '',
      source_download_url_present: Boolean(transfer.source_download_url),
      source_owner_customer_id: transfer.custody_policy?.source_owner_customer_id || '',
      requested_by_customer_id: transfer.custody_policy?.requested_by_customer_id || '',
      client_access_without_transfer: transfer.custody_policy?.client_access_without_transfer,
      transfer_required_for_client_source_handoff: transfer.custody_policy?.transfer_required_for_client_source_handoff
    };
  }
} finally {
  await client.close().catch(() => {});
}

for (const [name, check] of Object.entries(receipt.checks)) {
  if (!check?.ok) receipt.failures.push(`${name} did not pass.`);
}

receipt.ok = receipt.failures.length === 0;

const stamped = path.join(artifactRoot, `skyenet-mcp-source-codebase-live-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);

console.log(JSON.stringify({
  ok: receipt.ok,
  receipt: path.relative(repoRoot, latestReceipt),
  workspace_id: workspaceId,
  project_id: projectId,
  deployment_id: deploymentId,
  file_count: receipt.checks.manifest?.file_count || 0,
  failures: receipt.failures
}, null, 2));

if (!receipt.ok) process.exit(1);
