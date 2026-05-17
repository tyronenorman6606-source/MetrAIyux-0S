# Protected Route Registry

This registry tracks routes that must be guarded before public customer launch.

## Guarded in v2.2

✅ self-service database provisioning  
✅ SQL console execution  
✅ table listing  
✅ table preview  
✅ branch request  

## Still should be policy-reviewed before live public launch

☐ app onboarding packets  
☐ app lifecycle actions  
☐ guided proof actions  
☐ backup/restore actions  
☐ AI debug usage  
☐ credential rotation  

## Rule

If a route costs compute, exposes customer data, changes customer state, or creates infrastructure, it needs:

1. upstream auth context
2. team/project authorization
3. entitlement check
4. quota check
5. audit/usage event
