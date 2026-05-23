# v0.2.0 Upgrade Notes

This upgrade moves SkyeAPI + AegisCore from a concept seed into a compile-proven repo seed.

## Fixed

- Workspace TypeScript resolution now builds in topological order before typechecking.
- Package `dist` output is generated inside each package/app instead of accidentally relying on missing declaration output.
- Every package now exposes `dist/index.js` and `dist/index.d.ts` through package exports.
- Added a built-package smoke proof so the proof script tests the actual compiled packages, not only a standalone smoke file.

## Added

- Cloudflare R2 `storage.upload` provider adapter.
- Neon `db.inspect_schema` provider adapter.
- Hosted Worker `storage.upload` support.
- Hosted Worker `db.query` and `db.inspect_schema` support.
- Hosted Worker admin key creation endpoint.
- Hosted Worker admin key revocation endpoint.
- CORS/security headers for the Worker JSON API.
- Provider failure bodies are now suppressed by default to reduce leakage risk.
- `pnpm proof` now runs build, workspace typecheck, local smoke, and built-package smoke.

## Truth status

This package now has source-level and package-level local proof. It is not yet deploy-verified because live-provider and deployed-Worker proof are still open.
