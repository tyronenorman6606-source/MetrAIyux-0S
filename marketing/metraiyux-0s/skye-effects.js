/*!
 * SkyeUI Effects — vanilla JS port of SkyeUI-Components
 * Meteors · ShineBorder · BorderBeam · TypingAnimation · TextBlurIn · OrbitRings
 */
(function (w, d) {
  'use strict';

  // ── Inject base CSS once ─────────────────────────────────────────────────
  function injectStyles() {
    if (d.getElementById('skye-effects-css')) return;
    const s = d.createElement('style');
    s.id = 'skye-effects-css';
    s.textContent = `
/* ── Meteors ── */
@keyframes skye-meteor {
  0%   { transform: rotate(-30deg) translateX(0);   opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: rotate(-30deg) translateX(-600px); opacity: 0; }
}
.skye-meteor {
  position: absolute;
  border-radius: 999px;
  transform: rotate(-30deg);
  pointer-events: none;
  animation: skye-meteor linear infinite;
  opacity: 0;
}

/* ── Shine Border ── */
@property --skye-shine-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
@keyframes skye-shine-spin {
  to { --skye-shine-angle: 360deg; }
}
.skye-shine-wrap {
  position: relative;
  isolation: isolate;
}
.skye-shine-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.5px;
  background: conic-gradient(
    from var(--skye-shine-angle),
    transparent 0%,
    var(--skye-shine-c1, #a88cff) 15%,
    var(--skye-shine-c2, #f8cb5e) 35%,
    var(--skye-shine-c3, #64d9ff) 50%,
    transparent 65%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: skye-shine-spin var(--skye-shine-dur, 4s) linear infinite;
  pointer-events: none;
  z-index: 0;
}
/* Fallback for browsers without @property */
@supports not (background: conic-gradient(from 0deg, red, blue)) {
  .skye-shine-wrap::before { display: none; }
}

/* ── Border Beam ── */
.skye-beam-host {
  position: relative;
  overflow: hidden;
}
.skye-beam {
  position: absolute;
  pointer-events: none;
  border-radius: 2px;
  will-change: transform;
  z-index: 10;
  top: 0; left: 0;
}

/* ── Text Blur In ── */
@keyframes skye-blur-in {
  from { filter: blur(8px); opacity: 0; transform: translateY(6px); }
  to   { filter: blur(0);   opacity: 1; transform: translateY(0); }
}
.skye-blur-word {
  display: inline-block;
  opacity: 0;
  animation: skye-blur-in 0.5s ease forwards;
}

/* ── Typing cursor ── */
@keyframes skye-blink { 50% { opacity: 0; } }
.skye-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  margin-left: 3px;
  vertical-align: middle;
  animation: skye-blink 0.8s step-end infinite;
}

/* ── Orbiting Circles ── */
@keyframes skye-orbit-cw  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
@keyframes skye-orbit-ccw { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
@keyframes skye-icon-cw   { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
@keyframes skye-icon-ccw  { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }

.skye-orbit-scene {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.skye-orbit-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.07);
  top: 50%; left: 50%;
  transform-origin: 50% 50%;
  transform: translate(-50%, -50%);
}
.skye-orbit-icon {
  position: absolute;
  top: 50%; left: 50%;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  box-shadow: 0 0 14px rgba(168,140,255,0.2);
  font-size: 18px;
  transition: box-shadow 0.3s;
  cursor: default;
}
.skye-orbit-icon:hover {
  box-shadow: 0 0 24px rgba(168,140,255,0.55);
}
.skye-orbit-center {
  position: relative;
  z-index: 2;
  border-radius: 50%;
  background: rgba(168,140,255,0.08);
  border: 1px solid rgba(168,140,255,0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 32px rgba(168,140,255,0.25);
}
.skye-orbit-label {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  pointer-events: none;
}
    `;
    d.head.appendChild(s);
  }

  // ── Meteors ──────────────────────────────────────────────────────────────
  function Meteors(container, opts) {
    opts = Object.assign({ count: 18, color: 'rgba(100,217,255,0.65)', minSize: 60, maxSize: 160 }, opts || {});
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    for (let i = 0; i < opts.count; i++) {
      const m = d.createElement('span');
      m.className = 'skye-meteor';
      const delay  = (Math.random() * 5).toFixed(2);
      const dur    = (0.6 + Math.random() * 1.2).toFixed(2);
      const top    = (Math.random() * 80).toFixed(1);
      const left   = (20 + Math.random() * 80).toFixed(1);
      const width  = (opts.minSize + Math.random() * (opts.maxSize - opts.minSize)).toFixed(0);
      const height = (1 + Math.random() * 1.5).toFixed(1);
      m.style.cssText =
        `top:${top}%;left:${left}%;` +
        `width:${width}px;height:${height}px;` +
        `background:linear-gradient(90deg,${opts.color},transparent);` +
        `animation-duration:${dur}s;animation-delay:${delay}s;`;
      container.appendChild(m);
    }
  }

  // ── Shine Border ─────────────────────────────────────────────────────────
  function ShineBorder(el, opts) {
    opts = Object.assign({
      c1: '#a88cff', c2: '#f8cb5e', c3: '#64d9ff', duration: '4s'
    }, opts || {});
    el.classList.add('skye-shine-wrap');
    el.style.setProperty('--skye-shine-c1',  opts.c1);
    el.style.setProperty('--skye-shine-c2',  opts.c2);
    el.style.setProperty('--skye-shine-c3',  opts.c3);
    el.style.setProperty('--skye-shine-dur', opts.duration);
  }

  // ── Border Beam ──────────────────────────────────────────────────────────
  function BorderBeam(el, opts) {
    opts = Object.assign({ color: '#a88cff', size: 80, duration: 3500, delay: 0 }, opts || {});
    el.classList.add('skye-beam-host');
    const beam = d.createElement('div');
    beam.className = 'skye-beam';
    beam.style.width  = opts.size + 'px';
    beam.style.height = '2px';
    beam.style.background = `linear-gradient(90deg, transparent, ${opts.color}, transparent)`;
    el.appendChild(beam);

    let startTime = null;
    function tick(ts) {
      if (!startTime) startTime = ts + opts.delay;
      const elapsed = ts - startTime;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }
      const p  = (elapsed % opts.duration) / opts.duration;
      const w  = el.offsetWidth;
      const h  = el.offsetHeight;
      const P  = 2 * (w + h);
      const pos = p * P;
      let x, y, angle;
      if (pos <= w)             { x = pos;               y = 0;   angle = 0;   }
      else if (pos <= w + h)    { x = w;                 y = pos - w; angle = 90;  }
      else if (pos <= 2*w + h)  { x = w - (pos - w - h); y = h;   angle = 180; }
      else                      { x = 0;    y = h - (pos - 2*w - h); angle = 270; }
      beam.style.transform = `translate(${x - opts.size / 2}px, ${y - 1}px) rotate(${angle}deg)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── Typing Animation ─────────────────────────────────────────────────────
  function TypingAnimation(el, opts) {
    opts = Object.assign({ speed: 55, cursor: true, delay: 0 }, opts || {});
    const text = el.textContent.trim();
    el.textContent = '';
    if (opts.cursor) {
      const cur = d.createElement('span');
      cur.className = 'skye-cursor';
      el.after(cur);
      setTimeout(function () { cur.remove(); }, text.length * opts.speed + opts.delay + 2000);
    }
    let i = 0;
    function type() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i++);
        setTimeout(type, opts.speed + Math.random() * 25);
      }
    }
    setTimeout(type, opts.delay);
  }

  // ── Text Blur In ─────────────────────────────────────────────────────────
  function TextBlurIn(el, opts) {
    opts = Object.assign({ stagger: 80, delay: 0 }, opts || {});
    const html = el.innerHTML;
    const words = html.split(/(\s+)/);
    el.innerHTML = words.map(function (w, i) {
      if (/^\s+$/.test(w)) return w;
      const d2 = opts.delay + Math.floor(i / 2) * opts.stagger;
      return `<span class="skye-blur-word" style="animation-delay:${d2}ms">${w}</span>`;
    }).join('');
  }

  // ── Orbiting Circles ─────────────────────────────────────────────────────
  function OrbitRings(container, centerHTML, rings, opts) {
    opts = Object.assign({ size: 320, centerSize: 72 }, opts || {});

    container.classList.add('skye-orbit-scene');
    container.style.width  = opts.size + 'px';
    container.style.height = opts.size + 'px';

    // Center
    const center = d.createElement('div');
    center.className = 'skye-orbit-center';
    center.style.width  = opts.centerSize + 'px';
    center.style.height = opts.centerSize + 'px';
    center.innerHTML = centerHTML;
    container.appendChild(center);

    rings.forEach(function (ring) {
      const r      = ring.radius;
      const speed  = ring.speed  || 20;
      const rev    = ring.reverse || false;
      const iSize  = ring.iconSize || 40;
      const items  = ring.items;

      const ringEl = d.createElement('div');
      ringEl.className = 'skye-orbit-ring';
      ringEl.style.width    = r * 2 + 'px';
      ringEl.style.height   = r * 2 + 'px';
      ringEl.style.marginLeft = (-r) + 'px';
      ringEl.style.marginTop  = (-r) + 'px';
      ringEl.style.animation  =
        `${rev ? 'skye-orbit-ccw' : 'skye-orbit-cw'} ${speed}s linear infinite`;
      container.appendChild(ringEl);

      items.forEach(function (item, idx) {
        const angle = (idx / items.length) * 2 * Math.PI - Math.PI / 2;
        const ix = Math.cos(angle) * r;
        const iy = Math.sin(angle) * r;

        const icon = d.createElement('div');
        icon.className = 'skye-orbit-icon';
        icon.title = item.label || '';
        icon.style.width   = iSize + 'px';
        icon.style.height  = iSize + 'px';
        icon.style.fontSize = Math.floor(iSize * 0.45) + 'px';
        icon.style.marginLeft = (-iSize / 2) + 'px';
        icon.style.marginTop  = (-iSize / 2) + 'px';
        icon.style.transform =
          `translate(${ix}px, ${iy}px)`;
        icon.style.animation =
          `${rev ? 'skye-icon-cw' : 'skye-icon-ccw'} ${speed}s linear infinite`;
        icon.innerHTML = item.html || item.emoji || '';

        if (item.label) {
          const lbl = d.createElement('span');
          lbl.className = 'skye-orbit-label';
          lbl.textContent = item.label;
          icon.appendChild(lbl);
        }
        ringEl.appendChild(icon);
      });
    });
  }

  injectStyles();

  w.SkyeUI = { Meteors, ShineBorder, BorderBeam, TypingAnimation, TextBlurIn, OrbitRings };

})(window, document);
