# Local Privacy and Backup Guide

## What the app stores

Doctor Ops Personal Vault stores workflow records, receipts, audit events, version history, tasks, workspace metadata, and backups.

## Where data lives

There are two modes:

1. Browser-only mode: records live in browser `localStorage`. The user can export/import a complete workspace JSON file.
2. Local runtime mode: records live in `data/platform-store.json`, and backups live in `data/backups/`.

## What is not configured

- No external database.
- No cloud storage provider.
- No telemetry endpoint.
- No third-party analytics.
- No external sync worker.
- No local login system.

## Backup workflow

Recommended operator routine:

1. Start the local runtime with `npm run server`.
2. Open the command dashboard.
3. Press `Create local backup` before major edits.
4. Download backups after important work.
5. Store backup copies in the operator's approved secure location.

The runtime also creates a pre-restore backup before replacing the current store during restore.

## Confidence boundaries

This package makes a local-first data posture technically clear. It does not create a HIPAA compliance certification by itself. Any doctor or clinic using the app with regulated data must handle device security, access control, encryption at rest, backup handling, policy, and legal obligations in their own environment.
