(async function(){
  const boot = await SMV.withBoot('monitoring', 'Monitoring', 'Delivery and webhook operations');
  if(!boot) return;

  const badgeEl = qs('#monitoringBadge');
  const endpointEl = qs('#webhookEndpoint');
  const checklistEl = qs('#providerChecklist');
  const summaryStatusEl = qs('#summaryStatus');
  const summaryGridEl = qs('#summaryGrid');
  const deliveryEventsEl = qs('#deliveryEvents');
  const webhookEventsEl = qs('#webhookEvents');

  function setBadge(text, kind=''){
    setStatus(badgeEl, text, kind);
  }

  function providerStatusLine(health, status){
    const configured = health?.configured || {};
    const provider = String(status?.mailbox?.provider || status?.mode || '').toLowerCase();
    const providerApiReady = provider === 'zoho'
      ? configured.zoho_api
      : (configured.provider_api || configured.zoho_api || configured.resend_api_key);
    const parts = [
      ['Database', configured?.database],
      ['Provider API', providerApiReady],
    ];
    if(provider === 'zoho' || configured.zoho_api) parts.push(['Zoho audit', configured?.zoho_api]);
    if(provider === 'resend' || configured.resend_api_key || configured.resend_webhook_secret){
      parts.push(['Resend API', configured?.resend_api_key]);
      parts.push(['Resend webhook', configured?.resend_webhook_secret]);
    }
    parts.push(['Inbound domain', configured?.inbound_domain]);
    return parts.map(([label, ok]) => `${label}: ${ok ? 'ready' : 'missing'}`).join(' • ');
  }

  function missingHealthKeys(health, status){
    const configured = health?.configured || {};
    const provider = String(status?.mailbox?.provider || status?.mode || '').toLowerCase();
    const missing = [];
    if(!configured.database) missing.push('database');
    if(provider === 'zoho'){
      if(!configured.zoho_api) missing.push('zoho_api');
    }else if(provider === 'resend'){
      if(!configured.resend_api_key) missing.push('resend_api_key');
      if(!configured.resend_webhook_secret) missing.push('resend_webhook_secret');
    }else if(!(configured.provider_api || configured.zoho_api || configured.resend_api_key)){
      missing.push('provider_api');
    }
    if(!configured.inbound_domain) missing.push('inbound_domain');
    return missing;
  }

  function stat(label, value, hint){
    return `<div class="stat"><b>${safe(String(value ?? 0))}</b><span class="mini">${safe(label)}${hint ? ` • ${safe(hint)}` : ''}</span></div>`;
  }

  function renderSummary(summary){
    const data = summary || {};
    summaryGridEl.innerHTML = [
      stat('Total events', data.total_events),
      stat('Received', data.received),
      stat('Sent', data.sent),
      stat('Delivered', data.delivered),
      stat('Opened', data.opened),
      stat('Clicked', data.clicked),
      stat('Delayed', data.delayed),
      stat('Bounced', data.bounced),
      stat('Failed / complained', Number(data.failed || 0) + Number(data.complained || 0)),
    ].join('');
  }

  function renderDeliveryEvents(items){
    const rows = Array.isArray(items) ? items : [];
    if(!rows.length){
      deliveryEventsEl.innerHTML = '<div class="empty">No Citadel delivery events have been stored for this mailbox yet.</div>';
      return;
    }
    deliveryEventsEl.innerHTML = rows.map((event)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(event.subject || event.event_type || 'Email event')}</div>
              <div class="mail-from">${safe(event.from_email || 'unknown sender')} → ${safe(event.recipient_email || 'unknown recipient')}</div>
            </div>
            <div class="mini">${safe(fmtDate(event.event_created_at || event.created_at || ''))}</div>
          </div>
          <div class="mail-meta">
            <span class="chip">${safe(event.provider || 'provider')}</span>
            <span class="chip">${safe(event.delivery_status || 'event')}</span>
            <span class="chip">${safe(event.event_type || '')}</span>
            <span class="chip mono">${safe(event.provider_message_id || '')}</span>
          </div>
        </div>
      </article>`).join('');
  }

  function renderWebhookEvents(resendItems, zohoItems, zohoResult){
    const rows = [
      ...(Array.isArray(resendItems) ? resendItems.map((event)=>({
        provider: 'resend',
        title: event.event_type || 'Resend webhook event',
        identity: event.svix_id || 'no-svix-id',
        at: event.received_at || event.event_created_at || '',
        status: event.processing_status || 'received',
        detail: event.error || '',
        messageId: event.resend_email_id || '',
      })) : []),
      ...(Array.isArray(zohoItems) ? zohoItems.map((event)=>({
        provider: 'zoho',
        title: event.ignored ? 'Zoho webhook ignored' : 'Zoho webhook audit',
        identity: (event.recipient_emails || []).join(', ') || event.id || 'no-recipient',
        at: event.received_at || '',
        status: event.ignored ? 'ignored' : `imported ${Number(event.imported || 0)}`,
        detail: event.ignore_reason || event.payload_preview || '',
        messageId: event.id || '',
      })) : []),
    ];
    if(!rows.length){
      const zohoNote = zohoResult && zohoResult.ok === false
        ? ` Zoho audit route unavailable: ${safe(zohoResult.error || 'request failed')}.`
        : '';
      webhookEventsEl.innerHTML = `<div class="empty">No provider webhook attempts have been stored for this mailbox yet.${zohoNote}</div>`;
      return;
    }
    webhookEventsEl.innerHTML = rows.map((event)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(event.title || 'Webhook event')}</div>
              <div class="mail-from mono">${safe(event.identity || 'no-provider-id')}</div>
            </div>
            <div class="mini">${safe(fmtDate(event.at || ''))}</div>
          </div>
          <div class="mail-meta">
            <span class="chip">${safe(event.provider || 'provider')}</span>
            <span class="chip">${safe(event.status || 'received')}</span>
            ${event.detail ? `<span class="chip">${safe(String(event.detail).slice(0, 120))}</span>` : ''}
            ${event.messageId ? `<span class="chip mono">${safe(event.messageId)}</span>` : ''}
          </div>
        </div>
      </article>`).join('');
  }

  async function fetchOptional(path){
    try{
      return await apiFetch(path);
    }catch(err){
      return { ok:false, error: err.message || 'request failed' };
    }
  }

  async function refresh(){
    try{
      setBadge('Checking Citadel mail lane health...');
      const [health, events, zohoEvents] = await Promise.all([
        apiFetch('/resend-health'),
        apiFetch('/resend-events-list?limit=100'),
        fetchOptional('/zoho-webhook-events?limit=50')
      ]);

      const endpoints = health.endpoints || {};
      endpointEl.textContent = [
        `Delivery events: ${endpoints.delivery_events || '/api/resend-events-list'}`,
        `Resend webhook: ${endpoints.resend_webhook || health.endpoint || '/.netlify/functions/inbound-resend'}`,
        `Zoho webhook audit: ${endpoints.zoho_webhook_events || '/api/zoho-webhook-events'}`
      ].join('\n');
      checklistEl.textContent = providerStatusLine(health, boot.status);
      renderSummary(events.summary || {});
      renderDeliveryEvents(events.events || []);
      renderWebhookEvents(events.webhooks || [], zohoEvents.items || [], zohoEvents);
      summaryStatusEl.textContent = `${events.events?.length || 0} delivery event${(events.events?.length || 0) === 1 ? '' : 's'} loaded`;

      const missing = missingHealthKeys(health, boot.status);
      setBadge(missing.length ? `Provider setup incomplete: ${missing.join(', ')}` : 'Provider setup ready', missing.length ? 'danger' : 'ok');
    }catch(err){
      setBadge(err.message || 'Monitoring failed', 'danger');
      summaryStatusEl.textContent = 'Monitoring backend unavailable';
      summaryGridEl.innerHTML = '';
      deliveryEventsEl.innerHTML = `<div class="empty">${safe(err.message || 'Monitoring backend unavailable')}</div>`;
      webhookEventsEl.innerHTML = '<div class="empty">Webhook processing cannot be inspected until the backend is deployed.</div>';
    }
  }

  qs('#refreshMonitoringBtn')?.addEventListener('click', refresh);
  await refresh();
})();
