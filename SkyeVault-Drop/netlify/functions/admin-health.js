import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdmin } from './_lib/security.js';
import { loadConfig, getConfigFolderId, CONFIG_FILE, LEDGER_FILE, loadAuditEvents, writeAuditEventSafe } from './_lib/config.js';
import { getAccessToken, getFolderMetadata, createAndTrashHealthcheck, findFileInFolder } from './_lib/google-drive.js';
import { notificationConfigSummary } from './_lib/notifications.js';
import { scannerConfigSummary } from './_lib/scanner.js';
import { abusePolicySummary } from './_lib/rate-limit.js';

function check(name, ok, detail, severity = 'required', extra = {}) {
  return { name, ok: Boolean(ok), detail, severity, ...extra };
}

async function destinationHealth(destination, writeTest) {
  const result = {
    id: destination.id,
    name: destination.name,
    role: destination.role,
    enabled: destination.enabled !== false,
    priority: destination.priority,
    folderIdPresent: Boolean(destination.folderId),
    checks: []
  };
  if (!destination.folderId) {
    result.checks.push(check('Folder ID configured', false, 'This destination has no folder ID.'));
    result.ok = false;
    return result;
  }
  try {
    const folder = await getFolderMetadata(destination.folderId);
    result.folder = {
      id: folder.id,
      name: folder.name,
      mimeType: folder.mimeType,
      driveId: folder.driveId || null,
      canAddChildren: folder.capabilities?.canAddChildren ?? null,
      webViewLink: folder.webViewLink || ''
    };
    result.checks.push(check('R2 prefix readable', folder.provider === 'cloudflare-r2' || folder.mimeType === 'application/vnd.google-apps.folder', `Read ${folder.name || destination.folderId}.`));
    result.checks.push(check('Can add children', folder.capabilities?.canAddChildren !== false, `canAddChildren=${folder.capabilities?.canAddChildren ?? 'unknown'}.`, 'warning'));
    if (writeTest) {
      const temp = await createAndTrashHealthcheck(destination.folderId);
      result.checks.push(check('Write/delete healthcheck', true, `Created and trashed temporary healthcheck ${temp.id}.`));
    }
  } catch (error) {
    result.checks.push(check('R2 destination access', false, error.message, 'required', { statusCode: error.statusCode || 500 }));
  }
  result.ok = result.checks.every((item) => item.severity !== 'required' || item.ok);
  return result;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    requireAdmin(event);
    const body = await readJson(event);
    const writeTest = body.writeTest !== false;
    const checks = [];

    checks.push(check('ADMIN_TOKEN configured', Boolean(process.env.ADMIN_TOKEN), process.env.ADMIN_TOKEN ? 'Admin API token exists.' : 'Missing ADMIN_TOKEN.'));
    checks.push(check('CLIENT_PORTAL_KEY configured', Boolean(process.env.CLIENT_PORTAL_KEY), process.env.CLIENT_PORTAL_KEY ? 'Client upload code is required.' : 'Portal is open to anyone with the link unless origin/Turnstile controls block it.', 'warning'));
    checks.push(check('ALLOWED_ORIGINS configured', Boolean(process.env.ALLOWED_ORIGINS), process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS : 'No origin allow-list set.', 'warning'));
    checks.push(check('TURNSTILE_SECRET_KEY configured', Boolean(process.env.TURNSTILE_SECRET_KEY), process.env.TURNSTILE_SECRET_KEY ? 'Human verification can be enforced.' : 'Turnstile is off. Use portal code and rate limits at minimum.', 'warning'));

    await getAccessToken();
    checks.push(check('Cloudflare R2 credentials', true, 'R2 S3-compatible credentials can sign storage requests.'));

    const configFolderId = getConfigFolderId();
    const configFolder = await getFolderMetadata(configFolderId);
    checks.push(check('Config prefix readable', configFolder?.provider === 'cloudflare-r2' || configFolder?.mimeType === 'application/vnd.google-apps.folder', `Read config prefix ${configFolder?.name || configFolderId}.`));
    if (writeTest) {
      const temp = await createAndTrashHealthcheck(configFolderId);
      checks.push(check('Config folder writable', true, `Created and trashed temporary healthcheck ${temp.id}.`));
    }

    const [configLookup, ledgerLookup] = await Promise.all([
      findFileInFolder(configFolderId, CONFIG_FILE).catch(() => null),
      findFileInFolder(configFolderId, LEDGER_FILE).catch(() => null)
    ]);
    checks.push(check('R2 config object state', true, configLookup ? `${CONFIG_FILE} exists.` : `${CONFIG_FILE} does not exist yet; env bootstrap/admin save will create it.`, 'info'));
    checks.push(check('R2 ledger object state', true, ledgerLookup ? `${LEDGER_FILE} exists.` : `${LEDGER_FILE} does not exist yet; first completed upload creates it.`, 'info'));

    const { config, source, warning } = await loadConfig();
    checks.push(check('Runtime config loads', Array.isArray(config.destinations), `Loaded from ${source}${warning ? ` with warning: ${warning}` : ''}.`));
    checks.push(check('Enabled destination available', config.destinations.some((destination) => destination.enabled && destination.folderId), `${config.destinations.filter((destination) => destination.enabled && destination.folderId).length} enabled destinations with folder IDs.`));

    const destinationResults = [];
    for (const destination of config.destinations) {
      destinationResults.push(await destinationHealth(destination, writeTest));
    }

    const notifications = notificationConfigSummary();
    const scanner = scannerConfigSummary();
    const abuse = abusePolicySummary();
    const recentEvents = await loadAuditEvents(20).catch(() => []);
    const audit = await writeAuditEventSafe('admin-health-ran', {
      writeTest,
      checkCount: checks.length,
      destinationCount: destinationResults.length,
      failedDestinations: destinationResults.filter((item) => !item.ok).length
    });

    const requiredFailed = checks.filter((item) => item.severity === 'required' && !item.ok).length
      + destinationResults.flatMap((item) => item.checks).filter((item) => item.severity === 'required' && !item.ok).length;
    return json(200, {
      ok: requiredFailed === 0,
      source,
      checks,
      destinations: destinationResults,
      notifications,
      scanner,
      abuse,
      recentEvents,
      audit
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
