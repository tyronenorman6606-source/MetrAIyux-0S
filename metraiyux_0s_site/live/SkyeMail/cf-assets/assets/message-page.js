(async function(){
  const boot = await SMV.withBoot('dashboard', 'Message', 'Single-message review surface');
  if(!boot) return;
  const runtime = window.SMVRuntime || { href: (value) => value, apiUrl: (value) => value };
  const statusEl = qs('#statusText');
  const contentEl = qs('#messageContent');
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  function note(msg, kind=''){ setStatus(statusEl, msg, kind); }
  function arr(value){ return Array.isArray(value) ? value : []; }
  function disableLink(selector, title){
    const el = qs(selector);
    if(!el) return;
    el.removeAttribute('href');
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('tabindex', '-1');
    if(title) el.title = title;
  }
  function enableLink(selector, href){
    const el = qs(selector);
    if(!el) return;
    el.href = href;
    el.removeAttribute('aria-disabled');
    el.removeAttribute('tabindex');
    el.removeAttribute('title');
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
  if(!id){
    disableLink('#replyBtn', 'Message id required before replying.');
    disableLink('#threadBtn', 'Message id required before opening the thread.');
    const docxBtn = qs('#docxBtn');
    if(docxBtn) docxBtn.disabled = true;
    contentEl.innerHTML = '<div class="empty">Message id missing.</div>';
    note('Message id missing.', 'danger');
    return;
  }
  try{
    const data = await apiFetch(`/gmail-get?id=${encodeURIComponent(id)}`);
    const m = data.message;
    qs('#pageTitle').textContent = m.headers.subject || '(no subject)';
    qs('#metaFrom').textContent = m.headers.from || '';
    qs('#metaTo').textContent = m.headers.to || '';
    qs('#metaDate').textContent = fmtDate(m.internal_date || m.headers.date || '');
    enableLink('#replyBtn', runtime.href('compose.html', {
      to: SMV.emailOnly(m.headers.from || ''),
      subject: /^Re:/i.test(m.headers.subject||'') ? m.headers.subject : `Re: ${m.headers.subject || ''}`,
      reply_message_id: m.id,
      reply_thread_id: m.thread_id || '',
    }));
    enableLink('#threadBtn', runtime.href('thread.html', { id: m.thread_id || m.id }));
    const osContext = {
      mailbox: window.SMVRuntime?.getActiveMailbox?.() || data.mailbox || '',
      messageId: m.id,
      threadId: m.thread_id || '',
      subject: m.headers.subject || '',
      from: m.headers.from || '',
      to: m.headers.to || '',
      text: m.body?.text || m.snippet || '',
      html: m.body?.html || '',
      snippet: m.snippet || '',
      returnUrl: location.href
    };
    const workbenchBtn = qs('#workbenchBtn');
    if(workbenchBtn) workbenchBtn.href = runtime.href('workspace.html', {
      message_id: osContext.messageId,
      thread_id: osContext.threadId,
      subject: osContext.subject,
      from: osContext.from,
      to: osContext.to,
      mailbox: osContext.mailbox
    });
    const docxBtn = qs('#docxBtn');
    if(docxBtn){
      docxBtn.disabled = false;
      docxBtn.onclick = ()=> window.SMVZeroOs?.openSkyeDocx(osContext);
    }
    contentEl.innerHTML = `
      <div class="chiprow">
        ${arr(m.labels).map((label)=>`<span class="chip">${safe(label)}</span>`).join('')}
      </div>
      <div class="message-body">${SMV.htmlMessage(m.body)}</div>
      ${renderAttachments(m)}`;
    if(arr(m.labels).includes('UNREAD')){
      await apiFetch('/gmail-modify', { method:'POST', body: JSON.stringify({ id: m.id, addLabelIds: [], removeLabelIds:['UNREAD'] }) });
      SMV.trackGame('mark_read');
    }
    note('Message loaded.', 'ok');
    SMV.trackGame('message_open', { key:id }, { silent:true });
  }catch(err){ contentEl.innerHTML = '<div class="empty">Message load failed.</div>'; note(err.message || 'Message load failed.', 'danger'); }
})();
