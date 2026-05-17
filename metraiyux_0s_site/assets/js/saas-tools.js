
(function(){
  const $ = (id)=>document.getElementById(id);
  const read = (k, fallback=null)=>{try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch(e){return fallback}}
  const write = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const now = ()=>new Date().toISOString();
  const rid = (p='rec')=>p+'_'+Math.random().toString(36).slice(2,8)+'_'+Date.now().toString(36);
  const query = new URLSearchParams(location.search);
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
  function skyePayUrl(plan='starter-command', client='metraiyux-0s'){
    const offers={
      'starter-command':'metraiyux-starter-command',
      'growth-cabinet':'metraiyux-growth-cabinet',
      'houseoperations-command':'metraiyux-houseoperations-command',
      'houseoperations-managed':'metraiyux-houseoperations-managed',
      'routex-workforce-command':'metraiyux-routex-workforce-command',
      'autonomous-office':'metraiyux-autonomous-office',
      'enterprise-command':'metraiyux-enterprise-command',
      'managed-gate':'skygatefs27-managed-control-plane'
    };
    const url=new URL('https://skyesol.netlify.app/skyepay.html');
    url.searchParams.set('client', client || 'metraiyux-0s');
    url.searchParams.set('offer', offers[plan] || offers['starter-command']);
    return url.toString();
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
  function getActiveSession(){ return read('saas_client_session', null); }
  function renderSession(){
    const session = getActiveSession();
    document.querySelectorAll('[data-client-session]').forEach((el)=>{
      if(!session) {
        el.innerHTML = '<span class="danger-pill">Not signed in</span><p>Use the client login page to open a workspace.</p>';
        return;
      }
      const workspace = read('saas_active_workspace', {}) || {};
      el.innerHTML = `<span class="status-pill">Signed in</span><h3>${session.client}</h3><p><strong>Workspace:</strong> ${session.workspace}</p><p><strong>Email:</strong> ${session.email}</p><p><strong>Status:</strong> ${session.status}</p><p><strong>Usage:</strong> ${workspace.included_usage?.scans ?? 0} scans, ${workspace.included_usage?.commands ?? 0} commands, ${workspace.included_usage?.proof_exports ?? 0} proof exports, ${workspace.included_usage?.tester_seats ?? 0} tester seats</p>`;
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
    saveSignup(){ const data=getForm('signupForm'); const rec={id:rid('signup'), type:'signup_intent', status:'local_saved_needs_backend', created_at:now(), ...data}; const all=read('saas_signups',[]); all.push(rec); write('saas_signups',all); output('signupReceipt',rec); return rec; },
    saveOnboarding(){ const data=getForm('onboardingForm'); const rec={id:rid('onboarding'), type:'customer_onboarding', status:'ready_for_workspace_provisioning', created_at:now(), ...data}; const all=read('saas_onboarding',[]); all.push(rec); write('saas_onboarding',all); output('onboardingReceipt',rec); return rec; },
    saveCompanyProfile(){ const data=getForm('companyProfileForm'); const rec={id:rid('company'), type:'company_profile', status:'profile_saved', updated_at:now(), ...data}; write('saas_company_profile',rec); output('companyProfileReceipt',rec); return rec; },
    saveServices(){ const data=getForm('serviceSelectorForm'); const services=[...document.querySelectorAll('input[name="services"]:checked')].map(x=>x.value); const rec={id:rid('services'), type:'service_selection', status:'services_selected', created_at:now(), plan:data.plan, services, notes:data.notes||''}; write('saas_service_selection',rec); output('serviceReceipt',rec); return rec; },
    createWorkspace(){ const profile=read('saas_company_profile',{}), services=read('saas_service_selection',{}), onboarding=read('saas_onboarding',[]).slice(-1)[0]||{}; const workspace={id:rid('ws'), type:'customer_workspace', status:'local_workspace_ready_for_cloudflare_provisioning', created_at:now(), profile, services, onboarding, modules:['admin_brain','approval_inbox','company_profile','service_selector','client_os','proof_vault','skyeprofitconsole_free99']}; write('saas_workspace',workspace); output('workspaceReceipt',workspace); return workspace; },
    makeBillingIntent(){ const data=getForm('billingForm'); const checkout_url=skyePayUrl(data.plan || query.get('plan') || 'starter-command', data.client_slug || 'metraiyux-0s'); const rec={id:rid('bill'), type:'skyepay_billing_intent', status:'ready_for_skyepay_checkout', created_at:now(), checkout_url, owner_approval_required:true, ...data, next:'Open SkyePay to create the Stripe Checkout Session. FS27 keeps activation pending until owner approval.'}; const all=read('saas_billing_intents',[]); all.push(rec); write('saas_billing_intents',all); output('billingReceipt',rec); return rec; },
    openSkyePay(){ const data=getForm('billingForm'); const url=skyePayUrl(data.plan || query.get('plan') || 'starter-command', data.client_slug || 'metraiyux-0s'); this.makeBillingIntent(); location.href=url; },
    command(){ const data=getForm('customerCommandForm'); const session=getActiveSession(); const rec={id:rid('cmd'), type:'customer_workspace_command', workspace_id:data.workspace_id || query.get('workspace') || session?.workspace_id || '', client:session?.client || '', status:'routed_to_site_operator_brain_static_mode', created_at:now(), command:data.command||'', priority:data.priority||'normal', route:this.routeCommand(data.command||'')}; const all=read('saas_customer_commands',[]); all.push(rec); write('saas_customer_commands',all); output('commandReceipt',rec); return rec; },
    routeCommand(text){ const t=text.toLowerCase(); if(/post|social|content|blog|marketing/.test(t)) return {primary:'Valentina Reyes / Marketing Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/hire|candidate|recruit|staff|worker/.test(t)) return {primary:'Sienna Brooks / Staffing Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/contract|legal|compliance|filing|claim/.test(t)) return {primary:'Julian Mercer / Compliance Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/invoice|price|billing|payment/.test(t)) return {primary:'Naomi Sterling / Finance Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/lead|sale|proposal|close/.test(t)) return {primary:'Celeste Monroe / Revenue Brain', secondary:'Adrian Cross / Client Success Brain', approval_required:false}; return {primary:'Site Operator Brain', secondary:'Central Company Command Brain', approval_required:false}; },
    exportAll(){ const keys=['saas_signups','saas_onboarding','saas_company_profile','saas_service_selection','saas_workspace','saas_billing_intents','saas_customer_commands']; const bundle={exported_at:now()}; keys.forEach(k=>bundle[k]=read(k, null)); output('exportReceipt',bundle); const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='saas-customer-portal-export.json'; a.click(); },
    clearAll(){ ['saas_signups','saas_onboarding','saas_company_profile','saas_service_selection','saas_workspace','saas_billing_intents','saas_customer_commands'].forEach(k=>localStorage.removeItem(k)); output('exportReceipt',{cleared_at:now()}); }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    renderSession();
    wirePlanLinks();
  });
})();
