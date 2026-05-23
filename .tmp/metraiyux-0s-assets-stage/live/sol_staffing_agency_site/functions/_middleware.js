import { allowedRoles, authFromRequest } from "./_shared/staffing-core.js";

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
  "/crm": "/crm-pipeline.html",
  "/operations": "/operations-hub.html",
  "/placements": "/placement-tracker.html",
  "/proposal": "/proposal-builder.html",
  "/timesheets": "/timesheet-invoice-control.html"
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = normalizePath(url.pathname);
  if (!PROTECTED.has(pathname)) return context.next();

  const auth = await authFromRequest(context.request, context.env);
  if (!auth.claims?.active) return redirectToLogin(url);

  if (ADMIN_ONLY.has(pathname) && !allowedRoles(context.env).includes(String(auth.claims.role || "").toLowerCase())) {
    return new Response("Admin role required.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" }
    });
  }

  return context.next();
}

function normalizePath(pathname) {
  if (ALIASES[pathname]) return ALIASES[pathname];
  if (!pathname.endsWith(".html") && PROTECTED.has(`${pathname}.html`)) return `${pathname}.html`;
  return pathname;
}

function redirectToLogin(currentUrl) {
  const login = new URL("/staffing-login.html", currentUrl.origin);
  login.searchParams.set("next", currentUrl.pathname + currentUrl.search);
  return Response.redirect(login, 302);
}
