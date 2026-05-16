
(function(){
  function key(id){return 'apex:'+id}
  document.querySelectorAll('[data-apex-store]').forEach(el=>{const id=el.dataset.apexStore; const saved=localStorage.getItem(key(id)); if(saved) el.value=saved;});
  document.querySelectorAll('[data-apex-save]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.apexSave; const el=document.querySelector('[data-apex-store="'+id+'"]'); if(el){localStorage.setItem(key(id),el.value); btn.textContent='Saved'; setTimeout(()=>btn.textContent='Save locally',1200)}}));
  document.querySelectorAll('[data-apex-clear]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.apexClear; const el=document.querySelector('[data-apex-store="'+id+'"]'); if(el){el.value=''; localStorage.removeItem(key(id));}}));
  document.querySelectorAll('[data-apex-export]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.apexExport; const el=document.querySelector('[data-apex-store="'+id+'"]'); const data={id, exported_at:new Date().toISOString(), value:el?el.value:''}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=id+'-export.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }));
})();
