(function(){
  const form = document.getElementById("loginForm");
  const status = document.getElementById("loginStatus");
  const skyegateLink = document.getElementById("skyegateLoginLink");
  const next = new URLSearchParams(location.search).get("next") || "./admin-dashboard.html";

  window.SOLRuntime.fetchJson("/.netlify/functions/staffing-auth-config", { credentials: "same-origin" })
    .then(({ data: config }) => config)
    .then(config => {
      if (config.login_url && skyegateLink) {
        skyegateLink.href = config.login_url;
        skyegateLink.hidden = false;
      }
    })
    .catch(() => {});

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    status.textContent = "Checking token with Skyegate FS27...";
    const token = new FormData(form).get("token");

    try {
      const { res, data } = await window.SOLRuntime.fetchJson("/.netlify/functions/staffing-auth-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      status.textContent = "Session created. Opening dashboard...";
      location.href = next;
    } catch (error) {
      status.textContent = error.message || "Login failed.";
    }
  });
})();
