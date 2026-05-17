# Database Launchpad Acceptance

## Required

☐ Launchpad page exists  
☐ app database can be created from dashboard  
☐ app connection page exists  
☐ credential rotation returns a new DATABASE_URL  
☐ pasted DATABASE_URL can be tested  
☐ write-smoke test writes and verifies a row  
☐ failed connection result is shown plainly  
☐ AI debug can receive test result context  
☐ secrets are redacted in displayed results  

## Claim gate

Safe:

```text
CitadelDB includes a dashboard Database Launchpad for creating app databases, rotating app credentials, testing connection strings, and running write-smoke checks.
```

Not safe without live proof:

```text
Every app has been migrated successfully.
```
