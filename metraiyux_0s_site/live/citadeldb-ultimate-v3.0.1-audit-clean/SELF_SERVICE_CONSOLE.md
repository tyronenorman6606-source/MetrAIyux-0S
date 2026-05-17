# CitadelDB Self-Service SQL Console

This is the Neon-style console foundation.

## What users can do

- Create a project
- Provision a database inside the project
- Copy a DATABASE_URL
- Run SQL in the browser
- View query history
- Track database/project ownership

## Dashboard path

```text
Dashboard → Self-Service Console
```

## Safety

The SQL console blocks dangerous role/system operations:

- DROP DATABASE
- DROP ROLE
- CREATE ROLE
- ALTER ROLE
- ALTER SYSTEM
- COPY PROGRAM
- pg_read_file / pg_write_file
- pg_sleep
- CREATE EXTENSION

Only one SQL statement is allowed per execution.

## What this does not claim yet

This is not yet Neon-level serverless autoscaling or branching.

This is the self-service console layer needed to compete:

- projects
- provision databases
- connection strings
- SQL editor
- query history
- quota scaffold
