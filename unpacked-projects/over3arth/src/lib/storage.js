import { STATE_SCHEMA_VERSION } from './engine';

const STORAGE_KEY = 'over3arth-state-v1';
const BACKUP_KEY = 'over3arth-state-v1-backup';
const SNAPSHOT_KEY = 'over3arth-state-v1-snapshots';
const AUTO_SNAPSHOT_DAY_KEY = 'over3arth-state-v1-auto-snapshot-day';
const MAX_SNAPSHOTS = 12;
const MAX_TEXT_LENGTH = 12000;

const DEFAULT_SETTINGS = {
  sound: false,
  intensity: 'mythic',
  reminderHour: '08:00',
  notificationPermission: 'default',
  weeklyReviewDay: 'SUN',
  plan: 'founder-preview',
  selectedPlan: 'forge',
  focusDuration: 25,
  focusSound: false
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, MAX_TEXT_LENGTH);
}

function normalizeProfile(profile = {}, fallbackProfile = {}) {
  const safe = asObject(profile);
  return {
    ...fallbackProfile,
    ...safe,
    name: asText(safe.name, fallbackProfile.name || 'World Forger'),
    worldName: asText(safe.worldName, fallbackProfile.worldName || 'New Earth Prime'),
    primeIntention: asText(safe.primeIntention, fallbackProfile.primeIntention || ''),
    archetype: asText(safe.archetype, fallbackProfile.archetype || 'architect'),
    onboardingComplete: Boolean(safe.onboardingComplete)
  };
}

function normalizeCollection(collection) {
  return asArray(collection).filter((item) => item && typeof item === 'object').map((item) => ({ ...item }));
}

function normalizeSettings(settings = {}) {
  const safe = asObject(settings);
  return {
    ...DEFAULT_SETTINGS,
    ...safe,
    reminderHour: asText(safe.reminderHour, DEFAULT_SETTINGS.reminderHour).slice(0, 5),
    notificationPermission: asText(safe.notificationPermission, DEFAULT_SETTINGS.notificationPermission),
    weeklyReviewDay: asText(safe.weeklyReviewDay, DEFAULT_SETTINGS.weeklyReviewDay),
    plan: asText(safe.plan, DEFAULT_SETTINGS.plan),
    selectedPlan: asText(safe.selectedPlan, DEFAULT_SETTINGS.selectedPlan)
  };
}

export function normalizeState(candidate, fallback) {
  const source = asObject(candidate);
  return {
    ...fallback,
    ...source,
    schemaVersion: STATE_SCHEMA_VERSION,
    profile: normalizeProfile(source.profile, fallback.profile),
    goals: normalizeCollection(source.goals),
    quests: normalizeCollection(source.quests),
    rituals: normalizeCollection(source.rituals),
    affirmations: normalizeCollection(source.affirmations),
    notes: normalizeCollection(source.notes),
    ledger: normalizeCollection(source.ledger),
    reviews: normalizeCollection(source.reviews),
    contracts: normalizeCollection(source.contracts),
    recoveryRites: normalizeCollection(source.recoveryRites),
    shareCards: normalizeCollection(source.shareCards),
    launchSignals: normalizeCollection(source.launchSignals),
    focusSessions: normalizeCollection(source.focusSessions),
    anchors: normalizeCollection(source.anchors),
    epochs: normalizeCollection(source.epochs),
    allies: normalizeCollection(source.allies),
    canon: normalizeCollection(source.canon),
    settings: normalizeSettings(source.settings),
    hydrated: true
  };
}

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return normalizeState(parsed, fallback);
  } catch (error) {
    console.warn('Over3arth primary storage load failed:', error);
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (!backup) return fallback;
      return normalizeState(JSON.parse(backup), fallback);
    } catch (backupError) {
      console.warn('Over3arth backup storage load failed:', backupError);
      return fallback;
    }
  }
}

export function saveState(state) {
  try {
    const safeState = { ...state, schemaVersion: STATE_SCHEMA_VERSION, updatedAt: new Date().toISOString() };
    delete safeState.hydrated;
    const serialized = JSON.stringify(safeState);
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous) localStorage.setItem(BACKUP_KEY, previous);
    localStorage.setItem(STORAGE_KEY, serialized);
    maybeWriteAutoSnapshot(safeState);
  } catch (error) {
    console.warn('Over3arth storage save failed:', error);
  }
}

export function exportState(state) {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Over3arth',
    version: '1.6.0',
    schemaVersion: STATE_SCHEMA_VERSION,
    state: { ...state, schemaVersion: STATE_SCHEMA_VERSION }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `over3arth-reality-ledger-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseImportedState(raw, fallback) {
  const parsed = JSON.parse(String(raw));
  if (!parsed || typeof parsed !== 'object') throw new Error('The file is not a valid JSON object.');
  if (parsed.app && parsed.app !== 'Over3arth') throw new Error('This JSON file was not exported from Over3arth.');
  const state = parsed.state || parsed;
  if (!state || typeof state !== 'object') throw new Error('Missing Over3arth state payload.');
  if (!state.profile && !state.goals && !state.notes && !state.ledger) throw new Error('The file does not contain recognizable Over3arth data.');
  return normalizeState(state, fallback);
}

export function resetState() {
  const confirmed = window.confirm('Reset this Over3arth world on this device? Export first if you want a backup.');
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  window.location.reload();
}


function readSnapshots() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((snapshot) => snapshot && typeof snapshot === 'object') : [];
  } catch (error) {
    console.warn('Over3arth snapshot vault read failed:', error);
    return [];
  }
}

function writeSnapshots(snapshots) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, MAX_SNAPSHOTS)));
}

function compactSnapshotState(state) {
  const safeState = { ...state, schemaVersion: STATE_SCHEMA_VERSION, updatedAt: new Date().toISOString() };
  delete safeState.hydrated;
  return safeState;
}

function maybeWriteAutoSnapshot(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(AUTO_SNAPSHOT_DAY_KEY) === today) return;
  const snapshot = {
    id: `snapshot_auto_${today}`,
    reason: 'Daily automatic snapshot',
    createdAt: new Date().toISOString(),
    schemaVersion: STATE_SCHEMA_VERSION,
    state: compactSnapshotState(state)
  };
  const snapshots = readSnapshots().filter((item) => item.id !== snapshot.id);
  writeSnapshots([snapshot, ...snapshots]);
  localStorage.setItem(AUTO_SNAPSHOT_DAY_KEY, today);
}

export function getSnapshotVault() {
  return readSnapshots().map((snapshot) => ({
    id: snapshot.id,
    reason: snapshot.reason || 'Snapshot',
    createdAt: snapshot.createdAt,
    schemaVersion: snapshot.schemaVersion || 1,
    goals: snapshot.state?.goals?.length || 0,
    quests: snapshot.state?.quests?.length || 0,
    notes: snapshot.state?.notes?.length || 0,
    rituals: snapshot.state?.rituals?.length || 0,
    focusSessions: snapshot.state?.focusSessions?.length || 0,
    anchors: snapshot.state?.anchors?.length || 0,
    epochs: snapshot.state?.epochs?.length || 0,
    allies: snapshot.state?.allies?.length || 0,
    canon: snapshot.state?.canon?.length || 0
  }));
}

export function saveSnapshot(state, reason = 'Manual snapshot') {
  const snapshot = {
    id: `snapshot_${Date.now().toString(36)}`,
    reason,
    createdAt: new Date().toISOString(),
    schemaVersion: STATE_SCHEMA_VERSION,
    state: compactSnapshotState(state)
  };
  const snapshots = readSnapshots();
  writeSnapshots([snapshot, ...snapshots]);
  return snapshot;
}

export function restoreSnapshot(snapshotId, fallback) {
  const snapshot = readSnapshots().find((item) => item.id === snapshotId);
  if (!snapshot) throw new Error('Snapshot not found.');
  return normalizeState(snapshot.state, fallback);
}

export function clearSnapshots() {
  localStorage.removeItem(SNAPSHOT_KEY);
  localStorage.removeItem(AUTO_SNAPSHOT_DAY_KEY);
}
