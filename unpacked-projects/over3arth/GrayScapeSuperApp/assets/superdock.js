(() => {
  const MODULES = [
    ["Nexus", "./index.html"],
    ["Forge", "./grayscape-nodepro.html"],
    ["Command", "./grayscape-calendar.html"],
    ["Tasks", "./tasks.html"],
    ["Journal", "./journal.html"],
    ["Vault", "./vault.html"],
    ["Settings", "./settings.html"],
    ["About", "./about.html"],
  ];

  const $ = (s, el = document) => el.querySelector(s);
  const safeParse = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };

  function download(name, text){
    const url = URL.createObjectURL(new Blob([text], {type:"application/json"}));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  function exportState(){
    const snap = { kind:"GrayScapeExport", exportedAt:new Date().toISOString(), keys:{} };
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("grayscape") || k.startsWith("NEXUS_") || k.includes("grayscape")){
        snap.keys[k] = localStorage.getItem(k);
      }
    }
    download(`grayscape_export_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(snap, null, 2));
  }

  function importState(file){
    const r = new FileReader();
    r.onload = () => {
      const data = safeParse(String(r.result||""), null);
      if(!data || !data.keys) return;
      Object.keys(data.keys).forEach(k => { try { localStorage.setItem(k, String(data.keys[k])); } catch {} });
      location.reload();
    };
    r.readAsText(file);
  }

  function addTask(title){
    const KEY="grayscape_tasks_v1";
    const db=safeParse(localStorage.getItem(KEY)||"{}", {tasks:[]});
    db.tasks = Array.isArray(db.tasks) ? db.tasks : [];
    const now=Date.now();
    db.tasks.unshift({id:"t_"+Math.random().toString(16).slice(2)+now.toString(16), title, due:"", done:false, createdAt:now, updatedAt:now});
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function addJournal(text){
    const KEY="grayscape_journal_v1";
    const db=safeParse(localStorage.getItem(KEY)||"{}", {entries:[]});
    db.entries = Array.isArray(db.entries) ? db.entries : [];
    const now=Date.now();
    db.entries.unshift({id:"j_"+Math.random().toString(16).slice(2)+now.toString(16), date:new Date().toISOString().slice(0,10), title:"Quick Capture", mood:"", content:text, createdAt:now, updatedAt:now});
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function ensureUI(){
    if($("#gs")) return;

    const wrap = document.createElement("div");
    wrap.id = "gs";
    wrap.innerHTML = `
      <button id="gsb" aria-label="GrayScape Menu">☰</button>
      <div id="gsp" role="dialog" aria-label="GrayScape SuperDock">
        <div class="gsl">
          ${MODULES.map(m => `
            <a class="gsa" href="${m[1]}">
              <b style="letter-spacing:.12em;text-transform:uppercase;font-size:12px">${m[0]}</b>
              <span style="opacity:.65;font-size:11px">${m[1]}</span>
            </a>
          `).join("")}
        </div>
        <div class="gsx">
          <button id="gsi" class="gsb2" disabled>Install</button>
          <button id="gse" class="gsb2">Export</button>
          <button id="gsm" class="gsb2">Import</button>
        </div>
        <input id="gsf" type="file" accept="application/json" />
        <div style="margin-top:10px;opacity:.65;font-size:11px;line-height:1.35">
          Ctrl/⌘K opens Command Palette. Try:<br/>
          <b>task</b> Pay bills &nbsp;·&nbsp; <b>journal</b> Built GrayScape…
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const cmd = document.createElement("div");
    cmd.id = "cmd";
    cmd.innerHTML = `
      <div id="cmdb">
        <input id="cmdi" placeholder="Open module… / export / import / task … / journal …" />
        <div id="cmdl"></div>
      </div>
    `;
    document.body.appendChild(cmd);
  }

  function renderCmd(query){
    const q = (query || "").trim().toLowerCase();
    const list = $("#cmdl");
    list.innerHTML = "";

    const actions = [];
    MODULES.forEach(m => actions.push({t:`Open ${m[0]}`, s:m[1], run:() => location.href=m[1]}));
    actions.push({t:"Export", s:"Download state JSON", run:exportState});
    actions.push({t:"Import", s:"Load state JSON", run:() => $("#gsf").click()});

    if(q.startsWith("task ")){
      const title = query.slice(5).trim();
      if(title) actions.unshift({t:`Capture Task: ${title}`, s:"Adds to Tasks", run:() => { addTask(title); location.href="./tasks.html"; }});
    }
    if(q.startsWith("journal ")){
      const text = query.slice(8).trim();
      if(text) actions.unshift({t:`Capture Journal`, s:text.slice(0,80) + (text.length>80?"…":""), run:() => { addJournal(text); location.href="./journal.html"; }});
    }

    const show = q ? actions.filter(a => (a.t + " " + a.s).toLowerCase().includes(q) || q.startsWith("task ") || q.startsWith("journal ")) : actions;

    show.slice(0, 16).forEach(a => {
      const div = document.createElement("div");
      div.className = "cmdit";
      div.innerHTML = `
        <div style="font-weight:900;letter-spacing:.06em;text-transform:uppercase;font-size:12px">${a.t}</div>
        <div style="opacity:.65;font-size:11px">${a.s}</div>
      `;
      div.addEventListener("click", () => { closeCmd(); a.run(); });
      list.appendChild(div);
    });
  }

  function openCmd(){
    $("#cmd").classList.add("open");
    $("#cmdi").value = "";
    renderCmd("");
    setTimeout(() => $("#cmdi").focus(), 10);
  }
  function closeCmd(){
    $("#cmd").classList.remove("open");
  }

  function wire(){
    const panel = $("#gsp");
    $("#gsb").addEventListener("click", () => panel.classList.toggle("open"));

    document.addEventListener("click", (e) => {
      if(!panel.classList.contains("open")) return;
      if(e.target.id === "gsb" || panel.contains(e.target)) return;
      panel.classList.remove("open");
    });

    $("#gse").addEventListener("click", exportState);
    $("#gsm").addEventListener("click", () => $("#gsf").click());
    $("#gsf").addEventListener("change", () => {
      const f = $("#gsf").files && $("#gsf").files[0];
      if(f) importState(f);
      $("#gsf").value = "";
    });

    // Install
    let deferred = null;
    const installBtn = $("#gsi");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferred = e;
      installBtn.disabled = false;
    });
    installBtn.addEventListener("click", async () => {
      if(!deferred) return;
      installBtn.disabled = true;
      deferred.prompt();
      try { await deferred.userChoice; } catch {}
      deferred = null;
    });
    window.addEventListener("appinstalled", () => { installBtn.disabled = true; deferred = null; });

    // Cmd palette
    document.addEventListener("keydown", (e) => {
      const isK = (e.key || "").toLowerCase() === "k";
      if((e.ctrlKey || e.metaKey) && isK){
        e.preventDefault();
        $("#cmd").classList.contains("open") ? closeCmd() : openCmd();
      }
      if(e.key === "Escape" && $("#cmd").classList.contains("open")){
        e.preventDefault(); closeCmd();
      }
    });
    $("#cmd").addEventListener("click", (e) => { if(e.target && e.target.id === "cmd") closeCmd(); });
    $("#cmdi").addEventListener("input", () => renderCmd($("#cmdi").value));
    $("#cmdi").addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        const first = $("#cmdl .cmdit");
        if(first) first.click();
      }
    });

    // SW
    if("serviceWorker" in navigator){
      window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
    }
  }

  function injectCss(){
    if(document.querySelector('link[href="./assets/superdock.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./assets/superdock.css";
    document.head.appendChild(link);
  }

  function init(){
    injectCss();
    ensureUI();
    wire();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

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
