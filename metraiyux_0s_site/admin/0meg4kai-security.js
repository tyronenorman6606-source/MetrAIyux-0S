
const OmegaKAI = (()=>{
  const key='sovereign13.omeg4kai.latestScan.v1';
  const riskPatterns = [
    ['owner_connector_risk', /(owner|founder|gray|main orchestrator|mega brain|production social|admin social|company social)/i, 'References owner-level connectors or founder/admin systems.'],
    ['privilege_escalation', /(admin token|secret|api key|credential|password|bypass|all tenants|global ledger|root access)/i, 'Attempts to access privileged credentials, global records, or admin scope.'],
    ['public_action', /(publish|post|send email|send sms|dispatch|go live|public claim|announce)/i, 'Requests an external/public action.'],
    ['legal_finance_hr', /(contract|signature|legal|tax|filing|incorporat|hire|fire|payroll|payment|refund|price|billing)/i, 'Touches legal, finance, HR, pricing, or filing-sensitive work.'],
    ['data_boundary', /(customer data|client list|candidate list|all workspaces|other customer|export everything)/i, 'May cross tenant or data boundaries.']
  ];
  function scan(text){
    const findings = riskPatterns.filter(([id,rx])=>rx.test(text||'')).map(([id,rx,why])=>({id,why}));
    let decision='allow_customer_scoped';
    if(findings.some(f=>['owner_connector_risk','privilege_escalation','data_boundary'].includes(f.id))) decision='quarantine_for_admin_review';
    else if(findings.some(f=>['public_action','legal_finance_hr'].includes(f.id))) decision='approval_required';
    const receipt={id:'omega_'+Date.now(), created_at:new Date().toISOString(), input:text, decision, findings, route: decision==='allow_customer_scoped' ? 'customer_workspace_brain' : '0meg4kAI_to_admin_approval', notes:[
      'Customer commands cannot access owner Main Automation Brain directly.',
      'Production connectors require explicit admin approval and correct tenant scope.',
      'Unsafe or cross-tenant requests are quarantined.'
    ]};
    localStorage.setItem(key, JSON.stringify(receipt,null,2)); return receipt;
  }
  function boot(){
    const input=document.getElementById('omegaScanInput'), out=document.getElementById('omegaScanOutput');
    document.getElementById('omegaScanBtn')?.addEventListener('click',()=>{ const r=scan(input.value); out.textContent=JSON.stringify(r,null,2); });
    document.getElementById('omegaExportBtn')?.addEventListener('click',()=>{ const data=localStorage.getItem(key)||'{}'; const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='0meg4kai-security-scan.json'; a.click(); URL.revokeObjectURL(a.href); });
  }
  return {scan,boot};
})();
document.addEventListener('DOMContentLoaded',OmegaKAI.boot);
