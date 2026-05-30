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

  function providerStatusLine(configured){
    const parts = [
      ['Database', configured?.database],
      ['Mail API', configured?.resend_api_key],
      ['Webhook secret', configured?.resend_webhook_secret],
      ['Inbound domain', configured?.inbound_domain],
    ];
    return parts.map(([label, ok]) => `${label}: ${ok ? 'ready' : 'missing'}`).join(' • ');
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
            <span class="chip">${safe(event.delivery_status || 'event')}</span>
            <span class="chip">${safe(event.event_type || '')}</span>
            <span class="chip mono">${safe(event.provider_message_id || '')}</span>
          </div>
        </div>
      </article>`).join('');
  }

  function renderWebhookEvents(items){
    const rows = Array.isArray(items) ? items : [];
    if(!rows.length){
      webhookEventsEl.innerHTML = '<div class="empty">No signed Citadel webhook attempts have been stored for this mailbox yet.</div>';
      return;
    }
    webhookEventsEl.innerHTML = rows.map((event)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(event.event_type || 'Webhook event')}</div>
              <div class="mail-from mono">${safe(event.svix_id || 'no-svix-id')}</div>
            </div>
            <div class="mini">${safe(fmtDate(event.received_at || event.event_created_at || ''))}</div>
          </div>
          <div class="mail-meta">
            <span class="chip">${safe(event.processing_status || 'received')}</span>
            ${event.error ? `<span class="chip">${safe(event.error)}</span>` : ''}
            ${event.resend_email_id ? `<span class="chip mono">${safe(event.resend_email_id)}</span>` : ''}
          </div>
        </div>
      </article>`).join('');
  }

  async function refresh(){
    try{
      setBadge('Checking Citadel mail lane health...');
      const [health, events] = await Promise.all([
        apiFetch('/resend-health'),
        apiFetch('/resend-events-list?limit=100')
      ]);

      endpointEl.textContent = health.endpoint || '/.netlify/functions/inbound-resend';
      checklistEl.textContent = providerStatusLine(health.configured || {});
      renderSummary(events.summary || {});
      renderDeliveryEvents(events.events || []);
      renderWebhookEvents(events.webhooks || []);
      summaryStatusEl.textContent = `${events.events?.length || 0} delivery event${(events.events?.length || 0) === 1 ? '' : 's'} loaded`;

      const missing = Object.entries(health.configured || {}).filter(([, ok]) => !ok).map(([key]) => key);
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
