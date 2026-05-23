(() => {
  "use strict";

  const SKYEPAY_AI_URL = "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=brandforge-ai-generation";
  const pick = (id) => document.getElementById(id);
  const clean = (value, max = 1200) => String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);

  function collectCampaign() {
    return {
      headline: clean(pick("headline")?.value, 240),
      subline: clean(pick("subline")?.value, 420),
      cta: clean(pick("cta")?.value, 120),
      footer: clean(pick("footerText")?.value, 160),
      brand: clean(pick("contactBrand")?.value, 160),
      phone: clean(pick("contactPhone")?.value, 120),
      url: clean(pick("contactUrl")?.value, 240)
    };
  }

  function scoreCampaign(data) {
    const combined = `${data.headline} ${data.subline} ${data.cta} ${data.footer} ${data.brand}`.toLowerCase();
    const signals = {
      local: /\b(local|near me|neighborhood|valley|city|same day|mobile)\b/.test(combined),
      proof: /\b(proof|verified|trusted|receipt|before|after|licensed|insured|guarantee)\b/.test(combined),
      urgency: /\b(today|now|fast|urgent|limited|tonight|this week|instant)\b/.test(combined),
      premium: /\b(concierge|studio|premium|private|executive|bespoke|white glove)\b/.test(combined),
      hiring: /\b(hiring|jobs|career|apply|recruit|talent|interview)\b/.test(combined)
    };
    const words = combined.split(/\s+/).filter(Boolean);
    let score = 42;
    if (data.headline) score += 12;
    if (data.subline) score += 10;
    if (data.cta) score += 10;
    if (data.brand) score += 8;
    if (data.url || data.phone) score += 8;
    score += Object.values(signals).filter(Boolean).length * 4;
    if (words.length > 44) score -= 6;
    if (data.headline.length > 86) score -= 5;
    return {
      score: Math.max(0, Math.min(100, score)),
      signals,
      words: words.length
    };
  }

  function channelPlan(data, analysis) {
    const cta = data.cta || (analysis.signals.hiring ? "Apply now" : "Book now");
    const channels = analysis.signals.hiring
      ? ["local job boards", "SMS applicant follow-up", "short-form hiring creative"]
      : analysis.signals.local
        ? ["Google Business Profile", "neighborhood landing page", "SMS lead capture"]
        : ["landing page", "retargeting creative", "email follow-up"];
    return { cta, channels };
  }

  function buildLocalIntelligence(data = collectCampaign()) {
    const analysis = scoreCampaign(data);
    const plan = channelPlan(data, analysis);
    const missing = [];
    if (!data.brand) missing.push("brand");
    if (!data.headline) missing.push("headline");
    if (!data.cta) missing.push("cta");
    if (!data.url && !data.phone) missing.push("contact path");
    const angle = analysis.signals.hiring ? "recruiting" : analysis.signals.premium ? "premium service" : analysis.signals.local ? "local demand" : "direct response";
    return {
      ok: true,
      generated_by: "brandforge-local-intelligence",
      ai_generation: false,
      paid_generation_lane: SKYEPAY_AI_URL,
      score: analysis.score,
      angle,
      signals: analysis.signals,
      missing,
      channels: plan.channels,
      brief: {
        audience: analysis.signals.hiring ? "qualified candidates who need a quick next step" : "buyers ready to compare a real provider",
        promise: data.headline || `${data.brand || "This offer"} made clear`,
        proof: analysis.signals.proof ? "Proof language is already present." : "Add a receipt, result, guarantee, or real outcome before scaling spend.",
        next_copy: [
          `${data.headline || data.brand || "Your offer"} - ${data.subline || "clear value, fast next step"}`,
          `${data.brand || "BrandForge"}: ${plan.cta}`,
          `${analysis.score >= 75 ? "Scale" : "Tighten"} ${angle} creative around ${plan.channels[0]}.`
        ]
      }
    };
  }

  async function meter(eventType, payload = {}, usageLane = "brandforge-local-intelligence") {
    const headers = {
      "content-type": "application/json",
      "x-skye-usage-lane": usageLane,
      "x-skyepay-lane": usageLane.includes("ai") ? "brandforge-ai-generation" : "free99-core",
      "x-skye-platform": "brandforge",
      "x-free99-billing-mode": "free99",
      "x-brandforge-intelligence": "true"
    };
    const body = JSON.stringify({
      event_type: eventType,
      usage_lane: usageLane,
      platform_id: "brandforge",
      campaign: collectCampaign(),
      payload
    });
    try {
      const response = await fetch("/api/brandforge/intelligence/meter", { method: "POST", credentials: "same-origin", headers, body });
      return await response.json().catch(() => ({ ok: response.ok, status: response.status }));
    } catch (error) {
      return { ok: false, local_only: true, error: error?.message || String(error) };
    }
  }

  function paidEmail() {
    return clean(pick("brandforgePaidEmail")?.value, 254).toLowerCase();
  }

  function writeStatus(output, html) {
    if (output) output.innerHTML = html;
  }

  function injectStyle() {
    if (document.getElementById("brandforgeIntelligenceStyle")) return;
    const style = document.createElement("style");
    style.id = "brandforgeIntelligenceStyle";
    style.textContent = ".brandforge-intel-output{display:grid;gap:10px}.brandforge-intel-score{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px;background:rgba(255,255,255,.05)}.brandforge-intel-score strong{font-size:28px}.brandforge-intel-pill{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 8px;margin:3px 4px 0 0;color:#ffd074;font-size:11px}.brandforge-intel-actions{display:flex;flex-wrap:wrap;gap:8px}.brandforge-intel-actions button,.brandforge-intel-actions a{border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(255,255,255,.07);color:#fff;padding:9px 10px;text-decoration:none;font-weight:800;cursor:pointer}.brandforge-intel-actions .primary{background:#ffd074;color:#15120a;border-color:#ffd074}.brandforge-intel-actions .paid{background:#ff7a66;color:#160908;border-color:#ff7a66}.brandforge-intel-small{color:#a7b0bf;font-size:12px;line-height:1.45}.brandforge-intel-list{margin:0;padding-left:18px;color:#d7dde7;line-height:1.45}.brandforge-intel-pay{display:grid;grid-template-columns:minmax(0,1fr) max-content;gap:8px;align-items:center}.brandforge-intel-pay input{min-width:0;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.06);color:#fff;padding:10px;font:inherit}.brandforge-intel-result{display:grid;gap:8px;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px;background:rgba(255,255,255,.04)}";
    document.head.appendChild(style);
  }

  function renderOutput(root, result, meterResult) {
    const signalNames = Object.entries(result.signals).filter(([, active]) => active).map(([name]) => name);
    const missing = result.missing.length ? result.missing.join(", ") : "ready";
    root.innerHTML = `
      <div class="brandforge-intel-score"><span>Campaign score</span><strong>${result.score}</strong></div>
      <div><span class="brandforge-intel-pill">${result.angle}</span>${signalNames.map((name) => `<span class="brandforge-intel-pill">${name}</span>`).join("")}</div>
      <p class="brandforge-intel-small"><strong>Gap check:</strong> ${missing}</p>
      <ul class="brandforge-intel-list">
        ${result.channels.map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <p class="brandforge-intel-small">${result.brief.proof}</p>
      <p class="brandforge-intel-small"><strong>Meter:</strong> ${meterResult?.ok ? "recorded" : "local receipt pending gate API"}</p>
    `;
  }

  async function runAnalysis(output) {
    const result = buildLocalIntelligence();
    renderOutput(output, result, await meter("brandforge.local_intelligence_ran", { score: result.score, angle: result.angle }));
    return result;
  }

  async function runBrief(output) {
    const local = buildLocalIntelligence();
    try {
      const response = await fetch("/api/brandforge/intelligence/brief", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-skye-platform": "brandforge",
          "x-skye-usage-lane": "brandforge-brief",
          "x-free99-billing-mode": "free99",
          "x-brandforge-intelligence": "true"
        },
        body: JSON.stringify({ campaign: collectCampaign(), local })
      });
      const data = await response.json();
      renderOutput(output, data.local || local, data.meter || { ok: response.ok });
    } catch {
      renderOutput(output, local, await meter("brandforge.local_brief_fallback", { score: local.score }, "brandforge-brief"));
    }
    return local;
  }

  function renderPaidResult(output, data) {
    const result = data.result || {};
    const chunks = [];
    if (Array.isArray(result.campaign_copy)) chunks.push(`<p><strong>Copy:</strong> ${result.campaign_copy.slice(0, 2).map((item) => clean(typeof item === "string" ? item : JSON.stringify(item), 320)).join(" / ")}</p>`);
    if (Array.isArray(result.proof_plan)) chunks.push(`<p><strong>Proof:</strong> ${result.proof_plan.map((item) => clean(item, 180)).join("; ")}</p>`);
    if (result.operator_notes) chunks.push(`<p><strong>Operator:</strong> ${Array.isArray(result.operator_notes) ? result.operator_notes.map((item) => clean(item, 160)).join("; ") : clean(result.operator_notes, 320)}</p>`);
    writeStatus(output, `
      <div class="brandforge-intel-result">
        <p class="brandforge-intel-small"><strong>Paid AI:</strong> generated · ${clean(data.provider_path || "provider", 80)} · receipt ${clean(data.receipt_id, 80)}</p>
        ${chunks.join("") || `<p class="brandforge-intel-small">${clean(data.output_text, 900)}</p>`}
      </div>
    `);
  }

  async function createPaidCheckout(output) {
    const email = paidEmail();
    if (!email) {
      writeStatus(output, `<p class="brandforge-intel-small"><strong>Email required:</strong> enter a checkout email for the SkyPay lane.</p>`);
      return null;
    }
    await meter("brandforge.ai_generation_checkout_requested", { checkout_url: SKYEPAY_AI_URL }, "brandforge-ai-generation");
    const response = await fetch("/api/brandforge/checkout/create", {
      method: "POST",
      credentials: "same-origin",
      headers: {"content-type": "application/json", "x-skye-platform": "brandforge", "x-skye-usage-lane": "brandforge-ai-generation", "x-free99-billing-mode": "paid-skyepay"},
      body: JSON.stringify({ customer_email: email, campaign: collectCampaign() })
    });
    const data = await response.json().catch(() => ({ ok: false, error: "checkout_response_unreadable" }));
    if (response.ok && data.checkout?.url) {
      writeStatus(output, `<p class="brandforge-intel-small"><strong>Checkout created:</strong> opening SkyPay. Return here after payment to claim the AI lane.</p>`);
      window.location.href = data.checkout.url;
      return data;
    }
    writeStatus(output, `<p class="brandforge-intel-small"><strong>Checkout error:</strong> ${clean(data.error || "SkyPay did not return a checkout URL.", 260)}</p>`);
    return data;
  }

  async function claimPaidEntitlement(output, sessionId = "") {
    const id = clean(sessionId || new URLSearchParams(window.location.search).get("session_id"), 220);
    if (!id) {
      writeStatus(output, `<p class="brandforge-intel-small"><strong>No checkout session:</strong> complete SkyPay checkout first, then claim the return session.</p>`);
      return null;
    }
    const response = await fetch("/api/brandforge/checkout/claim", {
      method: "POST",
      credentials: "same-origin",
      headers: {"content-type": "application/json", "x-skye-platform": "brandforge", "x-skye-usage-lane": "brandforge-ai-generation", "x-free99-billing-mode": "paid-skyepay"},
      body: JSON.stringify({ session_id: id })
    });
    const data = await response.json().catch(() => ({ ok: false, error: "claim_response_unreadable" }));
    if (data.ok) writeStatus(output, `<p class="brandforge-intel-small"><strong>AI lane unlocked:</strong> entitlement claimed for BrandForge paid generation.</p>`);
    else writeStatus(output, `<p class="brandforge-intel-small"><strong>Claim blocked:</strong> ${clean(data.message || data.error || "SkyPay has not confirmed this payment yet.", 320)}</p>`);
    return data;
  }

  async function runPaidGeneration(output) {
    writeStatus(output, `<p class="brandforge-intel-small">Running paid AI generation...</p>`);
    const response = await fetch("/api/brandforge/ai/generate", {
      method: "POST",
      credentials: "same-origin",
      headers: {"content-type": "application/json", "x-skye-platform": "brandforge", "x-skye-usage-lane": "brandforge-ai-generation", "x-free99-billing-mode": "paid-skyepay"},
      body: JSON.stringify({ campaign: collectCampaign(), local: buildLocalIntelligence() })
    });
    const data = await response.json().catch(() => ({ ok: false, error: "paid_generation_response_unreadable" }));
    if (data.ok) renderPaidResult(output, data);
    else if (data.checkout_required) writeStatus(output, `<p class="brandforge-intel-small"><strong>Paid AI locked:</strong> use SkyPay checkout, then claim the returned session.</p>`);
    else writeStatus(output, `<p class="brandforge-intel-small"><strong>Paid AI error:</strong> ${clean(data.message || data.error || "generation failed", 320)}</p>`);
    return data;
  }

  async function openPaidLane(output) {
    return runPaidGeneration(output);
  }

  function mountPanel() {
    if (document.getElementById("brandforgeIntelligence")) return;
    injectStyle();
    const rail = document.querySelector(".rail.right") || document.body;
    const panel = document.createElement("section");
    panel.className = "card";
    panel.id = "brandforgeIntelligence";
    panel.innerHTML = `
      <div class="cardHead"><h2>Intelligence</h2><span>metered</span></div>
      <div class="cardBody brandforge-intel-output">
        <div class="brandforge-intel-pay">
          <input id="brandforgePaidEmail" type="email" autocomplete="email" placeholder="checkout email">
          <button type="button" data-intel-action="checkout">Checkout</button>
        </div>
        <div class="brandforge-intel-actions">
          <button class="primary" type="button" data-intel-action="analyze">Analyze</button>
          <button type="button" data-intel-action="brief">Build Brief</button>
          <button type="button" data-intel-action="claim">Claim</button>
          <button class="paid" type="button" data-intel-action="paid">Generate AI</button>
        </div>
        <div id="brandforgeIntelligenceOutput" class="brandforge-intel-small">Local strategy scoring is ready.</div>
      </div>
    `;
    const proof = [...rail.querySelectorAll("section")].find((node) => /Proof Console/i.test(node.textContent || ""));
    rail.insertBefore(panel, proof || rail.firstChild);
    const output = panel.querySelector("#brandforgeIntelligenceOutput");
    panel.querySelector('[data-intel-action="analyze"]')?.addEventListener("click", () => runAnalysis(output));
    panel.querySelector('[data-intel-action="brief"]')?.addEventListener("click", () => runBrief(output));
    panel.querySelector('[data-intel-action="checkout"]')?.addEventListener("click", () => createPaidCheckout(output));
    panel.querySelector('[data-intel-action="claim"]')?.addEventListener("click", () => claimPaidEntitlement(output));
    panel.querySelector('[data-intel-action="paid"]')?.addEventListener("click", () => openPaidLane(output));
    const returnedSession = new URLSearchParams(window.location.search).get("session_id");
    if (returnedSession) claimPaidEntitlement(output, returnedSession);
    meter("brandforge.intelligence_panel_mounted", {}, "brandforge-local-intelligence");
  }

  window.BrandForgeIntelligence = { collectCampaign, analyze: buildLocalIntelligence, meter, openPaidLane, createPaidCheckout, claimPaidEntitlement, runPaidGeneration };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountPanel, { once: true });
  else mountPanel();
})();

// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js
