# Dashboard Operator Guide

## Common flow: connect an app

1. Open Dashboard.
2. Click **Connect App**.
3. Enter app name.
4. Click **Create database**.
5. Copy the generated `DATABASE_URL`.
6. Paste it into the app.
7. Restart the app.
8. Run app write smoke.
9. Run backup and restore-test.

## Common flow: ask AI for help

1. Open Dashboard.
2. Click **AI Debug**.
3. Pick OpenAI or Gemini.
4. Select app context if relevant.
5. Ask the question in plain English.
6. Follow the suggested proof commands.

## Common flow: prove backups

1. Click **Actions**.
2. Enqueue `backup-now`.
3. Enqueue `restore-test`.
4. Check **Jobs**.
5. Check **Backups** and **Restores**.

## No fake success

The dashboard can simplify operations, but it must not claim a write worked unless a write-smoke receipt exists.
