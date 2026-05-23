# Admin Provisioning

## From the app admin menu

1. Deploy the app with Netlify Functions enabled.
2. Set `OPERATOR_PROVISION_TOKEN` in Netlify.
3. Sign in to an owner workspace or use local preview on localhost.
4. Open Operator Panel → Provision.
5. Enter the operator token.
6. Provision one company or paste a JSON array for a batch.
7. Copy the one-time passwords into a private handoff file.

## Single-company payload

```json
{
  "name": "Future Company",
  "slug": "future-company",
  "ownerEmail": "owner@futurecompany.com",
  "role": "owner",
  "plan": "provided-infrastructure",
  "metadata": {
    "source": "northstar-admin-menu",
    "appSettings": { "syncEnabled": true },
    "securitySettings": { "providedInfrastructure": true, "tenantScoped": true }
  }
}
```

## Terminal commands

Seed all included client workspaces:

```bash
SIGNINPRO_BASE_URL=https://your-site.netlify.app OPERATOR_PROVISION_TOKEN=private-token npm run admin:provision:seed
```

Provision one future company:

```bash
SIGNINPRO_BASE_URL=https://your-site.netlify.app OPERATOR_PROVISION_TOKEN=private-token npm run admin:provision -- --workspace "Future Company|future-company|owner@futurecompany.com"
```

Provision from a custom JSON file:

```bash
SIGNINPRO_BASE_URL=https://your-site.netlify.app OPERATOR_PROVISION_TOKEN=private-token npm run admin:provision -- --input ./my-workspaces.json --out ./my-workspaces.secret.json
```

The output file contains private one-time credentials. Keep it out of public repos and client-facing surfaces.
