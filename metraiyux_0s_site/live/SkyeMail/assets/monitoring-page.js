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
  const telemetryStatusEl = qs('#telemetryStatus');
  const telemetryGridEl = qs('#telemetryGrid');
  const telemetryEventsEl = qs('#telemetryEvents');

  function setBadge(text, kind=''){
    setStatus(badgeEl, text, kind);
  }

  function displayMailLane(value){
    const lane = String(value || '').toLowerCase();
    if(lane === 'skyemail') return 'SkyeMail production';
    if(lane === 'zoho') return 'SkyeMail production';
    if(lane === 'resend') return 'SkyeMail proof route';
    if(lane === 'external-webhook') return 'SkyeMail webhook route';
    if(lane === 'stalwart') return 'SkyeMail server route';
    return value ? String(value) : 'SkyeMail route';
  }

  function providerStatusLine(health, status){
    const configured = health?.configured || {};
    const provider = String(status?.mailbox?.provider || status?.mode || '').toLowerCase();
    const providerApiReady = provider === 'zoho'
      ? configured.zoho_api
      : (configured.provider_api || configured.zoho_api || configured.resend_api_key);
    const parts = [
      ['Database', configured?.database],
      ['Mail routing API', providerApiReady],
    ];
    if(provider === 'zoho' || configured.zoho_api) parts.push(['Mail audit', configured?.zoho_api]);
    if(provider === 'resend' || configured.resend_api_key || configured.resend_webhook_secret){
      parts.push(['Mail proof API', configured?.resend_api_key]);
      parts.push(['Mail proof webhook', configured?.resend_webhook_secret]);
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
      deliveryEventsEl.innerHTML = '<div class="empty">No SkyeMail delivery events have been stored for this mailbox yet.</div>';
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
            <span class="chip">${safe(displayMailLane(event.provider))}</span>
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
        provider: 'skyemail',
        title: event.event_type || 'Mail webhook event',
        identity: event.svix_id || 'no-svix-id',
        at: event.received_at || event.event_created_at || '',
        status: event.processing_status || 'received',
        detail: event.error || '',
        messageId: event.resend_email_id || '',
      })) : []),
      ...(Array.isArray(zohoItems) ? zohoItems.map((event)=>({
        provider: 'skyemail',
        title: event.ignored ? 'Mail webhook ignored' : 'Mail webhook audit',
        identity: (event.recipient_emails || []).join(', ') || event.id || 'no-recipient',
        at: event.received_at || '',
        status: event.ignored ? 'ignored' : `imported ${Number(event.imported || 0)}`,
        detail: event.ignore_reason || event.payload_preview || '',
        messageId: event.id || '',
      })) : []),
    ];
    if(!rows.length){
      const zohoNote = zohoResult && zohoResult.ok === false
        ? ` Mail audit route unavailable: ${safe(zohoResult.error || 'request failed')}.`
        : '';
      webhookEventsEl.innerHTML = `<div class="empty">No mail routing webhook attempts have been stored for this mailbox yet.${zohoNote}</div>`;
      return;
    }
    webhookEventsEl.innerHTML = rows.map((event)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(event.title || 'Webhook event')}</div>
              <div class="mail-from mono">${safe(event.identity || 'no-route-id')}</div>
            </div>
            <div class="mini">${safe(fmtDate(event.at || ''))}</div>
          </div>
          <div class="mail-meta">
            <span class="chip">${safe(displayMailLane(event.provider))}</span>
            <span class="chip">${safe(event.status || 'received')}</span>
            ${event.detail ? `<span class="chip">${safe(String(event.detail).slice(0, 120))}</span>` : ''}
            ${event.messageId ? `<span class="chip mono">${safe(event.messageId)}</span>` : ''}
          </div>
        </div>
      </article>`).join('');
  }

  function renderTelemetry(summary){
    if(!telemetryGridEl || !telemetryEventsEl) return;
    const data = summary?.summary || {};
    telemetryGridEl.innerHTML = [
      stat('API events', data.total_events),
      stat('OK', data.ok_events),
      stat('Failed', data.failed_events),
      stat('AI calls', data.ai_events),
      stat('Inbox actions', data.inbox_events),
      stat('Sends', data.send_events),
      stat('0S integrations', data.os_integration_events),
      stat('Average ms', data.avg_ms),
      stat('Max ms', data.max_ms),
    ].join('');
    const rows = Array.isArray(summary?.recent) ? summary.recent : [];
    if(telemetryStatusEl) telemetryStatusEl.textContent = `${rows.length} API event${rows.length === 1 ? '' : 's'} loaded`;
    if(!rows.length){
      telemetryEventsEl.innerHTML = '<div class="empty">No API telemetry rows have been recorded for this mailbox window yet.</div>';
      return;
    }
    telemetryEventsEl.innerHTML = rows.map((event)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(event.route || 'api route')} <span class="chip">${safe(event.method || 'GET')}</span></div>
              <div class="mail-from">${safe(event.mailbox_email || 'active session')} • ${safe(event.source || 'worker-api')}</div>
            </div>
            <div class="mini">${safe(fmtDate(event.created_at || ''))}</div>
          </div>
          <div class="mail-meta">
            <span class="chip ${event.ok ? 'ok' : 'danger'}">${safe(String(event.status || 0))}</span>
            <span class="chip">${safe(String(event.elapsed_ms || 0))} ms</span>
            ${event.metadata_json?.error ? `<span class="chip">${safe(String(event.metadata_json.error).slice(0, 120))}</span>` : ''}
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
      setBadge('Checking SkyeMail production mail lane health...');
      const [health, events, zohoEvents, telemetry] = await Promise.all([
        apiFetch('/mail-routing-health'),
        apiFetch('/mail-routing-events?limit=100'),
        fetchOptional('/mail-routing-webhook-events?limit=50'),
        fetchOptional('/telemetry-summary?days=7&limit=80')
      ]);

      const endpoints = health.endpoints || {};
      endpointEl.textContent = [
        `Delivery events: ${endpoints.delivery_events || '/api/mail-routing-events'}`,
        `Mail webhook: ${endpoints.mail_routing_webhook || health.endpoint || '/api/mail-routing-webhook'}`,
        `Mail webhook audit: ${endpoints.mail_routing_webhook_events || '/api/mail-routing-webhook-events'}`
      ].join('\n');
      checklistEl.textContent = providerStatusLine(health, boot.status);
      renderSummary(events.summary || {});
	      renderDeliveryEvents(events.events || []);
	      const celebratedDelivery = (events.events || []).find((event)=> ['delivered','opened','clicked','received','sent'].includes(String(event.delivery_status || '').toLowerCase()));
	      if(celebratedDelivery && window.SMV?.celebrateReceipt){
	        window.SMV.celebrateReceipt({
	          receiptId:celebratedDelivery.id || celebratedDelivery.provider_message_id || celebratedDelivery.message_id,
	          triggerType:'proof-green',
	          intensity:'quiet',
	          message:'Mail routing receipt loaded. Thank you for keeping delivery proof inside SkyeMail.'
	        });
	      }
	      renderWebhookEvents(events.webhooks || [], zohoEvents.items || [], zohoEvents);
      if(telemetry?.ok) renderTelemetry(telemetry);
      else if(telemetryEventsEl) telemetryEventsEl.innerHTML = `<div class="empty">${safe(telemetry?.error || 'API telemetry unavailable.')}</div>`;
      summaryStatusEl.textContent = `${events.events?.length || 0} delivery event${(events.events?.length || 0) === 1 ? '' : 's'} loaded`;

      const missing = missingHealthKeys(health, boot.status);
      setBadge(missing.length ? `Mail routing setup incomplete: ${missing.join(', ')}` : 'Mail routing setup ready', missing.length ? 'danger' : 'ok');
    }catch(err){
      setBadge(err.message || 'Monitoring failed', 'danger');
      summaryStatusEl.textContent = 'Monitoring backend unavailable';
      summaryGridEl.innerHTML = '';
      deliveryEventsEl.innerHTML = `<div class="empty">${safe(err.message || 'Monitoring backend unavailable')}</div>`;
      webhookEventsEl.innerHTML = '<div class="empty">Webhook processing cannot be inspected until the backend is deployed.</div>';
      if(telemetryEventsEl) telemetryEventsEl.innerHTML = '<div class="empty">API telemetry cannot be inspected until the backend is deployed.</div>';
    }
  }

  qs('#refreshMonitoringBtn')?.addEventListener('click', refresh);
  await refresh();
})();
