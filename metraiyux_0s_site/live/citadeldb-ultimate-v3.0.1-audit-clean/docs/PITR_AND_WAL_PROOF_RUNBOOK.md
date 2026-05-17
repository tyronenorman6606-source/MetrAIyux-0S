# PITR and WAL Proof Runbook

This is the proof gate for point-in-time recovery. Do not claim PITR until this is executed on the target engine.

## VPS lane concept

The v0.5 VPS compose enables `wal_level=replica` and an archive directory scaffold. That is not full PITR proof by itself.

## Required proof steps

1. Confirm WAL archiving is active.
2. Take a base backup.
3. Create proof table and insert row A.
4. Record timestamp T.
5. Insert row B.
6. Restore to timestamp T.
7. Verify row A exists and row B does not.
8. Save receipt to `proof/pitr-YYYYMMDDTHHMMSSZ.txt`.

## Pass condition

✅ restore to timestamp succeeds  
✅ data state matches expected timestamp  
✅ receipt saved  
✅ rollback path documented  

## Claim rule

Without a timestamp restore receipt, say "PITR-ready scaffold," not "PITR proven."
