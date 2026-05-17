const base = (process.env.APP_BASE_URL || 'http://127.0.0.1:4313').replace(/\/$/, '');
const token = process.env.SCHEDULER_API_KEY || process.env.APP_ACCESS_TOKEN || '';
const response = await fetch(`${base}/api/automation/tick`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { 'X-App-Token': token } : {})
  },
  body: JSON.stringify({ source: process.env.SCHEDULER_SOURCE || 'node-script', backup: process.env.BACKUP_TO_GITHUB_ON_TICK === '1' })
});
const text = await response.text();
if (!response.ok) {
  console.error(text);
  process.exit(1);
}
console.log(text);
