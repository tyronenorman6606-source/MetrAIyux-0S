import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { BadgeCheck, Database, KeyRound, ServerCog, ShieldCheck } from 'lucide-react';
import './scroll-proof-funnel.css';

gsap.registerPlugin(ScrollTrigger);

const defaultSteps = [
  { title: 'Authenticate', body: 'Buyer enters through the gate first.', icon: KeyRound },
  { title: 'Provision', body: 'The private system is staged around the offer.', icon: ServerCog },
  { title: 'Prove', body: 'Backups, restore checks, and receipts are made client-safe.', icon: ShieldCheck },
  { title: 'Handoff', body: 'Client gets the right dashboard, access, and next action.', icon: Database }
];

export function ScrollProofFunnel({ steps = defaultSteps }) {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const lenis = new Lenis({ lerp: 0.18, smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    lenis.on('scroll', ScrollTrigger.update);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.proof-step').forEach((step, index) => {
        gsap.fromTo(step, { opacity: 0.28, y: 40 }, {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: step,
            start: 'top 72%',
            end: 'bottom 42%',
            scrub: true
          }
        });
        gsap.to(`.proof-rail__fill-${index}`, {
          scaleY: 1,
          transformOrigin: 'top',
          scrollTrigger: {
            trigger: step,
            start: 'top 78%',
            end: 'bottom 40%',
            scrub: true
          }
        });
      });
    }, rootRef);

    return () => {
      ctx.revert();
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return (
    <section className="proof-funnel" ref={rootRef}>
      <div className="proof-funnel__intro">
        <p>SCROLL PROOF FUNNEL</p>
        <h2>Make the process feel inevitable.</h2>
        <span>Every stage earns trust before asking for conversion.</span>
      </div>
      <div className="proof-funnel__steps">
        {steps.map((step, index) => {
          const Icon = step.icon || BadgeCheck;
          return (
            <article className="proof-step" key={step.title}>
              <div className="proof-rail">
                <span className={`proof-rail__fill proof-rail__fill-${index}`} />
              </div>
              <Icon />
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
