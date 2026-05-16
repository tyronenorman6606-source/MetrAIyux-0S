
// SENTINEL AUTONOMOUS BUSINESS OS TOOLS
(function(){
  const KEY='sentinelBusinessOSReceipts';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}};
  const write=(items)=>localStorage.setItem(KEY,JSON.stringify(items,null,2));
  const routeMap=[
    ['lead|prospect|pricing|proposal|close|pipeline','Celeste Monroe Brain','Marcus Vale Brain','Sales intake, qualification, proposal, revenue lane.'],
    ['client|onboard|renewal|complaint|escalation|qbr','Adrian Cross Brain','Victor Saint Brain','Client success, retention, escalation, quality proof.'],
    ['candidate|resume|job order|placement|recruit|staffing','Sienna Brooks Brain','Naomi Sterling Brain','Workforce operations, staffing fulfillment, payroll/budget check.'],
    ['contract|compliance|legal|risk|insurance|policy','Julian Mercer Brain','Victor Saint Brain','Compliance routing, risk review, proof documentation.'],
    ['website|automation|worker|cloudflare|brain|api|system','Orion Hayes Brain','Site Operator Brain','Technology systems, Cloudflare, automation, local brain control.'],
    ['brand|marketing|seo|blog|campaign|content','Valentina Reyes Brain','Central Company Command Brain','Marketing, public positioning, SEO, content control.'],
    ['government|sam|naics|bid|procurement|enterprise','Donovan Pierce Brain','Julian Mercer Brain','Government/enterprise readiness and compliance support.'],
    ['vendor|partner|subcontractor|referral','Helena Ward Brain','Julian Mercer Brain','Partnership/vendor evaluation and risk check.'],
    ['quality|proof|audit|receipt|claim|test','Victor Saint Brain','Site Operator Brain','Proof, QA, evidence, public claims control.'],
    ['innovation|new service|expansion|branch|market','Amara Voss Brain','Marcus Vale Brain','Expansion and innovation with operating review.']
  ];
  window.sentinelRoute=function(input){
    input=(input||document.querySelector('[data-sentinel-input]')?.value||'').toLowerCase();
    let match=routeMap.find(r=>new RegExp(r[0],'i').test(input))||['default','Site Operator Brain','Central Company Command Brain','General autonomous routing.'];
    const receipt={id:'SENT-'+Date.now(),created:new Date().toISOString(),primary:match[1],secondary:match[2],routing_reason:match[3],source_excerpt:input.slice(0,300),required_human_gate:/contract|legal|pricing|hire|fire|payment|bank|tax|government|compliance/.test(input),status:'queued-for-operator-review'};
    const items=read(); items.unshift(receipt); write(items);
    const out=document.querySelector('[data-sentinel-output]'); if(out) out.textContent=JSON.stringify(receipt,null,2);
    return receipt;
  };
  window.sentinelExport=function(){
    const blob=new Blob([JSON.stringify(read(),null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sentinel-business-os-receipts.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  window.sentinelClear=function(){localStorage.removeItem(KEY); const out=document.querySelector('[data-sentinel-output]'); if(out) out.textContent='Local Sentinel receipts cleared.';};
})();
