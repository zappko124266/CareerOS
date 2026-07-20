import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

// Routes reachable without a session. Everything else redirects to /login.
// This is an optimistic, redirect-only check for UX — real authorization
// happens in the Data Access Layer (`src/lib/auth/dal.ts`), which every
// Server Component, Server Action, and Route Handler must call itself.
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Cron-triggered route handlers are invoked by Vercel's infrastructure
 * directly (or a manual bearer-token test) — never by a browser with a
 * Supabase session cookie, so `user` here is always null for them. Without
 * this check, every scheduled invocation of `/api/cron/*` would get
 * redirected to `/login` before the route handler's own `CRON_SECRET`
 * check ever ran, silently breaking Background Discovery in production
 * (found via this sprint's own verification — a direct `curl` to
 * `/api/cron/discovery` with a valid `CRON_SECRET` returned a 307 redirect
 * instead of reaching the handler). These routes still enforce their own,
 * stricter bearer-token authentication inside the handler — this only
 * exempts them from the session-cookie redirect, the same way
 * `PUBLIC_ROUTES` does for pages that don't need a session at all.
 */
function isCronRoute(pathname: string) {
  return pathname.startsWith("/api/cron/");
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isCronRoute(pathname)) {
    return response;
  }

  if (!user && !isPublicRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/sign-up")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
