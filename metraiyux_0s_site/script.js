
const search = document.querySelector('#search');
const cards = [...document.querySelectorAll('.leader-card')];
if (search) {
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
}
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});observer.unobserve(entry.target)}
  })
},{threshold:.1});
document.querySelectorAll('.leader-card,.panel,.cabinet-map div,.quote-panel').forEach(el=>{el.style.opacity=0;observer.observe(el)});
