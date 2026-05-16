const SBCC_KB = [
  {topic:'overview sell offer customer portal', title:'What the platform is', body:'Skye Business Command Center is a branded business operations portal built from production-safe self-hosted modules plus a proprietary wrapper. Customers should see the branded customer portal, support request, intake, billing, and handoff pages. Operators use the attached support, CRM, billing, and form-builder apps privately. The offer sells setup, hosting, workflow design, configuration, training, backups, and monthly support.'},
  {topic:'legal license safe disclosure', title:'Safe sales position', body:'Do not sell the package as fully proprietary SaaS. Sell deployment, configuration, hosting, training, workflow setup, branding, and support. Keep open-source notices intact. Do not claim legal, tax, banking, payment-processing, accounting, HIPAA, SOC2, or compliance certification unless separately proven and contracted.'},
  {topic:'production gates not done', title:'Real production gates', body:'The ZIP is not a live production instance until a VPS/server is provisioned, DNS is pointed, HTTPS is active, SMTP is configured, secrets are set, app installers are completed, admin accounts are created, mailboxes are routed, backups are run and restored, and live smoke/acceptance checks pass.'},
  {topic:'deploy setup commands ubuntu docker', title:'Fresh VPS launch path', body:'On Ubuntu, run scripts/bootstrap-ubuntu.sh to install Docker basics, copy .env.example to .env, run scripts/generate-secrets.sh, edit .env with real domains and SMTP, run scripts/preflight.sh, then docker compose up -d --build. After containers are up, complete each app first-run installer and run scripts/smoke.sh plus scripts/acceptance.sh.'},
  {topic:'pricing charge cost', title:'Pricing and cost', body:'Operator infrastructure cost for a dedicated small-business deployment is usually about $25-$75/month depending on VPS, email, backups, storage, and monitoring. Customer pricing should start around $497-$1,497 setup plus $99-$299/month. Ops Pro can be $1,997 setup plus $399/month when workflow design, templates, training, backups, and maintenance are included.'},
  {topic:'modules freescout espocrm invoiceshelf formbricks surface control', title:'Module responsibilities', body:'The attached apps are internal workbenches. The support desk owns inboxes, tickets, assignments, notes, and mailbox workflows. The CRM owns leads, contacts, companies, opportunities, tasks, notes, and sales pipeline. The billing module owns customers, estimates, invoices, expenses, and billing records. The form builder owns lead intake, quote forms, onboarding questionnaires, feedback forms, and survey responses. Customers should enter through the branded portal rather than native app login screens.'},
  {topic:'customer signup sso provisioning external login', title:'Customer signup rule', body:'Customers sign up for the platform, not for four separate tools. In the current package the customer portal is branded and self-contained as a front door, while real SSO/provisioning remains a production integration step. Until that is wired, raw app login URLs should be operator-only and protected.'},
  {topic:'first client launch checklist', title:'First client launch checklist', body:'Collect client business info, domain/subdomain choices, support mailbox, staff users, SMTP provider, logo/brand colors, services/pricing, CRM stages, intake questions, invoice terms, privacy/terms requirements, and launch date. Deploy dedicated instance, create admins, configure apps, import templates, send client launch email, run acceptance tests, export handoff pack, and schedule monthly maintenance.'},
  {topic:'backup restore maintenance monthly', title:'Maintenance expectations', body:'Monthly support should include update review, container health checks, disk usage checks, backup verification, sample restore proof, mail deliverability check, broken link smoke, security baseline review, client workflow review, and a simple health report. Use scripts/health-report.sh, scripts/verify-backup.sh, scripts/update-stack.sh, scripts/rollback.sh, and scripts/restore.sh.'},
  {topic:'local brain openai ollama gpu model', title:'Local brain wiring', body:'The default site brain runs locally in the browser using packaged knowledge retrieval. Optional apps/brain-service can call OpenAI using OPENAI_API_KEY and OPENAI_MODEL, or Ollama using OLLAMA_BASE_URL and OLLAMA_MODEL. The package must not claim a live LLM until the selected provider is configured and tested.'},
  {topic:'proof acceptance smoke no theater', title:'Proof standard', body:'No fake completion. Use smoke and acceptance scripts to verify pages and app URLs respond. Then manually verify login screens, first-run installers, SMTP send, mailbox receive, CRM record creation, form submission, invoice creation, backup generation, and restore viability. Only claim what passed.'}
];

function score(query, item){
  const q = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const hay = `${item.topic} ${item.title} ${item.body}`.toLowerCase();
  return q.reduce((n,w)=> n + (hay.includes(w) ? (w.length>4?2:1) : 0), 0);
}
function localAnswer(query){
  const ranked = SBCC_KB.map(item=>({...item, score:score(query,item)})).sort((a,b)=>b.score-a.score).slice(0,3);
  const hits = ranked.filter(x=>x.score>0);
  if(!hits.length){
    return 'I do not have a precise packaged answer for that yet. Safe next move: check setup.html, command-center.html, readiness.html, proof.html, and docs/ for the exact runbook. Keep claims limited to verified deployment, configuration, hosting, support, and workflow setup.';
  }
  return hits.map((h,i)=>`${i+1}. ${h.title}: ${h.body}`).join('\n\n');
}
async function askBrainService(query){
  try{
    const res = await fetch('/api/brain/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query, context:SBCC_KB})});
    if(!res.ok) throw new Error('brain-service unavailable');
    const data = await res.json();
    if(data && data.answer) return data.answer;
  }catch(e){ return null; }
  return null;
}
function addMessage(kind, text){
  const log=document.getElementById('brainLog');
  const div=document.createElement('div');
  div.className=`brain-message brain-${kind}`;
  div.innerHTML=`<strong>${kind==='user'?'You':'Orynth Local'}:</strong> ${String(text).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])).replace(/\n/g,'<br>')}`;
  log.appendChild(div); log.scrollTop=log.scrollHeight;
}
async function submitQuery(query){
  if(!query.trim()) return;
  addMessage('user', query);
  const status=document.getElementById('brainStatus');
  status.textContent='Thinking locally...';
  const remote = await askBrainService(query);
  if(remote){ status.textContent='Local LLM bridge answered'; addMessage('ai', remote); }
  else { status.textContent='Local KB answered'; addMessage('ai', localAnswer(query)); }
}
document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('brainForm'); const input=document.getElementById('brainInput');
  if(form){ form.addEventListener('submit',e=>{e.preventDefault(); const q=input.value; input.value=''; submitQuery(q);}); }
  document.querySelectorAll('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>submitQuery(btn.dataset.prompt)));
});
