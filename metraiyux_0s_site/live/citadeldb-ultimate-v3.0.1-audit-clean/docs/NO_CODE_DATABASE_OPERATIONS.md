# No-Code Database Operations

## Create an app database

Dashboard:

```text
Database Launchpad → Create a database for an app
```

Type the app name and submit.

## Rotate app credential

Dashboard:

```text
Database Launchpad → Existing app databases → Open → Rotate credential
```

This gives you a fresh DATABASE_URL.

## Test the app DATABASE_URL

Dashboard:

```text
Database Launchpad → Test a DATABASE_URL
```

Paste the app's connection string.

Check:

```text
Also run real write-smoke
```

This proves the app database can accept writes.

## Ask AI for help

After a test, click OpenAI or Gemini debug.

The test result is attached automatically.
