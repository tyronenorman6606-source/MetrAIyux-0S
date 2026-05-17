# v2.9 Local Proofs Passed

All local required proofs passed.

```json
{
  "runtime_integrity": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/runtime-integrity-20260511T161209Z.json\",\n  \"counts\": {\n    \"files\": 433,\n    \"codeFiles\": 37,\n    \"checks\": 50,\n    \"failed\": 0\n  },\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "runtime_reference": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/runtime-reference-20260511T161213Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "lifecycle_packet_composition": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/lifecycle-packet-composition-20260511T161213Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "migration_init_parity": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/migration-init-parity-20260511T161213Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "provisioning_ddl": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/provisioning-ddl-20260511T161213Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "gateway_worker_job_parity": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/gateway-worker-job-parity-20260511T161213Z.json\",\n  \"missingInGateway\": [],\n  \"missingInWorker\": []\n}\n",
    "stderr": ""
  },
  "schema_query_consistency": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/schema-query-consistency-20260511T161213Z.json\",\n  \"missingTables\": [],\n  \"missingRequired\": []\n}\n",
    "stderr": ""
  },
  "sql_policy_negative": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/sql-policy-negative-20260511T161214Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "postgres_ddl_safety": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/postgres-ddl-safety-20260511T161214Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "handler_guard": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/handler-guard-proof-20260511T161214Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "worker_allowlist": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/worker-allowlist-proof-20260511T161214Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "behavioral_proof": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/behavioral-proof-20260511T161214Z.json\",\n  \"checks\": 8,\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "database_lifecycle_attempt": {
    "exit_code": 2,
    "stdout": "OPEN: DATABASE_URL is required for direct DB lifecycle proof\n",
    "stderr": ""
  },
  "gateway_sql_console_attempt": {
    "exit_code": 1,
    "stdout": "{\n  \"ok\": false,\n  \"proof\": \"proof/gateway-sql-console-proof-20260511T161225Z.json\",\n  \"failed\": [\n    {\n      \"name\": \"required_env\",\n      \"ok\": false,\n      \"error\": \"CITADEL_PROJECT_SLUG, CITADEL_APP_SLUG, and DATABASE_URL are required.\"\n    }\n  ]\n}\n",
    "stderr": ""
  },
  "live_stack_e2e_attempt": {
    "exit_code": 2,
    "stdout": "{\n  \"ok\": false,\n  \"proof\": \"proof/live-stack-e2e-20260511T161226Z.json\",\n  \"failed\": [\n    {\n      \"name\": \"docker_available\",\n      \"ok\": false,\n      \"error\": \"Docker is not available in this environment. Run this proof on the deployment machine.\"\n    }\n  ]\n}\n",
    "stderr": ""
  }
}
```
