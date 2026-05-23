# MCP Tooling Receipt - AI Working Guide

Generated from: `MCP_TOOLING_RECEIPT.json`

Target folder: `/workspaces/MetrAIyux-0S/metraiyux_0s_site`

Generated at: `2026-05-17T12:27:48.963Z`

## Source Of Truth

When the user says "my MCP", "the MCP tooling", "use the tooling", or "Skye UI design components" in this repo, use the local MCP server from `.mcp.json`:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/MCP/stdio-server.mjs"]
    }
  }
}
```

Do not guess another MCP server. Some clients expose it as `skye-design`, but the repo source of truth is `quantumskyes`.

## Required Workflow

1. Run `npm run mcp:mine -- /workspaces/MetrAIyux-0S/metraiyux_0s_site`.
2. Read `metraiyux_0s_site/MCP_TOOLING_RECEIPT.json`.
3. Use this Markdown guide as the AI-readable summary, not as a replacement for the receipt.
4. Choose a surface pattern intentionally. Do not grab the first nice-looking component.
5. Apply changes inside the named target folder.
6. Re-run `npm run mcp:mine -- /workspaces/MetrAIyux-0S/metraiyux_0s_site`.
7. Serve or deploy the same target folder.

## Current Inventory

- Public source exists: yes
- HTML files: 755
- CSS files: 15
- JS files: 229
- Source index: `index.html`
- Source CSS: `style.css`
- Source JS: `script.js`
- Canonical bundle fields in the receipt: not set

This is a large static public site with many platform folders. Treat each platform folder as a product surface, not as random pages.

## MCP Resources Read

The mine run confirmed the design/tooling resources are available, including:

- `quantumskyes://directives/index`
- `quantumskyes://design/registry`
- `quantumskyes://design/elements`
- `quantumskyes://design/user-guide`
- `quantumskyes://design/builder-guide`
- `quantumskyes://design/no-frankenstein-policy`
- `quantumskyes://design/perfection-checklist`
- `quantumskyes://design/advanced-stack`
- `quantumskyes://design/stack-catalog`
- `quantumskyes://design/open-source-stack`
- `quantumskyes://design/variety-system`
- `quantumskyes://design/logo-standards`
- `quantumskyes://design/assets-manifest`
- `quantumskyes://design/pattern-manifest`
- `quantumskyes://content/first-person-operator-voice`
- `quantumskyes://production/ledger`

## MCP Tools Available

Use these tools when the work calls for them:

- `repo_read`
- `design_find`
- `design_validate`
- `design_content_audit`
- `design_stack_audit`
- `design_effect_audit`
- `design_e2e_proof_audit`
- `design_performance_audit`
- `design_elements`
- `design_compose_brief`
- `design_asset_manifest`
- `design_template_manifest`
- `design_template_pack`
- `design_logo_manifest`
- `design_logo_audit`
- `design_content_generate`
- `design_open_source_stack`
- `design_stack_catalog`
- `design_recipe_plan`
- `design_variety_plan`
- `design_pattern_pack`
- `design_quality_gate`
- `design_luxury_audit`
- `production_ledger`

## Surface Selection Rules

Use `client.surface.app-first-command-center` when the user asks for a platform, dashboard, command room, mini app, internal tool, or operational surface.

Use `skye.core.full-width-design-hero` only for public marketing/editorial pages.

Use `skye.templates.*` only for changelog, blog, portfolio, release receipt, field-note, or operator-profile surfaces.

Do not force a marketing hero onto an app surface. The app/tool must be the experience.

## Mini App Definition

A platform surface is not done if it only has copy, cards, or a generic contact form.

A real mini app should include at least four of these:

- Structured inputs specific to the claim the page makes
- Computed score, route, forecast, status, or readiness output
- Local browser persistence
- Exportable JSON, Markdown, receipt, or packet
- A generated action list
- A proof or verification gate
- A page-specific workflow, not a reused generic form
- A visible local ledger or status cockpit on the platform hub

## Visual Enhancement Rules

Use Skye UI components as minor polish only after the surface has useful behavior.

Good pairings for platform mini apps:

- `client.surface.app-first-command-center`
- `skye.proof.status-strip`
- `skye.core.compact-navigation`
- `skye.motion.reveal-system`
- `skye.fx.text-effects` only for restrained hierarchy
- `skye.fx.neon-motion-chrome` only when the source actually contains visible chrome behavior

Avoid:

- A card grid as the entire product
- Public MCP smoke/debug copy
- First-viewport marketing text walls for operational tools
- Fake "advanced stack" claims with no imports or runtime behavior
- Generated initial logo badges when real logo assets exist
- Static screenshots or static copy presented as workflow proof

## Advanced Stack Rule

If an AI calls `design_recipe_plan`, `design_open_source_stack`, or a pattern pack that returns package imports, those imports become obligations unless the user explicitly asks for a lightweight pass.

Do not claim Framer Motion, GSAP, Lenis, Three, R3F, Rive, Theatre, or dotLottie work unless the project actually imports and runs it.

For this static site, a lightweight mini-app pass may use local browser JavaScript and CSS, but it must not claim advanced-stack implementation.

## Current Site-Wide Runtime

The 0S pass is site-wide. Do not treat one folder as the whole assignment unless the user names only that folder.

The shared runtime lives in `script.js` as `window.ZeroSurfaceApps`.

Current coverage rules:

- Enhance existing local tools on platform pages that already contain inputs, textareas, or selects.
- Add a universal 0S workbench to platform pages that load `script.js` but do not already have a tool.
- Add platform index cockpits that summarize saved browser-local records for that folder.
- Keep Ascension on its dedicated room-specific runtime so its six rooms can use custom scoring.
- Save browser-local records, write a platform ledger, generate scores/routes/actions, and export JSON plus Markdown receipts.

Current inventory from the site-wide pass:

- Existing tool-like pages detected: 160
- HTML pages loading shared `script.js`: 522
- Runtime coverage folders include `admin`, `ai-readiness`, `apex`, `automation`, `brain-governance`, `branch-expansion`, `buyer-intelligence`, `certification-readiness`, `client-os`, `crown-os`, `launch`, `member`, `nexus`, `portal-layer`, `proof-export`, `proof-vault`, `proposal-center`, `quantum-ops`, `revenue-ops`, `saas`, `sentinel-os`, and `training-academy`.

Representative proof paths:

- `apex/security-trust-brief.html` - existing tool enhanced with 0S receipt export
- `crown-os/daily-operator-digest.html` - existing Crown tool enhanced with 0S receipt export
- `quantum-ops/revenue-autopilot.html` - existing tool enhanced with 0S receipt export
- `launch/qa-matrix.html` - static platform page upgraded with universal 0S workbench
- `saas/customer-dashboard.html` - SaaS tool enhanced with 0S receipt export
- `ascension/deal-room.html` - dedicated Ascension mini app preserved and tested

## Ascension Dedicated Runtime

Platform: `ascension/`

Claimed rooms:

- `ascension/deal-room.html` - discovery, scope, objections, proof, next steps
- `ascension/revenue-war-room.html` - pipeline movement, AE blockers, follow-up pressure, proof-backed closing
- `ascension/executive-briefing-room.html` - weekly executive status
- `ascension/proof-export-center.html` - launch receipts, claims ledgers, sitemap checks, handoff packets
- `ascension/buyer-intelligence-center.html` - persona routing, pain mapping, proof requirements, close-path planning
- `ascension/public-conversion-system.html` - capability packets, calls, demos, calculators, intake routes

Upgrade standard for these rooms:

- Each room needs its own form fields.
- Each room needs its own scoring/routing logic.
- Each room needs local save and restore.
- Each room needs JSON and Markdown export.
- The hub needs a local status cockpit reading saved room records.

## QA Gates

Before calling work done:

- Re-run the MCP mine command.
- Run `design_validate` on edited public markup/CSS/JS when practical.
- Run `design_effect_audit` if named visual effects were requested.
- Run `design_e2e_proof_audit` when a page claims routing, exporting, scoring, login, monitoring, filtering, deployment, restore, or another workflow.
- Run `design_performance_audit` for heavy motion, WebGL, screenshots, or scroll effects.
- Capture desktop screenshot at `1440x1000`.
- Capture mobile screenshot at `390x844`.
- Verify no mobile horizontal scroll.
- Verify the app's main controls are visible and usable.
- Verify no public page exposes internal MCP/debug/test wording.

## Copy Standard

For founder-built public system copy, use operator language:

- "I built"
- "I route"
- "I show"
- "we operate"
- "our agents"
- "our gates"

Avoid generic platform filler:

- "we help"
- "best-in-class"
- "streamline your business"
- "our solutions"

## AI Reminder

Read the target first. Read the receipt. Use the MCP resources. Pick the right surface pattern. Build behavior before decoration. Then polish.
