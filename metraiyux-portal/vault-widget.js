/**
 * Skye Vault — Empire-Wide Upload Widget
 * Drop this script on any site to add a "Send Files" button that opens the vault.
 *
 * Usage:
 *   <script src="https://skyevault-drop.netlify.app/vault-widget.js"
 *           data-source="solenterprises"
 *           data-vault-url="https://skyevault-drop.netlify.app/vault.html"
 *           data-label="Send Files to Vault">
 *   </script>
 *
 * data-source values:
 *   portal | solenterprises | metraiyux | skye-bcc | client | contractor | internal
 */
(function () {
  'use strict';

  const script = document.currentScript;
  const source = (script && script.getAttribute('data-source')) || 'widget';
  const vaultUrl = (script && script.getAttribute('data-vault-url')) || 'vault.html';
  const label = (script && script.getAttribute('data-label')) || 'Send Files';
  const mode = (script && script.getAttribute('data-mode')) || 'button'; // 'button' | 'inline'

  function buildUrl() {
    const params = new URLSearchParams({ source });
    if (mode === 'inline') params.set('embed', '1');
    return vaultUrl + '?' + params.toString();
  }

  if (mode === 'inline') {
    // Inline iframe
    const container = document.createElement('div');
    container.style.cssText = 'width:100%;margin:0;padding:0;';
    const frame = document.createElement('iframe');
    frame.src = buildUrl();
    frame.style.cssText = 'width:100%;height:680px;border:none;border-radius:10px;';
    frame.title = 'Skye Vault — Secure File Upload';
    frame.loading = 'lazy';
    frame.allow = 'clipboard-write';
    container.appendChild(frame);
    if (script && script.parentNode) {
      script.parentNode.insertBefore(container, script.nextSibling);
    }
  } else {
    // Floating button
    const btn = document.createElement('a');
    btn.href = buildUrl();
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = label;
    btn.setAttribute('aria-label', label + ' — Skye Vault secure upload');
    btn.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:8px',
      'padding:10px 20px',
      'background:linear-gradient(135deg,#e84c30,#f5a623)',
      'color:#fff',
      'font-family:system-ui,sans-serif',
      'font-size:.88rem',
      'font-weight:600',
      'border-radius:7px',
      'text-decoration:none',
      'cursor:pointer',
      'transition:opacity .2s',
    ].join(';');
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '.85'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });

    if (script && script.parentNode) {
      script.parentNode.insertBefore(btn, script.nextSibling);
    }
  }
})();
