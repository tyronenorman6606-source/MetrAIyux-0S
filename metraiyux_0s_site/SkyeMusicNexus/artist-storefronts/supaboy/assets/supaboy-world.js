(() => {
  const stageData = {
    hero: {
      image: './media/hero-night.webp',
      kicker: 'live world',
      title: 'Hero Night',
      copy: "SupaBoy's public lane opens with the real visual world instead of a folder shell."
    },
    slb: {
      image: './media/slb-cover.webp',
      kicker: 'featured project',
      title: 'SLB / Superboy',
      copy: 'Six records in motion: My Side, On & On, So Crazy, Friendzone, Come My Way, and Lie.'
    },
    houston: {
      image: './media/houston-proof.webp',
      kicker: 'release proof',
      title: '24 Hr In Houston',
      copy: '344,044 all-time streams shown on the proof visual. Released May 3, 2024.'
    },
    chicago: {
      image: './media/chicago-walk.webp',
      kicker: 'story lane',
      title: 'Nigerian roots. Chicago grind.',
      copy: "Roots, pressure, motion, and the line that keeps coming back: The Grind Don't Stop."
    },
    live: {
      image: './media/night-motion.webp',
      kicker: 'live lane',
      title: 'iamsuperboy2x',
      copy: 'Twitch energy, shouts, clips, requests, TTP, and the room around SupaBoy.'
    }
  };

  const productFallback = window.SUPABOY_PRODUCT_FALLBACK || { products: [] };
  const productEls = {
    roster: document.querySelector('[data-product-roster]'),
    grid: document.querySelector('[data-product-grid]'),
    title: document.querySelector('[data-product-title]'),
    description: document.querySelector('[data-product-description]'),
    cover: document.querySelector('[data-product-cover]'),
    status: document.querySelector('[data-product-status]'),
    pill: document.querySelector('[data-product-status-pill]'),
    actions: document.querySelector('[data-product-actions]')
  };
  let productList = [];
  let selectedProduct = 0;
  let toastTimer = 0;

  function normalizePath(path) {
    const isProductPage = document.documentElement.dataset.supaboySurface === 'products';
    if (!path || /^(https?:|mailto:|tel:|#)/i.test(path)) return path;
    if (isProductPage) return path;
    return path.replace(/^\.\.\//, './').replace(/^\.\//, './');
  }

  function setStatus(message) {
    if (productEls.status) productEls.status.textContent = message;
    const inquiry = document.querySelector('[data-inquiry-status]');
    if (inquiry && !productEls.status) inquiry.textContent = message;
    let toast = document.querySelector('[data-supaboy-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'supaboy-toast';
      toast.dataset.supaboyToast = 'true';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  function setStage(id) {
    const stage = stageData[id] || stageData.hero;
    const image = document.querySelector('[data-stage-image]');
    const title = document.querySelector('[data-stage-title]');
    const kicker = document.querySelector('[data-stage-kicker]');
    const copy = document.querySelector('[data-stage-copy]');
    if (image) {
      image.src = normalizePath(stage.image);
      image.alt = stage.title;
    }
    if (title) title.textContent = stage.title;
    if (kicker) kicker.textContent = stage.kicker;
    if (copy) copy.textContent = stage.copy;
    document.querySelectorAll('[data-stage]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.stage === id);
    });
  }

  function openMedia(src, title) {
    const lightbox = document.querySelector('[data-lightbox]');
    const image = document.querySelector('[data-lightbox-image]');
    const label = document.querySelector('[data-lightbox-title]');
    if (!lightbox || !image) return;
    image.src = normalizePath(src);
    image.alt = title || 'SupaBoy media';
    if (label) label.textContent = title || 'SupaBoy media';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMedia() {
    const lightbox = document.querySelector('[data-lightbox]');
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async function copyCurrentLink() {
    const url = window.location.href;
    copyText(url, 'Link copied.');
  }

  async function copyText(value, successMessage = 'Copied.') {
    const text = String(value || '');
    try {
      await navigator.clipboard.writeText(text);
      setStatus(successMessage);
    } catch {
      setStatus(text);
    }
  }

  function actionButton(product) {
    if (!product.actionUrl) return '';
    const href = product.actionUrl;
    const label = product.actionLabel || 'Open';
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(href)) {
      return `<button class="sb-button primary" type="button" data-open-media="${escapeAttr(href)}" data-media-title="${escapeAttr(product.title)}">${escapeHtml(label)}</button>`;
    }
    return `<a class="sb-button primary" href="${escapeAttr(href)}"${/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(label)}</a>`;
  }

  function renderProductRoster() {
    if (!productEls.roster) return;
    const header = productEls.roster.querySelector('.sb-eyebrow') || null;
    productEls.roster.replaceChildren();
    if (header) productEls.roster.append(header);
    productList.forEach((product, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.selectProduct = String(index);
      button.className = index === selectedProduct ? 'is-active' : '';
      button.innerHTML = `<strong>${escapeHtml(product.title || 'Product')}</strong><span>${escapeHtml(statusText(product.status))}</span>`;
      productEls.roster.append(button);
    });
  }

  function renderProductGrid() {
    if (!productEls.grid) return;
    productEls.grid.replaceChildren();
    productList.forEach((product, index) => {
      const article = document.createElement('article');
      article.className = 'product-card';
      article.id = product.productId === 'prod_supaboy_slb_project_pass'
        ? 'product-slb'
        : product.productId === 'prod_supaboy_houston_proof_packet'
          ? 'product-houston'
          : product.productId || `product-${index}`;
      article.innerHTML = `
        <img src="${escapeAttr(product.coverImage || '../media/slb-cover.webp')}" alt="${escapeAttr(product.title || 'SupaBoy product')}">
        <span class="status-pill">${escapeHtml(statusText(product.status))}</span>
        <h3>${escapeHtml(product.title || 'Product')}</h3>
        <p>${escapeHtml(product.description || '')}</p>
        <div class="product-actions">
          <button class="sb-button" type="button" data-select-product="${index}">Inspect</button>
          ${actionButton(product)}
        </div>
      `;
      productEls.grid.append(article);
    });
  }

  function selectProduct(index) {
    if (!productList.length) return;
    selectedProduct = Math.max(0, Math.min(productList.length - 1, Number(index) || 0));
    const product = productList[selectedProduct];
    if (productEls.title) productEls.title.textContent = product.title || 'Product';
    if (productEls.description) productEls.description.textContent = product.description || '';
    if (productEls.cover) {
      productEls.cover.src = product.coverImage || '../media/slb-cover.webp';
      productEls.cover.alt = product.title || 'SupaBoy product cover';
    }
    if (productEls.pill) productEls.pill.textContent = statusText(product.status);
    if (productEls.actions) {
      const locked = product.checkoutEnabled
        ? '<button class="sb-button primary" type="button" data-checkout-product>Checkout</button>'
        : '<span class="sb-button disabled" aria-disabled="true">Checkout pending</span>';
      productEls.actions.innerHTML = `${actionButton(product)}${locked}<button class="sb-button" type="button" data-share-product>Share</button>`;
    }
    renderProductRoster();
    setStatus(product.checkoutEnabled ? 'Checkout can be created for this product.' : 'Checkout is locked until paperwork, rights, audio, and owner review pass.');
  }

  async function loadProducts() {
    if (!productEls.roster && !productEls.grid) return;
    try {
      const response = await fetch('./products.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      productList = Array.isArray(payload.products) ? payload.products : [];
    } catch {
      productList = Array.isArray(productFallback.products) ? productFallback.products : [];
    }
    if (!productList.length) {
      setStatus('No SupaBoy product lanes are staged yet.');
      return;
    }
    renderProductGrid();
    const hash = window.location.hash.replace('#', '');
    const requested = productList.findIndex((product) => {
      if (hash === 'product-slb') return product.productId === 'prod_supaboy_slb_project_pass';
      if (hash === 'product-houston') return product.productId === 'prod_supaboy_houston_proof_packet';
      return product.productId === hash || product.id === hash;
    });
    selectProduct(requested >= 0 ? requested : 0);
  }

  function statusText(status) {
    return String(status || 'queued').replace(/_/g, ' ');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  document.addEventListener('click', async (event) => {
    const stageButton = event.target.closest('[data-stage]');
    if (stageButton) {
      setStage(stageButton.dataset.stage);
      return;
    }

    const mediaButton = event.target.closest('[data-open-media]');
    if (mediaButton) {
      openMedia(mediaButton.dataset.openMedia, mediaButton.dataset.mediaTitle);
      return;
    }

    if (event.target.closest('[data-lightbox-close]')) {
      closeMedia();
      return;
    }

    const selectButton = event.target.closest('[data-select-product]');
    if (selectButton) {
      selectProduct(selectButton.dataset.selectProduct);
      document.querySelector('#desk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (event.target.closest('[data-share-product]')) {
      const product = productList[selectedProduct] || {};
      const shareUrl = new URL(window.location.href);
      shareUrl.hash = product.productId || '';
      try {
        if (navigator.share) await navigator.share({ title: product.title || document.title, url: shareUrl.toString() });
        else await navigator.clipboard.writeText(shareUrl.toString());
        setStatus('Share link ready.');
      } catch {
        setStatus('Share link is in the address bar.');
      }
      return;
    }

    if (event.target.closest('[data-checkout-product]')) {
      setStatus('Checkout stays locked until owner approval is complete.');
      return;
    }

    const copyTextButton = event.target.closest('[data-copy-text]');
    if (copyTextButton) {
      copyText(copyTextButton.dataset.copyText, copyTextButton.dataset.copyMessage || 'Copied.');
      return;
    }

    if (event.target.closest('[data-copy-link]')) {
      copyCurrentLink();
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-supaboy-inquiry]');
    if (!form) return;
    event.preventDefault();
    const status = form.querySelector('[data-inquiry-status]');
    if (status) status.textContent = 'Inquiry staged on this page. Use the shared gate or Twitch lane for the fastest handoff.';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMedia();
  });

  document.querySelector('[data-lightbox]')?.addEventListener('click', (event) => {
    if (event.target.matches('[data-lightbox]')) closeMedia();
  });

  loadProducts();
})();
