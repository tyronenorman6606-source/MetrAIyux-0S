# SkyeVault One-Auth Receipt Dashboard

Date: 2026-05-20

This closes the specific platform gap where vault exports existed as upload artifacts but were not yet a real 0S/FS27 custody surface for admin sessions, receipt review, signed downloads, and SkyeSecure handoff.

## Live Flow

1. Admin signs into FS27 or pastes a short-lived FS27 bearer into `metraiyux_0s_site/admin/skyevault-command-center.html`.
2. The 0S command center calls SkyeVault Drop with `Authorization: Bearer <fs27 token>`.
3. SkyeVault Drop introspects the bearer against FS27 through the `SKYGATEFS27_WORKER` service binding when deployed on Cloudflare.
4. SkyeVault Drop returns the ledger only when the bearer is active and admin-scoped.
5. Download actions create signed vault object links through `/api/admin-vault-download`.
6. SkyeVault writes audit events with `actor`, `authType`, `workspaceId`, `customerId`, and `gateCardId`.
7. `.skyesecrets` receipts expose an `Unlock` action into the 0S SkyeSecure secret-pack console.

## Checklist

- [✓] Add FS27 bearer introspection to SkyeVault Drop admin APIs.
- [✓] Add SkyeVault Drop Cloudflare service binding to `skyegatefs27-citadeldb`.
- [✓] Stamp admin config view, export, health, and signed-download audit events with actor identity.
- [✓] Add 0S `SkyeVault Command Center` page and script.
- [✓] Add Admin Hub and 0S search index links for the command center.
- [✓] Add SkyeSecure unlock handoff for `.skyesecrets` receipts.
- [✓] Add CLI upload metadata flags for workspace, customer, repo, developer, gate card, API key, role, destination, client name, and client email.
- [✓] Fix FS27 introspection so FS27 admin-login JWTs introspect as active admin bearers.
- [✓] Add live proof runner at `tools/skyevault-one-auth-live-proof.mjs`.
- [✓] Deploy FS27 worker update.
- [✓] Deploy SkyeVault Drop worker update.
- [✓] Deploy 0S full-system worker/site update.
- [✓] Run live proof against production and attach the JSON report.
- [✓] Confirm a real `fs27-skygate` actor creates a signed receipt download in production.

## Operator Commands

Deploy FS27:

```bash
cd metraiyux_0s_site/skyegate/source/SkyeGateFS27
npx wrangler deploy
```

Deploy SkyeVault Drop:

```bash
cd SkyeVault-Drop
npm run cloudflare:deploy
```

Deploy 0S full system:

```bash
cd metraiyux_0s_site
npx wrangler deploy
```

Run production proof:

```bash
node tools/skyevault-one-auth-live-proof.mjs
```

The proof runner must show `FS27 one-auth: ok` and `Receipt download: ok`. If either line fails, the implementation is not considered closed.

## Production Proof Result

Latest passing proof:

```text
test-artifacts/skyevault-one-auth-live-proof/skyevault-one-auth-live-proof-20260520T033017Z.json
test-artifacts/skyevault-one-auth-live-proof/latest.json
```

Verified in production:

- [✓] `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/skyevault-command-center.html` returns the command center.
- [✓] FS27 admin bearer introspects as active admin.
- [✓] SkyeVault dashboard returns `actor.type = fs27-skygate`.
- [✓] Signed download created for receipt `cdv_54b7ae793fd457cb91bde1a3`.
- [✓] Signed download response returned `hasDownloadUrl = true`.
