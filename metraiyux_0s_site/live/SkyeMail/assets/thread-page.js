(async function(){
  if(!requireAuthOrRedirect()) return;
  const shellBoot = SMV.withBoot('dashboard', 'Thread View', 'Conversation stack with quick reply').catch((err)=> {
    console.warn('SkyeMail thread shell boot failed', err);
    return null;
  });
  const runtime = window.SMVRuntime || { href: (value) => value, redirect: (value) => { location.href = value; }, apiUrl: (value) => value };
  const statusEl = qs('#statusText');
  const stackEl = qs('#threadStack');
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || params.get('thread_id') || params.get('message_id') || '';
  let thread = null;
  function note(msg, kind=''){ setStatus(statusEl, msg, kind); }
  if(!id){ stackEl.innerHTML = '<div class="empty">Thread id missing.</div>'; return; }
  function arr(value){ return Array.isArray(value) ? value : []; }
  function normalizeMessage(m = {}){
    return {
      ...m,
      headers: m.headers && typeof m.headers === 'object' ? m.headers : {},
      labels: arr(m.labels),
      body: m.body && typeof m.body === 'object' ? m.body : { text:String(m.body || ''), html:'' },
      attachments: arr(m.attachments),
    };
  }
  function normalizeThread(value = {}){
    const messages = arr(value.messages).map(normalizeMessage);
    return {
      ...value,
      id: value.id || id,
      subject: value.subject || messages[0]?.headers?.subject || '(no subject)',
      message_count: Number(value.message_count || messages.length || 0),
      participants: arr(value.participants),
      messages,
    };
  }
  function attachmentUrl(m, a){
    const fallback = `/gmail-attachment?id=${encodeURIComponent(m.id)}&attachmentId=${encodeURIComponent(a.attachment_id || '')}&filename=${encodeURIComponent(a.filename || 'attachment')}${a.inline ? '&inline=1' : ''}`;
    return runtime.apiUrl(a.url || fallback);
  }
  function isImageAttachment(a){
    return /^image\//i.test(a.mime_type || '') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(a.filename || '');
  }
  function renderAttachments(m){
    const items = arr(m.attachments);
    if(!items.length) return '';
    return `<div class="attachments">${items.map((a)=> {
      const url = attachmentUrl(m, a);
      const preview = isImageAttachment(a) ? `<img class="attachment-preview" src="${safe(url)}" alt="${safe(a.filename || 'attachment')}" loading="lazy" />` : '';
      return `<a class="attachment" href="${safe(url)}" target="_blank" rel="noopener">${preview}<span class="attachment-meta">${safe(a.filename || 'attachment')} • ${safe(a.mime_type || 'file')}</span></a>`;
    }).join('')}</div>`;
  }
  function renderMessage(m){
    const headers = m.headers || {};
    return `<article class="thread-message">
      <div class="message-header">
        <div>
          <div class="mail-subject">${safe(headers.subject || '(no subject)')}</div>
          <div class="mail-from">From: ${safe(headers.from || '')}</div>
          <div class="mail-from">To: ${safe(headers.to || '')}</div>
          ${headers.cc ? `<div class="mail-from">Cc: ${safe(headers.cc)}</div>` : ''}
        </div>
        <div class="mini">${safe(fmtDate(m.internal_date || headers.date || ''))}</div>
      </div>
      <div class="chiprow">${arr(m.labels).map((label)=>`<span class="chip">${safe(label)}</span>`).join('')}</div>
      <div class="message-body">${SMV.htmlMessage(m.body)}</div>
      ${renderAttachments(m)}
      <div class="mail-actions">
        <a class="btn small" href="${runtime.href('message.html', { id: m.id })}">Open Message</a>
        <button class="btn small" type="button" data-star="${safe(m.id)}" data-on="${m.starred ? '1':'0'}">${m.starred ? 'Unstar':'Star'}</button>
        <button class="btn small" type="button" data-archive="${safe(m.id)}">Archive</button>
      </div>
    </article>`;
  }
  function threadContext(){
    const messages = thread?.messages || [];
    const first = messages[0] || {};
    const latest = messages[messages.length - 1] || first;
    const text = messages.map((m)=> {
      const headers = m.headers || {};
      const body = m.body || {};
      return [
        `From: ${headers.from || ''}`,
        `To: ${headers.to || ''}`,
        `Date: ${headers.date || m.internal_date || ''}`,
        `Subject: ${headers.subject || thread?.subject || ''}`,
        '',
        body.text || (body.html ? body.html.replace(/<[^>]+>/g, ' ') : '')
      ].join('\n');
    }).join('\n\n---\n\n');
    return {
      mailbox: window.SMVRuntime?.getActiveMailbox?.() || '',
      messageId: latest.id || first.id || '',
      threadId: thread?.id || id,
      subject: thread?.subject || first.headers?.subject || '',
      from: latest.headers?.from || first.headers?.from || '',
      to: latest.headers?.to || first.headers?.to || '',
      text,
      snippet: text.slice(0, 600),
      returnUrl: location.href
    };
  }
  function syncThreadOsLinks(){
    if(!thread) return;
    const ctx = threadContext();
    const link = qs('#threadWorkbenchBtn');
    if(link) link.href = runtime.href('workspace.html', {
      thread_id: ctx.threadId,
      message_id: ctx.messageId,
      subject: ctx.subject,
      from: ctx.from,
      to: ctx.to,
      mailbox: ctx.mailbox
    });
    const docxBtn = qs('#threadDocxBtn');
    if(docxBtn) docxBtn.onclick = ()=> window.SMVZeroOs?.openSkyeDocx(ctx);
  }
  function attachActions(){
    document.querySelectorAll('[data-star]').forEach((btn)=> btn.onclick = async ()=> {
      try{ await apiFetch('/gmail-modify', { method:'POST', body: JSON.stringify({ id: btn.dataset.star, addLabelIds: btn.dataset.on==='1' ? [] : ['STARRED'], removeLabelIds: btn.dataset.on==='1' ? ['STARRED'] : [] }) }); SMV.trackGame(btn.dataset.on === '1' ? 'unstar' : 'star'); await load(); }
      catch(err){ note(err.message || 'Star update failed.', 'danger'); }
    });
    document.querySelectorAll('[data-archive]').forEach((btn)=> btn.onclick = async ()=> {
      try{ await apiFetch('/gmail-modify', { method:'POST', body: JSON.stringify({ id: btn.dataset.archive, addLabelIds: [], removeLabelIds:['INBOX'] }) }); SMV.trackGame('archive'); await load(); }
      catch(err){ note(err.message || 'Archive failed.', 'danger'); }
    });
  }
  async function load(){
    try{
      note('Opening thread...');
      const data = await apiFetch(`/gmail-thread-get?id=${encodeURIComponent(id)}`);
      thread = normalizeThread(data.thread);
      if(!thread.messages.length) throw new Error('Thread has no messages yet.');
      qs('#threadTitle').textContent = thread.subject || '(no subject)';
      qs('#threadMeta').textContent = `${thread.message_count} message(s) • ${thread.participants.length} participant line(s)`;
      stackEl.innerHTML = thread.messages.map(renderMessage).join('');
      attachActions();
      const latest = thread.messages[thread.messages.length - 1];
      qs('#replySummary').textContent = latest ? `Replying in thread with ${latest.headers?.from || 'sender'}` : 'Reply in thread';
      syncThreadOsLinks();
      note('Thread loaded.', 'ok');
      SMV.trackGame('thread_open', { key:id }, { silent:true });
    }catch(err){ stackEl.innerHTML = '<div class="empty">Thread load failed.</div>'; note(err.message || 'Thread load failed.', 'danger'); }
  }
  qs('#replySendBtn').onclick = async ()=> {
    if(!thread || !thread.messages.length) return;
    const latest = thread.messages[thread.messages.length - 1];
    const body = qs('#replyText').value;
    if(!body.trim()){ note('Write a reply first.', 'danger'); return; }
    try{
	      const data = await apiFetch('/mail-send', { method:'POST', body: JSON.stringify({
	        to: SMV.emailOnly(latest.headers.from || ''),
	        subject: /^Re:/i.test(thread.subject || '') ? thread.subject : `Re: ${thread.subject || ''}`,
	        message: body,
        text: body,
        reply_message_id: latest.id,
        reply_thread_id: thread.id,
      }) });
	      qs('#replyText').value='';
	      note('Reply sent.', 'ok');
	      SMV.trackGame('reply_send', { id:data.message?.id || data.sent?.id || data.id || data.provider_message_id || data.message_id || '' }, {
	        celebrate:true,
	        triggerType:'workflow-complete',
	        message:'Reply sent and recorded. Thanks for keeping the conversation moving in SkyeMail.'
	      });
      await load();
    }catch(err){ note(err.message || 'Reply send failed.', 'danger'); }
  };
  qs('#replyComposeBtn').onclick = ()=> {
    if(!thread || !thread.messages.length) return;
    const latest = thread.messages[thread.messages.length - 1];
    runtime.redirect('compose.html', {
      to: SMV.emailOnly(latest.headers.from || ''),
      subject: /^Re:/i.test(thread.subject || '') ? thread.subject : `Re: ${thread.subject || ''}`,
      reply_message_id: latest.id,
      reply_thread_id: thread.id,
    });
  };
  await load();
  shellBoot.then(() => SMV.renderGameSurfaces?.()).catch(()=>{});
})();
