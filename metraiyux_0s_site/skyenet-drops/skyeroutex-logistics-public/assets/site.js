(() => {
  const ZERO_OS_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const TOUR_APP_ORIGIN = 'https://skyeroutex-workforce-command.graylondonskyes.workers.dev';
  const TOKEN_KEY = 'skyeroutex_tour_token';
  const EXPIRES_KEY = 'skyeroutex_tour_expires_at';

  function readHashToken() {
    const hash = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
    return hash.get('token') || hash.get('tour_token') || '';
  }

  function storedToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  function saveToken(token, expiresAt) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(EXPIRES_KEY, expiresAt || '');
      if (/^rtx_tour_/i.test(token || '')) {
        const sharedSession = {
          token,
          source: 'skyeroutex-tour-token',
          platform_id: 'skyeroutex',
          usage_lane: 'skyeroutex-tour-readonly',
          billing_mode: 'free99-demo',
          readonly: true,
          issued_at: new Date().toISOString(),
          expires_at: expiresAt || ''
        };
        sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION_SKYEROUTEX', JSON.stringify(sharedSession));
        sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(sharedSession));
      }
    } catch {}
  }

  function tokenForPage() {
    const token = readHashToken() || storedToken();
    if (token) saveToken(token, sessionStorage.getItem(EXPIRES_KEY) || '');
    return token;
  }

  function withTourToken(path, token, origin = ZERO_OS_ORIGIN) {
    const url = new URL(path, origin);
    if (token) url.searchParams.set('tour_token', token);
    return url.toString();
  }

  function setStatus(node, message, type = '') {
    if (!node) return;
    node.textContent = message;
    node.classList.remove('success', 'error');
    if (type) node.classList.add(type);
  }

  async function postTourLead(form, status) {
    const payload = Object.fromEntries(new FormData(form).entries());
    setStatus(status, 'Creating a 30-minute read-only tour token...');
    const response = await fetch(`${ZERO_OS_ORIGIN}/api/skyeroutex/tour-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.token) {
      throw new Error(data.error || 'Tour token could not be created.');
    }
    saveToken(data.token, data.expires_at);
    setStatus(status, 'Tour token created. Opening the read-only platform preview...', 'success');
    setTimeout(() => {
      location.href = `/tour#token=${encodeURIComponent(data.token)}`;
    }, 450);
  }

  async function validateTourPage() {
    const token = tokenForPage();
    const card = document.getElementById('tour-status-card');
    const dashboard = document.getElementById('private-dashboard-link');
    const command = document.getElementById('private-command-link');
    if (dashboard) dashboard.href = withTourToken('/', token, TOUR_APP_ORIGIN);
    if (command) command.href = withTourToken('/', token, TOUR_APP_ORIGIN);
    if (!card) return;
    if (!token) {
      card.classList.add('expired');
      card.innerHTML = '<strong>No active tour token.</strong><span>Return to the company site and request a new 30-minute read-only token.</span>';
      return;
    }
    const response = await fetch(`${ZERO_OS_ORIGIN}/api/skyeroutex/tour-token/status`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.active) {
      card.classList.add('expired');
      card.innerHTML = '<strong>Tour token inactive.</strong><span>Return to the company site and request a fresh 30-minute token.</span>';
      return;
    }
    saveToken(token, data.expires_at);
    card.classList.add('ok');
    card.innerHTML = `<strong>Read-only token active.</strong><span>${Math.max(0, Math.floor((data.seconds_remaining || 0) / 60))} minutes remaining. Scope: ${data.scope || 'skyeroutex.tour.read'}.</span>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tour-form');
    const status = document.getElementById('tour-status');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        postTourLead(form, status).catch((error) => setStatus(status, error.message, 'error'));
      });
    }
    validateTourPage().catch(() => {});
  });
})();
