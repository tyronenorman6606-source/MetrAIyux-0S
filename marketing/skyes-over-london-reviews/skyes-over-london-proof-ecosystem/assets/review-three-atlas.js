import * as THREE from 'three';

const stage = document.querySelector('[data-review-atlas-stage]');
const grid = document.getElementById('reviewGrid');
const sourceCards = Array.from(document.querySelectorAll('.review-card'));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact = window.matchMedia('(max-width: 760px)').matches;

if (stage && grid && sourceCards.length > 0) {
  const detail = {
    service: document.querySelector('[data-review-atlas-service]'),
    title: document.querySelector('[data-review-atlas-title]'),
    quote: document.querySelector('[data-review-atlas-quote]'),
    person: document.querySelector('[data-review-atlas-person]'),
    meta: document.querySelector('[data-review-atlas-meta]'),
    visible: document.querySelector('[data-review-atlas-visible]'),
    selected: document.querySelector('[data-review-atlas-selected]'),
    link: document.querySelector('[data-review-atlas-link]'),
  };

  sourceCards.forEach((card, index) => {
    card.dataset.reviewAtlasId = String(index);
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
  camera.position.set(0, compact ? 0.15 : 0.3, compact ? 7.4 : 8.2);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.1 : 1.45));
  renderer.setClearColor(0x000000, 0);
  stage.appendChild(renderer.domElement);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  const cardsGroup = new THREE.Group();
  const railGroup = new THREE.Group();
  scene.add(cardsGroup, railGroup);
  scene.add(new THREE.AmbientLight(0xffffff, 0.64));

  const blueLight = new THREE.PointLight(0x4fc3ff, 2.15, 18);
  blueLight.position.set(-3.5, 2.8, 4.8);
  scene.add(blueLight);

  const goldLight = new THREE.PointLight(0xf6c758, 1.85, 18);
  goldLight.position.set(3.8, -1.4, 4.2);
  scene.add(goldLight);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x4fc3ff,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  [2.2, 3.6, 5].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 10, 180), ringMaterial.clone());
    ring.rotation.x = Math.PI / 2 + index * 0.08;
    ring.rotation.z = index * 0.38;
    railGroup.add(ring);
  });

  const starGeometry = new THREE.BufferGeometry();
  const starCount = compact ? 150 : 320;
  const starPositions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const i = index * 3;
    starPositions[i] = (Math.random() - 0.5) * 11;
    starPositions[i + 1] = (Math.random() - 0.5) * 6;
    starPositions[i + 2] = (Math.random() - 0.5) * 7;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xf6c758,
      size: compact ? 0.012 : 0.018,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(stars);

  const state = {
    cards: [],
    meshes: [],
    selected: 0,
    spin: 0,
    targetSpin: 0,
    dragging: false,
    lastX: 0,
    queued: false,
  };

  function readReview(card) {
    const title = card.querySelector('h3')?.textContent?.trim() || 'Skyes Over London Review';
    const quote = card.querySelector('blockquote')?.textContent?.trim() || '';
    const service = card.dataset.service || card.querySelector('.review-service')?.textContent?.trim() || 'Service';
    const year = card.dataset.year || '';
    const impact = card.dataset.impact || '';
    const person = card.querySelector('footer strong')?.textContent?.trim() || 'Skyes Over London client';
    const label = card.querySelector('footer span')?.textContent?.trim() || '';
    const categories = (card.dataset.category || '').split(/\s+/).filter(Boolean);

    return {
      card,
      categories,
      impact,
      label,
      person,
      quote,
      service,
      title,
      year,
      url: card.dataset.reviewUrl || '#reviews',
    };
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(/\s+/).filter(Boolean);
    let line = '';
    let lines = 0;

    for (let index = 0; index < words.length; index += 1) {
      const test = line ? `${line} ${words[index]}` : words[index];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = words[index];
        y += lineHeight;
        lines += 1;
        if (lines >= maxLines - 1) break;
      } else {
        line = test;
      }
    }

    if (line && lines < maxLines) {
      const remaining = words.slice(words.indexOf(line.split(/\s+/).at(-1)) + 1).length;
      ctx.fillText(remaining > 0 ? `${line.replace(/[.,;:]?$/, '')}...` : line, x, y);
    }
  }

  function paletteFor(review) {
    if (review.categories.includes('web')) return ['#4fc3ff', '#112b4d', '#dff7ff'];
    if (review.categories.includes('staffing')) return ['#f6c758', '#33270d', '#fff4cf'];
    if (review.categories.includes('automation')) return ['#58f2ac', '#103727', '#d7ffe9'];
    if (review.categories.includes('ai')) return ['#bd8cff', '#281b3d', '#f1e5ff'];
    if (review.categories.includes('gov')) return ['#ff8f70', '#3b1f19', '#ffe0d6'];
    return ['#7ee7ff', '#11182d', '#edfaff'];
  }

  function makeReviewTexture(review, active = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    const [accent, deep, text] = paletteFor(review);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#070a13');
    gradient.addColorStop(0.5, deep);
    gradient.addColorStop(1, '#050609');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = active ? accent : 'rgba(255,255,255,.22)';
    ctx.lineWidth = active ? 9 : 4;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    ctx.globalAlpha = active ? 0.34 : 0.22;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(770, 72, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = accent;
    ctx.font = '900 26px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(review.service.toUpperCase(), 52, 74);

    ctx.fillStyle = '#f6c758';
    ctx.font = '900 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('★★★★★', 52, 126);

    ctx.fillStyle = text;
    ctx.font = '900 48px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    wrapText(ctx, review.title, 52, 194, 760, 54, 2);

    ctx.fillStyle = 'rgba(255,255,255,.86)';
    ctx.font = '500 30px Georgia, serif';
    wrapText(ctx, review.quote, 52, 318, 790, 39, 3);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 26px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(review.person, 52, 492);

    ctx.fillStyle = 'rgba(255,255,255,.64)';
    ctx.font = '800 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${review.impact || 'Impact'} / ${review.year || 'Year'}`, 52, 526);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function disposeMeshes() {
    state.meshes.forEach((mesh) => {
      mesh.material.map?.dispose();
      mesh.material.dispose();
      mesh.geometry.dispose();
      cardsGroup.remove(mesh);
    });
    state.meshes = [];
  }

  function visibleSourceCards() {
    const visible = sourceCards.filter((card) => {
      const hidden = card.classList.contains('hidden') || card.classList.contains('is-batched-hidden');
      return !hidden && card.getAttribute('aria-hidden') !== 'true';
    });
    return visible.length > 0 ? visible : sourceCards;
  }

  function updateDetail() {
    const review = state.cards[state.selected];
    if (!review) return;

    sourceCards.forEach((card) => card.classList.remove('is-atlas-selected'));
    review.card.classList.add('is-atlas-selected');

    if (detail.service) detail.service.textContent = review.service;
    if (detail.title) detail.title.textContent = review.title;
    if (detail.quote) detail.quote.textContent = review.quote;
    if (detail.person) detail.person.textContent = review.person;
    if (detail.meta) detail.meta.textContent = `${review.impact || 'Impact'} / ${review.year || 'Year'} / ${review.label}`;
    if (detail.selected) detail.selected.textContent = String(state.selected + 1).padStart(2, '0');
    if (detail.link) detail.link.href = review.url;

    state.meshes.forEach((mesh, index) => {
      const active = index === state.selected;
      mesh.material.map?.dispose();
      mesh.material.map = makeReviewTexture(state.cards[index], active);
      mesh.material.needsUpdate = true;
    });
  }

  function rebuildAtlas() {
    state.queued = false;
    disposeMeshes();

    const maxCards = compact ? 18 : 34;
    state.cards = visibleSourceCards().slice(0, maxCards).map(readReview);
    state.selected = Math.min(state.selected, Math.max(state.cards.length - 1, 0));

    state.cards.forEach((review, index) => {
      const geometry = new THREE.PlaneGeometry(2.35, 1.46, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        map: makeReviewTexture(review, index === state.selected),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.index = index;
      cardsGroup.add(mesh);
      state.meshes.push(mesh);
    });

    if (detail.visible) {
      detail.visible.textContent = `${state.cards.length} of ${visibleSourceCards().length}`;
    }
    updateDetail();
  }

  function queueRebuild() {
    if (state.queued) return;
    state.queued = true;
    requestAnimationFrame(rebuildAtlas);
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function setPointer(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  }

  function pick(event, commit = false) {
    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(state.meshes, false)[0];
    stage.classList.toggle('is-hovering-card', Boolean(hit));

    if (hit && commit) {
      state.selected = hit.object.userData.index;
      updateDetail();
      state.targetSpin = -((state.selected / Math.max(state.meshes.length, 1)) * Math.PI * 2);
    }
  }

  stage.addEventListener('pointerdown', (event) => {
    stage.setPointerCapture?.(event.pointerId);
    state.dragging = true;
    state.lastX = event.clientX;
    pick(event, true);
  });

  stage.addEventListener('pointermove', (event) => {
    pick(event, false);
    if (!state.dragging) return;
    const delta = event.clientX - state.lastX;
    state.lastX = event.clientX;
    state.targetSpin += delta * 0.008;
  });

  stage.addEventListener('pointerup', (event) => {
    state.dragging = false;
    pick(event, true);
  });

  stage.addEventListener('pointerleave', () => {
    state.dragging = false;
    stage.classList.remove('is-hovering-card');
  });

  stage.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    state.selected = (state.selected + step + state.cards.length) % state.cards.length;
    state.targetSpin = -((state.selected / Math.max(state.meshes.length, 1)) * Math.PI * 2);
    updateDetail();
  });

  function queueRebuildSoon() {
    window.setTimeout(queueRebuild, 80);
  }

  const observer = new MutationObserver(queueRebuild);
  observer.observe(grid, { childList: true });

  document.querySelectorAll('.filters button, #showMoreReviews, #resetReviews').forEach((control) => {
    control.addEventListener('click', queueRebuildSoon);
  });
  document.querySelectorAll('#reviewSearch, #reviewSort, #reviewView').forEach((control) => {
    control.addEventListener('input', queueRebuildSoon);
    control.addEventListener('change', queueRebuildSoon);
  });

  window.addEventListener('resize', resize, { passive: true });

  function animate(time = 0) {
    const seconds = time * 0.001;
    if (!reduceMotion && !state.dragging) state.targetSpin += 0.0012;
    state.spin += (state.targetSpin - state.spin) * 0.08;

    const count = Math.max(state.meshes.length, 1);
    const radius = compact ? 3.05 : 4.25;
    state.meshes.forEach((mesh, index) => {
      const angle = (index / count) * Math.PI * 2 + state.spin;
      const lane = ((index % 5) - 2) * (compact ? 0.18 : 0.24);
      const active = index === state.selected;
      mesh.position.set(Math.sin(angle) * radius, lane, Math.cos(angle) * radius * 0.46);
      mesh.lookAt(camera.position);
      mesh.scale.setScalar(active ? 1.28 : 0.92 + Math.max(Math.cos(angle), 0) * 0.12);
      mesh.material.opacity = active ? 1 : 0.48 + Math.max(Math.cos(angle), 0) * 0.34;
      mesh.position.y += active ? 0.18 + Math.sin(seconds * 1.7) * 0.025 : Math.sin(seconds + index) * 0.018;
    });

    railGroup.rotation.z = seconds * 0.035;
    railGroup.rotation.y = state.spin * 0.16;
    stars.rotation.y = seconds * 0.025;
    renderer.render(scene, camera);

    window.__skyeReviewAtlas = {
      active: true,
      cards: state.cards.length,
      library: 'three',
      selected: state.selected,
      revision: THREE.REVISION,
      lastFrame: Math.round(time),
    };

    requestAnimationFrame(animate);
  }

  resize();
  rebuildAtlas();
  window.setTimeout(queueRebuild, 160);
  requestAnimationFrame(animate);
}
