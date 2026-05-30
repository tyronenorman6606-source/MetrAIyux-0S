document.querySelector('[data-copy-agent-prompt]')?.addEventListener('click', async () => {
  const text = document.getElementById('agentPrompt')?.innerText || '';
  await navigator.clipboard.writeText(text);
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = 'Agent prompt copied.';
  status.classList.remove('hidden');
  setTimeout(() => status.classList.add('hidden'), 2600);
});
