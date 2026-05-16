const glow = document.querySelector(".cursor-glow");
window.addEventListener("pointermove", event => {
  if (!glow) return;
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => nav.classList.toggle("active"));
}

const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.12 });

reveals.forEach(el => observer.observe(el));

const backendFormSkip = new Set(["loginForm", "uploadForm", "brainLiveForm", "manualRecordForm"]);

document.querySelectorAll("form").forEach(form => {
  if (backendFormSkip.has(form.id)) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (location.protocol === "file:") {
      alert("Live backend wiring is ready. Deploy on Netlify to send this form into the staffing OS database.");
      return;
    }

    const button = form.querySelector("button[type='submit'], .btn.primary");
    const originalText = button ? button.textContent : "";
    if (button) {
      button.disabled = true;
      button.textContent = "Sending...";
    }

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      data.page_url = location.href;
      if (!data["form-name"] && form.name) data["form-name"] = form.name;

      const res = await fetch("/.netlify/functions/staffing-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(data)
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);

      form.reset();
      alert("Received. The staffing OS database has the record.");
    } catch (error) {
      alert(error.message || "The form could not be submitted. Please try again.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
});
