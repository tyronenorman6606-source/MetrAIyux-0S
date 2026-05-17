# Database Branching

Database branching is required for Neon-level parity.

v2.0 adds branch request tracking and proof boundaries.

## Included

- branch request schema
- branch event schema
- dashboard branch request page
- branch request endpoint
- source kind support:
  - snapshot
  - PITR
  - logical dump

## Not claimed yet

The package does not yet prove live branch creation.

A branch is not "created" until a worker produces:

☐ source snapshot/PITR receipt  
☐ target database creation receipt  
☐ restore/import receipt  
☐ branch connection test  
☐ branch write-smoke receipt  
