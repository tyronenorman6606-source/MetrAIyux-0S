(function(){
  const root=document.documentElement;
  window.addEventListener("pointermove",event=>{
    root.style.setProperty("--cursor-x",event.clientX+"px");
    root.style.setProperty("--cursor-y",event.clientY+"px");
  },{passive:true});

  document.querySelectorAll("[data-year]").forEach(item=>{
    item.textContent=new Date().getFullYear();
  });

  const contactForm=document.querySelector("form[data-contact-form]");
  if(contactForm){
    contactForm.addEventListener("submit",()=>{
      const button=contactForm.querySelector("button[type='submit']");
      if(button){
        button.textContent="Sending...";
        button.setAttribute("aria-busy","true");
      }
    });
  }

  const widget=document.querySelector("[data-brain-widget]");
  if(!widget) return;

  const storageKey="legal-skyes-brain-state-v1";
  const messagesKey="legal-skyes-brain-messages-v1";
  const messagesEl=widget.querySelector("[data-brain-messages]");
  const form=widget.querySelector("[data-brain-form]");
  const input=widget.querySelector("[data-brain-input]");
  const toggle=widget.querySelector("[data-brain-toggle]");
  const minimize=widget.querySelector("[data-brain-minimize]");
  const promptButtons=document.querySelectorAll("[data-brain-prompt]");

  const knowledge=[
    {
      id:"operator_identity",
      priority:8,
      keys:["who","runs","owner","founder","operator","company","ceo","gray","gray skyes","gray london skyes","skyes over london","solenterprises"],
      answer:"Legal Skyes is operated inside the Skyes Over London LC / SOLEnterprises ecosystem. Gray Skyes, also represented in 0S context as Gray London Skyes, is the founder and operator behind the company lane. Public legal notices route to legal-skyes@solenterprises.org, 0S support routes to metraiyux-0s@solenterprises.org, and Media Over London routes to MediaOverLondon@solenterprises.org. Company line: 1-(800)-484-4783. This site is the public legal and communications center for the 0S, SkyeMail, SkyeRouteX Logistics, SkyeMusicNexus, SkyePay, SkyeVault, and related services; it is not a law firm."
    },
    {
      id:"legal_center_purpose",
      priority:7,
      keys:["what","legal skyes","overview","purpose","site","this","legal center","front door","public brain"],
      answer:"Legal Skyes is the public legal and communication center for Skyes Over London LC. It gives the ecosystem one visible route for master terms, privacy, AI rules, SMS consent, SaaS terms, commerce rules, IP takedowns, security reporting, and contact handling. The private systems can stay protected while the public rules stay easy to inspect."
    },
    {
      id:"business_lanes",
      priority:7,
      keys:["lane","lanes","business lanes","products","services","ecosystem","what covers","coverage","map"],
      answer:"The local brain routes questions by lane: 0S and mounted apps use /legal/metraiyux-0s/; AI operators use /legal/ai-terms/, /legal/ai-transparency/, and /legal/ai-operators/; Music Nexus uses /legal/music-nexus/ plus creator/media and commerce terms; SaaS products use /legal/saas-platform/ and /legal/service-level/; commerce uses marketplace, payments, subscriptions, and affiliate terms; communications use SMS/Twilio pages; IP and security use DMCA/IP and security reporting."
    },
    {
      id:"escalation_boundaries",
      priority:9,
      keys:["escalate","escalation","lawyer","legal advice","attorney","counsel","professional","approve","decision","binding","regulated","emergency","court","lawsuit","subpoena","admin password","credential","auth","gate","session"],
      answer:"Escalation boundary: this brain can explain the public policy map and prepare review checklists, but it cannot provide legal advice, approve regulated claims, file documents, promise outcomes, expose private admin setup, or create a separate app password. Binding legal, financial, telecom, employment, IP dispute, subpoena, lawsuit, child-safety, or security-token questions require human owner review and, where appropriate, licensed counsel. Mounted 0S surfaces must stay on the shared FS27/SkyGate/Free99 auth lane."
    },
    {
      id:"ai_terms",
      priority:6,
      keys:["ai","agent","autonomous","model","output","prompt","kaixu","kai xu","operator"],
      answer:"The AI layer is covered by AI Product Terms, AI Transparency, and the AI Operators Disclosure & Use Notice at /legal/ai-operators/. The core idea is simple: kAIxu and related operators are AI systems under human oversight; AI output needs human review, high-risk decisions are restricted, autonomous workflows need approval boundaries, and customer prompts or outputs are handled under the privacy and service terms."
    },
    {
      id:"sms_twilio",
      priority:6,
      keys:["sms","twilio","text","call","consent","stop","help","carrier","toll-free"],
      answer:"Twilio SMS consent lives at /legal/twilio-sms/. The general SMS policy is at /legal/sms-communications/ and the shortcut /sms-consent/. The Twilio page publishes 0S signup consent, STOP/HELP language, data-use notice, gate links, and carrier-friendly proof before users opt in."
    },
    {
      id:"saas_platform",
      priority:5,
      keys:["saas","platform","subscription","dashboard","vanta","skyehands","metraiyux"],
      answer:"The SaaS products are protected through the SaaS Platform Terms, Service Level and Support Policy, payments/refunds terms, privacy policy, acceptable use rules, and AI terms when automation is involved. That covers access, account control, subscriptions, support, uptime posture, credits, and misuse."
    },
    {
      id:"zero_os",
      priority:7,
      keys:["0s","metraiyux","workspace","vault","skyevault","skydrive","skygate","free99","northstar","mcp","download","repo","mounted app","shared gate"],
      answer:"The MetrAIyux 0S umbrella terms live at /legal/metraiyux-0s/. That page covers the shared FS27/SkyGate/Free99/NorthStar access lane, AI operators, SkyeVault/SkyeDrive/SkySecure custody, downloads, client workspaces, mounted apps, MCP tooling, payments, deploy proof, and production automation boundaries. Owner/admin access should reuse the shared gate session instead of adding app-specific passwords."
    },
    {
      id:"music_nexus",
      priority:6,
      keys:["music","nexus","skymusicnexus","artist","storefront","rights","payout","skyenet","press kit","brain"],
      answer:"Music Nexus artist readiness lives at /legal/music-nexus/. It explains artist signup, what information is collected, how it can become artist pages, press kits, storefronts, release drops, artist-brain memory, rights/split/payout paperwork, takedown holds, shared 0S gate access, and SkyeNet publish review. Artists must only submit owned or licensed content, and the page is operational/legal readiness tooling, not formal legal advice."
    },
    {
      id:"skyevault",
      priority:5,
      keys:["skyevault","repo rescue","autosync","backup","cache","skache","proof","agent"],
      answer:"SkyeVault repo rescue is covered at /legal/metraiyux-0s/#6a-skyevault-repo-rescue. The posture is: ShYT may crash, but Skye keeps the sKache. No perfect-tech promises or file-recovery guarantees; the system publishes proof receipts, recovery prompts, checkpoints, rollback-aware workflows, and links to the autosync proof, agent install page, vault drive, and unlock surface."
    },
    {
      id:"privacy",
      priority:5,
      keys:["privacy","data","california","personal","cookie","tracking","dpa"],
      answer:"Privacy is handled through the Enterprise Privacy Policy, Cookie and Tracking Policy, and Data Processing Addendum. Together they explain what data may be collected, how business operations use it, how AI providers may process inputs, and where privacy requests go."
    },
    {
      id:"ip_dmca",
      priority:5,
      keys:["dmca","ip","copyright","trademark","takedown","creator","media","infringement"],
      answer:"DMCA and IP notices route through /legal/dmca-ip/. Creator and media workflows also connect to Creator, Artist, and Media Terms plus Community/UGC terms, so uploads, rights, takedowns, and repeat-infringer rules have a public home. Actual ownership disputes, counter-notices, litigation threats, or distribution holds need human review."
    },
    {
      id:"commerce",
      priority:5,
      keys:["commerce","refund","payment","chargeback","marketplace","subscription","affiliate","revenue share"],
      answer:"Commerce is split across Marketplace and Commerce Terms, Payment Refund and Chargeback Policy, Subscription and Cancellation Terms, and Affiliate Referral Terms. Those pages set checkout rules, refund posture, chargeback handling, renewals, revenue share boundaries, and merchant responsibilities."
    },
    {
      id:"contact",
      priority:4,
      keys:["contact","legal notice","email","support","human","notice","request"],
      answer:"Legal notices, privacy requests, IP issues, and dispute notices can route through /contact/ or legal-skyes@solenterprises.org. 0S support should use metraiyux-0s@solenterprises.org, and Media Over London should use MediaOverLondon@solenterprises.org. The brain can explain the map, but actual legal decisions still need human review."
    }
  ];

  function loadMessages(){
    try{
      const parsed=JSON.parse(localStorage.getItem(messagesKey)||"[]");
      return Array.isArray(parsed)?parsed:[];
    }catch(error){
      return [];
    }
  }

  function saveMessages(messages){
    localStorage.setItem(messagesKey,JSON.stringify(messages.slice(-16)));
  }

  function setMinimized(value){
    widget.classList.toggle("is-minimized",value);
    toggle.setAttribute("aria-expanded",String(!value));
    localStorage.setItem(storageKey,JSON.stringify({minimized:value}));
  }

  function getMinimized(){
    try{
      const parsed=JSON.parse(localStorage.getItem(storageKey)||"{}");
      return Boolean(parsed.minimized);
    }catch(error){
      return false;
    }
  }

  function render(messages){
    messagesEl.innerHTML="";
    messages.forEach(message=>{
      const row=document.createElement("div");
      row.className="brain-message "+(message.role==="user"?"from-user":"from-brain");
      row.textContent=message.text;
      messagesEl.appendChild(row);
    });
    messagesEl.scrollTop=messagesEl.scrollHeight;
  }

  function answerFor(text){
    const normalized=text.toLowerCase();
    const scored=knowledge.map(item=>{
      const score=item.keys.reduce((total,key)=>{
        if(!normalized.includes(key)) return total;
        return total+(key.includes(" ")?4:1)+(item.priority||0);
      },0);
      return {item,score};
    }).sort((a,b)=>b.score-a.score);
    if(scored[0]&&scored[0].score>0) return scored[0].item.answer;
    return "I can explain the deterministic legal map: operator identity, legal center purpose, 0S shared-gate boundaries, AI, SMS consent, SaaS, payments, IP, commerce, contractor/vendor rules, security, and human escalation routes. Ask me for one lane and I will point you to the right policy page.";
  }

  let messages=loadMessages();
  if(messages.length===0){
    messages=[{
      role:"brain",
      text:"Legal Brain online. Ask me what Legal Skyes protects, where SMS consent lives, how AI terms work, or which policy covers a product lane."
    }];
    saveMessages(messages);
  }

  render(messages);
  setMinimized(getMinimized());

  form.addEventListener("submit",event=>{
    event.preventDefault();
    const text=input.value.trim();
    if(!text) return;
    messages.push({role:"user",text});
    messages.push({role:"brain",text:answerFor(text)});
    saveMessages(messages);
    render(messages);
    input.value="";
    setMinimized(false);
  });

  toggle.addEventListener("click",()=>{
    setMinimized(!widget.classList.contains("is-minimized"));
  });

  minimize.addEventListener("click",()=>{
    setMinimized(true);
  });

  promptButtons.forEach(button=>{
    button.addEventListener("click",()=>{
      const prompt=button.getAttribute("data-brain-prompt")||button.textContent||"";
      input.value=prompt;
      setMinimized(false);
      input.focus();
    });
  });
})();

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
