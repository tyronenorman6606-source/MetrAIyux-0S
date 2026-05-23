(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SignInProCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const APP_VERSION = '6.4.0-workspace-closure';
  const STATE_KEY = 'signinpro_hardened_state_v1';
  const WORKSPACE_STATE_PREFIX = 'signinpro_workspace_state_v4';
  const LEGACY_ATTENDEES_KEY = 'event_attendees';
  const LEGACY_SETTINGS_KEY = 'event_settings';

  const DEFAULT_STATE = Object.freeze({
    schemaVersion: 3,
    appVersion: APP_VERSION,
    workspace: {
      id: 'local-preview',
      slug: 'northstar-local',
      name: 'SignIn Pro Local Workspace',
      role: 'operator'
    },
    settings: {
      logo: './assets/brand/signinpro-northstar-skye-tiger-logo.png',
      eventName: 'SignIn Pro Guest Access',
      idLabel: 'Event ID',
      enableSound: true,
      allowDuplicateEmails: false,
      retentionNote: 'Workspace records are scoped to this company and backed up when the NorthStar Office connection is active. Export backups before clearing browser data.',
      syncEnabled: true
    },
    attendees: [],
    audit: []
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeText(value, maxLength = 300) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function normalizeEmail(value) {
    return safeText(value, 254).toLowerCase();
  }

  function validateEmail(value) {
    const email = normalizeEmail(value);
    if (!email) return false;
    if (email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function validateAttendee(input, attendees, settings) {
    const data = {
      name: safeText(input && input.name, 120),
      nickname: safeText(input && input.nickname, 80),
      email: normalizeEmail(input && input.email),
      company: safeText(input && input.company, 120),
      role: safeText(input && input.role, 120),
      notes: safeText(input && input.notes, 500)
    };
    const errors = {};
    if (!data.name) errors.name = 'Full name is required.';
    if (!data.email) errors.email = 'Email is required.';
    else if (!validateEmail(data.email)) errors.email = 'Enter a valid email address.';
    if (!settings || settings.allowDuplicateEmails !== true) {
      const duplicate = Array.isArray(attendees) && attendees.some((a) => normalizeEmail(a.email) === data.email);
      if (duplicate) errors.email = 'This email is already checked in on this device.';
    }
    return { ok: Object.keys(errors).length === 0, errors, data };
  }

  function randomToken(bytes = 10) {
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let output = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const data = new Uint8Array(bytes);
      crypto.getRandomValues(data);
      for (const n of data) output += alphabet[n % alphabet.length];
      return output;
    }
    for (let i = 0; i < bytes; i += 1) output += alphabet[Math.floor(Math.random() * alphabet.length)];
    return output;
  }

  function createEventId(attendees) {
    const existing = new Set((attendees || []).map((a) => String(a.eventId || '')));
    let candidate = '';
    for (let i = 0; i < 12; i += 1) {
      const raw = randomToken(8);
      candidate = raw.slice(0, 4) + '-' + raw.slice(4);
      if (!existing.has(candidate)) return candidate;
    }
    return candidate || ('EVT-' + Date.now().toString(36).toUpperCase());
  }

  function createAttendee(input, attendees, settings) {
    const validation = validateAttendee(input, attendees, settings || DEFAULT_STATE.settings);
    if (!validation.ok) return validation;
    const now = new Date().toISOString();
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'att_' + randomToken(16);
    return {
      ok: true,
      attendee: {
        id,
        eventId: createEventId(attendees),
        badgeName: validation.data.nickname || validation.data.name,
        name: validation.data.name,
        nickname: validation.data.nickname,
        email: validation.data.email,
        company: validation.data.company,
        role: validation.data.role,
        notes: validation.data.notes,
        timestamp: now,
        updatedAt: now,
        source: 'kiosk'
      }
    };
  }


  function sanitizeWorkspace(workspace) {
    const raw = workspace && typeof workspace === 'object' ? workspace : {};
    return {
      id: safeText(raw.id, 80) || 'local-preview',
      slug: safeText(raw.slug, 120) || 'northstar-local',
      name: safeText(raw.name, 160) || 'SignIn Pro Local Workspace',
      role: safeText(raw.role, 40) || 'operator'
    };
  }

  function sanitizeSettings(settings) {
    const base = clone(DEFAULT_STATE.settings);
    const merged = Object.assign(base, settings || {});
    merged.eventName = safeText(merged.eventName, 90) || DEFAULT_STATE.settings.eventName;
    merged.idLabel = safeText(merged.idLabel, 40) || DEFAULT_STATE.settings.idLabel;
    merged.retentionNote = safeText(merged.retentionNote, 220) || DEFAULT_STATE.settings.retentionNote;
    merged.enableSound = merged.enableSound === true;
    merged.allowDuplicateEmails = merged.allowDuplicateEmails === true;
    if (!/^data:image\/(png|jpeg|webp);base64,/i.test(String(merged.logo || '')) && !/^\.\/icons\//.test(String(merged.logo || ''))) {
      merged.logo = DEFAULT_STATE.settings.logo;
    }
    return merged;
  }

  function sanitizeAttendee(value) {
    const timestamp = value && value.timestamp && !Number.isNaN(Date.parse(value.timestamp)) ? new Date(value.timestamp).toISOString() : new Date().toISOString();
    const name = safeText(value && value.name, 120);
    const nickname = safeText(value && value.nickname, 80);
    const email = normalizeEmail(value && value.email);
    const eventId = safeText(value && value.eventId, 40) || createEventId([]);
    return {
      id: safeText(value && value.id, 80) || 'att_' + randomToken(16),
      eventId,
      badgeName: safeText(value && value.badgeName, 120) || nickname || name || 'Guest',
      name: name || 'Guest',
      nickname,
      email,
      company: safeText(value && value.company, 120),
      role: safeText(value && value.role, 120),
      notes: safeText(value && value.notes, 500),
      timestamp,
      updatedAt: value && value.updatedAt && !Number.isNaN(Date.parse(value.updatedAt)) ? new Date(value.updatedAt).toISOString() : timestamp,
      source: safeText(value && value.source, 40) || 'import'
    };
  }

  function sanitizeState(input) {
    const state = clone(DEFAULT_STATE);
    const raw = input && typeof input === 'object' ? input : {};
    state.workspace = sanitizeWorkspace(raw.workspace);
    state.settings = sanitizeSettings(raw.settings);
    state.attendees = Array.isArray(raw.attendees) ? raw.attendees.map(sanitizeAttendee) : [];
    state.audit = Array.isArray(raw.audit) ? raw.audit.slice(-300).map((entry) => ({
      at: entry && entry.at && !Number.isNaN(Date.parse(entry.at)) ? new Date(entry.at).toISOString() : new Date().toISOString(),
      action: safeText(entry && entry.action, 80),
      detail: safeText(entry && entry.detail, 220)
    })) : [];
    state.appVersion = APP_VERSION;
    state.schemaVersion = 2;
    return state;
  }

  function addAudit(state, action, detail) {
    const next = sanitizeState(state);
    next.audit.unshift({ at: new Date().toISOString(), action: safeText(action, 80), detail: safeText(detail, 220) });
    next.audit = next.audit.slice(0, 300);
    return next;
  }

  function escapeCsvField(value) {
    const text = String(value == null ? '' : value);
    return '"' + text.replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
  }

  function attendeesToCsv(attendees, settings) {
    const label = safeText(settings && settings.idLabel, 40) || DEFAULT_STATE.settings.idLabel;
    const header = ['Name', 'Preferred Name', 'Email', 'Company', 'Role', label, 'Check-In Time'].map(escapeCsvField).join(',');
    const rows = (attendees || []).map((a) => [
      a.name,
      a.nickname,
      a.email,
      a.company,
      a.role,
      a.eventId,
      a.timestamp ? new Date(a.timestamp).toISOString() : ''
    ].map(escapeCsvField).join(','));
    return [header].concat(rows).join('\n');
  }

  function buildBackup(state) {
    const clean = sanitizeState(state);
    return {
      product: 'SignIn Pro Executive Edition',
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      schemaVersion: 3,
      workspace: clean.workspace,
      settings: clean.settings,
      attendees: clean.attendees,
      audit: clean.audit
    };
  }

  function parseBackup(text) {
    let parsed;
    try {
      parsed = JSON.parse(String(text || ''));
    } catch (error) {
      return { ok: false, error: 'Backup file is not valid JSON.' };
    }
    if (!parsed || !Array.isArray(parsed.attendees)) return { ok: false, error: 'Backup is missing an attendees array.' };
    return { ok: true, state: sanitizeState(parsed) };
  }

  function legacyStateFromStorage(storage) {
    if (!storage) return null;
    try {
      const attendeesText = storage.getItem(LEGACY_ATTENDEES_KEY);
      const settingsText = storage.getItem(LEGACY_SETTINGS_KEY);
      if (!attendeesText && !settingsText) return null;
      return sanitizeState({
        attendees: attendeesText ? JSON.parse(attendeesText) : [],
        settings: settingsText ? JSON.parse(settingsText) : {},
        audit: [{ at: new Date().toISOString(), action: 'legacy_import', detail: 'Migrated from prior localStorage keys.' }]
      });
    } catch (error) {
      return null;
    }
  }

  return {
    APP_VERSION,
    STATE_KEY,
    WORKSPACE_STATE_PREFIX,
    DEFAULT_STATE,
    safeText,
    normalizeEmail,
    validateEmail,
    validateAttendee,
    createAttendee,
    sanitizeState,
    sanitizeSettings,
    sanitizeWorkspace,
    addAudit,
    escapeCsvField,
    attendeesToCsv,
    buildBackup,
    parseBackup,
    legacyStateFromStorage
  };
});
