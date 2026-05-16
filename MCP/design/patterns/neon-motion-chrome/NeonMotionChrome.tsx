import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import './neon-motion-chrome.css';

type NeonMotionChromeProps = {
  label?: string;
  children?: ReactNode;
};

export function NeonMotionChrome({ label = 'LIVE MOTION CHROME', children }: NeonMotionChromeProps) {
  const pointerX = useMotionValue(-200);
  const pointerY = useMotionValue(-200);
  const springX = useSpring(pointerX, { stiffness: 260, damping: 34, mass: 0.35 });
  const springY = useSpring(pointerY, { stiffness: 260, damping: 34, mass: 0.35 });
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { stiffness: 180, damping: 32 });
  const scanShift = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [pointerX, pointerY]);

  return (
    <div className="neon-motion-chrome" data-motion-chrome>
      <motion.div
        className="neon-scroll-progress"
        style={{ scaleX: progressScale }}
        aria-hidden="true"
      />
      <motion.div
        className="neon-scanline"
        style={{ backgroundPositionX: scanShift }}
        aria-hidden="true"
      />
      <motion.div
        className="neon-cursor-trail"
        style={{ x: springX, y: springY }}
        aria-hidden="true"
      />
      <div className="neon-motion-chrome__label">{label}</div>
      {children}
    </div>
  );
}
