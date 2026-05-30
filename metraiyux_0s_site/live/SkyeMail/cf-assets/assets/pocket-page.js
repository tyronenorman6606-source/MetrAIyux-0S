(async function(){
  const bridge = window.SMVZeroOs;
  const params = new URLSearchParams(location.search);
  const state = { packets: [] };

  function esc(value){ return safe(String(value || '')); }
  function value(...items){ return items.map((item)=>String(item || '').trim()).find(Boolean) || ''; }
  function context(){
    return {
      mailbox:value(params.get('mailbox'), window.SMVRuntime?.getActiveMailbox?.()),
      messageId:value(params.get('message_id'), params.get('id')),
      threadId:value(params.get('thread_id')),
      subject:value(params.get('subject')),
      from:value(params.get('from')),
      to:value(params.get('to')),
      returnUrl:value(params.get('return'), params.get('skymail_return'), document.referrer)
    };
  }
  function note(text, kind=''){ setStatus(qs('#pocketStatus'), text, kind); }

  function renderContext(){
    const ctx = context();
    qs('#pocketContext').innerHTML = `
      <div class="workspace-context-row"><span>Mailbox</span><b>${esc(ctx.mailbox || 'active session')}</b></div>
      <div class="workspace-context-row"><span>Subject</span><b>${esc(ctx.subject || 'No selected subject')}</b></div>
      <div class="workspace-context-row"><span>Message</span><b>${esc(ctx.messageId || ctx.threadId || 'No selected message')}</b></div>
      <div class="workspace-context-row"><span>Sender</span><b>${esc(ctx.from || 'Not supplied')}</b></div>`;
    qs('#pocketInboxLink').href = window.SMVRuntime?.href?.('dashboard.html', { mailbox:ctx.mailbox }) || 'dashboard.html';
    qs('#pocketComposeLink').href = window.SMVRuntime?.href?.('compose.html', { to:ctx.from, subject:ctx.subject ? `Re: ${ctx.subject}` : '' }) || 'compose.html';
  }

  function renderPackets(){
    const list = qs('#pocketPackets');
    if(!state.packets.length){
      list.innerHTML = '<div class="empty">No packets yet.</div>';
      return;
    }
    list.innerHTML = state.packets.slice(0, 4).map((packet)=>`
      <article class="mail pocket-mail-row">
        <div class="mail-main">
          <div class="mail-subject">${esc(packet.label || '0S packet')}</div>
          <div class="mail-snippet">${esc(packet.notes || '')}</div>
          <div class="mail-meta">${(packet.summary?.targetPlatforms || []).slice(0, 3).map((target)=>`<span class="chip">${esc(target)}</span>`).join('')}</div>
        </div>
      </article>`).join('');
  }

  async function refreshPackets(){
    const list = qs('#pocketPackets');
    try{
      const data = await apiFetch('/runtime/mail-handoff-packets');
      state.packets = Array.isArray(data.items) ? data.items : [];
      renderPackets();
    }catch(err){
      list.innerHTML = '<div class="empty">Packet runtime unavailable.</div>';
      note(err.message || 'Packet load failed.', 'danger');
    }
  }

  function setCollapsed(collapsed){
    document.body.classList.toggle('pocket-collapsed', collapsed);
    try{ window.resizeTo(collapsed ? 96 : 420, collapsed ? 520 : 680); }catch(_err){}
  }

  renderContext();
  qs('#collapsePocketBtn').onclick = ()=> setCollapsed(true);
  qs('#expandPocketBtn').onclick = ()=> setCollapsed(false);
  qs('#pocketDocxBtn').onclick = ()=> bridge.openSkyeDocx(context());
  qs('#pocketPacketBtn').onclick = async ()=> {
    try{
      note('Archiving packet...');
      const data = await bridge.archiveHandoff('founder-command-bridge', context());
      note(`Archived ${data.mailHandoffPacket?.packetId || '0S packet'}.`, 'ok');
      await refreshPackets();
    }catch(err){ note(err.message || 'Packet failed.', 'danger'); }
  };
  await refreshPackets();
})();
