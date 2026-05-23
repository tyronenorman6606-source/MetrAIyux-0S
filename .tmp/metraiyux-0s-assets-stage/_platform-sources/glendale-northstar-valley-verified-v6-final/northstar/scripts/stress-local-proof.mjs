import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import {
  permissionsForRole,
  hasPermission,
  hashPassword,
  verifyPassword,
  signSession,
  verifySessionCookie,
  requireCsrf,
  sanitizeStateForStore,
  stateHash,
  slugify,
  safeText
} from '../netlify/functions/_shared.mjs';

process.env.SESSION_SECRET ||= 'local-stress-session-secret-64-characters-minimum-20260519';
process.env.COOKIE_SECURE ||= 'false';
process.env.AUDIT_HASH_PEPPER ||= 'local-stress-audit-pepper';

const require = createRequire(import.meta.url);
require('../assets/core.js');
const core = globalThis.SignInProCore;

const started = Date.now();
const assertions = [];
const failures = [];
function assert(name, ok, detail = '') {
  const entry = { name, ok: ok === true, detail: String(detail || '') };
  assertions.push(entry);
  if (!entry.ok) failures.push(entry);
}
function sha(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function uuid(seed) {
  return 'stress-' + sha(seed).slice(0, 24);
}
function makeWorkspace(index) {
  const name = `Stress Tenant ${String(index).padStart(3, '0')}`;
  const slug = slugify(name);
  return { id: uuid('workspace:' + index), slug, name, status: 'active', plan: 'provided-infrastructure', metadata: { stressIndex: index } };
}
function makeSession(workspace, role = 'owner') {
  return {
    user: { id: uuid('user:' + workspace.slug + ':' + role), email: `${role}@${workspace.slug}.test`, role, permissions: permissionsForRole(role) },
    workspace,
    csrfToken: sha('csrf:' + workspace.slug).slice(0, 32)
  };
}
function makeAttendee(workspace, n, sharedId = false) {
  const suffix = String(n).padStart(4, '0');
  return {
    id: sharedId ? 'shared-attendee-id' : `${workspace.slug}-att-${suffix}`,
    eventId: `${workspace.slug.slice(0, 6).toUpperCase()}-${suffix}`,
    badgeName: `Guest ${suffix}`,
    name: `Guest ${suffix} ${workspace.name}`,
    nickname: `G${suffix}`,
    email: `guest.${suffix}@${workspace.slug}.example.test`,
    company: workspace.name,
    role: n % 5 === 0 ? 'Vendor' : 'Guest',
    notes: n % 13 === 0 ? 'Contains sanitized control chars \u0000 \u0001 and long notes '.repeat(8) : 'Stress local attendee',
    timestamp: new Date(1700000000000 + n * 1000).toISOString(),
    updatedAt: new Date(1700000000000 + n * 1000).toISOString(),
    source: n % 7 === 0 ? 'qr' : 'kiosk'
  };
}

class MemoryNorthStarStore {
  constructor() {
    this.workspaces = new Map();
    this.users = new Map();
    this.settings = new Map();
    this.states = new Map();
    this.attendees = new Map();
    this.backups = [];
    this.audit = [];
    this.revisions = new Map();
  }
  provision({ workspace, user, state, settings }) {
    this.workspaces.set(workspace.id, workspace);
    this.users.set(`${workspace.id}:${user.email}`, user);
    this.settings.set(workspace.id, settings || {});
    const clean = sanitizeStateForStore(state, workspace);
    this.states.set(workspace.id, clean);
    this.revisions.set(workspace.id, 1);
    this.audit.push({ workspaceId: workspace.id, userId: user.id, action: 'workspace_provisioned' });
    return clean;
  }
  sync({ session, incomingState, reason = 'stress_sync', makeBackup = false }) {
    if (!hasPermission(session, 'write')) throw new Error('permission denied');
    const clean = sanitizeStateForStore(incomingState, session.workspace);
    const hash = stateHash(clean);
    const nextRev = (this.revisions.get(session.workspace.id) || 0) + 1;
    this.states.set(session.workspace.id, clean);
    this.revisions.set(session.workspace.id, nextRev);
    const keep = new Set();
    for (const attendee of clean.attendees || []) {
      if (!attendee.id) continue;
      const key = `${session.workspace.id}:${attendee.id}`;
      keep.add(key);
      this.attendees.set(key, {
        workspaceId: session.workspace.id,
        attendeeId: attendee.id,
        eventId: attendee.eventId,
        email: String(attendee.email || '').toLowerCase(),
        name: attendee.name,
        data: attendee,
        stateHash: hash
      });
    }
    for (const key of [...this.attendees.keys()]) {
      if (key.startsWith(session.workspace.id + ':') && !keep.has(key)) this.attendees.delete(key);
    }
    if (makeBackup || reason === 'manual_sync') {
      this.backups.push({ workspaceId: session.workspace.id, stateHash: hash, state: clean, createdBy: session.user.id, backupType: reason === 'manual_sync' ? 'manual' : 'sync' });
    }
    this.audit.push({ workspaceId: session.workspace.id, userId: session.user.id, action: 'sync', attendeeCount: clean.attendees.length, stateHash: hash });
    return { state: clean, stateHash: hash, revision: nextRev };
  }
  getVisibleAttendees(session) {
    if (!hasPermission(session, 'read')) throw new Error('permission denied');
    return [...this.attendees.values()].filter(row => row.workspaceId === session.workspace.id);
  }
  getBackups(session) {
    if (!hasPermission(session, 'backup')) throw new Error('permission denied');
    return this.backups.filter(row => row.workspaceId === session.workspace.id);
  }
  getAudit(session) {
    if (!hasPermission(session, 'audit')) throw new Error('permission denied');
    return this.audit.filter(row => row.workspaceId === session.workspace.id);
  }
}

const WORKSPACE_COUNT = Number(process.env.STRESS_WORKSPACES || 72);
const ATTENDEES_PER_WORKSPACE = Number(process.env.STRESS_ATTENDEES_PER_WORKSPACE || 150);
const TRIM_EVERY_WORKSPACE_TO = Number(process.env.STRESS_TRIM_ATTENDEES_TO || 117);

const store = new MemoryNorthStarStore();
const workspaces = [];
const sessions = [];
let totalCreatedAttendees = 0;
let totalPostTrimAttendees = 0;
let totalCsvBytes = 0;
let duplicateBlocks = 0;
let sanitizedNotes = 0;
let eventIdCollisions = 0;
const allHashes = new Set();

for (let i = 0; i < WORKSPACE_COUNT; i += 1) {
  const workspace = makeWorkspace(i);
  const owner = makeSession(workspace, 'owner');
  workspaces.push(workspace);
  sessions.push(owner);

  const state = core.sanitizeState({
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name, role: owner.user.role },
    settings: {
      eventName: `${workspace.name} Guest Access`,
      idLabel: 'Stress ID',
      allowDuplicateEmails: false,
      syncEnabled: true,
      retentionNote: 'Stress proof workspace-local storage with Neon mirror simulation.'
    },
    attendees: [],
    audit: []
  });

  for (let n = 0; n < ATTENDEES_PER_WORKSPACE; n += 1) {
    const attendee = makeAttendee(workspace, n, n === 0);
    state.attendees.push(core.sanitizeState({ attendees: [attendee] }).attendees[0]);
    if (state.attendees[state.attendees.length - 1].notes.length <= 500 && !/[\u0000-\u001F]/.test(state.attendees[state.attendees.length - 1].notes)) sanitizedNotes += 1;
  }
  totalCreatedAttendees += state.attendees.length;

  const duplicate = core.validateAttendee({ name: 'Dup', email: state.attendees[1].email }, state.attendees, state.settings);
  if (!duplicate.ok && duplicate.errors && duplicate.errors.email) duplicateBlocks += 1;

  const ids = new Set();
  for (const attendee of state.attendees) {
    if (ids.has(attendee.eventId)) eventIdCollisions += 1;
    ids.add(attendee.eventId);
  }

  store.provision({ workspace, user: owner.user, state, settings: state.settings });
  const firstSync = store.sync({ session: owner, incomingState: state, reason: 'initial_stress_sync', makeBackup: true });
  allHashes.add(firstSync.stateHash);

  const trimmed = core.addAudit({ ...state, attendees: state.attendees.slice(0, TRIM_EVERY_WORKSPACE_TO) }, 'stress_trim', 'Trimmed attendee list to prove mirror deletion.');
  const secondSync = store.sync({ session: owner, incomingState: trimmed, reason: 'manual_sync', makeBackup: true });
  allHashes.add(secondSync.stateHash);
  totalPostTrimAttendees += trimmed.attendees.length;
  totalCsvBytes += Buffer.byteLength(core.attendeesToCsv(trimmed.attendees, trimmed.settings));
}

assert('baseline closure build version retained', core.APP_VERSION === '6.4.0-workspace-closure', core.APP_VERSION);
assert('workspace storage prefix retained v4', core.WORKSPACE_STATE_PREFIX === 'signinpro_workspace_state_v4', core.WORKSPACE_STATE_PREFIX);
assert('all stress workspaces provisioned', store.workspaces.size === WORKSPACE_COUNT, store.workspaces.size);
assert('all stress users provisioned', store.users.size === WORKSPACE_COUNT, store.users.size);
assert('all stress states stored one per workspace', store.states.size === WORKSPACE_COUNT, store.states.size);
assert('duplicate emails blocked in every workspace', duplicateBlocks === WORKSPACE_COUNT, `${duplicateBlocks}/${WORKSPACE_COUNT}`);
assert('event id collisions did not occur inside workspaces', eventIdCollisions === 0, eventIdCollisions);
assert('total initial attendees generated', totalCreatedAttendees === WORKSPACE_COUNT * ATTENDEES_PER_WORKSPACE, totalCreatedAttendees);
assert('attendee mirror deletion kept only trimmed rows', store.attendees.size === totalPostTrimAttendees, `${store.attendees.size}/${totalPostTrimAttendees}`);
assert('manual backups created twice per workspace', store.backups.length === WORKSPACE_COUNT * 2, store.backups.length);
assert('audit events created for provision and sync activity', store.audit.length === WORKSPACE_COUNT * 3, store.audit.length);
assert('state hashes vary after workspace/state changes', allHashes.size >= WORKSPACE_COUNT * 2 - 2, allHashes.size);
assert('CSV export generated non-empty output across stress states', totalCsvBytes > WORKSPACE_COUNT * 500, totalCsvBytes);
assert('malicious/control note sanitizer executed', sanitizedNotes > WORKSPACE_COUNT, sanitizedNotes);

// Tenant isolation: every workspace has the same shared attendee id, but composite storage must keep rows tenant-scoped.
const sharedRows = [...store.attendees.values()].filter(row => row.attendeeId === 'shared-attendee-id');
assert('same attendee id can exist safely in separate workspace partitions', sharedRows.length === WORKSPACE_COUNT, sharedRows.length);
for (const session of sessions) {
  const visible = store.getVisibleAttendees(session);
  const foreign = visible.filter(row => row.workspaceId !== session.workspace.id);
  if (foreign.length) failures.push({ name: 'foreign attendee leakage', ok: false, detail: session.workspace.slug });
}
assert('no cross-workspace attendee leakage under read filters', failures.filter(f => f.name === 'foreign attendee leakage').length === 0, 'all filtered reads scoped by workspaceId');

// Permission matrix and mutation boundaries.
const viewer = makeSession(workspaces[0], 'viewer');
let viewerWriteBlocked = false;
try { store.sync({ session: viewer, incomingState: store.states.get(workspaces[0].id), reason: 'viewer_write_attempt' }); } catch { viewerWriteBlocked = true; }
assert('viewer cannot write workspace state', viewerWriteBlocked, 'write permission denied');
assert('viewer can read workspace audit', Array.isArray(store.getAudit(viewer)), 'audit read allowed');
let viewerBackupBlocked = false;
try { store.getBackups(viewer); } catch { viewerBackupBlocked = true; }
assert('viewer cannot access backups', viewerBackupBlocked, 'backup permission denied');
assert('owner has provision permission', hasPermission(sessions[0], 'provision') === true, permissionsForRole('owner').join(','));
assert('operator lacks provision permission', hasPermission(makeSession(workspaces[0], 'operator'), 'provision') === false, permissionsForRole('operator').join(','));

// Session, cookie, csrf, password proof.
const pw = 'StressLocalPassword!2026';
const hash = hashPassword(pw);
assert('password hash verifies correct password', verifyPassword(pw, hash) === true, hash.split('$').slice(0, 3).join('$'));
assert('password hash rejects wrong password', verifyPassword('wrong-' + pw, hash) === false, 'wrong password rejected');
const token = signSession({ workspaceId: workspaces[0].id, userId: sessions[0].user.id, csrf: sessions[0].csrfToken });
const verified = verifySessionCookie({ headers: { cookie: `sip_session=${token}` } });
assert('signed session cookie verifies', verified && verified.workspaceId === workspaces[0].id, verified && verified.workspaceId);
const badToken = token.replace(/.$/, token.endsWith('a') ? 'b' : 'a');
assert('tampered session cookie rejected', verifySessionCookie({ headers: { cookie: `sip_session=${badToken}` } }) === null, 'tamper rejected');
let csrfBlocked = false;
try { requireCsrf({ httpMethod: 'POST', headers: {} }, { csrfToken: sessions[0].csrfToken }); } catch { csrfBlocked = true; }
assert('POST without CSRF is blocked', csrfBlocked, 'missing csrf rejected');
let csrfPassed = true;
try { requireCsrf({ httpMethod: 'POST', headers: { 'x-csrf-token': sessions[0].csrfToken } }, { csrfToken: sessions[0].csrfToken }); } catch { csrfPassed = false; }
assert('POST with matching CSRF passes', csrfPassed, 'csrf accepted');

// Slug/safe text/input stress.
assert('slugify removes unsafe company characters', slugify(' Future !! Company / Workspace  ') === 'future-company-workspace', slugify(' Future !! Company / Workspace  '));
assert('safeText strips control characters and limits length', safeText('A\u0000\u0001'.repeat(200), 25).length <= 25 && !/[\u0000-\u001F]/.test(safeText('A\u0000\u0001'.repeat(200), 25)), safeText('A\u0000\u0001'.repeat(200), 25));

// Static closure regression: no explicit TODO/FIXME placeholders in runtime/security paths.
const runtimeFiles = [
  'assets/app.js','assets/core.js','assets/workspace-client.js',
  'netlify/functions/_shared.mjs','netlify/functions/auth-login.mjs','netlify/functions/auth-session.mjs','netlify/functions/operator-provision.mjs','netlify/functions/workspace-sync.mjs','netlify/functions/workspace-users.mjs','netlify/functions/workspace-settings.mjs','netlify/functions/workspace-audit.mjs','netlify/functions/workspace-backups.mjs'
];
const placeholderHits = [];
for (const file of runtimeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const matches = text.match(/TODO|FIXME|stub|mock only|not implemented/gi);
  if (matches) placeholderHits.push({ file, matches: [...new Set(matches)] });
}
assert('runtime/security paths have no TODO/FIXME/stub/not-implemented markers', placeholderHits.length === 0, JSON.stringify(placeholderHits));

const proof = {
  ok: failures.length === 0,
  build: core.APP_VERSION,
  generatedAt: new Date().toISOString(),
  durationMs: Date.now() - started,
  parameters: {
    workspaces: WORKSPACE_COUNT,
    attendeesPerWorkspace: ATTENDEES_PER_WORKSPACE,
    trimmedAttendeesPerWorkspace: TRIM_EVERY_WORKSPACE_TO
  },
  totals: {
    initialAttendeesGenerated: totalCreatedAttendees,
    postTrimAttendeeRows: store.attendees.size,
    backups: store.backups.length,
    auditEvents: store.audit.length,
    csvBytesGenerated: totalCsvBytes,
    uniqueStateHashes: allHashes.size,
    sharedCompositeAttendeeRows: sharedRows.length
  },
  assertions,
  failures
};

fs.mkdirSync('proof', { recursive: true });
fs.writeFileSync('proof/STRESS_LOCAL_PROOF_v6.4.1.json', JSON.stringify(proof, null, 2));
if (!proof.ok) {
  console.error(JSON.stringify(proof, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(proof, null, 2));
