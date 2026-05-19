export const GATEWAY_VERSION = "0.17.0";

export const GATEWAY_CODE_DEPTH = [
  "approval_queue",
  "webhook_signature_modes",
  "config_snapshots",
  "workflow_run_ledger",
  "ops_package",
  "async_job_engine",
  "outbound_webhook_hub",
  "adapter_conformance",
  "hosted_jobs",
  "outbound_subscriptions",
  "ops_doctor",
  "usage_anomalies",
  "provider_pack_certification",
  "durable_jobs",
  "dead_letters",
  "outbound_subscription_lifecycle",
  "provider_pack_registry",
  "billing_usage_records",
  "job_leases",
  "signed_pack_manifests",
  "pack_dependency_checks",
  "billing_exports",
  "console_contract_smoke",
  "pack_source_installs",
  "certification_receipts",
  "billing_invoice_drafts",
  "playwright_console_spec",
  "worker_http_behavioral_smoke",
  "billing_lifecycle_objects",
  "provider_fixture_certification",
  "gateway_modules"
] as const;

export const GATEWAY_PAID_CONTROLS = [
  "plans",
  "daily_limits",
  "rate_limits",
  "key_expiry",
  "truth_gate",
  "worker_http_behavioral_proof"
] as const;
