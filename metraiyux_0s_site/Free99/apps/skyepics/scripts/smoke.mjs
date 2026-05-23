import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/App.jsx',
  'src/cryptoVault.js',
  'src/localVaultStore.js',
  'src/ocr.js',
  'src/secretDetector.js',
  'src/main.jsx',
  'src/styles.css',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/icons/skyepics-192.png',
  'public/icons/skyepics-512.png',
  'public/brand/skyepics-logo.png',
  'README.md'
];

const missing = [];
for (const file of required) {
  try {
    const s = await stat(path.join(root, file));
    if (!s.isFile()) missing.push(file);
  } catch {
    missing.push(file);
  }
}

const src = await readFile(path.join(root, 'src/App.jsx'), 'utf8');
const cryptoSrc = await readFile(path.join(root, 'src/cryptoVault.js'), 'utf8');
const storeSrc = await readFile(path.join(root, 'src/localVaultStore.js'), 'utf8');
const ocrSrc = await readFile(path.join(root, 'src/ocr.js'), 'utf8');
const secretSrc = await readFile(path.join(root, 'src/secretDetector.js'), 'utf8');
const manifestSrc = await readFile(path.join(root, 'public/manifest.webmanifest'), 'utf8');
const swSrc = await readFile(path.join(root, 'public/sw.js'), 'utf8');

const checks = [
  ['camera capture', /getUserMedia/.test(src)],
  ['AES-GCM encryption', /AES-GCM/.test(cryptoSrc)],
  ['PBKDF2 key derivation', /PBKDF2/.test(cryptoSrc)],
  ['Origin Private File System storage', /navigator\.storage\.getDirectory/.test(storeSrc)],
  ['encrypted backup export', /exportBackup/.test(src) && /skyepics-backup/.test(src)],
  ['restore import', /restoreBackup/.test(src)],
  ['backup verifier', /verifyBackupFile/.test(src) && /Verify backup/.test(src)],
  ['password rotation', /rotatePassword/.test(storeSrc) && /Rotate password/.test(src)],
  ['vault health check', /checkVaultIntegrity/.test(storeSrc) && /Run health check/.test(src)],
  ['masked secret display', /masked-secret/.test(src) && /Reveal/.test(src)],
  ['persistent storage request', /requestPersistentStorage/.test(storeSrc) && /Request persistence/.test(src)],
  ['local OCR worker', /tesseract\.js/.test(ocrSrc) && /recognize/.test(ocrSrc)],
  ['secret/key detector', /API_KEY|PASSWORD|SECRET|TOKEN|PRIVATE_KEY/.test(secretSrc)],
  ['PWA manifest registration', /serviceWorker/.test(src)],
  ['auto-lock inactivity control', /lockSeconds/.test(src) && /Auto-lock/.test(src)],
  ['privacy shield thumbnails', /privacyMode/.test(src) && /privacy-on/.test(src) && /Privacy shield/.test(src)],
  ['clipboard burn after copy', /clipboard\.writeText\(''\)/.test(src) && /clipboardTtl/.test(src)],
  ['bulk OCR candidate save', /saveAllCandidates/.test(src) && /Save all candidates/.test(src)],
  ['backup checksum verification', /checksum/.test(storeSrc) && /Backup checksum mismatch/.test(storeSrc)],
  ['recovery receipt export', /exportRecoveryReceipt/.test(storeSrc) && /Export receipt/.test(src)],
  ['developer secret metadata fields', /provider/.test(storeSrc) && /rotationDue/.test(storeSrc) && /Provider \/ system/.test(src)],
  ['integrity ledger stored in manifest', /integrityReports/.test(storeSrc) && /exportIntegrityLedger/.test(storeSrc) && /Export ledger/.test(src)],
  ['backup recovery drill report', /runRecoveryDrill/.test(storeSrc) && /Run drill/.test(src) && /recovery-drill/.test(src)],
  ['photo vault search', /Search photos by title/.test(src) && /command-strip/.test(src)],
  ['install readiness lane', /beforeinstallprompt/.test(src) && /Install app/.test(src) && /Field Kit Lane/.test(src)],
  ['backup reminder settings', /backupReminderDays/.test(storeSrc) && /Backup reminder/.test(src)],
  ['PWA icon assets', /skyepics-192\.png/.test(manifestSrc) && /skyepics-512\.png/.test(manifestSrc)],
  ['service worker app shell cache v17', /skyepics-shell-v17/.test(swSrc) && /brand\/skyepics-logo\.png/.test(swSrc) && /icons\/skyepics-192\.png/.test(swSrc)],
  ['designer-grade bottom navigation', /bottom-nav/.test(src) && /side-nav/.test(src) && /NAV_ITEMS/.test(src)],
  ['camera-first capture review', /Capture Review/.test(src) && /Scan now/.test(src) && /cinematic-stage/.test(src)],
  ['mission command home', /Mission Control/.test(src) && /flow-rail/.test(src)],
  ['selected vault detail panel', /Vault Detail/.test(src) && /selected-photo-panel/.test(src)],
  ['scan beam OCR feedback', /scan-beam/.test(src) && /Run local OCR/.test(src)] ,
  ['spectacular logo asset integration', /LOGO_SRC/.test(src) && /BrandLogo/.test(src) && /skyepics-logo\.png/.test(src)],
  ['interactive landing front door', /LandingGate/.test(src) && /Interactive front door/.test(src) && /Enter SkyePics/.test(src)],
  ['built-in tutorial system', /TutorialPanel/.test(src) && /TutorialModal/.test(src) && /TUTORIAL_STEPS/.test(src) && /Guided setup/.test(src)],
  ['cinematic intro sequence integration', /IntroSequence/.test(src) && /intro-shell/.test(src) && /Replay intro/.test(src) && /skyepics\.v17\.introSeen/.test(src)],
  ['secret risk audit lane', /runSecretRiskAudit/.test(storeSrc) && /Run secret audit/.test(src) && /secretRiskReports/.test(storeSrc)],
  ['redacted emergency recovery kit', /exportEmergencyKit/.test(storeSrc) && /Emergency kit/.test(src) && /emergency-recovery-kit/.test(storeSrc)],
  ['lock-on-hidden behavior', /lockOnHidden/.test(storeSrc) && /visibilitychange/.test(src) && /Lock when tab\/app is hidden/.test(src)],
  ['configurable clipboard clear timer', /clipboardTtlSeconds/.test(storeSrc) && /Clipboard clear timer seconds/.test(src)]
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (missing.length || failed.length) {
  console.error(JSON.stringify({ ok: false, missing, failed }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, files: required.length, checks: checks.map(([name]) => name) }, null, 2));
