# No-Code Dashboard Acceptance

## Connect App flow

☐ dashboard has Connect App link  
☐ operator can create app database from form  
☐ dashboard shows generated DATABASE_URL after creation  
☐ dashboard shows plain-English connection explanation  
☐ dashboard has existing app connection page  
☐ dashboard does not fake app write-smoke success  

## AI Debug flow

☐ dashboard has AI Debug link  
☐ AI status shows whether providers are configured  
☐ OpenAI request works when `OPENAI_API_KEY` exists  
☐ Gemini request works when `GEMINI_API_KEY` or `GOOGLE_API_KEY` exists  
☐ secrets are not shown in browser  
☐ AI answers are recorded in audit events  

## Backup/proof flow

☐ dashboard can enqueue backup job  
☐ dashboard can enqueue restore-test job  
☐ jobs page shows results  
☐ receipts remain proof source of truth  
