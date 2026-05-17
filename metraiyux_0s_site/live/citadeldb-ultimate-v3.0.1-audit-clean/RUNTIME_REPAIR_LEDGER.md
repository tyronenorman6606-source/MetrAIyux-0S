# Runtime Repair Ledger

## Why this exists

The previous packages added too many surfaces without enough runtime proof.

v2.3 focuses on whether the package can even be trusted as code.

## Checks added

✅ Node syntax check for `.mjs` and `.js` files  
✅ server route placeholder scan  
✅ protected route guard scan  
✅ Stripe raw-body capture scan  
✅ proof script presence scan  
✅ public overclaim scan  

## Still not proven here

☐ Docker stack booted  
☐ Postgres migrations applied live  
☐ dashboard opened in browser  
☐ SQL console executed against live DB  
☐ Stripe webhook delivered live  
☐ branch clone worker run against live source/target DB  
☐ live subscription blocked a route  

## Truth

This package is not "live closed" until those runtime/live proofs exist.

## v2.4 behavioral repair findings

Behavioral proof exposed two real runtime issues:

✅ Dashboard used `GATEWAY_BASE_URL`, but proof runner passed `GATEWAY_URL`. Fixed proof runner.  
✅ Dashboard gateway helper crashed routes when gateway was offline/unreachable. Fixed helper to return degraded `{ ok:false }` instead of crashing.  
✅ Gateway required `DATABASE_URL` at boot. Behavioral proof now supplies a dummy DB URL so boot behavior can be separated from DB connectivity.  
