(function () {
  const STORAGE_KEY = 'fadeMastersPhx.bookingReceipts.v1';
  const SIGNINPRO_WORKSPACE_SLUG = 'fade-masters-phx';
  const SIGNINPRO_STATE_FALLBACK_KEY = `signinpro_workspace_state_v4:${SIGNINPRO_WORKSPACE_SLUG}`;
  const API_ENDPOINT = '/api/client-app-factory/factory/intake';
  const services = [
    { id: 'skin-fade', name: 'Skin Fade', desc: 'Razor fade, blend, neckline, and style finish.', price: 45, minutes: 45 },
    { id: 'classic-cut', name: 'Classic Cut', desc: 'Clipper/scissor cut with neckline cleanup.', price: 35, minutes: 35 },
    { id: 'beard-trim', name: 'Beard Trim', desc: 'Shape, line, trim, and hot towel finish.', price: 25, minutes: 25 },
    { id: 'lineup', name: 'Lineup', desc: 'Crisp front, temple, neck, and edge cleanup.', price: 18, minutes: 15 },
    { id: 'kids-cut', name: 'Kids Cut', desc: 'Fast, clean cut for younger clients.', price: 28, minutes: 30 },
    { id: 'vip-after-hours', name: 'VIP After-Hours', desc: 'Late slot request for urgent cuts or events.', price: 75, minutes: 60 }
  ];
  const barbers = ['First available', 'Fade specialist', 'Beard specialist', 'Quiet chair'];
  const times = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
    '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
  ];

  const selected = new Set(['skin-fade']);
  const serviceHost = document.querySelector('[data-fm-services]');
  const barberHost = document.querySelector('[data-fm-barbers]');
  const barberInput = document.querySelector('[data-fm-barber-input]');
  const timeSelect = document.querySelector('[data-fm-time-select]');
  const bookingForm = document.querySelector('[data-fm-booking-form]');
  const queueForm = document.querySelector('[data-fm-queue-form]');
  const receipt = document.querySelector('[data-fm-receipt]');
  const ledgerHost = document.querySelector('[data-fm-ledger]');
  const dateInput = bookingForm?.querySelector('input[name="date"]');
  const signInProProofButton = document.querySelector('[data-fm-signinpro-proof]');
  const runtimeStatus = document.querySelector('[data-fm-runtime-status]');
  const coreStatus = document.querySelector('[data-fm-core-status]');
  const workspaceKeyStatus = document.querySelector('[data-fm-workspace-key]');
  const mirrorCountStatus = document.querySelector('[data-fm-mirror-count]');
  const remoteStatus = document.querySelector('[data-fm-remote-status]');

  function money(value) {
    return `$${Number(value || 0).toFixed(0)}`;
  }

  function todayDate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }

  function receiptId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`.toUpperCase();
  }

  function readLedger() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeLedger(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 25)));
    renderLedger();
  }

  function signInProStateKey() {
    const Workspace = window.SignInProWorkspace;
    if (Workspace?.stateKey) return Workspace.stateKey({ slug: SIGNINPRO_WORKSPACE_SLUG });
    return SIGNINPRO_STATE_FALLBACK_KEY;
  }

  function readSignInProState() {
    const Core = window.SignInProCore;
    const fallback = {
      schemaVersion: 3,
      appVersion: Core?.APP_VERSION || 'fade-masters-bridge',
      workspace: {
        id: 'client-app:fade-masters-phx',
        slug: SIGNINPRO_WORKSPACE_SLUG,
        name: 'Fade Masters PHX SignInPro Workspace',
        role: 'operator'
      },
      settings: {
        logo: './assets/brand/signinpro-northstar-skye-tiger-logo.png',
        eventName: 'Fade Masters PHX Chair Check-In',
        idLabel: 'Chair Code',
        enableSound: true,
        allowDuplicateEmails: true,
        retentionNote: 'Fade Masters public booking and walk-in requests mirror into this SignInPro workspace for operator review.',
        syncEnabled: true
      },
      attendees: [],
      audit: []
    };
    try {
      const raw = localStorage.getItem(signInProStateKey());
      const parsed = raw ? JSON.parse(raw) : fallback;
      return Core?.sanitizeState ? Core.sanitizeState(parsed) : parsed;
    } catch {
      return fallback;
    }
  }

  function writeSignInProState(state) {
    const Core = window.SignInProCore;
    const clean = Core?.sanitizeState ? Core.sanitizeState(state) : state;
    localStorage.setItem(signInProStateKey(), JSON.stringify(clean));
    renderNorthStarStatus('Local workspace mirror updated');
    return clean;
  }

  function closeIntroIfOpen() {
    const intro = document.querySelector('[data-fm-intro]');
    intro?.classList.add('is-exiting');
    if (intro) intro.hidden = true;
    document.body.classList.remove('intro-active', 'intro-lock');
    document.body.classList.add('intro-complete');
  }

  function scrollToTarget(selector) {
    const target = document.querySelector(selector);
    if (!target) return false;
    closeIntroIfOpen();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (selector.startsWith('#')) history.replaceState(null, '', selector);
    return true;
  }

  function withTimeout(promise, ms, label) {
    let timer = 0;
    const timeout = new Promise((resolve) => {
      timer = window.setTimeout(() => resolve({ timedOut: true, status: `${label} timed out; local mirror kept` }), ms);
    });
    return Promise.race([
      Promise.resolve(promise).then((value) => {
        window.clearTimeout(timer);
        return value;
      }),
      timeout
    ]);
  }

  function renderNorthStarStatus(remoteText) {
    const Core = window.SignInProCore;
    const Workspace = window.SignInProWorkspace;
    const key = signInProStateKey();
    const state = readSignInProState();
    const count = Array.isArray(state.attendees) ? state.attendees.length : 0;
    if (runtimeStatus) runtimeStatus.textContent = Core?.createAttendee && Workspace?.stateKey ? 'NorthStar core + workspace client loaded' : 'NorthStar local bridge loaded';
    if (coreStatus) coreStatus.textContent = Core?.createAttendee ? `SignInProCore ${Core.APP_VERSION || 'loaded'}` : 'SignInPro core unavailable';
    if (workspaceKeyStatus) workspaceKeyStatus.textContent = key;
    if (mirrorCountStatus) mirrorCountStatus.textContent = String(count);
    if (remoteStatus && remoteText) remoteStatus.textContent = remoteText;
  }

  async function tryRemoteNorthStarSync(state, reason) {
    const Workspace = window.SignInProWorkspace;
    if (!Workspace?.session || !Workspace?.push) return { ok: false, status: 'Local mirror only; NorthStar client unavailable' };
    try {
      const session = await withTimeout(Workspace.session(), 2500, 'NorthStar session check');
      if (session && session.timedOut) return { ok: false, status: session.status };
      if (!session || !session.authenticated) return { ok: false, status: 'Local mirror ready; operator login required for remote sync' };
      if (session.localPreview) return { ok: false, status: 'Local preview mirror ready' };
      if (Workspace.can && !Workspace.can(session, 'write')) return { ok: false, status: 'NorthStar session lacks write permission' };
      const pushed = await withTimeout(Workspace.push(state, reason, true), 4000, 'NorthStar remote push');
      if (pushed && pushed.timedOut) return { ok: false, status: pushed.status };
      return { ok: true, status: 'Synced to NorthStar workspace' };
    } catch (error) {
      return { ok: false, status: `Local mirror ready; remote sync pending (${error.message})` };
    }
  }

  function mirrorToSignInPro(kind, data, receiptIdValue, createdAt, summary) {
    const Core = window.SignInProCore;
    const state = readSignInProState();
    const name = String(data.name || 'Fade Masters Guest').trim() || 'Fade Masters Guest';
    const phone = String(data.phone || '').trim();
    const pseudoEmail = `${receiptIdValue.toLowerCase()}@fade-masters.local`;
    const attendeeInput = {
      name,
      nickname: name.split(/\s+/)[0],
      email: pseudoEmail,
      company: 'Fade Masters PHX',
      role: kind === 'queue' ? 'Walk-in queue' : 'Appointment request',
      notes: `${phone ? `Phone: ${phone}. ` : ''}${summary}`
    };
    const result = Core?.createAttendee
      ? Core.createAttendee(attendeeInput, state.attendees || [], Object.assign({}, state.settings, { allowDuplicateEmails: true }))
      : { ok: true, attendee: Object.assign({ id: receiptIdValue, eventId: receiptIdValue, timestamp: createdAt, updatedAt: createdAt, source: 'fade-masters-public-app' }, attendeeInput) };
    if (!result.ok) return { ok: false, error: 'SignInPro validation rejected the mirrored record.' };
    const attendee = Object.assign({}, result.attendee, {
      id: receiptIdValue,
      eventId: receiptIdValue,
      timestamp: createdAt,
      updatedAt: createdAt,
      source: 'fade-masters-public-app'
    });
    const next = Object.assign({}, state, {
      workspace: {
        id: 'client-app:fade-masters-phx',
        slug: SIGNINPRO_WORKSPACE_SLUG,
        name: 'Fade Masters PHX SignInPro Workspace',
        role: 'operator'
      },
      settings: Object.assign({}, state.settings, {
        eventName: 'Fade Masters PHX Chair Check-In',
        idLabel: 'Chair Code',
        allowDuplicateEmails: true,
        retentionNote: 'Fade Masters public booking and walk-in requests mirror into this SignInPro workspace for operator review.'
      }),
      attendees: [attendee].concat(state.attendees || []).slice(0, 250),
      audit: [{ at: createdAt, action: 'fade_masters_public_request', detail: `${kind} mirrored from public booking app.` }].concat(state.audit || []).slice(0, 300)
    });
    writeSignInProState(next);
    return { ok: true, key: signInProStateKey(), attendee, state: next };
  }

  function selectedServices() {
    return services.filter((service) => selected.has(service.id));
  }

  function totals() {
    return selectedServices().reduce((sum, service) => ({
      price: sum.price + service.price,
      minutes: sum.minutes + service.minutes
    }), { price: 0, minutes: 0 });
  }

  function requestSummary(data, mode = 'appointment') {
    const chosen = selectedServices();
    const total = totals();
    if (mode === 'queue') {
      return [
        `Fade Masters PHX walk-in request`,
        `Name: ${data.name}`,
        `Mobile: ${data.phone}`,
        `Need: ${data.need}`,
        `Status: queue request pending shop/operator acceptance`
      ].join('\n');
    }
    return [
      `Fade Masters PHX appointment request`,
      `Name: ${data.name}`,
      `Mobile: ${data.phone}`,
      `Date/time: ${data.date} ${data.time}`,
      `Barber: ${data.barber}`,
      `Services: ${chosen.map((service) => service.name).join(', ') || 'None selected'}`,
      `Estimate: ${total.minutes} minutes / ${money(total.price)}`,
      `Notes: ${data.notes || 'None'}`,
      `Status: requested, not confirmed until accepted`
    ].join('\n');
  }

  function updateSummary() {
    const chosen = selectedServices();
    const total = totals();
    document.querySelector('[data-fm-service-count]').textContent = `${chosen.length} service${chosen.length === 1 ? '' : 's'}`;
    document.querySelector('[data-fm-selected-services]').textContent = chosen.map((service) => service.name).join(', ') || 'No services selected';
    document.querySelector('[data-fm-duration]').textContent = `${total.minutes} min`;
    document.querySelector('[data-fm-total]').textContent = money(total.price);
  }

  function renderServices() {
    if (!serviceHost) return;
    serviceHost.innerHTML = services.map((service) => `
      <button class="fm-service" type="button" data-service-id="${service.id}" aria-pressed="${selected.has(service.id)}">
        <strong>${service.name}</strong>
        <span>${service.desc}</span>
        <span class="meta"><em>${service.minutes} min</em><em>${money(service.price)}</em></span>
      </button>
    `).join('');
    serviceHost.querySelectorAll('[data-service-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.serviceId;
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        renderServices();
        updateSummary();
      });
    });
  }

  function renderBarbers() {
    if (!barberHost) return;
    barberHost.innerHTML = barbers.map((name, index) => `
      <button class="fm-chip" type="button" data-barber="${name}" aria-pressed="${index === 0}">${name}</button>
    `).join('');
    barberHost.querySelectorAll('[data-barber]').forEach((button) => {
      button.addEventListener('click', () => {
        barberHost.querySelectorAll('[data-barber]').forEach((item) => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        if (barberInput) barberInput.value = button.dataset.barber || 'First available';
      });
    });
  }

  function renderTimes() {
    if (!timeSelect) return;
    timeSelect.innerHTML = times.map((time) => `<option>${time}</option>`).join('');
    timeSelect.value = '03:00 PM';
  }

  function renderLedger() {
    if (!ledgerHost) return;
    const items = readLedger();
    if (!items.length) {
      ledgerHost.innerHTML = '<div class="fm-ledger-item"><strong>No local requests yet</strong><span>Submitted requests will show here.</span></div>';
      return;
    }
    ledgerHost.innerHTML = items.map((item) => `
      <div class="fm-ledger-item">
        <strong>${item.type} · ${item.id}</strong>
        <span>${item.createdAt}</span>
        <span>${item.summary.replace(/\n/g, ' | ')}</span>
        <span>Shop sync: ${item.apiStatus}</span>
      </div>
    `).join('');
  }

  async function submitToZeroOS(payload) {
    const body = {
      clientId: 'fade-masters-phx',
      displayName: 'Fade Masters PHX',
      industry: 'Barbershop',
      primaryContact: payload.name,
      phone: payload.phone,
      email: '',
      services: payload.services || [payload.need || 'Walk-in request'],
      sourceUrls: [window.location.href],
      notes: JSON.stringify(payload, null, 2)
    };
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) throw new Error(json.error || `shop lane returned ${response.status}`);
    return json;
  }

  async function persistRequest(kind, data, summary) {
    const id = receiptId(kind === 'queue' ? 'FMQ' : 'FMB');
    const createdAt = new Date().toISOString();
    let apiStatus = 'not attempted';
    const signInProMirror = mirrorToSignInPro(kind, data, id, createdAt, summary);
    try {
      await submitToZeroOS({
        id,
        kind,
        createdAt,
        ...data,
        services: kind === 'queue'
          ? [data.need || 'Walk-in request']
          : selectedServices().map((service) => service.name),
        estimate: kind === 'queue' ? null : totals(),
        summary
      });
      apiStatus = 'sent to shop lane';
    } catch (error) {
      apiStatus = `local receipt only (${error.message})`;
    }
    const remoteSync = signInProMirror.ok
      ? await tryRemoteNorthStarSync(signInProMirror.state, `${kind} ${id} from Fade Masters public app`)
      : { ok: false, status: 'Mirror failed before remote sync' };
    renderNorthStarStatus(remoteSync.status);
    const item = {
      id,
      type: kind === 'queue' ? 'Walk-in' : 'Booking',
      createdAt,
      summary,
      apiStatus,
      signInPro: signInProMirror.ok ? `mirrored to ${signInProMirror.key}` : `mirror failed (${signInProMirror.error})`,
      northStarSync: remoteSync.status
    };
    writeLedger([item, ...readLedger()]);
    receipt.textContent = `${summary}\n\nReceipt: ${id}\nShop sync: ${apiStatus}\nSignInPro: ${item.signInPro}\nNorthStar: ${item.northStarSync}`;
    return item;
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function setOpenStatus() {
    const title = document.getElementById('fm-today-title');
    const status = document.getElementById('fm-open-status');
    if (!title || !status) return;
    const now = new Date();
    title.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    const hour = now.getHours();
    const open = hour >= 8;
    status.textContent = open
      ? 'Booking requests are open. Confirmation still requires shop/operator acceptance.'
      : 'Requests are still accepted and will be reviewed when the shop opens.';
  }

  bookingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selected.size) {
      receipt.textContent = 'Choose at least one service before sending the request.';
      return;
    }
    const data = formData(bookingForm);
    const summary = requestSummary(data, 'appointment');
    receipt.textContent = 'Sending request...';
    await persistRequest('booking', data, summary);
    bookingForm.reset();
    if (dateInput) dateInput.value = todayDate();
    renderBarbers();
  });

  queueForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(queueForm);
    const summary = requestSummary(data, 'queue');
    receipt.textContent = 'Sending queue request...';
    await persistRequest('queue', data, summary);
    queueForm.reset();
  });

  document.querySelector('[data-fm-copy-summary]')?.addEventListener('click', async () => {
    const data = bookingForm ? formData(bookingForm) : {};
    const summary = requestSummary({ ...data, barber: barberInput?.value || 'First available' }, 'appointment');
    await navigator.clipboard?.writeText(summary).catch(() => {});
    receipt.textContent = `${summary}\n\nCopied summary to clipboard when browser permissions allowed it.`;
  });

  document.querySelector('[data-fm-clear]')?.addEventListener('click', () => {
    selected.clear();
    selected.add('skin-fade');
    bookingForm?.reset();
    queueForm?.reset();
    if (dateInput) dateInput.value = todayDate();
    receipt.textContent = 'Current ticket cleared.';
    renderServices();
    renderBarbers();
    updateSummary();
  });

  document.querySelector('[data-fm-share]')?.addEventListener('click', async () => {
    const share = {
      title: 'Fade Masters PHX booking app',
      text: 'Book a cut or join the walk-in queue at Fade Masters PHX.',
      url: window.location.href
    };
    if (navigator.share) {
      await navigator.share(share).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(share.url).catch(() => {});
  });

  document.querySelectorAll('[data-fm-scroll-target]').forEach((node) => {
    node.addEventListener('click', (event) => {
      const selector = node.getAttribute('data-fm-scroll-target');
      if (!selector) return;
      if (scrollToTarget(selector)) event.preventDefault();
    });
  });

  signInProProofButton?.addEventListener('click', () => {
    const state = readSignInProState();
    const count = Array.isArray(state.attendees) ? state.attendees.length : 0;
    const latest = state.attendees && state.attendees[0];
    receipt.textContent = [
      'Fade Masters SignInPro local mirror',
      `Workspace key: ${signInProStateKey()}`,
      `Workspace: ${state.workspace?.name || SIGNINPRO_WORKSPACE_SLUG}`,
      `Mirrored records: ${count}`,
      latest ? `Latest: ${latest.name} / ${latest.eventId}` : 'Latest: none yet',
      'Open /northstar/?workspace=fade-masters-phx&client=fade-masters-phx to use the provisioned NorthStar lane.'
    ].join('\n');
  });

  if (dateInput) {
    dateInput.min = todayDate();
    dateInput.value = todayDate();
  }
  renderTimes();
  renderServices();
  renderBarbers();
  renderLedger();
  updateSummary();
  setOpenStatus();
  renderNorthStarStatus('Waiting for operator session');
})();
