/* sandbox/host.js
   Receives messages from the main app and executes code inside a nested sandbox iframe.
   Security posture:
   - Stage iframe is sandboxed (allow-scripts, allow-modals)
   - No same-origin permission; no network (CSP inherited from host)
   - Scripts are executed via blob URLs (no eval / no Function)
*/
'use strict';

const stage = document.getElementById('stage');

function buildDoc({title, htmlBody, jsCode}){
  // Minimal HTML shell. Styles allowed, scripts via external URLs or blob only.
  const safeTitle = String(title || 'Sandbox');
  const body = htmlBody || '<style>body{font-family:system-ui;padding:16px;color:#111;margin:0;}</style><div>Ready.</div>';

  // Always load bridge first, then optional user script blob.
  const bridgeUrl = new URL('./stage-bridge.js', location.href).toString();

  const scripts = [];
  scripts.push(`<script src="${bridgeUrl}"></script>`);
  if (jsCode){
    const blobUrl = URL.createObjectURL(new Blob([String(jsCode)], {type:'text/javascript'}));
    scripts.push(`<script src="${blobUrl}"></script>`);
  }

  return `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle.replace(/[<>]/g,'')}</title>
</head><body>${body}
${scripts.join('\n')}
</body></html>`;
}

function sanitizeHtml(input){
  // Basic sanitizer for preview: removes scripts, iframes, objects, and inline event handlers.
  try{
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(input || ''), 'text/html');

    const kill = ['script','iframe','object','embed','link','meta'];
    for (const tag of kill){
      const nodes = doc.querySelectorAll(tag);
      nodes.forEach(n => n.remove());
    }

    // Remove inline event handlers and javascript: URLs
    const all = doc.querySelectorAll('*');
    all.forEach(el => {
      for (const attr of Array.from(el.attributes)){
        const name = attr.name.toLowerCase();
        const val = String(attr.value || '').trim().toLowerCase();
        if (name.startsWith('on')) el.removeAttribute(attr.name);
        if ((name === 'href' || name === 'src') && val.startsWith('javascript:')) el.removeAttribute(attr.name);
      }
    });

    // Keep <style> tags for UI; remove @import within style content (best-effort)
    const styles = doc.querySelectorAll('style');
    styles.forEach(s => {
      const txt = String(s.textContent || '');
      if (/@import/i.test(txt)) s.textContent = txt.replace(/@import[^;]+;/gi,'');
    });

    return '<!doctype html>' + doc.documentElement.outerHTML;
  }catch(e){
    return '<!doctype html><html><body><pre>Preview sanitize failed.</pre></body></html>';
  }
}

function loadPreview(html){
  const sanitized = sanitizeHtml(html);
  stage.srcdoc = sanitized;
}

function runJS(code, title){
  stage.srcdoc = buildDoc({title, htmlBody:'<div id="app"></div>', jsCode: code});
}

function clearStage(){
  stage.srcdoc = '<!doctype html><html><body></body></html>';
}

window.addEventListener('message', (ev) => {
  const data = ev.data || {};
  // Forward stage logs/errors to the parent (main app)
  if (data && (data.t === 'LOG' || data.t === 'ERROR' || data.t === 'READY')){
    parent.postMessage(data, '*');
    return;
  }

  if (!data || !data.t) return;

  if (data.t === 'PREVIEW_HTML'){
    loadPreview(String(data.html || ''));
  } else if (data.t === 'RUN_JS'){
    runJS(String(data.code || ''), String(data.filename || 'script.js'));
  } else if (data.t === 'CLEAR'){
    clearStage();
  }
});

// Notify parent that host is ready
parent.postMessage({t:'HOST_READY', ts: Date.now()}, '*');
