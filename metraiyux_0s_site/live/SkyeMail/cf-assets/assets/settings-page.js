(async function(){
  const boot = await SMV.withBoot('settings', 'Settings', 'Profile, aliases, signatures, and auto reply');
  if(!boot) return;
  const statusEl = qs('#statusText');
  const aliasStatusEl = qs('#aliasCreateStatus');
  let settings = null;
  function note(msg, kind=''){ setStatus(statusEl, msg, kind); }
  function aliasNote(msg, kind=''){ setStatus(aliasStatusEl, msg, kind); }
  function normalizeLocalPart(value){
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .replace(/[._-]{2,}/g, '-')
      .slice(0, 32);
  }
  function toDateTimeLocal(value){
    if(!value) return '';
    const d = new Date(Number(value));
    if(!Number.isFinite(d.getTime())) return '';
    const pad = (n)=> String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function renderAliases(list){
    const el = qs('#aliasList');
    if(!el) return;
    if(!list.length){ el.innerHTML = '<div class="empty">No send-as or hosted aliases returned yet.</div>'; return; }
    el.innerHTML = list.map((item)=>`
      <div class="alias-card">
        <div><b>${safe(item.displayName || item.display_name || item.sendAsEmail || item.alias_email)}</b></div>
        <div class="mini">${safe(item.sendAsEmail || item.alias_email)} • ${safe(item.verificationStatus || item.status || 'accepted')}</div>
        <div class="contact-meta" style="margin-top:8px">
          ${item.isPrimary || item.alias_type === 'primary' ? '<span class="chip">Primary</span>' : ''}
          ${item.isDefault ? '<span class="chip">Default</span>' : ''}
          ${item.treatAsAlias || item.alias_type ? `<span class="chip">${safe(item.alias_type || 'Alias')}</span>` : ''}
        </div>
      </div>`).join('');
  }
  function renderPreferredAliases(hostedAliases = [], gmailAliases = []){
    const options = [
      ...hostedAliases.map((item)=>({
        value: item.alias_email,
        label: `${item.display_name || item.alias_type || 'SkyeMail'} • ${item.alias_email}`
      })),
      ...gmailAliases.map((item)=>({
        value: item.sendAsEmail,
        label: `${item.displayName || item.sendAsEmail} • ${item.sendAsEmail}`
      }))
    ].filter((item)=> item.value);
    qs('#preferred_from_alias').innerHTML = options.length
      ? options.map((item)=>`<option value="${safe(item.value)}">${safe(item.label)}</option>`).join('')
      : '<option value="">Primary mailbox</option>';
  }
  async function loadAliasDomains(){
    const domainSelect = qs('#aliasDomain');
    if(!domainSelect) return;
    try{
      const data = await apiFetch('/mailbox-domains');
      const domains = data.domains || [];
      domainSelect.innerHTML = domains.map((domain)=>`<option value="${safe(domain)}">${safe(domain)}</option>`).join('');
      if(data.primary_domain) domainSelect.value = data.primary_domain;
    }catch(err){
      domainSelect.innerHTML = '<option value="solenterprises.org">solenterprises.org</option>';
      aliasNote(err.message || 'Alias domain load failed.', 'danger');
    }
  }
  async function loadHostedAliasesOnly(){
    const data = await apiFetch('/mailbox-aliases');
    settings = settings || {};
    settings.hosted = { mailbox: data.mailbox, aliases: data.aliases || [] };
    renderPreferredAliases(settings.hosted.aliases, settings.gmail?.aliases || []);
    renderAliases([...(settings.hosted.aliases || []), ...(settings.gmail?.aliases || [])]);
    return data;
  }
  async function load(){
    try{
      settings = await apiFetch('/mail-settings-get');
      qs('#display_name').value = settings.profile?.display_name || settings.gmail?.sendAs?.displayName || '';
      qs('#profile_title').value = settings.profile?.profile_title || '';
      qs('#profile_company').value = settings.profile?.profile_company || 'Skyes Over London LC';
      qs('#profile_phone').value = settings.profile?.profile_phone || '(480) 469-5416';
      qs('#profile_website').value = settings.profile?.profile_website || 'https://SOLEnterprises.org';
      qs('#signature_text').value = settings.profile?.signature_text || '';
      qs('#signature_html').value = settings.profile?.signature_html || settings.gmail?.sendAs?.signature || '';
      renderPreferredAliases(settings.hosted?.aliases || [], settings.gmail?.aliases || []);
      if(settings.profile?.preferred_from_alias) qs('#preferred_from_alias').value = settings.profile.preferred_from_alias;
      const hostedMailbox = settings.hosted?.mailbox?.mailbox_email || '';
      qs('#gmailStatus').textContent = hostedMailbox ? `Connected mailbox • ${hostedMailbox}` : (settings.gmail?.connected ? `Connected mailbox • ${settings.gmail.google_email}` : 'No SkyeMail mailbox provisioned');
      qs('#scopeStatus').textContent = hostedMailbox ? 'SkyeMail mailbox settings are ready.' : (settings.gmail?.signature_scope_ready ? 'Mailbox settings scope is ready.' : (settings.gmail?.scope_note || 'Provision SkyeMail to manage mailbox settings.'));
      qs('#contactsScope').textContent = settings.gmail?.connected ? `Contacts sync ${settings.gmail.contacts_last_sync_at ? `ready • last sync ${fmtDate(settings.gmail.contacts_last_sync_at)}` : 'ready • never synced yet'}` : 'Citadel Database and SkyeNet aliases and contact records are managed here.';
      renderAliases([...(settings.hosted?.aliases || []), ...(settings.gmail?.aliases || [])]);
      const vacation = settings.gmail?.vacation || {};
      qs('#vacation_enabled').checked = !!vacation.enableAutoReply;
      qs('#vacation_subject').value = vacation.responseSubject || '';
      qs('#vacation_response_text').value = vacation.responseBodyPlainText || '';
      qs('#vacation_response_html').value = vacation.responseBodyHtml || '';
      qs('#vacation_restrict_contacts').checked = !!vacation.restrictToContacts;
      qs('#vacation_restrict_domain').checked = !!vacation.restrictToDomain;
      qs('#vacation_start').value = toDateTimeLocal(vacation.startTime);
      qs('#vacation_end').value = toDateTimeLocal(vacation.endTime);
      note('Settings loaded.', 'ok');
    }catch(err){
      note(err.message || 'Settings load failed; loading hosted aliases only.', 'danger');
      try{ await loadHostedAliasesOnly(); }
      catch(aliasErr){ aliasNote(aliasErr.message || 'Hosted alias load failed.', 'danger'); }
    }
  }
  async function createAlias(){
    try{
      const local = normalizeLocalPart(qs('#aliasLocalPart').value);
      const domain = String(qs('#aliasDomain').value || '').trim().toLowerCase();
      if(!local) throw new Error('Choose an alias prefix first.');
      if(!domain) throw new Error('Choose an alias domain first.');
      const alias_email = `${local}@${domain}`;
      aliasNote(`Creating ${alias_email}…`);
      await apiFetch('/mailbox-aliases', {
        method:'POST',
        body: JSON.stringify({
          alias_email,
          alias_type: 'custom',
          display_name: qs('#aliasDisplayName').value.trim(),
          user_generated: true,
          source: 'settings_alias_form'
        })
      });
      qs('#aliasLocalPart').value = '';
      aliasNote(`${alias_email} is now routed into this inbox.`, 'ok');
      SMV.trackGame('alias_create');
      await loadHostedAliasesOnly();
    }catch(err){ aliasNote(err.message || 'Alias creation failed.', 'danger'); }
  }
  async function save(syncGmail){
    try{
      const payload = {
        display_name: qs('#display_name').value.trim(),
        profile_title: qs('#profile_title').value.trim(),
        profile_company: qs('#profile_company').value.trim(),
        profile_phone: qs('#profile_phone').value.trim(),
        profile_website: qs('#profile_website').value.trim(),
        signature_text: qs('#signature_text').value,
        signature_html: qs('#signature_html').value,
        preferred_from_alias: qs('#preferred_from_alias').value.trim(),
        sync_gmail: !!syncGmail,
        sync_vacation: !!syncGmail,
        vacation_enabled: qs('#vacation_enabled').checked,
        vacation_subject: qs('#vacation_subject').value,
        vacation_response_text: qs('#vacation_response_text').value,
        vacation_response_html: qs('#vacation_response_html').value,
        vacation_restrict_contacts: qs('#vacation_restrict_contacts').checked,
        vacation_restrict_domain: qs('#vacation_restrict_domain').checked,
        vacation_start: qs('#vacation_start').value,
        vacation_end: qs('#vacation_end').value,
      };
      const data = await apiFetch('/mail-settings-save', { method:'POST', body: JSON.stringify(payload) });
      if(data.gmail_error){ note(`Settings saved, but hosted settings sync reported: ${data.gmail_error}`, 'danger'); }
      else note(syncGmail ? 'Settings, signature, and auto reply synced.' : 'Settings saved.', 'ok');
      SMV.trackGame(syncGmail ? 'settings_sync' : 'settings_save');
      await load();
    }catch(err){ note(err.message || 'Settings save failed.', 'danger'); }
  }
  qs('#saveBtn').onclick = ()=> save(false);
  qs('#syncBtn').onclick = ()=> save(true);
  qs('#connectBtn').onclick = ()=> (window.SMVRuntime || { redirect: (value) => { location.href = value; } }).redirect('onboarding.html');
  qs('#disconnectBtn').onclick = async ()=> { if(!confirm('Disconnect the SkyeMail mailbox from this workspace?')) return; try{ await SMV.disconnectGoogle(); await load(); note('Mailbox disconnected.', 'ok'); }catch(err){ note(err.message || 'Disconnect failed.', 'danger'); } };
  qs('#watchBtn').onclick = async ()=> { try{ const data = await SMV.enableWatch(); note(`Push watch active until ${fmtDate(data.watch?.expiration || '')}.`, 'ok'); }catch(err){ note(err.message || 'Push watch failed.', 'danger'); } };
  qs('#createAliasBtn').onclick = createAlias;
  await loadAliasDomains();
  await load();
})();
