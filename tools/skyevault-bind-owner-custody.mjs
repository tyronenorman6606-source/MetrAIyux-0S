#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { getConfigFolderId, LEDGER_FILE, loadLedger, loadReceipt, signReceipt } from '../SkyeVault-Drop/netlify/functions/_lib/config.js';
import { updateJsonFile, upsertJsonFile } from '../SkyeVault-Drop/netlify/functions/_lib/google-drive.js';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);

function argValues(name) {
  const prefix = `${name}=`;
  return args.filter((arg) => arg.startsWith(prefix)).map((arg) => arg.slice(prefix.length)).filter(Boolean);
}

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function parseEnv(file) {
  const values = {};
  if (!file || !fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function applyEnv() {
  const merged = {
    ...parseEnv(path.join(repoRoot, 'SkyeVault-Drop/.env')),
    ...parseEnv(path.join(repoRoot, '.env')),
    ...parseEnv(path.join(repoRoot, 'env.txt')),
    ...process.env
  };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== null) process.env[key] = String(value);
  }
  if (!process.env.R2_CONFIG_PREFIX && !process.env.R2_CONFIG_FOLDER_ID) process.env.R2_CONFIG_PREFIX = 'vault-system';
  if (!process.env.R2_BUCKET && !process.env.S3_BUCKET) process.env.R2_BUCKET = 'client-drop-vault';
}

function firstCsv(value = '') {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)[0] || '';
}

function firstValidEmail(...values) {
  for (const value of values) {
    for (const candidate of String(value || '').split(',')) {
      const email = candidate.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
    }
  }
  return '';
}

function ownerCustody() {
  const ownerEmail = firstValidEmail(
    argValue('--owner-email'),
    process.env.SKYEVAULT_OWNER_EMAIL,
    process.env.OWNER_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.METRAIYUX_0S_SKYGATE_ADMIN_EMAILS,
    process.env.LEGAL_REVIEW_ADMIN_EMAIL,
    process.env.RESEND_FROM_EMAIL,
    process.env.ZOHO_DEFAULT_FROM,
    process.env.SKYEVAULT_CLIENT_EMAIL
  ) || 'owner@metraiyux.local';
  const ownerName = String(
    argValue('--owner-name')
    || process.env.SKYEVAULT_OWNER_NAME
    || process.env.OWNER_NAME
    || process.env.GIT_AUTHOR_NAME
    || '0S Founder Account'
  ).trim();
  return {
    ownerEmail,
    ownerName,
    ownerWorkspaceId: String(process.env.SKYEVAULT_OWNER_WORKSPACE_ID || 'metraiyux-0s-owner').trim(),
    ownerWorkspaceSlug: String(process.env.SKYEVAULT_OWNER_WORKSPACE_SLUG || 'metraiyux-0s').trim(),
    ownerSubject: String(process.env.SKYEVAULT_OWNER_SUBJECT || 'metraiyux-owner-admin').trim(),
    ownerAccountId: String(process.env.SKYEVAULT_OWNER_ACCOUNT_ID || 'founder-metraiyux-0s-owner').trim(),
    custodyScope: 'owner-private',
    vaultVisibility: 'owner-only',
    accessPolicy: 'shared-gate-owner-admin-only',
    clientVaultVisible: false,
    clientVaultDownloadAllowed: false
  };
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function receiptIdsFromAutosync() {
  const ids = new Set();
  for (const rel of [
    '.skyevault-out/autosync/latest-primary-success.json',
    '.skyevault-out/autosync/latest-full-repo-success.json'
  ]) {
    const record = readJson(path.join(repoRoot, rel), {});
    for (const run of Array.isArray(record.runs) ? record.runs : []) {
      for (const summary of Array.isArray(run.childSummaries) ? run.childSummaries : []) {
        if (summary.receiptId) ids.add(summary.receiptId);
        if (summary.controlReceiptId) ids.add(summary.controlReceiptId);
      }
    }
  }
  return [...ids];
}

function bindEntry(entry, owner, now) {
  return {
    ...entry,
    workspaceId: owner.ownerWorkspaceId,
    developerId: owner.ownerSubject,
    developerName: owner.ownerName,
    clientName: owner.ownerName,
    clientEmail: owner.ownerEmail,
    custodyScope: owner.custodyScope,
    vaultVisibility: owner.vaultVisibility,
    ownerAccountId: owner.ownerAccountId,
    ownerSubject: owner.ownerSubject,
    ownerEmail: owner.ownerEmail,
    ownerWorkspaceId: owner.ownerWorkspaceId,
    ownerWorkspaceSlug: owner.ownerWorkspaceSlug,
    accessPolicy: owner.accessPolicy,
    clientVaultVisible: owner.clientVaultVisible,
    clientVaultDownloadAllowed: owner.clientVaultDownloadAllowed,
    ownerBoundAt: now,
    ownerBindingSource: 'tools/skyevault-bind-owner-custody.mjs'
  };
}

async function main() {
  applyEnv();
  const now = new Date().toISOString();
  const owner = ownerCustody();
  const receiptIds = [...new Set([...argValues('--receipt'), ...receiptIdsFromAutosync()])];
  if (!receiptIds.length) throw new Error('No receipt IDs were provided or discovered from latest autosync receipts.');

  const bound = [];
  const missing = [];
  for (const receiptId of receiptIds) {
    const record = await loadReceipt(receiptId);
    if (!record?.receipt?.entry || !record?.file?.id) {
      missing.push(receiptId);
      continue;
    }
    const entry = bindEntry(record.receipt.entry, owner, now);
    const receiptSignature = signReceipt(entry);
    const updatedReceipt = {
      ...record.receipt,
      receiptSignature,
      ownerCustodyBinding: {
        boundAt: now,
        custodyScope: owner.custodyScope,
        vaultVisibility: owner.vaultVisibility,
        ownerAccountId: owner.ownerAccountId,
        ownerSubject: owner.ownerSubject,
        ownerWorkspaceId: owner.ownerWorkspaceId,
        accessPolicy: owner.accessPolicy
      },
      entry: { ...entry, receiptSignature }
    };
    await updateJsonFile(record.file.id, updatedReceipt);
    bound.push({
      receiptId,
      receiptFileId: record.file.id,
      fileName: entry.fileName || '',
      fileSize: Number(entry.fileSize || 0),
      workspaceId: entry.workspaceId,
      custodyScope: entry.custodyScope,
      vaultVisibility: entry.vaultVisibility
    });
  }

  if (bound.length) {
    const ledger = await loadLedger(2500).catch(() => ({ entries: [] }));
    const byId = new Map((Array.isArray(ledger.entries) ? ledger.entries : []).map((entry) => [entry.id, entry]));
    for (const item of bound) {
      const record = await loadReceipt(item.receiptId);
      const entry = record?.receipt?.entry;
      if (entry?.id) byId.set(entry.id, entry);
    }
    const entries = [...byId.values()]
      .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
      .slice(0, 2500);
    await upsertJsonFile(getConfigFolderId(), LEDGER_FILE, {
      app: 'client-drop-vault',
      updatedAt: now,
      receiptBacked: true,
      ownerPrivateBinding: {
        boundAt: now,
        boundReceiptCount: bound.length,
        ownerAccountId: owner.ownerAccountId,
        ownerWorkspaceId: owner.ownerWorkspaceId
      },
      entries
    });
  }

  const receipt = {
    ok: missing.length === 0,
    schema: 'skyevault.owner-custody-binding.v1',
    generatedAt: now,
    owner: {
      accountId: owner.ownerAccountId,
      subject: owner.ownerSubject,
      workspaceId: owner.ownerWorkspaceId,
      workspaceSlug: owner.ownerWorkspaceSlug,
      custodyScope: owner.custodyScope,
      vaultVisibility: owner.vaultVisibility,
      accessPolicy: owner.accessPolicy
    },
    bound,
    missing,
    clientVaultAccess: 'blocked for owner-private repo artifacts',
    adminDownloadAccess: 'shared 0S/FS27/SkyGate/Free99 owner/admin gate only'
  };
  const outDir = path.join(repoRoot, 'test-artifacts', 'skyevault-owner-custody-binding');
  fs.mkdirSync(outDir, { recursive: true });
  const stamped = path.join(outDir, `owner-custody-binding-${now.replace(/[:.]/g, '-')}.json`);
  const latest = path.join(outDir, 'owner-custody-binding-latest.json');
  fs.writeFileSync(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(latest, `${JSON.stringify({ ...receipt, stampedReceipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    latest: path.relative(repoRoot, latest),
    bound: bound.map((item) => ({ receiptId: item.receiptId, fileName: item.fileName, fileSize: item.fileSize, custodyScope: item.custodyScope })),
    missing
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
