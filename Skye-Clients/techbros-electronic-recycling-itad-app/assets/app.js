const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function endIntro(){const intro=$('[data-app-intro]');if(intro)intro.classList.add('is-done');document.body.classList.remove('intro-active');}
const introEl=$('[data-app-intro]');if(introEl)setTimeout(endIntro,1350);else endIntro();
$('[data-menu-button]')?.addEventListener('click',()=>{const nav=$('#primary-nav');nav?.classList.toggle('is-open');const open=nav?.classList.contains('is-open');$('[data-menu-button]')?.setAttribute('aria-expanded',open?'true':'false')});
window.addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;const pct=max>0?(scrollY/max)*100:0;$('.progressbar')?.style.setProperty('width',pct+'%')},{passive:true});
const canvas=$('[data-living-background]');if(canvas){const ctx=canvas.getContext('2d');let w=0,h=0,t=0;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;function size(){w=canvas.width=Math.floor(innerWidth*Math.min(devicePixelRatio||1,1.5));h=canvas.height=Math.floor(innerHeight*Math.min(devicePixelRatio||1,1.5));}size();addEventListener('resize',size,{passive:true});function draw(){t+=reduce?0:.008;ctx.clearRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'rgba(20,120,255,.18)');g.addColorStop(.5,'rgba(30,255,180,.08)');g.addColorStop(1,'rgba(255,198,92,.10)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.globalAlpha=.55;for(let i=0;i<46;i++){const x=(Math.sin(t+i*1.7)*.5+.5)*w;const y=((i*97+t*700)%h);ctx.strokeStyle=i%3===0?'rgba(255,209,102,.34)':i%3===1?'rgba(98,215,255,.28)':'rgba(120,255,160,.22)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+42,y-58);ctx.stroke();}ctx.globalAlpha=1;requestAnimationFrame(draw)}draw();}
const CLIENT_APP_INTAKE={sourceApp:'techbros-electronic-recycling-itad',workspaceId:'techbros-electronic-recycling-itad-preview-001',businessName:'Techbros Electronic Recycling & ITAD',endpoint:'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/client-app-intake',successMessage:'Request received. It is now in the Techbros 0S lead lane for workspace review.'};
function storageKey(){return location.hostname+'-app-records'}
function readRecords(){try{return JSON.parse(localStorage.getItem(storageKey())||'[]')}catch{return[]}}
function writeRecords(records){try{localStorage.setItem(storageKey(),JSON.stringify(records.slice(-24)))}catch{}}
function escapeRecord(value){return String(value||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function saveRecord(data,status='queued'){const records=readRecords();records.push({...data,status,createdAt:data.createdAt||new Date().toISOString()});writeRecords(records);return records}
function renderRecords(){const list=$('[data-record-list]');if(!list)return;const records=readRecords();list.innerHTML=records.slice(-4).reverse().map(r=>'<article><strong>'+escapeRecord(r.service||'Request')+'</strong><p>'+escapeRecord(r.company||'')+' / '+escapeRecord(r.contact||'')+'</p><small>'+escapeRecord((r.status||'queued').toUpperCase())+' - '+escapeRecord(r.createdAt||'')+'</small></article>').join('')||'<p class="notice">No submitted requests yet.</p>'}
async function sendIntake(data){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7500);try{const response=await fetch(CLIENT_APP_INTAKE.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,source_app:CLIENT_APP_INTAKE.sourceApp,workspace_id:CLIENT_APP_INTAKE.workspaceId,business_name:CLIENT_APP_INTAKE.businessName,page_url:location.href,app_url:location.origin+'/',submitted_at:new Date().toISOString()}),signal:controller.signal});const body=await response.json().catch(()=>({}));if(!response.ok||body.ok===false)throw new Error(body.error||('Intake returned '+response.status));return body}finally{clearTimeout(timer)}}
$('[data-record-form]')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const result=$('[data-form-result]');const button=form.querySelector('button[type="submit"]');const data=Object.fromEntries(new FormData(form).entries());data.createdAt=new Date().toISOString();button?.setAttribute('disabled','true');if(result)result.textContent='Sending into the MetrAIyux 0S lead lane...';try{const body=await sendIntake(data);saveRecord({...data,intakeId:body.intake_id||'',leadId:body.lead_id||''},'sent');if(result)result.textContent=CLIENT_APP_INTAKE.successMessage;form.reset();}catch(err){saveRecord({...data,error:err?.message||'network fallback'},'queued');if(result)result.textContent='Network fallback saved this request on this device. Reopen the app online and submit again to push it into the 0S lead lane.';}finally{button?.removeAttribute('disabled');renderRecords();}});renderRecords();
$('[data-calc]')?.addEventListener('input',e=>{const form=e.currentTarget;const qty=Number(new FormData(form).get('qty')||0);const out=$('[data-calc-output]',form);if(!out)return;out.textContent=qty>100?'High-volume request: use the detailed intake route and add timing/access notes.':qty>0?'Standard request: include service area and best reply method.':'Enter a number to see the right follow-up lane.';});
(function(){
  let installPromptEvent = null;
  const installButtons = $$('[data-install-app]');
  if(!installButtons.length)return;

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function setInstallLabel(text){
    installButtons.forEach(button=>{button.textContent=text;});
  }

  function showInstallHelp(message){
    let toast = $('[data-install-help]');
    if(!toast){
      toast = document.createElement('div');
      toast.className = 'install-help';
      toast.setAttribute('data-install-help','');
      toast.setAttribute('role','status');
      toast.setAttribute('aria-live','polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<strong>Download this app</strong><p>'+message+'</p>';
    requestAnimationFrame(()=>toast.classList.add('is-visible'));
    clearTimeout(showInstallHelp.timer);
    showInstallHelp.timer = setTimeout(()=>toast.classList.remove('is-visible'),7600);
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    installPromptEvent = event;
    setInstallLabel('Download App');
  });

  window.addEventListener('appinstalled',()=>{
    installPromptEvent = null;
    setInstallLabel('App Installed');
    showInstallHelp('This app is installed on this device.');
  });

  installButtons.forEach(button=>{
    button.addEventListener('click',async()=>{
      if(isStandalone()){
        setInstallLabel('App Installed');
        showInstallHelp('This app is already installed on this device.');
        return;
      }
      if(installPromptEvent){
        const promptEvent = installPromptEvent;
        installPromptEvent = null;
        showInstallHelp('Use the browser install prompt to save this app to your phone. If it does not appear, use Share or the browser menu and choose Add to Home Screen.');
        setTimeout(async()=>{
          promptEvent.prompt();
          const choice = await promptEvent.userChoice.catch(()=>({outcome:'dismissed'}));
          if(choice.outcome === 'accepted'){
            setInstallLabel('App Installed');
          }else{
            setInstallLabel('Download App');
            showInstallHelp('Install was dismissed. Tap Download App again when you are ready.');
          }
        },150);
        return;
      }
      showInstallHelp('iPhone: tap Share, then Add to Home Screen. Android: open the browser menu and choose Install app.');
    });
  });
})();
if('serviceWorker'in navigator){navigator.serviceWorker.register('/service-worker.js').catch(()=>{});}

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js
