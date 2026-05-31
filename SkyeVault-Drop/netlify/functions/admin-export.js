import { json, method, handleOptions, noStoreCors } from './_lib/http.js';
import { requireAdminReadAccess } from './_lib/security.js';
import { loadConfig, loadLedger, loadSessionManifests, loadAuditEvents, writeAuditEventSafe } from './_lib/config.js';
import { toCsv, flattenLedgerEntry, flattenSession, flattenEvent } from './_lib/exporters.js';

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { ...headers, 'cache-control': 'no-store' }, body };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['GET']);
  if (wrongMethod) return wrongMethod;

  try {
    const admin = await requireAdminReadAccess(event);
    const type = String(event.queryStringParameters?.type || 'ledger').toLowerCase();
    const format = String(event.queryStringParameters?.format || 'json').toLowerCase();
    const { config, source } = await loadConfig();
    const wantsLedger = type === 'all' || type === 'ledger';
    const wantsSessions = type === 'all' || type === 'sessions';
    const wantsEvents = type === 'all' || type === 'events';
    const ledger = wantsLedger ? await loadLedger(2500) : { entries: [] };
    const sideLimit = type === 'all' ? 18 : 40;
    const sessions = wantsSessions ? await loadSessionManifests(sideLimit) : [];
    const events = wantsEvents ? await loadAuditEvents(sideLimit) : [];
    const payload = {
      app: 'client-drop-vault',
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      source,
      actor: admin,
      type,
      config: type === 'all' || type === 'config' ? config : undefined,
      ledger: type === 'all' || type === 'ledger' ? ledger.entries : undefined,
      sessions: type === 'all' || type === 'sessions' ? sessions : undefined,
      events: type === 'all' || type === 'events' ? events : undefined
    };
    await writeAuditEventSafe('admin-export-created', {
      actor: admin.actor,
      authType: admin.type,
      workspaceId: admin.workspaceId,
      customerId: admin.customerId,
      gateCardId: admin.gateCardId,
      type,
      format
    });

    if (format === 'csv') {
      let rows = [];
      if (type === 'sessions') rows = sessions.map(flattenSession);
      else if (type === 'events') rows = events.map(flattenEvent);
      else rows = ledger.entries.map(flattenLedgerEntry);
      const csv = toCsv(rows);
      return response(200, csv, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="client-drop-vault-${type}-${Date.now()}.csv"`,
        ...noStoreCors(event)
      });
    }

    return response(200, JSON.stringify(payload, null, 2), {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="client-drop-vault-${type}-${Date.now()}.json"`,
      ...noStoreCors(event)
    });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
