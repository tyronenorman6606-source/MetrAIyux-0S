export default `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <meta name="robots" content="noindex,nofollow"/>
  <title>Contractor Packet Inbox - Skyes Over London LC</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/Marketing-Made-Easy/WebGrowthOperator/css/svs.css"/>
</head>
<body class="contractor-inbox-page">
  <div class="cursor-aura" aria-hidden="true"></div>
  <div class="ambient" aria-hidden="true"><div class="orb"></div><div class="orb"></div><div class="orb"></div></div>
  <div class="gridfx" aria-hidden="true"></div>
  <img alt="" aria-hidden="true" class="sol-logo page-logo-watermark" src="/Marketing-Made-Easy/WebGrowthOperator/assets/skyes-over-london-logo.png"/>
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a class="brand" href="/Marketing-Made-Easy/WebGrowthOperator/index.html" aria-label="Skyes Over London LC home">
        <img class="sol-logo nav-sol-logo" src="/Marketing-Made-Easy/WebGrowthOperator/assets/skyes-over-london-logo.png" alt="Skyes Over London logo"/>
        <div><div class="brand-name">Skyes Over London LC</div><div class="brand-tag">AE Command Hub</div></div>
      </a>
      <nav class="nav" aria-label="Primary navigation">
        <a href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/index.html">AE Hub</a>
        <a href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html">Contractor Onboarding</a>
        <a class="active" href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/contractor-packet-inbox.html">Packet Inbox</a>
        <a href="/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html">RouteX Gate Status</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="page-hero">
      <div class="wrap">
        <div class="breadcrumbs"><a href="/Marketing-Made-Easy/WebGrowthOperator/index.html">Home</a><span>/</span><a href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/index.html">AE Command Hub</a><span>/</span><span>Contractor Packet Inbox</span></div>
        <div class="hero-card">
          <div class="hero-panel">
            <div class="locked-banner"><strong>Owner/admin only:</strong> packets are created by the contractor onboarding form, stored in the encrypted Cloudflare packet store, emailed through Resend as a redacted notification, and held until owner approval.</div>
            <div style="height:18px"></div>
            <div class="kicker"><span class="kicker-dot"></span>Contractor payout gate</div>
            <h1 class="display"><span class="gradient">Packet Inbox</span><br/>review W-9 status, agreement acceptance, payout profile, and approval state.</h1>
            <p class="lead">Use this screen to confirm the packet exists in the 0S, verify that sensitive files stayed encrypted, and approve the contractor profile before any payout lane is marked provider-ready.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-refresh type="button">Refresh Inbox</button>
              <a class="btn btn-ghost" href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html">Open Contractor Form</a>
              <a class="btn btn-ghost" href="/api/marketing-made-easy/ae-vendor-onboarding/health">Health JSON</a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="grid-3">
          <div class="plain-card"><strong data-stat="packets">...</strong><p>packets in encrypted KV index</p></div>
          <div class="plain-card"><strong data-stat="pending">...</strong><p>pending owner review</p></div>
          <div class="plain-card"><strong data-stat="approved">...</strong><p>approved payout profiles</p></div>
        </div>
        <div style="height:18px"></div>
        <div class="notice warning"><strong>No leak rule:</strong> this inbox shows summaries, encrypted storage keys, hashes, and approval state. It does not decrypt or email raw W-9, SSN/TIN, routing, account, or identity-file values.</div>
        <div style="height:18px"></div>
        <div class="command-card">
          <div class="section-head">
            <div><h2>Packets Waiting For Review</h2><p class="copy">Select a packet to inspect its safe metadata and approve only after the W-9, agreement, and payout destination are verified.</p></div>
          </div>
          <div class="status-box" data-status></div>
          <div class="table-wrap"><table class="payout-table-input"><thead><tr><th>Contractor</th><th>Email</th><th>Status</th><th>Payout</th><th>Files</th><th>Created</th><th>Action</th></tr></thead><tbody data-packet-list></tbody></table></div>
        </div>
        <div style="height:18px"></div>
        <div class="command-card" data-detail-card hidden>
          <h2>Packet Detail</h2>
          <div data-packet-detail class="notice"></div>
          <div class="hero-actions">
            <button class="btn btn-primary" data-approve type="button">Approve Contractor Packet</button>
            <button class="btn btn-ghost" data-refresh-detail type="button">Refresh Detail</button>
          </div>
        </div>
      </div>
    </section>
  </main>
  <footer class="footer">
    <div class="wrap footer-grid">
      <div><img alt="Skyes Over London logo" class="sol-logo footer-sol-logo" src="/Marketing-Made-Easy/WebGrowthOperator/assets/skyes-over-london-logo.png"/><div class="brand-name">Skyes Over London LC</div><div class="footer-copy" style="margin-top:8px;">Owner packet review and payout readiness control.</div></div>
      <div class="footer-links"><a href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html">Contractor Onboarding</a><a href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/payment-profile.html">Payment Profile</a><a href="/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/payout-register.html">Payout Register</a></div>
      <div class="footer-copy"><strong>Restricted:</strong><br/>Use the shared FS27/SkyGate admin session. Packet approval does not create an external transfer by itself.</div>
    </div>
  </footer>
  <script src="/Marketing-Made-Easy/WebGrowthOperator/js/site.js"></script>
  <script type="module">
    const API = '/api/marketing-made-easy/ae-vendor-onboarding';
    const $ = (selector) => document.querySelector(selector);
    let selectedPacketId = '';
    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }
    function tokenFromValue(value) {
      if (!value) return '';
      const raw = String(value).trim();
      try {
        const parsed = JSON.parse(raw);
        return String(parsed.token || parsed.session || parsed.bearer || parsed.access_token || '').replace(/^Bearer\\s+/i, '').trim();
      } catch {}
      return raw.replace(/^Bearer\\s+/i, '').trim();
    }
    function gateToken() {
      const bridgeToken = window.MetrAIyuxGateBridge?.current?.()?.token || '';
      if (bridgeToken) return tokenFromValue(bridgeToken);
      const keys = ['METRAIYUX_GATE_SESSION','SKYGATEFS27_GATE_SESSION','SKYE_GATE_SESSION'];
      for (const store of [window.sessionStorage, window.localStorage]) {
        try {
          for (const key of keys) {
            const token = tokenFromValue(store.getItem(key));
            if (token) return token;
          }
        } catch {}
      }
      return '';
    }
    function headers(extra = {}) {
      const token = gateToken();
      return token ? { ...extra, authorization: 'Bearer ' + token, 'x-skye-gate-session': token } : extra;
    }
    function setStatus(message, bad = false) {
      const box = $('[data-status]');
      if (!box) return;
      box.style.display = 'block';
      box.className = bad ? 'status-box error' : 'status-box';
      box.textContent = message;
    }
    async function api(path, options = {}) {
      const response = await fetch(API + path, { credentials: 'same-origin', ...options, headers: headers({ ...(options.headers || {}) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'HTTP ' + response.status);
      return payload;
    }
    function renderStats(packets) {
      const pending = packets.filter((item) => String(item.status || '').includes('pending')).length;
      const approved = packets.filter((item) => String(item.status || '').includes('approved') || String(item.payoutStatus || '').includes('verified')).length;
      $('[data-stat="packets"]').textContent = packets.length;
      $('[data-stat="pending"]').textContent = pending;
      $('[data-stat="approved"]').textContent = approved;
    }
    function renderPackets(packets) {
      $('[data-packet-list]').innerHTML = packets.map((packet) => '<tr><td>' + escapeHtml(packet.legalName || packet.submissionId || packet.id) + '</td><td>' + escapeHtml(packet.email || '') + '</td><td>' + escapeHtml(packet.status || '') + '</td><td>' + escapeHtml(packet.payoutStatus || '') + '<br><small>' + escapeHtml(packet.paymentMethod || '') + '</small></td><td>' + escapeHtml(packet.storageProvider || 'encrypted packet store') + '</td><td>' + escapeHtml(packet.createdAt || '') + '</td><td><button class="btn btn-small btn-ghost" data-open-packet="' + escapeHtml(packet.id) + '" type="button">Open</button></td></tr>').join('') || '<tr><td colspan="7">No contractor packets returned for this owner session.</td></tr>';
    }
    function fileRows(files = []) {
      return files.map((file) => '<li>' + escapeHtml(file.field) + ' - ' + escapeHtml(file.filename) + ' - ' + escapeHtml(file.mimeType) + ' - ' + escapeHtml(file.fileSize) + ' bytes - sha256 ' + escapeHtml(String(file.sha256 || '').slice(0, 18)) + '... - encrypted yes</li>').join('');
    }
    function renderDetail(packet) {
      selectedPacketId = packet.id;
      $('[data-detail-card]').hidden = false;
      $('[data-packet-detail]').innerHTML = '<p><strong>' + escapeHtml(packet.contractor?.legalName || packet.submissionId) + '</strong> - ' + escapeHtml(packet.contractor?.email || '') + '</p><p>Status: <strong>' + escapeHtml(packet.status) + '</strong></p><p>Acceptance: IC agreement ' + (packet.acceptance?.acceptedIndependentContractorAgreement ? 'yes' : 'no') + ', commission plan ' + (packet.acceptance?.acceptedCommissionPlan ? 'yes' : 'no') + ', confidentiality ' + (packet.acceptance?.acceptedConfidentiality ? 'yes' : 'no') + ', no-guarantee rule ' + (packet.acceptance?.acceptedNoGuarantees ? 'yes' : 'no') + '.</p><p>Tax: W-9 uploaded ' + (packet.taxProfile?.w9Uploaded ? 'yes' : 'no') + ', match review ' + escapeHtml(packet.taxProfile?.w9Matches || '') + '.</p><p>Payout: ' + escapeHtml(packet.paymentProfile?.method || '') + ', status ' + escapeHtml(packet.paymentProfile?.status || '') + ', destination verified ' + (packet.paymentProfile?.payoutDestinationVerified ? 'yes' : 'no') + '.</p><p>Resend: ' + (packet.adminNotification?.ok ? 'sent' : packet.adminNotification?.skipped ? 'skipped' : 'not sent') + (packet.adminNotification?.id ? ', id ' + escapeHtml(packet.adminNotification.id) : '') + '.</p><p>Storage: ' + escapeHtml(packet.storage?.provider || '') + ', encrypted files ' + escapeHtml(packet.storage?.fileCount || 0) + ', payment profile key ' + escapeHtml(packet.paymentProfile?.encryptedStorageKey || '') + '.</p><ul>' + fileRows(packet.storage?.files || []) + '</ul><p>Current payout ledger: ' + escapeHtml(packet.payoutLedger?.status || '') + '. External transfer created: ' + (packet.payoutLedger?.externalTransferCreated ? 'yes' : 'no') + '.</p>';
    }
    async function refreshInbox() {
      setStatus('Loading contractor packet inbox...');
      const data = await api('/packets?limit=200');
      const packets = data.packets || [];
      renderStats(packets);
      renderPackets(packets);
      setStatus('Loaded ' + packets.length + ' contractor packet record(s).');
    }
    async function openPacket(id) {
      setStatus('Opening packet ' + id + '...');
      const data = await api('/packets/' + encodeURIComponent(id));
      renderDetail(data.packet);
      setStatus('Packet ' + id + ' loaded from encrypted packet store.');
    }
    async function approveSelected() {
      if (!selectedPacketId) return setStatus('Open a packet before approving.', true);
      setStatus('Approving packet ' + selectedPacketId + '...');
      const data = await api('/packets/' + encodeURIComponent(selectedPacketId) + '/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Owner/admin approved from the 0S contractor packet inbox after W-9, agreement, and payout destination review.', payoutDestinationVerified: true })
      });
      setStatus('Approved ' + (data.packet?.submissionId || selectedPacketId) + '. External transfer is still not created by approval.');
      await refreshInbox();
      await openPacket(selectedPacketId);
    }
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.matches('[data-refresh]')) refreshInbox().catch((error) => setStatus(error.message, true));
      if (button.matches('[data-open-packet]')) openPacket(button.dataset.openPacket).catch((error) => setStatus(error.message, true));
      if (button.matches('[data-refresh-detail]') && selectedPacketId) openPacket(selectedPacketId).catch((error) => setStatus(error.message, true));
      if (button.matches('[data-approve]')) approveSelected().catch((error) => setStatus(error.message, true));
    });
    refreshInbox().catch((error) => setStatus(error.message, true));
  </script>
</body>
</html>`;
