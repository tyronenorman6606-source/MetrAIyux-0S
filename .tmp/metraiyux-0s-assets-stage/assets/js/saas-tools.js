
(function(){
  const $ = (id)=>document.getElementById(id);
  const read = (k, fallback=null)=>{try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch(e){return fallback}}
  const write = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const now = ()=>new Date().toISOString();
  const rid = (p='rec')=>p+'_'+Math.random().toString(36).slice(2,8)+'_'+Date.now().toString(36);
  const query = new URLSearchParams(location.search);
  const slugify = (value, fallback='customer-workspace')=>String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) || fallback;
  function shortHash(value=''){
    let hash = 2166136261;
    String(value).split('').forEach((char)=>{ hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); });
    return (hash >>> 0).toString(36).slice(0,8);
  }
  function identityPreview(data={}, source='static_preview'){
    const email = String(data.email || data.customer_email || data.approval_email || '').trim().toLowerCase();
    const company = String(data.company_name || data.company || data.client || email.split('@')[0] || 'customer').trim();
    const workspace_slug = slugify(data.workspace_slug || company);
    const suffix = shortHash(`${workspace_slug}:${email}:${data.plan || 'starter-command'}`);
    return {
      customer_id: data.customer_id || `cust_${workspace_slug}_${suffix}`,
      workspace_id: data.workspace_id || `ws_${workspace_slug}_${suffix}`,
      workspace_slug,
      company_name: company,
      owner_email: email,
      gate_username: email || `${workspace_slug}@gate.metraiyux.local`,
      proposed_skyemail_alias: `${workspace_slug}@skymail.local`,
      plan: data.plan || 'starter-command',
      client_login_path: `client-login.html?client=${encodeURIComponent(workspace_slug)}`,
      founder_recovery_path: `/founder-command/?tab=recovery&workspace=${encodeURIComponent(workspace_slug)}`,
      source,
      generated_at: now()
    };
  }
  const previewClients = {
    'bobs-smoke-shop': {
      client_id:'bobs-smoke-shop',
      client:"Bob's Smoke Shop",
      workspace_id:'bob-smoke-shop-preview-001',
      workspace_slug:'bobs-smoke-shop-private-preview',
      workspace:"Bob's Smoke Shop Private Preview",
      email:'bob@bobs-smoke-shop-preview.com',
      access_code:'BOBS-FREE-WEEK-2026',
      status:'free_7_day_tester',
      preview_url:'https://bobs-smoke-shop-metraiyux-preview.pages.dev/',
      qr_url:'https://bobs-smoke-shop-metraiyux-preview.pages.dev/workspace-preview/',
      included_usage:{scans:7,commands:25,proof_exports:5,tester_seats:2},
      services:['website_scan','specials_update','inventory_content','proof_export'],
      discount:'First six months discounted if Bob keeps the workspace after the free trial.',
      company_contact:{email:'SkyesOverLondonLC@solenterprises.org',phone:'(623) 260-7073',contact_page:'https://skyesol.netlify.app/contact'}
    }
  };
  function output(id, data){ const el=$(id); if(el) el.textContent = typeof data==='string'?data:JSON.stringify(data,null,2); }
  function getForm(formId){ const form=$(formId); const data={}; if(!form) return data; new FormData(form).forEach((v,k)=>{data[k]=v}); return data; }
  function clientSafe(client){ const copy={...client}; delete copy.access_code; return copy; }
  const quoteOnlyPlanRoutes = {
    'houseoperations-command':'/sales/pricing-offer-router.html#houseoperations-stack-included',
    'houseoperations-managed':'/sales/pricing-offer-router.html#houseoperations-stack-included',
    'houseoperations-standalone-review':'/sales/pricing-offer-router.html#houseoperations-stack-included',
    'skyemusicnexus-provider-integration-proof-lane':'/sales/pricing-offer-router.html#skyemusicnexus-provider-integration-proof-lane'
  };
  const isQuoteOnlyPlan = (plan)=>Object.prototype.hasOwnProperty.call(quoteOnlyPlanRoutes, plan);
  function skyePayUrl(plan='starter-command', client='metraiyux-0s'){
    if (isQuoteOnlyPlan(plan)) {
      const reviewUrl = new URL(quoteOnlyPlanRoutes[plan], location.origin);
      reviewUrl.searchParams.set('client', client || 'metraiyux-0s');
      reviewUrl.searchParams.set('plan', plan);
      return reviewUrl.toString();
    }
    const offers={
      'starter-command':'metraiyux-starter-command',
      'growth-cabinet':'metraiyux-growth-cabinet',
      'routex-workforce-command':'metraiyux-routex-workforce-command',
      'autonomous-office':'metraiyux-autonomous-office',
      'enterprise-command':'metraiyux-enterprise-command',
      'skyemusicnexus-studio':'skyemusicnexus-studio',
      'skyemusicnexus-label-command':'skyemusicnexus-label-command',
      'skyemusicnexus-managed-music-ops':'skyemusicnexus-managed-music-ops',
      'skyemusicnexus-single-song-drop':'skyemusicnexus-single-song-drop',
      'skyemusicnexus-release-drop-plus':'skyemusicnexus-release-drop-plus',
      'skyemusicnexus-ep-drop':'skyemusicnexus-ep-drop',
      'skyemusicnexus-album-drop':'skyemusicnexus-album-drop',
      'skyemusicnexus-catalog-import-pack':'skyemusicnexus-catalog-import-pack',
      'skyemusicnexus-royalty-ledger-setup':'skyemusicnexus-royalty-ledger-setup',
      'skyemusicnexus-payout-review-pack':'skyemusicnexus-payout-review-pack',
      'skyemusicnexus-artist-profile-buildout':'skyemusicnexus-artist-profile-buildout',
      'skyemusicnexus-social-caption-pack':'skyemusicnexus-social-caption-pack',
      'skyemusicnexus-cover-canvas-request':'skyemusicnexus-cover-canvas-request',
      'skyemusicnexus-short-form-clip-brief':'skyemusicnexus-short-form-clip-brief',
      'skyemusicnexus-release-content-kit':'skyemusicnexus-release-content-kit',
      'skyemusicnexus-community-campaign-sprint':'skyemusicnexus-community-campaign-sprint',
      'skyemusicnexus-extra-artist-seat':'skyemusicnexus-extra-artist-seat',
      'skyemusicnexus-extra-release-pack':'skyemusicnexus-extra-release-pack',
      'skyemusicnexus-gated-audio-vault-pack':'skyemusicnexus-gated-audio-vault-pack',
      'skyemusicnexus-white-label-artist-portal':'skyemusicnexus-white-label-artist-portal',
      'managed-gate':'skygatefs27-managed-control-plane'
    };
    const url=new URL('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html');
    url.searchParams.set('client', client || 'metraiyux-0s');
    url.searchParams.set('offer', offers[plan] || offers['starter-command']);
    url.searchParams.set('skyemerit_code', 'SKYEMERIT-FIRST-BEST');
    return url.toString();
  }
  function issueSkyeMeritPack(data={}, source='static_onboarding'){
    const email=String(data.email || data.customer_email || data.approval_email || '').trim().toLowerCase();
    const pack={
      id:rid('skyemerit'),
      pack_id:'SKYEMERIT-FIRST-PACK',
      type:'skyemerit_pack',
      status:'issued_static_mode',
      source,
      email,
      customer_id:data.customer_id || '',
      workspace_id:data.workspace_id || '',
      issued_at:now(),
      gate_required:true,
      kaixu_credit_cents:600,
      kaixu_credit_label:'$6 premium kAIxu model spend credit',
      coupon_codes:['SKYEMERIT-FIRST-23','SKYEMERIT-FIRST-28','SKYEMERIT-FIRST-31'],
      channels:['resend','skymail','relay13','connectlog','fs27_event_mirror'],
      rule:'Discount only applies to eligible spend bands; Free99 still requires a gate session.'
    };
    write('saas_skyemerit_pack', pack);
    return pack;
  }
  function wirePlanLinks(){
    document.querySelectorAll('a[data-plan]').forEach((link)=>{
      link.addEventListener('click', (event)=>{
        const plan = link.getAttribute('data-plan') || 'starter-command';
        const client = link.getAttribute('data-client') || query.get('client') || 'metraiyux-0s';
        event.preventDefault();
        location.href = skyePayUrl(plan, client);
      });
    });
    const planSelect = document.querySelector('select[name="plan"]');
    const requestedPlan = query.get('plan');
    if (planSelect && requestedPlan) planSelect.value = requestedPlan;
  }
  function ensureIdentityPreview(formId, label){
    const form = $(formId);
    if (!form) return;
    let preview = document.querySelector(`[data-identity-preview="${formId}"]`);
    if (!preview) {
      preview = document.createElement('pre');
      preview.className = 'saas-receipt';
      preview.dataset.identityPreview = formId;
      form.insertAdjacentElement('afterend', preview);
    }
    const render = ()=>{
      const identity = identityPreview(getForm(formId), label);
      preview.textContent = JSON.stringify({ok:true, lane:'identity_email_recovery_preview', identity}, null, 2);
    };
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    render();
  }
  function getActiveSession(){ return read('saas_client_session', null); }
  function renderSession(){
    const session = getActiveSession();
    document.querySelectorAll('[data-client-session]').forEach((el)=>{
      if(!session) {
        el.innerHTML = '<span class="danger-pill">Not signed in</span><p>Use the client login page to open a workspace.</p>';
        return;
      }
      const workspace = read('saas_active_workspace', {}) || {};
      const merit = read('saas_skyemerit_pack', null);
      el.innerHTML = `<span class="status-pill">Signed in</span><h3>${session.client}</h3><p><strong>Workspace:</strong> ${session.workspace}</p><p><strong>Email:</strong> ${session.email}</p><p><strong>Status:</strong> ${session.status}</p><p><strong>Usage:</strong> ${workspace.included_usage?.scans ?? 0} scans, ${workspace.included_usage?.commands ?? 0} commands, ${workspace.included_usage?.proof_exports ?? 0} proof exports, ${workspace.included_usage?.tester_seats ?? 0} tester seats</p>${merit ? `<p><strong>SkyeMerit:</strong> ${merit.kaixu_credit_label}; ${merit.coupon_codes.join(', ')}. Gate required.</p>` : ''}`;
    });
  }
  async function postJson(url, payload){
    const res = await fetch(url, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload)});
    const data = await res.json().catch(()=>({ok:false,error:'invalid_json_response'}));
    if(!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  }
  window.SaaSUpgrade = {
    async clientLogin(){
      const data=getForm('clientLoginForm');
      const clientId=data.client_id || 'bobs-smoke-shop';
      let result;
      try {
        result = await postJson('/api/saas/client-login', data);
      } catch(error) {
        const client=previewClients[clientId];
        if(!client || String(data.email||'').trim().toLowerCase() !== client.email || String(data.access_code||'').trim() !== client.access_code) {
          output('clientLoginReceipt',{ok:false,error:error.message || 'invalid_preview_access'});
          return null;
        }
        result = {ok:true, session:{token:rid('preview'), client_id:client.client_id, workspace_id:client.workspace_id, workspace_slug:client.workspace_slug, client:client.client, email:client.email, workspace:client.workspace, status:client.status, issued_at:now(), static_mode:true}, workspace:clientSafe(client), static_fallback:true};
      }
      write('saas_client_session', result.session);
      write('saas_active_workspace', result.workspace);
      window.MetrAIyuxGateBridge?.persist?.({
        ...result.session,
        source: result.static_fallback ? '0s-client-session-static-preview' : '0s-client-session',
        platform_id: 'metraiyux-0s',
        usage_lane: 'customer-workspace',
        gate_cards: [
          { id: '0s-core', name: '0S Core', scope: 'customer-workspace' },
          { id: 'fs27', name: 'FS27 SkyGate', scope: 'identity-auth' },
          { id: 'skyerunners', name: 'SkyeRunners', scope: 'workspace-routing' }
        ]
      });
      output('clientLoginReceipt', {...result, next:'Open or claim workspace.'});
      renderSession();
      return result;
    },
    async claimClientWorkspace(){
      const session=getActiveSession();
      if(!session){ output('clientClaimReceipt',{ok:false,error:'client_not_signed_in'}); return null; }
      let result;
      try {
        result = await postJson('/api/saas/client-workspace/claim', {client_id:session.client_id, workspace_id:session.workspace_id});
      } catch(error) {
        const workspace = read('saas_active_workspace', previewClients[session.client_id] ? clientSafe(previewClients[session.client_id]) : {});
        const local = {id:session.workspace_id, type:'client_workspace', status:'preview_workspace_claimed_static_mode', claimed_at:now(), session, workspace};
        write('saas_workspace', local);
        output('clientClaimReceipt', {ok:true, claimed:true, static_fallback:true, workspace:local, note:error.message});
        return local;
      }
      write('saas_workspace', result.workspace);
      output('clientClaimReceipt', result);
      return result;
    },
    openClientDashboard(){
      const session=getActiveSession();
      if(!session){ location.href='client-login.html'; return; }
      location.href=`customer-dashboard.html?workspace=${encodeURIComponent(session.workspace_id)}`;
    },
    saveSignup(){ const data=getForm('signupForm'); const form=$('signupForm'); if(form && form.legal_acknowledgment && !form.legal_acknowledgment.checked){ output('signupReceipt',{ok:false,error:'legal_acknowledgment_required', required_links:['https://skyes-over-london-legal.pages.dev/legal/twilio-sms/','https://skyes-over-london-legal.pages.dev/legal/terms/','https://skyes-over-london-legal.pages.dev/legal/privacy/']}); return null; } const skyemerit=issueSkyeMeritPack(data,'signup'); const identity=identityPreview(data,'signup'); const rec={...data,id:rid('signup'), type:'signup_intent', status:'local_saved_needs_backend', created_at:now(), legal_acknowledgment:data.legal_acknowledgment === 'yes', legal_notice_url:'https://skyes-over-london-legal.pages.dev/legal/twilio-sms/', terms_url:'https://skyes-over-london-legal.pages.dev/legal/terms/', privacy_url:'https://skyes-over-london-legal.pages.dev/legal/privacy/', sms_data_notice:'User acknowledged the Twilio SMS Consent and 0S Data Notice during signup.', identity, skyemerit}; const all=read('saas_signups',[]); all.push(rec); write('saas_signups',all); write('saas_identity_preview',identity); output('signupReceipt',rec); return rec; },
    saveOnboarding(){ const data=getForm('onboardingForm'); const skyemerit=issueSkyeMeritPack(data,'onboarding'); const signup=read('saas_signups',[]).slice(-1)[0]||{}; const identity=identityPreview({...signup,...data,email:data.approval_email||signup.email},'onboarding'); const rec={id:rid('onboarding'), type:'customer_onboarding', status:'ready_for_workspace_provisioning', created_at:now(), identity, skyemerit, ...data}; const all=read('saas_onboarding',[]); all.push(rec); write('saas_onboarding',all); write('saas_identity_preview',identity); output('onboardingReceipt',rec); return rec; },
    saveCompanyProfile(){ const data=getForm('companyProfileForm'); const rec={id:rid('company'), type:'company_profile', status:'profile_saved', updated_at:now(), ...data}; write('saas_company_profile',rec); output('companyProfileReceipt',rec); return rec; },
    saveServices(){ const data=getForm('serviceSelectorForm'); const services=[...document.querySelectorAll('input[name="services"]:checked')].map(x=>x.value); const rec={id:rid('services'), type:'service_selection', status:'services_selected', created_at:now(), plan:data.plan, services, notes:data.notes||''}; write('saas_service_selection',rec); output('serviceReceipt',rec); return rec; },
    createWorkspace(){ const profile=read('saas_company_profile',{}), services=read('saas_service_selection',{}), onboarding=read('saas_onboarding',[]).slice(-1)[0]||{}, identity=read('saas_identity_preview', null)||identityPreview({...profile,...onboarding},'workspace'); const workspace={id:identity.workspace_id||rid('ws'), type:'customer_workspace', status:'local_workspace_ready_for_cloudflare_provisioning', created_at:now(), identity, profile, services, onboarding, modules:['admin_brain','approval_inbox','company_profile','service_selector','client_os','proof_vault','skyemail_key_card','gate_backup_codes','skyeprofitconsole_free99']}; write('saas_workspace',workspace); output('workspaceReceipt',workspace); return workspace; },
    makeBillingIntent(){ const data=getForm('billingForm'); const plan=data.plan || query.get('plan') || 'starter-command'; const quoteOnly=isQuoteOnlyPlan(plan); const checkout_url=skyePayUrl(plan, data.client_slug || 'metraiyux-0s'); const skyemerit=read('saas_skyemerit_pack', null) || issueSkyeMeritPack({email:data.billing_email},'billing'); const rec={id:rid('bill'), type:quoteOnly ? 'quote_only_billing_review' : 'skyepay_billing_intent', status:quoteOnly ? 'quote_only_owner_review' : 'ready_for_skyepay_checkout', created_at:now(), checkout_url, skyemerit, owner_approval_required:true, ...data, plan, next:quoteOnly ? 'Open the pricing router for owner-approved quote review. This plan does not create a standalone SkyePay checkout in this pass.' : 'Open SkyePay to create the Stripe Checkout Session. FS27 applies SkyeMerit only to eligible spend and keeps activation behind the gate.'}; const all=read('saas_billing_intents',[]); all.push(rec); write('saas_billing_intents',all); output('billingReceipt',rec); return rec; },
    openSkyePay(){ const data=getForm('billingForm'); const url=skyePayUrl(data.plan || query.get('plan') || 'starter-command', data.client_slug || 'metraiyux-0s'); this.makeBillingIntent(); location.href=url; },
    command(){ const data=getForm('customerCommandForm'); const session=getActiveSession(); const rec={id:rid('cmd'), type:'customer_workspace_command', workspace_id:data.workspace_id || query.get('workspace') || session?.workspace_id || '', client:session?.client || '', status:'routed_to_site_operator_brain_static_mode', created_at:now(), command:data.command||'', priority:data.priority||'normal', route:this.routeCommand(data.command||'')}; const all=read('saas_customer_commands',[]); all.push(rec); write('saas_customer_commands',all); output('commandReceipt',rec); return rec; },
    routeCommand(text){ const t=text.toLowerCase(); if(/post|social|content|blog|marketing/.test(t)) return {primary:'Valentina Reyes / Marketing Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/hire|candidate|recruit|staff|worker/.test(t)) return {primary:'Sienna Brooks / Staffing Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/contract|legal|compliance|filing|claim/.test(t)) return {primary:'Julian Mercer / Compliance Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/invoice|price|billing|payment/.test(t)) return {primary:'Naomi Sterling / Finance Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/lead|sale|proposal|close/.test(t)) return {primary:'Celeste Monroe / Revenue Brain', secondary:'Adrian Cross / Client Success Brain', approval_required:false}; return {primary:'Site Operator Brain', secondary:'Central Company Command Brain', approval_required:false}; },
    exportAll(){ const keys=['saas_signups','saas_onboarding','saas_company_profile','saas_service_selection','saas_workspace','saas_billing_intents','saas_customer_commands']; const bundle={exported_at:now()}; keys.forEach(k=>bundle[k]=read(k, null)); output('exportReceipt',bundle); const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='saas-customer-portal-export.json'; a.click(); },
    clearAll(){ ['saas_signups','saas_onboarding','saas_company_profile','saas_service_selection','saas_workspace','saas_billing_intents','saas_customer_commands'].forEach(k=>localStorage.removeItem(k)); output('exportReceipt',{cleared_at:now()}); }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    renderSession();
    wirePlanLinks();
    ensureIdentityPreview('signupForm','signup');
    ensureIdentityPreview('onboardingForm','onboarding');
  });
})();
