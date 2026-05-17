const graph = window.METRAIYUX_OBSIDIAN_GRAPH || { nodes: [], links: [] };
const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');
const summary = document.getElementById('graphSummary');
const detail = document.getElementById('detailPanel');
const searchInput = document.getElementById('searchInput');
const filterButtons = [...document.querySelectorAll('[data-filter]')];

const colors = {
  hub: '#f4c76a',
  note: '#8fc7ff',
  tag: '#65f4d2',
  source: '#ff6f91',
  folder: '#d6a2ff',
  missing: '#7d8793'
};

const nodes = graph.nodes.map((node, index) => ({
  ...node,
  x: Math.cos(index * 2.399) * 210,
  y: Math.sin(index * 2.399) * 210,
  vx: 0,
  vy: 0,
  visible: true
}));
const nodeById = new Map(nodes.map(node => [node.id, node]));
const links = graph.links
  .map(link => ({ ...link, sourceNode: nodeById.get(link.source), targetNode: nodeById.get(link.target) }))
  .filter(link => link.sourceNode && link.targetNode);

let width = 0;
let height = 0;
let dpr = 1;
let zoom = 1;
let panX = 0;
let panY = 0;
let pointer = { x: 0, y: 0, down: false, dragNode: null, lastX: 0, lastY: 0 };
let selected = null;
let hovered = null;
let activeFilter = 'all';
let tick = 0;

function resize() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!panX && !panY) {
    panX = width * 0.46;
    panY = height * 0.52;
  }
}

function screenToWorld(x, y) {
  return { x: (x - panX) / zoom, y: (y - panY) / zoom };
}

function nodeColor(node) {
  if (node.brain) return '#65f4d2';
  return colors[node.type] || colors.note;
}

function matchesFilter(node) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'brain') return node.brain || (node.tags || []).includes('command-center');
  if (activeFilter === 'proof') return node.group === 'proof' || (node.tags || []).includes('proof') || /proof/i.test(node.label);
  if (activeFilter === 'production') return node.group === 'production' || (node.tags || []).includes('production') || /production|live|deploy/i.test(node.label);
  if (activeFilter === 'commands') return /command|operator|sync|vault/i.test([node.label, node.path, ...(node.tags || [])].join(' '));
  return true;
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  nodes.forEach(node => {
    const hay = [node.label, node.path, node.type, node.group, ...(node.tags || [])].join(' ').toLowerCase();
    node.visible = matchesFilter(node) && (!query || hay.includes(query));
  });
}

function physics() {
  tick += 1;
  const centerPull = 0.004;

  nodes.forEach(node => {
    if (node === pointer.dragNode) return;
    node.vx += -node.x * centerPull;
    node.vy += -node.y * centerPull;
  });

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist2 = Math.max(60, dx * dx + dy * dy);
      const force = (a.visible && b.visible ? 850 : 90) / dist2;
      const fx = dx * force;
      const fy = dy * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  links.forEach(link => {
    const a = link.sourceNode;
    const b = link.targetNode;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const target = link.type === 'wikilink' ? 92 : link.type === 'tag' ? 120 : 150;
    const force = (dist - target) * 0.006 * (link.strength || 1);
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  });

  nodes.forEach(node => {
    if (node === pointer.dragNode) return;
    node.vx *= 0.84;
    node.vy *= 0.84;
    node.x += node.vx;
    node.y += node.vy;
  });
}

function drawBackground() {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = 'rgba(143,199,255,0.12)';
  ctx.lineWidth = 1;
  const gap = 42 * zoom;
  const offsetX = ((panX % gap) + gap) % gap;
  const offsetY = ((panY % gap) + gap) % gap;
  for (let x = offsetX; x < width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = offsetY; y < height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function worldDraw(fn) {
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);
  fn();
  ctx.restore();
}

function drawLinks() {
  links.forEach(link => {
    const a = link.sourceNode;
    const b = link.targetNode;
    const visible = a.visible && b.visible;
    if (!visible && activeFilter !== 'all') return;
    ctx.globalAlpha = visible ? 0.42 : 0.06;
    ctx.strokeStyle = link.type === 'wikilink' ? 'rgba(101,244,210,0.58)' : 'rgba(180,210,255,0.28)';
    ctx.lineWidth = Math.max(0.6, (link.strength || 1) * 0.75);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    const mx = (a.x + b.x) / 2 + Math.sin(tick / 70 + a.x) * 8;
    const my = (a.y + b.y) / 2 + Math.cos(tick / 70 + b.y) * 8;
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function drawNodes() {
  const important = new Set([selected?.id, hovered?.id]);
  nodes.forEach(node => {
    if (!node.visible && activeFilter !== 'all') return;
    const alpha = node.visible ? 1 : 0.18;
    const radius = (node.size || 10) * (important.has(node.id) ? 1.32 : 1);
    const color = nodeColor(node);
    const pulse = node.brain ? Math.sin(tick / 18 + node.x) * 2 : 0;

    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = node.brain || important.has(node.id) ? 22 : 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = important.has(node.id) ? '#ffffff' : 'rgba(255,255,255,0.36)';
    ctx.lineWidth = important.has(node.id) ? 2 : 1;
    ctx.stroke();

    if (radius > 12 || important.has(node.id)) {
      ctx.fillStyle = '#edf5ff';
      ctx.font = `${important.has(node.id) ? 13 : 11}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.label.slice(0, 34), node.x, node.y + radius + 7);
    }
  });
  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();
  worldDraw(() => {
    drawLinks();
    drawNodes();
  });
}

function nearestNode(clientX, clientY) {
  const world = screenToWorld(clientX, clientY);
  let best = null;
  let bestDist = Infinity;
  nodes.forEach(node => {
    if (!node.visible) return;
    const d = Math.hypot(node.x - world.x, node.y - world.y);
    const hit = Math.max(12, (node.size || 10) + 7);
    if (d < hit && d < bestDist) {
      best = node;
      bestDist = d;
    }
  });
  return best;
}

function renderDetail(node) {
  if (!node) return;
  const tags = (node.tags || []).map(tag => `#${tag}`).join(' ');
  detail.innerHTML = `
    <p class="eyebrow">${node.type}${node.brain ? ' / brain-exported' : ''}</p>
    <h2>${escapeHtml(node.label)}</h2>
    <p>${escapeHtml([node.group, tags].filter(Boolean).join(' · ') || 'Vault node')}</p>
    ${node.path ? `<code>${escapeHtml(node.path)}</code>` : ''}
  `;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function animate() {
  physics();
  draw();
  requestAnimationFrame(animate);
}

canvas.addEventListener('pointerdown', event => {
  pointer.down = true;
  pointer.lastX = event.clientX;
  pointer.lastY = event.clientY;
  pointer.dragNode = nearestNode(event.clientX, event.clientY);
  if (pointer.dragNode) {
    selected = pointer.dragNode;
    renderDetail(selected);
  }
});

canvas.addEventListener('pointermove', event => {
  hovered = nearestNode(event.clientX, event.clientY);
  if (!pointer.down) return;
  const dx = event.clientX - pointer.lastX;
  const dy = event.clientY - pointer.lastY;
  pointer.lastX = event.clientX;
  pointer.lastY = event.clientY;
  if (pointer.dragNode) {
    const world = screenToWorld(event.clientX, event.clientY);
    pointer.dragNode.x = world.x;
    pointer.dragNode.y = world.y;
    pointer.dragNode.vx = 0;
    pointer.dragNode.vy = 0;
  } else {
    panX += dx;
    panY += dy;
  }
});

window.addEventListener('pointerup', () => {
  pointer.down = false;
  pointer.dragNode = null;
});

canvas.addEventListener('wheel', event => {
  event.preventDefault();
  const before = screenToWorld(event.clientX, event.clientY);
  const nextZoom = Math.max(0.35, Math.min(2.8, zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
  zoom = nextZoom;
  panX = event.clientX - before.x * zoom;
  panY = event.clientY - before.y * zoom;
}, { passive: false });

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(item => item.classList.remove('is-active'));
    button.classList.add('is-active');
    activeFilter = button.dataset.filter;
    applyFilters();
  });
});

searchInput.addEventListener('input', applyFilters);

summary.textContent = `${graph.notes} notes · ${graph.node_count} nodes · ${graph.link_count} links · generated ${new Date(graph.generated_at).toLocaleString()}`;
resize();
applyFilters();
requestAnimationFrame(animate);
window.addEventListener('resize', resize);
