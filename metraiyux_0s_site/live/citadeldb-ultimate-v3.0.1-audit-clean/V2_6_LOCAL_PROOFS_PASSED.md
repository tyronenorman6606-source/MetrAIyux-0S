# v2.6 Local Proofs Passed

    Runtime integrity, behavioral HTTP proof, route protection proof, handler guard proof, and worker allowlist proof passed.

    Live DB/Docker proofs remain host-dependent and are included as executable commands.

    ```json
    {
  "runtime_integrity": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/runtime-integrity-20260511T154706Z.json\",\n  \"counts\": {\n    \"files\": 327,\n    \"codeFiles\": 29,\n    \"checks\": 42,\n    \"failed\": 0\n  },\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "behavioral_proof": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/behavioral-proof-20260511T154709Z.json\",\n  \"checks\": 8,\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "route_protection": {
    "exit_code": 0,
    "stdout": "CitadelDB Route Protection Proof\nTimestamp: 2026-05-11T15:47:19Z\n\nPASS: self_service_database_provision\nPASS: self_service_sql_execute\nPASS: table_browser_list\nPASS: table_browser_preview\nPASS: branch_request\nPASS: setup_generate_secrets\nPASS: guided_proof_action\nPASS: app_lifecycle_action\nPASS: credential_rotation\nPASS: ai_debug\n\nRoute protection proof: PASS\n",
    "stderr": ""
  },
  "handler_guard": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/handler-guard-proof-20260511T154719Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "worker_allowlist": {
    "exit_code": 0,
    "stdout": "{\n  \"ok\": true,\n  \"proof\": \"proof/worker-allowlist-proof-20260511T154719Z.json\",\n  \"failed\": []\n}\n",
    "stderr": ""
  },
  "database_lifecycle_attempt": {
    "exit_code": 2,
    "stdout": "OPEN: DATABASE_URL is required for direct DB lifecycle proof\n",
    "stderr": ""
  },
  "gateway_sql_console_attempt": {
    "exit_code": 1,
    "stdout": "{\n  \"ok\": false,\n  \"proof\": \"proof/gateway-sql-console-proof-20260511T154719Z.json\",\n  \"failed\": [\n    {\n      \"name\": \"required_env\",\n      \"ok\": false,\n      \"error\": \"CITADEL_PROJECT_SLUG, CITADEL_APP_SLUG, and DATABASE_URL are required.\"\n    }\n  ]\n}\n",
    "stderr": ""
  },
  "live_stack_e2e_attempt": {
    "exit_code": 2,
    "stdout": "{\n  \"ok\": false,\n  \"proof\": \"proof/live-stack-e2e-20260511T154720Z.json\",\n  \"failed\": [\n    {\n      \"name\": \"docker_available\",\n      \"ok\": false,\n      \"error\": \"Docker is not available in this environment. Run this proof on the deployment machine.\"\n    }\n  ]\n}\n",
    "stderr": ""
  }
}
    ```
