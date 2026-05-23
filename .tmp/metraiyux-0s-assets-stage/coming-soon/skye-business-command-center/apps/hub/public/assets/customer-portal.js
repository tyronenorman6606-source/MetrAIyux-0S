(function () {
  function collect(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  function saveSubmission(type, data) {
    const key = 'skyePortalSubmissions';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift({
      type,
      data,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
  }

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-portal-form]');
    if (!form) return;
    event.preventDefault();
    saveSubmission(form.dataset.portalForm, collect(form));
    const result = document.querySelector('[data-form-result]');
    if (result) {
      result.hidden = false;
      result.textContent = 'Saved in this branded portal demo. Production wiring should send this into the internal support, CRM, form, or billing workflow without exposing raw app logins.';
    }
    form.reset();
  });
}());
