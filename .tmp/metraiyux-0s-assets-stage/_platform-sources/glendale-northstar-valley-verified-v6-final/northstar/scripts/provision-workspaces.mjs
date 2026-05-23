import fs from 'node:fs/promises';
import path from 'node:path';

function args() {
  const out = { input: 'assets/data/seed-workspaces.json', out: 'provisioned-workspaces.secret.json', baseUrl: process.env.SIGNINPRO_BASE_URL || '', token: process.env.OPERATOR_PROVISION_TOKEN || '', workspace: null };
  const list = process.argv.slice(2);
  for (let i = 0; i < list.length; i += 1) {
    const key = list[i];
    const next = list[i + 1];
    if (key === '--input' || key === '-i') { out.input = next; i += 1; }
    else if (key === '--out' || key === '-o') { out.out = next; i += 1; }
    else if (key === '--base-url') { out.baseUrl = next; i += 1; }
    else if (key === '--token') { out.token = next; i += 1; }
    else if (key === '--workspace') { out.workspace = next; i += 1; }
    else if (key === '--help' || key === '-h') { out.help = true; }
  }
  return out;
}

function usage() {
  return `NorthStar workspace provisioner\n\nRequired env or flags:\n  SIGNINPRO_BASE_URL / --base-url https://your-site.netlify.app\n  OPERATOR_PROVISION_TOKEN / --token your-private-token\n\nSeed all workspaces:\n  npm run admin:provision:seed\n\nProvision from a custom JSON array:\n  npm run admin:provision -- --input ./my-workspaces.json --out ./my-credentials.secret.json\n\nProvision one future company:\n  npm run admin:provision -- --workspace "Future Company|future-company|owner@futurecompany.com"\n\nWorkspace pipe format:\n  "Name|slug|ownerEmail|optionalPassword|optionalRole"\n`;
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

async function loadWorkspaces(options) {
  if (options.workspace) {
    const [name, slug, ownerEmail, password, role] = String(options.workspace).split('|').map((x) => x && x.trim());
    if (!name || !ownerEmail) throw new Error('--workspace requires "Name|slug|ownerEmail|optionalPassword|optionalRole"');
    return [{ name, slug: slug || slugify(name), ownerEmail, password: password || undefined, role: role || 'owner', plan: 'provided-infrastructure', metadata: { source: 'northstar-cli-provisioner', appSettings: { syncEnabled: true }, securitySettings: { providedInfrastructure: true, tenantScoped: true } } }];
  }
  const raw = await fs.readFile(options.input, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.length) throw new Error(`${options.input} must contain a non-empty JSON array.`);
  return parsed;
}

async function provision(baseUrl, token, workspace) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/operator-provision`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(workspace)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.ok) throw new Error(`${workspace.slug || workspace.name}: ${payload.error || `HTTP ${res.status}`}`);
  return { slug: payload.workspace.slug, name: payload.workspace.name, email: payload.user.email, role: payload.user.role, oneTimePassword: payload.oneTimePassword, workspaceId: payload.workspace.id };
}

const options = args();
if (options.help) { console.log(usage()); process.exit(0); }
if (!options.baseUrl || !options.token) {
  console.error(usage());
  console.error('Missing SIGNINPRO_BASE_URL/--base-url or OPERATOR_PROVISION_TOKEN/--token.');
  process.exit(1);
}
const workspaces = await loadWorkspaces(options);
const receipts = [];
let failed = 0;
for (const workspace of workspaces) {
  try {
    const receipt = await provision(options.baseUrl, options.token, workspace);
    receipts.push(receipt);
    console.log(`provisioned ${receipt.slug} -> ${receipt.email}`);
  } catch (error) {
    failed += 1;
    receipts.push({ slug: workspace.slug || slugify(workspace.name), name: workspace.name || '', email: workspace.ownerEmail || workspace.email || '', ok: false, error: error.message });
    console.error(`failed ${workspace.slug || workspace.name}: ${error.message}`);
  }
}
await fs.writeFile(options.out, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: options.baseUrl, count: receipts.length, failed, receipts }, null, 2));
console.log(`Wrote ${path.resolve(options.out)}. Keep this file private.`);
if (failed) process.exit(1);
