# MetrAIyux 0S · MCP Context Packet

MCP entry page: https://skye-design-mcp.pages.dev/use-mcp.html

## Product identity
MetrAIyux 0S is the protected sovereign operating layer for owner command, customer workspaces, revenue routing, proof governance, AI brain/cabinet logic, client onboarding, and workspace execution.

## Visual rules
- Deep void background, glass panels, neon signal, blue/cyan/gold gradients.
- Real transparent MetrAIyux logo may be used only when available from the site assets; do not invent or replace the logo.
- Icons should be individual SVG units, not a collage.
- Components should paste into a blank HTML file and render immediately.
- Prefer scoped classes with `mxm-` or `mx-` prefixes.
- Use inline SVG inside standalone snippets.
- Avoid external dependencies unless a dev explicitly asks for a framework version.

## Public copy rules
- Public pages must stay client-facing and clean.
- Do not expose internal implementation commentary on buyer-facing pages.
- Claims must be proof-safe: separate live, local, protected, and provider-wired states.
- Use direct, premium language: command, proof, routing, workspace, governance, revenue, approval, receipt.

## Output contract for MCP generated blocks
Return one of these formats:
1. Full standalone HTML file.
2. Scoped HTML section with `<style>` and inline SVG.
3. React component with local SVG and scoped CSS string.
4. JSON registry entry with title, slug, category, copy contract, and component code.

## Hard gates
- No external icon CDN.
- No generated logo substitution.
- No image-path-only components.
- No collage sprite dependency.
- No filler-text output.
- No claims of live provider behavior unless the provider is wired and tested.
