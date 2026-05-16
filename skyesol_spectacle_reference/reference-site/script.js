(function () {
  const header = document.getElementById("siteHeader");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const motionToggle = document.getElementById("motionToggle");
  const canvas = document.getElementById("liquidField");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function syncHeader() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 36);
  }

  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.textContent = isOpen ? "Close" : "Menu";
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.textContent = "Menu";
      });
    });
  }

  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  const counters = document.querySelectorAll("[data-count]");
  const counterSeen = new WeakSet();

  function animateCounter(el) {
    const target = Number(el.getAttribute("data-count")) || 0;
    const suffix = target === 1099 ? "" : "";
    const start = performance.now();
    const duration = 1500;

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      el.textContent = current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !counterSeen.has(entry.target)) {
          counterSeen.add(entry.target);
          animateCounter(entry.target);
        }
      });
    }, { threshold: 0.45 });

    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach((counter) => {
      counter.textContent = Number(counter.getAttribute("data-count")).toLocaleString();
    });
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      const paused = document.body.classList.toggle("motion-paused");
      motionToggle.textContent = paused ? "Resume motion" : "Pause motion";
    });
  }

  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext("2d");
  const palette = [
    "rgba(201,168,76,",
    "rgba(138,99,255,",
    "rgba(39,242,255,"
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = Math.min(120, Math.max(58, Math.floor(width * height / 16000)));
    particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.34 + 0.12,
      s: Math.random() * 0.34 + 0.08,
      phase: Math.random() * Math.PI * 2,
      color: palette[i % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(0.5, colorB);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * 0.006) + time * speed) * amp;
      const n2 = Math.cos((x * 0.011) - time * speed * 0.7) * amp * 0.46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains("motion-paused")) {
      raf = requestAnimationFrame(animate);
      return;
    }

    const t = now * 0.001;
    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";

    drawWave(t, height * 0.28 + mouse.y * 12, "rgba(138,99,255,0)", "rgba(138,99,255,0.10)", 36, 0.34);
    drawWave(t, height * 0.54 - mouse.y * 10, "rgba(39,242,255,0)", "rgba(39,242,255,0.08)", 42, 0.24);
    drawWave(t, height * 0.82, "rgba(201,168,76,0)", "rgba(201,168,76,0.07)", 28, 0.28);

    particles.forEach((p) => {
      const px = p.x + Math.sin(t * p.s + p.phase) * 28 + mouse.x * 10;
      const py = p.y + Math.cos(t * p.s * 0.8 + p.phase) * 18 + mouse.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.a + ")";
      ctx.fill();
    });

    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    mouse.tx = (event.clientX / Math.max(width, 1) - 0.5) * 2;
    mouse.ty = (event.clientY / Math.max(height, 1) - 0.5) * 2;
  }, { passive: true });

  resize();
  raf = requestAnimationFrame(animate);

  window.addEventListener("pagehide", () => {
    if (raf) cancelAnimationFrame(raf);
  });
})();
