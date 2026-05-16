(function(){
  const gate = document.querySelector('.age-gate');
  const yes = document.querySelector('[data-age-yes]');
  const no = document.querySelector('[data-age-no]');
  if(localStorage.getItem('bobsAgeOk') === 'yes' && gate) gate.style.display = 'none';
  if(yes) yes.addEventListener('click', () => { localStorage.setItem('bobsAgeOk','yes'); gate.style.display='none'; });
  if(no) no.addEventListener('click', () => { document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#02050a;color:white;font-family:system-ui;text-align:center;padding:24px"><div><h1>Access Restricted</h1><p>This website is intended for adults 21+ only.</p></div></main>'; });
  const previewWindow = document.querySelector('[data-preview-window]');
  const openPreviewButtons = document.querySelectorAll('[data-preview-open]');
  const minimizePreview = document.querySelector('[data-preview-minimize]');
  function setPreviewOpen(isOpen){
    if(!previewWindow) return;
    previewWindow.classList.toggle('is-minimized', !isOpen);
    previewWindow.classList.toggle('is-open', isOpen);
    openPreviewButtons.forEach((button) => button.setAttribute('aria-expanded', String(isOpen)));
  }
  openPreviewButtons.forEach((button) => button.addEventListener('click', () => setPreviewOpen(true)));
  if(minimizePreview) minimizePreview.addEventListener('click', () => setPreviewOpen(false));
  if(previewWindow) setPreviewOpen(false);
  if('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }
})();
