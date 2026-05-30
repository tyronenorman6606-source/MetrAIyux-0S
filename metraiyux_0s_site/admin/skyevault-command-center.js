const SkyeVaultCommandCenter = (() => {
  const state = {
    origin: '',
    ledger: [],
    events: [],
    sessions: [],
    autosyncProof: null,
    autosyncNotify: null,
    actor: null,
    filters: {
      query: '',
      type: ''
    }
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    origin: $('vaultOrigin'),
    token: $('fs27Token'),
    legacy: $('legacyAdminToken'),
    load: $('loadVault'),
    status: $('vaultStatus'),
    workspace: $('vaultWorkspace'),
    actor: $('vaultActor'),
    actorDetail: $('vaultActorDetail'),
    rows: $('vaultRows'),
    search: $('vaultSearchInput'),
    type: $('vaultTypeFilter'),
    clear: $('clearVaultFilters'),
    receipts: $('metricReceipts'),
    bytes: $('metricBytes'),
    secrets: $('metricSecrets'),
    latest: $('metricLatest'),
    exportLedger: $('exportLedger'),
    exportAll: $('exportAll'),
    eventsPanel: $('vaultEventsPanel'),
    events: $('vaultEvents'),
    secretHandoff: $('secretPackHandoff'),
    secretHandoffTitle: $('secretPackHandoffTitle'),
    secretHandoffDetail: $('secretPackHandoffDetail'),
    secretUnlockLink: $('secretPackUnlockLink'),
    secretHandoffDismiss: $('secretPackHandoffDismiss'),
    autosyncProofCards: $('autosyncProofCards'),
    autosyncNotifyEnabled: $('autosyncNotifyEnabled'),
    autosyncNotifyTo: $('autosyncNotifyTo'),
    autosyncNotifyThrottle: $('autosyncNotifyThrottle'),
    saveAutosyncNotify: $('saveAutosyncNotify'),
    autosyncNotifyStatus: $('autosyncNotifyStatus')
  };

  function cleanOrigin(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Number(bytes || 0);
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  function setStatus(message, ok = true) {
    els.status.textContent = message;
    els.status.style.borderColor = ok ? 'rgba(143,255,210,.45)' : 'rgba(255,138,138,.55)';
  }

  function setAutosyncNotifyStatus(message, ok = true) {
    if (!els.autosyncNotifyStatus) return;
    els.autosyncNotifyStatus.textContent = message;
    els.autosyncNotifyStatus.style.borderColor = ok ? 'rgba(143,255,210,.45)' : 'rgba(255,138,138,.55)';
  }

  function activeBearer() {
    const direct = window.SkygateAuthBridge?.token?.() || sessionStorage.getItem('adminBrainToken') || '';
    if (direct) return direct;
    try {
      const raw = sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || localStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || '';
      if (raw) { const p = JSON.parse(raw); if (p.token) return p.token; }
    } catch {}
    return localStorage.getItem('quantumskyes_mcp_owner_token') || '';
  }

  function authHeaders(extra = {}) {
    const legacy = String(els.legacy.value || localStorage.getItem('skyevault.legacyAdminToken') || '').trim();
    const bearer = activeBearer();
    const headers = { ...extra };
    if (bearer) {
      headers.authorization = `Bearer ${bearer}`;
      headers['x-free99-gate-session'] = bearer;
      headers['x-skye-gate-session'] = bearer;
      headers['x-skye-platform'] = 'metraiyux-0s-admin';
      headers['x-skye-usage-lane'] = 'skyevault-command-center';
    } else if (legacy) {
      headers['x-admin-token'] = legacy;
    }
    return headers;
  }

  async function vaultApi(path, options = {}) {
    const response = await fetch(`${state.origin}${path}`, {
      ...options,
      headers: authHeaders({
        'content-type': 'application/json',
        ...(options.headers || {})
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Vault request failed with ${response.status}.`);
    }
    return data;
  }

  function isSecretPack(entry = {}) {
    const name = String(entry.fileName || entry.driveFile?.name || '').toLowerCase();
    const type = String(entry.assetType || '').toLowerCase();
    return name.endsWith('.skyesecrets') || type.includes('secret pack') || type.includes('skyesecure');
  }

  function isArchive(entry = {}) {
    const name = String(entry.fileName || entry.driveFile?.name || '').toLowerCase();
    const type = String(entry.assetType || '').toLowerCase();
    return name.endsWith('.zip') || name.endsWith('.tar') || type.includes('archive');
  }

  function searchText(entry = {}) {
    return [
      entry.id,
      entry.sessionId,
      entry.fileName,
      entry.driveFile?.name,
      entry.workspaceId,
      entry.developerId,
      entry.developerName,
      entry.customerId,
      entry.clientName,
      entry.clientEmail,
      entry.projectName,
      entry.assetType,
      entry.clientReference,
      entry.scan?.status,
      entry.fileFingerprint?.value
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function filteredLedger() {
    const query = state.filters.query.trim().toLowerCase();
    const type = state.filters.type;
    return state.ledger.filter((entry) => {
      if (query && !searchText(entry).includes(query)) return false;
      if (type === 'secret' && !isSecretPack(entry)) return false;
      if (type === 'archive' && !isArchive(entry)) return false;
      return true;
    });
  }

  function skyeSecureHref(entry = {}) {
    const params = new URLSearchParams({
      receipt: entry.id || '',
      session: entry.sessionId || '',
      file: entry.fileName || entry.driveFile?.name || 'secret-pack.skyesecrets'
    });
    const sha = entry.fileFingerprint?.value || entry.sha256 || '';
    if (sha) params.set('sha256', sha);
    return `../skye-secure-secret-packs/app.html?${params.toString()}`;
  }

  function renderSecretPackHandoff(entry = {}, downloadData = {}) {
    if (!els.secretHandoff) return;
    const fileName = downloadData.item?.fileName || entry.fileName || entry.driveFile?.name || 'secure-pack.skyesecrets';
    const receiptId = entry.id || downloadData.item?.receiptId || 'receipt';
    const expires = downloadData.expiresAt ? ` Signed download expires ${downloadData.expiresAt}.` : '';
    els.secretHandoffTitle.textContent = `Downloaded secure pack: ${fileName}`;
    els.secretHandoffDetail.textContent = `Next: open the decrypt console, choose ${fileName}, inspect the pack, then use the recipient passphrase and pepper supplied outside this dashboard.${expires}`;
    els.secretUnlockLink.href = skyeSecureHref(entry);
    els.secretUnlockLink.dataset.receipt = receiptId;
    els.secretHandoff.classList.remove('hidden');
    els.secretHandoff.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function renderMetrics() {
    const visible = filteredLedger();
    const total = visible.reduce((sum, entry) => sum + Number(entry.fileSize || entry.driveFile?.size || 0), 0);
    const secretCount = visible.filter(isSecretPack).length;
    const latest = visible.slice().sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))[0];
    els.receipts.textContent = `${visible.length}`;
    els.bytes.textContent = formatBytes(total);
    els.secrets.textContent = `${secretCount}`;
    els.latest.textContent = latest?.completedAt ? new Date(latest.completedAt).toLocaleDateString() : 'None';
  }

  function compactHash(value) {
    const text = String(value || '');
    return text.length > 18 ? `${text.slice(0, 18)}...` : text;
  }

  function renderAutosyncProof(proof = {}) {
    if (!els.autosyncProofCards) return;
    const latest = proof.latestSuccess || {};
    const current = proof.currentStatus || {};
    const upload = proof.latestUpload || {};
    const parity = proof.parity || {};
    const daemon = proof.daemon || {};
    const notifications = proof.notifications || {};
    const cards = [
      ['Latest vault success', latest.completedAt || 'No success yet', `${latest.mode || 'mode unknown'} · digest ${compactHash(latest.digest) || 'not recorded'}`],
      ['Current repo digest', compactHash(current.digest) || 'Unknown', parity.currentDigestMatchesLatestSuccess ? 'Covered by latest encrypted artifact.' : 'Pending the next autosync tick.'],
      ['Encrypted artifact', upload.receiptId || 'Not parsed', `${formatBytes(upload.artifactBytes || 0)} · sha ${compactHash(upload.artifactSha256) || 'not recorded'}`],
      ['Daemon', daemon.watchRunning ? 'Running' : 'Not running', daemon.lastDaemonLine || 'No daemon heartbeat parsed.'],
      ['Local-only critical', `${current.localOnlyCriticalCount ?? 0}`, `${current.secretLikeTotal ?? 0} secret-like markers counted; values are not published.`],
      ['Email notices', notifications.enabled ? 'Enabled' : 'Disabled', notifications.lastResult?.reason || notifications.lastResult?.id || `Throttle ${notifications.throttleMinutes || 10} minutes.`]
    ];
    els.autosyncProofCards.innerHTML = cards.map(([title, value, detail]) => `
      <article class="autosync-proof-card">
        <span>${escapeHtml(title)}</span>
        <b>${escapeHtml(value)}</b>
        <span>${escapeHtml(detail)}</span>
      </article>
    `).join('');
  }

  async function loadAutosyncProof() {
    if (!els.autosyncProofCards) return;
    try {
      const response = await fetch('../proof/skyevault-autosync-proof.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Proof JSON returned ${response.status}.`);
      state.autosyncProof = await response.json();
      renderAutosyncProof(state.autosyncProof);
    } catch (error) {
      els.autosyncProofCards.innerHTML = `
        <article class="autosync-proof-card">
          <span>Proof unavailable</span>
          <b>Run build proof</b>
          <span>${escapeHtml(error.message)} Use npm run vault:autosync:proof to refresh the published files.</span>
        </article>
      `;
    }
  }

  function applyAutosyncNotifySettings(settings = {}) {
    state.autosyncNotify = settings;
    if (els.autosyncNotifyEnabled) els.autosyncNotifyEnabled.checked = Boolean(settings.enabled);
    if (els.autosyncNotifyTo) els.autosyncNotifyTo.value = settings.notifyTo || '';
    if (els.autosyncNotifyThrottle) els.autosyncNotifyThrottle.value = settings.throttleMinutes || 10;
  }

  function autosyncNotifyPayload() {
    return {
      enabled: Boolean(els.autosyncNotifyEnabled?.checked),
      notifyTo: String(els.autosyncNotifyTo?.value || '').trim(),
      throttleMinutes: Math.max(1, Math.min(1440, Number(els.autosyncNotifyThrottle?.value || 10) || 10))
    };
  }

  function loadLocalAutosyncNotifyDraft() {
    try {
      return JSON.parse(localStorage.getItem('skyevault.autosyncNotifyDraft') || '{}');
    } catch {
      return {};
    }
  }

  async function loadAutosyncNotifySettings() {
    if (!els.autosyncNotifyStatus) return;
    try {
      const response = await fetch('/api/skyevault/autosync-notify-settings', {
        cache: 'no-store',
        headers: authHeaders()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || `Settings returned ${response.status}.`);
      applyAutosyncNotifySettings(data.settings || {});
      setAutosyncNotifyStatus(`Loaded autosync notification setting from ${data.storage || '0S Worker'}.
Local daemon commands:
${data.localCli?.enable || 'npm run vault:autosync:notify:on -- --to=you@example.com'}
${data.localCli?.disable || 'npm run vault:autosync:notify:off'}
${data.localCli?.status || 'npm run vault:autosync:notify:status'}`);
    } catch (error) {
      const draft = loadLocalAutosyncNotifyDraft();
      applyAutosyncNotifySettings({ enabled: false, throttleMinutes: 10, ...draft });
      setAutosyncNotifyStatus(`0S Worker setting is not reachable from this browser session: ${error.message}
This panel saved a local browser draft only until the deployed Worker endpoint is available.
Active local daemon commands:
npm run vault:autosync:notify:on -- --to=you@example.com
npm run vault:autosync:notify:off
npm run vault:autosync:notify:status`, false);
    }
  }

  async function saveAutosyncNotifySettings() {
    if (!els.saveAutosyncNotify) return;
    const payload = autosyncNotifyPayload();
    els.saveAutosyncNotify.disabled = true;
    try {
      const response = await fetch('/api/skyevault/autosync-notify-settings', {
        method: 'POST',
        headers: authHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || `Save returned ${response.status}.`);
      applyAutosyncNotifySettings(data.settings || payload);
      localStorage.setItem('skyevault.autosyncNotifyDraft', JSON.stringify(payload));
      setAutosyncNotifyStatus(`Saved autosync email notifications: ${payload.enabled ? 'enabled' : 'disabled'}.
The active local daemon also honors .skyevault-out/autosync-notify-settings.json; mirror this locally with npm run vault:autosync:notify:${payload.enabled ? 'on -- --to=' + (payload.notifyTo || 'you@example.com') : 'off'}.`);
    } catch (error) {
      localStorage.setItem('skyevault.autosyncNotifyDraft', JSON.stringify(payload));
      setAutosyncNotifyStatus(`Could not save through the Worker endpoint: ${error.message}
Saved a local browser draft. To affect the running local daemon now, run:
npm run vault:autosync:notify:${payload.enabled ? 'on -- --to=' + (payload.notifyTo || 'you@example.com') : 'off'}`, false);
    } finally {
      els.saveAutosyncNotify.disabled = false;
    }
  }

  function renderActor() {
    const actor = state.actor || {};
    els.actor.textContent = actor.actor || actor.email || actor.subject || actor.type || 'Vault actor';
    els.actorDetail.textContent = [
      actor.type,
      actor.role,
      actor.customerId ? `customer ${actor.customerId}` : '',
      actor.workspaceId ? `workspace ${actor.workspaceId}` : '',
      actor.gateCardId ? `gate ${actor.gateCardId}` : ''
    ].filter(Boolean).join(' · ');
  }

  function rowHtml(entry) {
    const fileName = entry.fileName || entry.driveFile?.name || 'Vault object';
    const size = formatBytes(entry.fileSize || entry.driveFile?.size || 0);
    const sha = entry.fileFingerprint?.value || entry.sha256 || '';
    const scan = entry.scan?.status || entry.scan?.verdict || 'not recorded';
    return `
      <tr data-receipt="${escapeHtml(entry.id)}">
        <td>
          <strong>${escapeHtml(entry.id || 'receipt')}</strong>
          <p>${escapeHtml(entry.completedAt || '')}</p>
          <p>${escapeHtml(entry.sessionId || '')}</p>
        </td>
        <td>
          <strong>${escapeHtml(fileName)}</strong>
          <p>${escapeHtml(entry.assetType || 'Project asset')} · ${escapeHtml(size)}</p>
          <p>${escapeHtml(entry.mimeType || entry.driveFile?.mimeType || '')}</p>
        </td>
        <td>
          <strong>${escapeHtml(entry.workspaceId || entry.customerId || 'No workspace stamp')}</strong>
          <p>${escapeHtml(entry.developerName || entry.developerId || 'No developer stamp')}</p>
          <p>${escapeHtml(entry.repoId || entry.gateCardId || '')}</p>
        </td>
        <td>
          <strong>${escapeHtml(entry.clientName || 'No client name')}</strong>
          <p>${escapeHtml(entry.clientEmail || '')}</p>
          <p>${escapeHtml(entry.projectName || entry.clientReference || '')}</p>
        </td>
        <td>
          <strong>scan ${escapeHtml(scan)}</strong>
          <p>${sha ? `sha ${escapeHtml(String(sha).slice(0, 16))}` : 'sha not attached'}</p>
          <p>${entry.receiptSignature ? `sig ${escapeHtml(String(entry.receiptSignature).slice(0, 16))}` : ''}</p>
        </td>
        <td><div class="vault-row-actions"></div></td>
      </tr>
    `;
  }

  function renderRows() {
    const visible = filteredLedger();
    renderMetrics();
    els.rows.innerHTML = visible.length
      ? visible.map(rowHtml).join('')
      : '<tr><td colspan="6">No receipts match the current vault view.</td></tr>';

    for (const row of els.rows.querySelectorAll('tr[data-receipt]')) {
      const entry = visible.find((item) => item.id === row.dataset.receipt);
      const actions = row.querySelector('.vault-row-actions');
      const securePack = isSecretPack(entry);
      const download = document.createElement('button');
      download.className = 'primary';
      download.type = 'button';
      download.textContent = securePack ? 'Download Pack' : 'Download';
      download.addEventListener('click', () => downloadReceipt(entry, download));
      actions.append(download);

      if (securePack) {
        const unlock = document.createElement('a');
        unlock.href = skyeSecureHref(entry);
        unlock.textContent = 'Open Decrypt App';
        unlock.target = '_blank';
        unlock.rel = 'noopener';
        actions.append(unlock);
        const note = document.createElement('span');
        note.className = 'vault-row-note';
        note.textContent = 'Download first, then choose that file in the decrypt app. Passphrases are never stored here.';
        actions.append(note);
      }
    }
  }

  function renderEvents() {
    els.eventsPanel.classList.toggle('hidden', !state.events.length);
    els.events.innerHTML = '';
    for (const event of state.events.slice(0, 18)) {
      const detail = event.detail || {};
      const article = document.createElement('article');
      article.innerHTML = `
        <b>${escapeHtml(event.type || 'event')}</b>
        <span>${escapeHtml(event.createdAt || '')}</span>
        <p>${escapeHtml([detail.actor, detail.authType, detail.receiptId, detail.fileName].filter(Boolean).join(' · ') || 'Vault custody event')}</p>
      `;
      els.events.append(article);
    }
  }

  async function downloadReceipt(entry, button) {
    if (!entry?.id) return;
    const securePack = isSecretPack(entry);
    button.disabled = true;
    button.textContent = securePack ? 'Signing pack...' : 'Signing...';
    try {
      const data = await vaultApi('/api/admin-vault-download', {
        method: 'POST',
        body: JSON.stringify({ receiptId: entry.id, expiresInSeconds: 900 })
      });
      window.open(data.downloadUrl, '_blank', 'noopener');
      const nextStep = securePack
        ? '\nNext: open the decrypt console, choose the downloaded .skyesecrets file, inspect it, then enter the recipient passphrase and pepper if the pack requires one. That unlock material is encryption, not another login.'
        : '';
      setStatus(`Gate session accepted. Signed download ticket created for ${data.item?.fileName || entry.fileName || entry.id}.\nActor: ${data.actor?.actor || state.actor?.actor || 'admin'}\nExpires: ${data.expiresAt || 'unknown'}\nThis URL is a temporary file ticket, not a separate login.${nextStep}`);
      if (securePack) renderSecretPackHandoff(entry, data);
      await window.SkygateAuthBridge?.mirrorEvent?.('skyevault.receipt.download_link_created', {
        receipt_id: entry.id,
        workspace_id: entry.workspaceId || '',
        file_name: entry.fileName || '',
        auth_type: data.actor?.type || state.actor?.type || '',
        secure_pack: securePack
      }).catch(() => null);
    } catch (error) {
      setStatus(error.message, false);
    } finally {
      button.disabled = false;
      button.textContent = securePack ? 'Download Pack' : 'Download';
    }
  }

  async function saveBearerIfPresent() {
    if (!String(els.token.value || '').trim()) return null;
    return window.SkygateAuthBridge?.saveTokenFromInput?.('fs27Token', 'skygateAuthStatus');
  }

  async function loadVault() {
    state.origin = cleanOrigin(els.origin.value || 'https://skyevault-drop.graylondonskyes.workers.dev');
    localStorage.setItem('skyevault.commandCenter.origin', state.origin);
    if (els.legacy.value.trim()) localStorage.setItem('skyevault.legacyAdminToken', els.legacy.value.trim());

    setStatus('Checking shared gate session and loading SkyeVault receipts...');
    const gate = await saveBearerIfPresent();
    if (gate && gate.ok === false) throw new Error(gate.error || 'Shared gate bearer was rejected.');

    const data = await vaultApi('/api/admin-config?ledger=true&sessions=true&events=true');
    state.actor = data.actor || null;
    state.ledger = data.ledger?.entries || [];
    state.events = data.events || [];
    state.sessions = data.sessions || [];
    renderActor();
    renderRows();
    renderEvents();
    els.workspace.classList.remove('hidden');
    setStatus(`Loaded ${state.ledger.length} receipt${state.ledger.length === 1 ? '' : 's'} from ${data.source || state.origin}.\nActor: ${state.actor?.actor || 'admin'} (${state.actor?.type || 'unknown auth'})`);
    await window.SkygateAuthBridge?.mirrorEvent?.('skyevault.dashboard.viewed', {
      receipt_count: state.ledger.length,
      event_count: state.events.length,
      vault_origin: state.origin,
      actor_type: state.actor?.type || ''
    }).catch(() => null);
  }

  async function downloadExport(type) {
    const response = await fetch(`${state.origin}/api/admin-export?type=${encodeURIComponent(type)}&format=json`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Export failed with ${response.status}.`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `skyevault-${type}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function bind() {
    els.origin.value = localStorage.getItem('skyevault.commandCenter.origin') || els.origin.value;
    els.load.addEventListener('click', () => loadVault().catch((error) => setStatus(error.message, false)));
    els.search.addEventListener('input', () => {
      state.filters.query = els.search.value;
      renderRows();
    });
    els.type.addEventListener('change', () => {
      state.filters.type = els.type.value;
      renderRows();
    });
    els.clear.addEventListener('click', () => {
      state.filters = { query: '', type: '' };
      els.search.value = '';
      els.type.value = '';
      renderRows();
    });
    els.exportLedger.addEventListener('click', () => downloadExport('ledger').catch((error) => setStatus(error.message, false)));
    els.exportAll.addEventListener('click', () => downloadExport('all').catch((error) => setStatus(error.message, false)));
    els.secretHandoffDismiss?.addEventListener('click', () => els.secretHandoff?.classList.add('hidden'));
    els.saveAutosyncNotify?.addEventListener('click', () => saveAutosyncNotifySettings());
    loadAutosyncProof();
    loadAutosyncNotifySettings();
    if (activeBearer()) loadVault().catch((error) => setStatus(error.message, false));
  }

  return { bind, loadVault };
})();

SkyeVaultCommandCenter.bind();
