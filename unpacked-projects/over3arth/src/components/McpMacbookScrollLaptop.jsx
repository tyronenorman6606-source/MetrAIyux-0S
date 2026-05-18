import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

export const MCP_MACBOOK_COMPONENT_SOURCE = 'MCP/skye-design-lab/Compoents/macbook-animation';

const macbookEase = [0.12, 0.88, 0.18, 1];

export default function McpMacbookScrollLaptop({
  open,
  accent = '#b85cff',
  gold = '#ffd35c',
  screen,
  worldName,
  activeGate,
  selectedRealm,
  gates,
  voiceEnabled,
  onWake,
  onToggleVoice,
  onTravelGate
}) {
  return (
    <motion.figure
      className="mcp-macbook-scroll overearth-mcp-macbook"
      data-mcp-component={MCP_MACBOOK_COMPONENT_SOURCE}
      data-motion-source="mcp-macbook-scroll"
      data-open={open ? 'true' : 'false'}
      style={{ '--macbook-accent': accent, '--macbook-gold': gold }}
      initial={false}
      animate={{ opacity: 1, scale: open ? 1 : 0.95, y: open ? 0 : 4 }}
      transition={{ duration: open ? 1.1 : 0.72, ease: macbookEase }}
      aria-label="Overearth MCP MacBook scroll component"
    >
      <span className="mcp-macbook-scroll__aura" aria-hidden="true" />

      <motion.div
        className="mcp-macbook-scroll__lid macbook-lid"
        initial={false}
        animate={open
          ? { rotateX: 0, y: 0, scaleY: 1, filter: 'brightness(1) saturate(1)' }
          : { rotateX: 64, y: 74, scaleY: 0.48, filter: 'brightness(0.62) saturate(0.78)' }}
        transition={{ duration: open ? 1.45 : 0.92, ease: macbookEase }}
      >
        <span className="macbook-camera" aria-hidden="true" />
        <div className="mcp-macbook-scroll__screen" aria-hidden={!open}>
          {screen}
          <span className="macbook-screen-gloss" aria-hidden="true" />
        </div>
      </motion.div>

      <motion.div
        className="mcp-macbook-scroll__hinge"
        initial={false}
        animate={{ opacity: open ? 1 : 0.62, scaleX: open ? 1 : 0.86 }}
        transition={{ duration: open ? 1.1 : 0.62, ease: macbookEase }}
        aria-hidden="true"
      >
        <span />
        <span />
      </motion.div>

      <motion.div
        className="mcp-macbook-scroll__base macbook-base"
        initial={false}
        animate={{ rotateX: open ? 56 : 58, y: open ? 0 : -4 }}
        transition={{ duration: open ? 1.18 : 0.72, ease: macbookEase }}
        aria-hidden={!open}
      >
        {open ? (
          <>
            <motion.div
              className="mcp-macbook-scroll__console"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.68, delay: 0.74, ease: macbookEase }}
            >
              <div className="mcp-macbook-scroll__status">
                <span>{worldName}</span>
                <span>{activeGate.worldName}</span>
                <span>{selectedRealm.name}</span>
              </div>
              <div className="mcp-macbook-scroll__keys" aria-label="Overearth destination keys">
                {gates.slice(0, 10).map((gate) => {
                  const Icon = gate.icon;
                  return (
                    <button
                      key={gate.id}
                      type="button"
                      className={activeGate.id === gate.id ? 'active' : ''}
                      style={{ '--key-color': gate.id === activeGate.id ? gold : accent }}
                      onClick={() => onTravelGate(gate, true)}
                      title={gate.worldName}
                      aria-label={`Travel to ${gate.worldName}`}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
            </motion.div>
            <motion.div
              className="mcp-macbook-scroll__palm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.56, delay: 0.86, ease: macbookEase }}
            >
              <span>Overearth online</span>
              <button type="button" className={voiceEnabled ? 'listening' : ''} onClick={onToggleVoice} aria-label={voiceEnabled ? 'Stop Auren listening' : 'Start Auren listening'}>
                <Mic size={14} />
              </button>
            </motion.div>
          </>
        ) : null}
      </motion.div>

      {!open ? (
        <button type="button" className="mcp-macbook-scroll__wake" onClick={onWake} aria-label="Open Overearth laptop" />
      ) : null}
    </motion.figure>
  );
}
