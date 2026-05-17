# Python / SQLAlchemy CitadelDB Setup

## Environment

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:6432/DATABASE
```

## Install

```bash
pip install sqlalchemy psycopg[binary]
```

## Connection snippet

```text
from sqlalchemy import create_engine, text
import os

engine = create_engine(os.environ["DATABASE_URL"])
with engine.connect() as conn:
    print(conn.execute(text("select now()")).first())

```

## Proof

After configuring the app, run a real write-smoke test from the CitadelDB Dashboard Database Launchpad.
