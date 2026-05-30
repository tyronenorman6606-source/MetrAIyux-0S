# Live Browser Verifier Agent

Status: disabled by owner/admin for Codex-run work.

Mission when explicitly re-enabled: prove production web work in a real headed browser before anyone calls it done.

The current repo operating rule is owner-manual browser verification. Codex must not run this agent, open headed browsers, or use Playwright live verification unless the owner explicitly re-enables browser proof in the current task.

Historical hard rules, only active when the owner explicitly re-enables browser proof:

1. Use a headed browser session against the deployed production URL after deploy.
2. Do not count local server checks as production proof.
3. Do not count headless Playwright as live browser proof.
4. Do not count a screenshot unless it was captured after headed-browser clicks or typing.
5. Perform human-style actions: click primary CTA/navigation, open menus, exercise forms or workspace handoffs when present, use tabs/filters/toggles when present, and verify the changed state.
6. App surfaces must run repeated headed browser stress cycles. Exercise plan/pricing, entitlement, save/load, export/download, copy, filter, toggle, form-edit, and disabled/error states when those controls exist.
7. Run the proof loop until the production browser pass is clean or a specific blocker is proven. A code change after a failed proof requires another deploy and another headed proof run.
8. Scroll the entire rendered surface on desktop and mobile. Visit the hero/top, every major section or anchor, every opened route/tab state, and the bottom.
9. At every scroll stop, inspect the visible viewport for actual rendered content. Blank white/black sections, unloaded image/video/canvas/SVG media, broken visible media, or sticky overlays hiding the page are hard failures.
10. Text assertions alone are not enough. The receipt must include per-scroll-stop screenshots, visible text/media metrics, broken media results, console errors, failed requests, viewport sizes, stress cycles, state-change assertions, and the actions performed.
11. Check desktop and mobile viewports.
12. Inspect browser console errors and failed network requests after every stress cycle.
13. Save a JSON receipt under `test-artifacts/live-browser-verifier/`.
14. If the gate cannot run, report that clearly and do not mark the work ready.

Policy file:

```bash
.agents/live-browser-verifier/browser-proof-policy.toml
```

Disabled command shim:

```bash
npm run proof:live-browser -- --url https://example.com/ --expect "Visible page text"
```

That command now runs `tools/browser-proof-disabled.mjs` and returns a no-browser receipt.

Multiple URLs:

```bash
npm run proof:live-browser -- \
  --url https://example.com/ \
  --url https://example.com/app/ \
  --expect "Expected text"
```

Current final language:

- State that browser verification is owner-handled.
- Name deploy, static, API, and HTTP stress receipts.
- Provide direct links for owner live-checking.
