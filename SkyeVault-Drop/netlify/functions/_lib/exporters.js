function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows = [], columns = []) {
  const cols = columns.length ? columns : [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  const lines = [cols.map(csvCell).join(',')];
  for (const row of rows) lines.push(cols.map((col) => csvCell(row?.[col])).join(','));
  return lines.join('\n');
}

export function flattenLedgerEntry(entry = {}) {
  return {
    receiptId: entry.id || '',
    completedAt: entry.completedAt || '',
    clientName: entry.clientName || '',
    clientEmail: entry.clientEmail || '',
    projectName: entry.projectName || '',
    assetType: entry.assetType || '',
    fileName: entry.fileName || entry.driveFile?.name || '',
    fileSize: entry.fileSize || entry.driveFile?.size || '',
    mimeType: entry.mimeType || entry.driveFile?.mimeType || '',
    destinationId: entry.destinationId || '',
    destinationName: entry.destinationName || '',
    sessionId: entry.sessionId || '',
    submissionId: entry.submissionId || '',
    scanStatus: entry.scan?.status || '',
    scanVerdict: entry.scan?.verdict || '',
    driveFileId: entry.driveFile?.id || '',
    driveFileLink: entry.driveFile?.webViewLink || '',
    receiptSignature: entry.receiptSignature || ''
  };
}

export function flattenSession(manifest = {}) {
  return {
    sessionId: manifest.sessionId || '',
    status: manifest.status || '',
    createdAt: manifest.createdAt || '',
    completedAt: manifest.completedAt || '',
    receiptId: manifest.receiptId || '',
    clientName: manifest.intake?.clientName || '',
    clientEmail: manifest.intake?.clientEmail || '',
    projectName: manifest.intake?.projectName || '',
    fileName: manifest.file?.name || '',
    fileSize: manifest.file?.size || '',
    mimeType: manifest.file?.mimeType || '',
    destinationId: manifest.destination?.id || '',
    destinationName: manifest.destination?.name || '',
    scanStatus: manifest.policy?.scan?.status || '',
    driveFileId: manifest.driveFileId || ''
  };
}

export function flattenEvent(event = {}) {
  return {
    type: event.type || '',
    createdAt: event.createdAt || '',
    receiptId: event.detail?.receiptId || '',
    sessionId: event.detail?.sessionId || '',
    submissionId: event.detail?.submissionId || '',
    fileName: event.detail?.fileName || '',
    destinationId: event.detail?.destinationId || '',
    ok: event.detail?.ok ?? '',
    detail: JSON.stringify(event.detail || {})
  };
}
