(() => {
  const canonical = new URL('/Free99/apps/skyebox-authenticator/', window.location.origin);
  canonical.search = window.location.search;
  canonical.hash = window.location.hash;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(
        registrations
          .filter((registration) => registration.scope.includes('/HouseOperations/skye-box-authenticator-vault/'))
          .map((registration) => registration.unregister())
      ))
      .catch(() => undefined)
      .finally(() => window.location.replace(canonical.toString()));
    return;
  }

  window.location.replace(canonical.toString());
})();
