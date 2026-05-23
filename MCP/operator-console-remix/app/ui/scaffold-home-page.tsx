import { css } from 'remix/ui'

import { Document } from './document.tsx'

const fontStack =
  '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const recipeRows = [
  ['Threshold Worlds', 'Three.js scenes, CSS depth, pointer parallax, real entry rituals'],
  ['Proof Ledgers', 'MCP resources, smoke artifacts, browser captures, signed receipts'],
  ['Gate-Owned Access', '0S/NorthStar sessions, owner-admin bearer, no public protocol reads'],
  ['Client Worlds', 'Barbershop, house tour, studio, gym, restaurant, legal room, dispatch floor'],
]

const stackRows = [
  ['Remix 3 beta', 'model-first routes, controllers, middleware, assets'],
  ['Three.js', 'real spatial objects instead of flat hero decoration'],
  ['GSAP + Lenis', 'scroll-led scene choreography and stage progress'],
  ['GSAP microinteractions', 'pointer polish and state motion without a heavy client shell'],
  ['MCP TypeScript SDK', 'resources, tools, prompts, Streamable HTTP protocol'],
  ['Cloudflare Workers', 'gate-owned edge runtime with static assets and Worker-first routes'],
]

const worldModes = [
  ['House', 'Sidewalk, lock glow, owner code, room-by-room reveal'],
  ['Barber', 'Chair, mirror, booking rail, service wall, aftercare proof'],
  ['Studio', 'Console, lights, stems, rights vault, booking booth'],
  ['Dispatch', 'Map table, route pins, crew states, invoice handoff'],
]

const operatorTargets = [
  ['operator-console', 'MCP Operator Console'],
  ['skye-design-lab', 'Skye Design Lab'],
  ['mcp-root', 'QuantumSkyes MCP Root'],
  ['skyesol-public', 'SkyeSol Public Site'],
  ['metraiyux-0s', 'MetrAIyux 0S'],
  ['bobs-smoke-shop', "Bob's Smoke Shop"],
  ['empire-pallets', 'Empire Pallets'],
]

const operatorArchetypes = [
  ['house-threshold', 'House Threshold'],
  ['barber-shop', 'Barber Shop Walkthrough'],
  ['studio-booth', 'Studio Control Room'],
  ['dispatch-floor', 'Dispatch Floor'],
  ['legal-war-room', 'Legal War Room'],
  ['restaurant-host-stand', 'Restaurant Host Stand'],
]

export function HomePage() {
  return () => (
    <Document head={<HomeHead />} title="QuantumSkyes MCP Control Room">
      <main mix={pageStyle}>
        <canvas
          id="threshold-canvas"
          data-mcp-living-background
          aria-hidden="true"
          mix={canvasStyle}
        ></canvas>
        <div id="threshold-scroll-chrome" data-mcp-motion-chrome aria-hidden="true"></div>
        <div id="threshold-cursor-trail" data-mcp-cursor-trail aria-hidden="true"></div>
        <div mix={grainStyle} aria-hidden="true"></div>
        <TopRail />
        <section mix={heroStyle}>
          <div mix={walkwayStyle} aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div mix={copyStyle}>
            <p mix={eyebrowStyle}>QuantumSkyes MCP Control Room</p>
            <h1 mix={heroTitleStyle} data-mcp-text-scan>
              Walk the client into the world before the first click.
            </h1>
            <p mix={heroBodyStyle}>
              This is the new control-room prototype for building immersive MCP-backed product
              worlds: gate-owned entry, live protocol proof, world recipes, and source-backed
              creative infrastructure in one operator surface.
            </p>
            <div mix={actionsStyle}>
              <a href="/api/status">Check live MCP</a>
              <a href="https://skye-design-mcp.pages.dev/mcp">Protocol endpoint</a>
              <a href="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html">
                Owner unlock
              </a>
            </div>
          </div>
          <DoorConsole />
        </section>
        <section mix={controlSurfaceStyle}>
          <div mix={panelStyle}>
            <p mix={eyebrowStyle}>Live system</p>
            <h2 mix={sectionTitleStyle}>The MCP is the engine, not the brochure.</h2>
            <p mix={sectionBodyStyle}>
              This console treats the MCP as infrastructure for building scenes, gates, proof
              systems, audits, and client-specific worlds. The website becomes a room. The room has
              states. The states are proven by the protocol.
            </p>
          </div>
          <div mix={statusGridStyle}>
            {recipeRows.map(([label, body], index) => (
              <article key={label} mix={statusCardStyle}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{label}</strong>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section mix={worldLabStyle}>
          <div mix={sectionHeadingStyle}>
            <p mix={eyebrowStyle}>World presets</p>
            <h2 mix={sectionTitleStyle}>Stop making pages. Start minting places.</h2>
          </div>
          <div mix={modeGridStyle}>
            {worldModes.map(([label, body]) => (
              <article key={label} mix={modeCardStyle}>
                <strong>{label}</strong>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <OperatorWorkbench />
        <section mix={stackSectionStyle}>
          <div mix={sectionHeadingStyle}>
            <p mix={eyebrowStyle}>Open-source build stack</p>
            <h2 mix={sectionTitleStyle}>Pull in tools that make the screen behave like a set.</h2>
          </div>
          <div mix={stackListStyle}>
            {stackRows.map(([label, body]) => (
              <article key={label} mix={stackRowStyle}>
                <strong>{label}</strong>
                <span>{body}</span>
              </article>
            ))}
          </div>
        </section>
        <section mix={proofDeckStyle}>
          <div>
            <p mix={eyebrowStyle}>Proof route</p>
            <h2 mix={sectionTitleStyle}>Every claimed world needs a receipt.</h2>
          </div>
          <ol mix={proofStepsStyle}>
            <li>Choose archetype and physical metaphor.</li>
            <li>Bind gate state to the world entry.</li>
            <li>Use MCP recipes for scene, motion, proof, and QA.</li>
            <li>Capture desktop and mobile browser evidence.</li>
          </ol>
        </section>
      </main>
    </Document>
  )
}

function OperatorWorkbench() {
  return () => (
    <section mix={operatorSectionStyle} id="operator">
      <div mix={sectionHeadingStyle}>
        <p mix={eyebrowStyle}>Operator workbench</p>
        <h2 mix={sectionTitleStyle}>This cockpit now talks to the actual MCP.</h2>
        <p mix={sectionBodyStyle}>
          Pick a repo target, choose a world archetype, ask the local QuantumSkyes MCP for the
          recipe plan, build a portable threshold-world artifact, mine the target, and inspect the
          proof ledger from one surface.
        </p>
      </div>
      <div mix={operatorShellStyle}>
        <div mix={operatorControlsStyle}>
          <label>
            <span>Target</span>
            <select data-operator-target defaultValue="operator-console">
              {operatorTargets.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>World</span>
            <select data-operator-archetype defaultValue="house-threshold">
              {operatorArchetypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div mix={operatorButtonsStyle}>
            <button type="button" data-operator-action="status">
              Health
            </button>
            <button type="button" data-operator-action="catalog">
              Catalog
            </button>
            <button type="button" data-operator-action="targets">
              Targets
            </button>
            <button type="button" data-operator-action="worlds">
              Worlds
            </button>
            <button type="button" data-operator-action="plan">
              Plan
            </button>
            <button type="button" data-operator-action="build">
              Build
            </button>
            <button type="button" data-operator-action="mine">
              Mine
            </button>
            <button type="button" data-operator-action="proof">
              Proof
            </button>
          </div>
        </div>
        <div mix={operatorOutputStyle}>
          <div mix={operatorStatusStyle} data-operator-status data-state="idle">
            Booting operator console
          </div>
          <pre data-operator-output>{`{
  "ready": false,
  "waitingFor": "/api/status"
}`}</pre>
        </div>
      </div>
    </section>
  )
}

function HomeHead() {
  return () => (
    <>
      <meta name="color-scheme" content="dark" />
      <meta
        name="description"
        content="QuantumSkyes MCP operator console for immersive world-building, gate-owned access, and live protocol proof."
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap"
      />
      <style>{`
        html[data-mcp-neon-scrollbar] {
          scrollbar-width: auto;
          scrollbar-gutter: stable;
          scrollbar-color: #66e7ff rgba(8, 7, 6, 0.86);
        }
        html[data-mcp-neon-scrollbar]::-webkit-scrollbar,
        html[data-mcp-neon-scrollbar] body::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }
        html[data-mcp-neon-scrollbar]::-webkit-scrollbar-track,
        html[data-mcp-neon-scrollbar] body::-webkit-scrollbar-track {
          background: linear-gradient(180deg, rgba(237, 199, 117, 0.12), rgba(102, 231, 255, 0.14)), rgba(8, 7, 6, 0.88);
          border-left: 1px solid rgba(237, 199, 117, 0.18);
        }
        html[data-mcp-neon-scrollbar]::-webkit-scrollbar-thumb,
        html[data-mcp-neon-scrollbar] body::-webkit-scrollbar-thumb {
          min-height: 96px;
          border: 4px solid rgba(8, 7, 6, 0.94);
          border-radius: 999px;
          background: linear-gradient(180deg, #edc775, #66e7ff, #ff694d);
          box-shadow: 0 0 18px rgba(102, 231, 255, 0.72), inset 0 0 10px rgba(255, 255, 255, 0.3);
        }
        #threshold-scroll-chrome {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 60;
          width: 100%;
          height: 4px;
          transform: scaleX(0);
          transform-origin: left center;
          background: linear-gradient(90deg, #edc775, #66e7ff, #ff694d);
          box-shadow: 0 0 24px rgba(102, 231, 255, 0.5);
          pointer-events: none;
        }
        #threshold-cursor-trail {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 58;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(102, 231, 255, 0.76);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(237, 199, 117, 0.32), transparent 42%), radial-gradient(circle, rgba(102, 231, 255, 0.24), transparent 64%);
          box-shadow: 0 0 24px rgba(102, 231, 255, 0.5), 0 0 54px rgba(255, 105, 77, 0.18);
          opacity: 0;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        [data-mcp-text-scan] {
          position: relative;
          text-shadow: 0 0 16px rgba(237, 199, 117, 0.34), 0 0 46px rgba(102, 231, 255, 0.22);
        }
        [data-mcp-text-scan]::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0.08em;
          height: 0.08em;
          background: linear-gradient(90deg, transparent, #edc775, #66e7ff, transparent);
          animation: mcpTextScan 3.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        @keyframes mcpTextScan {
          0%, 100% { transform: scaleX(0.18); opacity: 0.28; transform-origin: left; }
          48% { transform: scaleX(1); opacity: 0.92; transform-origin: left; }
          52% { transform: scaleX(1); opacity: 0.92; transform-origin: right; }
          100% { transform: scaleX(0.18); opacity: 0.28; transform-origin: right; }
        }
        @media (pointer: coarse), (prefers-reduced-motion: reduce) {
          #threshold-cursor-trail { display: none; }
        }
      `}</style>
    </>
  )
}

function TopRail() {
  return () => (
    <header mix={topRailStyle}>
      <a href="/" mix={brandStyle} aria-label="QuantumSkyes MCP Control Room">
        <span>QS</span>
        <strong>QuantumSkyes MCP</strong>
      </a>
      <nav mix={navStyle} aria-label="Console shortcuts">
        <a href="#operator">Workbench</a>
        <a href="https://skye-design-mcp.pages.dev/use-mcp.html">Access guide</a>
        <a href="https://skye-design-mcp.pages.dev/health">Health</a>
        <a href="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html?workspace=quantumskyes-mcp&source=operator-console">
          Gate
        </a>
      </nav>
    </header>
  )
}

function DoorConsole() {
  const digits = ['1', '3', '7', '9']

  return () => (
    <aside mix={doorStyle} aria-label="Owner threshold console">
      <div mix={doorFaceStyle}>
        <span mix={doorLightStyle}></span>
        <strong>Owner threshold</strong>
        <p>Enter through the gate, then bring the signed bearer back to the MCP client.</p>
        <div mix={pinDotsStyle} aria-label="Door code visual">
          {digits.map((digit) => (
            <span key={digit}>{digit}</span>
          ))}
        </div>
        <a href="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html">
          Open admin door
        </a>
      </div>
    </aside>
  )
}

const pageStyle = css({
  '--bg': '#080706',
  '--panel': 'rgba(18, 17, 14, 0.72)',
  '--line': 'rgba(237, 199, 117, 0.18)',
  '--gold': '#edc775',
  '--cyan': '#66e7ff',
  '--fire': '#ff694d',
  '--ink': '#fff8e6',
  '--soft': 'rgba(255, 248, 230, 0.72)',
  minHeight: '100vh',
  position: 'relative',
  overflow: 'hidden',
  background: '#080706',
  color: 'var(--ink)',
  fontFamily: fontStack,
  '& *': { boxSizing: 'border-box' },
  '& a': { color: 'inherit' },
  '&::-webkit-scrollbar': { width: '16px', height: '16px' },
  '&::-webkit-scrollbar-track': { background: 'rgba(237, 199, 117, 0.08)' },
  '&::-webkit-scrollbar-thumb': {
    background: 'linear-gradient(180deg, var(--gold), var(--cyan), var(--fire))',
    border: '4px solid rgba(8, 7, 6, 0.92)',
    borderRadius: '999px',
  },
})

const canvasStyle = css({
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 0,
})

const grainStyle = css({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1,
  opacity: 0.2,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
  backgroundSize: '44px 44px',
})

const topRailStyle = css({
  position: 'fixed',
  zIndex: 20,
  top: 0,
  left: 0,
  right: 0,
  minHeight: '74px',
  padding: '16px clamp(18px, 4vw, 56px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '20px',
  borderBottom: '1px solid rgba(237, 199, 117, 0.16)',
  background: 'rgba(8, 7, 6, 0.72)',
  backdropFilter: 'blur(18px)',
})

const brandStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
  textDecoration: 'none',
  fontWeight: 900,
  '& span': {
    display: 'grid',
    placeItems: 'center',
    width: '38px',
    height: '38px',
    border: '1px solid var(--line)',
    background: 'rgba(237, 199, 117, 0.12)',
    color: 'var(--gold)',
  },
})

const navStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  '& a': {
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: 'var(--soft)',
  },
  '@media (max-width: 760px)': { display: 'none' },
})

const heroStyle = css({
  position: 'relative',
  zIndex: 2,
  minHeight: '100svh',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 440px)',
  alignItems: 'center',
  gap: 'clamp(28px, 6vw, 92px)',
  padding: 'clamp(8rem, 14vw, 13rem) clamp(18px, 6vw, 88px) clamp(5rem, 9vw, 8rem)',
  '@media (max-width: 940px)': {
    gridTemplateColumns: '1fr',
    minHeight: 'auto',
    paddingTop: '112px',
  },
})

const walkwayStyle = css({
  position: 'absolute',
  left: '50%',
  bottom: '4vh',
  width: 'min(58vw, 760px)',
  height: '42vh',
  transform: 'translateX(-50%) perspective(900px) rotateX(68deg)',
  transformOrigin: 'bottom',
  borderLeft: '1px solid rgba(237, 199, 117, 0.18)',
  borderRight: '1px solid rgba(237, 199, 117, 0.18)',
  background:
    'linear-gradient(90deg, transparent, rgba(237,199,117,0.07), transparent), linear-gradient(180deg, transparent, rgba(102,231,255,0.08))',
  opacity: 0.75,
  '& span': {
    display: 'block',
    height: '1px',
    marginTop: '18%',
    background: 'rgba(237, 199, 117, 0.2)',
  },
  '@media (max-width: 940px)': { opacity: 0.35 },
})

const copyStyle = css({
  position: 'relative',
  zIndex: 3,
  maxWidth: '920px',
})

const eyebrowStyle = css({
  margin: 0,
  color: 'var(--gold)',
  fontSize: '13px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
})

const heroTitleStyle = css({
  margin: '14px 0 0',
  fontSize: 'clamp(3.25rem, 8vw, 8.8rem)',
  lineHeight: 0.9,
  letterSpacing: '0',
  maxWidth: '980px',
})

const heroBodyStyle = css({
  margin: '22px 0 0',
  maxWidth: '720px',
  color: 'var(--soft)',
  fontSize: 'clamp(1rem, 1.5vw, 1.3rem)',
  lineHeight: 1.6,
})

const actionsStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginTop: '30px',
  '& a': {
    minHeight: '48px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '13px 18px',
    border: '1px solid var(--line)',
    background: 'rgba(255, 255, 255, 0.05)',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 900,
    textTransform: 'uppercase',
  },
  '& a:first-child': {
    color: '#100d08',
    background: 'linear-gradient(135deg, var(--gold), #fff1bd)',
  },
})

const doorStyle = css({
  position: 'relative',
  zIndex: 4,
  minHeight: '560px',
  display: 'grid',
  alignItems: 'center',
  justifyItems: 'center',
  perspective: '1200px',
})

const doorFaceStyle = css({
  width: 'min(100%, 390px)',
  minHeight: '520px',
  padding: '34px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: '18px',
  border: '1px solid rgba(237, 199, 117, 0.32)',
  background:
    'linear-gradient(145deg, rgba(28,22,13,0.95), rgba(8,7,6,0.82)), linear-gradient(90deg, rgba(237,199,117,0.16), transparent)',
  boxShadow: '0 40px 120px rgba(0, 0, 0, 0.55), inset 0 0 60px rgba(237,199,117,0.08)',
  transform: 'rotateY(-10deg)',
  '& strong': { fontSize: '26px', lineHeight: 1.1 },
  '& p': { margin: 0, color: 'var(--soft)', lineHeight: 1.5 },
  '& a': {
    minHeight: '48px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#100d08',
    background: 'linear-gradient(135deg, var(--cyan), var(--gold))',
    textDecoration: 'none',
    fontWeight: 900,
    textTransform: 'uppercase',
    fontSize: '12px',
  },
  '@media (max-width: 940px)': {
    transform: 'none',
    minHeight: '420px',
  },
})

const doorLightStyle = css({
  width: '16px',
  height: '16px',
  borderRadius: '999px',
  background: 'var(--cyan)',
  boxShadow: '0 0 24px var(--cyan), 0 0 70px rgba(102,231,255,0.45)',
})

const pinDotsStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '10px',
  '& span': {
    display: 'grid',
    placeItems: 'center',
    aspectRatio: '1',
    border: '1px solid rgba(237, 199, 117, 0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--gold)',
    fontWeight: 900,
  },
})

const controlSurfaceStyle = css({
  position: 'relative',
  zIndex: 2,
  display: 'grid',
  gridTemplateColumns: '0.9fr 1.1fr',
  gap: '24px',
  padding: 'clamp(5rem, 10vw, 9rem) clamp(18px, 6vw, 88px)',
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
})

const panelStyle = css({
  padding: '28px',
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  backdropFilter: 'blur(16px)',
})

const sectionHeadingStyle = css({
  position: 'relative',
  zIndex: 2,
  maxWidth: '920px',
})

const sectionTitleStyle = css({
  margin: '12px 0 0',
  fontSize: 'clamp(2.1rem, 4.5vw, 5.2rem)',
  lineHeight: 0.98,
  letterSpacing: '0',
})

const sectionBodyStyle = css({
  color: 'var(--soft)',
  fontSize: '17px',
  lineHeight: 1.65,
})

const statusGridStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '14px',
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
})

const statusCardStyle = css({
  minHeight: '180px',
  padding: '20px',
  border: '1px solid rgba(102, 231, 255, 0.16)',
  background: 'rgba(6, 12, 14, 0.7)',
  '& span': { color: 'var(--cyan)', fontWeight: 900 },
  '& strong': { display: 'block', marginTop: '24px', fontSize: '20px' },
  '& p': { color: 'var(--soft)', lineHeight: 1.5 },
})

const worldLabStyle = css({
  position: 'relative',
  zIndex: 2,
  padding: 'clamp(5rem, 10vw, 9rem) clamp(18px, 6vw, 88px)',
})

const modeGridStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '14px',
  marginTop: '36px',
  '@media (max-width: 980px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  '@media (max-width: 560px)': { gridTemplateColumns: '1fr' },
})

const modeCardStyle = css({
  minHeight: '220px',
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  border: '1px solid var(--line)',
  background:
    'linear-gradient(180deg, rgba(237,199,117,0.04), rgba(255,255,255,0.03)), rgba(12,10,8,0.7)',
  '& strong': { fontSize: '28px' },
  '& p': { color: 'var(--soft)', lineHeight: 1.5 },
})

const operatorSectionStyle = css({
  position: 'relative',
  zIndex: 2,
  padding: 'clamp(5rem, 10vw, 9rem) clamp(18px, 6vw, 88px)',
  borderTop: '1px solid var(--line)',
})

const operatorShellStyle = css({
  marginTop: '34px',
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 0.42fr) minmax(0, 1fr)',
  gap: '16px',
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
})

const operatorControlsStyle = css({
  display: 'grid',
  alignContent: 'start',
  gap: '14px',
  padding: '20px',
  border: '1px solid rgba(237, 199, 117, 0.18)',
  background: 'rgba(8, 7, 6, 0.72)',
  backdropFilter: 'blur(16px)',
  '& label': { display: 'grid', gap: '8px' },
  '& label span': {
    color: 'var(--gold)',
    fontSize: '12px',
    fontWeight: 900,
    textTransform: 'uppercase',
  },
  '& select': {
    minHeight: '46px',
    width: '100%',
    border: '1px solid rgba(102, 231, 255, 0.18)',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--ink)',
    padding: '0 12px',
    font: 'inherit',
  },
  '& option': {
    background: '#080706',
    color: 'var(--ink)',
  },
})

const operatorButtonsStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '10px',
  '& button': {
    minHeight: '44px',
    border: '1px solid rgba(237, 199, 117, 0.18)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--ink)',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '12px',
    fontWeight: 900,
    textTransform: 'uppercase',
  },
  '& button:hover, & button:focus-visible': {
    color: '#100d08',
    outline: 'none',
    background: 'linear-gradient(135deg, var(--gold), var(--cyan))',
  },
  '& button:nth-last-child(2)': {
    color: '#100d08',
    background: 'linear-gradient(135deg, var(--gold), #fff1bd)',
  },
})

const operatorOutputStyle = css({
  minHeight: '520px',
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  border: '1px solid rgba(102, 231, 255, 0.18)',
  background: 'rgba(3, 9, 12, 0.72)',
  backdropFilter: 'blur(16px)',
  overflow: 'hidden',
  '& pre': {
    margin: 0,
    padding: '18px',
    overflow: 'auto',
    color: 'rgba(255, 248, 230, 0.84)',
    fontSize: '12px',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  },
})

const operatorStatusStyle = css({
  minHeight: '48px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  borderBottom: '1px solid rgba(102, 231, 255, 0.18)',
  color: 'var(--gold)',
  fontSize: '12px',
  fontWeight: 900,
  textTransform: 'uppercase',
  '&[data-state="ok"]': { color: 'var(--cyan)' },
  '&[data-state="error"]': { color: 'var(--fire)' },
})

const stackSectionStyle = css({
  position: 'relative',
  zIndex: 2,
  padding: 'clamp(5rem, 10vw, 9rem) clamp(18px, 6vw, 88px)',
})

const stackListStyle = css({
  marginTop: '36px',
  display: 'grid',
  gap: '10px',
})

const stackRowStyle = css({
  display: 'grid',
  gridTemplateColumns: 'minmax(170px, 0.36fr) 1fr',
  gap: '18px',
  alignItems: 'center',
  minHeight: '74px',
  padding: '16px 18px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  '& strong': { color: 'var(--gold)' },
  '& span': { color: 'var(--soft)' },
  '@media (max-width: 620px)': { gridTemplateColumns: '1fr' },
})

const proofDeckStyle = css({
  position: 'relative',
  zIndex: 2,
  display: 'grid',
  gridTemplateColumns: '0.8fr 1fr',
  gap: '36px',
  padding: 'clamp(5rem, 10vw, 9rem) clamp(18px, 6vw, 88px)',
  borderTop: '1px solid var(--line)',
  '@media (max-width: 880px)': { gridTemplateColumns: '1fr' },
})

const proofStepsStyle = css({
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  gap: '12px',
  counterReset: 'proof',
  '& li': {
    minHeight: '64px',
    padding: '18px',
    border: '1px solid rgba(237, 199, 117, 0.16)',
    background: 'rgba(8, 7, 6, 0.62)',
    color: 'var(--soft)',
    fontWeight: 700,
  },
})
