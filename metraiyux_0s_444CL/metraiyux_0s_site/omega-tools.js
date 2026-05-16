
(function(){
  function data(form){return Object.fromEntries(new FormData(form).entries())}
  function key(form){return 'omega-tool:'+(form.getAttribute('data-tool')||location.pathname)}
  document.querySelectorAll('.local-tool').forEach(form=>{
    const out=form.querySelector('.tool-output');
    try{const saved=JSON.parse(localStorage.getItem(key(form))||'{}'); Object.entries(saved).forEach(([k,v])=>{const el=form.elements[k]; if(el) el.value=v}); if(out&&Object.keys(saved).length) out.textContent='Loaded saved local record.';}catch(e){}
    form.querySelector('[data-save]')?.addEventListener('click',()=>{const d=data(form); d.savedAt=new Date().toISOString(); localStorage.setItem(key(form),JSON.stringify(d,null,2)); if(out) out.textContent='Saved locally in this browser.\n'+JSON.stringify(d,null,2);});
    form.querySelector('[data-export]')?.addEventListener('click',()=>{const d=data(form); d.exportedAt=new Date().toISOString(); const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(d.recordName||form.getAttribute('data-tool')||'record').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json'; a.click(); URL.revokeObjectURL(a.href); if(out) out.textContent='Exported JSON.';});
    form.querySelector('[data-clear]')?.addEventListener('click',()=>{localStorage.removeItem(key(form)); form.reset(); if(out) out.textContent='Cleared local record.';});
  });
})();
