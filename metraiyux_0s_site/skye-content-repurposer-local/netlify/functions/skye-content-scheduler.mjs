import { schedule } from '@netlify/functions';

const handler = async () => {
  const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  const token = process.env.SCHEDULER_API_KEY || process.env.APP_ACCESS_TOKEN || '';
  if (!base || !token) {
    return { statusCode: 500, body: 'Missing APP_BASE_URL or SCHEDULER_API_KEY.' };
  }
  const response = await fetch(`${base}/api/automation/tick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Token': token },
    body: JSON.stringify({ source: 'netlify-scheduled-function', backup: true })
  });
  const body = await response.text();
  return { statusCode: response.ok ? 200 : 500, body };
};

export default schedule('*/15 * * * *', handler);
