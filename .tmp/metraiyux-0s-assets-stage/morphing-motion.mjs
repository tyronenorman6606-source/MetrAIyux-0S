import * as motionNext from 'motion';

const animate = motionNext.animate;

window.__metraiyuxMotionLoaded = true;

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function parseMorphingTexts(el){
  try{
    const parsed = JSON.parse(el.dataset.morphingText || '[]');
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  }catch(_err){
    return String(el.dataset.morphingText || '').split('|').map(item => item.trim()).filter(Boolean);
  }
}

function sizeMorphingText(el, texts){
  const longest = texts.reduce((max, item) => Math.max(max, item.length), el.textContent.trim().length || 1);
  el.style.setProperty('--morph-chars', String(Math.min(Math.max(longest, 10), 24)));
}

function initMotionMorphingText(el){
  if(el.dataset.morphingActive === 'true') return;
  const texts = parseMorphingTexts(el);
  if(!texts.length) return;

  let index = Math.max(0, texts.indexOf(el.textContent.trim()));
  el.dataset.morphingActive = 'true';
  el.dataset.motionProvider = 'motion';
  el.setAttribute('aria-live', 'polite');
  sizeMorphingText(el, texts);

  if(reducedMotion || texts.length < 2) return;

  window.setInterval(async () => {
    index = (index + 1) % texts.length;
    await animate(
      el,
      { opacity: [1, .26], filter: ['blur(0px)', 'blur(4px)'], transform: ['translateY(0) scale(1)', 'translateY(-7px) scale(.99)'] },
      { duration: .24, easing: [.16, 1, .3, 1] }
    ).finished;
    el.textContent = texts[index];
    animate(
      el,
      { opacity: [.26, 1], filter: ['blur(4px)', 'blur(0px)'], transform: ['translateY(8px) scale(1.01)', 'translateY(0) scale(1)'] },
      { duration: .42, easing: [.16, 1, .3, 1] }
    );
  }, 2200);
}

function initMotionProgress(){
  const progress = document.querySelector('.motion-progress i');
  if(!progress) return;

  let ticking = false;
  let lastScale = 0;
  const update = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const nextScale = Math.min(1, Math.max(0, window.scrollY / max));
    if(Math.abs(nextScale - lastScale) > .003){
      lastScale = nextScale;
      progress.style.transform = `scaleX(${nextScale})`;
      animate(progress, { opacity: [.72, 1] }, { duration: .18, easing: 'linear' });
    }
    ticking = false;
  };
  const requestUpdate = () => {
    if(ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
}

function initMotionCursorGlow(){
  const glow = document.querySelector('.motion-cursor-glow');
  const finePointer = window.matchMedia?.('(pointer: fine)').matches;
  if(!glow || !finePointer || reducedMotion) return;

  let ticking = false;
  let targetX = -400;
  let targetY = -400;
  const paint = () => {
    glow.style.transform = `translate3d(${targetX}px,${targetY}px,0)`;
    animate(glow, { opacity: .86 }, { duration: .36, easing: [.16, 1, .3, 1] });
    ticking = false;
  };

  window.addEventListener('pointermove', event => {
    targetX = event.clientX - 140;
    targetY = event.clientY - 140;
    if(ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }, { passive: true });
}

function boot(){
  document.querySelectorAll('.morphing-text[data-morphing-text]').forEach(initMotionMorphingText);
  initMotionProgress();
  initMotionCursorGlow();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot, { once: true });
}else{
  boot();
}
