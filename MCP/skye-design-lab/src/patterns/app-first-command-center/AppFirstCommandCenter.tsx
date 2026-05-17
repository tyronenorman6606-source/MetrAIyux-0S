import { motion } from 'motion/react';
import { Activity, BadgeCheck, Database, KeyRound, ServerCog, ShieldCheck, TerminalSquare, type LucideIcon } from 'lucide-react';
import './app-first-command-center.css';

const status: Array<[string, string, LucideIcon]> = [
  ['Gate', 'Authenticated', KeyRound],
  ['Pattern', 'App-first surface', TerminalSquare],
  ['Proof', 'Client-safe', ShieldCheck],
  ['Deploy', 'Browser QA required', ServerCog]
];

export function AppFirstCommandCenter() {
  return (
    <section className="command-center">
      <div className="command-center__copy">
        <p>APP-FIRST COMMAND CENTER</p>
        <h1>Show the actual control surface first.</h1>
        <span>When the product is a tool, the first viewport should behave like a tool, not a brochure.</span>
      </div>

      <motion.div className="command-center__surface" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
        <header>
          <div>
            <strong>Skye MCP Control</strong>
            <span>Design generation runtime</span>
          </div>
          <button>Run quality gate</button>
        </header>

        <div className="command-center__grid">
          <aside>
            <a className="active"><Database size={17} /> Patterns</a>
            <a><Activity size={17} /> Motion</a>
            <a><ShieldCheck size={17} /> Proof</a>
            <a><TerminalSquare size={17} /> Validator</a>
          </aside>

          <main>
            <div className="status-grid">
              {status.map(([label, value, Icon]) => (
                <article key={label}>
                  <Icon size={18} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>

            <section className="console-card">
              <p>Selected composition</p>
              <h2>client.surface.app-first-command-center</h2>
              <div className="check-list">
                <span><BadgeCheck size={16} /> Primary pattern selected</span>
                <span><BadgeCheck size={16} /> No-frankenstein policy active</span>
                <span><BadgeCheck size={16} /> Advanced stack used with purpose</span>
              </div>
            </section>
          </main>
        </div>
      </motion.div>
    </section>
  );
}
