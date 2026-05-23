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
    status.textContent = "Checking 0S/SkyGate session...";
    const bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
    const session = bridge?.requireSession?.({ platformId: "sol-staffing", usageLane: "staffing-auth" }) || bridge?.current?.();
    const token = session?.token || "";
    if (!token) {
      status.textContent = "Sign into 0S/SkyGate first.";
      return;
    }

    try {
      const { res, data } = await window.SOLRuntime.fetchJson("/.netlify/functions/staffing-auth-session", {
        method: "POST",
        headers: { ...(bridge?.headers?.({ "x-skye-platform": "sol-staffing", "x-skye-usage-lane": "staffing-auth" }) || {}), "Content-Type": "application/json" },
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
