# NEXUS Cloudflare Smoke Tests

```bash
curl https://YOUR_WORKER/api/nexus/status
curl -X POST https://YOUR_WORKER/api/nexus/route   -H 'content-type: application/json'   -d '{"message":"New government staffing lead needs capability packet and compliance review"}'
curl https://YOUR_WORKER/api/nexus/ledger
```

Passing proof: status returns ok, route returns a primary brain and secondary reviewer, ledger returns D1 rows after the route call.
