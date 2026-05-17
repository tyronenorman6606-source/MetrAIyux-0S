# Browser Proof

This tests the operator dashboard in a real browser.

## Run

```bash
cd proof/browser
npm install
DASHBOARD_URL=http://127.0.0.1:7413 npm test
```

## Claim gate

Do not claim browser proof until Playwright passes against the running dashboard.
