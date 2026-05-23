(function(){
  const commandForm = document.querySelector('[data-client-command-form]');
  const output = document.querySelector('[data-client-command-output]');
  const scans = document.querySelectorAll('[data-scan-check]');

  if (commandForm && output) {
    commandForm.addEventListener('submit', function(event){
      event.preventDefault();
      const command = new FormData(commandForm).get('command') || 'Run website scan';
      const stamped = new Date().toISOString();
      output.textContent = [
        'MetrAIyux 0S preview receipt',
        "Client: Bob's Smoke Shop",
        'Workspace: bob-smoke-shop-preview-001',
        'Command: ' + command,
        'Route: Site Operator Brain -> 0meg4kAI review -> human approval',
        'Included usage impact: 1 workspace command',
        'Generated: ' + stamped,
        '',
        'Next action: review the draft, confirm stock/pricing claims, then approve publication.'
      ].join('\\n');
    });
  }

  scans.forEach(function(button){
    button.addEventListener('click', function(){
      const target = document.querySelector(button.getAttribute('data-scan-check'));
      if (!target) return;
      target.textContent = 'Queued for preview scan. This uses 1 of 7 included smoke-shop website scans.';
    });
  });
})();
