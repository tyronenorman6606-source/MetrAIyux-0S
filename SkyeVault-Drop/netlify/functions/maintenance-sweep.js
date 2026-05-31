import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdminAccess, adminAuditDetails } from './_lib/security.js';
import { loadSessionManifests, updateSessionManifestStatus, writeAuditEventSafe, writeMaintenanceReport } from './_lib/config.js';

function ageHours(iso) {
  const created = Date.parse(iso || '');
  if (!Number.isFinite(created)) return Infinity;
  return (Date.now() - created) / (60 * 60 * 1000);
}

function defaultStaleHours() {
  const value = Number(process.env.STALE_SESSION_HOURS || 72);
  if (!Number.isFinite(value) || value <= 0) return 72;
  return Math.min(24 * 365, Math.max(1, value));
}

export const config = {
  schedule: process.env.MAINTENANCE_CRON || '0 3 * * *'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['GET', 'POST']);
  if (wrongMethod) return wrongMethod;

  try {
    let admin = null;
    if (event.httpMethod === 'POST') admin = await requireAdminAccess(event);
    else if (process.env.MAINTENANCE_ALLOW_UNAUTHENTICATED_SCHEDULE !== 'true') admin = await requireAdminAccess(event);

    const body = event.httpMethod === 'POST' ? await readJson(event) : {};
    const staleHours = Number(body.staleHours || defaultStaleHours());
    const dryRun = body.dryRun === true || process.env.MAINTENANCE_DRY_RUN === 'true';
    const manifests = await loadSessionManifests(250);
    const stalePending = manifests.filter((manifest) => {
      const status = String(manifest.status || '').toLowerCase();
      return ['pending', 'created', 'uploading'].includes(status) && ageHours(manifest.createdAt) >= staleHours;
    });

    const updates = [];
    if (!dryRun) {
      for (const manifest of stalePending) {
        try {
          const result = await updateSessionManifestStatus(manifest.sessionId, 'stale', {
            lastError: `Marked stale by maintenance after ${Math.round(ageHours(manifest.createdAt))} hours without receipt finalization.`,
            policy: { staleSessionHours: staleHours, maintenanceMarkedAt: new Date().toISOString() }
          });
          updates.push({ sessionId: manifest.sessionId, ok: true, fileId: result?.file?.id || null });
        } catch (error) {
          updates.push({ sessionId: manifest.sessionId, ok: false, error: error.message });
        }
      }
    }

    const summary = {
      createdAt: new Date().toISOString(),
      dryRun,
      staleHours,
      scanned: manifests.length,
      staleFound: stalePending.length,
      staleUpdated: updates.filter((item) => item.ok).length,
      updateFailures: updates.filter((item) => !item.ok).length,
      staleSessions: stalePending.slice(0, 120).map((manifest) => ({
        sessionId: manifest.sessionId,
        status: manifest.status,
        createdAt: manifest.createdAt,
        ageHours: Math.round(ageHours(manifest.createdAt)),
        fileName: manifest.file?.name || '',
        clientName: manifest.intake?.clientName || '',
        projectName: manifest.intake?.projectName || ''
      })),
      updates
    };

    let report = null;
    if (!dryRun) report = await writeMaintenanceReport(summary).catch((error) => ({ ok: false, error: error.message }));
    const audit = await writeAuditEventSafe('maintenance-sweep-ran', adminAuditDetails(admin || { type: 'scheduled-maintenance', actor: 'scheduled-maintenance' }, {
      dryRun,
      staleHours,
      scanned: summary.scanned,
      staleFound: summary.staleFound,
      staleUpdated: summary.staleUpdated,
      reportFileId: report?.saved?.id || null
    }));

    return json(200, { ok: true, summary, report, audit }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, google: error.google || undefined }, noStoreCors(event));
  }
}
