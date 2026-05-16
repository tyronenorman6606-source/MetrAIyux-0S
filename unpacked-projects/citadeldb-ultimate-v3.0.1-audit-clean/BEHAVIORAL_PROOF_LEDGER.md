# Behavioral Proof Ledger

v2.4 exists because syntax proof is not enough.

## What this pass attempts

- install gateway/dashboard dependencies
- build public site
- boot dashboard server
- hit dashboard HTTP routes
- boot gateway server
- hit gateway health route
- write proof report into `proof/`

## What remains live-only

- boot full Docker/Postgres stack
- apply migrations against real Postgres
- provision a database against real Postgres
- run SQL console against real app DB
- prove Stripe webhook with real Stripe
- prove branch clone with real source/target DB

## Protected Routes probe corrected

The protected-routes page renders with title text `Protected Routes`; behavioral proof now checks the rendered title instead of a later body phrase that was outside the 4KB capture window.
