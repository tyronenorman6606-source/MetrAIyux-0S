# pgBackRest / PITR Extraction

## What matters

Backups are not enough. A serious platform needs:

- full backups
- differential/incremental backups
- WAL archiving
- point-in-time recovery
- restore tests
- retention policy
- offsite copy
- receipts

## CitadelDB rule

Every backup must produce a Reliquary receipt.

Every restore test must update the receipt.

Every production claim must say whether PITR has been proven.

## v0.2 status

✅ manual dump backup exists  
✅ restore-test command exists  
✅ pgBackRest config template exists  
☐ live pgBackRest stanza creation not proven  
☐ live PITR not proven  
