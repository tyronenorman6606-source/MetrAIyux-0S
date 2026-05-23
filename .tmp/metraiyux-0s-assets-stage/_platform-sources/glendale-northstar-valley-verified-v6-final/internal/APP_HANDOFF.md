# NorthStar App Handoff — v6

Public landings and blogs route into `/northstar/index.html?workspace=<slug>`.

This is one central NorthStar SignInPro app. Clients do not receive separate apps. Each company has a branded workspace provisioned inside the central app.

Run the seed provisioner after setting production environment variables:

```bash
cd northstar
export SIGNINPRO_BASE_URL=https://your-deploy-url.example
export OPERATOR_PROVISION_TOKEN=your-private-token
npm run admin:provision:seed
```

Required production secrets include `DATABASE_URL`, `SESSION_SECRET`, `OPERATOR_PROVISION_TOKEN`, and an audit pepper if desired.
