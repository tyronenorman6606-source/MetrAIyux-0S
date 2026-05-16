const form = document.querySelector('#operatorForm');
const token = document.querySelector('#operatorToken');
const statusBox = document.querySelector('#operatorStatus');
const params = new URLSearchParams(window.location.search);
const returnTo = params.get('return') || '/admin.html';

function showStatus(message, type = '') {
  statusBox.className = `status-card ${type}`.trim();
  statusBox.textContent = message;
  statusBox.classList.remove('hidden');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showStatus('Checking operator token…');
  try {
    const response = await fetch('/api/operator-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ adminToken: token.value })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || `Login failed with ${response.status}.`);
    showStatus('Operator session active. Opening internal page…', 'success');
    window.location.href = returnTo.startsWith('/') ? returnTo : '/admin.html';
  } catch (error) {
    showStatus(error.message, 'error');
  }
});
