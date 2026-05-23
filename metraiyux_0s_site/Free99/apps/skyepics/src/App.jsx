import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createVault,
  unlockVault,
  hasVault,
  resetVault,
  restoreBackup,
  verifyBackupFile,
  getStorageStatus,
  requestPersistentStorage,
  supportsPrivateFileSystem
} from './localVaultStore.js';
import { recognizeImageWithReusableWorker, shutdownOcrWorker } from './ocr.js';
import { detectSecrets, toSecretEditorDraft } from './secretDetector.js';

const LOGO_SRC = './brand/skyepics-logo.png';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '✦' },
  { id: 'tutorial', label: 'Guide', icon: '◈' },
  { id: 'camera', label: 'Camera', icon: '●' },
  { id: 'vault', label: 'Vault', icon: '▣' },
  { id: 'scan', label: 'Scan', icon: '◇' },
  { id: 'secrets', label: 'Secrets', icon: '◆' },
  { id: 'backup', label: 'Backup', icon: '↺' },
  { id: 'security', label: 'Security', icon: '⌁' }
];

const emptyDraft = {
  id: '',
  photoId: null,
  label: '',
  kind: 'text',
  value: '',
  provider: '',
  account: '',
  url: '',
  tags: [],
  rotationDue: '',
  rawText: '',
  notes: ''
};

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function niceDate(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function downloadJson(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  downloadBlob(name, blob);
}

function downloadText(name, text, type = 'text/plain') {
  downloadBlob(name, new Blob([text], { type }));
}

function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || '{}')));
      } catch {
        reject(new Error('Backup file is not valid JSON.'));
      }
    };
    reader.readAsText(file);
  });
}

function tagsToInput(tags) {
  return Array.isArray(tags) ? tags.join(', ') : String(tags || '');
}

function inputToTags(value) {
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function envLineForSecret(secret) {
  const label = String(secret.label || 'SKYEPICS_SECRET').replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
  const value = String(secret.value || '').replace(/\n/g, '\\n').replace(/"/g, '\\"');
  return `${label}="${value}"`;
}

function maskSecretValue(value = '') {
  const length = Math.max(8, Math.min(32, String(value || '').length || 12));
  return '•'.repeat(length);
}

function isRotationDue(secret) {
  if (!secret.rotationDue) return false;
  const due = new Date(`${secret.rotationDue}T23:59:59`);
  return Number.isFinite(due.getTime()) && due < new Date();
}

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

const TUTORIAL_STEPS = [
  {
    title: 'Start with the vault password',
    lane: 'Front Door',
    text: 'Create or unlock a local encrypted vault. This password never leaves the browser, and backups require the password that was active when the backup was exported.'
  },
  {
    title: 'Capture or import a secret photo',
    lane: 'Camera',
    text: 'Use the camera lane like a regular camera app, but saves go into SkyePics private encrypted storage instead of the camera roll.'
  },
  {
    title: 'Review before scanning',
    lane: 'Capture Review',
    text: 'After a capture, keep shooting, open the photo in the vault, or send it directly into the local OCR scan lane.'
  },
  {
    title: 'Run local OCR and verify',
    lane: 'Scan',
    text: 'The OCR worker runs in the browser. Treat it as extraction help, not truth. Manually verify confusing characters before saving records.'
  },
  {
    title: 'Save corrected secret records',
    lane: 'Secrets',
    text: 'Add provider, project/account, URL, notes, tags, and rotation dates. Values stay encrypted and masked unless explicitly revealed.'
  },
  {
    title: 'Export a real recovery backup',
    lane: 'Backup',
    text: 'Browser storage is not permanent. Export encrypted backups, verify checksums, run recovery drills, and keep a redacted emergency kit.'
  }
];

function BrandLogo({ className = '', compact = false }) {
  return (
    <div className={classNames('brand-logo-wrap', compact && 'compact-logo', className)}>
      <img src={LOGO_SRC} alt="SkyePics logo" className="brand-logo-img" />
    </div>
  );
}

function TutorialCards({ compact = false }) {
  return (
    <div className={classNames('tutorial-card-grid', compact && 'compact-tutorial-grid')}>
      {TUTORIAL_STEPS.map((step, index) => (
        <article className="tutorial-card glass" key={step.title}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <p className="eyebrow">{step.lane}</p>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </article>
      ))}
    </div>
  );
}


const INTRO_BEATS = [
  {
    eyebrow: 'SkyePics Secure Picture Vault',
    title: 'Capture secrets without feeding the cloud.',
    text: 'Open the camera, take the picture, encrypt it locally, then keep the original evidence inside your private vault.'
  },
  {
    eyebrow: 'Local OCR Intelligence',
    title: 'Scan the image. Correct the key. Save the truth.',
    text: 'Text extraction runs in-browser. The app helps detect keys, passwords, tokens, private-key blocks, and recovery codes before you verify them.'
  },
  {
    eyebrow: 'Reliquary Recovery',
    title: 'Back up the vault before life tests you.',
    text: 'Export encrypted backups, verify checksums, and restore from a file without a SaaS account, tenant login, or external database.'
  }
];

function IntroSequence({ onComplete }) {
  const [beat, setBeat] = useState(0);
  const [progress, setProgress] = useState(0);
  const [runId, setRunId] = useState(0);
  function finishIntro() {
    localStorage.setItem('skyepics.v17.introSeen', 'true');
    onComplete();
  }

  function replayIntro() {
    setBeat(0);
    setProgress(0);
    setRunId((value) => value + 1);
  }

  useEffect(() => {
    const startedAt = Date.now();
    const totalMs = 9200;
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(1, (Date.now() - startedAt) / totalMs);
      setProgress(nextProgress);
      setBeat(Math.min(INTRO_BEATS.length - 1, Math.floor(nextProgress * INTRO_BEATS.length)));
    }, 80);
    const timeout = window.setTimeout(() => setProgress(1), totalMs);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [runId]);

  return (
    <main className="intro-shell" aria-label="SkyePics intro sequence">
      <div className="intro-noise" aria-hidden="true" />
      <div className="intro-vault-ring" aria-hidden="true" />
      <div className="intro-vault-ring second" aria-hidden="true" />
      <button className="intro-skip" onClick={finishIntro}>Skip intro</button>

      <section className="intro-card">
        <div className="intro-scan-line" aria-hidden="true" />
        <div className="intro-logo-wrap">
          <img src={LOGO_SRC} alt="SkyePics" className="intro-logo" />
        </div>

        <div className="intro-copy-stack">
          {INTRO_BEATS.map((item, index) => (
            <div className={classNames('intro-beat', index === beat && 'active')} key={item.title}>
              <p className="intro-eyebrow"><span />{item.eyebrow}<span /></p>
              <h1>{item.title}</h1>
              <p>{item.text}</p>
            </div>
          ))}
        </div>

        <div className="intro-hud-grid" aria-hidden="true">
          <span>CAMERA · LOCAL</span>
          <span>AES-GCM · LOCKED</span>
          <span>OCR · VERIFY</span>
          <span>BACKUP · RESTORE</span>
        </div>

        <div className="intro-progress-wrap">
          <div className="intro-progress-track"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <div className="intro-actions">
            <button onClick={replayIntro}>Replay</button>
            <button className="primary" onClick={finishIntro}>Enter SkyePics</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatTile({ label, value, sub, tone = '' }) {
  return (
    <article className={classNames('stat-card', tone)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <p>{sub}</p>}
    </article>
  );
}


function LandingGate({ onEnter, onOpenTutorial, onReplayIntro }) {
  const [activeStory, setActiveStory] = useState('capture');
  const stories = {
    capture: {
      title: 'Camera vault, not camera roll',
      body: 'Capture passwords, recovery codes, API panels, and handwritten keys into a private encrypted vault. The app is built around local capture first, then recovery discipline.',
      cta: 'Open secure entry'
    },
    scan: {
      title: 'Local OCR extraction lane',
      body: 'Scan pictures inside the browser, detect credential-looking text, then correct the result before saving an encrypted record. OCR helps; the user verifies.',
      cta: 'See tutorial'
    },
    recover: {
      title: 'Backup and restore are mandatory',
      body: 'SkyePics treats browser storage like a working vault, not a forever archive. Export encrypted backups, verify checksums, and run restore drills.',
      cta: 'Enter vault gate'
    }
  };
  const story = stories[activeStory];

  return (
    <main className="landing-shell">
      <section className="landing-hero glass">
        <div className="landing-logo-stage">
          <BrandLogo className="spectacular-logo" />
          <div className="logo-aura" aria-hidden="true" />
        </div>
        <div className="landing-copy">
          <p className="eyebrow">SkyePics Secure Picture Vault</p>
          <h1>Private camera capture for developers who cannot afford to lose the keys.</h1>
          <p>
            Take the picture, encrypt it locally, scan it locally, correct the extracted secret, then back it up with a recoverable encrypted export. No SaaS account. No tenant layer. No external database.
          </p>
          <div className="landing-actions">
            <button className="primary large-action" onClick={onEnter}>Enter SkyePics</button>
            <button onClick={onOpenTutorial}>View full tutorial</button>
            <button onClick={onReplayIntro}>Replay intro</button>
          </div>
          <div className="landing-badges">
            <span>Local camera</span>
            <span>Encrypted vault</span>
            <span>Client-side OCR</span>
            <span>Backup restore</span>
          </div>
        </div>
      </section>

      <section className="landing-interactive glass">
        <div className="landing-switcher">
          {Object.keys(stories).map((key) => (
            <button key={key} className={activeStory === key ? 'active' : ''} onClick={() => setActiveStory(key)}>
              {key === 'capture' ? 'Capture' : key === 'scan' ? 'Scan' : 'Recover'}
            </button>
          ))}
        </div>
        <div className="landing-story-card">
          <p className="eyebrow">Interactive front door</p>
          <h2>{story.title}</h2>
          <p>{story.body}</p>
          <button className="primary" onClick={activeStory === 'scan' ? onOpenTutorial : onEnter}>{story.cta}</button>
        </div>
        <div className="landing-device-preview" aria-hidden="true">
          <div className="preview-phone">
            <div className="preview-lens" />
            <div className="preview-scan-line" />
            <span>LOCAL · LOCKED · RECOVERABLE</span>
          </div>
        </div>
      </section>

      <section className="landing-tutorial-strip">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Built-in Tutorial</p>
            <h2>First run is guided from capture to restore.</h2>
          </div>
          <button onClick={onOpenTutorial}>Open tutorial overlay</button>
        </div>
        <TutorialCards compact />
      </section>
    </main>
  );
}

function VaultGate({ onUnlocked, onNotice }) {
  const [mode, setMode] = useState(hasVault() ? 'unlock' : 'create');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [restoreFile, setRestoreFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = supportsPrivateFileSystem();

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Password confirmation does not match.');
    setBusy(true);
    try {
      const session = await createVault(password);
      onUnlocked(session);
      onNotice('SkyePics vault created and unlocked.');
    } catch (err) {
      setError(err.message || 'Could not create vault.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = await unlockVault(password);
      onUnlocked(session);
      onNotice('Vault unlocked.');
    } catch (err) {
      setError(err.message || 'Unlock failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(event) {
    event.preventDefault();
    setError('');
    if (!restoreFile) return setError('Choose a .skyepics-backup.json file first.');
    if (!password) return setError('Enter the password used when that backup was created.');
    setBusy(true);
    try {
      const backup = await readJsonFile(restoreFile);
      await verifyBackupFile(backup, password);
      const session = await restoreBackup(backup, password);
      onUnlocked(session);
      onNotice('Encrypted backup restored and unlocked.');
    } catch (err) {
      setError(err.message || 'Restore failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate-shell">
      <section className="gate-hero glass">
        <div className="vault-orbit" aria-hidden="true">
          <div />
          <span />
        </div>
        <div className="gate-content">
          <div className="brand-lockup hero-lockup">
            <BrandLogo compact />
            <div>
              <p className="eyebrow">SkyePics Local Vault</p>
              <h1>Capture secrets like a camera app. Store them like a vault.</h1>
            </div>
          </div>
          <p className="gate-copy">
            No SaaS account. No external database. Photos and extracted records stay in this browser vault, encrypted before they are written to private local storage.
          </p>
          <div className="gate-badges">
            <span>Camera-first</span>
            <span>Local OCR</span>
            <span>Encrypted backup</span>
            <span>Restore ready</span>
          </div>
        </div>

        <div className="gate-card designer-card">
          {!supported && (
            <div className="notice danger">
              This build requires Origin Private File System support. Run it in current Chrome or Edge over HTTPS or localhost.
            </div>
          )}

          <div className="mode-tabs segmented">
            <button className={mode === 'unlock' ? 'active' : ''} onClick={() => setMode('unlock')} disabled={!hasVault()}>
              Unlock
            </button>
            <button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
              New Vault
            </button>
            <button className={mode === 'restore' ? 'active' : ''} onClick={() => setMode('restore')}>
              Restore
            </button>
          </div>

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="gate-form">
              <label>
                Vault password
                <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
              </label>
              <label>
                Confirm password
                <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat vault password" />
              </label>
              <button className="primary large-action" disabled={busy || !supported}>{busy ? 'Creating…' : 'Create encrypted vault'}</button>
            </form>
          )}

          {mode === 'unlock' && (
            <form onSubmit={handleUnlock} className="gate-form">
              <label>
                Vault password
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
              </label>
              <button className="primary large-action" disabled={busy || !supported}>{busy ? 'Unlocking…' : 'Unlock vault'}</button>
            </form>
          )}

          {mode === 'restore' && (
            <form onSubmit={handleRestore} className="gate-form">
              <label>
                Backup file
                <input type="file" accept=".json,.skyepics-backup.json,application/json" onChange={(e) => setRestoreFile(e.target.files?.[0] || null)} />
              </label>
              <label>
                Backup password
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Original vault password" />
              </label>
              <button className="primary large-action" disabled={busy || !supported}>{busy ? 'Restoring…' : 'Restore encrypted vault'}</button>
            </form>
          )}

          {error && <div className="notice danger">{error}</div>}
          <div className="gate-footnotes">
            <span>No external database</span>
            <span>No tenant auth</span>
            <span>Backup stays encrypted</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function HomePanel({ session, stats, setActiveView }) {
  const latestPhoto = session.listPhotos()[0];
  const latestSecret = session.listSecrets()[0];
  const backupLabel = stats.backupDue ? 'Backup due' : 'Backup current';
  return (
    <section className="command-home">
      <div className="hero-panel glass">
        <div>
          <p className="eyebrow">Mission Control</p>
          <h2>Secure capture, extract, verify, recover.</h2>
          <p>
            SkyePics is now organized like a real field vault: open camera, capture evidence, scan locally, save corrected secrets, then export a recoverable encrypted backup.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={() => setActiveView('camera')}>Open camera</button>
          <button onClick={() => setActiveView('scan')}>Scan selected</button>
          <button onClick={() => setActiveView('backup')}>Backup vault</button>
        </div>
      </div>

      <div className="stats-grid premium-stats">
        <StatTile label="Photos" value={stats.photos} sub="Encrypted media files" />
        <StatTile label="Secrets" value={stats.secrets} sub="Editable vault records" />
        <StatTile label="Private storage" value={formatBytes(stats.bytes)} sub="Photo bytes before encryption" />
        <StatTile label="Recovery" value={backupLabel} sub={stats.lastBackupChecksum || 'No backup checksum yet'} tone={stats.backupDue ? 'attention-card' : 'good-card'} />
      </div>

      <div className="designer-grid two-col">
        <article className="panel spotlight-card">
          <p className="eyebrow">Last capture</p>
          <h3>{latestPhoto ? latestPhoto.title : 'No photos yet'}</h3>
          <p>{latestPhoto ? `${niceDate(latestPhoto.createdAt)} · ${formatBytes(latestPhoto.size)} · ${(latestPhoto.secretIds || []).length} linked record(s)` : 'Start with the Camera lane or import an image from the device.'}</p>
          <button onClick={() => setActiveView(latestPhoto ? 'vault' : 'camera')}>{latestPhoto ? 'Open vault' : 'Capture first photo'}</button>
        </article>
        <article className="panel spotlight-card">
          <p className="eyebrow">Last secret</p>
          <h3>{latestSecret ? latestSecret.label : 'No saved records'}</h3>
          <p>{latestSecret ? `${latestSecret.kind} · ${latestSecret.provider || 'No provider'} · ${isRotationDue(latestSecret) ? 'rotation overdue' : 'rotation tracked'}` : 'Scan a photo or create a record manually from the Secrets lane.'}</p>
          <button onClick={() => setActiveView('secrets')}>Open secret editor</button>
        </article>
      </div>

      <div className="flow-rail glass">
        <div><strong>1</strong><span>Capture</span><small>Camera or image import.</small></div>
        <div><strong>2</strong><span>Review</span><small>Keep, retake, scan.</small></div>
        <div><strong>3</strong><span>Extract</span><small>Local OCR only.</small></div>
        <div><strong>4</strong><span>Correct</span><small>Edit before saving.</small></div>
        <div><strong>5</strong><span>Recover</span><small>Export encrypted backup.</small></div>
      </div>
    </section>
  );
}


function TutorialPanel({ stats, setActiveView, onOpenTutorial }) {
  const laneMap = ['home', 'camera', 'camera', 'scan', 'secrets', 'backup'];
  return (
    <section className="tutorial-page">
      <div className="hero-panel glass tutorial-hero">
        <div>
          <p className="eyebrow">SkyePics Tutorial</p>
          <h2>From first photo to verified restore, without guessing.</h2>
          <p>
            This guide is built into the app so a new user understands the exact workflow: unlock, capture, review, scan, correct, save, export, and restore-test. It keeps the app simple without hiding the recovery responsibilities.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={onOpenTutorial}>Launch guided overlay</button>
          <button onClick={() => setActiveView('camera')}>Start camera lane</button>
          <button onClick={() => setActiveView('backup')}>Go to recovery lane</button>
        </div>
      </div>

      <TutorialCards />

      <div className="tutorial-path glass">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Clickable Walkthrough</p>
            <h2>Open the lane you need.</h2>
          </div>
          <span className="pill">{stats.photos} photo(s) · {stats.secrets} secret(s)</span>
        </div>
        <div className="walkthrough-grid">
          {TUTORIAL_STEPS.map((step, index) => (
            <button className="walkthrough-step" key={step.title} onClick={() => setActiveView(laneMap[index])}>
              <strong>{index + 1}</strong>
              <span>{step.lane}</span>
              <p>{step.title}</p>
            </button>
          ))}
        </div>
      </div>

      <section className="tutorial-safety panel">
        <p className="eyebrow">Plain rules</p>
        <h2>Use it like this.</h2>
        <div className="safety-grid">
          <article><strong>Do</strong><p>Capture the secret image, scan locally, manually correct OCR mistakes, save a clean encrypted record, then export a backup.</p></article>
          <article><strong>Do not</strong><p>Assume browser storage is permanent, trust OCR without review, or rotate your password without exporting a fresh backup after important changes.</p></article>
          <article><strong>Recovery habit</strong><p>Keep the encrypted backup file outside the browser profile and store the matching vault password using your own secure password procedure.</p></article>
        </div>
      </section>
    </section>
  );
}

function TutorialModal({ open, onClose, onNavigate }) {
  const [stepIndex, setStepIndex] = useState(0);
  if (!open) return null;
  const step = TUTORIAL_STEPS[stepIndex];
  const last = stepIndex === TUTORIAL_STEPS.length - 1;
  const laneMap = ['home', 'camera', 'camera', 'scan', 'secrets', 'backup'];

  function closeAndRemember() {
    localStorage.setItem('skyepics.v1.tutorialSeen', 'true');
    onClose();
  }

  function jumpToLane() {
    localStorage.setItem('skyepics.v1.tutorialSeen', 'true');
    onNavigate(laneMap[stepIndex]);
    onClose();
  }

  return (
    <div className="tutorial-modal-backdrop" role="dialog" aria-modal="true" aria-label="SkyePics tutorial">
      <section className="modal-card tutorial-modal-card">
        <div className="tutorial-modal-logo-row">
          <BrandLogo compact />
          <button onClick={closeAndRemember}>Close</button>
        </div>
        <p className="eyebrow">Guided setup · step {stepIndex + 1} of {TUTORIAL_STEPS.length}</p>
        <h2>{step.title}</h2>
        <p>{step.text}</p>
        <div className="tutorial-progress" aria-hidden="true">
          {TUTORIAL_STEPS.map((item, index) => <span key={item.title} className={index <= stepIndex ? 'active' : ''} />)}
        </div>
        <div className="tutorial-modal-actions">
          <button disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>Back</button>
          <button onClick={jumpToLane}>Open {step.lane}</button>
          <button className="primary" onClick={() => last ? closeAndRemember() : setStepIndex((value) => value + 1)}>{last ? 'Finish tutorial' : 'Next'}</button>
        </div>
      </section>
    </div>
  );
}

function CameraPanel({ session, onCaptured, onChanged, onNotice }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);
  const [review, setReview] = useState(null);

  async function startCamera(nextFacingMode = facingMode) {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API is not available in this browser.');
      return;
    }
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setFacingMode(nextFacingMode);
    } catch (err) {
      setError(err.message || 'Could not open camera. Use HTTPS or localhost and allow camera access.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }

  async function capture() {
    if (!videoRef.current || !cameraOn) return setError('Start the camera before capture.');
    setBusy(true);
    setError('');
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94));
      if (!blob) throw new Error('Camera capture failed.');
      const saved = await session.savePhoto(blob, { title, note, width, height });
      setTitle('');
      setNote('');
      setReview(saved);
      onCaptured(saved);
      onChanged();
      onNotice(`Captured and encrypted: ${saved.title}`);
    } catch (err) {
      setError(err.message || 'Could not save capture.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      let last = null;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        last = await session.savePhoto(file, { title: file.name, note: 'Imported image file.' });
      }
      event.target.value = '';
      if (last) {
        setReview(last);
        onCaptured(last);
      }
      onChanged();
      onNotice(`${files.length} image file(s) encrypted into SkyePics.`);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => () => stopCamera(), []);

  return (
    <section className="camera-experience">
      <div className="camera-phone glass">
        <div className="camera-stage cinematic-stage">
          <video ref={videoRef} autoPlay playsInline muted />
          {!cameraOn && (
            <div className="camera-empty">
              <strong>Camera locked</strong>
              <span>Start camera to capture passwords, recovery codes, setup screens, or private notes into the encrypted vault.</span>
            </div>
          )}
          <div className="camera-hud" aria-hidden="true">
            <span className="corner top-left" />
            <span className="corner top-right" />
            <span className="corner bottom-left" />
            <span className="corner bottom-right" />
            <div className="hud-copy">LOCAL CAPTURE · ENCRYPTED SAVE · NO CAMERA ROLL</div>
          </div>
          {flash && <div className="capture-flash" />}
        </div>

        <div className="capture-console">
          <div className="capture-meta">
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Neon prod env screenshot" />
            </label>
            <label>
              Note
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context" />
            </label>
          </div>

          <div className="camera-controls">
            <button onClick={() => startCamera(facingMode)}>{cameraOn ? 'Restart' : 'Start camera'}</button>
            <button onClick={() => startCamera(facingMode === 'environment' ? 'user' : 'environment')}>Flip</button>
            <button className="shutter primary" onClick={capture} disabled={busy || !cameraOn}>{busy ? 'Saving…' : 'Capture'}</button>
            <button onClick={stopCamera} disabled={!cameraOn}>Stop</button>
            <label className="file-button">
              Import image
              <input type="file" accept="image/*" multiple onChange={handleUpload} />
            </label>
          </div>
        </div>
      </div>

      <aside className="review-stack">
        <article className="panel capture-review">
          <p className="eyebrow">Capture Review</p>
          {review ? (
            <>
              <h2>{review.title}</h2>
              <p>{niceDate(review.createdAt)} · {formatBytes(review.size)} · encrypted into this vault.</p>
              <div className="button-row">
                <button className="primary" onClick={() => onCaptured(review, 'scan')}>Scan now</button>
                <button onClick={() => onCaptured(review, 'vault')}>Open in vault</button>
                <button onClick={() => setReview(null)}>Capture another</button>
              </div>
            </>
          ) : (
            <>
              <h2>Ready for first capture</h2>
              <p>After every shot, this panel becomes the keep/scan/open review step. That is the camera-app UX this needed.</p>
            </>
          )}
        </article>
        <article className="panel mini-brief">
          <p className="eyebrow">Privacy Contract</p>
          <ul className="mini-list">
            <li>Captured photos are written to encrypted vault storage.</li>
            <li>Images are not intentionally saved to the camera roll.</li>
            <li>OCR happens in the browser worker, not a server.</li>
            <li>Backups remain encrypted and password-bound.</li>
          </ul>
        </article>
      </aside>
      {error && <div className="notice danger span-all">{error}</div>}
    </section>
  );
}

function GalleryPanel({ session, revision, selectedPhotoId, setSelectedPhotoId, privacyMode, setActiveView, onChanged, onNotice }) {
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const allPhotos = session.listPhotos();
  const selectedPhoto = allPhotos.find((photo) => photo.id === selectedPhotoId) || allPhotos[0] || null;
  const photos = allPhotos.filter((photo) => {
    const linkedSecrets = (session.manifest.secrets || [])
      .filter((secret) => secret.photoId === photo.id)
      .map((secret) => `${secret.label} ${secret.kind} ${secret.provider} ${secret.account} ${(secret.tags || []).join(' ')}`)
      .join(' ');
    const haystack = `${photo.title} ${photo.note || ''} ${photo.createdAt} ${linkedSecrets}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const linkedSecrets = selectedPhoto ? session.listSecrets().filter((secret) => secret.photoId === selectedPhoto.id) : [];

  useEffect(() => {
    let cancelled = false;
    const previous = Object.values(urls);
    async function loadUrls() {
      setLoading(true);
      try {
        const next = {};
        for (const photo of session.listPhotos()) {
          const blob = await session.getPhotoBlob(photo.id);
          next[photo.id] = URL.createObjectURL(blob);
        }
        if (!cancelled) setUrls(next);
        previous.forEach((url) => URL.revokeObjectURL(url));
      } catch (err) {
        onNotice(err.message || 'Could not load photo previews.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUrls();
    return () => {
      cancelled = true;
      previous.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [revision]);

  async function handleDownload(photo) {
    const blob = await session.getPhotoBlob(photo.id);
    downloadBlob(`${photo.title.replace(/[^a-z0-9_-]+/gi, '-') || 'skyepic'}.jpg`, blob);
  }

  async function handleDelete(photo) {
    const ok = window.confirm(`Delete encrypted photo from this local vault?\n\n${photo.title}`);
    if (!ok) return;
    await session.deletePhoto(photo.id);
    if (selectedPhotoId === photo.id) setSelectedPhotoId(null);
    onChanged();
    onNotice('Photo deleted from local vault.');
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing) return;
    await session.updatePhoto(editing.id, { title: editing.title, note: editing.note });
    setEditing(null);
    onChanged();
    onNotice('Photo metadata updated.');
  }

  return (
    <section className="vault-layout">
      <aside className="panel selected-photo-panel">
        <p className="eyebrow">Vault Detail</p>
        {selectedPhoto ? (
          <>
            <div className={classNames('hero-preview', privacyMode && 'privacy-on')}>
              {urls[selectedPhoto.id] ? <img src={urls[selectedPhoto.id]} alt={selectedPhoto.title} /> : <div className="skeleton" />}
            </div>
            <h2>{selectedPhoto.title}</h2>
            <p>{niceDate(selectedPhoto.createdAt)} · {formatBytes(selectedPhoto.size)}</p>
            {selectedPhoto.note && <p>{selectedPhoto.note}</p>}
            <div className="meta-chips">
              <span>{linkedSecrets.length} linked secret{linkedSecrets.length === 1 ? '' : 's'}</span>
              <span>{selectedPhoto.mime || 'image/jpeg'}</span>
              {selectedPhoto.width && selectedPhoto.height && <span>{selectedPhoto.width}×{selectedPhoto.height}</span>}
            </div>
            <div className="button-row">
              <button className="primary" onClick={() => setActiveView('scan')}>Scan selected</button>
              <button onClick={() => setEditing(selectedPhoto)}>Edit</button>
              <button onClick={() => handleDownload(selectedPhoto)}>Export image</button>
            </div>
            {linkedSecrets.length > 0 && (
              <div className="linked-list">
                <strong>Linked records</strong>
                {linkedSecrets.map((secret) => <span key={secret.id}>{secret.label} · {secret.kind}</span>)}
              </div>
            )}
          </>
        ) : (
          <div className="empty-card">No photos saved yet. Use Camera or Import.</div>
        )}
      </aside>

      <section className="panel vault-browser">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Vault Lane</p>
            <h2>Encrypted photo vault</h2>
          </div>
          <span className="pill">{allPhotos.length} photo{allPhotos.length === 1 ? '' : 's'}</span>
        </div>
        <div className="command-strip">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search photos by title, note, linked secret, provider, or tag" />
          <span>{photos.length} visible</span>
        </div>
        {loading && <div className="notice">Decrypting previews locally…</div>}
        {!allPhotos.length && <div className="empty-card">No photos saved yet. Start camera capture or import an image.</div>}
        {allPhotos.length > 0 && !photos.length && <div className="empty-card small">No photos match that search.</div>}
        <div className="gallery-grid premium-gallery">
          {photos.map((photo) => (
            <article className={classNames('photo-card', selectedPhotoId === photo.id && 'selected', privacyMode && 'privacy-on')} key={photo.id}>
              <button className="photo-preview" onClick={() => setSelectedPhotoId(photo.id)}>
                {urls[photo.id] ? <img src={urls[photo.id]} alt={photo.title} /> : <div className="skeleton" />}
              </button>
              <div className="photo-info">
                <strong>{photo.title}</strong>
                <span>{niceDate(photo.createdAt)} · {formatBytes(photo.size)} · {(photo.secretIds || []).length} linked record{(photo.secretIds || []).length === 1 ? '' : 's'}</span>
                {photo.note && <p>{photo.note}</p>}
              </div>
              <div className="button-row compact">
                <button onClick={() => { setSelectedPhotoId(photo.id); setActiveView('scan'); }}>Scan</button>
                <button onClick={() => setEditing(photo)}>Edit</button>
                <button className="danger-button" onClick={() => handleDelete(photo)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={saveEdit}>
            <h3>Edit photo metadata</h3>
            <label>
              Title
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label>
              Note
              <textarea value={editing.note || ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            </label>
            <div className="button-row">
              <button className="primary">Save changes</button>
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function OcrPanel({ session, selectedPhotoId, setEditorDraft, setActiveView, onChanged, onNotice }) {
  const [rawText, setRawText] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const photo = session.manifest.photos.find((item) => item.id === selectedPhotoId) || null;

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    async function load() {
      setPreviewUrl('');
      if (!photo) return;
      try {
        const blob = await session.getPhotoBlob(photo.id);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPreviewUrl(objectUrl);
      } catch (err) {
        onNotice(err.message || 'Could not load selected photo.');
      }
    }
    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhotoId, session.manifest.updatedAt]);

  async function runScan() {
    if (!photo) return onNotice('Select a photo from the Vault lane first.');
    setBusy(true);
    setRawText('');
    setCandidates([]);
    setProgress({ status: 'starting', progress: 0 });
    try {
      const blob = await session.getPhotoBlob(photo.id);
      const text = await recognizeImageWithReusableWorker(blob, (message) => setProgress(message));
      const hits = detectSecrets(text);
      setRawText(text);
      setCandidates(hits);
      onNotice(hits.length ? `${hits.length} candidate secret(s) detected locally.` : 'OCR finished. No strong secret candidates detected.');
    } catch (err) {
      onNotice(err.message || 'OCR scan failed.');
    } finally {
      setBusy(false);
    }
  }

  function stageCandidate(candidate) {
    setEditorDraft(toSecretEditorDraft(candidate, photo?.id || null, rawText));
    setActiveView('secrets');
    onNotice('Candidate loaded into the secret editor. Review before saving.');
  }

  async function saveAllCandidates() {
    if (!photo) return onNotice('Select a photo first.');
    if (!candidates.length) return onNotice('No candidates to save.');
    const ok = window.confirm(`Save all ${candidates.length} detected candidate(s) as encrypted secret records? Review them afterward for OCR mistakes.`);
    if (!ok) return;
    for (const candidate of candidates) {
      await session.saveSecret(toSecretEditorDraft(candidate, photo.id, rawText));
    }
    onChanged();
    onNotice(`${candidates.length} candidate secret record(s) saved. Review OCR accuracy in Secrets.`);
  }

  return (
    <section className="scan-layout">
      <aside className="panel scan-preview">
        <p className="eyebrow">Scan Lane</p>
        <h2>{photo ? photo.title : 'No photo selected'}</h2>
        <div className="scan-image-frame">
          {previewUrl ? <img src={previewUrl} alt={photo.title} /> : <div className="empty-card">Select a vault photo first.</div>}
          {busy && <div className="scan-beam" />}
        </div>
        <div className="button-row">
          <button className="primary" onClick={runScan} disabled={!photo || busy}>{busy ? 'Scanning locally…' : 'Run local OCR'}</button>
          <button onClick={() => setActiveView('vault')}>Choose photo</button>
        </div>
        {progress && <p className="progress-copy">{progress.status || 'working'} · {Math.round((progress.progress || 0) * 100)}%</p>}
      </aside>

      <section className="panel scan-results">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Local Extraction</p>
            <h2>OCR candidates</h2>
          </div>
          <button onClick={saveAllCandidates} disabled={!candidates.length}>Save all candidates</button>
        </div>
        {!candidates.length && <div className="empty-card">Run OCR to detect API keys, passwords, private keys, tokens, database URLs, and env lines.</div>}
        <div className="candidate-list">
          {candidates.map((candidate, index) => (
            <button className="candidate premium-candidate" key={`${candidate.label}-${index}`} onClick={() => stageCandidate(candidate)}>
              <span>{candidate.kind}</span>
              <strong>{candidate.label}</strong>
              <code>{candidate.preview || candidate.value}</code>
              <small>Confidence score: {candidate.score}</small>
            </button>
          ))}
        </div>
        <label className="raw-wrap">
          Raw OCR text
          <textarea className="raw-ocr" value={rawText} onChange={(e) => { setRawText(e.target.value); setCandidates(detectSecrets(e.target.value)); }} placeholder="OCR output appears here. You can paste/edit text manually and re-detect candidates." />
        </label>
      </section>
    </section>
  );
}

function SecretEditor({ session, editorDraft, setEditorDraft, privacyMode, clipboardTtlSeconds = 30, onChanged, onNotice }) {
  const [draft, setDraft] = useState(editorDraft);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [revealed, setRevealed] = useState(() => new Set());

  useEffect(() => setDraft(editorDraft), [editorDraft]);

  const allSecrets = session.listSecrets();
  const kinds = ['all', ...Array.from(new Set(allSecrets.map((secret) => secret.kind || 'text'))).sort()];
  const secrets = allSecrets.filter((secret) => {
    const haystack = `${secret.label} ${secret.kind} ${secret.provider} ${secret.account} ${secret.url} ${(secret.tags || []).join(' ')} ${secret.notes || ''}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesKind = kindFilter === 'all' || secret.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  function updateDraft(patch) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setEditorDraft(next);
  }

  async function saveSecret(event) {
    event.preventDefault();
    if (!draft.value.trim()) return onNotice('Secret value cannot be empty.');
    const saved = await session.saveSecret({ ...draft, tags: Array.isArray(draft.tags) ? draft.tags : inputToTags(draft.tags) });
    setDraft({ ...emptyDraft });
    setEditorDraft({ ...emptyDraft });
    onChanged();
    onNotice(`Encrypted record saved: ${saved.label}`);
  }

  function editSecret(secret) {
    setDraft({ ...emptyDraft, ...secret, tags: secret.tags || [] });
    setEditorDraft({ ...emptyDraft, ...secret, tags: secret.tags || [] });
  }

  async function deleteSecret(secret) {
    const ok = window.confirm(`Delete encrypted secret record?\n\n${secret.label}`);
    if (!ok) return;
    await session.deleteSecret(secret.id);
    onChanged();
    onNotice('Secret record deleted.');
  }

  async function copyValue(value, label = 'secret') {
    await navigator.clipboard.writeText(value);
    onNotice(`Copied ${label}. Clipboard clear attempt runs in ${clipboardTtlSeconds} seconds.`);
    window.setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), clipboardTtlSeconds * 1000);
  }

  function toggleReveal(id) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="secret-layout premium-secret-layout">
      <form className="panel secret-form editor-console" onSubmit={saveSecret}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Secret Editor</p>
            <h2>{draft.id ? 'Edit encrypted record' : 'Create encrypted record'}</h2>
          </div>
          <button type="button" onClick={() => updateDraft({ ...emptyDraft })}>Clear</button>
        </div>
        <div className="field-grid two">
          <label>
            Label
            <input value={draft.label} onChange={(e) => updateDraft({ label: e.target.value })} placeholder="OPENAI_API_KEY" />
          </label>
          <label>
            Kind
            <select value={draft.kind} onChange={(e) => updateDraft({ kind: e.target.value })}>
              <option value="text">text</option>
              <option value="api_key">api_key</option>
              <option value="password">password</option>
              <option value="secret">secret</option>
              <option value="token">token</option>
              <option value="database_url">database_url</option>
              <option value="cloud_key">cloud_key</option>
              <option value="private_key">private_key</option>
              <option value="url_or_connection_string">url_or_connection_string</option>
            </select>
          </label>
        </div>
        <label>
          Secret value
          <textarea className="secret-value-input" value={draft.value} onChange={(e) => updateDraft({ value: e.target.value })} placeholder="Correct OCR mistakes here before saving." />
        </label>
        <div className="field-grid two">
          <label>
            Provider / system
            <input value={draft.provider} onChange={(e) => updateDraft({ provider: e.target.value })} placeholder="OpenAI, Neon, Cloudflare, GitHub" />
          </label>
          <label>
            Account / project
            <input value={draft.account} onChange={(e) => updateDraft({ account: e.target.value })} placeholder="prod, client name, repo, workspace" />
          </label>
        </div>
        <div className="field-grid two">
          <label>
            Console URL
            <input value={draft.url} onChange={(e) => updateDraft({ url: e.target.value })} placeholder="https://console.provider.com/..." />
          </label>
          <label>
            Rotation due
            <input type="date" value={draft.rotationDue} onChange={(e) => updateDraft({ rotationDue: e.target.value })} />
          </label>
        </div>
        <label>
          Tags
          <input value={tagsToInput(draft.tags)} onChange={(e) => updateDraft({ tags: inputToTags(e.target.value) })} placeholder="prod, client, api, recovery" />
        </label>
        <label>
          Notes
          <textarea value={draft.notes} onChange={(e) => updateDraft({ notes: e.target.value })} placeholder="Where this belongs, why it exists, when to rotate." />
        </label>
        <button className="primary large-action">Save encrypted record</button>
      </form>

      <section className="panel secret-list-wrap">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Vault Records</p>
            <h2>Saved secrets</h2>
          </div>
          <span className="pill">{secrets.length} visible</span>
        </div>
        <div className="list-head upgraded-list-head">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search label, provider, account, tag, note" />
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
        </div>
        {!secrets.length && <div className="empty-card">No matching records.</div>}
        <div className="secret-list">
          {secrets.map((secret) => {
            const show = revealed.has(secret.id) && !privacyMode;
            const due = isRotationDue(secret);
            return (
              <article className={classNames('secret-card', due && 'rotation-due')} key={secret.id}>
                <div className="secret-card-head">
                  <div>
                    <strong>{secret.label}</strong>
                    <span>{secret.kind} · {secret.provider || 'No provider'} · {secret.account || 'No account'}</span>
                  </div>
                  {due && <em>Rotation overdue</em>}
                </div>
                <code className={show ? '' : 'masked-secret'}>{show ? secret.value : maskSecretValue(secret.value)}</code>
                <div className="meta-chips">
                  {(secret.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
                  {secret.rotationDue && <span className={due ? 'danger-chip' : ''}>rotate {secret.rotationDue}</span>}
                  {secret.photoId && <span>linked photo</span>}
                </div>
                {secret.notes && <p>{secret.notes}</p>}
                <div className="button-row compact">
                  <button onClick={() => toggleReveal(secret.id)} disabled={privacyMode}>{show ? 'Hide' : 'Reveal'}</button>
                  <button onClick={() => copyValue(secret.value, secret.label)}>Copy value</button>
                  <button onClick={() => copyValue(envLineForSecret(secret), '.env line')}>Copy .env</button>
                  <button onClick={() => editSecret(secret)}>Edit</button>
                  <button className="danger-button" onClick={() => deleteSecret(secret)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function BackupPanel({ session, setSession, onChanged, onNotice }) {
  const [backupFile, setBackupFile] = useState(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [healthResult, setHealthResult] = useState(null);
  const [storageStatus, setStorageStatus] = useState(null);
  const [drillPassword, setDrillPassword] = useState('');
  const [drillResult, setDrillResult] = useState(null);
  const [rotate, setRotate] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    try {
      const backup = await session.exportBackup();
      downloadJson(`skyepics-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.skyepics-backup.json`, backup);
      onChanged();
      onNotice(`Encrypted backup exported with checksum ${backup.checksum}. Keep the active vault password with it.`);
    } catch (err) {
      onNotice(err.message || 'Backup export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function exportRecoveryReceipt() {
    setBusy(true);
    try {
      const receipt = await session.exportRecoveryReceipt();
      downloadJson(`skyepics-redacted-recovery-receipt-${Date.now()}.json`, receipt);
      onNotice('Redacted recovery receipt exported. It contains no secret values or image bytes.');
    } catch (err) {
      onNotice(err.message || 'Recovery receipt export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function exportEmergencyKit() {
    setBusy(true);
    try {
      const kit = await session.exportEmergencyKit();
      downloadText(`skyepics-emergency-recovery-kit-${Date.now()}.html`, kit.html, 'text/html');
      onChanged();
      onNotice('Printable emergency recovery kit exported. It contains checksum and restore steps only; no secret values or image bytes.');
    } catch (err) {
      onNotice(err.message || 'Emergency kit export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function exportIntegrityLedger() {
    setBusy(true);
    try {
      const ledger = await session.exportIntegrityLedger();
      downloadJson(`skyepics-redacted-integrity-ledger-${Date.now()}.json`, ledger);
      onNotice('Redacted integrity ledger exported. It contains encrypted-file checksums, not secret values.');
    } catch (err) {
      onNotice(err.message || 'Integrity ledger export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyBackup() {
    if (!backupFile || !backupPassword) return onNotice('Choose a backup and enter that backup password.');
    setBusy(true);
    try {
      const backup = await readJsonFile(backupFile);
      const result = await verifyBackupFile(backup, backupPassword);
      setVerifyResult(result);
      onNotice(`Backup verified: ${result.photos} photo(s), ${result.secrets} secret record(s), ${result.checksum}.`);
    } catch (err) {
      setVerifyResult(null);
      onNotice(err.message || 'Backup verification failed.');
    } finally {
      setBusy(false);
    }
  }

  async function restoreVerifiedBackup() {
    if (!backupFile || !backupPassword) return onNotice('Choose a backup and enter that backup password.');
    const ok = window.confirm('This replaces the current local SkyePics vault in this browser profile. Continue only after backup verification.');
    if (!ok) return;
    setBusy(true);
    try {
      const backup = await readJsonFile(backupFile);
      await verifyBackupFile(backup, backupPassword);
      const restored = await restoreBackup(backup, backupPassword);
      setSession(restored);
      onChanged(restored);
      onNotice('Backup restored and unlocked.');
    } catch (err) {
      onNotice(err.message || 'Restore failed.');
    } finally {
      setBusy(false);
    }
  }

  async function runHealth() {
    setBusy(true);
    try {
      const result = await session.checkVaultIntegrity();
      setHealthResult(result);
      onChanged();
      onNotice(result.ok ? 'Vault health check passed.' : 'Vault health check found issues.');
    } catch (err) {
      onNotice(err.message || 'Health check failed.');
    } finally {
      setBusy(false);
    }
  }

  async function requestPersistence() {
    const accepted = await requestPersistentStorage();
    const status = await getStorageStatus();
    setStorageStatus(status);
    onNotice(accepted ? 'Persistent storage accepted by browser.' : 'Persistent storage was not granted or is unavailable.');
  }

  async function refreshStorage() {
    setStorageStatus(await getStorageStatus());
  }

  async function runDrill() {
    setBusy(true);
    try {
      const result = await session.runRecoveryDrill(drillPassword);
      setDrillResult(result);
      onChanged();
      onNotice(`Recovery drill passed for checksum ${result.backupChecksum}.`);
    } catch (err) {
      onNotice(err.message || 'Recovery drill failed.');
    } finally {
      setBusy(false);
    }
  }

  function exportDrillReport() {
    if (!drillResult) return;
    downloadJson(`skyepics-recovery-drill-${Date.now()}.json`, drillResult);
    onNotice('Recovery drill report exported. It contains receipt/checksum data, not secret values.');
  }

  async function rotatePassword(event) {
    event.preventDefault();
    if (rotate.next !== rotate.confirm) return onNotice('New password confirmation does not match.');
    setBusy(true);
    try {
      await session.rotatePassword(rotate.current, rotate.next);
      setRotate({ current: '', next: '', confirm: '' });
      onChanged();
      onNotice('Vault password rotated and encrypted files rewrapped. Export a new backup now.');
    } catch (err) {
      onNotice(err.message || 'Password rotation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="backup-grid premium-backup-grid">
      <article className="backup-card panel hero-backup">
        <p className="eyebrow">Reliquary</p>
        <h2>Backup command center</h2>
        <p>Browser private storage is not enough by itself. The real recovery path is an encrypted SkyePics backup plus the password that was active when the backup was exported.</p>
        <div className="button-row">
          <button onClick={exportIntegrityLedger} disabled={busy}>Export ledger</button>
          <button onClick={exportRecoveryReceipt} disabled={busy}>Export receipt</button>
          <button onClick={exportEmergencyKit} disabled={busy}>Emergency kit</button>
          <button className="primary" onClick={exportBackup} disabled={busy}>{busy ? 'Working…' : 'Export backup'}</button>
        </div>
      </article>

      <article className="backup-card panel">
        <h3>Verify / restore backup</h3>
        <p>Upload the encrypted backup file and enter the password from the moment that backup was exported. Verification checks password and checksum before replacement.</p>
        <label className="file-button block-file">
          Choose backup
          <input type="file" accept=".json,.skyepics-backup.json,application/json" onChange={(e) => setBackupFile(e.target.files?.[0] || null)} />
        </label>
        <label>
          Backup password
          <input type="password" value={backupPassword} onChange={(e) => setBackupPassword(e.target.value)} />
        </label>
        <div className="button-row">
          <button onClick={verifyBackup} disabled={busy}>Verify backup</button>
          <button className="danger-button" onClick={restoreVerifiedBackup} disabled={busy}>Restore verified</button>
        </div>
        {verifyResult && <code>{JSON.stringify(verifyResult, null, 2)}</code>}
      </article>

      <article className="backup-card panel">
        <h3>Run health check</h3>
        <p>Decrypt-verifies each encrypted photo file, checks local header/manifest presence, and flags dangling secret-photo links.</p>
        <button onClick={runHealth} disabled={busy}>Run health check</button>
        {healthResult && (
          <div className="audit-list">
            <div><strong>{healthResult.ok ? 'Passed' : 'Needs attention'}</strong><p>{healthResult.photosChecked} photo(s), {healthResult.secretRecordsChecked} secret record(s), {formatBytes(healthResult.encryptedBytesChecked)} encrypted bytes checked.</p></div>
            {healthResult.unreadablePhotos.map((item) => <div key={item.id}><strong>{item.title}</strong><p>{item.error}</p></div>)}
            {healthResult.danglingSecretLinks.map((item) => <div key={item.id}><strong>{item.label}</strong><p>Broken photo link: {item.photoId}</p></div>)}
          </div>
        )}
      </article>

      <article className="backup-card panel">
        <h3>Browser persistence</h3>
        <p>Ask the browser to avoid evicting this origin’s private storage. Still export backups. Persistence is not a substitute for backups.</p>
        <div className="button-row">
          <button onClick={requestPersistence}>Request persistence</button>
          <button onClick={refreshStorage}>Refresh status</button>
        </div>
        {storageStatus && <code>{JSON.stringify({ ...storageStatus, quota: formatBytes(storageStatus.quota), usage: formatBytes(storageStatus.usage) }, null, 2)}</code>}
      </article>

      <article className="backup-card panel">
        <h3>Run drill</h3>
        <p>Builds a fresh encrypted backup payload, verifies the password/checksum, and creates a redacted recovery-drill proof report.</p>
        <label>
          Active vault password
          <input type="password" value={drillPassword} onChange={(e) => setDrillPassword(e.target.value)} />
        </label>
        <div className="button-row">
          <button onClick={runDrill} disabled={busy}>Run drill</button>
          <button onClick={exportDrillReport} disabled={!drillResult}>Export drill report</button>
        </div>
        {drillResult && <code>{drillResult.backupChecksum}</code>}
      </article>

      <form className="backup-card panel" onSubmit={rotatePassword}>
        <h3>Rotate password</h3>
        <p>Re-encrypts manifest access and every encrypted photo file with a new password. Export a new backup immediately after rotation.</p>
        <label>
          Current password
          <input type="password" value={rotate.current} onChange={(e) => setRotate({ ...rotate, current: e.target.value })} />
        </label>
        <label>
          New password
          <input type="password" value={rotate.next} onChange={(e) => setRotate({ ...rotate, next: e.target.value })} />
        </label>
        <label>
          Confirm new password
          <input type="password" value={rotate.confirm} onChange={(e) => setRotate({ ...rotate, confirm: e.target.value })} />
        </label>
        <button className="danger-button" disabled={busy}>Rotate password</button>
      </form>
    </section>
  );
}

function SecurityPanel({ session, onChanged, onNotice }) {
  const [audit, setAudit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lockOnHidden, setLockOnHidden] = useState(session.manifest.settings?.lockOnHidden !== false);
  const [clipboardTtl, setClipboardTtl] = useState(session.manifest.settings?.clipboardTtlSeconds || 30);

  async function runSecretAudit() {
    setBusy(true);
    try {
      const report = await session.runSecretRiskAudit();
      setAudit(report);
      onChanged();
      onNotice(report.ok ? 'Secret audit passed.' : 'Secret audit found risk groups.');
    } catch (err) {
      onNotice(err.message || 'Secret audit failed.');
    } finally {
      setBusy(false);
    }
  }

  async function exportSecretRiskLedger() {
    setBusy(true);
    try {
      const ledger = await session.exportSecretRiskLedger();
      downloadJson(`skyepics-redacted-secret-risk-ledger-${Date.now()}.json`, ledger);
      onNotice('Redacted secret-risk ledger exported. It contains no secret values.');
    } catch (err) {
      onNotice(err.message || 'Secret-risk ledger export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    await session.updateVaultSettings({ lockOnHidden, clipboardTtlSeconds: clipboardTtl });
    onChanged();
    onNotice('Security settings saved.');
  }

  const recentAudit = session.manifest.secretRiskReports?.[0] || null;
  const auditRows = audit ? [
    ['Weak passwords', audit.weakPasswords.length],
    ['Duplicate value groups', audit.duplicateValueGroups.length],
    ['Overdue rotations', audit.overdueRotations.length],
    ['Missing rotation dates', audit.missingRotationDates.length],
    ['Long-lived sensitive records', audit.longLivedRecords.length],
    ['Unlinked records', audit.unlinkedRecords.length],
    ['Private key records', audit.privateKeyRecords.length]
  ] : [];

  return (
    <section className="security-grid premium-security-grid">
      <article className="panel backup-card hero-security">
        <p className="eyebrow">Security Lane</p>
        <h2>Redacted vault audit</h2>
        <p>Secret-risk audit checks weak password-like values, duplicate value hashes, overdue rotations, missing rotation dates, old sensitive records, unlinked records, and private-key records without exporting secret values.</p>
        <div className="button-row">
          <button className="primary" onClick={runSecretAudit} disabled={busy}>Run secret audit</button>
          <button onClick={exportSecretRiskLedger} disabled={busy}>Export risk ledger</button>
        </div>
        {recentAudit && <p>Latest stored audit: {recentAudit.ok ? 'passed' : 'flagged'} · {niceDate(recentAudit.createdAt)}</p>}
      </article>

      <form className="panel backup-card" onSubmit={saveSettings}>
        <h3>Behavior settings</h3>
        <label className="switch-row inline-switch">
          <input type="checkbox" checked={lockOnHidden} onChange={(e) => setLockOnHidden(e.target.checked)} />
          Lock when tab/app is hidden
        </label>
        <label>
          Clipboard clear timer seconds
          <input type="number" min="5" max="120" value={clipboardTtl} onChange={(e) => setClipboardTtl(Number(e.target.value))} />
        </label>
        <button>Save settings</button>
      </form>

      <article className="panel backup-card">
        <h3>Audit summary</h3>
        {!audit && <p>Run an audit to see current redacted risk groups.</p>}
        {audit && (
          <div className="audit-list">
            <div><strong>{audit.ok ? 'Passed' : 'Needs attention'}</strong><p>{audit.totals.records} total record(s), {audit.totals.linkedRecords} linked to evidence photos.</p></div>
            {auditRows.map(([label, value]) => <div key={label}><strong>{value}</strong><p>{label}</p></div>)}
          </div>
        )}
      </article>

      <article className="panel backup-card audit-trail-card">
        <h3>Local audit trail</h3>
        <p>Recent vault actions are kept inside the encrypted manifest.</p>
        <div className="audit-list compact-audit-list">
          {(session.manifest.audit || []).slice(0, 12).map((entry) => (
            <div key={entry.id}>
              <strong>{entry.action}</strong>
              <span>{niceDate(entry.at)}</span>
              {entry.note && <p>{entry.note}</p>}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function InstallPanel({ session, onChanged, onNotice }) {
  const [deferredInstall, setDeferredInstall] = useState(null);
  const [displayMode, setDisplayMode] = useState(() => (window.matchMedia?.('(display-mode: standalone)').matches ? 'standalone' : 'browser'));
  const [serviceWorkerReady, setServiceWorkerReady] = useState(Boolean(navigator.serviceWorker?.controller));
  const [reminderDays, setReminderDays] = useState(session.manifest.settings?.backupReminderDays || 7);
  const stats = session.getStats();

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstall(event);
    };
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onModeChange = () => setDisplayMode(media?.matches ? 'standalone' : 'browser');
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    media?.addEventListener?.('change', onModeChange);
    navigator.serviceWorker?.ready?.then(() => setServiceWorkerReady(true)).catch(() => setServiceWorkerReady(false));
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      media?.removeEventListener?.('change', onModeChange);
    };
  }, []);

  async function installApp() {
    if (!deferredInstall) {
      onNotice('Install prompt is not available yet. Use the browser menu to install/add SkyePics to the home screen.');
      return;
    }
    deferredInstall.prompt();
    const choice = await deferredInstall.userChoice.catch(() => null);
    setDeferredInstall(null);
    onNotice(choice?.outcome === 'accepted' ? 'Install accepted.' : 'Install prompt dismissed. Browser install menu still works.');
  }

  async function saveReminderDays(event) {
    event.preventDefault();
    await session.updateVaultSettings({ backupReminderDays: reminderDays });
    onChanged();
    onNotice(`Backup reminder set to ${reminderDays} day(s).`);
  }

  return (
    <section className="panel install-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Field Kit Lane</p>
          <h2>Install and recovery readiness</h2>
        </div>
        <button onClick={installApp}>{deferredInstall ? 'Install app' : 'Install help'}</button>
      </div>
      <div className="readiness-grid">
        <div className="backup-card">
          <h3>Offline shell</h3>
          <p>{serviceWorkerReady ? 'Service worker is ready for the app shell.' : 'Service worker is registering or unavailable in this browser context.'}</p>
          <p>Display mode: {displayMode}. Camera still requires localhost or HTTPS.</p>
        </div>
        <form className="backup-card" onSubmit={saveReminderDays}>
          <h3>Backup reminder</h3>
          <p>{stats.backupDue ? 'Backup is due or no backup has been exported from this vault yet.' : `Last backup: ${niceDate(stats.lastBackupAt)}`}</p>
          {stats.lastBackupChecksum && <code>{stats.lastBackupChecksum}</code>}
          <label>
            Remind after days
            <input type="number" min="1" max="90" value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} />
          </label>
          <button>Save reminder</button>
        </form>
        <div className="backup-card">
          <h3>Integrity ledger</h3>
          <p>{stats.lastIntegrityAt ? `Last check: ${niceDate(stats.lastIntegrityAt)}` : 'No health check has been recorded yet.'}</p>
          <p>{stats.lastIntegrityOk === null ? 'Run a health check to start the ledger.' : stats.lastIntegrityOk ? 'Latest integrity check passed.' : 'Latest integrity check found an issue.'}</p>
          <p>{stats.integrityReports} stored report{stats.integrityReports === 1 ? '' : 's'} inside the encrypted manifest.</p>
        </div>
        <div className="backup-card">
          <h3>Secret audit ledger</h3>
          <p>{stats.lastSecretAuditAt ? `Last audit: ${niceDate(stats.lastSecretAuditAt)}` : 'No secret audit has been recorded yet.'}</p>
          <p>{stats.lastSecretAuditOk === null ? 'Run a secret audit from Security Lane.' : stats.lastSecretAuditOk ? 'Latest secret audit passed.' : 'Latest secret audit flagged risk groups.'}</p>
          <p>{stats.secretRiskReports} stored report{stats.secretRiskReports === 1 ? '' : 's'} inside the encrypted manifest.</p>
        </div>
      </div>
    </section>
  );
}

function AppShell({ session, setSession }) {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [activeView, setActiveView] = useState('home');
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [editorDraft, setEditorDraft] = useState({ ...emptyDraft });
  const [privacyMode, setPrivacyMode] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem('skyepics.v1.tutorialSeen') !== 'true');
  const [lockSeconds, setLockSeconds] = useState(15 * 60);
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const stats = session.getStats();

  function changed(nextSession = session) {
    if (nextSession !== session) setSession(nextSession);
    setRevision((value) => value + 1);
  }

  function showNotice(message) {
    setNotice(message);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(''), 5200);
  }

  async function lock() {
    await shutdownOcrWorker();
    setSession(null);
  }

  function handleCaptured(photo, nextView = null) {
    setSelectedPhotoId(photo.id);
    if (nextView) setActiveView(nextView);
  }

  useEffect(() => {
    const bump = () => setLastActivity(Date.now());
    const events = ['click', 'keydown', 'pointerdown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, bump, { passive: true }));
    const interval = window.setInterval(() => {
      if (lockSeconds > 0 && Date.now() - lastActivity > lockSeconds * 1000) {
        showNotice('Auto-lock triggered after inactivity.');
        lock();
      }
    }, 5000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, bump));
      window.clearInterval(interval);
    };
  }, [lastActivity, lockSeconds]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const workerUrl = new URL('./sw.js', window.location.href);
      navigator.serviceWorker.register(workerUrl, { scope: './' }).catch(() => {});
    }
    return () => { shutdownOcrWorker(); };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && session.manifest.settings?.lockOnHidden !== false) {
        showNotice('SkyePics locked because the tab/app was hidden.');
        lock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [session]);

  const view = (() => {
    if (activeView === 'tutorial') return <TutorialPanel stats={stats} setActiveView={setActiveView} onOpenTutorial={() => setTutorialOpen(true)} />;
    if (activeView === 'camera') return <CameraPanel session={session} onCaptured={handleCaptured} onChanged={changed} onNotice={showNotice} />;
    if (activeView === 'vault') return <GalleryPanel session={session} revision={revision} selectedPhotoId={selectedPhotoId} setSelectedPhotoId={setSelectedPhotoId} privacyMode={privacyMode} setActiveView={setActiveView} onChanged={changed} onNotice={showNotice} />;
    if (activeView === 'scan') return <OcrPanel session={session} selectedPhotoId={selectedPhotoId} setEditorDraft={setEditorDraft} setActiveView={setActiveView} onChanged={changed} onNotice={showNotice} />;
    if (activeView === 'secrets') return <SecretEditor session={session} editorDraft={editorDraft} setEditorDraft={setEditorDraft} privacyMode={privacyMode} clipboardTtlSeconds={stats.clipboardTtlSeconds} onChanged={changed} onNotice={showNotice} />;
    if (activeView === 'backup') return <><InstallPanel session={session} onChanged={changed} onNotice={showNotice} /><BackupPanel session={session} setSession={setSession} onChanged={changed} onNotice={showNotice} /></>;
    if (activeView === 'security') return <SecurityPanel session={session} onChanged={changed} onNotice={showNotice} />;
    return <HomePanel session={session} stats={stats} setActiveView={setActiveView} />;
  })();

  return (
    <div className={classNames('app-shell', privacyMode && 'privacy-shell')}>
      <aside className="side-nav glass">
        <div className="nav-brand">
          <BrandLogo compact />
          <span>SkyePics</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={activeView === item.id ? 'active' : ''} onClick={() => setActiveView(item.id)}>
              <i>{item.icon}</i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <header className="app-header glass">
          <div className="brand-lockup compact-brand">
            <BrandLogo compact className="small-mark" />
            <div>
              <p className="eyebrow">SkyePics Vault</p>
              <h1>{NAV_ITEMS.find((item) => item.id === activeView)?.label || 'Command'} · local encrypted picture intelligence</h1>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={() => setTutorialOpen(true)}>Tutorial</button>
            <label className="switch-row">
              <input type="checkbox" checked={privacyMode} onChange={(e) => setPrivacyMode(e.target.checked)} />
              Privacy shield
            </label>
            <label className="compact-select">
              Auto-lock
              <select value={lockSeconds} onChange={(e) => setLockSeconds(Number(e.target.value))}>
                <option value={300}>5m</option>
                <option value={900}>15m</option>
                <option value={1800}>30m</option>
                <option value={0}>Never</option>
              </select>
            </label>
            <button onClick={lock}>Lock</button>
          </div>
        </header>

        <nav className="lane-strip glass" aria-label="SkyePics pages">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={activeView === item.id ? 'active' : ''} onClick={() => setActiveView(item.id)}>
              <i>{item.icon}</i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {notice && <div className="toast">{notice}</div>}
        {stats.backupDue && <div className="notice recovery-warning">Export an encrypted backup after important captures. Browser-local storage is not a permanent archive by itself.</div>}
        <div className="view-stage">{view}</div>
        <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} onNavigate={(lane) => setActiveView(lane)} />
      </main>

      <nav className="bottom-nav glass">
        {NAV_ITEMS.map((item) => (
          <button key={item.id} className={activeView === item.id ? 'active' : ''} onClick={() => setActiveView(item.id)}>
            <i>{item.icon}</i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [gateNotice, setGateNotice] = useState('');
  const [showLanding, setShowLanding] = useState(true);
  const [frontTutorialOpen, setFrontTutorialOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => localStorage.getItem('skyepics.v17.introSeen') !== 'true');

  const background = useMemo(() => (
    <div className="ambient" aria-hidden="true">
      <div className="orb one" />
      <div className="orb two" />
      <div className="orb three" />
      <div className="grid-glow" />
      <div className="noise" />
    </div>
  ), []);

  return (
    <>
      {background}
      {showIntro ? (
        <IntroSequence onComplete={() => setShowIntro(false)} />
      ) : session ? (
        <AppShell session={session} setSession={setSession} />
      ) : showLanding ? (
        <>
          <LandingGate onEnter={() => setShowLanding(false)} onOpenTutorial={() => setFrontTutorialOpen(true)} onReplayIntro={() => setShowIntro(true)} />
          <TutorialModal open={frontTutorialOpen} onClose={() => setFrontTutorialOpen(false)} onNavigate={() => setShowLanding(false)} />
        </>
      ) : (
        <>
          {gateNotice && <div className="toast gate-toast">{gateNotice}</div>}
          <VaultGate onUnlocked={setSession} onNotice={setGateNotice} />
          <button className="landing-return" onClick={() => setShowLanding(true)}>Back to SkyePics landing</button>
        </>
      )}
    </>
  );
}
