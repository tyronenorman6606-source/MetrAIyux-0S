// Runtime shim for MCP-applied visual chrome.
// The React bundle owns the primary Three/R3F, GSAP, Lenis, cursor, and living-background systems.
// This file exists so the static MCP-generated script tag resolves as JavaScript in production.
(function () {
  if (window.__quantumskyesMcpEffectsShim) return;
  window.__quantumskyesMcpEffectsShim = true;

  function boot() {
    document.documentElement.dataset.mcpNeonScrollbar = 'true';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
