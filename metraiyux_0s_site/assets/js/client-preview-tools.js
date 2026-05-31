(function(){
  const commandForm = document.querySelector('[data-client-command-form]');
  const output = document.querySelector('[data-client-command-output]');
  const scans = document.querySelectorAll('[data-scan-check]');

  function clean(value, fallback = '') {
    return String(value || fallback || '').trim();
  }

  function gateHeaders() {
    const headers = { 'content-type': 'application/json' };
    try {
      const bridgeHeaders = window.MetrAIyuxGateBridge?.headers?.() || window.Free99PlatformGate?.headers?.() || {};
      Object.entries(bridgeHeaders).forEach(([key, value]) => {
        if (value) headers[key] = value;
      });
    } catch {}
    return headers;
  }

  function pageContext() {
    const root = commandForm || document.body || {};
    const data = root.dataset || {};
    const params = new URLSearchParams(location.search);
    const slug = clean(data.workspaceId || data.workspaceSlug || params.get('workspace_id') || params.get('workspace') || params.get('client') || document.body?.dataset?.workspaceId || '');
    return {
      workspaceId: slug,
      clientName: clean(data.clientName || document.body?.dataset?.clientName || document.querySelector('h1')?.textContent || document.title || 'Client workspace'),
      sourceSurface: clean(data.sourceSurface || document.title || location.pathname)
    };
  }

  async function postCommand(command) {
    const ctx = pageContext();
    if (!ctx.workspaceId) throw new Error('workspace_id_required');
    const payload = {
      workspace_id: ctx.workspaceId,
      command,
      source: 'client-preview-tools',
      source_surface: ctx.sourceSurface,
      metadata: {
        pathname: location.pathname,
        search: location.search,
        title: document.title || ''
      }
    };
    const response = await fetch('/api/saas/customer-command', {
      method: 'POST',
      credentials: 'include',
      headers: gateHeaders(),
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({ ok: response.ok, status: response.status }));
    if (!response.ok || body?.ok === false) throw new Error(body?.error || `customer_command_failed_${response.status}`);
    return body;
  }

  async function postEvent(eventType, metadata) {
    const ctx = pageContext();
    const response = await fetch('/api/0s-command-bridge/events', {
      method: 'POST',
      credentials: 'include',
      headers: gateHeaders(),
      body: JSON.stringify({
        source_app: 'client-preview-tools',
        source_surface: ctx.sourceSurface,
        event_type: eventType,
        summary: metadata?.summary || eventType,
        entity: { kind: 'workspace', id: ctx.workspaceId || 'unknown', label: ctx.clientName },
        ids: { workspace_id: ctx.workspaceId || '' },
        links: [{ label: 'Source page', href: location.pathname + location.search, kind: 'surface' }],
        metadata: { ...metadata, pathname: location.pathname, title: document.title || '' }
      })
    });
    return response.json().catch(() => ({ ok: response.ok, status: response.status }));
  }

  if (commandForm && output) {
    commandForm.addEventListener('submit', async function(event){
      event.preventDefault();
      const command = clean(new FormData(commandForm).get('command'), 'Run website scan');
      output.textContent = 'Submitting command to the live 0S customer command lane...';
      try {
        const receipt = await postCommand(command);
        output.textContent = JSON.stringify({
          ok: true,
          source: 'live_saas_customer_command',
          command,
          receipt
        }, null, 2);
      } catch (error) {
        output.textContent = JSON.stringify({
          ok: false,
          source: 'live_saas_customer_command',
          error: error?.message || 'command_submit_failed',
          note: 'No local preview receipt was created. This surface requires a real workspace id and shared gate session.'
        }, null, 2);
      }
    });
  }

  scans.forEach(function(button){
    button.addEventListener('click', async function(){
      const target = document.querySelector(button.getAttribute('data-scan-check'));
      if (!target) return;
      target.textContent = 'Submitting scan request to the live 0S event ledger...';
      const checkId = clean(button.dataset.scanId || button.textContent || 'scan-check');
      const receipt = await postEvent('client_preview.scan_requested', {
        check_id: checkId,
        summary: `Client preview scan requested: ${checkId}`
      });
      target.textContent = receipt?.ok
        ? `Live scan request recorded: ${receipt.id || receipt.event?.id || '0S Command Bridge'}`
        : `Live scan request was not recorded: ${receipt?.error || receipt?.status || 'missing shared gate session'}`;
    });
  });
})();
