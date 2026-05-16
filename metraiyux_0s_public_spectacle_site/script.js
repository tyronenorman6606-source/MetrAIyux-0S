const fullWebsiteUrl = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/";
const publicOverviewUrl = "https://metraiyux-0s-public-spectacle.pages.dev/";

function setupMenu() {
  const button = document.querySelector("[data-menu-button]");
  const links = document.querySelector("[data-nav-links]");
  if (!button || !links) return;
  button.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  items.forEach((item) => observer.observe(item));
}

function setupPointerGlow() {
  if (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const glow = document.createElement("div");
  glow.className = "pointer-glow cursor-trail";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  let targetX = -120;
  let targetY = -120;
  let currentX = targetX;
  let currentY = targetY;
  let visible = false;

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX - 17;
    targetY = event.clientY - 17;
    visible = true;
    glow.style.opacity = "1";
  });

  window.addEventListener("pointerleave", () => {
    visible = false;
    glow.style.opacity = "0";
  });

  function frame() {
    currentX += (targetX - currentX) * 0.34;
    currentY += (targetY - currentY) * 0.34;
    glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    if (!visible) glow.style.opacity = "0";
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function setupCommandCanvas() {
  const canvas = document.querySelector(".command-canvas");
  if (!canvas || !canvas.getContext) return;
  const context = canvas.getContext("2d");
  const particles = Array.from({ length: 72 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    speed: 0.00045 + Math.random() * 0.0007,
    phase: index * 0.72,
    color: index % 5 === 0 ? "#f8cb5e" : index % 3 === 0 ? "#a88cff" : "#64d9ff"
  }));

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;

    particles.forEach((particle, index) => {
      particle.y -= particle.speed * 2.4;
      if (particle.y < -0.08) particle.y = 1.08;
      const x = particle.x * width + Math.sin(time * 0.00045 + particle.phase) * 26;
      const y = particle.y * height;

      context.beginPath();
      context.arc(x, y, index % 7 === 0 ? 2.1 : 1.2, 0, Math.PI * 2);
      context.fillStyle = particle.color;
      context.globalAlpha = index % 5 === 0 ? 0.72 : 0.46;
      context.fill();

      const next = particles[(index + 9) % particles.length];
      const nx = next.x * width;
      const ny = next.y * height;
      const distance = Math.hypot(nx - x, ny - y);
      if (distance < 180) {
        context.globalAlpha = Math.max(0, 0.2 - distance / 900);
        context.strokeStyle = particle.color;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(nx, ny);
        context.stroke();
      }
    });

    context.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

function setupCommandTabs() {
  const buttons = Array.from(document.querySelectorAll("[data-command-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-command-panel]"));
  const title = document.querySelector("[data-command-title]");
  if (!buttons.length || !panels.length) return;

  const titles = {
    route: "Prospect route opened",
    gate: "SkyeGateFS27 bridge",
    brains: "Sixteen-brain routing",
    proof: "Live proof ledger"
  };

  function activate(tab) {
    buttons.forEach((button) => {
      const active = button.dataset.commandTab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.commandPanel !== tab;
    });
    if (title) title.textContent = titles[tab] || "Command surface";
  }

  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
    button.addEventListener("click", () => activate(button.dataset.commandTab));
  });
}

function setupGuidedTour() {
  const tour = document.querySelector("[data-guided-tour]");
  if (!tour) return;

  const buttons = Array.from(tour.querySelectorAll("[data-tour-jump]"));
  const cards = Array.from(tour.querySelectorAll("[data-tour-card]"));
  const nodes = Array.from(tour.querySelectorAll("[data-tour-node]"));
  const progress = tour.querySelector("[data-tour-progress]");
  const previous = tour.querySelector("[data-tour-prev]");
  const next = tour.querySelector("[data-tour-next]");
  const route = tour.querySelector("[data-tour-route]");
  let activeIndex = 0;

  function updateTour(index) {
    activeIndex = Math.max(0, Math.min(index, cards.length - 1));

    cards.forEach((card, cardIndex) => {
      card.classList.toggle("is-active", cardIndex === activeIndex);
    });

    buttons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === activeIndex;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    nodes.forEach((node, nodeIndex) => {
      node.classList.toggle("is-active", nodeIndex === activeIndex);
    });

    if (progress) {
      progress.style.width = `${((activeIndex + 1) / cards.length) * 100}%`;
    }

    if (previous) {
      previous.disabled = activeIndex === 0;
    }

    if (next) {
      next.textContent = activeIndex === cards.length - 1 ? "Finish at Fit Check" : "Continue Tour";
    }

    if (route) {
      const card = cards[activeIndex];
      route.href = card.dataset.route || "fit-check.html";
      route.textContent = card.dataset.routeLabel || "Open Related Page";
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      updateTour(Number(button.dataset.tourJump || 0));
    });
  });

  if (previous) {
    previous.addEventListener("click", () => updateTour(activeIndex - 1));
  }

  if (next) {
    next.addEventListener("click", () => {
      if (activeIndex === cards.length - 1) {
        window.location.href = "fit-check.html";
        return;
      }
      updateTour(activeIndex + 1);
    });
  }

  tour.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") updateTour(activeIndex + 1);
    if (event.key === "ArrowLeft") updateTour(activeIndex - 1);
  });

  updateTour(0);
}

function getFitProfile(score) {
  if (score >= 24) {
    return {
      level: "High fit: I would show you the full command deck",
      next: "I would route you to the full MetrAIyux 0S website and talk through admin command, customer workspaces, proof, and automation gates.",
      href: fullWebsiteUrl
    };
  }
  if (score >= 16) {
    return {
      level: "Strong fit: I would start you in phases",
      next: "I would start with the live public tour, then evaluate the full website for phased deployment.",
      href: `${fullWebsiteUrl}saas/`
    };
  }
  if (score >= 9) {
    return {
      level: "Early fit: I would clean the operating map first",
      next: "I would use the public overview as a planning tool and consider the command system after process cleanup, service mapping, and approval design.",
      href: "guided-tour.html"
    };
  }
  return {
    level: "Not urgent yet: I would not force this",
    next: "I would document the company’s process before putting a full command system on top.",
    href: "value.html"
  };
}

function scoreFit() {
  const form = document.querySelector("#fitForm");
  const box = document.querySelector("#fitResult");
  if (!form || !box) return;

  const answers = {};
  let score = 0;
  new FormData(form).forEach((value, key) => {
    answers[key] = value;
    score += Number(value) || 0;
  });

  const profile = getFitProfile(score);
  const report = {
    platform: "MetrAIyux 0S",
    score,
    level: profile.level,
    recommendation: profile.next,
    answers,
    routedTo: profile.href,
    generatedAt: new Date().toISOString()
  };

  box.style.display = "block";
  box.innerHTML = `
    <p class="eyebrow">Fit result</p>
    <h2>${profile.level}</h2>
    <p class="body-copy">${profile.next}</p>
    <p><strong>Fit score:</strong> ${score}/30</p>
    <textarea readonly aria-label="Fit report JSON">${JSON.stringify(report, null, 2)}</textarea>
    <div class="cta-row">
      <button class="button" type="button" data-copy-fit>Copy Fit Report</button>
      <a class="button secondary" href="${profile.href}">Continue Route</a>
      <a class="button secondary" href="mailto:hello@skyesoverlondon.com?subject=MetrAIyux%200S%20Fit%20Report">Send Inquiry</a>
    </div>
  `;

  const copy = box.querySelector("[data-copy-fit]");
  if (copy) {
    copy.addEventListener("click", async () => {
      const text = box.querySelector("textarea").value;
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = "Copied";
      } catch {
        box.querySelector("textarea").select();
      }
    });
  }

  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildBriefObject() {
  return {
    platform: "MetrAIyux 0S",
    publicOverviewUrl,
    fullWebsiteUrl,
    publicPositioning: "I built this public overview for a founder-controlled company operating system with admin command, customer SaaS workspaces, proof receipts, approval gates, and a 16-brain operating model.",
    coreCapabilities: [
      "Public buyer education and live fit routing",
      "Customer signup, onboarding, service selection, and workspace paths",
      "Owner/admin command layer kept separate from public pages",
      "Local brain library for cabinet-style routing and company doctrine",
      "0meg4kAI security and QA review role for tenant isolation",
      "Proof vault, approval records, smoke-test receipts, and audit posture",
      "Cloudflare edge architecture for Workers, Pages, D1, KV, Queues, and email approval workflows"
    ],
    publicBoundary: "Private implementation setup, owner controls, customer records, and internal operator runbooks are not published on the public overview site.",
    generatedAt: new Date().toISOString()
  };
}

function exportBrief() {
  const data = buildBriefObject();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "metraiyux-0s-public-brief.json";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function previewBrief() {
  const box = document.querySelector("#briefPreview");
  if (!box) return;
  box.value = JSON.stringify(buildBriefObject(), null, 2);
}

function setupProofPlayer() {
  const shell = document.querySelector("[data-proof-player]");
  if (!shell) return;

  const video = shell.querySelector("[data-proof-video]");
  const timeline = shell.querySelector("[data-proof-timeline]");
  const current = shell.querySelector("[data-proof-current]");
  const duration = shell.querySelector("[data-proof-duration]");
  const toggle = shell.querySelector("[data-proof-toggle]");
  const restart = shell.querySelector("[data-proof-restart]");
  const speed = shell.querySelector("[data-proof-speed]");
  if (!video || !timeline) return;

  const formatTime = (seconds) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  function sync() {
    const max = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 100;
    timeline.max = String(max);
    timeline.value = String(Math.min(video.currentTime || 0, max));
    if (current) current.textContent = formatTime(video.currentTime);
    if (duration) duration.textContent = formatTime(max);
    if (toggle) toggle.textContent = video.paused ? "Play" : "Pause";
  }

  shell.querySelectorAll("[data-proof-skip]").forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.proofSkip || 0);
      const max = Number.isFinite(video.duration) ? video.duration : video.currentTime + delta;
      video.currentTime = Math.max(0, Math.min(max, video.currentTime + delta));
      sync();
    });
  });

  if (toggle) {
    toggle.addEventListener("click", async () => {
      if (video.paused) {
        await video.play().catch(() => {});
      } else {
        video.pause();
      }
      sync();
    });
  }

  if (restart) {
    restart.addEventListener("click", async () => {
      video.currentTime = 0;
      await video.play().catch(() => {});
      sync();
    });
  }

  if (speed) {
    speed.addEventListener("change", () => {
      video.playbackRate = Number(speed.value) || 1;
    });
  }

  timeline.addEventListener("input", () => {
    video.currentTime = Number(timeline.value) || 0;
    sync();
  });

  video.addEventListener("loadedmetadata", sync);
  video.addEventListener("timeupdate", sync);
  video.addEventListener("play", sync);
  video.addEventListener("pause", sync);
  sync();
}

document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  setupReveal();
  setupPointerGlow();
  setupCommandCanvas();
  setupCommandTabs();
  setupGuidedTour();
  setupProofPlayer();
  previewBrief();
});
