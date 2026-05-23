
(function(){
  const brainMap = [
    {k:['lead','prospect','quote','proposal','pricing','demo','deal'], p:'Celeste Monroe — Sales & AE Brain', s:'Marcus Vale — Operations Brain'},
    {k:['client','renewal','onboarding','complaint','escalation','qbr'], p:'Adrian Cross — Client Success Brain', s:'Victor Saint — QA Brain'},
    {k:['candidate','resume','placement','job order','recruit','screening'], p:'Sienna Brooks — Staffing Brain', s:'Julian Mercer — Compliance Brain'},
    {k:['vendor','partner','subcontractor','supplier'], p:'Helena Ward — Partnerships Brain', s:'Julian Mercer — Compliance Brain'},
    {k:['compliance','contract','legal','risk','insurance','policy'], p:'Julian Mercer — Compliance Brain', s:'Gray London Skyes — Founder Command Brain'},
    {k:['website','system','automation','cloudflare','worker','brain','data'], p:'Orion Hayes — Technology Brain', s:'Victor Saint — QA Brain'},
    {k:['brand','seo','marketing','blog','copy','campaign'], p:'Valentina Reyes — Marketing Brain', s:'Victor Saint — QA Brain'},
    {k:['government','sam','bid','procurement','capability'], p:'Donovan Pierce — Gov/Enterprise Brain', s:'Julian Mercer — Compliance Brain'},
    {k:['finance','invoice','payroll','budget','margin','commission'], p:'Naomi Sterling — Finance Brain', s:'Marcus Vale — Operations Brain'},
    {k:['innovation','new service','automation idea','expansion'], p:'Amara Voss — Innovation Brain', s:'Marcus Vale — Operations Brain'}
  ];
  function route(signal){
    const text=(signal||'').toLowerCase();
    let found=brainMap.find(r=>r.k.some(x=>text.includes(x))) || {p:'Central Company Command Brain', s:'Site Operator Brain'};
    const needsApproval = /(contract|pay|payment|hire|fire|legal|tax|compliance|public claim|send|publish|price|refund|lawsuit|government)/i.test(signal||'');
    return {primary:found.p, secondary:found.s, approval:needsApproval?'Human approval required before external action':'Internal drafting may proceed', risk:needsApproval?'Elevated':'Standard'};
  }
  function ledger(){ try{return JSON.parse(localStorage.getItem('crownLedger')||'[]')}catch(e){return[]} }
  function save(entry){ const l=ledger(); l.unshift(entry); localStorage.setItem('crownLedger', JSON.stringify(l.slice(0,200))); return l; }
  document.addEventListener('click', function(e){
    const action=e.target && e.target.getAttribute('data-action'); if(!action) return;
    const shell=e.target.closest('[data-crown-tool]') || document; const out=shell.querySelector('[data-output="crown-output"]');
    if(action==='crown-clear'){ localStorage.removeItem('crownLedger'); if(out) out.textContent='CROWN local ledger cleared.'; return; }
    if(action==='crown-export'){
      const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(), ledger:ledger()},null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='crown-operating-ledger.json'; a.click(); URL.revokeObjectURL(a.href); return;
    }
    if(action==='crown-route'){
      const signal=(shell.querySelector('[data-field="signal"]')||{}).value||'';
      const priority=(shell.querySelector('[data-field="priority"]')||{}).value||'Standard';
      const approvalChoice=(shell.querySelector('[data-field="approval"]')||{}).value||'Yes';
      const r=route(signal);
      const entry={id:'CROWN-'+Date.now(), created_at:new Date().toISOString(), page:location.pathname.split('/').pop(), signal, priority, selected_approval:approvalChoice, route:r, status:'Draft receipt created'};
      save(entry); if(out) out.textContent=JSON.stringify(entry,null,2);
    }
  });
})();
