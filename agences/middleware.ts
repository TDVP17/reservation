import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Ajout de "/agences" et des routes d'API dans les chemins publics
const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/agences", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("agenceToken")?.value;

  // Permet de matcher les chemins exacts ou les sous-chemins (ex: /api/agences)
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (token && pathname === "/auth/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js)$).*)",
  ],
};