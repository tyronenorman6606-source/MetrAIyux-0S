export function createTaskReceipt({ task, bundle, validation, status = 'queued' } = {}) {
  return {
    id: `ui_task_receipt_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    type: 'SKAI_UI_TASK_RECEIPT',
    generatedAt: new Date().toISOString(),
    taskId: task?.id || null,
    sourceIssueId: bundle?.sourceIssueId || task?.sourceIssueId || null,
    status,
    validation: validation || null,
    bundleSummary: bundle?.summary || null,
    changes: (bundle?.changes || []).map(change => ({ action: change.action, path: change.path, reason: change.reason || '' })),
  };
}

export function summarizeReceipts(receipts = []) {
  const counts = receipts.reduce((acc, receipt) => { acc[receipt.status] = (acc[receipt.status] || 0) + 1; return acc; }, {});
  return { total: receipts.length, counts, latest: receipts[0] || null };
}
