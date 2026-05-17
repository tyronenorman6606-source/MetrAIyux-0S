const TASKS_KEY = 'grayscape_tasks_v1';
const JOURNAL_KEY = 'grayscape_journal_v1';
const VAULT_KEY = 'grayscape_vault_v1';
const VAULT_LOCK_KEY = 'grayscape_vault_locked_v1';
const PROFILE_KEY = 'grayscape_profile_v1';
const EVENTS_KEY = 'grayscape_mobile_events';
const NOTES_KEY = 'grayscape_mobile_notes';
const DECREES_KEY = 'grayscape_mobile_decrees';
const GOALS_KEY = 'grayscape_mobile_goals';
const RITUALS_KEY = 'grayscape_mobile_rituals';

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getStore() {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

function readJson(key, fallback) {
  const store = getStore();
  if (!store) return fallback;
  return safeParse(store.getItem(key), fallback);
}

function writeJson(key, value) {
  const store = getStore();
  if (!store) return;
  store.setItem(key, JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function loadGrayScapeSignal() {
  const tasksDb = readJson(TASKS_KEY, { tasks: [] });
  const journalDb = readJson(JOURNAL_KEY, { entries: [] });
  const vaultDb = readJson(VAULT_KEY, { items: [] });
  const profile = readJson(PROFILE_KEY, {});
  const events = readJson(EVENTS_KEY, {});
  const notes = readJson(NOTES_KEY, []);
  const decrees = readJson(DECREES_KEY, []);
  const goals = readJson(GOALS_KEY, []);
  const rituals = readJson(RITUALS_KEY, {});
  const taskItems = Array.isArray(tasksDb.tasks) ? tasksDb.tasks : [];
  const journalEntries = Array.isArray(journalDb.entries) ? journalDb.entries : [];
  const vaultItems = Array.isArray(vaultDb.items) ? vaultDb.items : [];
  const eventCount = Object.values(events || {}).reduce((count, dayEvents) => count + (Array.isArray(dayEvents) ? dayEvents.length : 0), 0);
  const founderMessages = Object.values(events || {}).reduce((count, dayEvents) => {
    if (!Array.isArray(dayEvents)) return count;
    return count + dayEvents.filter((event) => /founder/i.test(event?.summary || '')).length;
  }, 0);

  return {
    online: true,
    checkedAt: new Date().toISOString(),
    profile: {
      displayName: profile.displayName || 'Gray',
      tagline: profile.tagline || 'Build. Record. Execute.'
    },
    tasks: {
      total: taskItems.length,
      open: taskItems.filter((task) => !task.done).length,
      done: taskItems.filter((task) => task.done).length
    },
    journal: {
      entries: journalEntries.length,
      latestTitle: journalEntries[0]?.title || ''
    },
    vault: {
      items: vaultItems.length,
      locked: (getStore()?.getItem(VAULT_LOCK_KEY) || '1') === '1'
    },
    command: {
      events: eventCount,
      founderMessages,
      decrees: Array.isArray(decrees) ? decrees.length : 0,
      goals: Array.isArray(goals) ? goals.length : 0,
      ritualStreak: Number(rituals?.streak || 0)
    },
    rawKeys: {
      tasks: TASKS_KEY,
      journal: JOURNAL_KEY,
      vault: VAULT_KEY,
      events: EVENTS_KEY
    }
  };
}

export function captureGrayScapeTask(title, due = '') {
  const text = String(title || '').trim();
  if (!text) return loadGrayScapeSignal();
  const db = readJson(TASKS_KEY, { tasks: [] });
  const tasks = Array.isArray(db.tasks) ? db.tasks : [];
  const now = Date.now();
  tasks.unshift({
    id: uid('t'),
    title: text,
    due,
    done: false,
    createdAt: now,
    updatedAt: now
  });
  writeJson(TASKS_KEY, { ...db, tasks });
  return loadGrayScapeSignal();
}

export function captureGrayScapeJournal(content, title = 'Overearth Capture') {
  const text = String(content || '').trim();
  if (!text) return loadGrayScapeSignal();
  const db = readJson(JOURNAL_KEY, { entries: [] });
  const entries = Array.isArray(db.entries) ? db.entries : [];
  const now = Date.now();
  entries.unshift({
    id: uid('j'),
    date: new Date().toISOString().slice(0, 10),
    title,
    mood: '',
    content: text,
    createdAt: now,
    updatedAt: now
  });
  writeJson(JOURNAL_KEY, { ...db, entries });
  return loadGrayScapeSignal();
}
