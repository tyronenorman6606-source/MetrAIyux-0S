import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdmin } from './_lib/security.js';
import { loadConfig, loadLedger, loadSessionManifests, loadAuditEvents, getConfigFolderId, writeAuditEventSafe } from './_lib/config.js';
import { createJsonFile } from './_lib/google-drive.js';

function backupFolderId() {
  return String(process.env.BACKUP_PREFIX || process.env.BACKUP_FOLDER_ID || '').trim() || getConfigFolderId();
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    requireAdmin(event);
    const body = await readJson(event).catch(() => ({}));
    const includeEvents = body.includeEvents !== false;
    const includeSessions = body.includeSessions !== false;
    const [{ config, source }, ledger, sessions, events] = await Promise.all([
      loadConfig(),
      loadLedger(),
      includeSessions ? loadSessionManifests(250) : Promise.resolve([]),
      includeEvents ? loadAuditEvents(250) : Promise.resolve([])
    ]);
    const createdAt = new Date().toISOString();
    const backup = {
      app: 'client-drop-vault',
      backupVersion: 1,
      createdAt,
      source,
      counts: {
        ledgerEntries: ledger.entries.length,
        sessions: sessions.length,
        events: events.length
      },
      config,
      ledger: ledger.entries,
      sessions,
      events
    };
    const name = `skye-upload-vault-backup-${createdAt.replace(/[:.]/g, '-')}.json`;
    const saved = await createJsonFile(backupFolderId(), name, backup);
    const audit = await writeAuditEventSafe('admin-backup-created', {
      backupFileId: saved.id,
      backupFileName: saved.name,
      ledgerEntries: ledger.entries.length,
      sessions: sessions.length,
      events: events.length
    });
    return json(200, { ok: true, backup: { name, saved, counts: backup.counts }, audit }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
