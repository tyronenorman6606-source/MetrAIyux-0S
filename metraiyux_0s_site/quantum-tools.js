
function qid(id){return document.getElementById(id)}
function quantumClassify(text){
  const rules=[['Sales & AE Cabinet','Celeste Monroe Brain',/lead|price|proposal|close|pipeline|revenue/i],['HR & Staffing Cabinet','Sienna Brooks Brain',/candidate|resume|job order|placement|recruit|staffing/i],['Client Success Cabinet','Adrian Cross Brain',/client|onboard|renewal|complaint|escalation|qbr/i],['Legal & Compliance Cabinet','Julian Mercer Brain',/contract|legal|compliance|insurance|risk|policy/i],['Technology & Systems Cabinet','Orion Hayes Brain',/website|system|bug|cloudflare|worker|brain|api|deploy/i],['Finance & Accounting Cabinet','Naomi Sterling Brain',/invoice|budget|payroll|margin|commission|expense/i],['Marketing & Brand Cabinet','Valentina Reyes Brain',/brand|marketing|seo|blog|campaign|copy/i],['Government & Enterprise Contracting Cabinet','Donovan Pierce Brain',/government|sam|naics|bid|procurement|contracting/i],['Partnerships & Vendor Relations Cabinet','Helena Ward Brain',/vendor|partner|subcontractor|referral/i],['Quality Assurance & Performance Cabinet','Victor Saint Brain',/proof|qa|audit|claim|receipt|verification/i],['Expansion & Innovation Cabinet','Amara Voss Brain',/innovation|ai|automation|expansion|new market/i],['Executive Command Cabinet','Gray London Skyes Founder Brain',/founder|approval|strategy|override|gray/i]];
  for(const [cabinet,brain,rx] of rules){ if(rx.test(text||'')) return {cabinet,brain}; }
  return {cabinet:'Central Operating Layer',brain:'Site Operator Brain'};
}
function quantumReceipt(id,title){
  const text=(qid(id+'-input')||{}).value||''; const priority=(qid(id+'-priority')||{}).value||'Normal'; const route=quantumClassify(text);
  const approval=/legal|compliance|contract|founder|approval|money movement|hire|terminate|bank|payroll/i.test(text)?'Human approval required':'Draft/route allowed; execution requires owner review when external-facing';
  const rec={id:'Q-'+Date.now(),module:title,created_at:new Date().toISOString(),priority,input:text.slice(0,1500),primary_brain:route.brain,primary_cabinet:route.cabinet,secondary_review:'Central Company Command Brain',approval_gate:approval,proof_required:'Action receipt with owner, source, decision, output, verification status, and next check.',status:'drafted'};
  qid(id+'-output').textContent=JSON.stringify(rec,null,2); return rec;
}
function quantumSave(id){const out=qid(id+'-output')?.textContent||''; localStorage.setItem('quantum:'+id,out); alert('Saved locally.');}
function quantumExport(id){const out=qid(id+'-output')?.textContent||'{}'; const blob=new Blob([out],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=id+'-receipt.json'; a.click(); URL.revokeObjectURL(a.href)}
function quantumClear(id){localStorage.removeItem('quantum:'+id); if(qid(id+'-input')) qid(id+'-input').value=''; if(qid(id+'-output')) qid(id+'-output').textContent='Cleared.';}
