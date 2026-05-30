# SkyeNet Source Custody And Transfer

Last updated: 2026-05-28

SkyeNet separates live hosting from source ownership.

## Current Rule

- The live app can be hosted for a client on SkyeNet without giving that client source-code access.
- Source download is account-scoped. The deployment lookup is keyed by `customer_id`, `workspace_id`, `project_id`, and `deployment_id`.
- A different customer account cannot download a deployment bundle unless the source is intentionally transferred or redeployed under that account.
- Cross-account source handoff must be an explicit owner/admin action with a transfer receipt.

## Bob's Smoke Shop Custody

Bob's app is hosted live on SkyeNet, but the upload was performed from the founder/admin lane.

- Live app: `https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/`
- Founder console: `https://skyenet.graylondonskyes.workers.dev/console?workspace_id=bobs-smoke-shop`
- Deployment receipt: `test-artifacts/bobs-skynet-deploy/bobs-skynet-deploy-latest.json`
- Credential source on receipt: `FREE99_ADMIN_CODE`
- Route receipt actor: `fs27-admin`
- Route receipt customer ID: `1201161732`
- Bob source policy: client-visible app access only; source handoff requires a founder-approved source transfer.

Do not place Bob's source-download URL on public flyers, public pitch pages, or client-facing handoff pages. Keep it in Founder Command only.

## Transfer Methods

The SkyeNet transfer API is:

```text
POST https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-transfer
```

Body:

```json
{
  "workspace_id": "bobs-smoke-shop",
  "project_id": "bobs-smoke-shop",
  "deployment_id": "dep_20260528063233",
  "method": "secure-skye-pack"
}
```

Supported methods:

- `download`: returns the existing gated account download path.
- `instant-download-link`: returns the same gated source path as an instant handoff link without making it public.
- `skyedrive`: writes a real source archive into the private SkyeDrive transfer lane.
- `skyevault`: writes a real source archive into the private SkyeVault custody lane.
- `secure-skye-pack`: encrypts the source archive and writes a real `.skye` pack plus owner-admin key custody record.

The live API returns `status: "completed"` for storage-backed transfer methods only after the artifact is written. It returns the private object key, manifest key, byte count, and hash, but it does not return the `.skye` encryption key.

## Secure Pack Naming

The canonical customer-facing source pack extension is:

```text
.skye
```

That naming is backed by SkyeDocxMax, which already exports encrypted `.skye` document packages. Source handoff should use the stronger SkyeSecure v2 pack lineage:

- Marker: `SKYESEC2`
- Format: `skye-secure-secret-pack-v2`
- Core package: `packages/skye-secure/skye-secure-core.mjs`
- Current SkyeNet API crypto posture: AES-256-GCM payload encryption with a private owner-admin key custody record. Public API responses never return the raw pack key.
- SkyeSecure/SkyeDocxMax lineage: passphrase and recipient wrapping remain the broader `.skye` package direction for future export/download flows.

The legacy `.skyesecrets` name remains valid for developer-secret packs, but SkyeNet customer source handoff should present the artifact as a secure `.skye` source pack.

## Public Copy Boundary

Safe public copy:

```text
Your app is hosted on SkyeNet, our standalone sovereign deploy network. Source custody stays under the deploying account until you approve a handoff. When handoff is included, we can store the source in SkyeDrive, store it in SkyeVault, create an instant gated link, or generate an encrypted secure .skye source pack.
```

Avoid public copy that implies every free hosted client automatically receives source code.
