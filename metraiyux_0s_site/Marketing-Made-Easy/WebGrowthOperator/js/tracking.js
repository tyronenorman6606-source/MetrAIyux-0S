
(function(){
  function field(form, name){
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || '').trim() : '';
  }
  function tokenFromValue(value){
    if(!value) return '';
    var raw = String(value).trim();
    try{
      var parsed = JSON.parse(raw);
      return String(parsed.token || parsed.session || parsed.bearer || parsed.access_token || '').replace(/^Bearer\s+/i,'').trim();
    }catch(err){}
    return raw.replace(/^Bearer\s+/i,'').trim();
  }
  function gateHeaders(){
    var keys = ['FREE99_PLATFORM_GATE_SESSION','FREE99_PLATFORM_GATE_SESSION_MARKETING_MADE_EASY','skye_gate_session','skygate_session','skyegate_session','skyeGateSession','skye_gate_token','skygate_token','skyegate_token','metraiyux_gate_session','metraiyux_admin_session'];
    for(var s=0;s<2;s++){
      var store = s === 0 ? window.sessionStorage : window.localStorage;
      try{
        for(var i=0;i<keys.length;i++){
          var token = tokenFromValue(store.getItem(keys[i]));
          if(token) return {'authorization':'Bearer ' + token, 'x-skye-gate-session':token, 'x-free99-gate-session':token, 'x-free99-admin-code':token};
        }
      }catch(err){}
    }
    return {};
  }
  function mirrorClientIntake(form){
    var endpoint = form.getAttribute('data-first-party-intake');
    if(!endpoint) return;
    var details = field(form, 'details');
    var payload = {
      source: 'webgrowthoperator',
      source_app: field(form, 'source_app') || 'webgrowthoperator',
      capture_flow: field(form, 'capture_flow') || 'formsubmit_email_plus_0s_site_operator_intake',
      name: field(form, 'name'),
      full_name: field(form, 'name'),
      business: field(form, 'business'),
      company: field(form, 'business'),
      company_name: field(form, 'business'),
      email: field(form, 'email'),
      phone: field(form, 'phone'),
      service_lane: field(form, 'service_lane'),
      domain: field(form, 'domain'),
      details: details,
      message: [field(form, 'service_lane'), field(form, 'business'), field(form, 'domain'), details].filter(Boolean).join(' | '),
      page: location.pathname,
      referrer: document.referrer || '',
      submitted_at: new Date().toISOString(),
      user_agent: navigator.userAgent || ''
    };
    var body = JSON.stringify(payload);
    try{
      var headers = Object.assign({'content-type':'application/json'}, gateHeaders());
      fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: body,
        credentials: 'include',
        keepalive: true
      }).catch(function(){});
      return;
    }catch(err){}
    try{
      if(navigator.sendBeacon){
        var sent = navigator.sendBeacon(endpoint, new Blob([body], {type:'application/json'}));
        if(sent) return;
      }
    }catch(err){}
  }
  window.solTrack = window.solTrack || function(eventName, payload){
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event:eventName, sol_payload:payload || {}, timestamp:new Date().toISOString()});
    if(window.fbq && eventName === 'lead_submit') window.fbq('track','Lead', payload || {});
    if(window.gtag && eventName === 'lead_submit') window.gtag('event','generate_lead', payload || {});
  };
  document.addEventListener('submit', function(e){
    var form=e.target;
    if(form && form.matches('[data-track-form]')){
      var lane=(form.querySelector('[name="service_lane"]')||{}).value || '';
      mirrorClientIntake(form);
      window.solTrack('lead_submit', {form:form.getAttribute('data-track-form'), service_lane:lane, page:location.pathname});
    }
  }, true);
  document.addEventListener('click', function(e){
    var el=e.target.closest('[data-track-click]');
    if(el) window.solTrack('cta_click', {label:el.getAttribute('data-track-click'), href:el.getAttribute('href')||'', page:location.pathname});
  }, true);
})();
