import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdminAccess, requireAdminReadAccess } from './_lib/security.js';
import { loadConfig, saveConfig, loadLedger, loadSessionManifests, loadAuditEvents, writeAuditEventSafe } from './_lib/config.js';

function dashboardLimit(defaultValue = 40, maxValue = 80) {
  const value = Number(process.env.DASHBOARD_LIST_LIMIT || defaultValue);
  if (!Number.isFinite(value) || value <= 0) return defaultValue;
  return Math.min(maxValue, Math.max(1, Math.floor(value)));
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['GET', 'POST']);
  if (wrongMethod) return wrongMethod;

  try {
    if (event.httpMethod === 'GET') {
      const admin = await requireAdminReadAccess(event);
      const includeLedger = event.queryStringParameters?.ledger === 'true';
      const includeSessions = event.queryStringParameters?.sessions === 'true';
      const includeEvents = event.queryStringParameters?.events === 'true';
      const { config, source, configFileId, warning } = await loadConfig();
      const combinedRequest = [includeLedger, includeSessions, includeEvents].filter(Boolean).length > 1;
      const ledgerLimit = dashboardLimit(120, 250);
      const activityLimit = combinedRequest ? dashboardLimit(18, 18) : dashboardLimit(40, 80);
      const ledger = includeLedger ? await loadLedger(ledgerLimit) : null;
      const sessions = includeSessions ? await loadSessionManifests(activityLimit) : null;
      const events = includeEvents ? await loadAuditEvents(activityLimit) : null;
      await writeAuditEventSafe('admin-config-viewed', {
        actor: admin.actor,
        authType: admin.type,
        workspaceId: admin.workspaceId,
        customerId: admin.customerId,
        gateCardId: admin.gateCardId,
        includeLedger,
        includeSessions,
        includeEvents
      });
      return json(200, { ok: true, actor: admin, source, configFileId, warning, config, ledger, sessions, events }, noStoreCors(event));
    }

    const admin = await requireAdminAccess(event);
    const body = await readJson(event);
    const result = await saveConfig(body.config || body, admin.actor || 'admin');
    const audit = await writeAuditEventSafe('admin-config-saved', {
      actor: admin.actor,
      authType: admin.type,
      workspaceId: admin.workspaceId,
      customerId: admin.customerId,
      gateCardId: admin.gateCardId,
      destinations: result.config.destinations.map((destination) => ({ id: destination.id, name: destination.name, enabled: destination.enabled, role: destination.role })),
      routingMode: result.config.routingMode,
      chunkSizeMb: result.config.chunkSizeMb,
      maxFilesPerSubmission: result.config.maxFilesPerSubmission,
      maxTotalSubmissionGb: result.config.maxTotalSubmissionGb
    });
    return json(200, { ok: true, actor: admin, ...result, audit }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
