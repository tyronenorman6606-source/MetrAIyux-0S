# PHX Verified Platform v18 Upgrade Notes

v18 is a code-depth pass. It does not add local auth and it does not pretend deployment/provider wiring is complete.

## Added

✅ `src/server/adapter-runtime.mjs` — concrete runtime adapter bridge with `JsonPlatformAdapter`, `D1PlatformAdapter`, `AdapterActionStore`, and `AdapterStateStore`.
✅ `src/server/admin-api.mjs` — upstream-auth admin operation handler for approval, rejection, replay, change-set export, outbox processing, and exposure-order intake.
✅ `netlify/functions/phx-admin.mjs` — admin endpoint wrapper.
✅ `src/server/notification-service.mjs` — signed webhook outbox verification, dry-run delivery, target resolution, and receipt recording.
✅ `src/server/exposure-service.mjs` — priced exposure product catalog and sponsor-intent order builder.
✅ `scripts/v18-enhance.mjs` — v18 internal surfaces and static API models.
✅ `scripts/v18-smoke.mjs` — adapter/admin/notification/exposure smoke proof.
✅ `/runtime-adapter/`
✅ `/admin-api/`
✅ `/notification-service/`
✅ `/exposure-orders/`
✅ `data/runtime-adapter-model.json`
✅ `data/admin-api-model.json`
✅ `data/notification-service-model.json`
✅ `data/exposure-order-model.json`
✅ `api/exposure-products.json`

## Boundaries

☐ Payment provider checkout is not wired yet.
☐ Email/SMS provider delivery is not wired yet.
☐ The admin UI is not a full authenticated SPA because upstream auth is intentionally external.
☐ D1 adapter code exists, but live D1 binding proof requires the deployed worker/function environment.
