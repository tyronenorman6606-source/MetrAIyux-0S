(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const params = new URLSearchParams(window.location.search);
  const state = {
    clientSlug: (params.get("client") || "bobs-smoke-shop").trim(),
    dryRun: params.get("dry_run") === "1" || params.get("proof") === "1",
    offers: [],
    client: null,
    skyemerit: null,
    selectedOfferId: ""
  };

  function isBobLane() {
    return state.clientSlug.toLowerCase() === "bobs-smoke-shop";
  }

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

  function setStatus(title, text, show = true) {
    const panel = $("#statusPanel");
    if (!panel) return;
    panel.hidden = !show;
    $("#statusTitle").textContent = title;
    $("#statusText").textContent = text;
  }

  function calculateMerit(rule, subtotalCents) {
    const subtotal = Math.max(0, Math.round(Number(subtotalCents || 0)));
    if (!rule) return null;
    const min = Math.max(0, Math.round(Number(rule.min_transaction_cents || 0)));
    const max = rule.max_transaction_cents == null ? null : Math.max(0, Math.round(Number(rule.max_transaction_cents || 0)));
    if (subtotal < min || (max != null && subtotal > max)) return null;
    const floor = Math.max(0, Math.round(Number(rule.floor_cents || 0)));
    const cap = rule.cap_cents == null ? subtotal : Math.max(0, Math.round(Number(rule.cap_cents || 0)));
    const eligible = Math.max(0, Math.min(subtotal, cap) - floor);
    const discount = Math.min(subtotal, Math.round((eligible * Number(rule.rate_bps || 0)) / 10000));
    return {
      code: rule.code,
      title: rule.title,
      eligible_cents: eligible,
      discount_cents: discount,
      payable_cents: Math.max(0, subtotal - discount)
    };
  }

  function bestMeritForOffer(offer) {
    const subtotal = Number(offer?.skyemerit?.discountable_cents || 0);
    const rules = state.skyemerit?.rules || [];
    const selectedCode = $("#skyemeritCode")?.value || "SKYEMERIT-FIRST-BEST";
    if (selectedCode === "none" || subtotal <= 0) return null;
    const candidates = rules
      .filter((rule) => selectedCode === "SKYEMERIT-FIRST-BEST" ? rule.family === "first_time" : rule.code === selectedCode)
      .map((rule) => calculateMerit(rule, subtotal))
      .filter(Boolean)
      .sort((a, b) => b.discount_cents - a.discount_cents);
    return candidates[0] || null;
  }

  function renderSkyeMeritPreview() {
    const panel = $("#skyemeritPreview");
    if (!panel) return;
    const offer = state.offers.find((item) => item.id === state.selectedOfferId) || state.offers[0];
    const merit = bestMeritForOffer(offer);
    if (!offer) {
      panel.textContent = "Choose an offer to preview SkyeMerit.";
      return;
    }
    if (!merit) {
      const hasDiscountable = Number(offer.skyemerit?.discountable_cents || 0) > 0;
      panel.textContent = hasDiscountable
        ? "No SkyeMerit is selected for this checkout."
        : "This lane has no SkyeMerit-discountable charge today; the first-time pack still carries the kAIxu credit after onboarding.";
      return;
    }
    panel.innerHTML = `
      <strong>${escapeHtml(merit.title)}</strong>
      <span>${escapeHtml(merit.code)} lowers eligible checkout spend by ${money(merit.discount_cents)}. Customer pays ${money(merit.payable_cents)} on the eligible charge. Stripe promo-code stacking turns off when this applies.</span>
    `;
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  function renderClient(data) {
    state.client = data.client;
    state.skyemerit = data.skyemerit || null;
    const allOffers = data.offers || [];
    const defaultOfferId = params.get("offer") || state.client.default_offer_id || allOffers[0]?.id || "";
    state.offers = isBobLane()
      ? allOffers.filter((offer) => offer.id === defaultOfferId).slice(0, 1)
      : allOffers;
    if (!state.offers.length && allOffers.length) state.offers = [allOffers[0]];
    state.selectedOfferId = defaultOfferId || state.offers[0]?.id || "";
    document.body.classList.toggle("bob-lane", isBobLane());
    if (isBobLane()) renderBobLaneShell();
    $("#clientEyebrow").textContent = isBobLane() ? "Bob's private preview" : `${state.client.client_name} private closeout`;
    $("#clientName").textContent = state.client.client_name;
    $("#trialDays").textContent = `${state.client.free_trial_days || 7} days`;
    $("#clientSpecial").textContent = isBobLane()
      ? "No payment today. Try the preview for one week. If it feels useful, we can continue with a first-six-month discount; if not, no pressure."
      : state.client.special_offer || "Free preview first. Confirmed Stripe payment waits for owner-approved activation.";
    $("#includedUsage").innerHTML = (state.client.included_usage || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    renderContact();
    if (state.dryRun) $("#proofModeBadge").textContent = "Proof mode";
    renderSkyeMeritPicker();
    renderOffers();
  }

  function renderSkyeMeritPicker() {
    const select = $("#skyemeritCode");
    if (!select) return;
    const rules = state.skyemerit?.rules || [];
    select.innerHTML = `
      <option value="SKYEMERIT-FIRST-BEST">Auto first-time SkyeMerit</option>
      ${rules.map((rule) => `<option value="${escapeHtml(rule.code)}">${escapeHtml(rule.title)} - ${Number(rule.rate_percent || 0)}%</option>`).join("")}
      <option value="none">No SkyeMerit</option>
    `;
    $("#skyemeritCredit").textContent = state.skyemerit?.first_time_kaixu_credit_cents
      ? `${money(state.skyemerit.first_time_kaixu_credit_cents)} premium kAIxu credit`
      : "$6 premium kAIxu credit";
    const requested = params.get("skyemerit_code") || params.get("skyemerit");
    if (requested && Array.from(select.options).some((option) => option.value === requested)) select.value = requested;
    select.addEventListener("change", renderSkyeMeritPreview);
  }

  function renderBobLaneShell() {
    document.title = "Bob's Smoke Shop Free Preview | SkyePay";
    const nav = document.querySelector(".pay-nav nav");
    if (nav) {
      nav.innerHTML = `
        <a href="#checkout">Free Preview</a>
        <a href="#included">Included</a>
        <a href="#gate-path">Next Step</a>
      `;
    }
    $("#proofModeBadge").textContent = "Free tester week";
    $("#checkoutTitle").textContent = "Open Bob's free tester lane";
    $("#heroTitle").innerHTML = `<span class="neon-gradient-text text-effects">Bob, try it free.</span> Keep it only if it earns the spot.`;
    $("#heroLead").textContent = "This is the clean handoff for Bob's Smoke Shop: preview access, included tester usage, and a simple option to continue after the free week.";
    $("#heroPoints").innerHTML = `
      <span>$0 today</span>
      <span>7 app scans</span>
      <span>25 commands</span>
      <span>First 6 months discounted</span>
    `;
    $("#includedTitle").textContent = "Everything Bob needs to test the preview without getting buried.";
    $("#gateEyebrow").textContent = "Simple next step";
    $("#gateTitle").textContent = "Try the app, tell us what to adjust, then decide if it should stay.";
    $("#pathRail").innerHTML = `
      <article>
        <span>01</span>
        <h3>Open the preview</h3>
        <p>Bob scans the QR or opens this lane and starts the free tester week with no payment due today.</p>
      </article>
      <article>
        <span>02</span>
        <h3>Use the included tester credits</h3>
        <p>The preview includes app scans, commands, proof exports, and two tester seats so he can actually feel the app.</p>
      </article>
      <article>
        <span>03</span>
        <h3>Keep it or pass</h3>
        <p>If Bob likes it, we continue with a discounted first six months. If not, the trial can end clean.</p>
      </article>
    `;
  }

  function renderContact() {
    const contact = state.client?.contact || {};
    const panel = $("#clientContact");
    if (!panel) return;
    if (!contact.email && !contact.phone && !contact.contact_url) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    panel.innerHTML = `
      <p class="mini-label">${isBobLane() ? "Questions during preview" : "Contact"}</p>
      <div>
        ${contact.email ? `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : ""}
        ${contact.phone ? `<a href="tel:${escapeHtml(contact.phone.replace(/[^0-9+]/g, ""))}">${escapeHtml(contact.phone)}</a>` : ""}
        ${contact.contact_url ? `<a href="${escapeHtml(contact.contact_url)}">Company contact page</a>` : ""}
      </div>
    `;
  }

  function requestToken(payload) {
    const email = String(payload.customer_email || "").trim().toLowerCase();
    const storageKey = `skyepay:idempotency:${state.clientSlug}:${state.selectedOfferId}:${email}`;
    try {
      const existing = sessionStorage.getItem(storageKey);
      if (existing) return existing;
      const token = crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
      const clean = token.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 160);
      sessionStorage.setItem(storageKey, clean);
      return clean;
    } catch {
      return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`.slice(0, 160);
    }
  }

  function offerPrice(offer) {
    const setup = Number(offer.setup_cents || 0);
    const monthly = Number(offer.recurring_cents || 0);
    const trialDays = Number(offer.trial_days || 0);
    if (trialDays > 0 && offer.zero_upfront_trial) {
      if (monthly) return `$0 today • ${money(monthly)}/mo after ${trialDays} days`;
      return `$0 today • unlocks after confirmed continuation`;
    }
    if (setup && monthly) return `${money(setup)} setup + ${money(monthly)}/mo`;
    if (monthly) return `${money(monthly)}/mo`;
    return money(setup);
  }

  function offerMeta(offer) {
    const parts = [];
    if (offer.badge) parts.push(offer.badge);
    if (offer.owner_approval_required) parts.push("owner approval");
    if (offer.rate_limits?.rpm) parts.push(`${offer.rate_limits.rpm} rpm`);
    if (offer.rate_limits?.vault_workspace_limit) parts.push(`${offer.rate_limits.vault_workspace_limit} workspace${offer.rate_limits.vault_workspace_limit === 1 ? "" : "s"}`);
    if (offer.deferred_one_time_cents) parts.push(`${money(offer.deferred_one_time_cents)} deferred setup`);
    return parts.slice(0, 3).map((item) => `<em>${escapeHtml(item)}</em>`).join("");
  }

  function renderOffers() {
    const wrap = $("#offerSelect");
    if (isBobLane()) {
      const offer = state.offers.find((item) => item.id === state.selectedOfferId) || state.offers[0];
      if (!offer) {
        wrap.innerHTML = "";
        return;
      }
      state.selectedOfferId = offer.id;
      wrap.classList.add("bob-offer-summary");
      wrap.innerHTML = `
        <div class="bob-trial-card">
          <span class="mini-label">Bob's preview plan</span>
          <strong>${escapeHtml(offer.title)}</strong>
          <p>${escapeHtml(offerPrice(offer))}. After the free week, confirmed SkyePay checkout waits for owner-approved activation.</p>
          <small class="offer-meta">${offerMeta(offer)}</small>
        </div>
      `;
      $("#checkoutBtn").textContent = "Start Bob's free tester week";
      renderSkyeMeritPreview();
      return;
    }
    wrap.classList.remove("bob-offer-summary");
    wrap.innerHTML = state.offers.map((offer) => `
      <button type="button" class="offer-option neon-magnetic" data-offer-id="${escapeHtml(offer.id)}" aria-pressed="${offer.id === state.selectedOfferId ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(offer.title)}</strong>
          <p>${escapeHtml(offer.description)}</p>
          <small class="offer-meta">${offerMeta(offer)}</small>
        </span>
        <span class="offer-price">${escapeHtml(offerPrice(offer))}</span>
      </button>
    `).join("");
    $$(".offer-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedOfferId = btn.dataset.offerId;
        $$(".offer-option").forEach((node) => node.setAttribute("aria-pressed", String(node === btn)));
        renderSkyeMeritPreview();
      });
    });
    renderSkyeMeritPreview();
  }

  async function loadCatalog() {
    const data = await fetchJson(`/.netlify/functions/skyepay-offers?client=${encodeURIComponent(state.clientSlug)}`);
    renderClient(data);
  }

  async function submitCheckout(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("#checkoutBtn");
    button.disabled = true;
    button.textContent = isBobLane() ? "Opening Bob's tester lane..." : "Preparing secure lane...";
    setStatus(
      isBobLane() ? "Opening tester lane" : "Creating checkout",
      isBobLane() ? "SkyePay is preparing Bob's free preview handoff." : "SkyePay is sending the approved offer through FS27."
    );

    const payload = {
      client_slug: state.clientSlug,
      offer_id: state.selectedOfferId,
      customer_name: form.customer_name.value,
      customer_email: form.customer_email.value,
      company_name: form.company_name.value || state.client?.company_name || "",
      dry_run: state.dryRun,
      skyemerit_code: $("#skyemeritCode")?.value === "none" ? "" : ($("#skyemeritCode")?.value || "SKYEMERIT-FIRST-BEST"),
      skyemerit_pack_id: state.skyemerit?.first_time_pack_id || "SKYEMERIT-FIRST-PACK",
      skyemerit_first_time: true,
      skyemerit_apply: $("#skyemeritCode")?.value !== "none"
    };
    payload.idempotency_key = requestToken(payload);

    try {
      const data = await fetchJson("/.netlify/functions/skyepay-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!data.url) throw new Error("Checkout URL was not returned.");
      window.location.href = data.url;
    } catch (error) {
      button.disabled = false;
      button.textContent = isBobLane() ? "Start Bob's free tester week" : "Start secure trial";
      setStatus("Checkout needs attention", error.message || "SkyePay could not create the Checkout Session.");
    }
  }

  async function loadStatusFromQuery() {
    const status = params.get("status");
    if (!status) return;
    if (status === "cancelled") {
      setStatus("Checkout cancelled", "No payment was made. The private preview can still continue.");
      return;
    }
    const sessionId = params.get("session_id");
    const demoSession = params.get("demo_session");
    if (!sessionId && !demoSession) return;
    setStatus("Reading gate ledger", "SkyePay is checking the FS27 order state.");
    const query = new URLSearchParams();
    if (demoSession) {
      query.set("demo_session", demoSession);
      if (params.get("offer")) query.set("offer", params.get("offer"));
      if (params.get("client")) query.set("client", params.get("client"));
    } else {
      query.set("session_id", sessionId);
    }
    try {
      const data = await fetchJson(`/.netlify/functions/skyepay-status?${query.toString()}`);
      const order = data.order || {};
      const approvalState = String(order.approval_status || order.owner_status || order.provisioning_status || "").toLowerCase();
      const waitingForOwner = approvalState.includes("owner_approval") || approvalState.includes("pending_owner");
      if (order.provisioning_status === "workspace_unlocked") {
        setStatus("Workspace unlocked", `Payment state: ${order.payment_status || "received"}. Workspace state: ${order.provisioning_status}.`);
      } else if (waitingForOwner) {
        setStatus("Pending owner approval", `Payment state: ${order.payment_status || "received"}. Workspace state: ${order.provisioning_status || "waiting_for_owner_approval"}.`);
      } else if (data.dry_run) {
        setStatus("Preview recorded", `Payment state: ${order.payment_status || "demo_not_charged"}. Workspace state: ${order.provisioning_status || "demo_not_unlocked"}.`);
      } else {
        setStatus("Payment confirmed", `Payment state: ${order.payment_status || "received"}. Workspace state: ${order.provisioning_status || "syncing_unlock"}.`);
      }
    } catch (error) {
      setStatus("Checkout returned", "Stripe returned to SkyePay. The webhook may still be writing the workspace unlock state.");
    }
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

    $$(".neon-magnetic").forEach((el) => {
      el.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.08;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.08;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let advancedMounted = false;
    function mountAdvancedMotion() {
      if (advancedMounted) return;
      const gsapApi = globalThis.SkyePayMotionStack?.gsap || globalThis.gsap;
      const ScrollTriggerApi = globalThis.SkyePayMotionStack?.ScrollTrigger || globalThis.ScrollTrigger;
      const LenisApi = globalThis.SkyePayMotionStack?.Lenis || globalThis.Lenis;
      if (!gsapApi && !LenisApi) return;
      advancedMounted = true;

      if (LenisApi) {
        const lenis = new LenisApi({ lerp: 0.16, wheelMultiplier: 0.85 });
        function raf(time) {
          lenis.raf(time);
          if (ScrollTriggerApi) ScrollTriggerApi.update();
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }

      if (gsapApi) {
        if (ScrollTriggerApi) gsapApi.registerPlugin(ScrollTriggerApi);
        gsapApi.from(".text-effects", {
          filter: "blur(8px)",
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          clearProps: "filter,opacity"
        });
        if (!window.matchMedia("(max-width: 640px)").matches) {
          gsapApi.from(".hero-copy > *", {
            y: 22,
            opacity: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "opacity,transform"
          });
          gsapApi.from(".checkout-console", {
            y: 28,
            opacity: 0,
            duration: 0.9,
            delay: 0.1,
            ease: "power3.out",
            clearProps: "opacity,transform"
          });
        }
        gsapApi.utils.toArray(".skypay-reveal").forEach((section) => {
          gsapApi.from(section, {
            scrollTrigger: { trigger: section, start: "top 82%", end: "bottom 65%", scrub: 0.35 },
            y: 30,
            opacity: 0.45,
            ease: "none",
            clearProps: "opacity,transform"
          });
        });
        if (ScrollTriggerApi) {
          gsapApi.to("#pathRail article", {
            scrollTrigger: { trigger: "#gate-path", start: "top 65%", end: "bottom 30%", scrub: 0.7 },
            borderColor: "rgba(39,242,255,0.48)",
            stagger: 0.12,
            ease: "none"
          });
        }
      }
    }

    mountAdvancedMotion();
    globalThis.addEventListener("skyepay:motion-stack-ready", mountAdvancedMotion, { once: true });
    setTimeout(mountAdvancedMotion, 900);
  }

  async function init() {
    mountMotionChrome();
    $("#skypayForm")?.addEventListener("submit", submitCheckout);
    try {
      await loadCatalog();
      await loadStatusFromQuery();
    } catch (error) {
      setStatus("SkyePay needs the gate", error.message || "The FS27 functions are not reachable yet.");
    }
  }

  init();
})();
