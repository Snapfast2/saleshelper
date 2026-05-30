import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/pin", "/api/auth/pin", "/api/push/check-new-clients", "/sw.js", "/_next", "/favicon", "/icon", "/manifest", "/robots", "/ficha"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas — no requieren PIN
  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const secret = process.env.SALESHELPER_SECRET;
  if (!secret) return NextResponse.next(); // Sin secret configurado = app abierta

  const authCookie = request.cookies.get("sh_auth")?.value;
  if (authCookie === secret + "_ok") {
    return NextResponse.next();
  }

  // Redirigir al PIN
  const url = request.nextUrl.clone();
  url.pathname = "/pin";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|robots.txt).*)"],
};
