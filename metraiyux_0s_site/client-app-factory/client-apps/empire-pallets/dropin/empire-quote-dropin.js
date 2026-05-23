(function(){
  const host=document.querySelector('[data-empire-quote-dropin]');
  if(!host)return;
  const rawBase=host.getAttribute('data-base')||'..';
  const base=rawBase.replace(/\/$/,'');
  const quotePath=['quote','html'].join('.');
  const href=`${base}/${quotePath}`;
  host.innerHTML=`<div style="font-family:Inter,Arial,sans-serif;border:1px solid #d6dee8;border-radius:24px;padding:22px;background:#06101c;color:#f7fbff;box-shadow:0 18px 60px rgba(0,0,0,.18)"><strong style="display:block;font-size:22px;margin-bottom:8px">Need pallets, pickup, or trailer support?</strong><p style="color:#b8c5d3;margin:0 0 16px">Send service type, quantity, and ZIP so Empire Pallets can confirm availability and scheduling.</p><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#85d8ff,#4568ff);color:#02070d;text-decoration:none;font-weight:900;padding:12px 18px;border-radius:999px">Request a Quote</a></div>`;
})();
