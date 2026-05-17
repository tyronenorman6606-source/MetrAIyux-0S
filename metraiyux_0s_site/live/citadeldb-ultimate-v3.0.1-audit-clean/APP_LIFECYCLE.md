# CitadelDB App Lifecycle

This is the end-to-end path for moving a real app onto CitadelDB.

## Dashboard path

```text
Dashboard → App Lifecycle
```

## Lifecycle stages

1. Create app database.
2. Generate onboarding packet.
3. Generate migration plan.
4. Export/import data.
5. Run app migrations.
6. Test DATABASE_URL.
7. Run write-smoke.
8. Run backup.
9. Run restore-test.
10. Switch production app env.
11. Monitor.
12. Keep rollback packet.

## Acceptance

The app is not accepted until:

☐ connection test receipt  
☐ write-smoke receipt  
☐ backup receipt  
☐ restore-test receipt  
☐ deployment/cutover receipt  

## Rule

A migration plan is not migration proof.
A queued job is not proof.
Only receipts and successful checks count.
