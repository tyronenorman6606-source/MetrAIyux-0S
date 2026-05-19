# Upstream Auth for Partner Review

SovereignDocs still has no built-in auth. Production review submission should run behind Omega Skygate or another upstream identity boundary.

Use:

```bash
SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH=1
SOVEREIGNDOCS_UPSTREAM_SECRET=<shared-secret-from-upstream-auth>
```

Signed upstream roles:

- `operator` or `reviewer`: can route review packets.
- `legal_partner`: can update partner-facing review status.
- `admin` or `owner`: can perform all partner-review operations.
- public/upstream users: can submit review requests when verified mode is enabled.
