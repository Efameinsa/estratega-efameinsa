import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/login",
  "/register",
  "/invite",
  "/join",
  "/onboarding",
  "/api/auth",
  "/api/trpc",
  // REST público autenticado por Bearer token de workspace (EduCaNet, integraciones externas).
  // La verificación de auth la hace cada route handler con verifyWorkspaceToken.
  "/api/bsc/",
  "/api/cycle/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo-") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/site.webmanifest")
  ) {
    return NextResponse.next();
  }

  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");
  const isLoggedIn = !!sessionToken;

  // Landing page — always public; if logged in, send to dashboard
  if (pathname === "/") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Public routes — always accessible
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));
  if (isPublic) {
    return NextResponse.next();
  }

  // Not logged in — redirect to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // All onboarding checks are done by the dashboard layout via DB query
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo-.*\\.png|apple-touch-icon\\.png|icon-.*\\.png|site\\.webmanifest).*)",
  ],
};
