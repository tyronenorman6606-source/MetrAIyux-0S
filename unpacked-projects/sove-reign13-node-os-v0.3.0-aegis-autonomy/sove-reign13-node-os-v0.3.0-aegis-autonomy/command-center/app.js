document.querySelectorAll('button[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const text = button.parentElement?.querySelector('code')?.innerText || '';
    try {
      await navigator.clipboard.writeText(text);
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = old; }, 1200);
    } catch (error) {
      console.error(error);
      button.textContent = 'Copy failed';
    }
  });
});
