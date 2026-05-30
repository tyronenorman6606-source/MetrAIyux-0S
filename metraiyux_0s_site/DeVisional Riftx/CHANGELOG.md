# DeVisional Riftx Changelog

## 2026-05-27

- Reconfirmed the SuperIDE / DeVisional lane for the broader 0S gate-only rule. The 0S paid AI lane and Business Card Factory copy pass no longer fall back to direct OpenAI calls; AI work now requires the shared FS27 gateway or returns an honest gateway-required/local-fallback response. The AI gate audit receipt `test-artifacts/ai-gate-audit/ai-gate-audit-latest.json` passed with zero failures, and the current production Founder Command smoke confirmed PWA Factory analyze returns `fs27-gateway-required` instead of `0s-openai-direct`.
- Kept DeVisional/SuperIDE access on the shared FS27/SkyGate/Free99 owner session rather than adding an app-local founder/admin password lane.

## 2026-05-25

- Copied the full SuperIDEv2 Sovereign Author Publishing System source into `metraiyux_0s_site/DeVisional Riftx` as the real workspace base instead of a wrapper.
- Removed app-owned passphrase/JWT auth from the copied source and added `platform/fs27-gate.js` for shared FS27/SkyGate/Free99 bearer sessions.
- Replaced direct payment-provider execution with SkyPay handoff sessions and FS27-tracked commerce receipts.
- Replaced external vendor portal dispatch with FS27 owner-approval publishing receipts, package registration, and SkyeNet handoff planning.
- Mounted the browser app into the 0S catalog and Worker asset stage at `/DeVisional%20Riftx/app/`, with `/devisional-riftx` as the gated convenience route.
- Published the copied browser app through SkyeNet at `/skyenet/devisional-riftx/` and marked that SkyeNet surface private so the shared 0S gate forwards the FS27 owner context before runtime access.
- Added proof coverage with `npm run 0s:devisional-riftx:proof`.
