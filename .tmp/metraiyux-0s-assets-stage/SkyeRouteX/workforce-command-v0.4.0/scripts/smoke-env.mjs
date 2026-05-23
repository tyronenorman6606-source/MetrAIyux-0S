export const LOCAL_PROOF_ENV = {
  DATABASE_DRIVER: 'local-json',
  STORAGE_DRIVER: 'local-json',
  SKYE_ALLOW_LOCAL_PROOF_SERVICES: '1',
  PAYMENT_PROVIDER: 'ledger-only',
  NOTIFICATION_PROVIDER: 'in-app-ledger',
  ROUTE_INTELLIGENCE_PROVIDER: 'route-structure-only',
  IDENTITY_COMPLIANCE_PROVIDER: 'local-attestation-ledger',
  SKYEHANDS_RUNTIME_PROVIDER: 'standalone-local-events'
};

export function smokeEnv(overrides = {}) {
  return { ...process.env, ...LOCAL_PROOF_ENV, ...overrides };
}
