(async function(){
  const boot = await SMV.withBoot('workspace', '0S Workbench', 'Docs, CRM, calendar, finance, audit, builder, and automation');
  if(!boot) return;

  const bridge = window.SMVZeroOs;
  const statusEl = qs('#statusText');
  const params = new URLSearchParams(location.search);
  const PANELS = [
    { id:'overview', label:'Overview' },
    { id:'docs', label:'Docs' },
    { id:'calendar', label:'Calendar' },
    { id:'crm', label:'CRM' },
    { id:'commerce', label:'Commerce' },
    { id:'finance', label:'Finance' },
    { id:'legal', label:'Legal' },
    { id:'builder', label:'Builder' },
    { id:'automation', label:'Automation' }
  ];
  const state = {
    actions: bridge?.ACTIONS || [],
    packets: [],
    health: null,
    calendar: null,
    founderStatus: null,
    founderActions: null,
    automation: null,
    pwa: null,
    commerceOrders: null,
    commerceAnalytics: null,
    aeFlowContact: null,
    aeFlowJournal: null,
    activePanel: PANELS.some((item)=>item.id === params.get('panel')) ? params.get('panel') : 'overview'
  };

  function note(msg, kind=''){ setStatus(statusEl, msg, kind); }
  function esc(value){ return safe(String(value || '')); }
  function value(...items){ return items.map((item)=>String(item || '').trim()).find(Boolean) || ''; }
  function capLabel(value){
    return ({
      live_api:'Live API',
      verified_gated_app:'Verified app',
      packet_bridge:'Packet bridge',
      needs_adapter:'Needs adapter'
    })[value] || value || 'Packet bridge';
  }
  function bridgeLabel(value){
    return ({
      direct_api:'Direct API',
      fragment_handoff:'Fragment handoff',
      workflow_packet:'Workflow packet',
      command_bridge_event:'Command event',
      automation_thread_attach:'Thread attach'
    })[value] || value || 'Workflow packet';
  }

  function context(){
    return {
      mailbox:value(params.get('mailbox'), window.SMVRuntime?.getActiveMailbox?.()),
      messageId:value(params.get('message_id'), params.get('id')),
      threadId:value(params.get('thread_id')),
      subject:value(params.get('subject')),
      from:value(params.get('from')),
      to:value(params.get('to')),
      snippet:value(params.get('snippet')),
      returnUrl:value(params.get('return'), document.referrer, location.href)
    };
  }

  function contextKind(ctx){
    if(ctx.messageId) return 'Message';
    if(ctx.threadId) return 'Thread';
    if(ctx.subject) return 'Draft';
    return 'Mailbox';
  }

  function actionsFor(panel){
    if(panel === 'overview') return state.actions;
    return state.actions.filter((action)=> (action.panel || action.nativePanel || '') === panel);
  }

  function countByCapability(type){
    return state.actions.filter((action)=>action.capability === type).length;
  }

  function healthById(id){
    const checks = state.health?.checks || [];
    return checks.find((item)=>item.action_id === id) || null;
  }

  function renderContext(){
    const ctx = context();
    qs('#workspaceBadge').textContent = ctx.mailbox ? `Mailbox • ${ctx.mailbox}` : 'Mailbox context ready';
    qs('#contextKind').textContent = contextKind(ctx);
    qs('#liveApiCount').textContent = String(countByCapability('live_api'));
    qs('#verifiedAppCount').textContent = String(countByCapability('verified_gated_app'));
    qs('#contextPanel').innerHTML = `
      <div class="workspace-context-row"><span>Mailbox</span><b>${esc(ctx.mailbox || 'active session')}</b></div>
      <div class="workspace-context-row"><span>Subject</span><b>${esc(ctx.subject || 'No selected subject')}</b></div>
      <div class="workspace-context-row"><span>Message</span><b>${esc(ctx.messageId || ctx.threadId || 'No selected message')}</b></div>
      <div class="workspace-context-row"><span>Sender</span><b>${esc(ctx.from || 'Not supplied')}</b></div>`;
  }

  function renderHealth(){
    const node = qs('#integrationHealth');
    if(!state.health){
      node.innerHTML = '<span class="cap-badge">route check pending</span>';
      return;
    }
    const summary = state.health.summary || {};
    const failed = Number(summary.failed || 0);
    node.innerHTML = `
      <span class="cap-badge ${failed ? 'warn' : 'ok'}">${esc(summary.reachable_or_gated || 0)}/${esc(summary.total || 0)} reachable or gated</span>
      <span class="cap-badge">${esc(countByCapability('packet_bridge'))} packet bridge</span>
      <span class="cap-badge">no iframe</span>`;
  }

  function renderTabs(){
    qs('#dockTabs').innerHTML = PANELS.map((panel)=>`
      <button class="workspace-tab ${panel.id === state.activePanel ? 'active' : ''}" type="button" data-panel="${esc(panel.id)}">${esc(panel.label)}</button>
    `).join('');
    qsa('[data-panel]').forEach((btn)=> btn.onclick = ()=> {
      state.activePanel = btn.dataset.panel;
      renderTabs();
      renderPanel();
    });
  }

  function actionCard(action, options = {}){
    const ctx = context();
    const health = healthById(action.id);
    const routeText = health ? `${health.status}${health.gated ? ' gated' : ''}` : 'unchecked';
    const openUrl = action.id === 'skydocxmax-editor' ? bridge.skyeDocxUrl(ctx) : bridge.toolUrl(action, ctx);
    const isLiveApi = action.capability === 'live_api';
    const openLabel = 'Open app';
    const packetLabel = isLiveApi ? (options.liveLabel || 'Run + receipt') : (options.packetLabel || 'Create packet');
    return `
      <article class="workspace-action-card" data-action-card="${esc(action.id)}">
        <div>
          <div class="workspace-action-top">
            <strong>${esc(action.label)}</strong>
            <span class="cap-badge ${esc(action.capability)}">${esc(capLabel(action.capability))}</span>
          </div>
          <span>${esc(action.summary || action.detail || action.lane || '')}</span>
          <div class="chiprow">
            <span class="chip">${esc(bridgeLabel(action.bridge))}</span>
            <span class="chip">${esc(routeText)}</span>
            ${(action.talksTo || []).slice(0, 3).map((item)=>`<span class="chip">${esc(item)}</span>`).join('')}
          </div>
        </div>
        <div class="btnrow">
          <a class="btn small gold" href="${esc(openUrl)}" target="_blank" rel="noopener" data-open-action="${esc(action.id)}">${esc(openLabel)}</a>
          <button class="btn small" type="button" data-archive-action="${esc(action.id)}">${esc(packetLabel)}</button>
        </div>
      </article>`;
  }

  function renderActionRows(actions, packetLabel){
    if(!actions.length) return '<div class="empty">No verified action is mapped to this panel yet.</div>';
    return `<div class="workspace-action-row">${actions.map((action)=>actionCard(action, { packetLabel })).join('')}</div>`;
  }

  function renderOverview(){
    const summary = state.health?.summary || {};
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">
          <div class="workspace-status-grid">
            <div class="stat"><b>${esc(countByCapability('live_api'))}</b><span class="mini">direct 0S API lanes</span></div>
            <div class="stat"><b>${esc(countByCapability('verified_gated_app'))}</b><span class="mini">verified gated apps</span></div>
            <div class="stat"><b>${esc(countByCapability('packet_bridge'))}</b><span class="mini">packet bridges</span></div>
            <div class="stat"><b>${esc(summary.reachable_or_gated || 0)}</b><span class="mini">routes checked</span></div>
          </div>
          <div class="hr"></div>
          ${renderActionRows(state.actions.filter((action)=>['live_api','packet_bridge'].includes(action.capability)).slice(0, 6), 'Packet')}
        </section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Runtime</div>
          <div class="workspace-context">
            <div class="workspace-context-row"><span>Packets</span><b>${esc(state.packets.length)}</b></div>
            <div class="workspace-context-row"><span>Auth lane</span><b>shared 0S gate</b></div>
            <div class="workspace-context-row"><span>Embed mode</span><b>none</b></div>
            <div class="workspace-context-row"><span>Latest check</span><b>${esc(state.health?.generated_at ? fmtDate(state.health.generated_at) : 'pending')}</b></div>
          </div>
        </aside>
      </div>`;
  }

  function renderDocs(){
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">
          ${renderActionRows(actionsFor('docs'), 'Docs packet')}
        </section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Document lane</div>
          <button class="btn gold full" type="button" id="dockOpenDocx">Open SkyeDocxMax</button>
          <button class="btn full" type="button" data-quick-packet="sovereigndocs-packet-builder">Archive packet</button>
        </aside>
      </div>`;
  }

  function renderCalendar(){
    const events = [...(state.calendar?.live_events || []), ...(state.calendar?.ledger || [])].slice(0, 8);
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">
          <div class="calendar-mini-form">
            <label>Summary<input id="calSummary" value="${esc(context().subject || 'SkyeMail follow-up')}" /></label>
            <label>Start<input id="calStart" type="datetime-local" /></label>
            <label>End<input id="calEnd" type="datetime-local" /></label>
            <label>Attendee<input id="calAttendee" value="${esc(context().from || '')}" /></label>
            <button class="btn gold" id="createCalendarEventBtn" type="button">Create event</button>
            <button class="btn" id="loadCalendarBtn" type="button">Load events</button>
          </div>
          <div class="mailtable workspace-list">
            ${events.length ? events.map((event)=>`
              <article class="mail">
                <div class="mail-main">
                  <div class="mail-top"><div><div class="mail-subject">${esc(event.summary || event.title || 'Calendar event')}</div><div class="mail-from">${esc(event.start?.dateTime || event.start_at || event.created_at || '')}</div></div><span class="chip">${esc(event.status || 'calendar')}</span></div>
                  <div class="mail-snippet">${esc(event.description || event.notes || '')}</div>
                </div>
              </article>`).join('') : '<div class="empty">Calendar events are not loaded yet.</div>'}
          </div>
        </section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Calendar route</div>
          <div class="workspace-context">
            <div class="workspace-context-row"><span>API</span><b>/api/founder-command/calendar</b></div>
            <div class="workspace-context-row"><span>Provider</span><b>${esc(state.calendar?.provider?.configured ? 'configured' : 'ledger/fallback')}</b></div>
          </div>
        </aside>
      </div>`;
  }

  function renderCrm(){
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">
          ${renderActionRows(actionsFor('crm'), 'CRM packet')}
          ${state.aeFlowContact ? `<div class="notice"><b>AE Flow contact captured</b><br><span class="mini">${esc(state.aeFlowContact.mailHandoffPacket?.summary?.directApi?.result?.captured?.contact_id || state.aeFlowContact.mailHandoffPacket?.summary?.directApi?.status || 'Contact sync completed.')}</span></div>` : ''}
          ${state.aeFlowJournal ? `<div class="notice"><b>AE Flow journal written</b><br><span class="mini">${esc(state.aeFlowJournal.mailHandoffPacket?.summary?.directApi?.result?.entry?.id || state.aeFlowJournal.mailHandoffPacket?.summary?.directApi?.status || 'Journal sync completed.')}</span></div>` : ''}
        </section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Command event</div>
          <label>Event summary<textarea id="crmSummary">${esc(context().subject || context().snippet || 'SkyeMail CRM follow-up')}</textarea></label>
          <button class="btn gold full" id="recordCrmEventBtn" type="button">Record CRM event</button>
          <button class="btn full" id="captureAeFlowContactBtn" type="button">Capture contact</button>
          <button class="btn full" id="journalAeFlowBtn" type="button">Write journal</button>
          <div class="mini" id="crmEventStatus">Ready.</div>
        </aside>
      </div>`;
  }

  function renderCommerce(){
    const orderResult = state.commerceOrders?.mailHandoffPacket?.summary?.directApi?.result?.orders
      || state.commerceOrders?.mailHandoffPacket?.summary?.directApi?.result
      || {};
    const orders = Array.isArray(orderResult) ? orderResult
      : Array.isArray(orderResult.orders) ? orderResult.orders
      : orderResult.order ? [orderResult.order]
      : [];
    const orderCount = Array.isArray(orders) && orders.length ? orders.length : Number(orderResult.count || 0);
    const analytics = state.commerceAnalytics?.mailHandoffPacket?.summary?.directApi?.result?.analytics
      || state.commerceAnalytics?.mailHandoffPacket?.summary?.directApi?.result?.summary
      || {};
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">
          ${renderActionRows(actionsFor('commerce'), 'Commerce sync')}
          <div class="workspace-status-grid">
            <div class="stat"><b>${esc(orderCount)}</b><span class="mini">orders loaded from SkyeCommerce</span></div>
            <div class="stat"><b>${esc(analytics.total_orders || analytics.orders || analytics.order_count || 0)}</b><span class="mini">analytics orders</span></div>
            <div class="stat"><b>${esc(analytics.gross_revenue || analytics.revenue || analytics.total_revenue || 0)}</b><span class="mini">analytics revenue signal</span></div>
          </div>
          <div class="mailtable workspace-list">
            ${Array.isArray(orders) && orders.length ? orders.slice(0, 8).map((order)=>`
              <article class="mail">
                <div class="mail-main">
                  <div class="mail-top"><div><div class="mail-subject">${esc(order.customer_email || order.email || order.id || 'Commerce order')}</div><div class="mail-from">${esc(order.status || order.payment_status || 'order')}</div></div><span class="chip">${esc(order.total || order.amount || order.total_cents || '')}</span></div>
                  <div class="mail-snippet">${esc(order.summary || order.notes || order.created_at || '')}</div>
                </div>
              </article>`).join('') : '<div class="empty">Load SkyeCommerce orders to bring store context into the mailbox workspace.</div>'}
          </div>
        </section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Commerce bridge</div>
          <button class="btn gold full" id="loadCommerceOrdersBtn" type="button">Load orders</button>
          <button class="btn full" id="loadCommerceAnalyticsBtn" type="button">Load analytics</button>
          <div class="mini" id="commerceStatus">Ready.</div>
        </aside>
      </div>`;
  }

  function renderFinance(){
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">${renderActionRows(actionsFor('finance'), 'Finance packet')}</section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Finance bridge</div>
          <button class="btn full" data-quick-packet="profit-console" type="button">Packet to Profit</button>
          <button class="btn full" data-quick-packet="split-engine" type="button">Packet to Split</button>
        </aside>
      </div>`;
  }

  function renderLegal(){
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">${renderActionRows(actionsFor('legal'), 'Legal packet')}</section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Evidence bridge</div>
          <button class="btn full" data-quick-packet="audit-ledger" type="button">Packet to audit</button>
          <button class="btn full" data-quick-packet="skyevaultpro-drive" type="button">Packet to vault</button>
        </aside>
      </div>`;
  }

  function renderBuilder(){
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">
          ${renderActionRows(actionsFor('builder'), 'Build packet')}
          ${state.pwa ? `<div class="notice"><b>${esc(state.pwa.manifest?.name || 'PWA manifest')}</b><br><span class="mini">${esc(state.pwa.manifest?.description || state.pwa.provider_path || 'Manifest generated.')}</span></div>` : ''}
        </section>
        <aside class="workspace-panel-side">
          <div class="rail-title">PWA Factory</div>
          <button class="btn gold full" id="analyzePwaBtn" type="button">Analyze selected mail</button>
          <div class="mini" id="pwaStatus">Ready.</div>
        </aside>
      </div>`;
  }

  function renderAutomation(){
    const actions = state.founderActions?.actions || [];
    return `
      <div class="workspace-panel-grid">
        <section class="workspace-panel-main">
          <div class="workspace-status-grid">
            <div class="stat"><b>${esc(state.founderStatus?.ok === false ? 'Check' : 'Ready')}</b><span class="mini">Founder status route</span></div>
            <div class="stat"><b>${esc(actions.length || 0)}</b><span class="mini">allowlisted actions</span></div>
            <div class="stat"><b>${esc(state.automation?.providers?.total || state.automation?.providers?.ready || 0)}</b><span class="mini">automation providers</span></div>
          </div>
          <div class="hr"></div>
          ${renderActionRows(actionsFor('automation'), 'Command packet')}
          <div class="workspace-action-row">
            ${actions.slice(0, 6).map((action)=>`
              <article class="workspace-action-card compact">
                <div>
                  <div class="workspace-action-top"><strong>${esc(action.label)}</strong><span class="cap-badge ${esc(action.risk || 'low')}">${esc(action.risk || 'low')}</span></div>
                  <span>${esc(action.description || action.target || '')}</span>
                  <div class="chiprow"><span class="chip">${esc(action.method || '')}</span><span class="chip">${esc(action.target || '')}</span></div>
                </div>
              </article>`).join('')}
          </div>
        </section>
        <aside class="workspace-panel-side">
          <div class="rail-title">Automation</div>
          <button class="btn full" id="loadFounderStatusBtn" type="button">Load Founder status</button>
          <button class="btn full" id="loadFounderActionsBtn" type="button">Load actions</button>
          <button class="btn full" id="loadAutomationStatusBtn" type="button">Load 0S automation</button>
        </aside>
      </div>`;
  }

  function renderPanel(){
    const panel = qs('#dockPanel');
    qs('#dockStatus').textContent = `${PANELS.find((item)=>item.id === state.activePanel)?.label || 'Dock'} panel`;
    panel.innerHTML = ({
      overview: renderOverview,
      docs: renderDocs,
      calendar: renderCalendar,
      crm: renderCrm,
      commerce: renderCommerce,
      finance: renderFinance,
      legal: renderLegal,
      builder: renderBuilder,
      automation: renderAutomation
    })[state.activePanel]();
    bindPanelActions(panel);
  }

  function groupedActions(){
    return state.actions.reduce((groups, action)=> {
      const group = action.group || '0S';
      if(!groups[group]) groups[group] = [];
      groups[group].push(action);
      return groups;
    }, {});
  }

  function renderActions(){
    const grid = qs('#actionGrid');
    const groups = groupedActions();
    grid.innerHTML = Object.entries(groups).map(([group, actions])=>`
      <section class="workspace-action-band">
        <div class="rail-title">${esc(group)}</div>
        <div class="workspace-action-row">${actions.map((action)=>actionCard(action)).join('')}</div>
      </section>`).join('');
    bindPanelActions(grid);
  }

  function renderPackets(){
    const list = qs('#packetList');
    qs('#packetCount')?.remove?.();
    qs('#packetStatus').textContent = `${state.packets.length} packet${state.packets.length === 1 ? '' : 's'} available`;
    if(!state.packets.length){
      list.innerHTML = '<div class="empty">No handoff packets yet.</div>';
      return;
    }
    list.innerHTML = state.packets.slice(0, 8).map((packet)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${esc(packet.label || '0S handoff packet')}</div>
              <div class="mail-from">${esc(packet.mailbox?.mailboxEmail || packet.mailbox?.googleEmail || packet.mailbox?.mailbox || 'SkyeMail')}</div>
            </div>
            <div class="mini">${esc(fmtDate(packet.updatedAt || packet.createdAt || ''))}</div>
          </div>
          <div class="mail-snippet">${esc(packet.notes || 'No notes saved.')}</div>
          <div class="mail-meta">
            ${(packet.summary?.targetPlatforms || []).map((target)=>`<span class="chip">${esc(target)}</span>`).join('')}
            ${(packet.summary?.capabilities || []).map((target)=>`<span class="chip">${esc(capLabel(target))}</span>`).join('')}
            <span class="chip">${esc(packet.review?.status || 'draft')}</span>
            <span class="chip">${esc(packet.execution?.status || 'queued')}</span>
          </div>
        </div>
      </article>`).join('');
  }

  async function packetAction(actionId, msg){
    try{
      note(msg || `Archiving ${actionId} packet...`);
      const data = await bridge.archiveHandoff(actionId, context());
      note(`Archived ${data.mailHandoffPacket?.packetId || '0S packet'}.`, 'ok');
      await refreshPackets();
      renderPanel();
    }catch(err){ note(err.message || '0S packet archive failed.', 'danger'); }
  }

  function bindPanelActions(root = document){
    root.querySelectorAll('[data-open-action]').forEach((link)=> {
      link.onclick = (event)=> {
        event.preventDefault();
        if(bridge.openWithPocket) bridge.openWithPocket(link.dataset.openAction, context());
        else window.open(link.href, '_blank', 'noopener');
        SMV.trackGame(link.dataset.openAction === 'skydocxmax-editor' ? 'docx_handoff' : 'os_handoff');
      };
    });
    root.querySelectorAll('[data-archive-action]').forEach((btn)=> btn.onclick = ()=> packetAction(btn.dataset.archiveAction));
    root.querySelectorAll('[data-quick-packet]').forEach((btn)=> btn.onclick = ()=> packetAction(btn.dataset.quickPacket));
    const dockOpenDocx = root.querySelector('#dockOpenDocx');
    if(dockOpenDocx) dockOpenDocx.onclick = ()=> bridge.openSkyeDocx(context());
    const loadCalendar = root.querySelector('#loadCalendarBtn');
    if(loadCalendar) loadCalendar.onclick = loadCalendarPanel;
    const createCalendar = root.querySelector('#createCalendarEventBtn');
    if(createCalendar) createCalendar.onclick = createCalendarPanelEvent;
    const recordCrm = root.querySelector('#recordCrmEventBtn');
    if(recordCrm) recordCrm.onclick = recordCrmPanelEvent;
    const captureAeFlow = root.querySelector('#captureAeFlowContactBtn');
    if(captureAeFlow) captureAeFlow.onclick = captureAeFlowContactPanel;
    const journalAeFlow = root.querySelector('#journalAeFlowBtn');
    if(journalAeFlow) journalAeFlow.onclick = journalAeFlowPanel;
    const loadCommerceOrders = root.querySelector('#loadCommerceOrdersBtn');
    if(loadCommerceOrders) loadCommerceOrders.onclick = loadCommerceOrdersPanel;
    const loadCommerceAnalytics = root.querySelector('#loadCommerceAnalyticsBtn');
    if(loadCommerceAnalytics) loadCommerceAnalytics.onclick = loadCommerceAnalyticsPanel;
    const analyzePwa = root.querySelector('#analyzePwaBtn');
    if(analyzePwa) analyzePwa.onclick = analyzePwaPanel;
    const loadFounderStatus = root.querySelector('#loadFounderStatusBtn');
    if(loadFounderStatus) loadFounderStatus.onclick = loadFounderStatusPanel;
    const loadFounderActions = root.querySelector('#loadFounderActionsBtn');
    if(loadFounderActions) loadFounderActions.onclick = loadFounderActionsPanel;
    const loadAutomationStatus = root.querySelector('#loadAutomationStatusBtn');
    if(loadAutomationStatus) loadAutomationStatus.onclick = loadAutomationStatusPanel;
  }

  async function loadCalendarPanel(){
    try{
      note('Loading 0S calendar...');
      state.calendar = await bridge.listCalendarEvents(8);
      note('Calendar loaded.', 'ok');
      renderPanel();
    }catch(err){ note(err.message || 'Calendar load failed.', 'danger'); }
  }

  async function createCalendarPanelEvent(){
    try{
      const summary = value(qs('#calSummary')?.value, context().subject, 'SkyeMail follow-up');
      const start = qs('#calStart')?.value;
      const end = qs('#calEnd')?.value;
      const attendee = qs('#calAttendee')?.value;
      if(!start || !end) throw new Error('Start and end are required.');
      note('Creating 0S calendar event...');
      await bridge.createCalendarEvent({
        summary,
        description: context().snippet || `Created from SkyeMail ${contextKind(context()).toLowerCase()} context.`,
        start_at:new Date(start).toISOString(),
        end_at:new Date(end).toISOString(),
        attendee_email:attendee,
        source:'skymail-workbench'
      });
      await loadCalendarPanel();
    }catch(err){ note(err.message || 'Calendar event failed.', 'danger'); }
  }

  async function recordCrmPanelEvent(){
    const out = qs('#crmEventStatus');
    try{
      out.textContent = 'Recording...';
      const summary = value(qs('#crmSummary')?.value, context().subject, 'SkyeMail CRM follow-up');
      const data = await bridge.recordCommandEvent(context(), {
        summary,
        source_surface:'workspace-crm',
        event_type:'skymail.crm.follow_up',
        status:'recorded',
        entity_kind:context().messageId ? 'message' : 'mailbox',
        lane:'crm'
      });
      out.textContent = data.receipt?.id || 'CRM event recorded.';
      await packetAction('crm-pipeline', 'Archiving CRM packet...');
    }catch(err){
      out.textContent = err.message || 'CRM event failed.';
      note(out.textContent, 'danger');
    }
  }

  async function captureAeFlowContactPanel(){
    const out = qs('#crmEventStatus');
    try{
      out.textContent = 'Capturing contact...';
      state.aeFlowContact = await bridge.aeFlowContactCapture(context());
      const direct = state.aeFlowContact?.mailHandoffPacket?.summary?.directApi;
      if(direct && direct.ok === false) throw new Error(direct.error || direct.result?.error || 'AE Flow contact capture failed.');
      out.textContent = direct?.result?.captured?.contact_id || 'AE Flow contact captured.';
      note('AE Flow contact capture completed.', 'ok');
      await refreshPackets();
      renderPanel();
    }catch(err){
      out.textContent = err.message || 'AE Flow contact capture failed.';
      note(out.textContent, 'danger');
    }
  }

  async function journalAeFlowPanel(){
    const out = qs('#crmEventStatus');
    try{
      out.textContent = 'Writing journal...';
      state.aeFlowJournal = await bridge.aeFlowJournal(context());
      const direct = state.aeFlowJournal?.mailHandoffPacket?.summary?.directApi;
      if(direct && direct.ok === false) throw new Error(direct.error || direct.result?.error || 'AE Flow journal failed.');
      out.textContent = direct?.result?.entry?.id || 'AE Flow journal written.';
      note('AE Flow journal completed.', 'ok');
      await refreshPackets();
      renderPanel();
    }catch(err){
      out.textContent = err.message || 'AE Flow journal failed.';
      note(out.textContent, 'danger');
    }
  }

  async function loadCommerceOrdersPanel(){
    const out = qs('#commerceStatus');
    try{
      out.textContent = 'Loading orders...';
      state.commerceOrders = await bridge.commerceOrders(context());
      const direct = state.commerceOrders?.mailHandoffPacket?.summary?.directApi;
      if(direct && direct.ok === false) throw new Error(direct.error || direct.result?.error || 'SkyeCommerce orders failed.');
      out.textContent = 'SkyeCommerce orders loaded.';
      note('SkyeCommerce orders loaded into the workbench.', 'ok');
      await refreshPackets();
      renderPanel();
    }catch(err){
      out.textContent = err.message || 'SkyeCommerce orders failed.';
      note(out.textContent, 'danger');
    }
  }

  async function loadCommerceAnalyticsPanel(){
    const out = qs('#commerceStatus');
    try{
      out.textContent = 'Loading analytics...';
      state.commerceAnalytics = await bridge.commerceAnalytics(context());
      const direct = state.commerceAnalytics?.mailHandoffPacket?.summary?.directApi;
      if(direct && direct.ok === false) throw new Error(direct.error || direct.result?.error || 'SkyeCommerce analytics failed.');
      out.textContent = 'SkyeCommerce analytics loaded.';
      note('SkyeCommerce analytics loaded into the workbench.', 'ok');
      await refreshPackets();
      renderPanel();
    }catch(err){
      out.textContent = err.message || 'SkyeCommerce analytics failed.';
      note(out.textContent, 'danger');
    }
  }

  async function analyzePwaPanel(){
    const out = qs('#pwaStatus');
    try{
      out.textContent = 'Analyzing...';
      state.pwa = await bridge.analyzePwaFromMail(context());
      out.textContent = state.pwa.audit_id || 'Manifest ready.';
      note('PWA Factory returned a manifest.', 'ok');
      renderPanel();
    }catch(err){
      out.textContent = err.message || 'PWA analyze failed.';
      note(out.textContent, 'danger');
    }
  }

  async function loadFounderStatusPanel(){
    try{
      note('Loading Founder status...');
      state.founderStatus = await bridge.founderStatus();
      note('Founder status loaded.', 'ok');
      renderPanel();
    }catch(err){ note(err.message || 'Founder status failed.', 'danger'); }
  }

  async function loadFounderActionsPanel(){
    try{
      note('Loading Founder actions...');
      state.founderActions = await bridge.founderActions();
      note('Founder action catalog loaded.', 'ok');
      renderPanel();
    }catch(err){ note(err.message || 'Founder actions failed.', 'danger'); }
  }

  async function loadAutomationStatusPanel(){
    try{
      note('Loading 0S automation runtime...');
      state.automation = await bridge.automationStatus();
      note('0S automation status loaded.', 'ok');
      renderPanel();
    }catch(err){ note(err.message || '0S automation status failed.', 'danger'); }
  }

  async function refreshActions(){
    try{
      const data = await apiFetch('/mail-os-actions');
      if(Array.isArray(data.actions) && data.actions.length) state.actions = bridge.setActions(data.actions);
    }catch(_err){}
    renderContext();
    renderActions();
  }

  async function refreshHealth(){
    try{
      state.health = await apiFetch('/mail-os-health');
    }catch(err){
      state.health = { ok:false, summary:{ total:state.actions.length, reachable_or_gated:0, failed:state.actions.length }, checks:[], error:err.message || 'route check failed' };
    }
    renderHealth();
  }

  async function refreshPackets(){
    try{
      const data = await apiFetch('/runtime/mail-handoff-packets');
      state.packets = Array.isArray(data.items) ? data.items : [];
    }catch(_err){
      state.packets = [];
    }
    renderPackets();
  }

  function bindQuickLinks(){
    const ctx = context();
    qs('#calendarLink').href = bridge.toolUrl('founder-calendar', ctx);
    qs('#crmLink').href = bridge.toolUrl('crm-pipeline', ctx);
    qs('#auditLink').href = bridge.toolUrl('audit-ledger', ctx);
    qs('#openDocxBtn').onclick = ()=> bridge.openSkyeDocx(ctx);
    qs('#archiveContextBtn').onclick = ()=> packetAction('founder-command-bridge', 'Archiving workbench context...');
    qs('#refreshWorkbenchBtn').onclick = async ()=> {
      await refreshActions();
      await Promise.all([refreshPackets(), refreshHealth()]);
      renderPanel();
      note('Workbench refreshed.', 'ok');
    };
  }

  renderContext();
  renderTabs();
  bindQuickLinks();
  bridge.mountPocket?.(context());
  await refreshActions();
  await Promise.all([refreshPackets(), refreshHealth()]);
  renderPanel();
  SMV.trackGame('workspace_open');
  note('0S Workbench ready.', 'ok');
})();
