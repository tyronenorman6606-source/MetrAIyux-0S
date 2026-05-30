const PARTIAL_SELECTOR = '[data-skyrtx-visualizer-partial]';
const VISUALIZER_CLASS = 'skyrtx-workforce-visualizer';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createLaneMarkup() {
  const lanes = [
    ['12%', '-7deg', '-.2s'],
    ['23%', '5deg', '-2.8s'],
    ['37%', '-3deg', '-1.4s'],
    ['52%', '8deg', '-4.1s'],
    ['68%', '-6deg', '-3.2s'],
    ['83%', '4deg', '-5.5s']
  ];
  return lanes.map(([y, tilt, delay]) => (
    `<i style="--lane-y:${y};--lane-tilt:${tilt};--lane-delay:${delay}"></i>`
  )).join('');
}

function createSpectrumMarkup() {
  return Array.from({ length: 34 }, (_, index) => {
    const left = 2 + index * 2.9;
    const height = 22 + ((index * 19) % 42);
    const speed = 3.2 + (index % 7) * .34;
    const delay = -index * .17;
    return `<i style="--bar-left:${left}%;--bar-height:${height}%;--bar-speed:${speed}s;--bar-delay:${delay}s"></i>`;
  }).join('');
}

function ensureHost(host) {
  let target = host || document.querySelector(PARTIAL_SELECTOR);
  if (!target) {
    target = document.createElement('div');
    document.body.prepend(target);
  }
  const element = target instanceof HTMLElement ? target : document.body;
  element.classList.add(VISUALIZER_CLASS);
  element.setAttribute('aria-hidden', 'true');
  element.innerHTML = [
    '<canvas class="skyrtx-visualizer-canvas"></canvas>',
    '<div class="skyrtx-visualizer-lanes">',
    createLaneMarkup(),
    '</div>',
    '<div class="skyrtx-visualizer-spectrum">',
    createSpectrumMarkup(),
    '</div>',
    '<div class="skyrtx-visualizer-glass"></div>'
  ].join('');
  document.body.classList.add('skyrtx-visualizer-mounted');
  return element;
}

function buildNetwork(width, height) {
  const compact = width < 700;
  const columns = compact ? 5 : 8;
  const rows = compact ? 5 : 6;
  const nodes = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const wave = Math.sin(index * 1.17);
      const x = ((column + .5) / columns) * width + wave * 18;
      const y = ((row + .62) / rows) * height + Math.cos(index * .83) * 16;
      nodes.push({
        x: clamp(x, 28, width - 28),
        y: clamp(y, 34, height - 34),
        phase: index * .47,
        lane: index % 4
      });
    }
  }

  const routes = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      routes.push([row * columns + column, row * columns + column + 1]);
    }
  }
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows - 1; row += 1) {
      if ((row + column) % 2 === 0) routes.push([row * columns + column, (row + 1) * columns + column]);
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      if ((row * 3 + column) % 4 === 0) routes.push([row * columns + column, (row + 1) * columns + column + 1]);
    }
  }

  return { nodes, routes };
}

function drawVisualizer(canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return () => {};

  let frame = 0;
  let network = { nodes: [], routes: [] };
  let width = 0;
  let height = 0;
  let ratio = 1;
  let pointerX = .62;
  let pointerY = .38;
  let running = true;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(320, Math.floor(bounds.width || window.innerWidth));
    height = Math.max(480, Math.floor(bounds.height || window.innerHeight));
    ratio = Math.min(window.devicePixelRatio || 1, width < 760 ? 1.25 : 1.6);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    network = buildNetwork(width, height);
  }

  function routeColor(index, alpha) {
    const colors = [
      `rgba(66, 232, 255, ${alpha})`,
      `rgba(246, 193, 75, ${alpha})`,
      `rgba(255, 90, 165, ${alpha})`,
      `rgba(159, 107, 255, ${alpha})`
    ];
    return colors[index % colors.length];
  }

  function drawPacket(a, b, amount, color) {
    const x = a.x + (b.x - a.x) * amount;
    const y = a.y + (b.y - a.y) * amount;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.strokeStyle = color;
    context.lineWidth = 2.4;
    context.shadowColor = color;
    context.shadowBlur = 14;
    context.beginPath();
    context.moveTo(-16, 0);
    context.lineTo(16, 0);
    context.stroke();
    context.restore();
  }

  function draw(time = 0) {
    frame = 0;
    if (!running) return;
    const reduce = prefersReducedMotion.matches;
    const t = reduce ? 22 : time * .001;
    context.clearRect(0, 0, width, height);

    context.save();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = 'rgba(4, 5, 12, .08)';
    context.fillRect(0, 0, width, height);
    context.restore();

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';

    network.routes.forEach(([from, to], index) => {
      const a = network.nodes[from];
      const b = network.nodes[to];
      const pulse = .36 + Math.sin(t * 1.35 + index * .33) * .18;
      context.strokeStyle = routeColor(index, pulse);
      context.lineWidth = index % 5 === 0 ? 1.25 : .72;
      context.setLineDash(index % 3 === 0 ? [16, 18] : [8, 24]);
      context.lineDashOffset = -t * (18 + (index % 6) * 4);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();

      if (index % 2 === 0) {
        drawPacket(a, b, (t * (.09 + (index % 4) * .018) + index * .11) % 1, routeColor(index + 1, .72));
      }
    });
    context.setLineDash([]);

    network.nodes.forEach((node, index) => {
      const dx = node.x - pointerX * width;
      const dy = node.y - pointerY * height;
      const influence = clamp(1 - Math.hypot(dx, dy) / 380, 0, 1);
      const size = 3.5 + Math.sin(t * 2.2 + node.phase) * 1.1 + influence * 3.4;
      context.save();
      context.translate(node.x, node.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = routeColor(node.lane, .5 + influence * .32);
      context.shadowColor = routeColor(node.lane, .8);
      context.shadowBlur = 9 + influence * 20;
      context.fillRect(-size / 2, -size / 2, size, size);
      context.restore();
    });

    for (let i = 0; i < 5; i += 1) {
      const y = height * (.18 + i * .16) + Math.sin(t * .6 + i) * 14;
      const offset = (t * (28 + i * 7)) % 120;
      context.strokeStyle = routeColor(i + 2, .1);
      context.lineWidth = 1;
      context.setLineDash([60, 70]);
      context.lineDashOffset = -offset;
      context.beginPath();
      context.moveTo(-120, y);
      context.bezierCurveTo(width * .26, y - 80, width * .62, y + 96, width + 120, y - 20);
      context.stroke();
    }
    context.restore();

    if (!reduce) frame = window.requestAnimationFrame(draw);
  }

  function onPointerMove(event) {
    pointerX = clamp(event.clientX / Math.max(1, width), 0, 1);
    pointerY = clamp(event.clientY / Math.max(1, height), 0, 1);
  }

  function onVisibilityChange() {
    running = document.visibilityState !== 'hidden';
    if (running && !frame && !prefersReducedMotion.matches) {
      frame = window.requestAnimationFrame(draw);
    }
  }

  resize();
  draw();
  if (!prefersReducedMotion.matches) frame = window.requestAnimationFrame(draw);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    running = false;
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

export function mountSkyeRouteXWorkforceVisualizer(host) {
  const element = ensureHost(host);
  const teardown = drawVisualizer(element.querySelector('canvas'));
  element.__skyrtxVisualizerTeardown = teardown;
  return { element, teardown };
}

onReady(() => {
  if (document.querySelector(`.${VISUALIZER_CLASS}`)?.__skyrtxVisualizerTeardown) return;
  mountSkyeRouteXWorkforceVisualizer(document.querySelector(PARTIAL_SELECTOR));
});

window.SkyeRouteXWorkforceVisualizer = {
  mount: mountSkyeRouteXWorkforceVisualizer
};
