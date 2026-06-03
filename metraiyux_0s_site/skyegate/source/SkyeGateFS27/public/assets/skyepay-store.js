(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const params = new URLSearchParams(window.location.search);
  const LEGAL_ACCEPTANCE_VERSION = "legal-skyes-transaction-pack-2026-05-28";
  const state = {
    clientSlug: (params.get("client") || "metraiyux-0s").trim(),
    dryRun: params.get("dry_run") === "1" || params.get("proof") === "1",
    offers: [],
    client: null,
    selectedOfferId: params.get("offer") || ""
  };

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

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  function setStatus(title, text, show = true) {
    const panel = $("#storeStatusPanel");
    if (!panel) return;
    panel.hidden = !show;
    $("#storeStatusTitle").textContent = title;
    $("#storeStatusText").textContent = text;
  }

  function legalAcceptancePayload(form, source) {
    const accepted = Boolean(form.legal_acceptance?.checked);
    return {
      legal_acceptance: {
        legal_terms_accepted: accepted,
        arbitration_accepted: accepted,
        payments_policy_accepted: accepted,
        no_outcome_guarantee_accepted: accepted,
        truthful_review_boundary_acknowledged: accepted,
        privacy_policy_accepted: accepted,
        legal_version: LEGAL_ACCEPTANCE_VERSION,
        accepted_at: accepted ? new Date().toISOString() : "",
        acceptance_surface: source,
        source_url: window.location.href
      }
    };
  }

  function priceLine(offer) {
    if (offer.price_summary) return offer.price_summary.replace(", then", " • then");
    if (offer.zero_upfront_trial && offer.trial_days) {
      return `${money(offer.today_cents)} today • ${money(offer.post_trial_cents)}/mo after ${offer.trial_days} days`;
    }
    if (offer.mode === "subscription") return `${money(offer.recurring_cents)}/mo`;
    return `${money(offer.setup_cents)} today`;
  }

  function policyChips(offer) {
    const chips = [];
    if (offer.badge) chips.push(offer.badge);
    if (offer.rate_limits?.rpm) chips.push(`${offer.rate_limits.rpm} rpm`);
    if (offer.rate_limits?.rpd) chips.push(`${offer.rate_limits.rpd} daily calls`);
    if (offer.rate_limits?.monthly_cap_cents) chips.push(`${money(offer.rate_limits.monthly_cap_cents)} usage cap`);
    if (offer.rate_limits?.vault_storage_mb) chips.push(`${Math.round(offer.rate_limits.vault_storage_mb / 1024)}GB vault`);
    if (offer.owner_approval_required) chips.push("owner approval");
    if (offer.credits?.length) chips.push("credit-backed");
    if (offer.catalog_source) chips.push("repo-approved");
    return chips.slice(0, 5).map((chip) => `<span>${escapeHtml(chip)}</span>`).join("");
  }

  function fulfillmentMode(offer) {
    const f = offer.fulfillment || {};
    if (f.self_serve) return "Self-serve delivery";
    if (f.owner_review_required) return "Operator review";
    return "Payment-confirmed delivery";
  }

  function fulfillmentPanel(offer) {
    const f = offer.fulfillment || {};
    if (!f.activation_label && !f.customer_next_step && !f.delivery_surface) return "";
    return `
      <div class="fulfillment-panel">
        <div>
          <span>Delivery route</span>
          <strong>${escapeHtml(f.delivery_surface || fulfillmentMode(offer))}</strong>
        </div>
        <div>
          <span>After checkout</span>
          <strong>${escapeHtml(f.customer_next_step || f.activation_label || fulfillmentMode(offer))}</strong>
        </div>
        <div>
          <span>Support</span>
          <strong>${escapeHtml(f.support_email || "support@metraiyux.com")}</strong>
        </div>
      </div>
    `;
  }

	  function selectedOffer() {
	    return state.offers.find((offer) => offer.id === state.selectedOfferId) || state.offers[0] || null;
	  }

	  function isSkyeMailMailboxOffer(offer) {
	    return Boolean(offer?.gate_policy?.skyemail_mailbox) || [
	      "skyemail-starter-mailbox",
	      "skyemail-business-mailbox",
	      "skyemail-operator-mailbox"
	    ].includes(String(offer?.id || ""));
	  }

	  function normalizeMailboxLocalPart(value) {
	    return String(value || "")
	      .trim()
	      .toLowerCase()
	      .replace(/[^a-z0-9._-]+/g, "-")
	      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
	      .slice(0, 64);
	  }

	  function normalizeMailboxDomain(value) {
	    return String(value || "")
	      .trim()
	      .toLowerCase()
	      .replace(/[^a-z0-9.-]+/g, "")
	      .replace(/^-+|-+$/g, "")
	      .slice(0, 120);
	  }

	  function syncMailboxClaimPanel() {
	    const form = $("#storeCheckoutForm");
	    const preview = $("#storeSkyemailMailboxPreview");
	    if (!form || !preview) return;
	    const local = normalizeMailboxLocalPart(form.mailbox_local_part?.value || "");
	    const domain = normalizeMailboxDomain(form.mailbox_domain?.value || "");
	    preview.textContent = local && domain ? `${local}@${domain}` : "mailbox address required";
	  }

	  function renderMailboxClaimPanel() {
	    const form = $("#storeCheckoutForm");
	    const panel = $("#storeSkyemailMailboxClaim");
	    if (!form || !panel) return;
	    const active = isSkyeMailMailboxOffer(selectedOffer());
	    panel.hidden = !active;
	    if (form.mailbox_local_part) form.mailbox_local_part.required = active;
	    if (form.mailbox_domain) form.mailbox_domain.required = active;
	    if (!active) return;
	    const requestedEmail = params.get("mailbox_email") || params.get("mailbox") || params.get("skyemail") || "";
	    const [requestedLocal = "", requestedDomain = ""] = requestedEmail.includes("@") ? requestedEmail.split("@") : ["", ""];
	    if (form.mailbox_domain && !form.mailbox_domain.value) form.mailbox_domain.value = normalizeMailboxDomain(params.get("mailbox_domain") || params.get("domain") || requestedDomain || "solenterprises.org");
	    if (form.mailbox_local_part && !form.mailbox_local_part.value) {
	      form.mailbox_local_part.value = normalizeMailboxLocalPart(requestedLocal || form.company_name?.value || form.customer_name?.value || form.customer_email?.value?.split("@")[0] || "info");
	      form.mailbox_local_part.dataset.autofilled = "true";
	    }
	    if (form.mailbox_local_part && !form.mailbox_local_part.dataset.bound) {
	      form.mailbox_local_part.dataset.bound = "true";
	      form.mailbox_local_part.addEventListener("input", () => {
	        form.mailbox_local_part.dataset.autofilled = "false";
	        syncMailboxClaimPanel();
	      });
	    }
	    if (form.mailbox_domain && !form.mailbox_domain.dataset.bound) {
	      form.mailbox_domain.dataset.bound = "true";
	      form.mailbox_domain.addEventListener("input", syncMailboxClaimPanel);
	    }
	    [form.company_name, form.customer_name, form.customer_email].forEach((input) => {
	      if (!input || input.dataset.mailboxSeedBound) return;
	      input.dataset.mailboxSeedBound = "true";
	      input.addEventListener("input", () => {
	        if (form.mailbox_local_part?.dataset.autofilled === "true") {
	          form.mailbox_local_part.value = normalizeMailboxLocalPart(form.company_name?.value || form.customer_name?.value || form.customer_email?.value?.split("@")[0] || "info");
	        }
	        syncMailboxClaimPanel();
	      });
	    });
	    syncMailboxClaimPanel();
	  }

	  function renderSelected() {
	    const offer = selectedOffer();
    if (!offer) return;
    state.selectedOfferId = offer.id;
    $("#storeCheckoutTitle").textContent = offer.title;
    $("#selectedOfferSummary").textContent = `${priceLine(offer)}. ${offer.description}`;
    $("#selectedPolicy").innerHTML = policyChips(offer);
    $("#selectedFulfillment").innerHTML = fulfillmentPanel(offer);
	    $$(".store-card").forEach((card) => {
	      card.setAttribute("aria-pressed", String(card.dataset.offerId === offer.id));
	    });
	    renderMailboxClaimPanel();
	  }

  function renderCatalog() {
    const groups = new Map();
    for (const offer of state.offers.filter((item) => item.storefront !== false)) {
      const key = offer.store_category || "Ecosystem store";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(offer);
    }

    $("#storeCatalog").innerHTML = Array.from(groups.entries()).map(([category, offers]) => `
      <section class="store-group">
        <div class="store-group-head">
          <p class="eyebrow">${escapeHtml(category)}</p>
          <span>${offers.length} offer${offers.length === 1 ? "" : "s"}</span>
        </div>
        <div class="store-grid">
          ${offers.map((offer) => `
            <button class="store-card neon-magnetic" type="button" data-offer-id="${escapeHtml(offer.id)}" aria-pressed="${offer.id === state.selectedOfferId ? "true" : "false"}">
              <span class="store-card-top">
                <strong>${escapeHtml(offer.title)}</strong>
                <em>${escapeHtml(priceLine(offer))}</em>
              </span>
              <span class="store-card-copy">${escapeHtml(offer.description)}</span>
              <span class="selected-policy">${policyChips(offer)}</span>
              <span class="store-card-fulfillment">${escapeHtml(fulfillmentMode(offer))}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `).join("");

    $$(".store-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.selectedOfferId = card.dataset.offerId;
        renderSelected();
      });
    });
    renderSelected();
  }

  function requestToken(payload) {
    const email = String(payload.customer_email || "").trim().toLowerCase();
    const storageKey = `skyepay-store:idempotency:${state.clientSlug}:${state.selectedOfferId}:${email}`;
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

  async function submitCheckout(event) {
    event.preventDefault();
    const offer = selectedOffer();
    if (!offer) return setStatus("No offer selected", "Choose an item from the public catalog first.");
    const form = event.currentTarget;
    const button = $("#storeCheckoutBtn");
    if (!form.legal_acceptance?.checked) {
      setStatus("Legal acceptance required", "Please accept the Legal Skyes transaction terms before checkout.");
      form.legal_acceptance?.focus();
      return;
    }
    button.disabled = true;
    button.textContent = "Preparing secure lane...";
    setStatus("Creating checkout", "SkyePay is routing this offer through the FS27 payment gate.");
	    const payload = {
	      client_slug: state.clientSlug,
	      offer_id: offer.id,
      customer_name: form.customer_name.value,
      customer_email: form.customer_email.value,
      company_name: form.company_name.value || state.client?.company_name || "",
	      dry_run: state.dryRun,
	      ...legalAcceptancePayload(form, "skyepay-store")
	    };
	    if (isSkyeMailMailboxOffer(offer)) {
	      const localPart = normalizeMailboxLocalPart(form.mailbox_local_part?.value || "");
	      const domain = normalizeMailboxDomain(form.mailbox_domain?.value || "");
	      if (!/^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/.test(localPart) || !/^[a-z0-9][a-z0-9.-]*\.[a-z0-9-]{2,}$/.test(domain)) {
	        button.disabled = false;
	        button.textContent = "Open secure checkout";
	        setStatus("Mailbox address required", "Choose the exact SkyeMail address to provision after payment.");
	        form.mailbox_local_part?.focus();
	        return;
	      }
	      payload.mailbox_local_part = localPart;
	      payload.mailbox_domain = domain;
	      payload.mailbox_email = `${localPart}@${domain}`;
	    }
	    payload.idempotency_key = requestToken(payload);
    try {
      const data = await fetchJson("/skyepay/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!data.url) throw new Error("Checkout URL was not returned.");
      window.location.href = data.url;
    } catch (error) {
      button.disabled = false;
      button.textContent = "Open secure checkout";
      setStatus("Checkout needs attention", error.message || "SkyePay could not create the Checkout Session.");
    }
  }

  function mountMotionChrome() {
    const progress = $("#skypayProgress");
    const glow = $("#cursorGlow");
    window.addEventListener("scroll", () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (progress) progress.style.width = `${Math.min(100, Math.max(0, (window.scrollY / max) * 100))}%`;
    }, { passive: true });

    window.addEventListener("pointermove", (event) => {
      if (!glow || window.matchMedia("(max-width: 640px)").matches) return;
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    }, { passive: true });

    function mountAdvancedMotion() {
      const gsapApi = globalThis.SkyePayMotionStack?.gsap || globalThis.gsap;
      const ScrollTriggerApi = globalThis.SkyePayMotionStack?.ScrollTrigger || globalThis.ScrollTrigger;
      const Lenis = globalThis.SkyePayMotionStack?.Lenis || globalThis.Lenis;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (Lenis && !globalThis.__skypayStoreLenis) {
        globalThis.__skypayStoreLenis = new Lenis({ lerp: 0.16, wheelMultiplier: 0.85 });
        function raf(time) {
          globalThis.__skypayStoreLenis.raf(time);
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
        gsapApi.from(".store-hero-copy > *, .store-command-panel", {
          y: 24,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "opacity,transform"
        });
        gsapApi.utils.toArray(".store-group").forEach((section) => {
          gsapApi.from(section, {
            scrollTrigger: { trigger: section, start: "top 84%", end: "bottom 68%", scrub: 0.35 },
            opacity: 0.5,
            ease: "none",
            clearProps: "opacity"
          });
        });
      }
    }

    mountAdvancedMotion();
    globalThis.addEventListener("skyepay:motion-stack-ready", mountAdvancedMotion, { once: true });
    setTimeout(mountAdvancedMotion, 900);
  }

  async function init() {
    mountMotionChrome();
    $("#storeCheckoutForm")?.addEventListener("submit", submitCheckout);
    try {
      const data = await fetchJson(`/skyepay/offers?client=${encodeURIComponent(state.clientSlug)}`);
      state.client = data.client;
      state.offers = data.offers || [];
      if (!state.selectedOfferId) state.selectedOfferId = state.offers[0]?.id || "";
      $("#storeClientBadge").textContent = `${state.offers.length} SkyePay offers`;
      renderCatalog();
      setStatus("Store ready", "Choose an offer and open secure checkout.", false);
    } catch (error) {
      setStatus("Store needs the gate", error.message || "The SkyePay catalog is not reachable yet.");
    }
  }

  init();
})();
