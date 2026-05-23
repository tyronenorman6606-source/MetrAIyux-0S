import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { motion } from 'framer-motion';
import { useLayoutEffect } from 'react';
import './kinetic-process-funnel.css';

gsap.registerPlugin(ScrollTrigger);

const stages = [
  ['Intake', 'Capture the buyer, account, or workspace intent.'],
  ['Gate', 'Authenticate, approve, or qualify access.'],
  ['Provision', 'Create records, routes, files, or mailboxes.'],
  ['Proof', 'Show browser evidence and handoff receipts.']
];

export function KineticProcessFunnel() {
  useLayoutEffect(() => {
    let frame = 0;
    const lenis = new Lenis({ lerp: 0.22, smoothWheel: true });
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    lenis.on('scroll', ScrollTrigger.update);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.kinetic-funnel__stage').forEach((stage, index) => {
        gsap.fromTo(stage, { opacity: 0.3, x: index % 2 ? 80 : -80 }, {
          opacity: 1,
          x: 0,
          scrollTrigger: { trigger: stage, start: 'top 82%', end: 'bottom 48%', scrub: true }
        });
      });
    });

    return () => {
      ctx.revert();
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return (
    <section className="kinetic-funnel">
      <div className="kinetic-funnel__intro">
        <p>Kinetic process funnel</p>
        <h1>Make the workflow move like a system turning on.</h1>
      </div>
      <div className="kinetic-funnel__stages">
        {stages.map(([title, body], index) => (
          <motion.article className="kinetic-funnel__stage" key={title} whileHover={{ scale: 1.015 }}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
