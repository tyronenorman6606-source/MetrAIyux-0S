# Database Launchpad

This is the simplest way to use CitadelDB.

## What the Launchpad does

The dashboard lets you:

1. Create a database for an app.
2. Show the connection settings.
3. Rotate the app password if needed.
4. Test a pasted DATABASE_URL.
5. Run a real write-smoke check.
6. Ask OpenAI or Gemini what a failed result means.

## Plain English

If your app needs a database, open:

```text
Dashboard → Database Launchpad
```

Then click:

```text
Create database
```

CitadelDB creates the database and gives you a DATABASE_URL.

Paste the DATABASE_URL into the app.

Restart the app.

Then test the same DATABASE_URL in Launchpad.

## Important

The Launchpad does not fake success.

A real write-smoke only passes if CitadelDB can connect and write a test row into the database.
