(async function(){
  const boot = await SMV.withBoot(document.body.dataset.pageId, document.body.dataset.pageName, document.body.dataset.pageHint);
  if(!boot) return;
  const runtime = window.SMVRuntime || { href: (value) => value, redirect: (value) => { location.href = value; } };

  const statusEl = qs('#statusText');
  const badgeEl = qs('#mailboxBadge');
  const watchEl = qs('#watchText');
  const listEl = qs('#mailList');
  const pageTokenEl = qs('#pageTokenText');
  const state = { nextPageToken:null, currentToken:null, prevStack:[], viewLabel: document.body.dataset.label || '', items:[] };
  const runtimeState = { available:false, packets:[], latestPacket:null };
  const runtimeStatusEl = qs('#runtimeStatus');
  const runtimeArchiveListEl = qs('#runtimeArchiveList');
  const runtimePacketCountEl = qs('#runtimePacketCount');
  const runtimeSelectionCountEl = qs('#runtimeSelectionCount');
  const runtimeLatestTargetsEl = qs('#runtimeLatestTargets');
  const reviewBoardStatusEl = qs('#reviewBoardStatus');
  const reviewOwnerEl = qs('#reviewOwner');
  const reviewStatusEl = qs('#reviewStatus');
  const reviewCheckpointEl = qs('#reviewCheckpoint');
  const reviewNotesEl = qs('#reviewNotes');
  const reviewReadyCountEl = qs('#reviewReadyCount');
  const reviewBlockedCountEl = qs('#reviewBlockedCount');
  const reviewUnassignedCountEl = qs('#reviewUnassignedCount');
  const executionBoardStatusEl = qs('#executionBoardStatus');
  const executionOwnerEl = qs('#executionOwner');
  const executionStatusEl = qs('#executionStatus');
  const executionCheckpointEl = qs('#executionCheckpoint');
  const executionDueAtEl = qs('#executionDueAt');
  const executionNextActionEl = qs('#executionNextAction');
  const executionNotesEl = qs('#executionNotes');
  const executionQueuedCountEl = qs('#executionQueuedCount');
  const executionActiveCountEl = qs('#executionActiveCount');
  const executionBlockedCountEl = qs('#executionBlockedCount');
  const dispatchBoardStatusEl = qs('#dispatchBoardStatus');
  const dispatchOwnerEl = qs('#dispatchOwner');
  const dispatchStatusEl = qs('#dispatchStatus');
  const dispatchCheckpointEl = qs('#dispatchCheckpoint');
  const dispatchChannelEl = qs('#dispatchChannel');
  const dispatchNextActionEl = qs('#dispatchNextAction');
  const dispatchNotesEl = qs('#dispatchNotes');
  const dispatchQueuedCountEl = qs('#dispatchQueuedCount');
  const dispatchReadyCountEl = qs('#dispatchReadyCount');
  const dispatchBlockedCountEl = qs('#dispatchBlockedCount');
  const workflowTimelineStatusEl = qs('#workflowTimelineStatus');
  const workflowTimelineListEl = qs('#workflowTimelineList');
  const timelineArchiveCountEl = qs('#timelineArchiveCount');
  const timelineReviewCountEl = qs('#timelineReviewCount');
  const timelineDispatchCountEl = qs('#timelineDispatchCount');
  const calendarStatusEl = qs('#calendarStatus');
  const calendarListEl = qs('#calendarList');
  const calendarTopicEl = qs('#calendarTopic');
  const calendarStartEl = qs('#calendarStart');
  const calendarEndEl = qs('#calendarEnd');
  const calendarAttendeeEl = qs('#calendarAttendee');
  const calendarNotesEl = qs('#calendarNotes');
  const calendarLedgerOnlyEl = qs('#calendarLedgerOnly');
  const handoffLabelEl = qs('#handoffLabel');
  const handoffNotesEl = qs('#handoffNotes');
  const handoffTargetsEl = qs('#handoffTargets');
  const ZERO_OS_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';

  function setNote(msg, kind=''){ setStatus(statusEl, msg, kind); }
  function setCalendarNote(msg, kind=''){ setStatus(calendarStatusEl, msg, kind); }
  function displayProviderName(value){
    return value ? 'Citadel/SkyeNet' : 'SkyeMail';
  }

  function localDateTimeToIso(value){
    if(!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || '') : date.toISOString();
  }

  async function zeroOsFetch(path, opts = {}){
    const token = getToken();
    if(!token) throw new Error('Login through the shared 0S gate to sync calendar.');
    const headers = Object.assign({
      Accept:'application/json',
      'Content-Type':'application/json',
      Authorization:`Bearer ${token}`,
      'x-free99-gate-session':token,
      'x-skye-gate-session':token,
      'x-skygate-session':token,
      'x-skye-platform':'skymail',
      'x-skye-usage-lane':'calendar'
    }, opts.headers || {});
    const res = await fetch(`${ZERO_OS_ORIGIN}${path}`, Object.assign({}, opts, {
      credentials:'omit',
      headers
    }));
    const text = await res.text();
    let data = {};
    try{ data = text ? JSON.parse(text) : {}; }catch(_err){ data = { error:'Non-JSON 0S response', raw:text }; }
    if(!res.ok || data.ok === false){
      const err = new Error(data.error || `0S calendar request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function setHeaderStatus(status){
    if(status && status.connected && status.mailbox){
      const mailboxEmail = status.mailbox.mailbox_email || status.mailbox.google_email || status.mailbox.email || '';
      badgeEl.textContent = `Connected mailbox • ${mailboxEmail}`;
      watchEl.textContent = `Route ${status.mailbox.provisioning_status || status.mailbox.watch_status || 'active'} • mail lane ${displayProviderName(status.mailbox.provider)}`;
    } else {
      badgeEl.textContent = 'No SkyeMail mailbox provisioned';
      watchEl.textContent = 'Provision a Citadel/SkyeNet SkyeMail mailbox on the onboarding page.';
    }
  }

  function selectedIds(){ return SMV.getCheckedIds(); }
  function updateSelectionSummary(){
    const count = selectedIds().length;
    const summaryEl = qs('#selectionSummary');
    if(summaryEl) summaryEl.textContent = count ? `${count} message${count===1?'':'s'} selected` : 'No messages selected';
    if(runtimeSelectionCountEl) runtimeSelectionCountEl.textContent = String(count);
  }

  function selectedTargetValues(){
    if(!handoffTargetsEl) return [];
    const targetMeta = {
      SkyeDocxMax:{ lane:'document-compose', reason:'Selected mail should open as an editable SkyeDocxMax document.' },
      SovereignDocs:{ lane:'governed-document-packet', reason:'Selected mail should become a governed document packet.' },
      SkyeCalendar:{ lane:'calendar-follow-up', reason:'Selected mail should become a scheduled 0S follow-up.' },
      VantaCoreCRM:{ lane:'crm-intake', reason:'Selected mail should enter CRM intake and relationship follow-up.' },
      SkyeProfitConsole:{ lane:'finance-review', reason:'Selected mail implies pricing, revenue, or margin review.' },
      SkyeSplitEngine:{ lane:'profit-split', reason:'Selected mail includes payout, partner, commission, or split context.' },
      SkyeProofAudit:{ lane:'audit-evidence', reason:'Selected mail should retain an evidence or audit trail.' },
      SaaSLaunchPacket:{ lane:'saas-launch', reason:'Selected mail should feed SaaS launch or client platform work.' },
      GovernmentCaseCommand:{ lane:'government-case', reason:'Selected mail should move into regulated, civic, agency, or case work.' },
      SkyeVaultPro:{ lane:'source-custody', reason:'Selected mail should be preserved with vault/source custody.' },
      PwaFactory:{ lane:'app-build', reason:'Selected mail should start an app, tool, or client deliverable build.' },
      SkyeLeadVault:{ lane:'crm-intake', reason:'Mail follow-up should enter the shared CRM lane.' },
      'AE-FlowPro':{ lane:'sales-follow-up', reason:'Selected mail should feed activation and follow-up.' },
      'skyeroutex-workforce-command-v0.4.0':{ lane:'ops-handoff', reason:'Selected mail implies ops, dispatch, or workforce work.' },
      SkyeProofx:{ lane:'evidence-review', reason:'Selected mail should retain an evidence or audit trail.' },
      SkyeWebCreatorMax:{ lane:'launch-build', reason:'Selected mail should feed storefront or launch build work.' }
    };
    return Array.from(handoffTargetsEl.selectedOptions || []).map((option) => ({
      platform: option.value,
      lane: targetMeta[option.value]?.lane || 'operator-handoff',
      reason: targetMeta[option.value]?.reason || 'Selected mail should stay attached to a downstream 0S operator lane.'
    }));
  }

  function suggestPacketLabel(){
    const active = state.items.find((item) => selectedIds().includes(item.id));
    if(active && active.subject) return `${document.body.dataset.pageName || 'Mail'} • ${active.subject}`.slice(0, 120);
    const mailbox = boot.status?.mailbox?.google_email || localStorage.getItem('SMV_HANDLE') || 'mailbox';
    return `${mailbox} • ${document.body.dataset.pageName || 'Inbox'} follow-up`;
  }

  async function runtimeFetch(path, opts = {}){
    const token = getToken();
    const res = await fetch(path, Object.assign({}, opts, {
      headers: Object.assign(
        { 'Content-Type':'application/json' },
        token ? { Authorization: `Bearer ${token}` } : {},
        opts.headers || {}
      )
    }));
    const text = await res.text();
    let data = {};
    try{ data = text ? JSON.parse(text) : {}; }catch(_err){ data = { error:'Non-JSON runtime response', raw:text }; }
    if(!res.ok){
      const err = new Error(data.error || `Runtime request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function renderRuntimeArchive(){
    if(!runtimeArchiveListEl) return;
    if(!runtimeState.available){
      runtimeArchiveListEl.innerHTML = '<div class="empty">Local SkyeMail runtime not detected on this origin.</div>';
      return;
    }
    if(!runtimeState.packets.length){
      runtimeArchiveListEl.innerHTML = '<div class="empty">No archived mail handoff packets yet.</div>';
      return;
    }
    runtimeArchiveListEl.innerHTML = runtimeState.packets.map((packet)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(packet.label || 'Mail handoff packet')}</div>
              <div class="mail-from">${safe(packet.mailbox?.googleEmail || 'Unknown mailbox')} • ${safe(packet.selection?.label || 'mail lane')}</div>
            </div>
            <div class="mini">${safe(fmtDate(packet.createdAt || ''))}</div>
          </div>
          <div class="mail-snippet">${safe(packet.notes || 'No operator notes saved for this packet yet.')}</div>
          <div class="mail-meta">
            <span class="chip">${safe(String(packet.selection?.selectedCount || 0))} selected</span>
            <span class="chip">${safe(packet.review?.status || 'draft')}</span>
            ${packet.review?.owner ? `<span class="chip">${safe(packet.review.owner)}</span>` : '<span class="chip">unassigned</span>'}
            ${(packet.summary?.targetPlatforms || []).map((platform)=>`<span class="chip">${safe(platform)}</span>`).join('')}
          </div>
        </div>
      </article>`).join('');
  }

  function reviewBoardCounts(packets){
    const counts = { ready:0, blocked:0, unassigned:0 };
    for(const packet of packets){
      if(packet.review?.status === 'ready') counts.ready += 1;
      if(packet.review?.status === 'blocked') counts.blocked += 1;
      if(!packet.review?.owner) counts.unassigned += 1;
    }
    return counts;
  }

  function syncReviewControls(packet){
    const review = packet?.review || {};
    if(reviewOwnerEl) reviewOwnerEl.value = review.owner || '';
    if(reviewStatusEl) reviewStatusEl.value = review.status || 'draft';
    if(reviewCheckpointEl) reviewCheckpointEl.value = review.checkpoint || '';
    if(reviewNotesEl) reviewNotesEl.value = review.notes || '';
    if(reviewBoardStatusEl){
      reviewBoardStatusEl.textContent = packet
        ? `Latest packet ${packet.packetId} • ${review.status || 'draft'}`
        : 'Waiting for a packet…';
    }
  }

  function asDatetimeLocal(value){
    if(!value) return '';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const pad = (part)=> String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function primaryTarget(packet){
    return Array.isArray(packet?.downstreamTargets) && packet.downstreamTargets.length ? packet.downstreamTargets[0] : null;
  }

  function suggestedExecutionNextAction(packet){
    return packet?.execution?.nextAction
      || packet?.recommendedActions?.[0]
      || (primaryTarget(packet)?.platform ? `Assign downstream owner and begin ${primaryTarget(packet).platform} follow-through.` : '');
  }

  function suggestedExecutionCheckpoint(packet){
    return packet?.execution?.checkpoint
      || packet?.review?.checkpoint
      || (primaryTarget(packet)?.platform ? `Ready to route ${primaryTarget(packet).platform} follow-through.` : '');
  }

  function suggestedDispatchChannel(packet){
    const target = primaryTarget(packet);
    if(packet?.dispatch?.channel) return packet.dispatch.channel;
    if(!target?.platform) return '';
    if(target.platform === 'SkyeLeadVault') return 'crm_launch_handoff';
    if(target.platform === 'VantaCoreCRM') return 'crm_launch_handoff';
    if(target.platform === 'AE-FlowPro') return 'activation_follow_through';
    if(target.platform === 'SkyeDocxMax') return 'document_compose_handoff';
    if(target.platform === 'SovereignDocs') return 'governed_document_handoff';
    if(target.platform === 'SkyeCalendar') return 'calendar_follow_up_handoff';
    if(target.platform === 'SkyeProfitConsole') return 'finance_review_handoff';
    if(target.platform === 'SkyeSplitEngine') return 'profit_split_handoff';
    if(target.platform === 'SkyeProofAudit') return 'audit_evidence_handoff';
    if(target.platform === 'SaaSLaunchPacket') return 'saas_launch_handoff';
    if(target.platform === 'GovernmentCaseCommand') return 'government_case_handoff';
    if(target.platform === 'SkyeVaultPro') return 'source_custody_handoff';
    if(target.platform === 'PwaFactory') return 'app_build_handoff';
    if(target.platform === 'skyeroutex-workforce-command-v0.4.0') return 'workforce_dispatch_handoff';
    if(target.platform === 'SkyeProofx') return 'proof_review_handoff';
    if(target.platform === 'SkyeWebCreatorMax') return 'launch_build_handoff';
    return String(target.lane || 'manual-handoff').replace(/[^a-z0-9]+/ig, '_').replace(/^_+|_+$/g, '').toLowerCase() + '_handoff';
  }

  function suggestedDispatchNextAction(packet){
    return packet?.dispatch?.nextAction
      || packet?.execution?.nextAction
      || packet?.recommendedActions?.[0]
      || (primaryTarget(packet)?.platform ? `Deliver the approved packet into ${primaryTarget(packet).platform}.` : '');
  }

  function suggestedDispatchCheckpoint(packet){
    return packet?.dispatch?.checkpoint
      || packet?.execution?.checkpoint
      || (primaryTarget(packet)?.platform ? `Dispatch approved for ${primaryTarget(packet).platform}.` : '');
  }

  function syncExecutionControls(packet){
    const execution = packet?.execution || {};
    if(executionOwnerEl) executionOwnerEl.value = execution.owner || '';
    if(executionStatusEl) executionStatusEl.value = execution.status || 'queued';
    if(executionCheckpointEl) executionCheckpointEl.value = suggestedExecutionCheckpoint(packet);
    if(executionDueAtEl) executionDueAtEl.value = asDatetimeLocal(execution.dueAt);
    if(executionNextActionEl) executionNextActionEl.value = suggestedExecutionNextAction(packet);
    if(executionNotesEl) executionNotesEl.value = execution.notes || '';
    if(executionBoardStatusEl){
      executionBoardStatusEl.textContent = packet?.execution
        ? `Latest packet ${packet.packetId} • ${execution.status || 'queued'}`
        : 'Waiting for a reviewed packet…';
    }
  }

  function syncDispatchControls(packet){
    const dispatch = packet?.dispatch || {};
    if(dispatchOwnerEl) dispatchOwnerEl.value = dispatch.owner || '';
    if(dispatchStatusEl) dispatchStatusEl.value = dispatch.status || 'queued';
    if(dispatchCheckpointEl) dispatchCheckpointEl.value = suggestedDispatchCheckpoint(packet);
    if(dispatchChannelEl) dispatchChannelEl.value = suggestedDispatchChannel(packet);
    if(dispatchNextActionEl) dispatchNextActionEl.value = suggestedDispatchNextAction(packet);
    if(dispatchNotesEl) dispatchNotesEl.value = dispatch.notes || '';
    if(dispatchBoardStatusEl){
      dispatchBoardStatusEl.textContent = packet?.dispatch
        ? `Latest packet ${packet.packetId} • ${dispatch.status || 'queued'}`
        : 'Waiting for an executed packet…';
    }
  }

  function renderWorkflowTimeline(timeline){
    if(!workflowTimelineListEl) return;
    const items = Array.isArray(timeline?.items) ? timeline.items : [];
    if(!items.length){
      workflowTimelineListEl.innerHTML = '<div class="empty">No workflow events recorded yet.</div>';
      if(workflowTimelineStatusEl) workflowTimelineStatusEl.textContent = 'No workflow activity yet.';
      return;
    }
    if(workflowTimelineStatusEl){
      const latest = timeline?.latestEvent;
      workflowTimelineStatusEl.textContent = latest
        ? `${items.length} recorded workflow event${items.length===1?'':'s'} • latest ${latest.category || 'workflow'} ${latest.status || 'update'}`
        : `${items.length} recorded workflow event${items.length===1?'':'s'} in local audit order`;
    }
    workflowTimelineListEl.innerHTML = items.map((event)=>`
      <article class="mail">
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(event.type || 'workflow_event')}</div>
              <div class="mail-from">${safe(event.packetId || 'no-packet')} • ${safe(event.owner || 'unassigned')}</div>
            </div>
            <div class="mini">${safe(fmtDate(event.createdAt || ''))}</div>
          </div>
          <div class="mail-snippet">${safe(event.detail || 'No workflow detail recorded.')}</div>
          <div class="mail-meta">
            <span class="chip">${safe(event.category || 'other')}</span>
            ${event.status ? `<span class="chip">${safe(event.status)}</span>` : ''}
            ${event.checkpoint ? `<span class="chip">${safe(event.checkpoint)}</span>` : ''}
            ${event.channel ? `<span class="chip">${safe(event.channel)}</span>` : ''}
          </div>
        </div>
      </article>`).join('');
  }

  function calendarDate(value){
    if(!value) return '';
    if(typeof value === 'string') return value;
    return value.dateTime || value.date || '';
  }

  function calendarRows(data){
    const live = Array.isArray(data?.live_events) ? data.live_events.map((item)=>({
      id: item.id || item.htmlLink || item.summary,
      source: 'Live',
      title: item.summary || item.id || 'Calendar event',
      status: item.status || 'scheduled',
      start: calendarDate(item.start),
      end: calendarDate(item.end),
      attendee: Array.isArray(item.attendees) ? item.attendees.map((row)=>row.email).filter(Boolean).join(', ') : '',
      href: item.htmlLink || ''
    })) : [];
    const ledger = Array.isArray(data?.ledger) ? data.ledger.map((item)=>({
      id: item.id || item.topic,
      source: 'Ledger',
      title: item.topic || item.summary || item.id || 'Calendar item',
      status: item.status || 'ledger',
      start: item.start_at || '',
      end: item.end_at || '',
      attendee: item.attendee_email || '',
      href: item.google_calendar?.htmlLink || ''
    })) : [];
    const seen = new Set();
    return [...live, ...ledger].filter((item)=> {
      const key = `${item.source}:${item.id}:${item.title}:${item.start}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 25);
  }

  function renderCalendar(data){
    if(!calendarListEl) return;
    const rows = calendarRows(data);
    if(!rows.length){
      calendarListEl.innerHTML = '<div class="empty">No calendar records yet.</div>';
      return;
    }
    calendarListEl.innerHTML = rows.map((item)=>`
      <article class="mail">
        <div class="mail-check"><span class="chip">${safe(item.source)}</span></div>
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject">${safe(item.title)}</div>
              <div class="mail-from">${safe(item.start ? fmtDate(item.start) : 'Needs schedule')}${item.end ? ` - ${safe(fmtDate(item.end))}` : ''}</div>
            </div>
            <div class="mini">${safe(item.status)}</div>
          </div>
          <div class="mail-snippet">${safe(item.attendee || 'No attendee assigned')}</div>
        </div>
        <div class="mail-actions">${item.href ? `<a class="btn small" href="${safe(item.href)}" target="_blank" rel="noopener">Open</a>` : ''}</div>
      </article>`).join('');
  }

  async function refreshCalendar(){
    if(!calendarListEl) return null;
    setCalendarNote('Loading 0S calendar...');
    const data = await zeroOsFetch('/api/founder-command/calendar?limit=25');
    const liveCount = Array.isArray(data.live_events) ? data.live_events.length : 0;
    const ledgerCount = Array.isArray(data.ledger) ? data.ledger.length : 0;
    setCalendarNote(`${liveCount} live event(s) • ${ledgerCount} ledger record(s) • ${data.timezone || '0S time'}`, 'ok');
    renderCalendar(data);
    return data;
  }

  async function saveCalendarItem(){
    if(!calendarTopicEl) return null;
    const topic = calendarTopicEl.value.trim();
    if(!topic) throw new Error('Calendar topic required.');
    const ledgerOnly = calendarLedgerOnlyEl ? calendarLedgerOnlyEl.checked : true;
    const body = {
      source:'skymail-calendar',
      topic,
      summary:topic,
      description:calendarNotesEl?.value?.trim() || '',
      start_at:localDateTimeToIso(calendarStartEl?.value || ''),
      end_at:localDateTimeToIso(calendarEndEl?.value || ''),
      attendee_email:calendarAttendeeEl?.value?.trim() || '',
      ledger_only:ledgerOnly,
      create_live:!ledgerOnly
    };
    setCalendarNote('Saving calendar item...');
    const data = await zeroOsFetch('/api/founder-command/calendar', {
      method:'POST',
      body:JSON.stringify(body)
    });
    setCalendarNote(data.live_event_created ? 'Calendar item saved and mirrored live.' : 'Calendar item saved to the 0S ledger.', 'ok');
    await refreshCalendar();
    return data;
  }

  function updateRuntimeSummary(status){
    const workflowBoard = status?.workflowBoard || {};
    const latestWorkflowEvent = status?.latestWorkflowEvent || runtimeState.workflowTimeline?.latestEvent || null;
    runtimeState.latestPacket = runtimeState.packets[0] || null;
    if(runtimePacketCountEl) runtimePacketCountEl.textContent = String(status?.mailHandoffPackets?.total || runtimeState.packets.length || 0);
    if(runtimeLatestTargetsEl){
      const targets = runtimeState.latestPacket?.summary?.targetPlatforms || status?.mailHandoffPackets?.latestTargets || [];
      runtimeLatestTargetsEl.textContent = targets.length ? targets.join(', ') : 'None';
    }
    if(runtimeStatusEl){
      runtimeStatusEl.textContent = runtimeState.available
        ? `Local runtime ready • ${workflowBoard.archived || status?.mailHandoffPackets?.total || runtimeState.packets.length || 0} archived • review ${workflowBoard.reviewReady || 0} ready • execution ${workflowBoard.executionActive || 0} active • dispatch ${(workflowBoard.dispatchReady || 0) + (workflowBoard.dispatchSent || 0)} ready`
        : 'Local runtime unavailable on this origin';
    }
    const counts = reviewBoardCounts(runtimeState.packets);
    if(reviewReadyCountEl) reviewReadyCountEl.textContent = String(status?.reviewBoard?.ready || counts.ready || 0);
    if(reviewBlockedCountEl) reviewBlockedCountEl.textContent = String(status?.reviewBoard?.blocked || counts.blocked || 0);
    if(reviewUnassignedCountEl) reviewUnassignedCountEl.textContent = String(status?.reviewBoard?.unassigned || counts.unassigned || 0);
    syncReviewControls(runtimeState.latestPacket);
    const executionCounts = status?.executionBoard || {};
    if(executionQueuedCountEl) executionQueuedCountEl.textContent = String(executionCounts.queued || 0);
    if(executionActiveCountEl) executionActiveCountEl.textContent = String(executionCounts.active || 0);
    if(executionBlockedCountEl) executionBlockedCountEl.textContent = String((executionCounts.blocked || 0) + (executionCounts.unassigned || 0));
    syncExecutionControls(runtimeState.latestPacket);
    const dispatchCounts = status?.dispatchBoard || {};
    if(dispatchQueuedCountEl) dispatchQueuedCountEl.textContent = String(dispatchCounts.queued || 0);
    if(dispatchReadyCountEl) dispatchReadyCountEl.textContent = String((dispatchCounts.ready || 0) + (dispatchCounts.dispatched || 0));
    if(dispatchBlockedCountEl) dispatchBlockedCountEl.textContent = String((dispatchCounts.blocked || 0) + (dispatchCounts.unassigned || 0));
    syncDispatchControls(runtimeState.latestPacket);
    const timelineSummary = status?.workflowTimeline || {};
    if(timelineArchiveCountEl) timelineArchiveCountEl.textContent = String(timelineSummary.archive || 0);
    if(timelineReviewCountEl) timelineReviewCountEl.textContent = String((timelineSummary.review || 0) + (timelineSummary.execution || 0));
    if(timelineDispatchCountEl) timelineDispatchCountEl.textContent = String(timelineSummary.dispatch || 0);
    if(workflowTimelineStatusEl && !runtimeState.workflowTimeline?.items?.length && latestWorkflowEvent){
      workflowTimelineStatusEl.textContent = `Latest workflow event • ${latestWorkflowEvent.category || 'workflow'} ${latestWorkflowEvent.status || 'update'}`;
    }
  }

  async function refreshRuntime(){
    if(!runtimeStatusEl) return;
    try{
      const [status, listing, reviewBoard, executionBoard, dispatchBoard, workflowTimeline] = await Promise.all([
        runtimeFetch('/api/runtime/status'),
        runtimeFetch('/api/runtime/mail-handoff-packets'),
        runtimeFetch('/api/runtime/review-board'),
        runtimeFetch('/api/runtime/execution-board'),
        runtimeFetch('/api/runtime/dispatch-board'),
        runtimeFetch('/api/runtime/workflow-timeline')
      ]);
      runtimeState.available = true;
      runtimeState.packets = Array.isArray(listing.items) ? listing.items : [];
      runtimeState.reviewBoard = reviewBoard;
      runtimeState.executionBoard = executionBoard;
      runtimeState.dispatchBoard = dispatchBoard;
      runtimeState.workflowTimeline = workflowTimeline?.workflowTimeline || { summary:{}, items:[] };
      if(handoffLabelEl && !handoffLabelEl.value.trim()) handoffLabelEl.value = suggestPacketLabel();
      updateRuntimeSummary({
        ...status,
        reviewBoard: reviewBoard?.counts || status?.reviewBoard,
        executionBoard: executionBoard?.counts || status?.executionBoard,
        dispatchBoard: dispatchBoard?.counts || status?.dispatchBoard,
        workflowTimeline: workflowTimeline?.workflowTimeline?.summary || status?.workflowTimeline,
        latestWorkflowEvent: workflowTimeline?.workflowTimeline?.latestEvent || status?.latestWorkflowEvent
      });
      renderRuntimeArchive();
      renderWorkflowTimeline(runtimeState.workflowTimeline);
    }catch(_err){
      runtimeState.available = false;
      runtimeState.packets = [];
      updateRuntimeSummary(null);
      renderRuntimeArchive();
      renderWorkflowTimeline(null);
    }
  }

  async function buildPacketPayload(){
    const ids = selectedIds();
    if(!ids.length) throw new Error('Select at least one message before archiving a handoff packet.');
    const selected = state.items.filter((item)=> ids.includes(item.id));
    const [drafts, contacts] = await Promise.all([
      apiFetch('/gmail-drafts-list').catch(()=>({ items:[] })),
      apiFetch('/contacts-list').catch(()=>({ contacts_saved:[], contacts_recent:[] }))
    ]);
    const label = (handoffLabelEl?.value || '').trim() || suggestPacketLabel();
    if(handoffLabelEl && !handoffLabelEl.value.trim()) handoffLabelEl.value = label;
    return {
      label,
      notes: (handoffNotesEl?.value || '').trim(),
      mailbox: {
        googleEmail: boot.status?.mailbox?.google_email || '',
        connected: !!boot.status?.connected,
        watchStatus: boot.status?.mailbox?.watch_status || 'inactive'
      },
      selection: {
        label: state.viewLabel,
        query: qs('#q')?.value?.trim() || '',
        messageCount: state.items.length,
        selectedCount: selected.length
      },
      messages: selected.map((item)=>({
        id: item.id,
        threadId: item.thread_id || item.id,
        subject: item.subject,
        from: item.from,
        to: item.to,
        snippet: item.snippet,
        internalDate: item.internal_date || item.date,
        labels: item.labels || [],
        unread: !!item.unread,
        starred: !!item.starred,
        important: !!item.important,
        hasAttachments: !!item.has_attachments
      })),
      draftsSummary: {
        total: Array.isArray(drafts.items) ? drafts.items.length : 0,
        latestSubject: Array.isArray(drafts.items) && drafts.items[0] ? drafts.items[0].subject || '' : ''
      },
      contactsSummary: {
        saved: Array.isArray(contacts.contacts_saved) ? contacts.contacts_saved.length : 0,
        recent: Array.isArray(contacts.contacts_recent) ? contacts.contacts_recent.length : 0
      },
      downstreamTargets: selectedTargetValues()
    };
  }

  async function archiveRuntimePacket(){
    if(!runtimeState.available) throw new Error('Start the same-folder SkyeMail runtime to archive mail handoff packets.');
    const payload = await buildPacketPayload();
    const created = await runtimeFetch('/api/runtime/mail-handoff-packets', {
      method:'POST',
      body: JSON.stringify({ mailHandoffPacket: payload })
    });
    await refreshRuntime();
    return created.mailHandoffPacket;
  }

  function nextReviewStatus(current){
    if(current === 'draft') return 'ready';
    if(current === 'ready') return 'approved';
    if(current === 'approved') return 'dispatched';
    if(current === 'blocked') return 'ready';
    return 'dispatched';
  }

  async function saveLatestPacketReview(patch = {}){
    const packet = runtimeState.latestPacket;
    if(!runtimeState.available) throw new Error('Start the same-folder SkyeMail runtime to update packet review state.');
    if(!packet) throw new Error('Archive a mail handoff packet before saving review state.');
    const review = {
      owner: reviewOwnerEl?.value?.trim() || '',
      status: reviewStatusEl?.value || 'draft',
      checkpoint: reviewCheckpointEl?.value?.trim() || '',
      notes: reviewNotesEl?.value?.trim() || '',
      ...patch
    };
    const updated = await runtimeFetch(`/api/runtime/mail-handoff-packets/${encodeURIComponent(packet.packetId)}/review`, {
      method:'POST',
      body: JSON.stringify({ review })
    });
    await refreshRuntime();
    return updated.mailHandoffPacket;
  }

  function nextExecutionStatus(current){
    if(current === 'queued') return 'active';
    if(current === 'active') return 'completed';
    if(current === 'blocked') return 'active';
    return 'completed';
  }

  async function queueLatestPacketExecution(patch = {}){
    const packet = runtimeState.latestPacket;
    if(!runtimeState.available) throw new Error('Start the same-folder SkyeMail runtime to queue packet execution.');
    if(!packet) throw new Error('Archive a mail handoff packet before queueing execution.');
    const execution = {
      owner: executionOwnerEl?.value?.trim() || '',
      status: executionStatusEl?.value || 'queued',
      checkpoint: executionCheckpointEl?.value?.trim() || '',
      dueAt: executionDueAtEl?.value ? new Date(executionDueAtEl.value).toISOString() : '',
      nextAction: executionNextActionEl?.value?.trim() || '',
      notes: executionNotesEl?.value?.trim() || '',
      ...patch
    };
    const updated = await runtimeFetch(`/api/runtime/mail-handoff-packets/${encodeURIComponent(packet.packetId)}/execution`, {
      method:'POST',
      body: JSON.stringify({ execution })
    });
    await refreshRuntime();
    return updated.mailHandoffPacket;
  }

  function nextDispatchStatus(current){
    if(current === 'queued') return 'ready';
    if(current === 'ready') return 'dispatched';
    if(current === 'blocked') return 'ready';
    return 'dispatched';
  }

  async function queueLatestPacketDispatch(patch = {}){
    const packet = runtimeState.latestPacket;
    if(!runtimeState.available) throw new Error('Start the same-folder SkyeMail runtime to queue packet dispatch.');
    if(!packet) throw new Error('Archive a mail handoff packet before queueing dispatch.');
    const dispatch = {
      owner: dispatchOwnerEl?.value?.trim() || '',
      status: dispatchStatusEl?.value || 'queued',
      checkpoint: dispatchCheckpointEl?.value?.trim() || '',
      channel: dispatchChannelEl?.value?.trim() || '',
      nextAction: dispatchNextActionEl?.value?.trim() || '',
      notes: dispatchNotesEl?.value?.trim() || '',
      ...patch
    };
    const updated = await runtimeFetch(`/api/runtime/mail-handoff-packets/${encodeURIComponent(packet.packetId)}/dispatch`, {
      method:'POST',
      body: JSON.stringify({ dispatch })
    });
    await refreshRuntime();
    return updated.mailHandoffPacket;
  }

  function exportLatestPacket(){
    const packet = runtimeState.latestPacket;
    if(!packet) throw new Error('No archived mail handoff packet is available to export yet.');
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(packet.packetId || 'SkyeMail-handoff').replace(/[^a-z0-9._-]+/ig, '-')}.json`;
    link.click();
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
  }

  function bulkButtons(){
    const label = state.viewLabel;
    const buttons = [];
    buttons.push('<button class="btn small" type="button" id="bulkReadBtn">Mark Read</button>');
    buttons.push('<button class="btn small" type="button" id="bulkUnreadBtn">Mark Unread</button>');
    buttons.push('<button class="btn small" type="button" id="bulkStarBtn">Star</button>');
    buttons.push('<button class="btn small" type="button" id="bulkUnstarBtn">Unstar</button>');
    if(label === 'TRASH'){
      buttons.push('<button class="btn small ok" type="button" id="bulkRestoreBtn">Restore</button>');
      buttons.push('<button class="btn small danger" type="button" id="bulkDeleteBtn">Delete Forever</button>');
    }else{
      buttons.push('<button class="btn small" type="button" id="bulkArchiveBtn">Archive</button>');
      buttons.push('<button class="btn small danger" type="button" id="bulkTrashBtn">Move to Trash</button>');
    }
    return buttons.join('');
  }

  function rowActions(item){
	    const actions = [];
	    actions.push(`<a class="btn small" href="${runtime.href('thread.html', { id: item.thread_id || item.id })}">Thread</a>`);
	    actions.push(`<a class="btn small" href="${runtime.href('message.html', { id: item.id })}">Open</a>`);
	    actions.push(`<a class="btn small" href="${runtime.href('brain.html', { message_id: item.id, subject: item.subject || '' })}">Brain</a>`);
	    actions.push(`<a class="btn small" href="${runtime.href('workspace.html', { message_id: item.id, thread_id: item.thread_id || item.id, subject: item.subject || '', from: item.from || '' })}">0S</a>`);
	    actions.push(`<button class="btn small" type="button" data-single-star="${item.id}" data-on="${item.starred ? '1':'0'}">${item.starred ? 'Unstar':'Star'}</button>`);
    if(state.viewLabel === 'TRASH'){
      actions.push(`<button class="btn small ok" type="button" data-single-restore="${item.id}">Restore</button>`);
      actions.push(`<button class="btn small danger" type="button" data-single-delete="${item.id}">Delete Forever</button>`);
    }else{
      actions.push(`<button class="btn small" type="button" data-single-archive="${item.id}">Archive</button>`);
      actions.push(`<button class="btn small danger" type="button" data-single-trash="${item.id}">Trash</button>`);
    }
    return actions.join('');
  }

  function deliveryChip(item){
    const direction = String(item.direction || '');
    const stateValue = String(item.delivery_state || '').trim();
    const state = stateValue ? stateValue.charAt(0).toUpperCase() + stateValue.slice(1) : '';
    const chips = [];
    if(direction === 'inbound') chips.push('<span class="chip">Received</span>');
    if(direction === 'outbound') chips.push('<span class="chip">Sent</span>');
    if(state && state.toLowerCase() !== 'received' && state.toLowerCase() !== 'sent'){
      chips.push(`<span class="chip">${safe(state)}</span>`);
    }
    return chips.join('');
  }

  function render(items){
    state.items = items || [];
    const selected = new Set(selectedIds());
    if(!state.items.length){
      listEl.innerHTML = '<div class="empty">No messages matched this mailbox view.</div>';
      updateSelectionSummary();
      return;
    }
    listEl.innerHTML = state.items.map((item)=>`
      <article class="mail ${item.unread ? 'unread':''}">
        <div class="mail-check"><input type="checkbox" data-mail-check value="${safe(item.id)}" ${selected.has(item.id)?'checked':''} /></div>
        <div class="mail-main">
          <div class="mail-top">
            <div>
              <div class="mail-subject"><a href="${runtime.href('thread.html', { id: item.thread_id || item.id })}">${safe(item.subject || '(no subject)')}</a></div>
              <div class="mail-from">${safe(item.from || 'Unknown sender')}</div>
            </div>
            <div class="mini">${safe(fmtDate(item.internal_date || item.date || ''))}</div>
          </div>
          <div class="mail-snippet">${safe(item.snippet || '')}</div>
          <div class="mail-meta">
            ${deliveryChip(item)}
            ${item.unread ? '<span class="chip">Unread</span>' : ''}
            ${item.starred ? '<span class="chip">Starred</span>' : ''}
            ${item.important ? '<span class="chip">Important</span>' : ''}
            ${item.has_attachments ? '<span class="chip">Attachments</span>' : ''}
          </div>
        </div>
        <div class="mail-actions">${rowActions(item)}</div>
      </article>`).join('');

    document.querySelectorAll('[data-mail-check]').forEach((el)=> el.onchange = updateSelectionSummary);
    document.querySelectorAll('[data-single-star]').forEach((btn)=> btn.onclick = async ()=> {
      try{
        await apiFetch('/gmail-modify', { method:'POST', body: JSON.stringify({ id: btn.dataset.singleStar, addLabelIds: btn.dataset.on === '1' ? [] : ['STARRED'], removeLabelIds: btn.dataset.on === '1' ? ['STARRED'] : [] }) });
        SMV.trackGame(btn.dataset.on === '1' ? 'unstar' : 'star');
        await refreshInbox();
      }catch(err){ setNote(err.message || 'Mailbox update failed.', 'danger'); }
    });
    document.querySelectorAll('[data-single-archive]').forEach((btn)=> btn.onclick = async ()=> { try{ await apiFetch('/gmail-modify', { method:'POST', body: JSON.stringify({ id: btn.dataset.singleArchive, addLabelIds: [], removeLabelIds:['INBOX'] }) }); SMV.trackGame('archive'); await refreshInbox(); }catch(err){ setNote(err.message || 'Archive failed.', 'danger'); } });
    document.querySelectorAll('[data-single-trash]').forEach((btn)=> btn.onclick = async ()=> { try{ await SMV.trashMessages([btn.dataset.singleTrash]); await refreshInbox(); }catch(err){ setNote(err.message || 'Trash failed.', 'danger'); } });
    document.querySelectorAll('[data-single-restore]').forEach((btn)=> btn.onclick = async ()=> { try{ await SMV.untrashMessages([btn.dataset.singleRestore]); await refreshInbox(); }catch(err){ setNote(err.message || 'Restore failed.', 'danger'); } });
    document.querySelectorAll('[data-single-delete]').forEach((btn)=> btn.onclick = async ()=> { try{ await SMV.deleteMessages([btn.dataset.singleDelete]); await refreshInbox(); }catch(err){ setNote(err.message || 'Delete failed.', 'danger'); } });
    updateSelectionSummary();
  }

  async function loadInbox(token=null, pushHistory=false){
    if(!(boot.status && boot.status.connected)){ render([]); setNote('Provision your SkyeMail mailbox to open this view.'); return; }
    try{
      const q = encodeURIComponent(qs('#q').value.trim());
      const includeSpamTrash = ['SPAM','TRASH'].includes(state.viewLabel) ? '&includeSpamTrash=true' : '';
      const page = token ? `&pageToken=${encodeURIComponent(token)}` : '';
      setNote(`Loading ${document.body.dataset.pageName || 'mail'}…`);
      if(!token && !q && (!state.viewLabel || state.viewLabel === 'INBOX')){
        await apiFetch('/mail-sync?limit=10').catch(()=>null);
      }
      const data = await apiFetch(`/gmail-list?max=25&q=${q}&label=${encodeURIComponent(state.viewLabel)}${page}${includeSpamTrash}`);
      if(pushHistory) state.prevStack.push(state.currentToken);
      state.currentToken = token;
      state.nextPageToken = data.nextPageToken || null;
      pageTokenEl.textContent = data.nextPageToken ? 'More mail available' : 'End of current mailbox window';
      render(data.items || []);
      setNote(`Loaded ${data.items?.length || 0} message(s) from ${data.mailbox}.`, 'ok');
      SMV.trackGame('mailbox_load', { count: Math.max(1, data.items?.length || 1), key: state.viewLabel || 'INBOX' }, { silent:true });
    }catch(err){
      listEl.innerHTML = '<div class="empty">Mailbox load failed.</div>';
      setNote(err.message || 'Mailbox load failed.', 'danger');
    }
  }
  async function refreshInbox(){ state.prevStack=[]; state.currentToken=null; state.nextPageToken=null; await loadInbox(null, false); }

  async function runBulk(fn){
    try{ await fn(selectedIds()); await refreshInbox(); }
    catch(err){ setNote(err.message || 'Bulk action failed.', 'danger'); }
  }

  qs('#applyBtn').onclick = async ()=> { await refreshInbox(); SMV.trackGame('search'); };
  qs('#clearBtn').onclick = async ()=> { qs('#q').value=''; await refreshInbox(); SMV.trackGame('refresh'); };
  qs('#refreshBtn').onclick = async ()=> { await refreshInbox(); SMV.trackGame('refresh'); };
  if(qs('#refreshListBtn')) qs('#refreshListBtn').onclick = async ()=> { await refreshInbox(); SMV.trackGame('refresh'); };
  if(qs('#refreshCalendarBtn')) qs('#refreshCalendarBtn').onclick = async ()=> {
    try{ await refreshCalendar(); SMV.trackGame('calendar_refresh'); }
    catch(err){ setCalendarNote(err.message || 'Calendar refresh failed.', 'danger'); }
  };
  if(qs('#saveCalendarBtn')) qs('#saveCalendarBtn').onclick = async ()=> {
    try{ await saveCalendarItem(); SMV.trackGame('calendar_save'); }
    catch(err){ setCalendarNote(err.message || 'Calendar save failed.', 'danger'); }
  };
  qs('#connectBtn').onclick = ()=> runtime.redirect('onboarding.html');
  const proofLoopBtn = qs('#proofLoopBtn');
  if(proofLoopBtn) proofLoopBtn.onclick = async ()=> {
    try{
      setNote('Sending and receiving a SkyeMail proof loop…');
      const mailbox = boot.status?.mailbox?.mailbox_email || boot.status?.mailbox?.google_email || '';
      await apiFetch('/mail-proof-loop', {
        method:'POST',
        body: JSON.stringify({
          to: mailbox,
          subject: `SkyeMail browser proof ${new Date().toISOString()}`,
          message: 'Browser proof: sent record and received inbox record created under the FS27-backed SkyeMail workspace.'
        })
      });
      await refreshInbox();
      setNote('Proof loop created: sent mail and received inbox mail are now in the mailbox list.', 'ok');
      SMV.trackGame('proof_loop');
    }catch(err){ setNote(err.message || 'Proof loop failed.', 'danger'); }
  };
  qs('#watchBtn').onclick = async ()=> { try{ const data = await SMV.enableWatch(); setNote(`Push watch active until ${fmtDate(data.watch?.expiration || '')}.`, 'ok'); }catch(err){ setNote(err.message || 'Push watch enable failed.', 'danger'); } };
  qs('#disconnectBtn').onclick = async ()=> { if(!confirm('Disconnect the SkyeMail mailbox from this workspace?')) return; try{ await SMV.disconnectGoogle(); runtime.redirect('onboarding.html'); }catch(err){ setNote(err.message || 'Disconnect failed.', 'danger'); } };
  qs('#nextBtn').onclick = ()=> state.nextPageToken ? loadInbox(state.nextPageToken, true) : null;
  qs('#prevBtn').onclick = ()=> state.prevStack.length ? loadInbox(state.prevStack.pop() || null, false) : setNote('No previous page in this session.');

  document.querySelector('#bulkBar').innerHTML = `<div>${document.body.dataset.pageName} selection</div><div class="bulk-actions">${bulkButtons()}</div><div class="mini" id="selectionSummary">No messages selected</div>`;
  document.querySelector('#bulkReadBtn').onclick = ()=> runBulk((ids)=>SMV.batchModify(ids, [], ['UNREAD']));
  document.querySelector('#bulkUnreadBtn').onclick = ()=> runBulk((ids)=>SMV.batchModify(ids, ['UNREAD'], []));
  document.querySelector('#bulkStarBtn').onclick = ()=> runBulk((ids)=>SMV.batchModify(ids, ['STARRED'], []));
  document.querySelector('#bulkUnstarBtn').onclick = ()=> runBulk((ids)=>SMV.batchModify(ids, [], ['STARRED']));
  if(document.querySelector('#bulkArchiveBtn')) document.querySelector('#bulkArchiveBtn').onclick = ()=> runBulk((ids)=>SMV.batchModify(ids, [], ['INBOX']));
  if(document.querySelector('#bulkTrashBtn')) document.querySelector('#bulkTrashBtn').onclick = ()=> runBulk((ids)=>SMV.trashMessages(ids));
  if(document.querySelector('#bulkRestoreBtn')) document.querySelector('#bulkRestoreBtn').onclick = ()=> runBulk((ids)=>SMV.untrashMessages(ids));
  if(document.querySelector('#bulkDeleteBtn')) document.querySelector('#bulkDeleteBtn').onclick = ()=> runBulk((ids)=>SMV.deleteMessages(ids));

  if(qs('#archivePacketBtn')) qs('#archivePacketBtn').onclick = async ()=> {
    try{
      const packet = await archiveRuntimePacket();
      setNote(`Archived mail handoff packet ${packet.packetId}.`, 'ok');
      SMV.trackGame('packet_archive');
    }catch(err){
      setNote(err.message || 'Packet archive failed.', 'danger');
    }
  };
  if(qs('#refreshRuntimeBtn')) qs('#refreshRuntimeBtn').onclick = ()=> refreshRuntime();
  if(qs('#exportPacketBtn')) qs('#exportPacketBtn').onclick = ()=> {
    try{ exportLatestPacket(); }
    catch(err){ setNote(err.message || 'Export failed.', 'danger'); }
  };
  if(qs('#saveReviewBtn')) qs('#saveReviewBtn').onclick = async ()=> {
    try{
      const packet = await saveLatestPacketReview();
      setNote(`Saved review state for ${packet.packetId}.`, 'ok');
      SMV.trackGame('packet_review');
    }catch(err){
      setNote(err.message || 'Review save failed.', 'danger');
    }
  };
  if(qs('#advanceReviewBtn')) qs('#advanceReviewBtn').onclick = async ()=> {
    try{
      const nextStatus = nextReviewStatus(reviewStatusEl?.value || runtimeState.latestPacket?.review?.status || 'draft');
      if(reviewStatusEl) reviewStatusEl.value = nextStatus;
      const packet = await saveLatestPacketReview({ status: nextStatus });
      setNote(`Advanced ${packet.packetId} to ${packet.review?.status || nextStatus}.`, 'ok');
      SMV.trackGame('packet_review');
    }catch(err){
      setNote(err.message || 'Review advance failed.', 'danger');
    }
  };
  if(qs('#queueExecutionBtn')) qs('#queueExecutionBtn').onclick = async ()=> {
    try{
      const packet = await queueLatestPacketExecution();
      setNote(`Queued execution for ${packet.packetId}.`, 'ok');
      SMV.trackGame('packet_review');
    }catch(err){
      setNote(err.message || 'Execution queue failed.', 'danger');
    }
  };
  if(qs('#advanceExecutionBtn')) qs('#advanceExecutionBtn').onclick = async ()=> {
    try{
      const nextStatus = nextExecutionStatus(executionStatusEl?.value || runtimeState.latestPacket?.execution?.status || 'queued');
      if(executionStatusEl) executionStatusEl.value = nextStatus;
      const packet = await queueLatestPacketExecution({ status: nextStatus });
      setNote(`Advanced execution for ${packet.packetId} to ${packet.execution?.status || nextStatus}.`, 'ok');
      SMV.trackGame('packet_review');
    }catch(err){
      setNote(err.message || 'Execution advance failed.', 'danger');
    }
  };
  if(qs('#queueDispatchBtn')) qs('#queueDispatchBtn').onclick = async ()=> {
    try{
      const packet = await queueLatestPacketDispatch();
      setNote(`Queued dispatch for ${packet.packetId}.`, 'ok');
      SMV.trackGame('packet_review');
    }catch(err){
      setNote(err.message || 'Dispatch queue failed.', 'danger');
    }
  };
  if(qs('#advanceDispatchBtn')) qs('#advanceDispatchBtn').onclick = async ()=> {
    try{
      const nextStatus = nextDispatchStatus(dispatchStatusEl?.value || runtimeState.latestPacket?.dispatch?.status || 'queued');
      if(dispatchStatusEl) dispatchStatusEl.value = nextStatus;
      const packet = await queueLatestPacketDispatch({ status: nextStatus });
      setNote(`Advanced dispatch for ${packet.packetId} to ${packet.dispatch?.status || nextStatus}.`, 'ok');
      SMV.trackGame('packet_review');
    }catch(err){
      setNote(err.message || 'Dispatch advance failed.', 'danger');
    }
  };

  setHeaderStatus(boot.status);
  if(handoffLabelEl) handoffLabelEl.value = suggestPacketLabel();
  if(runtimeSelectionCountEl) runtimeSelectionCountEl.textContent = '0';
  renderRuntimeArchive();
  await refreshRuntime();
  refreshCalendar().catch((err)=> setCalendarNote(err.message || 'Calendar sync failed.', 'danger'));
  await refreshInbox();
})();
