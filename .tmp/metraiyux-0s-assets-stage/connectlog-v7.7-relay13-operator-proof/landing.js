(() => {
  'use strict';

  const APP_PATH = './app.html';
  const RETURN_PREF = 'connectlog:returnToApp';
  const params = new URLSearchParams(window.location.search);
  const rawHash = window.location.hash || '';

  if (rawHash.startsWith('#connect=')) {
    window.location.replace(`${APP_PATH}${rawHash}`);
    return;
  }

  if (localStorage.getItem(RETURN_PREF) === 'yes' && !params.has('landing') && !rawHash) {
    window.location.replace(APP_PATH);
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-app]');
    if (!trigger) return;
    localStorage.setItem(RETURN_PREF, 'yes');
  });
})();
