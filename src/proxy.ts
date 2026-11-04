// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyCronAuth, verifySessionToken } from "@/lib/auth";

const PUBLIC_EXACT = new Set([
  "/pin",
  "/api/auth/pin",
  "/sw.js",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
  "/robots.txt",
]);

const PUBLIC_PREFIXES = ["/_next", "/ficha"];

const CRON_PATHS = new Set([
  "/api/crm/keep-alive",
  "/api/cron/warmup-inmuebles",
  "/api/push/check-new-clients",
  "/api/push/check-reminders",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Permitir endpoints de cron cuando presentan credencial de cron válida
  if (CRON_PATHS.has(pathname)) {
    const allowQueryCron = pathname === "/api/push/check-new-clients";
    if (verifyCronAuth(request, { allowQueryCron })) {
      return NextResponse.next();
    }
  }

  // Fail-closed: si SALESHELPER_SECRET no está configurado, nunca abrir la app públicamente
  if (!process.env.SALESHELPER_SECRET?.trim()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Servicio no configurado" },
        { status: 503 }
      );
    }
    const pinUrl = request.nextUrl.clone();
    pinUrl.pathname = "/pin";
    pinUrl.search = "";
    return NextResponse.redirect(pinUrl);
  }

  const authCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (verifySessionToken(authCookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/pin";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|robots.txt).*)",
  ],
};
