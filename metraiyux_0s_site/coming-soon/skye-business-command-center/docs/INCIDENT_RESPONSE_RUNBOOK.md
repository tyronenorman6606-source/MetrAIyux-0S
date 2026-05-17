# Incident Response Runbook

## Severity levels
- S1: Client cannot access portal, data loss suspected, or security issue.
- S2: One module is down or email/forms failing.
- S3: Cosmetic issue, workflow question, or low-risk configuration request.

## First 15 minutes
1. Capture timestamp and reported symptom.
2. Run `docker compose ps`.
3. Run `bash scripts/health-report.sh`.
4. Check disk usage.
5. Check recent logs with `bash scripts/docker-logs.sh`.
6. Confirm DNS/HTTPS if public access is affected.

## Communication
Tell the client what is affected, what is not affected, what you are checking, and when the next update will be sent. Do not guess about data loss before proof.

## Recovery priority
Restore access first, preserve evidence second, then perform root-cause analysis.
