# Connect Your App to CitadelDB

This is the plain-English version.

## What you are doing

You are making a private database for one app.

Example:

```text
SkyRoutes needs a database.
CitadelDB creates one.
SkyRoutes gets a DATABASE_URL.
You paste that DATABASE_URL into SkyRoutes.
SkyRoutes now uses your database.
```

## From the dashboard

1. Open the CitadelDB dashboard.
2. Click **Connect App**.
3. Type the app name, like `skyeroutes`.
4. Click **Create database**.
5. Copy the generated `DATABASE_URL`.
6. Paste it into that app's environment variables.
7. Restart the app.
8. Run a write-smoke test.

## What “provision” means

Provision just means:

```text
Create a database and username for this app.
```

## What DATABASE_URL means

`DATABASE_URL` is the connection string your app uses to talk to the database.

It looks like:

```env
DATABASE_URL=postgres://app_skyeroutes_user:PASSWORD@citadeldb.internal:6432/app_skyeroutes
```

## Rule

Never put the CitadelDB admin password into your apps.

Each app gets its own database user.
