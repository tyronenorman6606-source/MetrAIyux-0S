(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const auth = { adminPassword: "" };

  function money(cents) {
    return "$" + (Math.round(Number(cents || 0)) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      "\"": "&quot;"
    }[c]));
  }

  function toast(message) {
    $("#ledgerToast").textContent = message;
  }

  async function adminJson(path, options = {}) {
    const headers = {
      "x-admin-password": auth.adminPassword,
      ...(options.body ? { "content-type": "application/json" } : {})
    };
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  function totals(order) {
    const setup = Number(order.amount_setup_cents || 0);
    const recurring = Number(order.amount_recurring_cents || 0);
    const merit = order.metadata || {};
    const discount = Number(merit.skyemerit_discount_cents || 0);
    const adjusted = Number(merit.skyemerit_adjusted_due_cents || 0);
    const base = setup && recurring ? `${money(setup)} + ${money(recurring)}/mo` : recurring ? `${money(recurring)}/mo` : money(setup);
    if (discount > 0) return `${base}<br><span>SkyeMerit ${escapeHtml(merit.skyemerit_code || "")}: -${money(discount)} (${money(adjusted)} due)</span>`;
    if (setup && recurring) return `${money(setup)} + ${money(recurring)}/mo`;
    if (recurring) return `${money(recurring)}/mo`;
    return money(setup);
  }

  function renderLedger(data) {
    const summary = data.summary || {};
    $("#statTotal").textContent = summary.total || 0;
    $("#statPending").textContent = summary.pending_approval || 0;
    $("#statApproved").textContent = summary.approved || 0;
    $("#statUnlocked").textContent = summary.workspace_unlocked || 0;

    const tbody = $("#ledgerTable tbody");
    tbody.innerHTML = (data.orders || []).map((order) => `
      <tr>
        <td>
          <strong>${escapeHtml(order.company_name || order.client_slug)}</strong><br />
          ${escapeHtml(order.customer_email || "")}<br />
          <span>${escapeHtml(order.client_slug)} / ${escapeHtml(order.workspace_slug || "")}</span>
        </td>
        <td>
          <strong>${escapeHtml(order.offer_snapshot?.title || order.offer_id)}</strong><br />
          ${totals(order)}
        </td>
        <td>
          ${escapeHtml(order.payment_status)}<br />
          <span>${escapeHtml(order.stripe_session_id || "no session")}</span>
        </td>
        <td>${escapeHtml(order.approval_status)}<br /><span>${escapeHtml(order.owner_status)}</span></td>
        <td>${escapeHtml(order.provisioning_status || "waiting_for_payment")}</td>
        <td>
          <div class="row-actions">
            <button data-action="approve" data-id="${escapeHtml(order.id)}">Approve</button>
            <button data-action="mark_provisioned" data-id="${escapeHtml(order.id)}">Unlock</button>
            <button data-action="void" data-id="${escapeHtml(order.id)}">Void</button>
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6">No SkyePay orders yet.</td></tr>`;

    $$(".row-actions button").forEach((btn) => {
      btn.addEventListener("click", () => updateOrder(btn.dataset.id, btn.dataset.action));
    });
  }

  async function loadLedger() {
    toast("Loading ledger...");
    const data = await adminJson("/.netlify/functions/admin-skyepay-ledger?limit=100");
    renderLedger(data);
    toast("Ledger current.");
  }

  async function updateOrder(orderId, action) {
    toast(`Sending ${action}...`);
    await adminJson("/.netlify/functions/admin-skyepay-ledger", {
      method: "PATCH",
      body: JSON.stringify({ order_id: orderId, action })
    });
    await loadLedger();
  }

  function mountMotionChrome() {
    const progress = $("#skypayProgress");
    const glow = $("#cursorGlow");
    window.addEventListener("scroll", () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.width = `${Math.min(100, Math.max(0, (window.scrollY / max) * 100))}%`;
    }, { passive: true });
    window.addEventListener("pointermove", (event) => {
      if (!glow || window.matchMedia("(max-width: 640px)").matches) return;
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    }, { passive: true });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let advancedMounted = false;
    function mountAdvancedMotion() {
      if (advancedMounted) return;
      const gsapApi = globalThis.SkyePayMotionStack?.gsap || globalThis.gsap;
      const LenisApi = globalThis.SkyePayMotionStack?.Lenis || globalThis.Lenis;
      if (!gsapApi && !LenisApi) return;
      advancedMounted = true;
      if (LenisApi) {
        const lenis = new LenisApi({ lerp: 0.16, wheelMultiplier: 0.85 });
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
      if (gsapApi) {
        gsapApi.from(".skypay-reveal, .ledger-login, .ledger-panel", {
          y: 22,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out"
        });
      }
    }
    mountAdvancedMotion();
    globalThis.addEventListener("skyepay:motion-stack-ready", mountAdvancedMotion, { once: true });
    setTimeout(mountAdvancedMotion, 900);
  }

  $("#loginBtn")?.addEventListener("click", async () => {
    auth.adminPassword = ($("#adminPassword").value || "").trim();
    if (!auth.adminPassword) {
      $("#ledgerToast").textContent = "Enter the admin password.";
      return;
    }
    $("#loginPanel").hidden = true;
    $("#ledgerPanel").hidden = false;
    try {
      await loadLedger();
    } catch (error) {
      $("#loginPanel").hidden = false;
      $("#ledgerPanel").hidden = true;
      auth.adminPassword = "";
      alert(error.message || "Could not open SkyePay ledger.");
    }
  });
  $("#refreshLedger")?.addEventListener("click", () => loadLedger().catch((error) => toast(error.message)));

  mountMotionChrome();
})();
