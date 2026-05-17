# Ruby on Rails CitadelDB Setup

## Environment

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:6432/DATABASE
```

## Install

```bash
bundle add pg
```

## Connection snippet

```text
# config/database.yml
production:
  url: <%= ENV["DATABASE_URL"] %>

```

## Proof

After configuring the app, run a real write-smoke test from the CitadelDB Dashboard Database Launchpad.
