import { NextRequest, NextResponse } from "next/server";
import { authorizeWithFs27, mergeForwardHeaders } from "@/lib/fs27-gate";

const PUBLIC_API_ROUTES = new Set([
  "/api/health",
  "/api/sms/webhook",
  "/api/email/webhook",
]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedRoute = pathname.startsWith("/dashboard") || (pathname.startsWith("/api/") && !PUBLIC_API_ROUTES.has(pathname));

  if (!protectedRoute) {
    return NextResponse.next();
  }

  const gate = await authorizeWithFs27(request);
  if (!gate.ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "FS27_UNAUTHORIZED", detail: gate.reason },
        { status: gate.status }
      );
    }

    const loginUrl = process.env.FS27_LOGIN_URL || process.env.SKYGATEFS27_PUBLIC_APP_ORIGIN || process.env.SKYGATEFS27_ORIGIN;
    if (loginUrl) {
      const redirect = new URL(loginUrl);
      redirect.searchParams.set("return_to", request.nextUrl.toString());
      return NextResponse.redirect(redirect);
    }

    return new NextResponse("FS27 authorization required", { status: gate.status });
  }

  return NextResponse.next({
    request: {
      headers: mergeForwardHeaders(request.headers, gate.claims, gate.mode),
    },
  });
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
