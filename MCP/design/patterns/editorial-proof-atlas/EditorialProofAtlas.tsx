import { motion } from 'framer-motion';
import { FileCheck2, PlayCircle, ShieldCheck } from 'lucide-react';
import './editorial-proof-atlas.css';

const proofItems = [
  ['01', 'Live surface', 'Actual browser screenshot or video leads the section.'],
  ['02', 'Receipt layer', 'Short client-safe evidence explains what was proven.'],
  ['03', 'Handoff', 'The buyer sees the next operational step without dev noise.']
];

export function EditorialProofAtlas() {
  return (
    <section className="editorial-atlas">
      <div className="editorial-atlas__kicker">Editorial proof atlas</div>
      <div className="editorial-atlas__grid">
        <motion.div className="editorial-atlas__headline" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true }}>
          <h1>Proof arranged like a magazine spread, not a card dump.</h1>
          <p>Use this when the product has screenshots, receipts, founder notes, or before-after states that need editorial weight.</p>
        </motion.div>
        <motion.figure className="editorial-atlas__media" whileHover={{ y: -8 }}>
          <div className="editorial-atlas__screen">
            <PlayCircle />
            <span>surface proof reel</span>
          </div>
          <figcaption>Primary media is the story anchor.</figcaption>
        </motion.figure>
      </div>
      <div className="editorial-atlas__proofs">
        {proofItems.map(([num, title, body], index) => (
          <motion.article key={title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.52, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true }}>
            {index === 0 ? <FileCheck2 /> : <ShieldCheck />}
            <span>{num}</span>
            <strong>{title}</strong>
            <p>{body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
