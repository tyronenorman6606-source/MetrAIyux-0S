/**
 * SkyeSol public auth bridge.
 *
 * Netlify Identity is intentionally disabled on SkyeNet. Owner, client, and
 * paid AI access must resolve through the shared 0S/FS27 gate session.
 */
(function () {
  "use strict";

  function gateLoginUrl() {
    var login = new URL("https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html");
    login.searchParams.set("return", window.location.href);
    return login.toString();
  }

  function currentSession() {
    var bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
    return bridge && typeof bridge.current === "function" ? bridge.current() : null;
  }

  window.SkyeSolIdentity = {
    provider: "fs27-skygate",
    currentUser: currentSession,
    open: function () { window.location.href = gateLoginUrl(); },
    login: function () { window.location.href = gateLoginUrl(); },
    logout: function () {
      var bridge = window.MetrAIyuxGateBridge || null;
      if (bridge && typeof bridge.clear === "function") bridge.clear();
      window.location.href = "/index.html";
    },
    on: function (eventName, handler) {
      if (eventName === "init" && typeof handler === "function") {
        setTimeout(function () { handler(currentSession()); }, 0);
      }
    }
  };

  if (/(?:confirmation_token|invite_token|recovery_token|access_token)=/i.test(window.location.hash || "")) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.location.href = gateLoginUrl();
  }
})();
