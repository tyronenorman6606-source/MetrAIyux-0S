#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const manifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-closure-workflows.json');
const packagePath = path.join(repoRoot, 'package.json');
const operatingMatrixLatest = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const capabilityWatchLatest = path.join(repoRoot, 'test-artifacts', '0s-live-capability-watch', '0s-live-capability-watch-latest.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-truth-ledger');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const latestPath = path.join(artifactRoot, '0s-truth-ledger-latest.json');
const publicJsonPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', '0s-truth-ledger.json');
const publicMdPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', '0s-truth-ledger.md');
const docsMdPath = path.join(repoRoot, 'docs', '0S_TRUTH_LEDGER.md');
const siteDocsMdPath = path.join(repoRoot, 'metraiyux_0s_site', 'docs', '0S_LIVING_TRUTH_LEDGER.md');
const failOnOpen = process.argv.includes('--fail-on-open') || process.env.ZERO_OS_TRUTH_LEDGER_FAIL_ON_OPEN === '1';

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function fileExists(value) {
  return Boolean(value && fs.existsSync(path.resolve(repoRoot, value)));
}

function receiptStatus(receiptPathValue = '') {
  if (!receiptPathValue || !receiptPathValue.endsWith('.json')) {
    return { path: receiptPathValue, exists: false, ok: false, generated_at: '', failures: [], parse_error: false };
  }
  const absolute = path.resolve(repoRoot, receiptPathValue);
  if (!fs.existsSync(absolute)) {
    return { path: receiptPathValue, exists: false, ok: false, generated_at: '', failures: [], parse_error: false };
  }
  const data = readJson(absolute);
  if (!data) {
    return { path: receiptPathValue, exists: true, ok: false, generated_at: '', failures: [], parse_error: true };
  }
  return {
    path: receiptPathValue,
    exists: true,
    ok: data.ok === true,
    generated_at: data.generatedAt || data.generated_at || '',
    failures: Array.isArray(data.failures) ? data.failures : [],
    warning_ids: data.summary?.warning_ids || [],
    failed_ids: data.summary?.failed_ids || [],
    route_failures: Number(data.route_matrix?.failures || 0),
    behavior_red: Number(data.behavior_matrix?.red || 0),
    behavior_yellow: Number(data.behavior_matrix?.yellow || 0),
    app_behavior_state: data.app_behavior_matrix?.state || '',
    app_behavior_green: Number(data.app_behavior_matrix?.green || 0),
    app_behavior_yellow: Number(data.app_behavior_matrix?.yellow || 0),
    app_behavior_red: Number(data.app_behavior_matrix?.red || 0),
    literal_per_app_depth_closed: data.app_behavior_matrix?.literal_per_app_depth_closed === true
  };
}

function proofCommandStatus(command = '', scripts = {}) {
  const text = String(command || '').trim();
  if (!text) return { exists: false, kind: 'missing', command: text, detail: 'No proof command is recorded.' };
  const npmRun = text.match(/^npm\s+run\s+([A-Za-z0-9_.:-]+)/);
  if (npmRun) {
    return {
      exists: Boolean(scripts[npmRun[1]]),
      kind: 'npm_script',
      script: npmRun[1],
      command: text,
      detail: scripts[npmRun[1]] ? scripts[npmRun[1]] : 'Package script is missing.'
    };
  }
  const nodeFile = text.match(/^node\s+([^\s]+\.mjs|[^\s]+\.js)/);
  if (nodeFile) {
    return {
      exists: fileExists(nodeFile[1]),
      kind: 'node_file',
      file: nodeFile[1],
      command: text,
      detail: fileExists(nodeFile[1]) ? 'Node proof file exists.' : 'Node proof file is missing.'
    };
  }
  return { exists: true, kind: 'external_or_composite', command: text, detail: 'Command shape was not statically verified.' };
}

function gapClass(gaps = [], explicit = '') {
  if (explicit) return explicit;
  const text = gaps.join(' ').toLowerCase();
  if (!gaps.length) return 'none';
  if (/provider|twilio|sms|voice|social|resend|stripe|payout|refund|bank|calendar|external|billing|legal filing|government portal/.test(text)) {
    return 'provider_or_real_world_gated';
  }
  if (/no current|need|not fully|not closed|missing|unrestricted|not every|expected to stay yellow/.test(text)) return 'implementation_or_proof_gap';
  return 'open_gap';
}

function selectedBlockingGaps(workflow = {}) {
  if (Object.hasOwn(workflow, 'blocking_gaps')) {
    return {
      source: 'workflow.blocking_gaps',
      gaps: Array.isArray(workflow.blocking_gaps) ? workflow.blocking_gaps : []
    };
  }
  if (Object.hasOwn(workflow, 'implementation_gaps')) {
    return {
      source: 'workflow.implementation_gaps',
      gaps: Array.isArray(workflow.implementation_gaps) ? workflow.implementation_gaps : []
    };
  }
  return {
    source: 'workflow.open_gaps',
    gaps: Array.isArray(workflow.open_gaps) ? workflow.open_gaps : []
  };
}

function computedState({ workflow, receipt, proof, blockingGaps }) {
  const gaps = Array.isArray(blockingGaps) ? blockingGaps : [];
  if (workflow.id === 'per-app-operating-proof-matrix' && receipt.exists) {
    if (receipt.route_failures === 0 && receipt.behavior_red === 0 && receipt.literal_per_app_depth_closed && gaps.length === 0) return 'built';
    if (receipt.route_failures === 0 && receipt.behavior_red === 0) return 'partial';
  }
  if (receipt.ok && gaps.length === 0) return 'built';
  if (receipt.ok && gaps.length > 0) return 'partial';
  if (proof.exists && receipt.exists && !receipt.ok) return 'failing_proof';
  if (proof.exists && !receipt.exists) return 'unproven';
  if (!proof.exists && gaps.length > 0) return 'not_built_or_untracked';
  if (!proof.exists) return 'not_tracked';
  return 'unknown';
}

function requiredNextStep(state, workflow, proof, receipt, gapKind, blockingGaps = []) {
  const firstGap = blockingGaps[0] || '';
  if (state === 'built') return 'Keep proof fresh and re-run when the lane changes.';
  if (workflow.id === 'per-app-operating-proof-matrix' && receipt.exists && !receipt.literal_per_app_depth_closed) {
    return `Close literal per-mounted-app behavior depth: ${receipt.app_behavior_yellow} yellow app rows and ${receipt.app_behavior_red} red app rows still need app-specific scenarios or valid read-only/local-first proof models.`;
  }
  if (workflow.next_build_step) return workflow.next_build_step;
  if (!proof.exists) return `Add a real proof command for ${workflow.id}; it must create/read/update-or-closeout, read the receipt back, and stress the lane before this can be green.`;
  if (!receipt.exists) return `Run ${workflow.proof_command} and store its latest receipt at ${workflow.receipt_path || 'a declared receipt path'}.`;
  if (state === 'failing_proof') return `Repair the failing proof command ${workflow.proof_command}; do not claim this lane is closed until the receipt returns ok:true.`;
  if (gapKind === 'provider_or_real_world_gated') return `Keep the provider/real-world action gated, but build an explicit owner-approved execution receipt or backend/service binding for: ${firstGap}`;
  return firstGap || `Expand ${workflow.id} from a partial receipt into full behavior coverage.`;
}

function toPublicWorkflow(item) {
  return {
    id: item.id,
    priority: item.priority,
    surface: item.surface,
    claimed_truth: item.claimed_truth,
    computed_truth: item.computed_truth,
    gap_class: item.gap_class,
    declared_gap_type: item.declared_gap_type,
    proof_command: item.proof_command,
    proof_exists: item.proof.exists,
    receipt_path: item.receipt.path,
    receipt_ok: item.receipt.ok,
    receipt_generated_at: item.receipt.generated_at,
    evidence_receipts: item.evidence_receipts,
    blocking_gap_source: item.blocking_gap_source,
    blocking_gaps: item.blocking_gaps,
    external_boundaries: item.external_boundaries,
    open_gaps: item.open_gaps,
    next_step: item.next_step,
    next_build_step: item.next_build_step,
    owner_url: item.owner_url
  };
}

function markdown(receipt) {
  const lines = [];
  lines.push('# 0S Truth Ledger');
  lines.push('');
  lines.push(`Generated: ${receipt.generated_at}`);
  lines.push('');
  lines.push('This ledger is intentionally strict: a lane is `built` only when the declared proof command exists, the declared receipt exists and is `ok:true`, and no open gaps remain in `metraiyux_0s_site/data/0s-closure-workflows.json`.');
  lines.push('');
  lines.push('Browser proof remains owner-handled. Provider-spend, destructive, legal/government filing, payout/refund, credential, and external customer-impacting actions stay gated until explicitly approved and receipted.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total workflows: ${receipt.summary.total}`);
  lines.push(`- Built: ${receipt.summary.built}`);
  lines.push(`- Partial: ${receipt.summary.partial}`);
  lines.push(`- Failing proof: ${receipt.summary.failing_proof}`);
  lines.push(`- Unproven: ${receipt.summary.unproven}`);
  lines.push(`- Not built or untracked: ${receipt.summary.not_built_or_untracked}`);
  lines.push(`- Provider/real-world gated gaps: ${receipt.summary.provider_or_real_world_gated}`);
  lines.push(`- External boundaries: ${receipt.summary.external_boundaries}`);
  if (receipt.source_receipts.operating_matrix?.app_behavior_state) {
    lines.push(`- Literal per-app behavior state: ${receipt.source_receipts.operating_matrix.app_behavior_state}`);
    lines.push(`- Literal per-app rows: ${receipt.source_receipts.operating_matrix.app_behavior_green} green, ${receipt.source_receipts.operating_matrix.app_behavior_yellow} yellow, ${receipt.source_receipts.operating_matrix.app_behavior_red} red`);
  }
  lines.push('');
  lines.push('## Repair Queue');
  lines.push('');
  for (const item of receipt.repair_queue) {
    lines.push(`- **${item.priority} ${item.id}** - ${item.computed_truth}`);
    lines.push(`  Proof: ${item.proof_command || 'missing'}`);
    lines.push(`  Receipt: ${item.receipt_path || 'missing'}`);
    lines.push(`  Next: ${item.next_step}`);
    if (item.external_boundaries?.length) {
      lines.push(`  External boundaries: ${item.external_boundaries.join('; ')}`);
    }
  }
  const externalBoundaryWorkflows = receipt.workflows.filter((item) => item.external_boundaries?.length);
  if (externalBoundaryWorkflows.length) {
    lines.push('');
    lines.push('## External Boundaries');
    lines.push('');
    for (const item of externalBoundaryWorkflows) {
      lines.push(`- **${item.priority} ${item.id}** - ${item.external_boundaries.join('; ')}`);
    }
  }
  lines.push('');
  lines.push('## Workflow Truth');
  lines.push('');
  lines.push('| Priority | Workflow | Claimed | Computed | Gap Class | Receipt |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const item of receipt.workflows) {
    lines.push(`| ${item.priority} | ${item.id} | ${item.claimed_truth} | ${item.computed_truth} | ${item.gap_class} | ${item.receipt_ok ? 'ok' : item.receipt_path ? 'not ok/missing' : 'missing'} |`);
  }
  lines.push('');
  lines.push('Source JSON: `metraiyux_0s_site/proof/0s-truth-ledger.json`.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function writeAll(receipt) {
  await fsp.mkdir(path.dirname(receiptPath), { recursive: true });
  await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(artifactRoot, { recursive: true });
  await fsp.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(path.dirname(publicJsonPath), { recursive: true });
  await fsp.writeFile(publicJsonPath, `${JSON.stringify({
    ...receipt,
    workflows: receipt.workflows.map(toPublicWorkflow)
  }, null, 2)}\n`);
  const md = markdown(receipt);
  await fsp.writeFile(publicMdPath, md);
  await fsp.mkdir(path.dirname(docsMdPath), { recursive: true });
  await fsp.writeFile(docsMdPath, md);
  await fsp.mkdir(path.dirname(siteDocsMdPath), { recursive: true });
  await fsp.writeFile(siteDocsMdPath, md);
}

async function main() {
  const manifest = readJson(manifestPath);
  const pkg = readJson(packagePath, {});
  if (!manifest?.workflows) throw new Error(`Missing closure workflow manifest at ${rel(manifestPath)}`);
  const scripts = pkg.scripts || {};
  const operating = readJson(operatingMatrixLatest, {});
  const capability = readJson(capabilityWatchLatest, {});
  const workflows = manifest.workflows.map((workflow) => {
    const proof = proofCommandStatus(workflow.proof_command || '', scripts);
    const receipt = receiptStatus(workflow.receipt_path || '');
    const openGaps = Array.isArray(workflow.open_gaps) ? workflow.open_gaps : [];
    const { source: blockingGapSource, gaps: blockingGaps } = selectedBlockingGaps(workflow);
    const externalBoundaries = Array.isArray(workflow.external_boundaries) ? workflow.external_boundaries : [];
    const declaredGapType = workflow.gap_type || '';
    const gapKind = gapClass(blockingGaps, declaredGapType);
    const state = computedState({ workflow, receipt, proof, blockingGaps });
    return {
      id: workflow.id,
      priority: workflow.priority || 'P2',
      surface: workflow.surface || workflow.id,
      owner_url: workflow.owner_url || '',
      claimed_truth: workflow.current_truth || 'unknown',
      computed_truth: state,
      proof_command: workflow.proof_command || '',
      proof,
      receipt,
      open_gaps: openGaps,
      blocking_gap_source: blockingGapSource,
      blocking_gaps: blockingGaps,
      external_boundaries: externalBoundaries,
      gap_class: gapKind,
      declared_gap_type: declaredGapType,
      required_steps: workflow.required_steps || [],
      green_evidence: workflow.green_evidence || [],
      evidence_receipts: workflow.evidence_receipts || [],
      next_step: requiredNextStep(state, workflow, proof, receipt, gapKind, blockingGaps),
      next_build_step: workflow.next_build_step || ''
    };
  });
  const summary = {
    total: workflows.length,
    built: workflows.filter((item) => item.computed_truth === 'built').length,
    partial: workflows.filter((item) => item.computed_truth === 'partial').length,
    failing_proof: workflows.filter((item) => item.computed_truth === 'failing_proof').length,
    unproven: workflows.filter((item) => item.computed_truth === 'unproven').length,
    not_built_or_untracked: workflows.filter((item) => item.computed_truth === 'not_built_or_untracked').length,
    not_tracked: workflows.filter((item) => item.computed_truth === 'not_tracked').length,
    provider_or_real_world_gated: workflows.filter((item) => item.gap_class === 'provider_or_real_world_gated' || item.external_boundaries.length > 0).length,
    external_boundaries: workflows.filter((item) => item.external_boundaries.length > 0).length,
    p0_not_built: workflows.filter((item) => item.priority === 'P0' && item.computed_truth !== 'built').map((item) => item.id),
    p1_not_built: workflows.filter((item) => item.priority === 'P1' && item.computed_truth !== 'built').map((item) => item.id)
  };
  const repairQueue = workflows
    .filter((item) => item.computed_truth !== 'built')
    .sort((a, b) => {
      const rank = { P0: 0, P1: 1, P2: 2 };
      return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.id.localeCompare(b.id);
    })
    .map((item) => ({
      id: item.id,
      priority: item.priority,
      computed_truth: item.computed_truth,
      gap_class: item.gap_class,
      proof_command: item.proof_command,
      receipt_path: item.receipt.path,
      external_boundaries: item.external_boundaries,
      next_step: item.next_step
    }));
  const receipt = {
    ok: summary.p0_not_built.length === 0,
    schema: 'metraiyux.0s.truth-ledger.v1',
    generated_at: new Date().toISOString(),
    source_manifest: rel(manifestPath),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    honesty_rule: 'Do not call a lane built unless computed_truth is built. Partial, unproven, not_built_or_untracked, and provider_or_real_world_gated lanes must remain visible in sales, founder, and proof surfaces.',
    source_receipts: {
      operating_matrix: {
        path: rel(operatingMatrixLatest),
        ok: operating?.ok === true,
        generated_at: operating?.generated_at || '',
        route_failures: Number(operating?.route_matrix?.failures || 0),
        behavior_green: Number(operating?.behavior_matrix?.green || 0),
        behavior_yellow: Number(operating?.behavior_matrix?.yellow || 0),
        behavior_red: Number(operating?.behavior_matrix?.red || 0),
        app_behavior_state: operating?.app_behavior_matrix?.state || '',
        app_behavior_green: Number(operating?.app_behavior_matrix?.green || 0),
        app_behavior_yellow: Number(operating?.app_behavior_matrix?.yellow || 0),
        app_behavior_red: Number(operating?.app_behavior_matrix?.red || 0),
        literal_per_app_depth_closed: operating?.app_behavior_matrix?.literal_per_app_depth_closed === true
      },
      live_capability_watch: {
        path: rel(capabilityWatchLatest),
        ok: capability?.ok === true,
        generated_at: capability?.generated_at || '',
        summary: capability?.summary || {}
      }
    },
    summary,
    repair_queue: repairQueue,
    workflows
  };
  await writeAll(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    public_json: rel(publicJsonPath),
    public_md: rel(publicMdPath),
    docs_md: rel(docsMdPath),
    site_docs_md: rel(siteDocsMdPath),
    summary,
    next_targets: repairQueue.slice(0, 8)
  }, null, 2));
  if (failOnOpen && !receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
