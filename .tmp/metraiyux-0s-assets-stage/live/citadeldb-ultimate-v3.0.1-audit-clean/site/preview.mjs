import express from 'express';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('dist/index.html')) {
  execSync('npm run build', { stdio: 'inherit' });
}

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(express.static('dist'));
app.get('/app', (_req, res) => {
  res.send(`<html><head><meta http-equiv="refresh" content="0; url=http://127.0.0.1:7413"></head><body style="background:#050507;color:#fff;font-family:system-ui"><p>Opening CitadelDB Operator App...</p><p><a href="http://127.0.0.1:7413">Open app</a></p></body></html>`);
});

app.listen(port, () => console.log(`CitadelDB site preview running on http://127.0.0.1:${port}`));
