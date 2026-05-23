(function () {
  const graph = window.METRAIYUX_PUBLIC_NEURAL_MAP || { nodes: [], links: [] };
  const canvas = document.getElementById('publicNeuralMap');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const summary = document.getElementById('mapSummary');
  const detail = document.getElementById('mapDetail');
  const search = document.getElementById('mapSearch');
  const filters = [...document.querySelectorAll('[data-map-filter]')];
  const colors = {
    hub: '#f7d36e',
    cluster: '#64f1cf',
    note: '#8fc7ff',
    signal: '#d6a2ff',
    tag: '#ff88b1'
  };

  const nodes = graph.nodes.map((node, index) => ({
    ...node,
    x: Math.cos(index * 2.399) * 220,
    y: Math.sin(index * 2.399) * 220,
    vx: 0,
    vy: 0,
    visible: true
  }));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const links = graph.links
    .map(link => ({ ...link, sourceNode: byId.get(link.source), targetNode: byId.get(link.target) }))
    .filter(link => link.sourceNode && link.targetNode);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let tick = 0;
  let activeFilter = 'all';
  let selected = null;
  let hovered = null;
  let settled = false;
  const pointer = { down: false, lastX: 0, lastY: 0, dragNode: null };

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!panX && !panY) {
      panX = width * 0.5;
      panY = height * 0.52;
    }
    if (settled) fitGraphToView();
  }

  function screenToWorld(x, y) {
    const rect = canvas.getBoundingClientRect();
    return { x: (x - rect.left - panX) / zoom, y: (y - rect.top - panY) / zoom };
  }

  function nodeColor(node) {
    return colors[node.type] || colors.note;
  }

  function matchesFilter(node) {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'brain') return /brain|knowledge|vault/i.test([node.group, node.label, node.summary].join(' '));
    return node.group === activeFilter || node.type === activeFilter || /cluster/.test(node.id) && node.id.endsWith(activeFilter);
  }

  function applyFilters() {
    const q = (search?.value || '').trim().toLowerCase();
    nodes.forEach(node => {
      const hay = [node.label, node.group, node.type, node.summary, ...(node.tags || [])].join(' ').toLowerCase();
      node.visible = matchesFilter(node) && (!q || hay.includes(q));
    });
    fitGraphToView();
  }

  function physics() {
    tick += 1;
    nodes.forEach(node => {
      if (node === pointer.dragNode) return;
      node.vx += -node.x * 0.0038;
      node.vy += -node.y * 0.0038;
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist2 = Math.max(80, dx * dx + dy * dy);
        const force = (a.visible && b.visible ? 760 : 90) / dist2;
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
      const target = link.type.includes('cluster') ? 135 : link.type === 'signal' ? 72 : 105;
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

  function settleGraph(iterations = 180) {
    for (let i = 0; i < iterations; i += 1) physics();
    settled = true;
  }

  function fitGraphToView() {
    const visible = nodes.filter(node => node.visible);
    if (!visible.length || !width || !height) return;
    const bounds = visible.reduce((box, node) => ({
      minX: Math.min(box.minX, node.x - (node.size || 10)),
      maxX: Math.max(box.maxX, node.x + (node.size || 10)),
      minY: Math.min(box.minY, node.y - (node.size || 10)),
      maxY: Math.max(box.maxY, node.y + (node.size || 10))
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
    const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
    const padding = Math.max(42, Math.min(width, height) * 0.08);
    zoom = Math.max(0.35, Math.min(1.7, Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight)));
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    panX = width / 2 - centerX * zoom;
    panY = height / 2 - centerY * zoom;
  }

  function drawBackground() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = 'rgba(143,199,255,0.13)';
    const gap = 46 * zoom;
    const ox = ((panX % gap) + gap) % gap;
    const oy = ((panY % gap) + gap) % gap;
    for (let x = ox; x < width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = oy; y < height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorld(fn) {
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);
    fn();
    ctx.restore();
  }

  function drawLinks() {
    links.forEach(link => {
      if ((!link.sourceNode.visible || !link.targetNode.visible) && activeFilter !== 'all') return;
      ctx.globalAlpha = link.sourceNode.visible && link.targetNode.visible ? 0.42 : 0.07;
      ctx.strokeStyle = link.type.includes('cluster') ? 'rgba(100,241,207,0.42)' : 'rgba(180,210,255,0.3)';
      ctx.lineWidth = Math.max(0.5, (link.strength || 1) * 0.72);
      ctx.beginPath();
      ctx.moveTo(link.sourceNode.x, link.sourceNode.y);
      const mx = (link.sourceNode.x + link.targetNode.x) / 2 + Math.sin(tick / 60 + link.sourceNode.x) * 7;
      const my = (link.sourceNode.y + link.targetNode.y) / 2 + Math.cos(tick / 60 + link.targetNode.y) * 7;
      ctx.quadraticCurveTo(mx, my, link.targetNode.x, link.targetNode.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function drawNodes() {
    nodes.forEach(node => {
      if (!node.visible && activeFilter !== 'all') return;
      const important = selected === node || hovered === node;
      const radius = (node.size || 10) * (important ? 1.28 : 1);
      const color = nodeColor(node);
      ctx.globalAlpha = node.visible ? 1 : 0.18;
      ctx.shadowColor = color;
      ctx.shadowBlur = important || node.type === 'hub' || node.type === 'cluster' ? 24 : 9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + Math.sin(tick / 20 + node.x) * (node.type === 'hub' ? 2 : 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = important ? '#ffffff' : 'rgba(255,255,255,0.34)';
      ctx.lineWidth = important ? 2 : 1;
      ctx.stroke();

      if (node.type !== 'signal' || important || node.type === 'hub' || node.type === 'cluster') {
        ctx.fillStyle = '#f1f7ff';
        ctx.font = `${important ? 13 : 11}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(String(node.label).slice(0, 34), node.x, node.y + radius + 7);
      }
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    drawBackground();
    drawWorld(() => {
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
      const dist = Math.hypot(node.x - world.x, node.y - world.y);
      const hit = Math.max(12, (node.size || 10) + 7);
      if (dist < hit && dist < bestDist) {
        best = node;
        bestDist = dist;
      }
    });
    return best;
  }

  function showDetail(node) {
    if (!node || !detail) return;
    const tags = (node.tags || []).map(tag => `#${tag}`).join(' ');
    detail.innerHTML = `
      <p class="eyebrow">${escapeHtml(node.type)} / ${escapeHtml(node.group)}</p>
      <h2>${escapeHtml(node.label)}</h2>
      <p>${escapeHtml(node.summary || 'Curated knowledge node')}</p>
      ${tags ? `<p class="map-tags">${escapeHtml(tags)}</p>` : ''}
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
      showDetail(selected);
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
    zoom = Math.max(0.35, Math.min(2.6, zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    panX = event.clientX - canvas.getBoundingClientRect().left - before.x * zoom;
    panY = event.clientY - canvas.getBoundingClientRect().top - before.y * zoom;
  }, { passive: false });

  filters.forEach(button => {
    button.addEventListener('click', () => {
      filters.forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      activeFilter = button.dataset.mapFilter;
      applyFilters();
    });
  });

  search?.addEventListener('input', applyFilters);
  document.getElementById('fitMapButton')?.addEventListener('click', fitGraphToView);
  if (summary) summary.textContent = `${graph.note_count} curated notes · ${graph.node_count} nodes · ${graph.link_count} links · public-safe export`;
  resize();
  applyFilters();
  settleGraph();
  fitGraphToView();
  animate();
  window.addEventListener('resize', resize);
})();
