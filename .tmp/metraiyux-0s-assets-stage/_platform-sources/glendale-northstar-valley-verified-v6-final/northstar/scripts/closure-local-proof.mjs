import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const proof = {
  ok: false,
  build: '6.4.0-workspace-closure',
  generatedAt: new Date().toISOString(),
  assertions: [],
  failures: []
};

function assert(name, condition, detail = '') {
  const row = { name, ok: Boolean(condition), detail };
  proof.assertions.push(row);
  if (!row.ok) proof.failures.push(row);
}

function loadCore() {
  const code = fs.readFileSync(new URL('../assets/core.js', import.meta.url), 'utf8');
  const sandbox = {
    console,
    module: { exports: {} },
    crypto: {
      randomUUID: () => crypto.randomUUID(),
      getRandomValues: (arr) => crypto.webcrypto.getRandomValues(arr)
    }
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: 'assets/core.js' });
  return sandbox.module.exports || sandbox.SignInProCore;
}

class LocalProofStore {
  constructor(core) {
    this.core = core;
    this.workspaces = new Map();
    this.users = new Map();
    this.states = new Map();
    this.attendees = new Map();
    this.backups = new Map();
    this.audit = [];
  }
  provision(input) {
    const slug = String(input.slug || input.name).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
    const id = this.workspaces.get(slug)?.id || crypto.randomUUID();
    const workspace = { id, slug, name: input.name, status: 'active', plan: input.plan || 'provided-infrastructure', metadata: input.metadata || {} };
    const user = { id: crypto.randomUUID(), workspaceId: id, email: String(input.ownerEmail || input.email).toLowerCase(), role: input.role || 'owner', status: 'active' };
    const state = this.core.sanitizeState({
      schemaVersion: 4,
      appVersion: '6.4.0-workspace-closure',
      workspace: { id, slug, name: workspace.name, role: user.role },
      settings: { eventName: `${workspace.name} Guest Access`, syncEnabled: true, idLabel: 'Event ID' },
      attendees: [],
      audit: [{ at: new Date().toISOString(), action: 'workspace_provisioned', detail: 'Local proof provision.' }]
    });
    this.workspaces.set(slug, workspace);
    this.users.set(`${id}:${user.email}`, user);
    if (!this.states.has(id)) this.states.set(id, state);
    this.audit.push({ workspaceId: id, userId: user.id, action: 'workspace_provisioned' });
    return { workspace, user };
  }
  session(slug, email) {
    const workspace = this.workspaces.get(slug);
    if (!workspace) throw new Error('workspace_missing');
    const user = this.users.get(`${workspace.id}:${String(email).toLowerCase()}`);
    if (!user || user.status !== 'active') throw new Error('user_missing');
    return { workspace, user, csrfToken: crypto.randomBytes(18).toString('base64url') };
  }
  requireWrite(session) {
    if (!['owner','admin','operator'].includes(session.user.role)) throw new Error('write_denied');
  }
  sync(session, nextState, makeBackup = false) {
    this.requireWrite(session);
    const clean = this.core.sanitizeState(nextState);
    clean.workspace = { id: session.workspace.id, slug: session.workspace.slug, name: session.workspace.name, role: session.user.role };
    clean.schemaVersion = 4;
    clean.appVersion = '6.4.0-workspace-closure';
    this.states.set(session.workspace.id, clean);
    const existingKeys = [...this.attendees.keys()].filter((key) => key.startsWith(`${session.workspace.id}:`));
    const keep = new Set();
    for (const attendee of clean.attendees) {
      const id = String(attendee.id || '');
      if (!id) continue;
      const key = `${session.workspace.id}:${id}`;
      keep.add(key);
      this.attendees.set(key, { workspaceId: session.workspace.id, attendeeId: id, data: attendee });
    }
    for (const key of existingKeys) if (!keep.has(key)) this.attendees.delete(key);
    if (makeBackup) {
      const list = this.backups.get(session.workspace.id) || [];
      list.unshift({ id: crypto.randomUUID(), workspaceId: session.workspace.id, state: clean, createdAt: new Date().toISOString() });
      this.backups.set(session.workspace.id, list);
    }
    this.audit.push({ workspaceId: session.workspace.id, userId: session.user.id, action: 'sync', attendees: clean.attendees.length });
    return clean;
  }
  readState(session) { return this.states.get(session.workspace.id); }
  readAttendees(session) { return [...this.attendees.values()].filter((a) => a.workspaceId === session.workspace.id); }
  readBackups(session) { return this.backups.get(session.workspace.id) || []; }
}

const core = loadCore();
const seed = JSON.parse(fs.readFileSync(new URL('../assets/data/seed-workspaces.json', import.meta.url), 'utf8'));
const db = new LocalProofStore(core);
const first = db.provision(seed[0]);
const second = db.provision(seed[1]);
const future = db.provision({ name: 'Future Proof Company', slug: 'future-proof-company', ownerEmail: 'owner@future-proof-company.test', plan: 'provided-infrastructure' });

const s1 = db.session(first.workspace.slug, first.user.email);
const s2 = db.session(second.workspace.slug, second.user.email);
const s3 = db.session(future.workspace.slug, future.user.email);
const attendee1 = core.createAttendee({ name: 'Alice Tenant One', email: 'alice@example.test', company: first.workspace.name, role: 'Guest' }, [], core.DEFAULT_STATE.settings).attendee;
const attendee2 = core.createAttendee({ name: 'Bob Tenant Two', email: 'bob@example.test', company: second.workspace.name, role: 'Guest' }, [], core.DEFAULT_STATE.settings).attendee;
const attendee3 = core.createAttendee({ name: 'Carol Updated', email: 'carol@example.test', company: first.workspace.name, role: 'VIP' }, [], core.DEFAULT_STATE.settings).attendee;

db.sync(s1, { ...core.DEFAULT_STATE, workspace: s1.workspace, attendees: [attendee1], settings: { ...core.DEFAULT_STATE.settings, syncEnabled: true } }, true);
db.sync(s2, { ...core.DEFAULT_STATE, workspace: s2.workspace, attendees: [attendee2], settings: { ...core.DEFAULT_STATE.settings, syncEnabled: true } }, true);
db.sync(s1, { ...core.DEFAULT_STATE, workspace: s1.workspace, attendees: [attendee3], settings: { ...core.DEFAULT_STATE.settings, syncEnabled: true } }, true);

const state1 = db.readState(s1);
const state2 = db.readState(s2);
assert('core version is closure build', core.APP_VERSION === '6.4.0-workspace-closure', core.APP_VERSION);
assert('workspace storage prefix is v4', core.WORKSPACE_STATE_PREFIX === 'signinpro_workspace_state_v4', core.WORKSPACE_STATE_PREFIX);
assert('three workspaces provisioned locally', db.workspaces.size === 3, String(db.workspaces.size));
assert('tenant one state has only updated tenant one attendee', state1.attendees.length === 1 && state1.attendees[0].name === 'Carol Updated', JSON.stringify(state1.attendees.map(a => a.name)));
assert('tenant two state has only tenant two attendee', state2.attendees.length === 1 && state2.attendees[0].name === 'Bob Tenant Two', JSON.stringify(state2.attendees.map(a => a.name)));
assert('attendee mirror deletes removed local attendees', db.readAttendees(s1).length === 1 && db.readAttendees(s1)[0].data.name === 'Carol Updated', JSON.stringify(db.readAttendees(s1).map(a => a.data.name)));
assert('tenant one cannot see tenant two attendee mirror', !db.readAttendees(s1).some((a) => a.data.name === 'Bob Tenant Two'), 'tenant filter by workspaceId');
assert('tenant two cannot see tenant one attendee mirror', !db.readAttendees(s2).some((a) => a.data.name === 'Carol Updated'), 'tenant filter by workspaceId');
assert('manual backup snapshots are workspace scoped', db.readBackups(s1).length === 2 && db.readBackups(s2).length === 1 && db.readBackups(s3).length === 0, JSON.stringify({ one: db.readBackups(s1).length, two: db.readBackups(s2).length, future: db.readBackups(s3).length }));
assert('owner permission can provision future companies', future.user.role === 'owner' && future.workspace.slug === 'future-proof-company', future.workspace.slug);

const appCode = fs.readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
const clientCode = fs.readFileSync(new URL('../assets/workspace-client.js', import.meta.url), 'utf8');
const syncCode = fs.readFileSync(new URL('../netlify/functions/workspace-sync.mjs', import.meta.url), 'utf8');
const provisionCode = fs.readFileSync(new URL('../netlify/functions/operator-provision.mjs', import.meta.url), 'utf8');
assert('admin menu has provision tab renderer', appCode.includes('renderProvision') && appCode.includes('operator-provision-form'), 'renderProvision + form present');
assert('app has no stale escapeHtml call', !appCode.includes('escapeHtml('), 'esc() is the active HTML escape helper');
assert('client has real operator provision call', clientCode.includes("api('/operator-provision'") && clientCode.includes('authorization: `Bearer'), 'operatorProvision uses API endpoint and bearer token');
assert('sync sends manual backup flag', appCode.includes("Workspace.push(Core.sanitizeState(state), reason || 'local_update', makeBackup === true)"), 'makeBackup true reaches API');
assert('workspace sync mirrors deletions to attendee table', syncCode.includes('delete from attendees where workspace_id') && syncCode.includes('attendeeIds.length'), 'delete removed attendees by workspace');
assert('operator provision writes workspace user settings state audit', ['workspaces','workspace_users','workspace_settings','workspace_states','workspace_audit_events'].every((term) => provisionCode.includes(term)), 'all core tables touched');
assert('seed file contains client workspaces', seed.length >= 11, String(seed.length));

proof.summary = {
  assertions: proof.assertions.length,
  failures: proof.failures.length,
  localWorkspaces: db.workspaces.size,
  tenantOneAttendees: db.readAttendees(s1).length,
  tenantTwoAttendees: db.readAttendees(s2).length,
  tenantOneBackups: db.readBackups(s1).length,
  tenantTwoBackups: db.readBackups(s2).length
};
proof.ok = proof.failures.length === 0;
fs.mkdirSync(new URL('../proof/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../proof/CLOSURE_LOCAL_PROOF_v6.4.0.json', import.meta.url), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
if (!proof.ok) process.exit(1);
