window.SOLRuntime = window.SOLRuntime || (() => {
  const cfg = window.SOL_RUNTIME_CONFIG || {};
  const configured = Array.isArray(cfg.apiBases) ? cfg.apiBases : [];
  const bases = [
    ...configured,
    cfg.apiBase,
    "/.netlify/functions",
    "/api"
  ].filter(Boolean).map(base => String(base).replace(/\/+$/, ""));
  const uniqueBases = [...new Set(bases)];

  function functionName(path) {
    const raw = String(path || "");
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw
      .replace(/^\/+\.netlify\/functions\/?/, "")
      .replace(/^\/+api\/?/, "")
      .replace(/^\/+/, "");
  }

  function apiUrl(path, base = uniqueBases[0]) {
    const name = functionName(path);
    if (/^https?:\/\//i.test(name)) return name;
    const normalizedBase = String(base || "/.netlify/functions").replace(/\/+$/, "");
    return `${normalizedBase}/${name}`;
  }

  async function fetchJson(path, options = {}) {
    let lastError = null;
    for (const base of uniqueBases) {
      const url = apiUrl(path, base);
      try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));
        if (res.ok) return { res, data, url };
        lastError = new Error(data.error || `HTTP ${res.status}`);
        lastError.status = res.status;
        lastError.data = data;
        if (![404, 502, 503, 504].includes(res.status)) throw lastError;
      } catch (error) {
        lastError = error;
        if (error.status && ![404, 502, 503, 504].includes(error.status)) throw error;
      }
    }
    throw lastError || new Error("No live staffing backend adapter responded.");
  }

  return { apiUrl, fetchJson, apiBases: uniqueBases };
})();

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
      alert("Live backend wiring is ready. Deploy on Cloudflare Pages or Netlify to send this form into the staffing OS database.");
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

      const { res, data: payload } = await window.SOLRuntime.fetchJson("/.netlify/functions/staffing-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(data)
      });
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
