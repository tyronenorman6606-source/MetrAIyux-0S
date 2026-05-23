export async function requestJson(url, {method='GET', headers={}, body=null, timeoutMs=25000}={}){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method,
      headers,
      body: body === null || body === undefined ? undefined : body,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = {raw:text}; }
    if (!res.ok){
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return {status:res.status, headers:Object.fromEntries(res.headers.entries()), json, text};
  } finally {
    clearTimeout(timer);
  }
}

export function formBody(obj){
  const params = new URLSearchParams();
  const add = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)){
      value.forEach((item, idx) => add(`${key}[${idx}]`, item));
      return;
    }
    if (typeof value === 'object'){
      for (const [k,v] of Object.entries(value)) add(`${key}[${k}]`, v);
      return;
    }
    params.append(key, String(value));
  };
  for (const [k,v] of Object.entries(obj || {})) add(k,v);
  return params;
}
