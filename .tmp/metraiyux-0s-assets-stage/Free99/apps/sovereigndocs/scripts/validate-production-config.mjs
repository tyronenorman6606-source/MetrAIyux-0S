import { validateProductionConfig } from '../server/config.mjs';
const status = validateProductionConfig();
if(process.env.NODE_ENV === 'production' && !status.ok){ console.error(JSON.stringify(status,null,2)); process.exit(1); }
console.log(`✅ Production config validator loaded (${status.mode}; ok=${status.ok})`);
