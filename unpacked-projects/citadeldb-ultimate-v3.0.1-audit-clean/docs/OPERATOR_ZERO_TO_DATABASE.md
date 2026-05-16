# Operator Zero to Database

This is the non-technical path.

## 1. Open Setup Wizard

```text
Dashboard → Setup Wizard
```

Fix missing required secrets.

## 2. Open First Run

```text
Dashboard → First Run
```

Check the setup score.

## 3. Create app database

```text
Dashboard → Database Launchpad → Create database
```

Type the app name.

## 4. Paste DATABASE_URL

Copy the generated `DATABASE_URL` into the app's environment variables.

## 5. Test it

```text
Database Launchpad → Test DATABASE_URL
```

Check:

```text
Also run real write-smoke
```

## 6. Prove backup

```text
Guided Ops → backup-now
Guided Ops → restore-test
```

## 7. Ask AI if stuck

```text
Guided Ops → Diagnostic Bundle → Ask OpenAI or Gemini
```
