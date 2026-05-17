# Over3arth v1.4.0 Product Ledger

## Added

- Focus Chamber with reusable focus templates, timer controls, session history, focus XP, and optional proof quest creation.
- World Intelligence panel that derives the next best command from overdue quests, ritual status, proof completion, focus minutes, reviews, and realm scoring.
- Seven-day momentum strip on the dashboard for a fast visual read on charge history.
- Local snapshot vault with manual snapshots, daily automatic snapshots, restore controls, and vault clearing.
- Schema v5 normalization for focus sessions and focus settings.
- Updated local export metadata to v1.4.0.

## Still intentionally local-first

- No fake account system.
- No fake subscriptions or payments.
- No fake cloud backup. The snapshot vault is local browser storage; JSON export remains the safe cross-device path.

## Deployment gate

v1.4.0 should be deployed as a serious staging/public preview. Paid launch still needs real auth, backend sync, billing, analytics provider wiring, and notification scheduling if those are required.
