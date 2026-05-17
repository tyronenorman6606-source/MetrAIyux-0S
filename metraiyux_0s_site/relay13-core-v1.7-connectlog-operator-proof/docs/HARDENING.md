# V1.1 Hardening Notes

Implemented hardening in this package:

✅ Workspace-domain allowlisting for public widget config and widget conversation creation.
✅ Admin-managed domain list at `/api/admin/workspace-domains`.
✅ Constant-time comparison for `PLATFORM_ADMIN_TOKEN` checks.
✅ API key raw values are still shown once and only SHA-256 hashes are stored.
✅ API key `last_used_at` writes are throttled to avoid one D1 write per API call.
✅ API key expiration field is supported.
✅ Conversation list queries are workspace-scoped and use stored counters instead of per-row message-count subqueries.
✅ `message_count`, `operator_unread_count`, `customer_unread_count`, and `last_message_sort` are stored on conversations.
✅ Message creation validates that the target conversation belongs to the authenticated workspace before writing.
✅ WebSocket operator connections validate the conversation/workspace pair.
✅ JSON payload size is capped before parsing.
✅ Workspace monthly conversation and message limits are present in schema and enforced.
✅ Job queue only accepts approved internal job types.
✅ Text-only V1 remains intact; no attachment storage path is included.

Live gates still required:

☐ Deploy to Cloudflare.
☐ Apply D1 migration.
☐ Configure `PLATFORM_ADMIN_TOKEN`.
☐ Add allowed widget domains for each production workspace.
☐ Browser-prove widget creation is rejected from an unlisted domain after at least one domain is configured.
☐ Browser-prove two-tab live messaging still works after hardening.


✅ ConnectLog bridge fields are optional metadata on the existing conversation path, so Relay13 does not require ConnectLog to run.
✅ ConnectLog welcome messages are stored as `system` messages and still pass workspace message limits.
✅ Public ConnectLog QR bridge payloads do not require or expose operator API keys.
