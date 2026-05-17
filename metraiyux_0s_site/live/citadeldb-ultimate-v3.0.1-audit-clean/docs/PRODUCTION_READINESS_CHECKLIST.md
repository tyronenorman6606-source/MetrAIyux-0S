# Production Readiness Checklist

## Minimum serious

✅ strong `.env` secrets  
✅ Postgres not publicly exposed  
✅ PgBouncer enabled  
✅ app-specific database users  
✅ no app uses superuser credentials  
✅ backup command passes  
✅ restore-test command passes  
✅ gateway health passes  
✅ proof receipts exist  
✅ claims ledger updated  

## Paid client

☐ offsite encrypted backup  
☐ weekly restore drill  
☐ monitoring dashboard  
☐ uptime checks  
☐ connection pool tuning  
☐ database size alerts  
☐ slow query visibility  
☐ disaster recovery runbook tested  

## HA serious

☐ replica configured  
☐ failover tested  
☐ app reconnect tested  
☐ DNS/tunnel route switch tested  
☐ WAL/PITR tested  
☐ operator dashboard protected  
☐ access logs reviewed  

If restore is not tested, backups are not real. If failover is not tested, HA is not real.
