// Shared interaction layer for the SOL Staffing OS marketing pages.
(function() {
  const btn = document.querySelector('[data-menu-button]');
  const links = document.querySelector('[data-nav-links]');
  if (btn && links) {
    btn.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }
})();

(function() {
  const buttons = Array.from(document.querySelectorAll('[data-command-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-command-panel]'));
  const title = document.querySelector('[data-command-title]');
  if (!buttons.length || !panels.length) return;

  const titles = {
    intake: 'Employer intake opened',
    auth: 'Skyegate FS27 gate',
    records: 'Staffing records live',
    brain: 'Brain endpoint ready'
  };

  function activate(tab) {
    buttons.forEach(button => {
      const active = button.dataset.commandTab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    panels.forEach(panel => {
      panel.hidden = panel.dataset.commandPanel !== tab;
    });
    if (title) title.textContent = titles[tab] || 'Staffing command surface';
  }

  buttons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('is-active')));
    button.addEventListener('click', () => activate(button.dataset.commandTab));
  });
})();

function scoreStaffingFit() {
  const form = document.getElementById('fitForm');
  const result = document.getElementById('fitResult');
  if (!form) return;
  const values = Array.from(new FormData(form).values()).map(value => Number(value || 0));
  const total = values.reduce((sum, value) => sum + value, 0);

  let headline = 'I would keep this in the public lane first.';
  let body = 'The buyer pressure is not heavy enough yet for the full protected operating layer. I would use the public front door, collect clean facts, and keep the gates quiet until real records start moving.';
  let action = 'Keep this as a Public Front Door until the operation proves enough live pressure.';
  let tier = 'Public Front Door';
  let next = ['Publish the public staffing front door', 'Route only basic intake first', 'Lock verified business facts before opening protected rooms'];

  if (total >= 25) {
    headline = 'This belongs in the protected Staffing OS.';
    body = 'The pressure is already operational: job orders, candidates, files, admin control, and brain support all need a command room. We route this through Skyegate FS27, protected records, upload vault, proof receipts, and the private brain endpoint.';
    action = 'Move this buyer toward the Protected Staffing OS deployment.';
    tier = 'Protected Staffing OS';
    next = ['Open the Skyegate FS27 gate', 'Route employer and candidate forms into records', 'Gate upload vault and private brain endpoint behind operator access'];
  } else if (total >= 16) {
    headline = 'I would route records before opening every room.';
    body = 'The operation has enough pressure to stop treating intake like loose messages, but not enough to justify every protected surface at once. We route forms into records first, then add gates, uploads, and brain support as the work proves itself.';
    action = 'Use the Record Route phase before selling the full protected OS.';
    tier = 'Record Route';
    next = ['Turn public intake into typed records', 'Give the operator an admin review lane', 'Hold sensitive uploads until retention and policy are ready'];
  }

  const score = document.getElementById('fitScore');
  const tierEl = document.getElementById('fitTier');
  const headlineEl = document.getElementById('fitHeadline');
  const summaryEl = document.getElementById('fitSummary');
  const ring = document.querySelector('.score-ring');
  const bars = Array.from(document.querySelectorAll('.fit-bars span'));
  const percent = Math.round((total / 50) * 100);

  if (score) score.textContent = String(total);
  if (tierEl) tierEl.textContent = tier;
  if (headlineEl) headlineEl.textContent = headline;
  if (summaryEl) summaryEl.textContent = body;
  if (ring) ring.style.setProperty('--score', percent);
  bars.forEach((bar, index) => {
    const value = values[index] || 0;
    bar.style.setProperty('--bar', Math.max(12, value * 10));
  });

  if (result) {
    result.classList.add('is-visible');
    result.innerHTML = `
      <div>
        <span class="console-kicker">Recommended path</span>
        <h3>${tier}</h3>
        <p>${body}</p>
      </div>
      <div>
        <span class="console-kicker">Next actions</span>
        <ol>${next.map(item => `<li>${item}</li>`).join('')}</ol>
        <p><strong>${action}</strong></p>
      </div>`;
  }
}

window.scoreStaffingFit = scoreStaffingFit;

(function() {
  const form = document.getElementById('fitForm');
  if (!form) return;
  form.addEventListener('change', scoreStaffingFit);
  scoreStaffingFit();
})();

(function() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10 });
  items.forEach(el => observer.observe(el));
})();

(function() {
  const videos = Array.from(document.querySelectorAll('video[autoplay]'));
  videos.forEach(video => {
    video.muted = true;
    video.setAttribute('muted', '');
    const play = () => {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    };
    if (video.readyState >= 2) play();
    video.addEventListener('loadeddata', play, { once: true });
    video.addEventListener('canplay', play, { once: true });
  });
})();

(function() {
  const canvas = document.getElementById('surfaceReel');
  const video = document.getElementById('surfaceVideo');
  const shell = document.querySelector('.surface-video-shell');
  const frames = Array.from(document.querySelectorAll('.actual-screen'));
  if (!frames.length) return;

  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const title = document.getElementById('surfaceReelTitle');
  const caption = document.getElementById('surfaceReelCaption');
  const progress = document.getElementById('surfaceReelProgress');
  const duration = 4300;
  const loaded = frames.map(frame => ({
    image: frame.querySelector('img'),
    title: frame.dataset.reelTitle || frame.textContent.trim(),
    caption: frame.dataset.reelCaption || ''
  })).filter(frame => frame.image);

  function setCopy(frame) {
    if (!frame) return;
    if (title && title.textContent !== frame.title) title.textContent = frame.title;
    if (caption && caption.textContent !== frame.caption) caption.textContent = frame.caption;
  }

  function updateFromVideo() {
    if (!video || !loaded.length) return;
    const reelDuration = video.duration && Number.isFinite(video.duration)
      ? video.duration
      : loaded.length * 2.5;
    const segment = reelDuration / loaded.length;
    const current = (video.currentTime || 0) % reelDuration;
    const index = Math.min(loaded.length - 1, Math.floor(current / segment));
    const local = (current - index * segment) / segment;

    setCopy(loaded[index]);
    if (progress) progress.style.width = `${Math.round(local * 100)}%`;
    requestAnimationFrame(updateFromVideo);
  }

  function resize() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawImageCover(image, t, direction) {
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * (1.03 + t * 0.045);
    const iw = image.naturalWidth * scale;
    const ih = image.naturalHeight * scale;
    const panX = direction * (t - 0.5) * Math.min(72, Math.max(0, iw - w));
    const panY = (0.5 - t) * Math.min(44, Math.max(0, ih - h));
    ctx.drawImage(image, (w - iw) / 2 + panX, (h - ih) / 2 + panY, iw, ih);
  }

  function draw(time) {
    if (!canvas || !ctx) return;
    const ready = loaded.filter(frame => frame.image.complete && frame.image.naturalWidth);
    if (!ready.length) {
      requestAnimationFrame(draw);
      return;
    }

    const total = duration * ready.length;
    const loop = time % total;
    const index = Math.floor(loop / duration);
    const nextIndex = (index + 1) % ready.length;
    const t = (loop % duration) / duration;
    const fade = Math.max(0, Math.min(1, (t - 0.78) / 0.18));
    const current = ready[index];
    const next = ready[nextIndex];
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    drawImageCover(current.image, t, index % 2 ? -1 : 1);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      drawImageCover(next.image, Math.max(0, (t - 0.78) / 0.22), nextIndex % 2 ? -1 : 1);
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(3,5,9,0.18)';
    ctx.fillRect(0, 0, w, h);

    setCopy(current);
    if (progress) progress.style.width = `${Math.round(t * 100)}%`;

    requestAnimationFrame(draw);
  }

  function startFallback() {
    if (!canvas || !ctx || !shell) return;
    shell.classList.add('is-fallback');
    loaded.forEach(frame => {
      if (!frame.image.complete) frame.image.addEventListener('load', resize, { once: true });
    });
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  if (video && video.querySelector('source')) {
    setCopy(loaded[0]);
    video.addEventListener('error', startFallback, { once: true });
    video.addEventListener('loadedmetadata', () => requestAnimationFrame(updateFromVideo), { once: true });
    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(startFallback);
    return;
  }

  loaded.forEach(frame => {
    if (!frame.image.complete) frame.image.addEventListener('load', resize, { once: true });
  });
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
})();

(function() {
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  document.body.appendChild(progress);
  const fill = progress.querySelector('span');
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    fill.style.transform = `scaleX(${pct})`;
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();

(function() {
  const canvas = document.querySelector('.command-canvas');
  if (!canvas || !canvas.getContext) return;
  canvas.classList.add('skyesol-living-field');
  if (!document.querySelector('.skyesol-grain')) {
    const grain = document.createElement('div');
    grain.className = 'skyesol-grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }
  if (!document.querySelector('.skyesol-scanline')) {
    const scanline = document.createElement('div');
    scanline.className = 'skyesol-scanline';
    scanline.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scanline);
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext('2d');
  const palette = ['rgba(201,168,76,', 'rgba(138,99,255,', 'rgba(39,242,255,'];
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
    const maxParticles = width < 760 ? 72 : 132;
    const count = Math.min(maxParticles, Math.max(58, Math.floor(width * height / 15000)));
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
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
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

  function draw(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(draw);
      return;
    }
    const t = now * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * 0.28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, 0.34);
    drawWave(t, height * 0.54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, 0.24);
    drawWave(t, height * 0.82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, 0.28);
    particles.forEach((p) => {
      const x = p.x + Math.sin(t * p.s + p.phase) * 28 + pointer.x * 10;
      const y = p.y + Math.cos(t * p.s * 0.8 + p.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(draw);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - 0.5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - 0.5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(draw);
  window.addEventListener('pagehide', () => {
    if (raf) cancelAnimationFrame(raf);
  });
})();
