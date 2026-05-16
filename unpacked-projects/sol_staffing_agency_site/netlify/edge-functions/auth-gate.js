const COOKIE_NAME = "sol_staffing_auth";

const PROTECTED = new Set([
  "/admin-dashboard.html",
  "/ae-command.html",
  "/agreement-packet.html",
  "/bill-rate-calculator.html",
  "/brain-command.html",
  "/crm-pipeline.html",
  "/deployment-command.html",
  "/email-sequences.html",
  "/employer-portal.html",
  "/forms-directory.html",
  "/government-opportunities.html",
  "/operations-hub.html",
  "/placement-tracker.html",
  "/proposal-builder.html",
  "/recruiter-desk.html",
  "/risk-register.html",
  "/sales-scripts.html",
  "/timesheet-invoice-control.html",
  "/training-academy.html",
  "/vendor-packet.html"
]);

const ADMIN_ONLY = new Set(["/admin-dashboard.html"]);

const ALIASES = {
  "/admin": "/admin-dashboard.html",
  "/ae": "/ae-command.html",
  "/agreement-packet": "/agreement-packet.html",
  "/bill-rate-calculator": "/bill-rate-calculator.html",
  "/brain-command": "/brain-command.html",
  "/crm": "/crm-pipeline.html",
  "/deployment-command": "/deployment-command.html",
  "/email-sequences": "/email-sequences.html",
  "/employer-portal": "/employer-portal.html",
  "/forms-directory": "/forms-directory.html",
  "/gov-opportunities": "/government-opportunities.html",
  "/operations": "/operations-hub.html",
  "/placements": "/placement-tracker.html",
  "/proposal": "/proposal-builder.html",
  "/recruiter-desk": "/recruiter-desk.html",
  "/risk-register": "/risk-register.html",
  "/sales-scripts": "/sales-scripts.html",
  "/timesheets": "/timesheet-invoice-control.html",
  "/training": "/training-academy.html",
  "/vendor-packet": "/vendor-packet.html"
};

export default async (request, context) => {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);
  if (!PROTECTED.has(pathname)) return context.next();

  const token = bearerToken(request) || cookieToken(request);
  if (!token) return redirectToLogin(url);

  const claims = await introspect(token);
  if (!claims?.active) return redirectToLogin(url);

  if (ADMIN_ONLY.has(pathname) && !adminRoles().includes(String(claims.role || "").toLowerCase())) {
    return new Response("Admin role required.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" }
    });
  }

  return context.next();
};

function normalizePath(pathname) {
  if (ALIASES[pathname]) return ALIASES[pathname];
  if (!pathname.endsWith(".html") && PROTECTED.has(`${pathname}.html`)) return `${pathname}.html`;
  return pathname;
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function cookieToken(request) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function env(name) {
  try {
    return Netlify.env.get(name) || "";
  } catch {
    return "";
  }
}

function introspectionUrl() {
  return env("SKYGATE_FS27_INTROSPECT_URL") ||
    env("SKYEGATE_FS27_INTROSPECT_URL") ||
    env("SKYGATE_INTROSPECT_URL") ||
    env("SKYEGATE_INTROSPECT_URL");
}

function adminRoles() {
  return (env("SOL_STAFFING_ADMIN_ROLES") || "owner,admin,operator")
    .split(",")
    .map(role => role.trim().toLowerCase())
    .filter(Boolean);
}

async function introspect(token) {
  const devToken = env("SOL_STAFFING_DEV_TOKEN");
  if (devToken && token === devToken) {
    return { active: true, role: env("SOL_STAFFING_DEV_ROLE") || "admin" };
  }

  const url = introspectionUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function redirectToLogin(currentUrl) {
  const login = new URL("/staffing-login.html", currentUrl.origin);
  login.searchParams.set("next", currentUrl.pathname + currentUrl.search);
  return Response.redirect(login, 302);
}
