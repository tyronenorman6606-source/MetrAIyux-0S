
(() => {
  const progress = document.createElement("span");
  progress.className = "scroll-progress motion-chrome";
  progress.setAttribute("aria-hidden", "true");
  document.body.prepend(progress);

  const glow = document.createElement("span");
  glow.className = "cursor-glow pointer-reactive";
  glow.setAttribute("aria-hidden", "true");
  document.body.prepend(glow);

  const updateProgress = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    document.documentElement.style.setProperty("--scroll-progress", String(window.scrollY / max));
  };

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
  }, { passive: true });
  updateProgress();

  const copyButtons = Array.from(document.querySelectorAll("[data-copy-review-request]"));
  const request = `Hi,

I am updating the Skyes Over London Reviews section and would appreciate a short review about your experience working with us.

A few things you can mention:
- What problem you needed help solving.
- What service or system we helped with.
- What changed after the work was completed.
- Whether the experience made your business, website, workflow, staffing, automation, customer process, or launch readiness stronger.

Two to four sentences is enough. I can also keep your name, title, or company private if preferred.

Thank you.`;

  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(request);
        const original = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => button.textContent = original, 1800);
      } catch (error) {
        const original = button.textContent;
        button.textContent = "Copy Failed";
        setTimeout(() => button.textContent = original, 1800);
      }
    });
  });
})();
