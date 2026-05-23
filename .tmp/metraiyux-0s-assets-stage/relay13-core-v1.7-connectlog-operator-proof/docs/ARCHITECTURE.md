# Relay13 Core V1 Architecture

V1 is one Cloudflare Worker deployment with configuration-based multi-tenancy. It does not use Workers for Platforms. Each client/app is isolated by `workspace_id`, not by customer-owned code execution.

## Infrastructure

- Cloudflare Worker: API, admin dashboard, widget script, static assets.
- Durable Objects: active live conversation rooms only.
- D1: indexed durable database for workspaces, widget configs, API keys, conversations, messages, jobs, releases, and audit events.
- No R2 in V1.
- No Queues in V1.
- No attachments in V1.
- No preloaded conversations or messages.

## Cost control rules

1. Every inbox query is scoped to `workspace_id` and limited.
2. Conversation lists use indexes on workspace/status/last activity.
3. Message history loads one selected conversation at a time.
4. The dashboard refreshes the selected workspace only.
5. Durable Objects are used only for active live threads.
6. V1 is text-only, so attachments and exports cannot grow storage cost.

## Core routes

Admin:

- `POST /api/bootstrap`
- `GET /api/admin/workspaces`
- `POST /api/admin/workspaces`
- `GET /api/admin/dashboard?workspace_id=...`
- `GET /api/admin/api-keys?workspace_id=...`
- `POST /api/admin/api-keys`
- `POST /api/admin/api-keys/:id/revoke`
- `PATCH /api/admin/conversations/:id`
- `POST /api/admin/widget-configs/publish`
- `POST /api/admin/jobs`

Public/API:

- `GET /api/health`
- `GET /api/v1/widget-config?workspace=...`
- `POST /api/v1/conversations`
- `GET /api/v1/conversations?workspace_id=...`
- `GET /api/v1/conversations/:id/messages`
- `POST /api/v1/conversations/:id/messages`
- `GET /api/ws/:conversation_id`

## First live proof

1. Set `PLATFORM_ADMIN_TOKEN`.
2. Create and migrate D1.
3. Deploy Worker.
4. Open `/admin/`.
5. Bootstrap workspace.
6. Open `/` and start a chat.
7. Confirm the conversation appears in admin.
8. Reply from admin.
9. Confirm the widget receives the reply live.


## ConnectLog bridge lane

ConnectLog can call the existing conversation creation endpoint with `connectlog_*` metadata. Relay13 does not become ConnectLog; it records the card/campaign context on messages and can create a welcome `system` message before the customer message. The public visitor-token thread model remains unchanged.
