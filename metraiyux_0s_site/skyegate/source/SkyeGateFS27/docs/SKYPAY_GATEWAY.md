# SkyePay Gateway

Updated: 2026-05-17

SkyePay is the payment app inside SkyeGateFS27. It owns the public checkout route, public store catalog, approved offer metadata, webhook ledger, rate/vault policy, and owner approval before a workspace unlocks. Private payment processor details stay inside operator/runtime proofs, not customer-facing copy.

## Public Flow

1. A client finishes a private app preview.
2. The preview routes them to `skyepay.html?client=<client-slug>`.
3. SkyePay loads the client and approved offers from `/.netlify/functions/skyepay-offers`.
4. The client submits name, email, company, and selected offer.
5. `/.netlify/functions/skyepay-checkout` creates a secure checkout session. Subscription trial sessions send recurring line items only, set `trial_period_days`, and keep setup/onboarding as deferred owner-approved work so Checkout is $0 today.
6. SkyePay returns to `skyepay.html?status=success&session_id=...`.
7. The webhook writes or updates `skyepay_orders`.
8. Standard app/service orders sit at `paid_pending_owner_approval`.
9. The owner approves standard app/service orders in `skyepay-admin.html`.
10. SkyeVault subscription offers auto-provision a scoped vault workspace through SkyeVault-Drop after payment confirms.

## API Flow

SkyePay is callable infrastructure, not only a page.

- API docs: `skyepay-api.html`
- Public store: `skyepay-store.html` or `/store`
- API manifest: `skyepay-api.json`
- OpenAPI: `openapi/skyepay.openapi.json`
- Browser SDK: `assets/skyepay-client.js`

Public app endpoints:

- `GET /skyepay/offers?client=metraiyux-0s`
- `POST /skyepay/checkout`
- `GET /skyepay/status?session_id={CHECKOUT_SESSION_ID}`

## SkyePay Catalog Integrity

SkyePay now imports checkout-safe products from `metraiyux_0s_site/brain/sales-offer-registry.json`, the machine-readable partner to the owner payment catalog.

- Imported into SkyePay: 50 fixed-price `approved` or `approved_floor` offers from MetrAIyux-adjacent repo surfaces, SkyeGate, kAIxU, Lane Vault, SkyeCorp, SBCC, and SOL Staffing.
- Already bundled manually: the five core MetrAIyux 0S app plans and the managed SkyeGateFS27 control-plane offer.
- Left out of instant checkout by design: `quote_only`, `do_not_create`, `approved_metered`, and `one_time_variable`.
- Checkout prefers existing price lookup keys when they exist in the connected payment account. If a lookup key is not present yet, SkyePay falls back to metadata-preserving `price_data` so checkout still works.
- 2026-05-17 live payment sync moved the 0S lookup keys to the current Starter, Growth, RouteX, Autonomous, and Enterprise amounts; receipt: `test-artifacts/stripe-sync/metraiyux-stripe-sync-receipt.json`.
- `GET /skyepay/offers` returns `catalog_integrity` with the source, imported checkout count, rule, and excluded instant-checkout categories.

Example checkout request:

```json
{
  "client_slug": "metraiyux-0s",
  "offer_id": "metraiyux-routex-workforce-command",
  "customer_name": "Client Owner",
  "customer_email": "owner@example.com",
  "company_name": "Client Company",
  "idempotency_key": "client-company-starter-2026-05-17"
}
```

## Important Statuses

- `checkout_created`: Checkout Session exists, but payment completion has not been confirmed.
- `demo_pending_owner_approval`: Local proof mode showed the owner-approval hold without charging a card.
- `payment_pending`: SkyePay has not confirmed a delayed payment yet.
- `payment_failed`: SkyePay reported delayed payment failure.
- `paid_pending_owner_approval`: SkyePay completed the session and FS27 is waiting for owner approval.
- `approved`: Owner approved the closeout.
- `ready_to_unlock`: Approved and ready for workspace activation.
- `workspace_unlocked`: Owner marked the workspace active/unlocked.
- `vault_provisioning_failed`: Payment was confirmed, but the SkyeVault-Drop provisioning endpoint rejected or failed the workspace setup.
- `vault_suspended`: A subscription event suspended the provisioned vault workspace.
- `void`: Owner voided the closeout.

## Stripe Environment

Required for production checkout:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Optional route controls:

- `SKYPAY_PUBLIC_ORIGIN`
- `SKYPAY_ALLOWED_ORIGINS`
- `SKYPAY_TRUST_PUBLIC_APP_ORIGIN`
- `SKYPAY_SUCCESS_URL`
- `SKYPAY_CANCEL_URL`
- `SKYPAY_ALLOW_PUBLIC_DRY_RUN`
- `SKYPAY_ALLOW_PUBLIC_ORDER_LOOKUP`
- `SKYEVAULT_DROP_URL`
- `SKYEVAULT_PROVISIONING_SECRET`
- `SKYEVAULT_DEFAULT_DESTINATION_ID`
- `SKYPAY_USE_STRIPE_LOOKUP_KEYS`

Dry-run checkout is only allowed on local hosts unless `SKYPAY_ALLOW_PUBLIC_DRY_RUN=true`.
Public order lookup by `order_id` is disabled by default; public return status should use Stripe's `session_id`.

## Hardening Added

- SkyePay return URLs now prefer `SKYPAY_PUBLIC_ORIGIN`, then same-origin or explicit SkyePay-approved origins. Global `ALLOWED_ORIGINS=*` no longer opens the payment lane.
- Checkout requests carry a client-side idempotency key, and Stripe Checkout creation uses the same key to avoid duplicate sessions on retries.
- Public status responses return a safe order view and do not expose Stripe customer/session internals.
- Owner approval is blocked until Stripe reports `paid`, `complete`, or `no_payment_required`.
- Zero-up-front trials use Stripe subscription trials with payment collection still enabled, so the buyer can select a plan/payment path without paying today.
- Checkout line items prefer approved Stripe lookup keys and validate amount, currency, and recurrence before using a dashboard price.
- Approved orders write SkyePay gate policy into `customers`: monthly cap, inherited RPM/RPD, device policy, provider/model allowlists, vault storage, file count, and workspace count.
- Workspace unlock is blocked until owner approval.
- Delayed Stripe payment failures move orders into `payment_failed`; delayed payment success can move orders into the owner approval lane.
- Core MetrAIyux and SkyeGate app lanes are owner-approved before activation. SkyeVault subscriptions are the explicit auto-provision exception because they call the signed vault provisioning endpoint.

## Proof Receipts

- Browser proof: `/workspaces/MetrAIyux-0S/test-artifacts/skyepay-proof/skyepay-browser-proof.json`
- Proof reel: `/workspaces/MetrAIyux-0S/test-artifacts/skyepay-proof/skyepay-proof-reel.html`
- 0S SkyeCrawler profile: `/workspaces/MetrAIyux-0S/test-artifacts/skye-crawler-skyepay-report.json`
- Scanner result: `17 checks, 0 failures, 0 warnings`

## Guardrails

- Do not store card data in FS27.
- Do not invent public discounts in code. Use approved Stripe coupons or owner-approved quote language.
- Do not unlock standard app/service workspaces directly from a successful payment. Payment creates a pending approval record.
- SkyeVault subscription offers are the exception: they call the signed SkyeVault provisioning endpoint and store a scoped developer workspace in the vault registry automatically.
- Do not remove the existing usage top-up webhook logic; SkyePay is additive.

## Final Lane After Live Proof

After browser proof passes, the next implementation lane is to register repo platforms as SkyePay billable routes. The intended direction is:

- platform id
- public client route
- approved offer id
- owner approval requirement
- workspace unlock behavior
- platform event mirror into FS27

The starter registry now lives in `netlify/functions/_lib/skyepayCatalog.js` as `SKYPAY_PLATFORM_ROUTES` and is returned by `/.netlify/functions/skyepay-offers`.
