
(function(){
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
      window.solTrack('lead_submit', {form:form.getAttribute('data-track-form'), service_lane:lane, page:location.pathname});
    }
  }, true);
  document.addEventListener('click', function(e){
    var el=e.target.closest('[data-track-click]');
    if(el) window.solTrack('cta_click', {label:el.getAttribute('data-track-click'), href:el.getAttribute('href')||'', page:location.pathname});
  }, true);
})();
