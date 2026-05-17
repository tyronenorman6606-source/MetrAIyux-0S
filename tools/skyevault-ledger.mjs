import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const outDir = path.join(root, '.skyevault-out');
const ledgerPath = path.join(outDir, 'vault-ledger.jsonl');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readLedger() {
  if (!fs.existsSync(ledgerPath)) return [];
  return fs.readFileSync(ledgerPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { schema: 'skyevault.local-ledger.v1', event: 'ledger.parse-error', line: index + 1, error: error.message };
      }
    });
}

function readReceipts() {
  if (!fs.existsSync(outDir)) return [];
  return fs.readdirSync(outDir)
    .filter((name) => /^skyevault-receipt-.*\.json$/.test(name))
    .map((name) => {
      const file = path.join(outDir, name);
      const stat = fs.statSync(file);
      if (stat.size === 0) return { file, fileName: name, bytes: 0, ok: false, error: 'empty receipt file' };
      try {
        return { file, fileName: name, bytes: stat.size, ...readJson(file) };
      } catch (error) {
        return { file, fileName: name, bytes: stat.size, ok: false, error: error.message };
      }
    })
    .sort((a, b) => String(a.receiptId || a.fileName).localeCompare(String(b.receiptId || b.fileName)));
}

function bytes(value) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`;
}

const receipts = readReceipts();
const ledger = readLedger();
const validReceipts = receipts.filter((item) => item.ok !== false && item.receiptId);
const invalidReceipts = receipts.filter((item) => item.ok === false);
const totalUploaded = validReceipts.reduce((sum, item) => sum + Number(item.fileSize || 0), 0);
const byAssetType = new Map();
for (const event of ledger.filter((item) => item.event === 'upload.complete')) {
  const key = event.assetType || 'unknown';
  byAssetType.set(key, (byAssetType.get(key) || 0) + 1);
}

const report = {
  schema: 'skyevault.ledger-report.v1',
  generatedAt: new Date().toISOString(),
  ledgerPath,
  receiptCount: receipts.length,
  validReceiptCount: validReceipts.length,
  invalidReceiptCount: invalidReceipts.length,
  ledgerEventCount: ledger.length,
  totalUploadedBytes: totalUploaded,
  totalUploadedHuman: bytes(totalUploaded),
  uploadsByAssetType: Object.fromEntries([...byAssetType.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  latestReceipts: validReceipts.slice(-8).map((item) => ({
    receiptId: item.receiptId,
    sessionId: item.sessionId,
    destination: item.destination,
    fileName: item.fileName || item.name,
    fileSize: item.fileSize,
    sha256: item.sha256
  })),
  invalidReceipts: invalidReceipts.map((item) => ({
    fileName: item.fileName,
    bytes: item.bytes,
    error: item.error
  })),
  parseErrors: ledger.filter((item) => item.event === 'ledger.parse-error')
};

console.log(JSON.stringify(report, null, 2));
