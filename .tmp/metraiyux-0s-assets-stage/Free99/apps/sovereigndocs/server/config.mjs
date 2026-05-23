export function isProduction(){ return process.env.NODE_ENV === 'production'; }

export function requireEnv(name){
  const value = process.env[name];
  if(!value || !String(value).trim()){
    const error = new Error(`Missing required environment variable: ${name}`);
    error.status = 503;
    throw error;
  }
  return value;
}

export function validateProductionConfig(){
  const errors=[];
  if(!isProduction()) return { ok:true, mode:'development', errors };
  if(process.env.SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH !== '1') errors.push('SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH=1 is required in production.');
  if(!process.env.SOVEREIGNDOCS_UPSTREAM_SECRET && !process.env.OMEGA_SKYGATE_SHARED_SECRET) errors.push('SOVEREIGNDOCS_UPSTREAM_SECRET or OMEGA_SKYGATE_SHARED_SECRET is required in production.');
  if(!process.env.DATABASE_URL && !process.env.CLOUDFLARE_D1_DATABASE_ID) errors.push('DATABASE_URL or CLOUDFLARE_D1_DATABASE_ID is required for production persistence.');
  if(!process.env.R2_BUCKET && !process.env.S3_BUCKET) errors.push('R2_BUCKET or S3_BUCKET is required for production file storage.');
  if(!process.env.SOVEREIGNDOCS_ALLOWED_ORIGINS) errors.push('SOVEREIGNDOCS_ALLOWED_ORIGINS is required for production browser POST protection.');
  return { ok:errors.length===0, mode:'production', errors };
}

export function assertProductionConfig(){
  const status = validateProductionConfig();
  if(!status.ok){
    const error = new Error(`Production configuration invalid: ${status.errors.join(' ')}`);
    error.status = 503;
    throw error;
  }
  return status;
}

export function assertConfiguredProvider(requiredNames, providerName){
  const missing = requiredNames.filter(name => !process.env[name] || !String(process.env[name]).trim());
  if(missing.length){
    const error = new Error(`${providerName} is not configured. Missing: ${missing.join(', ')}`);
    error.status = 503;
    error.missing = missing;
    throw error;
  }
}

export function allowedOrigin(req){
  const allowed = String(process.env.SOVEREIGNDOCS_ALLOWED_ORIGINS || 'http://localhost:8787,http://localhost:4173').split(',').map(s=>s.trim()).filter(Boolean);
  const origin = req.headers.origin || '';
  if(!origin) return true;
  return allowed.includes(origin);
}
