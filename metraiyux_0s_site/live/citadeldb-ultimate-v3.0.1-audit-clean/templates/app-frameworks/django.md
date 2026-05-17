# Django CitadelDB Setup

## Environment

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:6432/DATABASE
```

## Install

```bash
pip install dj-database-url psycopg[binary]
```

## Connection snippet

```text
# settings.py
import dj_database_url
DATABASES = {
    "default": dj_database_url.config(conn_max_age=600)
}

```

## Proof

After configuring the app, run a real write-smoke test from the CitadelDB Dashboard Database Launchpad.
