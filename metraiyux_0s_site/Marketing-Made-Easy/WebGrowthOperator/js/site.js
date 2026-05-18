
(function(){
  const root=document.documentElement;
  window.addEventListener('pointermove',e=>{root.style.setProperty('--mx',e.clientX+'px');root.style.setProperty('--my',e.clientY+'px');},{passive:true});
  const toggle=document.querySelector('[data-nav-toggle]');
  const nav=document.querySelector('[data-nav]');
  let scrim=document.querySelector('[data-nav-scrim]');
  if(toggle&&nav&&!scrim){scrim=document.createElement('div');scrim.className='nav-scrim';scrim.setAttribute('data-nav-scrim','');document.body.appendChild(scrim);}
  function setNav(open){
    if(!toggle||!nav) return;
    nav.classList.toggle('open', open);
    scrim&&scrim.classList.toggle('open', open);
    document.body.classList.toggle('mobile-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  }
  if(toggle&&nav){
    toggle.addEventListener('click',()=>setNav(!nav.classList.contains('open')));
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setNav(false)));
    scrim&&scrim.addEventListener('click',()=>setNav(false));
    window.addEventListener('keydown',e=>{if(e.key==='Escape') setNav(false);});
    window.addEventListener('resize',()=>{if(window.innerWidth>1040) setNav(false);});
  }
  const next=document.getElementById('fs-next');
  if(next){const base=window.location.origin+window.location.pathname.replace(/[^/]*$/,'');next.value=base+'thanks.html';}
})();


document.querySelectorAll('[data-copy-target]').forEach(function(btn){
  btn.addEventListener('click', async function(){
    var target = document.querySelector(btn.getAttribute('data-copy-target'));
    if(!target) return;
    var text = target.innerText || target.textContent || '';
    try { await navigator.clipboard.writeText(text.trim()); btn.textContent='Copied'; setTimeout(function(){btn.textContent='Copy script';}, 1400); }
    catch(e){ btn.textContent='Select + copy'; setTimeout(function(){btn.textContent='Copy script';}, 1400); }
  });
});


(function(){
  const calc = document.querySelector('[data-ae-comp-calc]');
  if(!calc) return;
  const money = n => '$' + Math.round(Number(n||0)).toLocaleString();
  const fields = calc.querySelectorAll('input[data-calc-field]');
  const output = calc.querySelector('[data-calc-output]');
  const detail = calc.querySelector('[data-calc-detail]');
  function run(){
    const v = {};
    fields.forEach(f => v[f.getAttribute('data-calc-field')] = Number(f.value || 0));
    const buildCommission = v.buildFees * (v.buildRate/100);
    const setupCommission = v.setupFees * (v.setupRate/100);
    const monthlyCommission = v.monthlyRetainers * (v.recurringRate/100);
    const firstMonth = buildCommission + setupCommission + monthlyCommission;
    const twelveMonthBook = monthlyCommission * 12;
    if(output) output.textContent = money(firstMonth);
    if(detail) detail.textContent = 'First month estimate: ' + money(buildCommission) + ' build + ' + money(setupCommission) + ' setup + ' + money(monthlyCommission) + ' first recurring month. If those accounts stay active for 12 months, the recurring commission book from this month of sales can pay about ' + money(twelveMonthBook) + ' across the first year. This excludes ad spend, domains, software pass-through, refunds, unpaid invoices, and chargebacks.';
  }
  fields.forEach(f => f.addEventListener('input', run));
  run();
})();


(function(){
  const form = document.querySelector('[data-contractor-onboarding]');
  if(!form) return;
  const status = document.querySelector('[data-onboarding-status]');
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(status){ status.style.display='block'; status.className='status-box'; status.textContent='Submitting secure packet...'; }
    try{
      const res = await fetch(form.action, { method:'POST', body:new FormData(form), credentials:'include' });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || 'Submission failed.');
      if(status){ status.textContent = 'Packet saved. Drive folder ID: ' + (data.driveFolderId || 'created') + '. Submission ID: ' + (data.submissionId || 'recorded') + '.'; }
      form.reset();
    }catch(err){
      if(status){ status.className='status-box error'; status.style.display='block'; status.textContent = 'Not saved: ' + err.message; }
    }
  });
})();

(function(){
  const table = document.querySelector('[data-payout-table]');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  const cols = ['pay_period','contractor','email','client','package','revenue_type','gross','rate','due','method','destination','status','payment_date','transaction_id','notes'];
  function row(){
    const tr=document.createElement('tr');
    tr.innerHTML = '<td><input type="text" value="2026-05"/></td><td><input type="text"/></td><td><input type="email"/></td><td><input type="text"/></td><td><input type="text" placeholder="Lead Engine"/></td><td><select><option>Build/Setup</option><option>Monthly Retainer</option><option>Bonus</option><option>Adjustment</option></select></td><td><input type="number" step="0.01" value="0" data-gross/></td><td><input type="number" step="0.01" value="10" data-rate/></td><td><input type="number" step="0.01" value="0" data-due readonly/></td><td><select><option>Bank / ACH</option><option>Stripe</option><option>PayPal</option><option>Cash App</option><option>Check</option></select></td><td><input type="text" placeholder="Last 4 / handle"/></td><td><select><option>Pending Approval</option><option>Approved</option><option>Paid</option><option>Hold</option><option>Void</option></select></td><td><input type="date"/></td><td><input type="text"/></td><td><input type="text"/></td>';
    tbody.appendChild(tr);
    function calc(){ const gross=Number(tr.querySelector('[data-gross]').value||0); const rate=Number(tr.querySelector('[data-rate]').value||0); tr.querySelector('[data-due]').value=(gross*rate/100).toFixed(2); }
    tr.querySelector('[data-gross]').addEventListener('input', calc); tr.querySelector('[data-rate]').addEventListener('input', calc); calc();
  }
  document.querySelector('[data-add-payout-row]')?.addEventListener('click', row);
  document.querySelector('[data-export-payout-csv]')?.addEventListener('click', function(){
    const headers = ['Pay Period','Contractor Name','Contractor Email','Client','Package','Revenue Type','Gross Collected','Commission Rate','Commission Due','Payment Method','Payment Destination Last 4 or Handle','Status','Payment Date','Transaction ID','Notes'];
    const rows=[headers];
    tbody.querySelectorAll('tr').forEach(tr=>{ rows.push(Array.from(tr.querySelectorAll('input,select')).map(el=>el.value)); });
    const csv = rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='skyes-ae-payout-register.csv'; a.click(); URL.revokeObjectURL(a.href);
  });
  row(); row(); row();
})();


(function(){
  const table = document.querySelector('[data-ae-pipeline]');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  const storageKey='sol_ae_pipeline_v1';
  const fields=['prospect','business_type','city','pain','package','value','rate','probability','last_contact','next_followup','status','notes'];
  const statuses=['New','Contacted','Discovery Set','Audit Sent','Proposal Sent','Negotiating','Won','Lost','Nurture'];
  const packages=['Website Build','Hosting + Care','Content Engine','Paid Traffic','GBP Ops','Review Engine','Lead Recovery','CRM Follow-Up','Lead Dashboard','Revenue Ops'];
  function read(){try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch(e){return []}}
  function save(rows){localStorage.setItem(storageKey, JSON.stringify(rows));}
  function money(n){return '$'+Math.round(Number(n||0)).toLocaleString();}
  function makeSelect(opts,val){return '<select>'+opts.map(o=>'<option '+(o===val?'selected':'')+'>'+o+'</option>').join('')+'</select>';}
  function render(){
    const rows=read(); tbody.innerHTML='';
    rows.forEach((r,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><input value="${r.prospect||''}"></td><td><input value="${r.business_type||''}"></td><td><input value="${r.city||''}"></td><td><input value="${r.pain||''}"></td><td>${makeSelect(packages,r.package||packages[0])}</td><td><input type="number" step="1" value="${r.value||0}"></td><td><input type="number" step="0.1" value="${r.rate||10}"></td><td><input type="number" step="1" min="0" max="100" value="${r.probability||25}"></td><td><input type="date" value="${r.last_contact||''}"></td><td><input type="date" value="${r.next_followup||''}"></td><td>${makeSelect(statuses,r.status||statuses[0])}</td><td><input value="${r.notes||''}"></td><td><strong data-expected>${money((r.value||0)*(r.rate||0)/100*(r.probability||0)/100)}</strong></td><td><button class="mini-btn" type="button" data-del="${i}">Delete</button></td>`;tbody.appendChild(tr);});
    updateSummary();
  }
  function collect(){return Array.from(tbody.querySelectorAll('tr')).map(tr=>{const els=tr.querySelectorAll('input,select');const row={};fields.forEach((f,i)=>row[f]=els[i].value);return row;});}
  function updateSummary(){const rows=read();const open=rows.filter(r=>!['Won','Lost'].includes(r.status)).length;const won=rows.filter(r=>r.status==='Won').length;const expected=rows.reduce((s,r)=>s+(Number(r.value||0)*Number(r.rate||0)/100*Number(r.probability||0)/100),0);document.querySelectorAll('[data-pipeline-open]').forEach(x=>x.textContent=open);document.querySelectorAll('[data-pipeline-won]').forEach(x=>x.textContent=won);document.querySelectorAll('[data-pipeline-expected]').forEach(x=>x.textContent=money(expected));}
  function add(){const rows=read();rows.push({prospect:'',business_type:'',city:'Phoenix',pain:'',package:'Website Build',value:1500,rate:15,probability:25,last_contact:'',next_followup:'',status:'New',notes:''});save(rows);render();}
  table.addEventListener('input',()=>{save(collect());render();});
  table.addEventListener('change',()=>{save(collect());render();});
  table.addEventListener('click',e=>{if(e.target.matches('[data-del]')){const rows=read();rows.splice(Number(e.target.getAttribute('data-del')),1);save(rows);render();}});
  document.querySelector('[data-add-pipeline-row]')?.addEventListener('click',add);
  document.querySelector('[data-export-pipeline-csv]')?.addEventListener('click',()=>{const rows=read();const headers=fields.concat(['expected_commission']);const csv=[headers].concat(rows.map(r=>fields.map(f=>r[f]||'').concat([Number(r.value||0)*Number(r.rate||0)/100*Number(r.probability||0)/100]))).map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='skyes-ae-pipeline.csv';a.click();URL.revokeObjectURL(a.href);});
  if(!read().length) add(); else render();
})();

(function(){ document.querySelectorAll('[data-form-started-at]').forEach(function(el){ el.value=String(Date.now()); }); })();
