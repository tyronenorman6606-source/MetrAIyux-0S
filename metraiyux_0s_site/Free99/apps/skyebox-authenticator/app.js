
    (() => {
      'use strict';

      const APP_VERSION = '3.0.0';
      const STORE_KEY = 'skyebox.authenticator.v2';
      const SETTINGS_KEY = 'skyebox.authenticator.settings.v3';
      const LEGACY_KEYS = ['skyebox.accounts', 'accounts'];
      const KDF_ITERATIONS = 310000;
      const DEFAULT_SETTINGS = { autoLockMs: 5 * 60 * 1000, clipboardClearMs: 30 * 1000 };
      const RING_RADIUS = 27;
      const RING_CIRC = 2 * Math.PI * RING_RADIUS;

      const state = {
        accounts: [],
        filtered: [],
        unlocked: false,
        editingId: null,
        masterKey: null,
        vaultRecord: null,
        deferredInstall: null,
        scanStream: null,
        scanLoop: null,
        detector: null,
        keyCache: new Map(),
        lastActivity: Date.now(),
        settings: { ...DEFAULT_SETTINGS },
        clipboardTimer: null
      };

      const $ = (selector) => document.querySelector(selector);
      const $$ = (selector) => Array.from(document.querySelectorAll(selector));

      const els = {
        authView: $('#authView'),
        appView: $('#appView'),
        authForm: $('#authForm'),
        authTitle: $('#authTitle'),
        authSubtitle: $('#authSubtitle'),
        authSubmit: $('#authSubmit'),
        passwordInput: $('#passwordInput'),
        confirmField: $('#confirmField'),
        confirmInput: $('#confirmInput'),
        passwordMeter: $('#passwordMeter'),
        passwordHint: $('#passwordHint'),
        cryptoWarning: $('#cryptoWarning'),
        sessionActions: $('#sessionActions'),
        installBtn: $('#installBtn'),
        lockBtn: $('#lockBtn'),
        addBtn: $('#addBtn'),
        exportBtn: $('#exportBtn'),
        importFile: $('#importFile'),
        searchInput: $('#searchInput'),
        accountList: $('#accountList'),
        emptyState: $('#emptyState'),
        totalCount: $('#totalCount'),
        visibleCount: $('#visibleCount'),
        nextRefresh: $('#nextRefresh'),
        lockWindow: $('#lockWindow'),
        autoLockSelect: $('#autoLockSelect'),
        scannerSupport: $('#scannerSupport'),
        vaultAuditLine: $('#vaultAuditLine'),
        changePasswordBtn: $('#changePasswordBtn'),
        wipeVaultBtn: $('#wipeVaultBtn'),
        tokenModal: $('#tokenModal'),
        tokenForm: $('#tokenForm'),
        tokenModalTitle: $('#tokenModalTitle'),
        saveTokenBtn: $('#saveTokenBtn'),
        scanBtn: $('#scanBtn'),
        qrImageInput: $('#qrImageInput'),
        uriInput: $('#uriInput'),
        issuerInput: $('#issuerInput'),
        labelInput: $('#labelInput'),
        secretInput: $('#secretInput'),
        algorithmInput: $('#algorithmInput'),
        digitsInput: $('#digitsInput'),
        periodInput: $('#periodInput'),
        scannerOverlay: $('#scannerOverlay'),
        scannerVideo: $('#scannerVideo'),
        stopScanBtn: $('#stopScanBtn'),
        passwordModal: $('#passwordModal'),
        changePasswordForm: $('#changePasswordForm'),
        currentPasswordInput: $('#currentPasswordInput'),
        newPasswordInput: $('#newPasswordInput'),
        newConfirmInput: $('#newConfirmInput'),
        rotateKeyBtn: $('#rotateKeyBtn'),
        toast: $('#toast')
      };

      document.addEventListener('DOMContentLoaded', init);

      function init() {
        bindEvents();
        loadSettings();
        evaluateCapabilities();
        loadVaultRecord();
        setupPwaInstall();
        renderAuthState();
        setInterval(tick, 1000);
        setInterval(checkAutoLock, 15000);
        tick();
      }

      function bindEvents() {
        els.authForm.addEventListener('submit', handleAuthSubmit);
        els.lockBtn.addEventListener('click', lockVault);
        els.addBtn.addEventListener('click', () => openTokenModal());
        els.exportBtn.addEventListener('click', exportVault);
        els.importFile.addEventListener('change', importVaultFile);
        els.changePasswordBtn.addEventListener('click', openPasswordModal);
        els.wipeVaultBtn.addEventListener('click', wipeLocalVault);
        els.autoLockSelect.addEventListener('change', updateAutoLockSetting);
        els.searchInput.addEventListener('input', renderAccounts);
        els.tokenForm.addEventListener('submit', saveTokenFromForm);
        els.scanBtn.addEventListener('click', startScanner);
        els.qrImageInput.addEventListener('change', handleQrImage);
        els.stopScanBtn.addEventListener('click', stopScanner);
        els.installBtn.addEventListener('click', installPwa);
        els.changePasswordForm.addEventListener('submit', changeMasterPassword);
        els.passwordInput.addEventListener('input', () => updatePasswordMeter(els.passwordInput.value));

        document.addEventListener('click', (event) => {
          const target = event.target.closest('[data-action]');
          if (!target) return;
          const action = target.dataset.action;
          const id = target.dataset.id;
          if (action === 'open-add') openTokenModal();
          if (action === 'close-modal') closeTokenModal();
          if (action === 'close-password-modal') closePasswordModal();
          if (action === 'copy') copyToken(id);
          if (action === 'copy-uri') copyOtpUri(id);
          if (action === 'edit') openTokenModal(id);
          if (action === 'delete') deleteAccount(id);
        });

        ['mousemove', 'keydown', 'pointerdown', 'touchstart'].forEach((eventName) => {
          document.addEventListener(eventName, () => { state.lastActivity = Date.now(); }, { passive: true });
        });

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) saveVault().catch(() => undefined);
        });
      }


      function loadSettings() {
        const saved = safeJson(localStorage.getItem(SETTINGS_KEY)) || {};
        state.settings = { ...DEFAULT_SETTINGS, ...saved };
        if (!Number.isFinite(Number(state.settings.autoLockMs)) || Number(state.settings.autoLockMs) < 60000) {
          state.settings.autoLockMs = DEFAULT_SETTINGS.autoLockMs;
        }
        renderSettings();
      }

      function renderSettings() {
        if (els.autoLockSelect) els.autoLockSelect.value = String(state.settings.autoLockMs);
        if (els.lockWindow) els.lockWindow.textContent = formatDuration(state.settings.autoLockMs);
      }

      function updateAutoLockSetting() {
        state.settings.autoLockMs = Number(els.autoLockSelect.value || DEFAULT_SETTINGS.autoLockMs);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
        renderSettings();
        toast(`Idle lock set to ${formatDuration(state.settings.autoLockMs)}.`);
      }

      function formatDuration(ms) {
        const minutes = Math.max(1, Math.round(Number(ms || DEFAULT_SETTINGS.autoLockMs) / 60000));
        return minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes}m`;
      }

      function updatePasswordMeter(password) {
        if (!els.passwordMeter || !els.passwordHint) return;
        const score = passwordScore(password);
        els.passwordMeter.style.width = `${score.percent}%`;
        els.passwordHint.textContent = score.label;
      }

      function passwordScore(password) {
        const value = String(password || '');
        let score = 0;
        if (value.length >= 8) score += 18;
        if (value.length >= 12) score += 22;
        if (/[A-Z]/.test(value)) score += 12;
        if (/[a-z]/.test(value)) score += 12;
        if (/\d/.test(value)) score += 12;
        if (/[^A-Za-z0-9]/.test(value)) score += 14;
        if (value.length >= 18) score += 10;
        const percent = Math.min(100, score);
        let label = 'Use at least 8 characters. Longer is materially safer.';
        if (percent >= 80) label = 'Strong local encryption password.';
        else if (percent >= 55) label = 'Decent. Add length or symbols for stronger vault protection.';
        else if (percent >= 35) label = 'Weak-to-moderate. Prefer 12+ characters.';
        return { percent, label };
      }

      function evaluateCapabilities() {
        const hasCrypto = Boolean(window.crypto && crypto.subtle && crypto.getRandomValues);
        if (!hasCrypto) {
          els.cryptoWarning.classList.remove('hidden');
          els.authSubmit.disabled = true;
        }

        if ('BarcodeDetector' in window) {
          els.scannerSupport.textContent = 'Camera and image QR detection are available in this browser.';
          try { state.detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (_) { state.detector = null; }
        } else {
          els.scannerSupport.textContent = 'Native QR detection is unavailable here. Paste the otpauth URI or use a browser with BarcodeDetector support.';
          els.scanBtn.disabled = true;
        }
      }

      function loadVaultRecord() {
        const raw = localStorage.getItem(STORE_KEY);
        state.vaultRecord = raw ? safeJson(raw) : null;
        if (!state.vaultRecord) {
          for (const key of LEGACY_KEYS) {
            const legacy = safeJson(localStorage.getItem(key));
            if (Array.isArray(legacy) && legacy.length) {
              sessionStorage.setItem('skyebox.pendingLegacyImport', JSON.stringify(legacy));
              break;
            }
          }
        }
      }

      function renderAuthState() {
        els.sessionActions.classList.toggle('hidden', !state.unlocked);
        els.appView.classList.toggle('hidden', !state.unlocked);
        els.authView.classList.toggle('hidden', state.unlocked);

        const hasVault = Boolean(state.vaultRecord);
        els.authTitle.textContent = hasVault ? 'Unlock vault' : 'Create vault';
        els.authSubtitle.textContent = hasVault
          ? 'Enter your vault password to decrypt your saved authenticators.'
          : 'Create a password that encrypts this device vault.';
        els.authSubmit.textContent = hasVault ? 'Unlock vault' : 'Create encrypted vault';
        els.confirmField.classList.toggle('hidden', hasVault);
        els.confirmInput.required = !hasVault;
        els.passwordInput.autocomplete = hasVault ? 'current-password' : 'new-password';
        els.passwordInput.value = '';
        els.confirmInput.value = '';
        updatePasswordMeter('');
      }

      async function handleAuthSubmit(event) {
        event.preventDefault();
        const password = els.passwordInput.value;
        const confirm = els.confirmInput.value;

        if (!password || password.length < 8) {
          toast('Use at least 8 characters.');
          return;
        }

        try {
          els.authSubmit.disabled = true;
          if (state.vaultRecord) {
            await unlockExistingVault(password);
          } else {
            if (password !== confirm) throw new Error('Passwords do not match.');
            await createVault(password);
          }
          state.unlocked = true;
          state.lastActivity = Date.now();
          els.passwordInput.value = '';
          els.confirmInput.value = '';
          renderAuthState();
          await handlePendingLegacyImport();
          renderAccounts();
          toast('Vault unlocked.');
        } catch (error) {
          toast(error.message || 'Could not unlock vault.');
        } finally {
          els.authSubmit.disabled = false;
        }
      }

      async function createVault(password) {
        const salt = randomBytes(16);
        state.masterKey = await deriveKey(password, salt, KDF_ITERATIONS);
        state.accounts = [];
        state.vaultRecord = createVaultRecord(salt, new Date().toISOString());
        await saveVault();
      }

      function createVaultRecord(salt, createdAt = new Date().toISOString()) {
        return {
          version: 3,
          app: 'SkyeBox Authenticator',
          appVersion: APP_VERSION,
          createdAt,
          updatedAt: new Date().toISOString(),
          kdf: {
            name: 'PBKDF2',
            hash: 'SHA-256',
            iterations: KDF_ITERATIONS,
            salt: toBase64(salt)
          },
          cipher: {
            name: 'AES-GCM',
            iv: '',
            payload: ''
          }
        };
      }

      async function unlockExistingVault(password) {
        const decrypted = await decryptVaultRecord(state.vaultRecord, password);
        state.masterKey = decrypted.key;
        state.accounts = sanitizeAccounts(decrypted.accounts || []);
        if (state.vaultRecord.version !== 3 || Number(state.vaultRecord.kdf.iterations || 0) < KDF_ITERATIONS) {
          const salt = randomBytes(16);
          state.vaultRecord = createVaultRecord(salt, state.vaultRecord.createdAt || new Date().toISOString());
          state.masterKey = await deriveKey(password, salt, KDF_ITERATIONS);
          await saveVault();
        }
      }

      async function decryptVaultRecord(record, password) {
        if (!record || !record.kdf || !record.cipher || !record.cipher.payload || !record.cipher.iv) throw new Error('Unsupported vault file.');
        const salt = fromBase64(record.kdf.salt);
        const iterations = Number(record.kdf.iterations || KDF_ITERATIONS);
        const key = await deriveKey(password, salt, iterations);
        const payload = fromBase64(record.cipher.payload);
        const iv = fromBase64(record.cipher.iv);
        let decrypted;
        try {
          decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, payload);
        } catch (_) {
          throw new Error('Wrong password or damaged vault.');
        }
        const data = JSON.parse(new TextDecoder().decode(decrypted));
        return { key, accounts: sanitizeAccounts(data.accounts || []) };
      }

      async function saveVault() {
        if (!state.masterKey || !state.vaultRecord) return;
        const iv = randomBytes(12);
        const payload = new TextEncoder().encode(JSON.stringify({
          schemaVersion: 3,
          exportedBy: 'SkyeBox Authenticator',
          accounts: state.accounts
        }));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, state.masterKey, payload);
        const next = {
          ...state.vaultRecord,
          version: 3,
          appVersion: APP_VERSION,
          updatedAt: new Date().toISOString(),
          cipher: {
            name: 'AES-GCM',
            iv: toBase64(iv),
            payload: toBase64(new Uint8Array(encrypted))
          }
        };
        state.vaultRecord = next;
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
        renderVaultAudit();
      }

      async function handlePendingLegacyImport() {
        const raw = sessionStorage.getItem('skyebox.pendingLegacyImport');
        if (!raw) return;
        const legacy = sanitizeAccounts(safeJson(raw) || []);
        if (legacy.length) {
          state.accounts = mergeAccounts(state.accounts, legacy);
          await saveVault();
          toast(`Imported ${legacy.length} legacy token${legacy.length === 1 ? '' : 's'}.`);
        }
        sessionStorage.removeItem('skyebox.pendingLegacyImport');
      }

      function renderVaultAudit() {
        if (!els.vaultAuditLine || !state.vaultRecord) return;
        const updated = state.vaultRecord.updatedAt ? new Date(state.vaultRecord.updatedAt).toLocaleString() : 'unknown';
        const iterations = Number(state.vaultRecord.kdf?.iterations || 0).toLocaleString();
        els.vaultAuditLine.textContent = `Vault v${state.vaultRecord.version || '?'} • ${iterations} PBKDF2 iterations • updated ${updated}`;
      }

      function lockVault() {
        stopScanner();
        closeTokenModal();
        state.accounts = [];
        state.filtered = [];
        state.unlocked = false;
        state.masterKey = null;
        state.keyCache.clear();
        clearTimeout(state.clipboardTimer);
        renderAuthState();
        toast('Vault locked.');
      }

      function checkAutoLock() {
        if (!state.unlocked) return;
        if (Date.now() - state.lastActivity >= Number(state.settings.autoLockMs || DEFAULT_SETTINGS.autoLockMs)) lockVault();
      }

      function renderAccounts() {
        if (!state.unlocked) return;
        const query = els.searchInput.value.trim().toLowerCase();
        const sorted = [...state.accounts].sort((a, b) => `${a.issuer} ${a.label}`.localeCompare(`${b.issuer} ${b.label}`));
        state.filtered = query
          ? sorted.filter((account) => `${account.issuer} ${account.label}`.toLowerCase().includes(query))
          : sorted;

        els.totalCount.textContent = String(state.accounts.length);
        els.visibleCount.textContent = String(state.filtered.length);
        els.emptyState.classList.toggle('hidden', state.accounts.length !== 0);
        els.accountList.innerHTML = state.filtered.map(renderAccountCard).join('');
        renderSettings();
        renderVaultAudit();
        tick();
      }

      function renderAccountCard(account) {
        const initials = getInitials(account.issuer || account.label);
        return `
          <article class="account-card" data-account-id="${escapeHtml(account.id)}">
            <div>
              <div class="account-head">
                <div class="service-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
                <div class="account-title">
                  <strong>${escapeHtml(account.issuer || 'Unknown issuer')}</strong>
                  <span>${escapeHtml(account.label || 'Unknown account')}</span>
                </div>
              </div>
              <div class="code-row">
                <button class="btn ghost" type="button" data-action="copy" data-id="${escapeHtml(account.id)}" aria-label="Copy token">
                  <span class="code" id="code-${escapeHtml(account.id)}">••• •••</span>
                </button>
              </div>
              <div class="account-meta" aria-label="Token settings">
                <span class="pill">${escapeHtml(account.algorithm || 'SHA-1')}</span>
                <span class="pill">${escapeHtml(account.digits || 6)} digits</span>
                <span class="pill">${escapeHtml(account.period || 30)}s</span>
              </div>
            </div>
            <div class="card-actions">
              <div class="ring-wrap" aria-label="Time remaining">
                <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">
                  <circle class="ring-bg" cx="31" cy="31" r="${RING_RADIUS}" fill="none" stroke-width="5"></circle>
                  <circle class="ring-bar" id="ring-${escapeHtml(account.id)}" cx="31" cy="31" r="${RING_RADIUS}" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="${RING_CIRC}" stroke-dashoffset="0"></circle>
                </svg>
                <span class="ring-time" id="time-${escapeHtml(account.id)}">30</span>
              </div>
              <button class="btn small" type="button" data-action="copy-uri" data-id="${escapeHtml(account.id)}">Copy URI</button>
              <button class="btn small" type="button" data-action="edit" data-id="${escapeHtml(account.id)}">Edit</button>
              <button class="btn small danger" type="button" data-action="delete" data-id="${escapeHtml(account.id)}">Delete</button>
            </div>
          </article>`;
      }

      async function tick() {
        if (!state.unlocked || !state.filtered.length) {
          const seconds = new Date().getSeconds();
          els.nextRefresh.textContent = `${30 - (seconds % 30)}s`;
          return;
        }

        const now = Date.now();
        const seconds = Math.floor(now / 1000);
        const defaultLeft = 30 - (seconds % 30);
        els.nextRefresh.textContent = `${defaultLeft}s`;

        await Promise.all(state.filtered.map(async (account) => {
          const codeEl = document.getElementById(`code-${account.id}`);
          const ringEl = document.getElementById(`ring-${account.id}`);
          const timeEl = document.getElementById(`time-${account.id}`);
          if (!codeEl || !ringEl || !timeEl) return;

          const period = Number(account.period || 30);
          const left = period - (seconds % period);
          try {
            const token = await generateTotp(account.secret, {
              period,
              digits: Number(account.digits || 6),
              algorithm: account.algorithm || 'SHA-1',
              timestamp: now
            });
            codeEl.textContent = formatToken(token);
          } catch (_) {
            codeEl.textContent = 'ERROR';
          }
          const ratio = left / period;
          ringEl.style.strokeDashoffset = String(RING_CIRC - (ratio * RING_CIRC));
          ringEl.classList.toggle('hot', left <= 5);
          timeEl.textContent = String(left);
        }));
      }

      function openTokenModal(id = null) {
        state.editingId = id;
        const account = id ? state.accounts.find((item) => item.id === id) : null;
        els.tokenModalTitle.textContent = account ? 'Edit token' : 'Add token';
        els.saveTokenBtn.textContent = account ? 'Save changes' : 'Save token';
        els.uriInput.value = '';
        els.issuerInput.value = account?.issuer || '';
        els.labelInput.value = account?.label || '';
        els.secretInput.value = account?.secret || '';
        els.algorithmInput.value = account?.algorithm || 'SHA-1';
        els.digitsInput.value = String(account?.digits || 6);
        els.periodInput.value = String(account?.period || 30);
        els.tokenModal.classList.remove('hidden');
        setTimeout(() => (account ? els.issuerInput : els.uriInput).focus(), 30);
      }

      function closeTokenModal() {
        state.editingId = null;
        els.tokenModal.classList.add('hidden');
        els.tokenForm.reset();
        els.algorithmInput.value = 'SHA-1';
        els.digitsInput.value = '6';
        els.periodInput.value = '30';
      }

      async function saveTokenFromForm(event) {
        event.preventDefault();
        let account;
        try {
          const uri = els.uriInput.value.trim();
          account = uri ? parseOtpUri(uri) : accountFromManualForm();
          account = normalizeAccount(account);
          await generateTotp(account.secret, account);
        } catch (error) {
          toast(error.message || 'Invalid token details.');
          return;
        }

        const duplicate = state.accounts.find((item) => item.id !== state.editingId && sameAccount(item, account));
        if (duplicate && !confirm('This looks like a duplicate authenticator. Save it anyway?')) return;

        if (state.editingId) {
          const index = state.accounts.findIndex((item) => item.id === state.editingId);
          if (index >= 0) state.accounts[index] = { ...state.accounts[index], ...account, id: state.editingId, updatedAt: new Date().toISOString() };
        } else {
          state.accounts.push({ ...account, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }

        state.keyCache.clear();
        await saveVault();
        closeTokenModal();
        renderAccounts();
        toast(state.editingId ? 'Token updated.' : 'Token saved.');
      }

      function accountFromManualForm() {
        return {
          issuer: els.issuerInput.value.trim() || 'Unknown',
          label: els.labelInput.value.trim() || 'Unknown',
          secret: els.secretInput.value.trim(),
          algorithm: els.algorithmInput.value,
          digits: Number(els.digitsInput.value),
          period: Number(els.periodInput.value)
        };
      }

      function normalizeAccount(account) {
        const secret = normalizeSecret(account.secret || '');
        if (!secret) throw new Error('Secret key is required.');
        base32ToBytes(secret);
        const digits = Number(account.digits || 6);
        const period = Number(account.period || 30);
        const algorithm = normalizeAlgorithm(account.algorithm || 'SHA-1');
        if (![6, 8].includes(digits)) throw new Error('Digits must be 6 or 8.');
        if (!Number.isFinite(period) || period < 10 || period > 120) throw new Error('Period must be between 10 and 120 seconds.');
        return {
          issuer: String(account.issuer || 'Unknown').trim() || 'Unknown',
          label: String(account.label || 'Unknown').trim() || 'Unknown',
          secret,
          algorithm,
          digits,
          period
        };
      }

      function sanitizeAccounts(input) {
        if (!Array.isArray(input)) return [];
        const valid = [];
        for (const item of input) {
          try {
            const account = normalizeAccount(item);
            valid.push({
              id: item.id && typeof item.id === 'string' ? item.id : crypto.randomUUID(),
              ...account,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString()
            });
          } catch (_) {}
        }
        return valid;
      }

      function mergeAccounts(current, incoming) {
        const seen = new Set(current.map((account) => `${account.issuer}|${account.label}|${account.secret}`.toLowerCase()));
        const merged = [...current];
        for (const account of incoming) {
          const key = `${account.issuer}|${account.label}|${account.secret}`.toLowerCase();
          if (!seen.has(key)) {
            merged.push(account);
            seen.add(key);
          }
        }
        return merged;
      }

      function sameAccount(a, b) {
        return `${a.issuer}|${a.label}|${normalizeSecret(a.secret)}`.toLowerCase() === `${b.issuer}|${b.label}|${normalizeSecret(b.secret)}`.toLowerCase();
      }

      async function deleteAccount(id) {
        const account = state.accounts.find((item) => item.id === id);
        if (!account) return;
        if (!confirm(`Delete ${account.issuer} / ${account.label}?`)) return;
        state.accounts = state.accounts.filter((item) => item.id !== id);
        state.keyCache.clear();
        await saveVault();
        renderAccounts();
        toast('Token deleted.');
      }

      async function copyToken(id) {
        const account = state.accounts.find((item) => item.id === id);
        if (!account) return;
        try {
          const token = await generateTotp(account.secret, account);
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(token);
          } else {
            fallbackCopy(token);
          }
          scheduleClipboardClear();
          toast('Code copied. Clipboard clears in 30s when the browser allows it.');
        } catch (_) {
          toast('Could not copy this token.');
        }
      }

      async function copyOtpUri(id) {
        const account = state.accounts.find((item) => item.id === id);
        if (!account) return;
        const uri = accountToOtpUri(account);
        try {
          if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(uri);
          else fallbackCopy(uri);
          scheduleClipboardClear();
          toast('otpauth URI copied. Treat it like a secret.');
        } catch (_) {
          toast('Could not copy URI.');
        }
      }

      function scheduleClipboardClear() {
        clearTimeout(state.clipboardTimer);
        state.clipboardTimer = setTimeout(() => {
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText('').catch(() => undefined);
        }, Number(state.settings.clipboardClearMs || DEFAULT_SETTINGS.clipboardClearMs));
      }

      function accountToOtpUri(account) {
        const issuer = encodeURIComponent(account.issuer || 'Unknown');
        const label = encodeURIComponent(account.label || 'Unknown');
        const params = new URLSearchParams({
          secret: normalizeSecret(account.secret),
          issuer: account.issuer || 'Unknown',
          algorithm: normalizeAlgorithm(account.algorithm || 'SHA-1').replace('-', ''),
          digits: String(account.digits || 6),
          period: String(account.period || 30)
        });
        return `otpauth://totp/${issuer}:${label}?${params.toString()}`;
      }

      function fallbackCopy(text) {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand('copy');
        area.remove();
      }

      async function exportVault() {
        await saveVault();
        if (!state.vaultRecord) return;
        const blob = new Blob([JSON.stringify(state.vaultRecord, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.href = url;
        a.download = `skyebox-v3-encrypted-backup-${stamp}.skyebox.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('Encrypted backup exported.');
      }

      async function importVaultFile(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const incoming = sanitizeAccounts(parsed);
            state.accounts = mergeAccounts(state.accounts, incoming);
            await saveVault();
            renderAccounts();
            toast(`Imported ${incoming.length} legacy token${incoming.length === 1 ? '' : 's'}.`);
            return;
          }
          if (parsed && parsed.cipher && parsed.kdf) {
            if (state.unlocked && confirm('Merge this encrypted backup into the currently unlocked vault? Press Cancel to replace this device vault instead.')) {
              const backupPassword = prompt('Enter the password for the backup being imported.');
              if (!backupPassword) return;
              const decrypted = await decryptVaultRecord(parsed, backupPassword);
              const incoming = sanitizeAccounts(decrypted.accounts || []);
              state.accounts = mergeAccounts(state.accounts, incoming);
              await saveVault();
              renderAccounts();
              toast(`Merged ${incoming.length} encrypted backup token${incoming.length === 1 ? '' : 's'}.`);
              return;
            }
            if (!confirm('Replace this device vault with the encrypted backup? You will need that backup password to unlock it.')) return;
            localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
            state.vaultRecord = parsed;
            lockVault();
            toast('Encrypted backup imported. Unlock with its password.');
            return;
          }
          throw new Error('Unsupported import format.');
        } catch (error) {
          toast(error.message || 'Import failed.');
        }
      }

      function openPasswordModal() {
        els.passwordModal.classList.remove('hidden');
        els.changePasswordForm.reset();
        setTimeout(() => els.currentPasswordInput.focus(), 30);
      }

      function closePasswordModal() {
        els.changePasswordForm.reset();
        els.passwordModal.classList.add('hidden');
      }

      async function changeMasterPassword(event) {
        event.preventDefault();
        const current = els.currentPasswordInput.value;
        const next = els.newPasswordInput.value;
        const confirmNext = els.newConfirmInput.value;
        if (!next || next.length < 8) {
          toast('New password must be at least 8 characters.');
          return;
        }
        if (next !== confirmNext) {
          toast('New passwords do not match.');
          return;
        }
        try {
          els.rotateKeyBtn.disabled = true;
          await decryptVaultRecord(state.vaultRecord, current);
          const salt = randomBytes(16);
          state.masterKey = await deriveKey(next, salt, KDF_ITERATIONS);
          state.vaultRecord = createVaultRecord(salt, state.vaultRecord?.createdAt || new Date().toISOString());
          await saveVault();
          closePasswordModal();
          toast('Vault password changed and secrets re-encrypted.');
        } catch (error) {
          toast(error.message || 'Could not change password.');
        } finally {
          els.rotateKeyBtn.disabled = false;
        }
      }

      function wipeLocalVault() {
        const phrase = prompt('Type WIPE to delete this local encrypted vault from this browser. Export first if you need a backup.');
        if (phrase !== 'WIPE') return;
        stopScanner();
        closeTokenModal();
        closePasswordModal();
        localStorage.removeItem(STORE_KEY);
        sessionStorage.removeItem('skyebox.pendingLegacyImport');
        state.accounts = [];
        state.filtered = [];
        state.unlocked = false;
        state.masterKey = null;
        state.vaultRecord = null;
        state.keyCache.clear();
        renderAuthState();
        renderAccounts();
        toast('Local vault wiped from this browser.');
      }

      async function startScanner() {
        if (!state.detector) {
          toast('QR scanning is not supported in this browser.');
          return;
        }
        try {
          closeTokenModal();
          els.scannerOverlay.classList.remove('hidden');
          state.scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          els.scannerVideo.srcObject = state.scanStream;
          await els.scannerVideo.play();
          scanLoop();
        } catch (_) {
          stopScanner();
          toast('Camera access failed. Paste the URI or upload an image.');
          openTokenModal(state.editingId);
        }
      }

      async function scanLoop() {
        if (!state.scanStream || els.scannerOverlay.classList.contains('hidden')) return;
        try {
          const codes = await state.detector.detect(els.scannerVideo);
          const value = codes?.[0]?.rawValue;
          if (value) {
            stopScanner();
            openTokenModal(state.editingId);
            applyParsedUri(value);
            return;
          }
        } catch (_) {}
        state.scanLoop = requestAnimationFrame(scanLoop);
      }

      function stopScanner() {
        if (state.scanLoop) cancelAnimationFrame(state.scanLoop);
        state.scanLoop = null;
        if (state.scanStream) {
          state.scanStream.getTracks().forEach((track) => track.stop());
          state.scanStream = null;
        }
        els.scannerVideo.srcObject = null;
        els.scannerOverlay.classList.add('hidden');
      }

      async function handleQrImage(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!state.detector) {
          toast('Image QR detection is not supported in this browser.');
          return;
        }
        try {
          const bitmap = await createImageBitmap(file);
          const codes = await state.detector.detect(bitmap);
          bitmap.close?.();
          const value = codes?.[0]?.rawValue;
          if (!value) throw new Error('No QR code found.');
          applyParsedUri(value);
        } catch (error) {
          toast(error.message || 'Could not read QR image.');
        }
      }

      function applyParsedUri(uri) {
        try {
          const account = normalizeAccount(parseOtpUri(uri));
          els.uriInput.value = uri;
          els.issuerInput.value = account.issuer;
          els.labelInput.value = account.label;
          els.secretInput.value = account.secret;
          els.algorithmInput.value = account.algorithm;
          els.digitsInput.value = String(account.digits);
          els.periodInput.value = String(account.period);
          toast('QR token loaded. Save to vault.');
        } catch (error) {
          toast(error.message || 'Invalid authenticator QR.');
        }
      }

      function parseOtpUri(uri) {
        let url;
        try { url = new URL(uri); } catch (_) { throw new Error('Invalid otpauth URI.'); }
        if (url.protocol !== 'otpauth:') throw new Error('URI must start with otpauth://.');
        if (!['totp', 'hotp'].includes(url.hostname.toLowerCase())) throw new Error('Only TOTP tokens are supported.');
        if (url.hostname.toLowerCase() === 'hotp') throw new Error('HOTP counter tokens are not supported.');

        const rawLabel = decodeURIComponent(url.pathname.replace(/^\//, ''));
        const labelParts = rawLabel.includes(':') ? rawLabel.split(/:(.*)/s).filter(Boolean) : [rawLabel];
        const issuerParam = url.searchParams.get('issuer');
        const issuer = issuerParam || (labelParts.length > 1 ? labelParts[0] : 'Unknown');
        const label = labelParts.length > 1 ? labelParts[1] : (labelParts[0] || 'Unknown');
        return {
          issuer,
          label,
          secret: url.searchParams.get('secret') || '',
          algorithm: normalizeAlgorithm(url.searchParams.get('algorithm') || 'SHA-1'),
          digits: Number(url.searchParams.get('digits') || 6),
          period: Number(url.searchParams.get('period') || 30)
        };
      }

      async function generateTotp(secret, options = {}) {
        const period = Number(options.period || 30);
        const digits = Number(options.digits || 6);
        const algorithm = normalizeAlgorithm(options.algorithm || 'SHA-1');
        const timestamp = Number(options.timestamp || Date.now());
        const counter = Math.floor(timestamp / 1000 / period);
        const key = await getHmacKey(secret, algorithm);
        const counterBytes = new ArrayBuffer(8);
        const view = new DataView(counterBytes);
        view.setUint32(0, Math.floor(counter / 0x100000000));
        view.setUint32(4, counter >>> 0);
        const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));
        const offset = signature[signature.length - 1] & 0x0f;
        const binary = ((signature[offset] & 0x7f) << 24) |
          ((signature[offset + 1] & 0xff) << 16) |
          ((signature[offset + 2] & 0xff) << 8) |
          (signature[offset + 3] & 0xff);
        const modulo = 10 ** digits;
        return String(binary % modulo).padStart(digits, '0');
      }

      async function getHmacKey(secret, algorithm) {
        const normalized = normalizeSecret(secret);
        const cacheKey = `${algorithm}:${normalized}`;
        if (state.keyCache.has(cacheKey)) return state.keyCache.get(cacheKey);
        const keyData = base32ToBytes(normalized);
        const key = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: { name: algorithm } },
          false,
          ['sign']
        );
        state.keyCache.set(cacheKey, key);
        return key;
      }

      function normalizeAlgorithm(value) {
        const clean = String(value || 'SHA-1').toUpperCase().replace('_', '-');
        if (['SHA1', 'SHA-1'].includes(clean)) return 'SHA-1';
        if (['SHA256', 'SHA-256'].includes(clean)) return 'SHA-256';
        if (['SHA512', 'SHA-512'].includes(clean)) return 'SHA-512';
        throw new Error('Unsupported algorithm.');
      }

      function normalizeSecret(secret) {
        return String(secret || '').toUpperCase().replace(/[\s=-]/g, '');
      }

      function base32ToBytes(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const clean = normalizeSecret(base32);
        if (!clean) throw new Error('Secret key is required.');
        let bits = '';
        for (const char of clean) {
          const value = alphabet.indexOf(char);
          if (value === -1) throw new Error('Secret must be Base32 characters only.');
          bits += value.toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
          bytes.push(parseInt(bits.slice(i, i + 8), 2));
        }
        if (!bytes.length) throw new Error('Secret is too short.');
        return new Uint8Array(bytes);
      }

      function formatToken(token) {
        if (token.length === 8) return `${token.slice(0, 4)} ${token.slice(4)}`;
        return `${token.slice(0, 3)} ${token.slice(3)}`;
      }

      async function deriveKey(password, salt, iterations) {
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      }

      function randomBytes(length) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
      }

      function toBase64(bytes) {
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        return btoa(binary);
      }

      function fromBase64(value) {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }

      function safeJson(value) {
        if (!value) return null;
        try { return JSON.parse(value); } catch (_) { return null; }
      }

      function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#039;',
          '"': '&quot;'
        }[char]));
      }

      function getInitials(value) {
        const words = String(value || 'SB').trim().split(/\s+/).filter(Boolean);
        const first = words[0]?.[0] || 'S';
        const second = words[1]?.[0] || words[0]?.[1] || 'B';
        return `${first}${second}`.toUpperCase();
      }

      function toast(message) {
        els.toast.textContent = message;
        els.toast.classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2600);
      }

      function setupPwaInstall() {
        els.installBtn.classList.add('hidden');
        window.addEventListener('beforeinstallprompt', (event) => {
          event.preventDefault();
          state.deferredInstall = event;
          els.installBtn.classList.remove('hidden');
        });
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(() => undefined);
          });
        }
      }

      async function installPwa() {
        if (!state.deferredInstall) return;
        state.deferredInstall.prompt();
        await state.deferredInstall.userChoice.catch(() => undefined);
        state.deferredInstall = null;
        els.installBtn.classList.add('hidden');
      }
    })();
  