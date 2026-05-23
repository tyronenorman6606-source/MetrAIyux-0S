# skAIxu Code Evaluator Platform

skAIxu Code Evaluator Platform is a proof-first web workspace for evaluating codebases, generating implementation ledgers, applying validated patch bundles, and exporting operator-ready proof packs.

## Primary use

The platform helps builders and technical operators load a project folder, zip, individual files, pasted code, or seed pack, then inspect the project with deterministic checks before using gateway-routed analysis or patch generation.

## Core capabilities

- Project folder, zip, file, and pasted-code intake
- Static project preview through a browser service-worker file server
- Deterministic code scans for routes, links, actions, environment variables, risky APIs, secret-like strings, docs gaps, and public-claim words
- Workspace save/load with version history, diffs, and shared-workspace API contracts
- Seed manifest loading and seed data materialization
- Large-folder seed chunking, duplicate detection, and provenance records
- Framework adapter detection and build-command planning
- Task runner receipts and deterministic patch-bundle generation
- Proof pack export for operator handoff
- Inherited upstream identity contract for tenant, user, role, and plan context
- Gateway-routed AI calls through the configured kAIxuGateway13 path

## Product boundary

The public website lives at `/` and the operator app lives at `/app.html`.

The platform does not implement its own login wall. It is designed to inherit identity from an upstream SaaS shell or parent platform. Browser model calls are designed around a gateway route rather than direct model-provider endpoints.

Proof packs are deterministic local evidence. They do not imply live deployment proof, live payment proof, live provider credential proof, or browser automation proof unless a receipt specifically proves that check in the current environment.
