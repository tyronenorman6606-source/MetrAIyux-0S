# Paid Route Enforcement

## Protected first in v2.1

The self-service database provisioning route now calls the commercial gate helper.

Protected route:

```text
/admin/self-service/projects/:projectSlug/databases
```

## Gate behavior

If enforcement is disabled, the route logs an allowed gate event.

If enforcement is enabled and no valid entitlement exists, the route returns:

```text
HTTP 402
```

## Still needed

Apply the same guard to every paid route before public launch:

☐ SQL execution route  
☐ table browser route  
☐ branch request route  
☐ app onboarding packet route if paid  
☐ lifecycle actions if paid  
☐ backup/restore actions if paid  
