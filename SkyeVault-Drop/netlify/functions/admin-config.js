import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdmin } from './_lib/security.js';
import { loadConfig, saveConfig, loadLedger, loadSessionManifests, loadAuditEvents, writeAuditEventSafe } from './_lib/config.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['GET', 'POST']);
  if (wrongMethod) return wrongMethod;

  try {
    requireAdmin(event);

    if (event.httpMethod === 'GET') {
      const includeLedger = event.queryStringParameters?.ledger === 'true';
      const includeSessions = event.queryStringParameters?.sessions === 'true';
      const includeEvents = event.queryStringParameters?.events === 'true';
      const { config, source, configFileId, warning } = await loadConfig();
      const ledger = includeLedger ? await loadLedger() : null;
      const sessions = includeSessions ? await loadSessionManifests(120) : null;
      const events = includeEvents ? await loadAuditEvents(120) : null;
      return json(200, { ok: true, source, configFileId, warning, config, ledger, sessions, events }, noStoreCors(event));
    }

    const body = await readJson(event);
    const result = await saveConfig(body.config || body, 'admin');
    const audit = await writeAuditEventSafe('admin-config-saved', {
      destinations: result.config.destinations.map((destination) => ({ id: destination.id, name: destination.name, enabled: destination.enabled, role: destination.role })),
      routingMode: result.config.routingMode,
      chunkSizeMb: result.config.chunkSizeMb,
      maxFilesPerSubmission: result.config.maxFilesPerSubmission,
      maxTotalSubmissionGb: result.config.maxTotalSubmissionGb
    });
    return json(200, { ok: true, ...result, audit }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
