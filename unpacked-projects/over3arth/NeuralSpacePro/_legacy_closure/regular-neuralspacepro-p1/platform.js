const platformId="neuralspacepro";
const key='p1-platform-state:'+platformId;
const state=JSON.parse(localStorage.getItem(key)||'{"events":[]}');
function save(action){state.events.unshift({action,at:new Date().toISOString(),page:document.body.dataset.page});state.events=state.events.slice(0,20);localStorage.setItem(key,JSON.stringify(state));}
document.querySelectorAll('[data-action]').forEach((button)=>button.addEventListener('click',()=>{save(button.dataset.action);button.textContent='Saved';setTimeout(()=>{button.textContent=button.dataset.action.includes('verify')?'Verify':'Queue'},900);}));
