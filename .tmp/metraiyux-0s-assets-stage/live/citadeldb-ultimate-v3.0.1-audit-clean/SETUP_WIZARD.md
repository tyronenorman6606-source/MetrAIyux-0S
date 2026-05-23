# CitadelDB Setup Wizard

The Setup Wizard is the dashboard page for first-time configuration.

Open:

```text
/setup-wizard
```

## What it shows

- required secrets
- optional AI keys
- optional object backup keys
- what each secret means
- what is missing
- what to do next

## What it can generate

It can generate the three required secrets:

```env
POSTGRES_PASSWORD=
GATEWAY_ADMIN_TOKEN=
BACKUP_ENCRYPTION_PASSWORD=
```

You still paste them into `.env` yourself.

## Why it does not write `.env`

Writing server secrets from a browser dashboard is risky.

The dashboard shows values once. The operator stores them safely and pastes them into the server `.env`.

## Normal first run

1. Open Setup Wizard.
2. Generate missing secrets if needed.
3. Paste into `.env`.
4. Restart stack.
5. Open First Run.
6. Open Database Launchpad.
7. Create first app database.
8. Test DATABASE_URL.
9. Run backup and restore-test from Guided Ops.
