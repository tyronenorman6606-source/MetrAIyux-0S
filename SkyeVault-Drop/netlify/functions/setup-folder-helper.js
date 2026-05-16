import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { requireAdmin } from './_lib/security.js';
import { getServiceAccountIdentity, getFolderMetadata, createAndTrashHealthcheck } from './_lib/google-drive.js';

async function testFolder(folderId, label, writeTest) {
  const result = { label, folderId, ok: false, readable: false, writable: false, detail: '' };
  if (!folderId) {
    result.detail = 'No folder ID supplied.';
    return result;
  }
  try {
    const folder = await getFolderMetadata(folderId);
    result.readable = folder.provider === 'cloudflare-r2' || folder.mimeType === 'application/vnd.google-apps.folder';
    result.name = folder.name || '';
    result.driveId = folder.driveId || null;
    result.webViewLink = folder.webViewLink || '';
    if (writeTest) {
      const temp = await createAndTrashHealthcheck(folderId);
      result.writable = Boolean(temp.id);
    }
    result.ok = result.readable && (!writeTest || result.writable);
    result.detail = `${result.readable ? 'Readable' : 'Not readable'}${writeTest ? ` / ${result.writable ? 'writable' : 'not writable'}` : ''}.`;
  } catch (error) {
    result.detail = error.message;
    result.statusCode = error.statusCode || 500;
  }
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
    const folders = Array.isArray(body.folders) ? body.folders.slice(0, 50) : [];
    const serviceAccount = getServiceAccountIdentity();
    const results = [];
    for (const folder of folders) {
      results.push(await testFolder(String(folder.folderId || '').trim(), String(folder.label || folder.id || 'Folder').trim(), writeTest));
    }
    return json(200, {
      ok: results.every((item) => item.ok),
      serviceAccount,
      instruction: `Use R2 prefixes such as vault-system, client-uploads/primary, client-uploads/overflow, and vault-system/backups. This helper validates the configured bucket can read/write each prefix.`,
      results
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
