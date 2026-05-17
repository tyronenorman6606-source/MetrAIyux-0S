# v1.0 Acceptance Checklist

## Package acceptance

☐ `VERSION` exists and matches release package  
☐ `README.md` brand intro is correct  
☐ `PUBLIC_ARCHITECTURE.md` exists  
☐ `brand/BRAND_CONFIG.json` exists  
☐ `claims/PUBLIC_CLAIMS_PACK.md` exists  
☐ `architecture/CITADELDB_SOVEREIGN_ARCHITECTURE.md` exists  
☐ `tools/public-architecture-guard.sh` passes  
☐ `tools/package-integrity-proof.sh` passes  
☐ `tools/repo-hygiene-scan.sh` passes  
☐ `tools/final-rc-smoke.sh` passes  

## VPS acceptance

☐ `./cli/citadel vps-preflight` passes  
☐ `./cli/citadel validate-env` passes  
☐ `make prod-up` starts stack  
☐ `./cli/citadel health` passes  
☐ `./cli/citadel backup-now` passes  
☐ `./cli/citadel restore-test` passes  
☐ `./cli/citadel policy-check` passes  
☐ `./cli/citadel backup-manifest` passes  

## Dashboard acceptance

☐ dashboard accessible privately  
☐ dashboard not exposed publicly  
☐ architecture page visible  
☐ jobs page visible  
☐ readiness page visible  
☐ Playwright browser proof passes  

## App acceptance

☐ app database provisioned  
☐ app env generated  
☐ migrations applied  
☐ app write smoke passes  
☐ backup after app migration passes  
☐ restore-test after app migration passes  
☐ rollback plan generated  

## Production claims acceptance

☐ claims ledger updated  
☐ public claims pack updated  
☐ live proof receipts attached  
☐ unsupported claims removed  
