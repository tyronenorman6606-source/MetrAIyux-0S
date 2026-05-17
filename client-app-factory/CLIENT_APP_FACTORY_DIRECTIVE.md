# Sovereign Client App Factory Directive

Generated: 2026-05-17

This directive defines the overall app that will generate, upgrade, audit, preview, and deploy client apps across the MetrAIyux / Skyes Over London ecosystem.

It is not specific to one client or one industry.

## Product Mission

Build the operating app used to produce every client app.

This factory should turn a client packet, asset folder, live URL, intake record, or uploaded media set into a full stack app preview with:

- Client intake and source-of-truth records.
- Asset unpacking, cataloging, optimization, and provenance.
- MCP-powered design lab workflows.
- Public buyer app generation.
- Private preview and client handoff routes.
- PWA install readiness.
- QR-ready entry routes.
- AI workspace provisioning.
- Free tester usage setup when applicable.
- SkyePay continuation/payment lanes.
- Browser proof, scanner proof, MCP receipts, and deployment ledger entries.
- Deployment-safe path correction as folders move.

Client-facing language should say app, client app, operating surface, preview, workspace, infrastructure, AI, automation, or sovereign technology. Do not sell the work as just a website.

## Core Architecture

The Design Lab is inside the MCP layer, and the MCP layer is inside the Client App Factory.

```text
Client App Factory
  -> calls local quantumskyes MCP
  -> exposes Design Lab workflows
  -> builds public and private client app routes
  -> provisions workspace/trial/usage records
  -> connects SkyePay continuation lanes
  -> records browser and scanner proof
  -> packages deployable app folders
  -> updates path manifests and deployment ledgers
```

The MCP is not a style reference. It is the policy, design recipe, implementation, audit, proof, and quality-gate engine.

## Required Rooms

The factory app should include these internal rooms:

- `Client Intake`: business identity, location, services, target audience, offers, contacts, access, requested deployment, and special notes.
- `Source Scanner`: live URL scan, packet scan, asset scan, sitemap scan, copy scan, SEO scan, and competitive parity notes.
- `Asset Vault`: uploaded media, logo packs, extracted zips, optimized images, videos, generated media, source receipts, and asset usage rights.
- `Design Lab`: MCP recipe planning, pattern packs, logo discipline, typography, motion, media staging, and audits.
- `App Builder`: route map, PWA shell, QR route, buyer app, private preview route, quote/contact route, workspace offer route, and install prompts.
- `AI Workspace`: client tester account, included scans, included commands, app-specific command actions, usage ledger, and expiration/continuation status.
- `SkyePay`: setup payment, subscription, vault access, trial-to-paid conversion, owner approval, discounts, invoices, receipts, and cancellation handling.
- `Proof Room`: Playwright screenshots, browser workflow videos, scanner output, MCP receipts, app path manifest, deploy notes, and client-ready proof summaries.
- `Deployment Console`: Netlify/Cloudflare target, env validation, domain routes, QR regeneration, rollback notes, and live HTTP/browser verification.
- `Repo Platform Wiring`: GitHub/GitLab/Bitbucket/Drive/Cloudflare/Netlify links, repo path registry, platform credentials status, and deployment provenance.

## Folder Contract

Never mutate an original client packet blindly. Preserve source folders and create a new deployable app folder.

Generic structure:

```text
unpacked-zips/<client-packet-or-project>/
  CLIENT_APP_FACTORY_DIRECTIVE.md
  Skye-Assets/
    incoming-zips/
    logo-exports/
    media/
    source-receipts/
  <source-packet>/
    <original-client-surface>/
    <upgraded-client-app>/
      APP_PATH_MANIFEST.json
      APP_UPGRADE_PROOF.md
      MCP_TOOLING_RECEIPT.json
      manifest.webmanifest
      service-worker.js
      offline.html
      index.html
      scan.html
      preview.html
      quote.html
      assets/
        icons/
        media/
        logo-exports/
      tests/
```

The factory app must support different client packet layouts. Do not assume every client uses the same folder names as a prior project.

## Path-Safety Rule

This repo contains multiple live deployments. Treat every move, copy, deploy, and rename as a path-sensitive operation.

Before moving, deploying, or regenerating a client app:

1. Record `sourceFolder`, `upgradedFolder`, `assetFolder`, `publishFolder`, and `proofFolder`.
2. Search for hardcoded absolute paths.
3. Search for asset paths, manifest paths, service worker cache lists, redirects, sitemap URLs, canonical URLs, and QR targets.
4. Update path references in one controlled pass.
5. Re-run MCP on the exact publish folder.
6. Run browser proof against the exact served folder.
7. Do not alter unrelated live deployment folders.
8. Do not delete original source packets.
9. Only delete zips after successful extraction and inventory.

Required path manifest:

```json
{
  "client": "Client Name",
  "sourceFolder": "absolute original folder",
  "upgradedFolder": "absolute upgraded app folder",
  "assetFolder": "absolute asset folder",
  "publishFolder": "absolute folder used by Netlify or Cloudflare",
  "publicEntry": "/index.html",
  "qrRoute": "/scan.html",
  "previewRoute": "/preview.html",
  "quoteRoute": "/quote.html",
  "proofFolder": "absolute proof artifact folder",
  "finalQrTarget": "deployment URL for scan route",
  "deploymentNote": "what must change if deployment URL changes"
}
```

## MCP Workflow

For every client app:

1. Run `npm run mcp:mine -- <target-folder>`.
2. Read `<target-folder>/MCP_TOOLING_RECEIPT.json`.
3. Select MCP recipes and pattern packs before implementing effects.
4. Implement real source changes, not only audit notes.
5. Re-run `npm run mcp:mine -- <target-folder>` after implementation.
6. Run Playwright desktop and mobile browser proof.
7. Run scanner/crawler appropriate to the app type.
8. Save proof notes inside the upgraded app folder.
9. Update the path manifest and deployment proof after any folder move or deploy.

Minimum MCP checks for premium client apps:

- `design_recipe_plan`
- `design_quality_gate`
- `design_logo_manifest`
- `design_logo_audit`
- `design_stack_audit`
- `design_effect_audit`
- `design_performance_audit`
- `design_validate`
- `design_e2e_proof_audit` when the app claims a workflow, login, payment, scan, route, or browser action

## App Generation Standard

Every generated client app should include:

- A first viewport built around the client's real business subject.
- A buyer action path.
- A private client-preview path.
- A QR-ready scan path.
- PWA install readiness.
- Mobile navigation that opens and closes.
- A contact, quote, booking, intake, or purchase workflow.
- A client workspace/trial explanation when the preview includes tester access.
- A post-preview continuation/payment path.
- Real media or approved generated media.
- Asset provenance notes.
- Browser screenshots at `1440x1000` and `390x844`.
- No mobile horizontal overflow.
- No public debug, MCP smoke, placeholder, or internal proof language.
- A final proof note with paths, tests, and deployment instructions.

## Factory Data Model

The factory app should store each client as a record with:

- `clientId`
- `displayName`
- `industry`
- `contacts`
- `locations`
- `services`
- `sourceUrls`
- `sourceFolders`
- `assetFolders`
- `logoAssets`
- `mediaAssets`
- `publicRoutes`
- `privateRoutes`
- `workspacePlan`
- `trialUsage`
- `paymentPlan`
- `deploymentTargets`
- `proofArtifacts`
- `mcpReceipts`
- `scannerReports`
- `status`

## Outcome States

Each client app should move through clear states:

- `intake-created`
- `assets-unpacked`
- `source-scanned`
- `mcp-before-run`
- `app-generated`
- `workspace-linked`
- `payment-lane-linked`
- `browser-proofed`
- `mcp-after-green`
- `scanner-proofed`
- `preview-ready`
- `client-approved`
- `production-deployed`
- `live-verified`
- `continuation-offered`
- `converted`
- `archived`

## Completion Gate

Do not call a client app ready until:

- Original assets and source folders are preserved.
- Asset zips are extracted and removed only after inventory.
- MCP has been run before and after implementation.
- Browser proof is saved.
- Mobile menu works.
- PWA files are present and detected.
- QR route opens.
- Preview route opens.
- Quote/contact/purchase flow has a real backend lane or a clearly documented preview fallback.
- Assets load without broken requests.
- Public copy contains no internal debug language.
- The exact deploy folder is the folder that was verified.
- The path manifest matches the current folder and deployment target.
