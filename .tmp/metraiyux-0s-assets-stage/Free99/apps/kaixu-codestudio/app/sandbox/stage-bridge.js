/* sandbox/stage-bridge.js
   Runs inside the sandboxed stage iframe.
   - Mirrors console.* to the host (parent) via postMessage
   - Catches window errors + unhandled rejections
*/
(() => {
  'use strict';

  function safeSerialize(v){
    try{
      if (v instanceof Error) return {name:v.name, message:v.message, stack:String(v.stack||'')};
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'function') return `[Function ${v.name||'anonymous'}]`;
      if (v && typeof v === 'object'){
        // avoid circular
        return JSON.parse(JSON.stringify(v, (k,val)=> (typeof val==='bigint'?val.toString():val)));
      }
      return v;
    }catch(e){
      try{ return String(v); }catch(_){ return '[Unserializable]'; }
    }
  }

  function post(type, payload){
    try{
      parent.postMessage({t:type, ...payload}, '*');
    }catch(e){}
  }

  const levels = ['log','info','warn','error','debug'];
  for (const lvl of levels){
    const orig = console[lvl] ? console[lvl].bind(console) : console.log.bind(console);
    console[lvl] = (...args) => {
      orig(...args);
      post('LOG', {level:lvl, args: args.map(safeSerialize), ts: Date.now()});
    };
  }

  window.addEventListener('error', (ev) => {
    post('ERROR', {
      message: String(ev.message || 'Error'),
      filename: String(ev.filename || ''),
      lineno: Number(ev.lineno || 0),
      colno: Number(ev.colno || 0),
      stack: ev.error && ev.error.stack ? String(ev.error.stack) : ''
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason;
    post('ERROR', {
      message: reason && reason.message ? String(reason.message) : 'Unhandled promise rejection',
      filename: '',
      lineno: 0,
      colno: 0,
      stack: reason && reason.stack ? String(reason.stack) : String(reason || '')
    });
  });

  post('READY', {ts: Date.now()});
})();
