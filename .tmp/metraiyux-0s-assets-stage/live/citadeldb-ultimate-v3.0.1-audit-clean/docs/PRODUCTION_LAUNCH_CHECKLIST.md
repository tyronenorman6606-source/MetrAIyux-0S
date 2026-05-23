# Production Launch Checklist

## Before launch

☐ `.env` secrets replaced  
☐ `./cli/citadel validate-env` passes  
☐ Postgres is private-only  
☐ Gateway/dashboard are private or upstream-auth protected  
☐ App database provisioned  
☐ App env generated  
☐ App write smoke passes  
☐ Backup passes  
☐ Restore-test passes  
☐ Backup manifest generated  
☐ Policy check passes  
☐ Service catalog exported  
☐ Rollback plan exists  

## Paid-client launch

☐ offsite/object backup sync proven  
☐ clean-server restore drill done  
☐ monitoring dashboard reachable  
☐ alert routing configured  
☐ incident response owner assigned  
☐ credential rotation path tested  
☐ access list reviewed  

## HA launch

☐ CloudNativePG cluster applied  
☐ pooler route tested  
☐ failover proof done  
☐ PITR proof done  
☐ app reconnect after failover tested  
