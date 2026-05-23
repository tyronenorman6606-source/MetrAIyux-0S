const key='neo-front-state:skye-music-nexus';
const state=JSON.parse(localStorage.getItem(key)||'{"checks":[]}');
document.querySelectorAll('[data-action]').forEach((button)=>button.addEventListener('click',()=>{
  state.checks.unshift({action:button.dataset.action,page:document.body.dataset.page,at:new Date().toISOString()});
  state.checks=state.checks.slice(0,40);
  localStorage.setItem(key,JSON.stringify(state));
  button.textContent='Signal Captured';
}));
