
const menuBtn=document.querySelector('[data-menu]');const panel=document.querySelector('[data-mobile-panel]');if(menuBtn&&panel){menuBtn.addEventListener('click',()=>{const open=panel.classList.toggle('open');menuBtn.setAttribute('aria-expanded',open?'true':'false')})}
document.querySelectorAll('[data-count]').forEach(el=>{const target=Number(el.dataset.count||0);let current=0;const step=Math.max(1,Math.ceil(target/46));const tick=()=>{current=Math.min(target,current+step);el.textContent=current.toLocaleString();if(current<target)requestAnimationFrame(tick)};tick()});
window.addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--mx',`${e.clientX}px`);document.documentElement.style.setProperty('--my',`${e.clientY}px`)});

// Operator-ready CTA event hooks. Safe public code: no secrets.
document.addEventListener('click', function(e){
  const cta=e.target.closest('[data-conversion]');
  if(!cta) return;
  window.dispatchEvent(new CustomEvent('skyes:conversion-click',{detail:{action:cta.getAttribute('data-conversion'),href:cta.href||''}}));
});
