# Route Contract Closure

v3.0 adds control-plane route accountability.

## Fixed / added

✅ Route contract manifest generated from Gateway routes  
✅ Route contract proof validates manifest vs actual server routes  
✅ Express 4 async route wrapper added  
✅ Centralized Zod and 500 error middleware added  
✅ Admin mutation audit middleware added  
✅ Mutating route audit proof added  

## Why this matters

Express 4 does not automatically catch rejected async handlers. Without an async wrapper, route-level Zod/DB failures can escape normal error handling. v3.0 patches this and adds proof.

## v3.0 proof repair

The first route-contract pass caught a duplicate protected route declaration for `/admin/guided/proof-action`. The duplicate legacy `backup_restore_actions` entry was removed so the handler key matches the actual guarded route key, `guided_proof_action`.

The central error middleware was also upgraded to redact 500-level error messages and normalize Zod validation failures.
