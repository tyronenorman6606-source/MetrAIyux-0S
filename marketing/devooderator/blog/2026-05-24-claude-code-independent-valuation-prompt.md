# Claude Code independent valuation prompt

Use this prompt in Claude Code from the repo root:

```text
You are Claude Code. I need an independent prerevenue valuation of the MetrAIyux 0S codebase and deployed platform.

Important isolation rule:
- Do not read `marketing/devooderator/blog/2026-05-24-metraiyux-0s-devils-advocate-valuation.html`.
- Do not use Codex's valuation numbers or conclusions.
- Do your own repo-grounded analysis from source files, pricing files, proof receipts, changelogs, package scripts, deployed-surface registries, and test artifacts.

Please inspect at minimum:
- `marketing/metraiyux-0s/valuation-brief.md`
- `metraiyux_0s_site/sales/platform-surface-pricing-registry.json`
- `metraiyux_0s_site/sales/pricing-offer-router.html`
- `package.json`
- `.vscode/Handoffs/2026-05-23-0s-upscale-artist-nexus-relay13-handoff.md`
- Recent proof receipts under `test-artifacts/`, especially SkyeMusicNexus, Relay13/ConnectLog, SkyeNet, CitadelDB, SkyErrors/Helper K4i, SkyePay, SkyeMail/Zoho, and live-browser-verifier receipts.

Return a valuation section suitable to paste into the DevodeRator hub under a tab titled "Claude Code".

Required structure:
1. Executive valuation range, with low/base/high.
2. Devil's advocate haircut: what lowers the number because the company is prerevenue, complex, founder-dependent, and still has provider-gated/scaffolded surfaces.
3. Asset replacement-cost valuation from the repo evidence.
4. Revenue-capacity valuation based on published pricing, not current customer revenue.
5. Strategic-option valuation: what a buyer, licensee, agency, or platform partner could reasonably see in the system.
6. Proof table: cite local file paths and receipts you used.
7. Risks and diligence gaps.
8. Final conclusion in plain English.

Do not expose secrets or raw env values. Keep it honest, sharp, and repo-grounded.
```

