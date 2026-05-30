(function(){
  if (window.__ROUTEX_HOUSECIRCLE_V64__) return;
  window.__ROUTEX_HOUSECIRCLE_V64__ = true;

  function gateBridge() {
    return window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  }

  function gateHeaders(extra) {
    var bridge = gateBridge();
    var headers = bridge && typeof bridge.headers === 'function'
      ? bridge.headers({ 'x-skye-platform': 'skyeroutex', 'x-skye-usage-lane': 'workforce-command' })
      : {};
    return Object.assign({ 'content-type': 'application/json' }, headers || {}, extra || {});
  }

  function disabled() {
    return Promise.reject(new Error('RouteX V64 local cloud-session controls are retired. Use the current SkyeRouteX Workforce Command surface through the shared 0S Gate.'));
  }

  window.RoutexPlatformHouseCircleV64 = {
    version: '64.0.0-shared-gate-retired',
    readCloudConfig: function(){ return { enabled: false, authMode: 'shared-fs27-skygate-free99' }; },
    saveCloudConfig: function(){ return { enabled: false, authMode: 'shared-fs27-skygate-free99' }; },
    readCloudSession: function(){ return gateBridge() && typeof gateBridge.current === 'function' ? gateBridge.current() : null; },
    saveCloudSession: function(){ return null; },
    authHeaders: gateHeaders,
    fetchCloudHealth: disabled,
    loginCloud: disabled,
    pushCloudBundle: disabled,
    pullCloudBundle: disabled,
    replayCloudOutbox: disabled,
    scheduleCloudTick: function(){ return false; },
    appendCloudLog: function(){ return null; },
    readCloudLog: function(){ return []; },
    readCloudOutbox: function(){ return []; },
    queueCloudAction: function(){ return null; },
    readCloudSummary: function(){ return { authMode: 'shared-fs27-skygate-free99' }; }
  };
})();
