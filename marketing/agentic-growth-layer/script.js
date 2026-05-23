const menuButton = document.querySelector('[data-menu-button]');
const navMenu = document.querySelector('#navMenu');
const progress = document.querySelector('#scrollProgress');
const glow = document.querySelector('#cursorGlow');
const proofOutput = document.querySelector('#proofOutput');
const tabs = [...document.querySelectorAll('[data-tab]')];
const operatorInputs = ['brandName', 'campaignName', 'idea', 'logoScale', 'imageFocus', 'aiEmail', 'aiSessionId']
  .map((id) => document.getElementById(id))
  .filter(Boolean);
const operatorButtons = ['generateBtn', 'auditBtn', 'safeBtn', 'shuffleBtn', 'duplicateBtn', 'regenSelectedBtn']
  .map((id) => document.getElementById(id))
  .filter(Boolean);
const sourceChips = [...document.querySelectorAll('#filters .chip')];
const aiPlanBadge = document.getElementById('aiPlanBadge');
const aiStatus = document.getElementById('aiStatus');
const aiMeterCount = document.getElementById('aiMeterCount');
const batchCount = document.getElementById('batchCount');
const selectedMeta = document.getElementById('selectedMeta');
const crawlDepthLabel = document.getElementById('crawlDepthLabel');
const confidenceLabel = document.getElementById('confidenceLabel');

let proofData = null;
let operatorCycle = 0;

function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.width = `${Math.min(100, Math.max(0, pct * 100))}%`;
}

function renderProof(tab = 'noDomain') {
  if (!proofData) return;
  const payloads = {
    noDomain: proofData.modes.noDomain,
    connected: proofData.modes.connected,
    stress: {
      ok: proofData.stress.ok,
      fixture: proofData.stress.fixture,
      core: proofData.stress.core,
      api: proofData.stress.api,
      memory: proofData.stress.memory,
      assertions: proofData.stress.assertions
    }
  };
  proofOutput.textContent = JSON.stringify(payloads[tab], null, 2);
}

function setMetric(selector, value) {
  const node = document.querySelector(`[data-metric="${selector}"]`);
  if (node && value !== undefined && value !== null) node.textContent = value;
}

function updateOperatorState(source = 'input') {
  const brand = document.getElementById('brandName')?.value?.trim() || 'Client site';
  const market = document.getElementById('campaignName')?.value?.trim() || 'Market lane';
  const depth = document.getElementById('logoScale')?.value || '82';
  const confidence = document.getElementById('imageFocus')?.value || '76';
  const activeSource = sourceChips.find((chip) => chip.classList.contains('active'))?.textContent?.trim() || 'All';
  const connectedActions = proofData?.modes?.connected?.actions || 14;
  const fallbackActions = proofData?.modes?.noDomain?.actions || 12;
  const actionCount = activeSource === 'Preview' ? fallbackActions : connectedActions + operatorCycle;

  if (crawlDepthLabel) crawlDepthLabel.textContent = depth;
  if (confidenceLabel) confidenceLabel.textContent = confidence;
  if (aiPlanBadge) aiPlanBadge.textContent = activeSource === 'Preview' ? 'No-domain mode' : 'Connected growth';
  if (aiStatus) aiStatus.textContent = `${source === 'audit' ? 'Proof audit clear' : source === 'patch' ? 'Patch manifest staged' : 'Growth cycle queued'} for ${brand}`;
  if (aiMeterCount) aiMeterCount.textContent = `${proofData?.stress?.core?.throughputPerSecond || 20.47}/s`;
  if (batchCount) batchCount.textContent = String(actionCount);
  if (selectedMeta) selectedMeta.textContent = `${market} · ${activeSource} · ${confidence}% floor`;
}

async function loadProof() {
  try {
    const response = await fetch('data/service-proof.json', { cache: 'no-store' });
    proofData = await response.json();
    setMetric('core', proofData.stress.core.iterations);
    setMetric('api', proofData.stress.api.requests);
    setMetric('gsc', proofData.stress.fixture.gscRows);
    setMetric('p95', `${proofData.stress.core.latencyMs.p95}ms`);
    renderProof('noDomain');
    updateOperatorState('proof');
  } catch (error) {
    proofOutput.textContent = JSON.stringify({ ok: false, error: error.message }, null, 2);
  }
}

menuButton?.addEventListener('click', () => {
  const open = navMenu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

navMenu?.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    navMenu.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => {
      item.classList.toggle('active', item === tab);
      item.setAttribute('aria-selected', String(item === tab));
    });
    renderProof(tab.dataset.tab);
  });
});

operatorInputs.forEach((input) => {
  input.addEventListener('input', () => updateOperatorState('input'));
});

sourceChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    sourceChips.forEach((item) => item.classList.toggle('active', item === chip));
    updateOperatorState('source');
  });
});

operatorButtons.forEach((button) => {
  button.addEventListener('click', () => {
    operatorCycle += 1;
    const buttonId = button.id;
    const state = buttonId === 'auditBtn'
      ? 'audit'
      : buttonId === 'regenSelectedBtn'
        ? 'patch'
        : 'cycle';
    updateOperatorState(state);
  });
});

window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress);
window.addEventListener('pointermove', (event) => {
  if (!glow || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
}, { passive: true });

updateScrollProgress();
loadProof();

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
