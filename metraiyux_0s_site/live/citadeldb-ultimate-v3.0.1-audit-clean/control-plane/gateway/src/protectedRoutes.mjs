export const protectedRoutes = [
  {
    key: 'self_service_database_provision',
    method: 'POST',
    path: '/admin/self-service/projects/:projectSlug/databases',
    status: 'guarded',
    reason: 'Creates billable database infrastructure.'
  },
  {
    key: 'self_service_sql_execute',
    method: 'POST',
    path: '/admin/self-service/projects/:projectSlug/databases/:appSlug/sql',
    status: 'guarded',
    reason: 'Consumes query execution and exposes query results.'
  },
  {
    key: 'table_browser_list',
    method: 'POST',
    path: '/admin/self-service/projects/:projectSlug/databases/:appSlug/tables',
    status: 'guarded',
    reason: 'Exposes database schema.'
  },
  {
    key: 'table_browser_preview',
    method: 'POST',
    path: '/admin/self-service/projects/:projectSlug/databases/:appSlug/table-preview',
    status: 'guarded',
    reason: 'Exposes table row data.'
  },
  {
    key: 'branch_request',
    method: 'POST',
    path: '/admin/self-service/projects/:projectSlug/databases/:appSlug/branch-request',
    status: 'guarded',
    reason: 'Requests potentially expensive branch/clone infrastructure.'
  },
  {
    key: 'setup_generate_secrets',
    method: 'POST',
    path: '/admin/setup/generate-secrets',
    status: 'guarded',
    reason: 'Generates sensitive server secrets.'
  },
  {
    key: 'guided_proof_action',
    method: 'POST',
    path: '/admin/guided/proof-action',
    status: 'guarded',
    reason: 'Queues backup/restore/proof jobs.'
  },
  {
    key: 'app_lifecycle_action',
    method: 'POST',
    path: '/admin/apps/:appSlug/lifecycle-action',
    status: 'guarded',
    reason: 'Queues app lifecycle jobs.'
  },
  {
    key: 'credential_rotation',
    method: 'POST',
    path: '/admin/apps/:appSlug/rotate-credential',
    status: 'guarded',
    reason: 'Changes app database credentials.'
  },
  {
    key: 'ai_debug',
    method: 'POST',
    path: '/admin/ai/debug',
    status: 'guarded',
    reason: 'Consumes AI provider credits and diagnostic context.'
  }
];
