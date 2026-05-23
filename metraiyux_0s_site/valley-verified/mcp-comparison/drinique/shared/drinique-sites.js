const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function setupForms() {
  document.querySelectorAll("[data-preview-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const submit = form.querySelector("[type='submit']");
      if (submit) submit.textContent = "Request staged";
      showToast("Preview request staged locally. Production can connect through Valley Verified.");
      window.setTimeout(() => {
        form.reset();
        if (submit) submit.textContent = submit.dataset.label || "Send preview request";
      }, 700);
    });
  });
}

function setupCopyButtons() {
  document.querySelectorAll("[data-copy-current]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Live preview link copied.");
      } catch {
        showToast("Copy blocked by browser settings.");
      }
    });
  });
}

function setupKineticTitles() {
  document.querySelectorAll("[data-kinetic-title]").forEach((title) => {
    const text = title.textContent.trim();
    title.textContent = "";
    title.classList.add("kinetic-title");
    [...text].forEach((char, index) => {
      const span = document.createElement("span");
      span.className = "wm-char";
      span.style.animationDelay = `${index * 34}ms`;
      span.textContent = char === " " ? "\u00a0" : char;
      title.appendChild(span);
    });
  });
}

function sizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, dpr };
}

function drawComparisonScene(ctx, width, height, time) {
  ctx.fillStyle = "#090908";
  ctx.fillRect(0, 0, width, height);
  const panels = [
    { x: 0.18, y: 0.48, w: 0.22, h: 0.38, c: "#f6efdf", a: "#0d6b5f" },
    { x: 0.5, y: 0.44, w: 0.25, h: 0.46, c: "#b47dff", a: "#ff6b35" },
    { x: 0.82, y: 0.5, w: 0.24, h: 0.4, c: "#d9aa55", a: "#7dd3fc" },
  ];
  panels.forEach((panel, index) => {
    const x = width * panel.x;
    const y = height * panel.y + Math.sin(time * 0.0008 + index) * height * 0.025;
    const w = width * panel.w;
    const h = height * panel.h;
    ctx.fillStyle = "rgba(0,0,0,0.36)";
    ctx.fillRect(x - w / 2 + 22, y - h / 2 + 26, w, h);
    const grad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    grad.addColorStop(0, panel.c);
    grad.addColorStop(1, panel.a);
    ctx.fillStyle = grad;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = "rgba(9,9,8,0.72)";
    ctx.fillRect(x - w / 2 + w * 0.12, y - h / 2 + h * 0.16, w * 0.76, h * 0.08);
    ctx.fillRect(x - w / 2 + w * 0.12, y - h / 2 + h * 0.32, w * 0.5, h * 0.06);
    ctx.fillRect(x - w / 2 + w * 0.12, y + h * 0.22, w * 0.62, h * 0.1);
  });
}

function drawTableScene(ctx, width, height, time) {
  ctx.fillStyle = "#f6efdf";
  ctx.fillRect(0, 0, width, height);
  const wood = ctx.createLinearGradient(0, 0, width, height);
  wood.addColorStop(0, "#ead8b6");
  wood.addColorStop(0.55, "#9d6a42");
  wood.addColorStop(1, "#23140d");
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(23, 21, 18, 0.18)";
  ctx.lineWidth = Math.max(2, width * 0.003);
  for (let x = -width * 0.1; x < width * 1.2; x += width * 0.09) {
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(time * 0.0005 + x) * 8, 0);
    ctx.lineTo(x - width * 0.16, height);
    ctx.stroke();
  }
  const cx = width * 0.64;
  const cy = height * 0.5;
  const r = Math.min(width, height) * 0.25;
  ctx.fillStyle = "#fff4dd";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(23, 21, 18, 0.18)";
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#0d6b5f";
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.12, cy + r * 0.04, r * 0.48, r * 0.18, -0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c3522f";
  for (let i = 0; i < 9; i += 1) {
    const angle = i * 0.7 + time * 0.0002;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * r * 0.48, cy + Math.sin(angle) * r * 0.34, r * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(9,9,8,0.42)";
  ctx.fillRect(width * 0.1, height * 0.18, width * 0.11, height * 0.58);
  ctx.fillStyle = "rgba(255,244,221,0.72)";
  ctx.fillRect(width * 0.115, height * 0.2, width * 0.08, height * 0.54);
}

function drawForgeScene(ctx, width, height, time) {
  const raw = document.documentElement.getAttribute("data-forge-mode") === "raw";
  const palette = raw
    ? ["#ff6b35", "#b47dff", "#f4c75b", "#8ff0a4", "#fff8ee"]
    : ["#b47dff", "#7dd3fc", "#ff6b35", "#8ff0a4", "#eef0ff"];
  ctx.fillStyle = raw ? "#090206" : "#04030a";
  ctx.fillRect(0, 0, width, height);
  const bands = prefersReducedMotion ? 5 : 11;
  for (let i = 0; i < bands; i += 1) {
    const y = height * (0.12 + i * 0.085) + Math.sin(time * 0.001 + i) * height * 0.05;
    const grad = ctx.createLinearGradient(0, y - 90, width, y + 90);
    grad.addColorStop(0, `${palette[i % palette.length]}00`);
    grad.addColorStop(0.48, `${palette[i % palette.length]}cc`);
    grad.addColorStop(1, `${palette[(i + 2) % palette.length]}00`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(22, height * 0.052);
    ctx.beginPath();
    ctx.moveTo(-width * 0.08, y);
    ctx.bezierCurveTo(width * 0.22, y - 130, width * 0.48, y + 150, width * 1.08, y - 30);
    ctx.stroke();
  }
  for (let i = 0; i < 52; i += 1) {
    const angle = i * 0.58 + time * 0.00035;
    const radius = Math.min(width, height) * (0.14 + (i % 9) * 0.026);
    const x = width * 0.64 + Math.cos(angle) * radius;
    const y = height * 0.46 + Math.sin(angle * 1.4) * radius * 0.72;
    ctx.fillStyle = `${palette[i % palette.length]}aa`;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 5), 0, Math.PI * 2);
    ctx.fill();
  }
}

function setupCanvases() {
  const canvases = [...document.querySelectorAll(".scene-canvas")];
  if (!canvases.length) return;
  let raf = 0;
  const render = (time) => {
    canvases.forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      const { width, height } = sizeCanvas(canvas);
      const scene = canvas.dataset.scene || "table";
      if (scene === "forge") drawForgeScene(ctx, width, height, time);
      else if (scene === "comparison") drawComparisonScene(ctx, width, height, time);
      else drawTableScene(ctx, width, height, time);
    });
    if (!prefersReducedMotion) raf = window.requestAnimationFrame(render);
  };
  render(0);
  if (!prefersReducedMotion) raf = window.requestAnimationFrame(render);
  window.addEventListener("resize", () => {
    if (prefersReducedMotion) render(0);
  });
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(raf));
}

function setupSkrucibleMode() {
  const button = document.querySelector("[data-mode-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-forge-mode") === "raw" ? "refined" : "raw";
    document.documentElement.setAttribute("data-forge-mode", next);
    button.querySelector("span").textContent = next === "raw" ? "Raw" : "Refined";
    showToast(`SKRUCIBLE ${next} mode active.`);
  });
}

function setupForgeScroll() {
  const chapters = [...document.querySelectorAll(".forge-chapter")];
  if (!chapters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("active", entry.isIntersecting));
  }, { threshold: 0.3 });
  chapters.forEach((chapter) => observer.observe(chapter));
}

const roomContent = {
  host: {
    label: "Host stand",
    tag: "01 / Host stand",
    title: "The first real conversion desk.",
    text: "Merser makes the visitor enter through the same object a diner expects in the restaurant. Calls, wait time, and table requests start at the host stand.",
    bullets: ["Call path stays first.", "Table request stays practical.", "Owner claim path stays outside invented business claims."],
    actions: [["Call host stand", "tel:+14806886934"], ["Request table", "#request-room"]],
  },
  bar: {
    label: "Bar rail",
    tag: "02 / Bar rail",
    title: "Group service lives at the rail.",
    text: "The bar side handles group inquiry, drink-service language, and event-ready routing without pretending to know an unverified menu.",
    bullets: ["Group intent becomes a route, not a generic form.", "Bar and event language stays source-safe.", "Follow-up can connect through Valley Verified."],
    actions: [["Start group request", "#routes"], ["Source listing", "https://business.phoenixchamber.com/list/ql/restaurants-food-beverages-22"]],
  },
  table: {
    label: "Table zone",
    tag: "03 / Table zone",
    title: "The table is the request surface.",
    text: "Instead of a normal card stack, the table zone becomes the working surface for party size, date, time, and callback notes.",
    bullets: ["Diner route opens fast.", "The form is visibly tied to the table.", "No fake cuisine or hours are invented."],
    actions: [["Request table", "#request-room"], ["Base site", "../base/"]],
  },
  menu: {
    label: "Menu wall",
    tag: "04 / Menu wall",
    title: "Menu wall stays honest.",
    text: "This wall is prepared for owner-confirmed menu details. Until then it only shows the safe actions: call, table, bar.",
    bullets: ["No fabricated dishes.", "Owner-confirmed details can replace placeholders.", "The page still converts through call and request routes."],
    actions: [["Claim listing", "/valley-verified/claim/?business=drinique-phoenix-restaurant-food-service-419ae8c"]],
  },
  proof: {
    label: "Proof mirror",
    tag: "05 / Proof mirror",
    title: "Proof is visible in the room.",
    text: "The mirror is the Valley Verified boundary: source, claim route, and production receipt are attached to what the page says.",
    bullets: ["Merser room contract used.", "No app-specific password added.", "Claim and profile paths route to the canonical 0S Valley lane."],
    actions: [["Open source room", "https://merser.pages.dev/source-packs/skye_real_worldsite_full_room_pack_v3/barbershop_chair_room_world.html"], ["Valley profile", "/valley-verified/business/drinique-phoenix-restaurant-food-service-419ae8c/"]],
  },
  source: {
    label: "Source door",
    tag: "06 / Source door",
    title: "Door back to Merser source pack.",
    text: "The room was rebuilt from the Merser barbershop world contract: physical anchor, hotspots, drawer panels, scroll camera, and zoom.",
    bullets: ["Source pack: real-room-pack.", "Room id: barbershop.", "Adapted from chair-world service grammar to restaurant host-room grammar."],
    actions: [["Open Merser", "https://merser.pages.dev/"], ["Comparison hub", "../"]],
  },
};

function setupMerserRoom() {
  const world = document.querySelector("[data-merser-world]");
  const camera = document.querySelector("[data-room-camera]");
  if (!world || !camera) return;

  const roomHero = world.closest(".room-hero");
  const drawer = document.querySelector("[data-room-drawer]");
  const drawerTag = drawer?.querySelector("[data-drawer-tag]");
  const drawerTitle = drawer?.querySelector("[data-drawer-title]");
  const drawerText = drawer?.querySelector("[data-drawer-text]");
  const drawerList = drawer?.querySelector("[data-drawer-list]");
  const drawerActions = drawer?.querySelector("[data-drawer-actions]");
  const depth = document.querySelector("[data-depth-meter]");
  const controls = [...document.querySelectorAll("[data-room-focus]")];
  const state = { x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 0.62, manualX: 0, manualY: 0, manualZoom: 1, dragging: false, lastX: 0, lastY: 0, active: "host" };
  const focusMap = {
    host: [420, 120, 0.84],
    bar: [-410, 80, 0.8],
    table: [0, -220, 0.86],
    menu: [-430, 290, 0.88],
    proof: [0, 300, 0.76],
    source: [-620, 40, 0.72],
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const baseZoom = () => (window.innerWidth < 560 ? 0.34 : window.innerWidth < 920 ? 0.42 : 0.62);
  const roomScale = () => (window.innerWidth < 560 ? 0.58 : window.innerWidth < 920 ? 0.72 : 1);

  function closeDrawerPastHero() {
    if (drawer && roomHero && window.scrollY > roomHero.offsetTop + roomHero.offsetHeight - 120) {
      drawer.classList.remove("open");
    }
  }

  function setActiveControl(id) {
    controls.forEach((control) => control.classList.toggle("is-active", control.dataset.roomFocus === id));
  }

  function openDrawer(id) {
    const content = roomContent[id];
    if (!content || !drawer) return;
    state.active = id;
    setActiveControl(id);
    drawerTag.textContent = content.tag;
    drawerTitle.textContent = content.title;
    drawerText.textContent = content.text;
    drawerList.innerHTML = "";
    drawerActions.innerHTML = "";
    content.bullets.forEach((bullet) => {
      const li = document.createElement("li");
      li.textContent = bullet;
      drawerList.appendChild(li);
    });
    content.actions.forEach(([label, href], index) => {
      const link = document.createElement("a");
      link.className = index === 0 ? "btn primary" : "btn";
      link.href = href;
      link.textContent = label;
      if (href.startsWith("http")) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      drawerActions.appendChild(link);
    });
    drawer.classList.add("open");
    showToast(content.label);
  }

  function focusRoom(id, show = true) {
    const next = focusMap[id] || focusMap.host;
    state.manualX = next[0];
    state.manualY = next[1];
    state.manualZoom = (next[2] * roomScale()) / baseZoom();
    state.active = id;
    setActiveControl(id);
    if (show) openDrawer(id);
  }

  function updateTargets() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const progress = clamp(window.scrollY / max, 0, 1);
    if (depth) depth.style.width = `${Math.round(progress * 100)}%`;
    closeDrawerPastHero();
    const scrollX = Math.sin(progress * Math.PI * 1.5) * 180;
    const scrollY = -progress * 120;
    state.targetX = scrollX + state.manualX;
    state.targetY = scrollY + state.manualY;
    state.targetZoom = clamp(baseZoom() * state.manualZoom + progress * 0.08 * roomScale(), 0.3, 1.18);
  }

  function render() {
    updateTargets();
    state.x += (state.targetX - state.x) * 0.09;
    state.y += (state.targetY - state.y) * 0.09;
    state.zoom += (state.targetZoom - state.zoom) * 0.08;
    camera.style.transform = `translate3d(calc(-50% + ${state.x.toFixed(2)}px), calc(-50% + ${state.y.toFixed(2)}px), 0) scale(${state.zoom.toFixed(4)})`;
    window.requestAnimationFrame(render);
  }

  controls.forEach((button) => {
    button.addEventListener("click", () => focusRoom(button.dataset.roomFocus || "host"));
  });
  document.querySelectorAll("[data-hotspot]").forEach((button) => {
    button.addEventListener("click", () => focusRoom(button.dataset.hotspot || "host"));
  });
  document.querySelector("[data-drawer-close]")?.addEventListener("click", () => drawer?.classList.remove("open"));
  document.querySelector("[data-zoom-in]")?.addEventListener("click", () => {
    state.manualZoom = clamp(state.manualZoom + 0.12, 0.55, 1.72);
  });
  document.querySelector("[data-zoom-out]")?.addEventListener("click", () => {
    state.manualZoom = clamp(state.manualZoom - 0.12, 0.55, 1.72);
  });
  document.querySelector("[data-zoom-reset]")?.addEventListener("click", () => {
    state.manualX = 0;
    state.manualY = 0;
    state.manualZoom = 1;
    drawer?.classList.remove("open");
    setActiveControl("host");
  });

  world.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    world.classList.add("is-dragging");
    world.setPointerCapture?.(event.pointerId);
  });
  world.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.manualX += dx;
    state.manualY += dy;
  });
  const endDrag = () => {
    state.dragging = false;
    world.classList.remove("is-dragging");
  };
  world.addEventListener("pointerup", endDrag);
  world.addEventListener("pointercancel", endDrag);
  world.addEventListener("lostpointercapture", endDrag);
  world.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    state.manualZoom = clamp(state.manualZoom - event.deltaY * 0.0014, 0.55, 1.72);
    state.manualX -= event.deltaX * 0.8;
  }, { passive: false });

  const beatObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.dataset.scrollBeat;
        if (id && focusMap[id]) {
          state.active = id;
          setActiveControl(id);
        }
      }
    });
  }, { threshold: 0.45 });
  document.querySelectorAll("[data-scroll-beat]").forEach((beat) => beatObserver.observe(beat));
  window.addEventListener("scroll", closeDrawerPastHero, { passive: true });
  setActiveControl("host");
  render();
}

function setupPanels() {
  document.querySelectorAll("[data-panel-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.panelTarget;
      document.querySelectorAll("[data-panel-target]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      document.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panel === target);
      });
    });
  });
}

setupForms();
setupCopyButtons();
setupKineticTitles();
setupCanvases();
setupSkrucibleMode();
setupForgeScroll();
setupMerserRoom();
setupPanels();

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
