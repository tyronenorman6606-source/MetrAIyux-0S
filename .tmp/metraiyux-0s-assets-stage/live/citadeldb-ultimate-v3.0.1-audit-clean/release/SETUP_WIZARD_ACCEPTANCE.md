# Setup Wizard Acceptance

## Required

☐ Setup Wizard page exists  
☐ env readiness endpoint exists  
☐ secret generation endpoint exists  
☐ setup plan endpoint exists  
☐ generated secrets are shown once  
☐ dashboard does not write `.env` directly  
☐ required secrets are explained in plain English  
☐ optional AI/object backup keys are shown separately  
☐ browser proof includes Setup Wizard route  

## Claim gate

Safe:

```text
CitadelDB includes a guided setup wizard for explaining and generating required server secrets.
```

Not safe:

```text
CitadelDB automatically secures the server without operator setup.
```
