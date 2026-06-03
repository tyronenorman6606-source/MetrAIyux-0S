(async function(){
  const boot = await SMV.withBoot('dashboard', 'Compose', 'Send, draft, alias, and attachment lane');
  if(!boot) return;
  const statusEl = qs('#statusText');
  const params = new URLSearchParams(location.search);
  const draftId = params.get('draft_id') || '';
  let settings = null;
  let mailStatus = null;
  const state = { attachments: [] };

  function note(msg, kind=''){ setStatus(statusEl, msg, kind); }

  function renderAttachments(){
    const el = qs('#attachmentList');
    if(!el) return;
    if(!state.attachments.length){
      el.innerHTML = '<div class="mini">No attachments queued.</div>';
      return;
    }
    el.innerHTML = state.attachments.map((item, idx)=>`
      <div class="attachment-pill">
        <div>
          <b>${safe(item.filename || 'attachment')}</b>
          <div class="mini">${safe(item.mime_type || 'application/octet-stream')} • ${safe(item.size_label || '')}${item.existing ? ' • existing draft file' : ''}</div>
        </div>
        <button class="btn small danger" type="button" data-remove-attachment="${idx}">Remove</button>
      </div>`).join('');
    el.querySelectorAll('[data-remove-attachment]').forEach((btn)=> btn.onclick = ()=> {
      state.attachments.splice(Number(btn.dataset.removeAttachment), 1);
      renderAttachments();
    });
  }

  function humanBytes(bytes){
    const n = Number(bytes || 0);
    if(n < 1024) return `${n} B`;
    if(n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    return `${(n/(1024*1024)).toFixed(2)} MB`;
  }

  function populateAliases(){
    const select = qs('#from_alias');
    if(!select) return;
    const hostedMailbox = settings?.hosted?.mailbox || mailStatus?.mailbox || null;
    const hostedAliases = hostedMailbox ? [
      { sendAsEmail: hostedMailbox.mailbox_email, displayName: 'Primary mailbox', verificationStatus: 'Citadel Database and SkyeNet' },
      ...(settings?.hosted?.aliases || []).filter((item)=> String(item.status || 'active').toLowerCase() === 'active').map((item)=>({
        sendAsEmail: item.alias_email,
        displayName: item.display_name || item.alias_type || 'Alias',
        verificationStatus: 'Citadel',
      })),
    ] : [];
    const gmailAliases = settings?.gmail?.aliases || [];
    const seen = new Set();
    const aliases = [...hostedAliases, ...gmailAliases].filter((item)=>{
      const email = String(item.sendAsEmail || '').toLowerCase();
      if(!email || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
    const preferred = settings?.profile?.preferred_from_alias || '';
    select.innerHTML = aliases.length
      ? aliases.map((item)=>`<option value="${safe(item.sendAsEmail)}">${safe(item.displayName || item.sendAsEmail)} • ${safe(item.sendAsEmail)}${item.verificationStatus ? ` • ${safe(item.verificationStatus)}` : ''}</option>`).join('')
      : '<option value="">Primary mailbox</option>';
    if(preferred && aliases.some((item)=> String(item.sendAsEmail || '').toLowerCase() === preferred.toLowerCase())) {
      select.value = preferred;
    }
  }

  async function loadSettings(){
    try{ mailStatus = await apiFetch('/mail-status'); }catch(_err){}
    try{ settings = await apiFetch('/mail-settings-get'); }catch(_err){}
    if(mailStatus?.mailbox?.mailbox_email) qs('#mailboxBadge').textContent = `Hosted mailbox • ${mailStatus.mailbox.mailbox_email}`;
    else if(settings?.gmail?.connected) qs('#mailboxBadge').textContent = `Connected mailbox • ${settings.gmail.google_email}`;
    else qs('#mailboxBadge').textContent = 'No SkyeMail mailbox provisioned';
    populateAliases();
  }

  async function loadDraft(){
    if(!draftId) return;
    try{
      const data = await apiFetch(`/gmail-draft-get?id=${encodeURIComponent(draftId)}`);
      const d = data.draft;
      qs('#draft_id').value = d.id || '';
      qs('#thread_id').value = d.thread_id || '';
      qs('#to').value = d.to || '';
      qs('#cc').value = d.cc || '';
      qs('#bcc').value = d.bcc || '';
      qs('#subject').value = d.subject || '';
      qs('#text').value = d.body?.text || '';
      qs('#html').value = d.body?.html || '';
      const fromHeader = String(d.from || '');
      const aliasMatch = fromHeader.match(/<([^>]+)>/);
      if(aliasMatch && qs('#from_alias')) qs('#from_alias').value = aliasMatch[1].trim().toLowerCase();
      state.attachments = (d.attachments || []).map((a)=>({
        filename: a.filename,
        mime_type: a.mime_type,
        data_b64: a.data_b64 || '',
        size_bytes: Number(a.size || 0),
        size_label: humanBytes(a.size || 0),
        existing: true,
      })).filter((a)=>a.data_b64);
      renderAttachments();
      note('Draft loaded.', 'ok');
    }catch(err){ note(err.message || 'Draft load failed.', 'danger'); }
  }

  function applySignature(){
    const alias = String(qs('#from_alias')?.value || '').toLowerCase();
    const aliasInfo = (settings?.gmail?.aliases || []).find((item)=> String(item.sendAsEmail || '').toLowerCase() === alias) || settings?.gmail?.sendAs || null;
    const sigText = settings?.profile?.signature_text || '';
    const sigHtml = aliasInfo?.signature || settings?.profile?.signature_html || '';
    if(sigText && !qs('#text').value.includes(sigText.trim())){
      qs('#text').value = `${qs('#text').value}${qs('#text').value ? '\n\n' : ''}${sigText}`;
    }
    if(sigHtml && !qs('#html').value.includes(sigHtml.trim())){
      qs('#html').value = `${qs('#html').value}${qs('#html').value ? '\n' : ''}${sigHtml}`;
    }
    SMV.trackGame('signature');
  }

  function fillFromQuery(){
    if(params.get('to')) qs('#to').value = params.get('to');
    if(params.get('subject')) qs('#subject').value = params.get('subject');
    if(params.get('body')) qs('#text').value = params.get('body');
    if(params.get('reply_message_id')) qs('#reply_message_id').value = params.get('reply_message_id');
    if(params.get('reply_thread_id')) qs('#thread_id').value = params.get('reply_thread_id');
  }

  function composeContext(){
    return {
      mailbox: window.SMVRuntime?.getActiveMailbox?.() || mailStatus?.mailbox?.mailbox_email || '',
      subject: qs('#subject').value.trim() || 'SkyeMail Draft',
      to: qs('#to').value.trim(),
      cc: qs('#cc').value.trim(),
      bcc: qs('#bcc').value.trim(),
      from: qs('#from_alias')?.value?.trim() || '',
      text: qs('#text').value,
      html: qs('#html').value,
      messageId: qs('#reply_message_id').value.trim(),
      threadId: qs('#thread_id').value.trim(),
      returnUrl: location.href
    };
  }

  function syncWorkbenchLink(){
    const link = qs('#workbenchComposeBtn');
    if(!link || !window.SMVRuntime) return;
    const ctx = composeContext();
    link.href = window.SMVRuntime.href('workspace.html', {
      subject: ctx.subject,
      to: ctx.to,
      from: ctx.from,
      message_id: ctx.messageId,
      thread_id: ctx.threadId,
      mailbox: ctx.mailbox
    });
  }

  function openComposeInDocx(){
    if(!window.SMVZeroOs) return note('0S bridge is not loaded yet.', 'danger');
    window.SMVZeroOs.openSkyeDocx(composeContext());
  }

  async function archiveComposePacket(){
    if(!window.SMVZeroOs) return note('0S bridge is not loaded yet.', 'danger');
    try{
      note('Archiving compose packet...');
      const data = await window.SMVZeroOs.archiveHandoff('skydocxmax-editor', composeContext());
      note(`Archived ${data.mailHandoffPacket?.packetId || 'compose packet'}.`, 'ok');
    }catch(err){ note(err.message || 'Compose packet archive failed.', 'danger'); }
  }

  async function saveDraft(){
    try{
      const payload = {
        id: qs('#draft_id').value.trim(),
        to: qs('#to').value.trim(),
        cc: qs('#cc').value.trim(),
        bcc: qs('#bcc').value.trim(),
        subject: qs('#subject').value.trim(),
        text: qs('#text').value,
        html: qs('#html').value,
        thread_id: qs('#thread_id').value.trim(),
        reply_message_id: qs('#reply_message_id').value.trim(),
        from_alias: qs('#from_alias').value.trim(),
        attachments: state.attachments,
      };
      const data = await apiFetch('/gmail-draft-save', { method:'POST', body: JSON.stringify(payload) });
      qs('#draft_id').value = data.draft?.id || '';
      qs('#thread_id').value = data.draft?.thread_id || qs('#thread_id').value;
      note(`Draft saved in ${data.mailbox}.`, 'ok');
      SMV.trackGame('draft_save', { id:data.draft?.id || data.draft?.message_id || data.draft?.thread_id || '' }, {
        celebrate:true,
        triggerType:'receipt-saved',
        message:'Draft saved. Thanks for using SkyeMail to keep the next move ready.'
      });
    }catch(err){ note(err.message || 'Draft save failed.', 'danger'); }
  }

  async function sendMail(){
    try{
      const payload = {
        to: qs('#to').value.trim(),
        cc: qs('#cc').value.trim(),
        bcc: qs('#bcc').value.trim(),
        subject: qs('#subject').value.trim(),
        text: qs('#text').value,
        html: qs('#html').value,
        reply_message_id: qs('#reply_message_id').value.trim(),
        reply_thread_id: qs('#thread_id').value.trim(),
        from_alias: qs('#from_alias').value.trim(),
        attachments: state.attachments,
      };
      const endpoint = '/mail-send';
      const sendPayload = {
          to: payload.to,
          cc: payload.cc,
          bcc: payload.bcc,
          subject: payload.subject,
          message: payload.text,
          text: payload.text,
          html: payload.html,
          reply_message_id: payload.reply_message_id,
          reply_thread_id: payload.reply_thread_id,
          from_alias: payload.from_alias,
          attachments: payload.attachments,
        };
      const data = await apiFetch(endpoint, { method:'POST', body: JSON.stringify(sendPayload) });
      note(`Email sent from ${data.from || data.from_alias || data.mailbox}.`, 'ok');
      SMV.trackGame('send', { id:data.message?.id || data.sent?.id || data.id || data.provider_message_id || data.message_id || '' }, {
        celebrate:true,
        triggerType:'workflow-complete',
        message:'Email sent and recorded. Thank you for trusting SkyeMail with the business move.'
      });
      setTimeout(()=>{ window.SMVRuntime.redirect('sent.html'); }, 700);
    }catch(err){ note(err.message || 'Send failed.', 'danger'); }
  }

  async function loadContacts(){
    try{
      const data = await apiFetch('/contacts-list');
      const all = [...(data.saved||[]), ...(data.recent||[])].slice(0,18);
      qs('#contactsQuick').innerHTML = all.length ? all.map((c)=>`<button class="btn small" type="button" data-contact="${safe(c.email)}">${safe(c.full_name || c.email)}</button>`).join('') : '<div class="mini">No contacts available yet.</div>';
      qs('#contactsQuick').querySelectorAll('[data-contact]').forEach((btn)=> btn.onclick = ()=> {
        const val = qs('#to').value.trim();
        const email = btn.dataset.contact;
        qs('#to').value = val ? `${val}, ${email}` : email;
        SMV.trackGame('contact_insert');
      });
    }catch(_err){}
  }

  async function addFiles(fileList){
    const files = Array.from(fileList || []).slice(0, 10);
    for(const file of files){
      const dataB64 = await new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onload = ()=> {
          const raw = String(reader.result || '');
          const base64 = raw.includes(',') ? raw.split(',').pop() : raw;
          resolve(base64 || '');
        };
        reader.onerror = ()=> reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });
      state.attachments.push({
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        data_b64: dataB64,
        size_bytes: file.size || 0,
        size_label: humanBytes(file.size || 0),
        existing: false,
      });
    }
    renderAttachments();
    if(files.length) SMV.trackGame('attachment', { count:files.length });
  }

  qs('#sendBtn').onclick = sendMail;
  qs('#saveDraftBtn').onclick = saveDraft;
  qs('#signatureBtn').onclick = applySignature;
  if(qs('#docxComposeBtn')) qs('#docxComposeBtn').onclick = openComposeInDocx;
  if(qs('#docxComposeSideBtn')) qs('#docxComposeSideBtn').onclick = openComposeInDocx;
  if(qs('#packetComposeBtn')) qs('#packetComposeBtn').onclick = archiveComposePacket;
  ['#subject','#to','#from_alias','#reply_message_id','#thread_id'].forEach((selector)=> {
    const el = qs(selector);
    if(el) el.addEventListener('input', syncWorkbenchLink);
    if(el) el.addEventListener('change', syncWorkbenchLink);
  });
  qs('#attachInput').addEventListener('change', async (ev)=>{
    try{
      await addFiles(ev.target.files || []);
      ev.target.value = '';
      note('Attachment queue updated.', 'ok');
    }catch(err){ note(err.message || 'Attachment load failed.', 'danger'); }
  });

  await loadSettings();
  fillFromQuery();
  await loadDraft();
  await loadContacts();
  renderAttachments();
  syncWorkbenchLink();
  note('Compose surface ready.', 'ok');
})();
