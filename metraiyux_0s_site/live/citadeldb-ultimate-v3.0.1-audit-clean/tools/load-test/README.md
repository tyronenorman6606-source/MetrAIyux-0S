# Load Test Scaffold

```bash
cd tools/load-test
npm install
DATABASE_URL=postgres://... npm start
```

This proves connections, writes, reads, latency measurements, and failure counts. It does not prove enterprise-scale load or HA under traffic.
