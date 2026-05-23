(() => {
  'use strict';

  const STORE = 'metraiyux.founderCommand.token';
  const SHARED_GATE_KEYS = [
    'FREE99_PLATFORM_GATE_SESSION',
    'METRAIYUX_GATE_SESSION',
    'SKYGATEFS27_GATE_SESSION',
    'SKYGATE_USER_TOKEN',
    'SKYE_GATE_SESSION',
    'quantumskyes_mcp_owner_token',
    'adminBrainToken'
  ];
  const DEFAULT_LINKS = [
    {label:'Owner admin login', href:'/admin/login.html', kind:'gate'},
    {label:'SkyeBox Authenticator', href:'/Free99/apps/skyebox-authenticator/', kind:'app'},
    {label:'Valley Owner CRM', href:'/valley-verified/owner-crm/', kind:'operator'},
    {label:'Valley Lead Inbox', href:'/valley-verified/lead-inbox/', kind:'operator'},
    {label:'Valley Admin Review', href:'/valley-verified/admin-review/', kind:'operator'}
  ];
  const state = { token: '', status: null, inboxConversationId: '', inboxWorkspaceId: '' };

  const $ = selector => document.querySelector(selector);
  const els = {
    gateState: $('#gateState'),
    loginCard: $('#loginCard'),
    loginForm: $('#loginForm'),
    adminPassword: $('#adminPassword'),
    loginStatus: $('#loginStatus'),
    dashGrid: $('#dashGrid'),
    tabbar: $('#tabbar'),
    chatFeed: $('#chatFeed'),
    commandForm: $('#commandForm'),
    commandInput: $('#commandInput'),
    inboxForm: $('#inboxForm'),
    inboxMessageForm: $('#inboxMessageForm'),
    inboxOutput: $('#inboxOutput'),
    inboxList: $('#inboxList'),
    messageList: $('#messageList'),
    inboxConversationId: $('#inboxConversationId'),
    inboxWorkspaceId: $('#inboxWorkspaceId'),
    codeForm: $('#codeForm'),
    codeOutput: $('#codeOutput'),
    codeList: $('#codeList'),
    recoveryForm: $('#recoveryForm'),
    recoveryOutput: $('#recoveryOutput'),
    recoveryList: $('#recoveryList'),
    routeList: $('#routeList'),
    gateConfigured: $('#gateConfigured'),
    queueConfigured: $('#queueConfigured'),
    kvConfigured: $('#kvConfigured')
  };

  ready(init);

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function init() {
    state.token = sessionStorage.getItem(STORE) || localStorage.getItem(STORE) || readStoredGateToken();
    bind();
    renderRoutes(DEFAULT_LINKS);
    const requestedTab = new URLSearchParams(location.search).get('tab');
    if (requestedTab) switchTab(requestedTab);
    if (state.token) hydrate();
  }

  function bind() {
    els.loginForm.addEventListener('submit', login);
    els.commandForm.addEventListener('submit', sendCommand);
    els.inboxForm?.addEventListener('submit', createInboxConversation);
    els.inboxMessageForm?.addEventListener('submit', sendInboxMessage);
    els.inboxList?.addEventListener('click', event => {
      const button = event.target.closest('[data-conversation-id]');
      if (button) loadInbox(button.dataset.conversationId);
    });
    els.codeForm.addEventListener('submit', generateCode);
    els.recoveryForm?.addEventListener('submit', generateRecoveryPacket);
    document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    document.addEventListener('free99-platform:gate-ready', event => {
      const token = cleanToken(event.detail?.token);
      if (token && !state.token) {
        persistToken(token, event.detail?.source || 'free99-platform-gate');
        hydrate();
      }
    });
    document.addEventListener('metraiyux:gate-ready', () => {
      const token = readStoredGateToken();
      if (token && !state.token) {
        persistToken(token, 'metraiyux-gate-ready');
        hydrate();
      }
    });
  }

  async function login(event) {
    event.preventDefault();
    const password = els.adminPassword.value.trim();
    if (!password) return;
    els.loginStatus.textContent = 'Checking shared 0S / Free99 gate...';
    const clean = cleanToken(password);
    const res = await fetch('/api/founder-command/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': clean,
        'x-free99-admin-code': clean,
        'x-free99-demo-code': clean,
        'x-skye-gate-session': clean,
        'x-free99-gate-session': clean,
        'x-demo-code': clean,
        'x-demon-key': clean
      },
      body: JSON.stringify({password: clean, code: clean, free99AdminCode: clean, demoCode: clean, demonKey: clean})
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.token) {
      els.loginStatus.textContent = body.error || `Login failed (${res.status}).`;
      return;
    }
    persistToken(body.token, 'founder-command-login');
    els.adminPassword.value = '';
    els.loginStatus.textContent = '';
    await hydrate();
  }

  async function hydrate() {
    const status = await api('/api/founder-command/status');
    if (!status.ok) {
      lock(status.error || 'Session expired.');
      return;
    }
    state.status = status;
    els.gateState.textContent = 'Unlocked';
    els.gateState.classList.add('unlocked');
    els.loginCard.hidden = true;
    els.gateConfigured.textContent = status.gate?.configured ? 'Ready' : 'Needs gate';
    els.queueConfigured.textContent = status.bindings?.queue ? 'Ready' : 'No queue';
    els.kvConfigured.textContent = status.bindings?.kv ? 'Ready' : 'No KV';
    renderRoutes(status.links?.length ? status.links : DEFAULT_LINKS);
    await loadCodes();
    await loadRecoveryPackets();
    await loadInbox(new URLSearchParams(location.search).get('conversation') || '');
  }

  function lock(message) {
    state.token = '';
    sessionStorage.removeItem(STORE);
    els.gateState.textContent = 'Locked';
    els.gateState.classList.remove('unlocked');
    els.loginCard.hidden = false;
    els.gateConfigured.textContent = 'Locked';
    els.queueConfigured.textContent = 'Login';
    els.kvConfigured.textContent = 'Login';
    renderRoutes(DEFAULT_LINKS);
    els.loginStatus.textContent = message || '';
  }

  async function sendCommand(event) {
    event.preventDefault();
    const message = els.commandInput.value.trim();
    if (!message) return;
    addBubble('me', message);
    els.commandInput.value = '';
    if (!state.token) {
      addBubble('brain', 'Unlock with the same 0S / Free99 gate session first, then I can run the command lane.');
      return;
    }
    const body = await api('/api/founder-command/chat', {method:'POST', body:{message}});
    if (!body.ok) {
      addBubble('brain', body.error || 'Command failed.');
      return;
    }
    const answer = body.answer || {};
    const parts = [answer.text || 'No operation was run.'];
    if ((answer.links || []).length) {
      parts.push(answer.links.map(link => `${link.label}: ${link.href}`).join('\n'));
    }
    if ((answer.next_actions || []).length) {
      parts.push('Next: ' + answer.next_actions.join(' '));
    }
    addBubble('brain', parts.join('\n\n'));
    if (body.action?.type === 'relay13_conversation_create' && body.action?.ok) await loadInbox(body.action.relay13?.conversation_id || '');
  }

  async function createInboxConversation(event) {
    event.preventDefault();
    if (!state.token) {
      els.inboxOutput.textContent = 'Unlock with the same 0S / Free99 gate session first, then Relay13 inbox actions are available here.';
      return;
    }
    const data = Object.fromEntries(new FormData(els.inboxForm).entries());
    if (!data.message?.trim()) {
      els.inboxOutput.textContent = 'Message is required.';
      return;
    }
    els.inboxOutput.textContent = 'Opening Relay13 conversation through the live Worker...';
    const body = await api('/api/founder-command/inbox/conversations', {method:'POST', body:data});
    if (!body.ok) {
      els.inboxOutput.textContent = body.error || 'Relay13 conversation failed.';
      return;
    }
    const id = body.relay13?.conversation_id || body.record?.relay13?.conversation_id || '';
    const createdMarkup = `<span>Relay13 conversation created.</span><strong>${escapeHtml(id)}</strong>`;
    els.inboxOutput.innerHTML = createdMarkup;
    await loadInbox(id);
    els.inboxOutput.innerHTML = createdMarkup;
  }

  async function sendInboxMessage(event) {
    event.preventDefault();
    if (!state.token) {
      els.inboxOutput.textContent = 'Unlock with the same 0S / Free99 gate session first.';
      return;
    }
    const data = Object.fromEntries(new FormData(els.inboxMessageForm).entries());
    data.conversation_id = data.conversation_id || state.inboxConversationId;
    data.workspace_id = data.workspace_id || state.inboxWorkspaceId;
    if (!data.conversation_id || !data.message?.trim()) {
      els.inboxOutput.textContent = 'Select a conversation and write a reply first.';
      return;
    }
    const body = await api('/api/founder-command/inbox/messages', {method:'POST', body:data});
    if (!body.ok) {
      els.inboxOutput.textContent = body.error || 'Relay13 reply failed.';
      return;
    }
    const sentText = `Relay13 reply sent to ${data.conversation_id}.`;
    els.inboxOutput.textContent = sentText;
    els.inboxMessageForm.querySelector('textarea[name="message"]').value = '';
    await loadInbox(data.conversation_id);
    els.inboxOutput.textContent = sentText;
  }

  async function loadInbox(conversationId = '') {
    if (!state.token || !els.inboxList) return;
    const workspaceInput = els.inboxForm?.elements?.workspace;
    const workspace = workspaceInput?.value || 'connectlog-main';
    const params = new URLSearchParams();
    if (workspace) params.set('workspace', workspace);
    if (conversationId) params.set('conversation_id', conversationId);
    const body = await api(`/api/founder-command/inbox?${params.toString()}`);
    if (!body.ok) {
      els.inboxOutput.textContent = body.error || 'Relay13 inbox could not load.';
      return;
    }
    const conversations = body.conversations || [];
    const receipts = body.receipts || [];
    const selected = body.selected || conversations[0] || null;
    const selectedId = selected?.id || selected?.conversation_id || conversationId || '';
    const workspaceId = selected?.workspace_id || body.workspace?.id || '';
    state.inboxConversationId = selectedId;
    state.inboxWorkspaceId = workspaceId;
    if (els.inboxConversationId) els.inboxConversationId.value = selectedId;
    if (els.inboxWorkspaceId) els.inboxWorkspaceId.value = workspaceId;
    els.inboxOutput.textContent = body.mode === 'relay13_live_admin'
      ? `Relay13 live inbox loaded: ${conversations.length} conversation(s).`
      : body.message || `Inbox loaded from ${body.mode || 'receipt'} mode.`;
    els.inboxList.innerHTML = conversations.length
      ? conversations.map(conversation => {
        const id = conversation.id || conversation.conversation_id || '';
        return `<article class="conversation-card">
          <button type="button" data-conversation-id="${escapeAttr(id)}">${escapeHtml(conversation.subject || id || 'Relay13 conversation')}</button>
          <span>${escapeHtml(conversation.customer_name || 'Visitor')} / ${escapeHtml(conversation.status || 'open')} / ${escapeHtml(conversation.updated_at || conversation.created_at || '')}</span>
          <small>${escapeHtml(conversation.last_message_preview || '')}</small>
        </article>`;
      }).join('')
      : receipts.slice(0, 8).map(receipt => `<article class="conversation-card">
        <button type="button" data-conversation-id="${escapeAttr(receipt.relay13?.conversation_id || '')}">${escapeHtml(receipt.subject || receipt.type || 'Founder receipt')}</button>
        <span>${escapeHtml(receipt.status || '')} / ${escapeHtml(receipt.created_at || '')}</span>
        <small>${escapeHtml(receipt.message_preview || receipt.error || '')}</small>
      </article>`).join('');
    els.messageList.innerHTML = (body.messages || []).length
      ? body.messages.map(message => `<article class="message-card ${escapeAttr(message.sender_role || '')}">
        <strong>${escapeHtml(message.sender_name || message.sender_role || 'Relay13')}</strong>
        <p>${escapeHtml(message.body || '')}</p>
        <span>${escapeHtml(message.created_at || '')}</span>
      </article>`).join('')
      : '<article class="message-card"><p>No Relay13 messages loaded for the selected thread yet.</p></article>';
  }

  async function generateCode(event) {
    event.preventDefault();
    if (!state.token) {
      els.codeOutput.textContent = 'Unlock with the same 0S / Free99 gate session first, then code generation is available here.';
      return;
    }
    const data = Object.fromEntries(new FormData(els.codeForm).entries());
    data.max_uses = Number(data.max_uses);
    data.ttl_minutes = Number(data.ttl_minutes);
    data.seats = Number(data.seats);
    data.monthly_actions = Number(data.monthly_actions);
    const body = await api('/api/founder-command/codes', {method:'POST', body:data});
    if (!body.ok) {
      els.codeOutput.textContent = body.error || 'Code generation failed.';
      return;
    }
    els.codeOutput.innerHTML = `<span>Reveal once. Store it where you keep gate handoff credentials.</span><strong>${escapeHtml(body.code)}</strong>`;
    await loadCodes();
  }

  async function loadCodes() {
    if (!state.token) return;
    const body = await api('/api/founder-command/codes');
    if (!body.ok) return;
    els.codeList.innerHTML = (body.codes || []).slice(0, 12).map(code => `
      <article class="code-item">
        <strong>${escapeHtml(code.code_type || 'code')} ${escapeHtml(code.client || '')}</strong>
        <span>${escapeHtml(code.code_preview || code.id)} / expires ${escapeHtml(code.expires_at || '')}</span>
      </article>`).join('');
  }

  async function generateRecoveryPacket(event) {
    event.preventDefault();
    if (!state.token) {
      els.recoveryOutput.textContent = 'Unlock with the same 0S / Free99 gate session first, then recovery packets are available here.';
      return;
    }
    const data = Object.fromEntries(new FormData(els.recoveryForm).entries());
    data.backup_count = Number(data.backup_count);
    data.ttl_minutes = Number(data.ttl_minutes);
    data.max_uses = Number(data.max_uses);
    data.seats = Number(data.seats);
    data.recovery_type = data.surface || 'gate';
    data.code_type = 'emergency';
    const body = await api('/api/founder-command/recovery', {method:'POST', body:data});
    if (!body.ok) {
      els.recoveryOutput.textContent = body.error || 'Recovery packet failed.';
      return;
    }
    const reveal = body.reveal || {};
    const identity = body.packet?.identity || {};
    els.recoveryOutput.innerHTML = `
      <span>${escapeHtml(reveal.message || 'Reveal once. Store this outside the browser.')}</span>
      <strong>${escapeHtml(reveal.restore_key || '')}</strong>
      <ul>
        <li>Reset: <code>${escapeHtml(reveal.reset_code || '')}</code></li>
        <li>Backup: ${(reveal.backup_codes || []).map(code => `<code>${escapeHtml(code)}</code>`).join(', ')}</li>
        <li>Workspace: <code>${escapeHtml(identity.workspace_id || '')}</code></li>
        <li>Email: <code>${escapeHtml(identity.proposed_skyemail_alias || identity.owner_email || '')}</code></li>
      </ul>`;
    await loadRecoveryPackets();
  }

  async function loadRecoveryPackets() {
    if (!state.token || !els.recoveryList) return;
    const body = await api('/api/founder-command/recovery');
    if (!body.ok) return;
    els.recoveryList.innerHTML = (body.packets || []).slice(0, 12).map(packet => `
      <article class="code-item">
        <strong>${escapeHtml(packet.surface || packet.recovery_type || 'recovery')} ${escapeHtml(packet.client || '')}</strong>
        <span>${escapeHtml((packet.secret_previews || [])[0] || packet.id)} / expires ${escapeHtml(packet.expires_at || '')}</span>
      </article>`).join('');
  }

  function renderRoutes(links) {
    els.routeList.innerHTML = links.map(link => `
      <a class="route-card" href="${escapeAttr(link.href)}">
        <strong>${escapeHtml(link.label)}</strong>
        <span>${escapeHtml(link.kind || 'route')} / ${escapeHtml(link.href)}</span>
      </a>`).join('');
  }

  function switchTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tab === tab)));
    document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tab));
    if (tab === 'inbox' && state.token) loadInbox(state.inboxConversationId);
  }

  async function api(path, options = {}) {
    const init = {method: options.method || 'GET', credentials: 'include', headers: authHeaders()};
    if (options.body) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const res = await fetch(path, init);
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) lock(body.error || 'Unauthorized.');
    return body.ok === undefined ? {...body, ok:res.ok} : body;
  }

  function authHeaders(extra = {}) {
    const headers = {...extra};
    const token = cleanToken(state.token);
    if (token) {
      headers.authorization = `Bearer ${token}`;
      headers['x-admin-token'] = token;
      headers['x-skye-gate-session'] = token;
      headers['x-free99-gate-session'] = token;
    }
    return headers;
  }

  function readStoredGateToken() {
    const appKey = 'FREE99_PLATFORM_GATE_SESSION_FOUNDER_COMMAND';
    for (const key of [STORE, appKey, ...SHARED_GATE_KEYS]) {
      const token = readTokenFromStorage(sessionStorage, key) || readTokenFromStorage(localStorage, key);
      if (token) return token;
    }
    const bridgeToken = window.MetrAIyuxGateBridge?.current?.()?.token || window.Free99PlatformGate?.requireSession?.()?.token || '';
    return cleanToken(bridgeToken);
  }

  function readTokenFromStorage(store, key) {
    try {
      const raw = store.getItem(key);
      if (!raw) return '';
      const parsed = raw.startsWith('{') ? JSON.parse(raw) : null;
      return cleanToken(parsed?.token || raw);
    } catch {
      return '';
    }
  }

  function cleanToken(value) {
    return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
  }

  function persistToken(token, source = 'founder-command') {
    const clean = cleanToken(token);
    if (!clean) return;
    state.token = clean;
    sessionStorage.setItem(STORE, clean);
    const shared = {
      token: clean,
      source,
      platform_id: 'founder-command',
      usage_lane: 'owner-mobile-command',
      billing_mode: 'free99-owner',
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(shared));
    sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION_FOUNDER_COMMAND', JSON.stringify(shared));
    window.MetrAIyuxGateBridge?.persist?.(shared, {silent:true});
  }

  function addBubble(role, text) {
    const node = document.createElement('article');
    node.className = `bubble ${role === 'me' ? 'me' : 'brain'}`;
    node.textContent = text;
    els.chatFeed.append(node);
    node.scrollIntoView({block:'end'});
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('`', '&#96;');
  }
})();
