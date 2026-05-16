import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdmin } from './_lib/security.js';
import { loadConfig, writeAuditEventSafe } from './_lib/config.js';
import { getFolderMetadata, createAndTrashHealthcheck } from './_lib/google-drive.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    requireAdmin(event);
    const body = await readJson(event);
    const writeTest = body.writeTest !== false;
    const { config } = await loadConfig();
    const onlyId = body.destinationId;
    const targets = config.destinations.filter((destination) => !onlyId || destination.id === onlyId);

    const results = [];
    for (const destination of targets) {
      try {
        const folder = await getFolderMetadata(destination.folderId);
        let write = null;
        if (writeTest) {
          const check = await createAndTrashHealthcheck(destination.folderId);
          write = { ok: true, temporaryFileId: check.id };
        }
        results.push({
          id: destination.id,
          name: destination.name,
          ok: true,
          folder,
          write
        });
      } catch (error) {
        results.push({
          id: destination.id,
          name: destination.name,
          ok: false,
          error: error.message,
          statusCode: error.statusCode || 500,
          google: error.google || undefined
        });
      }
    }

    const audit = await writeAuditEventSafe('admin-drive-test-ran', { writeTest, destinationCount: results.length, failed: results.filter((item) => !item.ok).length });
    return json(200, { ok: true, results, audit }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
