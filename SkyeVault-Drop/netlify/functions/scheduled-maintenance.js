import { handler as maintenanceHandler } from './maintenance-sweep.js';

export const config = {
  schedule: process.env.MAINTENANCE_CRON || '0 3 * * *'
};

export async function handler(event, context) {
  const previous = process.env.MAINTENANCE_ALLOW_UNAUTHENTICATED_SCHEDULE;
  process.env.MAINTENANCE_ALLOW_UNAUTHENTICATED_SCHEDULE = 'true';
  try {
    return await maintenanceHandler({ ...event, httpMethod: 'GET' }, context);
  } finally {
    if (previous === undefined) delete process.env.MAINTENANCE_ALLOW_UNAUTHENTICATED_SCHEDULE;
    else process.env.MAINTENANCE_ALLOW_UNAUTHENTICATED_SCHEDULE = previous;
  }
}
