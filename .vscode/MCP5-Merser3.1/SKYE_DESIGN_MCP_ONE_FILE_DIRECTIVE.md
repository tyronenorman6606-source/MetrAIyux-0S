# ONE-FILE MASTER DIRECTIVE — SKYE DESIGN MCP + COPY-PASTE DESIGN ARSENAL

You are working on the Skye Design MCP at:

https://skye-design-mcp.pages.dev/

The remote MCP endpoint must be:

https://skye-design-mcp.pages.dev/mcp

The human setup page must be:

https://skye-design-mcp.pages.dev/use-mcp.html

The goal is to turn this into a real usable design engine for my personal ecosystem, not a decorative demo.

This must support my personal reusable UI/design system: trippy 3D icons, components, page templates, copy-paste blocks, MCP prompts, and design recipes that I can use across Skye/MetrAIyux/SOL/client apps.

The major issue to fix: previous design packs copied useless paths like:

assets/icons/artist-mic.svg

That is not useful to me. Copy buttons must copy real usable code: inline SVG, full HTML/CSS blocks, React/JSX components, Tailwind-ready JSX, or complete one-file HTML templates.

Do not copy asset paths as the main output.

Wrong:

assets/icons/artist-mic.svg

Correct:

<svg viewBox="0 0 256 256" role="img" aria-label="Artist Mic">...</svg>

Correct:

<section class="kx-hero">
  ...
</section>
<style>
  ...
</style>

Correct:

{
  "tool": "generate_component",
  "arguments": {
    "component": "artist card",
    "style": "trippy_3d_sovereign",
    "framework": "html",
    "include_css": true,
    "include_inline_svg": true,
    "copy_paste_safe": true
  }
}

## HARD RULES

✅ No fake completion.
✅ No placeholder tools.
✅ No TODO-only files.
✅ No asset-path-only copy output.
✅ No public-facing dev notes.
✅ No public copy saying placeholder, demo, mock, fake, lorem ipsum, coming soon, or not implemented.
✅ Every copy button must copy directly usable code.
✅ Every icon copy must include inline SVG.
✅ Every HTML component copy must include required CSS or be clearly self-contained.
✅ Every one-file template must run by opening the HTML file directly.
✅ Every MCP tool must return complete usable output.
✅ All files must be complete full files, not patch fragments.
✅ Include proof scripts and proof output.
✅ Do not claim done unless tests pass.

## BUILD TARGET

Create or refactor the project into a Cloudflare Pages/Workers-ready single app that serves:

/
/use-mcp.html
/mcp
/health
/llms.txt
/catalog/icons.json
/catalog/components.json
/catalog/templates.json
/preview
/copy-paste-vault.html

## REQUIRED ROUTE BEHAVIOR

### /

Landing page for Skye Design MCP.

It should explain that this is a design-generation MCP for creating copy-paste-safe trippy 3D UI assets.

### /use-mcp.html

Human-readable setup guide.

It must include copyable config blocks for:

Generic MCP client
Claude-style config
Cursor-style config
ChatGPT/custom connector style notes where applicable

Primary config:

{
  "mcpServers": {
    "skye-design-mcp": {
      "url": "https://skye-design-mcp.pages.dev/mcp"
    }
  }
}

The page must be readable in browser and explain:

What the MCP does
How to connect it
Available tools
Example prompts
Expected outputs
How to use the copy-paste vault

### /mcp

Real remote MCP endpoint.

It must not be a decorative webpage.

It must support JSON-RPC MCP-style POST messages.

It must expose tools/list and tools/call behavior.

It must be safe, scoped, and not expose filesystem or command execution.

It should validate Origin/CORS enough for a public remote endpoint.

GET may support SSE if implemented. If GET streaming is not implemented, return a clear 405 JSON response.

### /health

Return JSON:

{
  "ok": true,
  "service": "skye-design-mcp",
  "version": "1.0.0"
}

### /llms.txt

Plain-text LLM-readable docs explaining the MCP endpoint, available tools, schemas, examples, and output requirements.

### /catalog/icons.json

Machine-readable icon catalog.

### /catalog/components.json

Machine-readable component catalog.

### /catalog/templates.json

Machine-readable template catalog.

### /preview

Browser preview surface for generated sample outputs.

### /copy-paste-vault.html

This is critical.

It must show:

Inline SVG Icons
HTML Components
React Components
Full Page Templates
CSS Tokens
MCP Prompts
Project Recipes

Every card should have relevant buttons:

Copy Inline SVG
Copy HTML
Copy React
Copy CSS
Copy MCP Prompt
Open Full Template

The buttons must copy actual code, not file paths.

## REQUIRED MCP TOOLS

Implement these tools and expose them through tools/list.

### generate_icon

Purpose: Generate a trippy 3D sovereign-style inline SVG icon.

Input example:

{
  "name": "artist mic",
  "style": "trippy_3d_sovereign",
  "size": 256,
  "mood": "neon purple gold glass",
  "format": "inline_svg"
}

Output must include:

{
  "name": "artist mic",
  "format": "inline_svg",
  "code": "<svg ...>...</svg>",
  "html_example": "<div class=\"kx-icon-shell\">...</div>",
  "usage_notes": "Paste this directly into HTML or JSX with minor JSX attribute conversion."
}

No output like assets/icons/name.svg unless secondary.

### generate_component

Purpose: Generate reusable UI components.

Input example:

{
  "component": "pricing_card",
  "style": "trippy_3d_sovereign",
  "framework": "html",
  "include_css": true,
  "include_inline_svg": true,
  "copy_paste_safe": true
}

Supported components:

button
hero
navbar
footer
pricing_card
feature_grid
command_card
stat_card
login_panel
upload_dropzone
media_card
artist_card
portfolio_card
testimonial_card
timeline
modal
tabs
accordion
sidebar
dashboard_shell
mobile_screen
app_launcher
notification_card
glass_form

Output must include complete copy-paste-safe code:

{
  "component": "pricing_card",
  "framework": "html",
  "code": "<section>...</section><style>...</style>",
  "dependencies": [],
  "copy_paste_safe": true
}

For React output, return a complete component:

export default function PricingCard() {
  return (
    ...
  )
}

### generate_template

Purpose: Generate a full one-file UI template.

Input example:

{
  "template": "app_landing_page",
  "use_case": "MetrAIyux OS homepage",
  "style": "trippy_3d_sovereign",
  "framework": "single_file_html",
  "include_icons": true,
  "include_motion": true
}

Supported templates:

app_landing_page
client_business_page
portfolio_homepage
music_artist_page
command_deck
camera_app_intro
auth_gateway
pricing_page
docs_portal
admin_console
mobile_app_mockup
game_menu
flyer_page
social_card
onboarding_tutorial

Output must be a complete one-file HTML document starting with:

<!doctype html>

### generate_design_pack

Purpose: Generate grouped icons/components/templates for a specific app.

Input example:

{
  "project": "SkyePics",
  "use_cases": ["landing", "camera app", "onboarding", "gallery", "pricing"],
  "style": "trippy_3d_sovereign",
  "output": "multi_file_json"
}

Output:

{
  "project": "SkyePics",
  "icons": [],
  "components": [],
  "templates": [],
  "tokens": {},
  "starter_files": []
}

Each starter file must include full content, not references to missing files.

### validate_copy_paste_block

Purpose: Check whether a component/template is actually pasteable.

Input:

{
  "code": "<section>...</section>",
  "target": "html"
}

Validation checks:

No unresolved asset paths.
No missing external CSS.
No missing external JS.
No fake links unless marked.
No TODO.
No placeholder copy.
No broken SVG.
No unclosed tags.
No path-only icon references.
No lorem ipsum.
No “coming soon.”
No “not implemented.”

Output:

{
  "valid": true,
  "issues": [],
  "fixed_code": ""
}

### list_design_tokens

Return:

{
  "colors": {},
  "gradients": {},
  "shadows": {},
  "radii": {},
  "motion": {},
  "typography": {},
  "z_layers": {}
}

### list_component_catalog

Return available components with descriptions and use cases.

### list_template_catalog

Return available templates with descriptions and use cases.

### render_preview_html

Take generated code and wrap it into a safe standalone preview page.

## VISUAL STYLE

Everything must feel like:

3D
trippy
sovereign
glass
purple aura
gold highlights
black chrome
neon depth
premium tech
operating-system energy
not generic SaaS
not flat dashboard
not boring admin panel

Use this token vocabulary:

:root {
  --kx-bg: #06030d;
  --kx-panel: rgba(18, 10, 38, .72);
  --kx-purple: #8b5cf6;
  --kx-violet: #a855f7;
  --kx-gold: #f7c948;
  --kx-cyan: #22d3ee;
  --kx-pink: #fb37ff;
  --kx-white: #f8f7ff;
  --kx-muted: #b8a8da;
  --kx-radius-xl: 28px;
  --kx-glow-purple: 0 0 40px rgba(168, 85, 247, .55);
  --kx-glow-gold: 0 0 32px rgba(247, 201, 72, .35);
}

## IMPLEMENTATION SHAPE

Preferred Cloudflare Worker-style TypeScript app.

Create a clean structure like:

src/index.ts
src/mcp/server.ts
src/mcp/tools.ts
src/design/tokens.ts
src/design/icons.ts
src/design/components.ts
src/design/templates.ts
src/web/pages.ts
src/lib/validators.ts
src/lib/jsonRpc.ts
public/use-mcp.html
public/copy-paste-vault.html
public/llms.txt
scripts/smoke-mcp.mjs
scripts/smoke-copy-paste.mjs
scripts/validate-no-placeholders.mjs
proof/endpoint-smoke-proof.json
proof/tools-list-proof.json
proof/copy-paste-validation-proof.json

If the current project is single-file or simpler, it is acceptable to implement this in fewer files, but the final runtime must still expose all required routes and tools.

## COPY-PASTE VAULT CONTENT REQUIREMENTS

The vault must include at least:

13 inline SVG icons
13 HTML components
7 React components
7 full page templates
1 full CSS token block
10 MCP prompt recipes
5 project recipes

Example icon categories:

AI brain
artist mic
camera lens
vault lock
deploy rocket
terminal crown
robot hand
music wave
client building
gold shield
neon database
cloud worker
command orb

Example components:

Hero
Pricing card
Artist card
Portfolio card
Command card
Upload dropzone
Login panel
Feature grid
Stat card
Timeline
Tabs
Modal
Dashboard shell

Example templates:

MetrAIyux OS homepage
SkyePics landing
Artist profile page
Client business page
Command deck
Portfolio homepage
Auth gateway

## REQUIRED SMOKE TESTS

Create script:

scripts/smoke-mcp.mjs

It must test:

GET /health returns ok.
GET /use-mcp.html returns readable HTML.
GET /llms.txt returns readable MCP docs.
POST /mcp initialize returns valid JSON-RPC/MCP-compatible response.
POST /mcp tools/list returns required tools.
POST /mcp tools/call generate_icon returns inline SVG.
POST /mcp tools/call generate_component returns pasteable code.
POST /mcp tools/call validate_copy_paste_block validates generated output.

Create script:

scripts/smoke-copy-paste.mjs

It must test:

copy-paste-vault.html exists.
No primary copy button copies only an asset path.
Inline SVG examples contain <svg.
HTML examples contain actual markup.
Full templates contain <!doctype html>.
No TODO strings.
No placeholder strings.
No fake lorem ipsum.
No public “not implemented.”

Create script:

scripts/validate-no-placeholders.mjs

It must fail on public-facing occurrences of:

TODO
FIXME
placeholder
lorem ipsum
coming soon
dummy
fake
mock data
not implemented

Exception: internal validator/proof files may mention rejected strings only when documenting what is rejected.

## PACKAGE SCRIPTS

package.json must include:

{
  "scripts": {
    "build": "tsc --noEmit",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "smoke:mcp": "node scripts/smoke-mcp.mjs",
    "smoke:copy-paste": "node scripts/smoke-copy-paste.mjs",
    "validate:no-placeholders": "node scripts/validate-no-placeholders.mjs"
  }
}

If the framework differs, adapt scripts but preserve equivalent commands.

## REQUIRED PROOF OUTPUT

After implementation, run:

npm install
npm run build
npm run smoke:mcp
npm run smoke:copy-paste
npm run validate:no-placeholders

Write proof output to:

proof/endpoint-smoke-proof.json
proof/tools-list-proof.json
proof/copy-paste-validation-proof.json

## README REQUIREMENTS

README must include:

✅ What works
✅ How to connect the remote MCP
✅ How to use the copy-paste vault
✅ How to generate icons
✅ How to generate components
✅ How to generate templates
✅ How to validate copy-paste blocks
☐ What still requires live client-side MCP registration

## ACCEPTANCE CRITERIA

This is not complete until:

✅ /use-mcp.html clearly explains how to connect and use the MCP.
✅ /mcp is a real MCP endpoint, not a decorative page.
✅ tools/list exposes all required tools.
✅ generate_icon returns inline SVG code.
✅ generate_component returns full pasteable component code.
✅ generate_template returns full one-file HTML.
✅ copy-paste-vault.html copies actual code, not asset paths.
✅ Smoke tests prove endpoint and copy-paste outputs work.
✅ No placeholder/TODO/demo copy appears in public-facing files.
✅ Project can deploy to Cloudflare Pages/Workers.
✅ Final output includes full updated files, not patch-only notes.

## FINAL OUTPUT REQUIRED FROM THE CODING AGENT

Return the full updated project.

Do not summarize patches only.
Do not say “done” unless smoke tests pass.
Do not claim the MCP is usable from ChatGPT unless it is actually registered/connectable from a client.
Do not hide unfinished work.
