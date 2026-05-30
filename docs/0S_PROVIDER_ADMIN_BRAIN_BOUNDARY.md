# 0S Provider/Admin Brain Execution Boundary

The Admin Brain, CodeStudio provider adapter, and 0S provider runtime share the FS27/SkyGate/Free99 gate. They must not mint app-specific admin secrets.

## Receipt Semantics

- `executed:true` means the runtime completed one of these bounded paths: a sandbox receipt, a SITE_EVENTS_KV-backed internal receipt executor run, or a real provider/backend response.
- `provider_call_made:true` is the only receipt field that proves a live external provider/backend boundary was crossed.
- `execution_mode:"sandbox_receipt"` means no provider call was sent. It proves routing, auth, grants, consent checks, payload shaping, storage, FS27 mirror, and Command Bridge mirror only.
- `execution_mode:"internal_receipt_executor"` means the same-domain 0S receipt executor wrote/closed internal work. It is not an external provider send.
- `execution_mode:"queued_for_owner_approval"`, `queued_for_dedicated_backend`, or `retry_queued_no_execution` must never be treated as provider execution.

## Proof Defaults

Non-browser proofs must default to sandbox or internal-receipt execution. The Admin Brain live HTTP proof only attempts live Resend provider calls when `ADMIN_BRAIN_ALLOW_LIVE_PROVIDER_CALLS=1` is explicitly set for that proof run.

Retry proofs must preserve the original failed/dead-letter receipt and create a new retry receipt with `retry_of`, `retry_attempt`, and dead-letter retry history.
