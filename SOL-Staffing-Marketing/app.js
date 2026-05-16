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
  const canvas = document.querySelector('.command-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: 68 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    speed: 0.00042 + Math.random() * 0.00065,
    phase: i * 0.67,
    color: i % 5 === 0 ? '#f8cb5e' : i % 3 === 0 ? '#a88cff' : '#64d9ff'
  }));

  function resize() {
    const r = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * r);
    canvas.height = Math.floor(window.innerHeight * r);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  function draw(time) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    particles.forEach((p, i) => {
      p.y -= p.speed * 2.2;
      if (p.y < -0.08) p.y = 1.08;
      const x = p.x * w + Math.sin(time * 0.00042 + p.phase) * 24;
      const y = p.y * h;
      ctx.beginPath();
      ctx.arc(x, y, i % 7 === 0 ? 2.1 : 1.15, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = i % 5 === 0 ? 0.70 : 0.42;
      ctx.fill();
      const n = particles[(i + 8) % particles.length];
      const nx = n.x * w;
      const ny = n.y * h;
      const dist = Math.hypot(nx - x, ny - y);
      if (dist < 170) {
        ctx.globalAlpha = Math.max(0, 0.18 - dist / 900);
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
})();
