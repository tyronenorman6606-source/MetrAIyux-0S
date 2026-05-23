# MCP Server Perfection Checklist

Use this to judge whether the design MCP is actually helping.

## Server Must Expose

- Design directive.
- Pattern registry.
- Element registry.
- Component use-case registry.
- User docs.
- Builder docs.
- Client setup docs.
- SkyeSol style reference.
- Asset manifest.
- Logo standards.
- Surface video reel standards.
- Quality gate tool.
- Public copy/design validator.
- Advanced-stack source audit tool.
- Runtime stack gate tool.
- Logo manifest and logo audit tools.
- Element search/listing tool.
- Composition brief tool.
- Luxury audit tool (`design_luxury_audit`) — typography, whitespace, choreography, and bespoke identity checks.
- $50K design standard reference (`quantumskyes://design/fifty-k-standard`).

## Agent Must Do

- Read directive before generating.
- Read `quantumskyes://design/component-use-cases` and call `design_component_plan` before choosing components.
- Treat "use my tooling" as a requirement to install/import/run the full MCP implementation stack by default: Framer Motion, Motion, GSAP, Lenis, Three/R3F/Drei/postprocessing, Theatre, dotLottie, Rive, OGL, Pixi, Lucide, Playwright, and ffmpeg proof when proof claims are present. Do not merely call MCP audit/resource tools.
- Pick a primary pattern.
- Use namespaces instead of random mixing.
- Validate public copy.
- Use existing logo assets before generating new marks.
- Audit logo usage when a brand mark appears.
- Encode real browser-action video reels when workflow proof is requested.
- Run `design_e2e_proof_audit` when copy claims signup, auth, routing, restore, monitoring, deploy, filtering, handoff, or another app behavior.
- Use screenshots as secondary receipts when the claim is behavioral; the primary proof is the browser doing the action.
- Audit real advanced-stack usage when required.
- Run `design_runtime_stack_gate` with source, package JSON, selected components/required stack, and browser runtime evidence.
- Fail the run if selected recipes return Framer Motion, GSAP, Lenis, Three/R3F/Drei/postprocessing, Theatre, dotLottie, Rive, OGL, Pixi, or Lucide and the shipped source does not visibly import and use them.
- Run browser screenshots.
- Fix visual failures before claiming completion.

## Public Page Must Avoid

- Giant left-column hero text walls.
- Random pasted logos.
- Rounded-square initial badges replacing real logos.
- CSS-only brand marks pretending to be finished identity.
- CSS-only screenshot fading described as video.
- Negative letter spacing.
- Internal MCP smoke/proof/debug copy.
- Mobile horizontal overflow.
- First screens that look like generic SaaS filler.
- Advanced-stack claims without real imports.
- Reused dark card/dashboard compositions with only copy changed.

## $50K Quality Criteria

Before calling output finished, verify all of the following:

- [ ] **Visual thesis** — one dominant idea drives every composition decision, not a list of features.
- [ ] **Display typography** — hero headline uses a non-system typeface at architectural scale (`clamp(3.5rem, 8vw, 9rem)+`), with intentional tracking (`-0.02em` to `-0.04em`), and tight line height (`0.9`–`1.05`).
- [ ] **Weight contrast** — display weight vs. body weight are visually distinct (e.g., Black + Regular, ExtraBold + Light).
- [ ] **Whitespace** — first viewport has ≥30% negative space. Section vertical padding ≥ `10rem` desktop / `6rem` mobile.
- [ ] **Copy density** — hero body copy is ≤2 lines. No section has >4 sentences visible on load.
- [ ] **Motion choreography** — reveal sequence is deliberate: headline → subtext → CTA → supporting. Not simultaneous.
- [ ] **Easing intention** — custom cubic-bezier used, not default `ease`. Duration is appropriate (`400ms`–`700ms` for reveals).
- [ ] **Scroll stagger** — scroll-triggered elements reveal at offset positions, not all at once.
- [ ] **Bespoke interaction** — at least one hover, cursor, or transition treatment that could not come from a UI kit.
- [ ] **design_luxury_audit passes** — typography, whitespace, choreography, and identity all score above threshold.
- [ ] **Cannot be rebranded** — swap the logo mentally. If it still works as a generic SaaS site, it failed.
- [ ] All existing perfection checklist items also pass.

## Good Output Feels Like

- A directed product experience that has a clear point of view.
- Something a luxury brand would feel comfortable publishing.
- A confident design language that costs money to replicate.
- A clear buyer path that breathes — the CTA is inevitable, not aggressive.
- Something a high-level dev/designer intentionally composed, not assembled.
- Actual open-source motion/3D tooling wired into source when the brief asks for it.
- Typography that makes the page feel more expensive than the tech it runs on.
