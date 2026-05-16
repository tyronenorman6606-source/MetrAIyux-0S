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
      keys:["what","legal skyes","overview","purpose","site","this"],
      answer:"Legal Skyes is the public legal and communication center for Skyes Over London LC. It gives the ecosystem one visible route for master terms, privacy, AI rules, SMS consent, SaaS terms, commerce rules, IP takedowns, security reporting, and contact handling. The private systems can stay protected while the public rules stay easy to inspect."
    },
    {
      keys:["ai","agent","autonomous","model","output","prompt"],
      answer:"The AI layer is covered by AI Product Terms and AI Transparency. The core idea is simple: AI output needs human review, high-risk decisions are restricted, autonomous workflows need approval boundaries, and customer prompts or outputs are handled under the privacy and service terms. Start at /legal/ai-terms/."
    },
    {
      keys:["sms","twilio","text","call","consent","stop","help"],
      answer:"SMS consent lives at /legal/sms-communications/ and the shortcut /sms-consent/. It publishes business messaging consent, STOP/HELP language, call and text notices, and carrier-friendly proof that users can find before they opt in."
    },
    {
      keys:["saas","platform","subscription","dashboard","vanta","skyehands","metraiyux"],
      answer:"The SaaS products are protected through the SaaS Platform Terms, Service Level and Support Policy, payments/refunds terms, privacy policy, acceptable use rules, and AI terms when automation is involved. That covers access, account control, subscriptions, support, uptime posture, credits, and misuse."
    },
    {
      keys:["privacy","data","california","personal","cookie","tracking"],
      answer:"Privacy is handled through the Enterprise Privacy Policy, Cookie and Tracking Policy, and Data Processing Addendum. Together they explain what data may be collected, how business operations use it, how AI providers may process inputs, and where privacy requests go."
    },
    {
      keys:["dmca","ip","copyright","trademark","takedown","creator","media"],
      answer:"DMCA and IP notices route through /legal/dmca-ip/. Creator and media workflows also connect to Creator, Artist, and Media Terms plus Community/UGC terms, so uploads, rights, takedowns, and repeat-infringer rules have a public home."
    },
    {
      keys:["commerce","refund","payment","chargeback","marketplace","subscription"],
      answer:"Commerce is split across Marketplace and Commerce Terms, Payment Refund and Chargeback Policy, Subscription and Cancellation Terms, and Affiliate Referral Terms. Those pages set checkout rules, refund posture, chargeback handling, renewals, revenue share boundaries, and merchant responsibilities."
    },
    {
      keys:["contact","legal notice","email","support","human"],
      answer:"Legal notices, privacy requests, IP issues, customer support, and carrier verification questions can route through /contact/ or grayskyes@solenterprises.org. The brain can explain the map, but actual legal decisions still need human review."
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
      const score=item.keys.reduce((total,key)=>total+(normalized.includes(key)?1:0),0);
      return {item,score};
    }).sort((a,b)=>b.score-a.score);
    if(scored[0]&&scored[0].score>0) return scored[0].item.answer;
    return "I can explain the public legal map: terms, privacy, AI, SMS consent, SaaS, payments, IP, commerce, contractor/vendor rules, security, and contact routes. Ask me for one lane and I will point you to the right page.";
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
