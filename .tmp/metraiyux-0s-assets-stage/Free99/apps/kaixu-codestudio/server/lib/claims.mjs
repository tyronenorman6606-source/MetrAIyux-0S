import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(value){ return Buffer.from(value).toString('base64url'); }
function hmac(secret, payload){ return createHmac('sha256', secret).update(payload).digest('base64url'); }
function safeEqual(a, b){
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function signClaims(claims, {secret=process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET, timestamp=Date.now()}={}){
  if (!secret) throw new Error('CODESTUDIO_UPSTREAM_CLAIMS_SECRET is required to sign claims.');
  const encoded = b64url(JSON.stringify(claims || {}));
  const ts = String(timestamp);
  const signature = hmac(secret, `${ts}.${encoded}`);
  return {encoded, timestamp:ts, signature};
}

export function verifyClaimsEnvelope({encoded, signature, timestamp, bodyClaims=null}={}){
  const secret = process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET;
  const strict = process.env.CODESTUDIO_REQUIRE_SIGNED_CLAIMS === '1' || !!secret;
  if (encoded){
    let claims = {};
    try { claims = JSON.parse(Buffer.from(String(encoded), 'base64url').toString('utf8')); }
    catch { throw Object.assign(new Error('Invalid upstream claims encoding.'), {status:401}); }
    if (!secret){
      claims.__claimVerification = {ok:!strict, mode:'unsigned_dev_allowed'};
      if (strict) throw Object.assign(new Error('Signed upstream claims required.'), {status:401});
      return claims;
    }
    if (!signature || !timestamp) throw Object.assign(new Error('Signed upstream claims require timestamp and signature.'), {status:401});
    const ageMs = Math.abs(Date.now() - Number(timestamp));
    const maxAgeMs = Number(process.env.CODESTUDIO_CLAIMS_MAX_AGE_MS || 5 * 60 * 1000);
    if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) throw Object.assign(new Error('Upstream claims signature timestamp expired.'), {status:401});
    const expected = hmac(secret, `${timestamp}.${encoded}`);
    if (!safeEqual(signature, expected)) throw Object.assign(new Error('Upstream claims signature invalid.'), {status:401});
    claims.__claimVerification = {ok:true, mode:'hmac-sha256', signedAt:Number(timestamp)};
    return claims;
  }
  if (bodyClaims){
    if (strict){
      const err = new Error('Body claims are disabled when signed upstream claims are required. Send x-kaixu-claims, x-kaixu-claims-ts, and x-kaixu-claims-signature.');
      err.status = 401;
      throw err;
    }
    return {...bodyClaims, __claimVerification:{ok:false, mode:'body_unsigned_dev_allowed'}};
  }
  if (strict){
    const err = new Error('Signed upstream claims required.');
    err.status = 401;
    throw err;
  }
  return null;
}

export function claimsFromHeaders(headers={}, body={}){
  const encoded = headers['x-kaixu-claims'] || headers['x-codestudio-claims'];
  const signature = headers['x-kaixu-claims-signature'] || headers['x-codestudio-claims-signature'];
  const timestamp = headers['x-kaixu-claims-ts'] || headers['x-codestudio-claims-ts'];
  return verifyClaimsEnvelope({encoded, signature, timestamp, bodyClaims:body?.claims || null});
}
