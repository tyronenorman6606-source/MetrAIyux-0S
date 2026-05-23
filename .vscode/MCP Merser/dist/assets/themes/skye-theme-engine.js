
(function(){
  const THEMES = [
    ['sovereign-aurora','#20b7ff','Aurora'],['royal-violet','#9b5cff','Violet'],['solar-crown','#ffb000','Crown'],['citadel-emerald','#28f0a1','Citadel'],['blood-moon','#ff2d64','Moon'],['arctic-neon','#00d5ff','Arctic'],['ghost-steel','#b6c7da','Steel'],['obsidian-dragon','#ff5a1f','Dragon']
  ];
  const root = document.documentElement;
  const KEY = 'metraiyux-skye-theme';
  function setTheme(id){
    root.setAttribute('data-skye-theme', id);
    try{localStorage.setItem(KEY,id)}catch(e){}
    document.querySelectorAll('[data-skye-theme-target]').forEach(el => el.setAttribute('data-skye-theme', id));
    document.querySelectorAll('[data-theme-choice]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === id)));
    document.dispatchEvent(new CustomEvent('skye-theme-change',{detail:{theme:id}}));
  }
  window.SkyeTheme = { setTheme, themes: THEMES.map(([id,color,name])=>({id,color,name})) };
  const saved = (()=>{try{return localStorage.getItem(KEY)}catch(e){return null}})();
  setTheme(saved || root.getAttribute('data-skye-theme') || 'sovereign-aurora');
  function makeDock(){
    if(document.querySelector('.skye-theme-dock')) return;
    const dock = document.createElement('aside');
    dock.className = 'skye-theme-dock';
    dock.setAttribute('aria-label','Skye visual theme switcher');
    dock.innerHTML = '<strong>Skye themes</strong>' + THEMES.map(([id,color,name]) => `<button data-theme-choice="${id}" style="--swatch:${color}" title="${name}" aria-label="${name}" aria-pressed="false"></button>`).join('');
    document.body.appendChild(dock);
    dock.addEventListener('click', e => { const btn = e.target.closest('[data-theme-choice]'); if(btn) setTheme(btn.dataset.themeChoice); });
    setTheme(root.getAttribute('data-skye-theme') || 'sovereign-aurora');
  }
  function copySetup(){
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-copy-target],[data-copy-text]');
      if(!btn) return;
      const text = btn.dataset.copyText || (document.querySelector(btn.dataset.copyTarget)||{}).textContent || '';
      try{
        await navigator.clipboard.writeText(text.trim());
        const old = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(()=>btn.textContent=old, 1100);
      }catch(err){
        const ta = document.createElement('textarea');
        ta.value = text.trim(); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>{makeDock();copySetup();});
  else {makeDock();copySetup();}
})();
