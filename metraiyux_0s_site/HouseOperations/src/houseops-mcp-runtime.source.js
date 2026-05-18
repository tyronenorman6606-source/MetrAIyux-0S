import { animate as framerAnimate } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as motion from 'motion';

const EASE_EXPO_OUT = [0.16, 1, 0.3, 1];

function bootHouseOpsMcpRuntime() {
  if (window.__houseOpsMcpRuntime?.ready) return;

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = new Lenis({
    lerp: 0.16,
    smoothWheel: true,
    anchors: true
  });
  let frame = 0;

  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time) => {
    lenis.raf(time);
    frame = window.requestAnimationFrame(raf);
  };
  frame = window.requestAnimationFrame(raf);

  window.__houseOpsMcpRuntime = {
    ready: true,
    framerMotion: true,
    motion: true,
    motionReady: true,
    gsap: true,
    gsapReady: true,
    lenis: true,
    lenisReady: true,
    lenisLerp: 0.16,
    scrollTriggers: 0,
    cleanup() {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    }
  };

  if (reduceMotion) {
    document.documentElement.dataset.houseopsMcpRuntime = 'reduced-motion';
    return;
  }

  framerAnimate('.brandMark', { scale: [0.96, 1], opacity: [0.78, 1] }, {
    duration: 0.58,
    easing: EASE_EXPO_OUT
  });

  motion.animate('.nav a, .kpi, .panel, .runwayTile, .missionPlate', { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] }, {
    duration: 0.52,
    delay: motion.stagger(0.035),
    easing: EASE_EXPO_OUT
  });

  gsap.utils.toArray('.commandMarquee, .panel').forEach((node, index) => {
    gsap.fromTo(node, { y: 18, autoAlpha: 0.92 }, {
      y: 0,
      autoAlpha: 1,
      duration: 0.56,
      ease: 'power3.out',
      delay: Math.min(index * 0.025, 0.18),
      scrollTrigger: {
        trigger: node,
        start: 'top 92%',
        once: true
      }
    });
  });

  window.__houseOpsMcpRuntime.scrollTriggers = ScrollTrigger.getAll().length;
  document.documentElement.dataset.houseopsMcpRuntime = 'ready';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHouseOpsMcpRuntime, { once: true });
} else {
  bootHouseOpsMcpRuntime();
}
