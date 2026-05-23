# Valley Verified Client Front Doors + NorthStar SignInPro v6

This package contains client-facing landing pages, longform guest guides, and one central NorthStar SignInPro app.

Public routes:
- `/index.html` — Valley Verified client directory
- `/clients/<slug>/index.html` — company landing page
- `/clients/<slug>/blog.html` — longform guest guide
- `/northstar/index.html?workspace=<slug>` — central app workspace login
- `/arrival/index.html?client=<slug>` — compatibility handoff into `/northstar/`

The companies are not receiving separate apps. Each company receives a branded workspace inside NorthStar SignInPro.

Run local audit:
```bash
npm run smoke
```

Provision seeded workspaces after deploying and setting production secrets:
```bash
npm run admin:provision:seed
```
