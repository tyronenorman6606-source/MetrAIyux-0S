export interface HttpRuntimeEnv {
  SKYE_ALLOWED_ORIGINS?: string;
}

export function allowedOrigin(request: Request, env: HttpRuntimeEnv): string {
  const origin = request.headers.get("origin") ?? "";
  const configured = (env.SKYE_ALLOWED_ORIGINS ?? "*").split(",").map((item) => item.trim()).filter(Boolean);
  if (configured.includes("*")) return "*";
  if (origin && configured.includes(origin)) return origin;
  return configured[0] ?? "null";
}

export function securityHeaders(request: Request, env: HttpRuntimeEnv): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "access-control-allow-origin": allowedOrigin(request, env),
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-skye-admin-key,x-skye-actor-id,x-skye-actor-email,x-skye-role,x-skye-project-role",
    "access-control-max-age": "86400"
  };
}

export function json(request: Request, env: HttpRuntimeEnv, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: securityHeaders(request, env) });
}
