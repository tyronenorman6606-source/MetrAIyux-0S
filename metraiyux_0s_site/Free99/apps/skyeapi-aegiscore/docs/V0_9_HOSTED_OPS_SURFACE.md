# SkyeAPI + AegisCore v0.9.0 Hosted Ops Surface

v0.9.0 moves the v0.8.0 ops engines behind real gateway, SDK, CLI, and console surfaces.

## Added code

- Hosted async job routes:
  - `GET /v1/admin/jobs`
  - `POST /v1/admin/jobs`
  - `POST /v1/admin/process-job`
  - `POST /v1/admin/cancel-job`
- Hosted outbound event routes:
  - `GET /v1/admin/outbound-subscriptions`
  - `POST /v1/admin/outbound-subscriptions`
  - `POST /v1/admin/outbound-events`
  - `GET /v1/admin/outbound-deliveries`
  - `POST /v1/admin/process-outbound`
- Hosted ops intelligence routes:
  - `GET /v1/admin/doctor`
  - `GET /v1/admin/anomalies`
  - `GET /v1/admin/ops-readiness`
- Provider-pack authoring/certification routes:
  - `POST /v1/admin/provider-pack-scaffold`
  - `POST /v1/admin/provider-pack-certify`
- SDK admin methods for every new route.
- CLI commands for jobs, outbound webhooks, anomalies, doctor, readiness, scaffolding, and certification.
- Console panels for async jobs, outbound webhooks, ops doctor, anomalies, and provider-pack authoring.

## Truth boundary

These are product-code surfaces and local proofs. This version does not claim durable distributed queue locking, deployed Worker behavior, live outbound delivery to customer endpoints, or live provider certification until those are run in a deployed environment with real credentials and endpoints.
