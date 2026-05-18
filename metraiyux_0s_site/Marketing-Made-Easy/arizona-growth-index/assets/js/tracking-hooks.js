(function(){
  window.SkyeTracking = window.SkyeTracking || {events:[]};
  var cfg = window.SOL_TRACKING_CONFIG || {};
  var loaded = {};

  function isFilled(value){
    return typeof value === 'string' && value.trim() && value.indexOf('REPLACE_') !== 0;
  }

  function addScript(src, id, onload){
    if(id && document.getElementById(id)) return;
    var s = document.createElement('script');
    if(id) s.id = id;
    s.async = true;
    s.src = src;
    if(onload) s.onload = onload;
    document.head.appendChild(s);
  }

  function loadGA4(){
    if(loaded.ga4 || !isFilled(cfg.GA4_MEASUREMENT_ID)) return;
    loaded.ga4 = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', cfg.GA4_MEASUREMENT_ID, { anonymize_ip: true });
    addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.GA4_MEASUREMENT_ID), 'sol-ga4');
  }

  function loadGoogleAds(){
    if(loaded.ads || !isFilled(cfg.GOOGLE_ADS_CONVERSION_ID)) return;
    loaded.ads = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ dataLayer.push(arguments); };
    gtag('config', cfg.GOOGLE_ADS_CONVERSION_ID);
    addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.GOOGLE_ADS_CONVERSION_ID), 'sol-google-ads');
  }

  function loadClarity(){
    if(loaded.clarity || !isFilled(cfg.CLARITY_PROJECT_ID)) return;
    loaded.clarity = true;
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, 'clarity', 'script', cfg.CLARITY_PROJECT_ID);
  }

  function loadMetaPixel(){
    if(loaded.meta || !isFilled(cfg.META_PIXEL_ID)) return;
    loaded.meta = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.META_PIXEL_ID);
    fbq('track', 'PageView');
  }

  function loadConfiguredProviders(){
    loadGA4();
    loadGoogleAds();
    loadClarity();
    loadMetaPixel();
  }

  function track(name, payload){
    payload = payload || {};
    window.SkyeTracking.events.push({name:name, payload:payload, ts:new Date().toISOString()});
    if(window.gtag){
      window.gtag('event', name, payload);
      if(name === 'lead_form_submit_attempt' && isFilled(cfg.GOOGLE_ADS_CONVERSION_ID) && isFilled(cfg.GOOGLE_ADS_LEAD_CONVERSION_LABEL)){
        window.gtag('event', 'conversion', {
          send_to: cfg.GOOGLE_ADS_CONVERSION_ID + '/' + cfg.GOOGLE_ADS_LEAD_CONVERSION_LABEL,
          event_category: 'lead',
          event_label: payload.form || 'site-form'
        });
      }
    }
    if(window.clarity){ window.clarity('event', name); }
    if(window.fbq){ window.fbq('trackCustom', name, payload); }
  }

  loadConfiguredProviders();

  document.addEventListener('submit', function(e){
    var form=e.target;
    if(form && form.matches('form')) track('lead_form_submit_attempt', {form: form.getAttribute('name')||'site-form'});
  }, true);

  document.addEventListener('click', function(e){
    var a=e.target.closest && e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(href.indexOf('mailto:')===0 || href.indexOf('tel:')===0 || a.classList.contains('primary')){
      track('conversion_click', {label:(a.textContent||'').trim(), href:href});
    }
  });
})();
