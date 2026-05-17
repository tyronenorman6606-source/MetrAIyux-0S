(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function horizontalSource(){
    const nav = document.querySelector('.site-header nav');
    if(nav && nav.scrollWidth > nav.clientWidth + 4) return nav;
    const wide = [...document.querySelectorAll('.table-wrap,.topnav,.route-grid,.command-table,.saas-table')].find((el) => el.scrollWidth > el.clientWidth + 4);
    return wide || document.scrollingElement || document.documentElement;
  }

  onReady(() => {
    if(document.querySelector('.mcp-neon-scroll-rail-y')) return;

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    document.body.append(yRail, xRail);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontalSource = horizontalSource();
    let raf = 0;

    function updateRails(){
      raf = 0;
      const doc = document.documentElement;
      const yTrack = yRail.clientHeight;
      const yMax = Math.max(1, doc.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(doc.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);
      yThumb.style.height = `${Math.floor(ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(yRatio * Math.max(0, yTrack - ySize))}px`);

      if(!activeHorizontalSource || !document.body.contains(activeHorizontalSource)){
        activeHorizontalSource = horizontalSource();
      }
      const xTrack = xRail.clientWidth;
      const xMax = Math.max(0, activeHorizontalSource.scrollWidth - activeHorizontalSource.clientWidth);
      const xRatio = xMax > 0 ? clamp(activeHorizontalSource.scrollLeft / xMax, 0, 1) : 0;
      const xSize = xMax > 0
        ? clamp((activeHorizontalSource.clientWidth / Math.max(activeHorizontalSource.scrollWidth, activeHorizontalSource.clientWidth)) * xTrack, 78, xTrack)
        : xTrack;
      xThumb.style.width = `${Math.floor(xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(xRatio * Math.max(0, xTrack - xSize))}px`);
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontalSource = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontalSource) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontalSource = candidate;
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
