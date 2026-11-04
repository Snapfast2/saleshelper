// src/lib/auth.ts
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

if (typeof window !== "undefined") {
  throw new Error("src/lib/auth.ts solo puede importarse en el servidor.");
}

export const SESSION_COOKIE_NAME = "sh_auth";
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 días

/**
 * Huella única y consistente de navegador de escritorio (Chrome en Windows)
 * para todas las peticiones salientes hacia Domus / Apperty / L2L.
 * Nunca se rota entre móvil/escritorio ni expone nombres internos de la app.
 */
export const DOMUS_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

export const DOMUS_SEC_CH_UA_HEADERS: Record<string, string> = {
  "Sec-Ch-Ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

/**
 * Comparación en tiempo constante inmune a diferencias de longitud.
 */
export function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  const digestsMatch = timingSafeEqual(hashA, hashB);
  return digestsMatch && a.length === b.length;
}

/**
 * Genera un token de sesión firmado con HMAC-SHA256 sin exponer SALESHELPER_SECRET.
 */
export function createSessionToken(): string | null {
  const secret = process.env.SALESHELPER_SECRET?.trim();
  if (!secret) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    v: 1,
    iat: nowSec,
    exp: nowSec + SESSION_MAX_AGE_SEC,
  });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

/**
 * Verifica criptográficamente el token de la cookie sh_auth (fail-closed si falta secret).
 */
export function verifySessionToken(token: string | undefined | null): boolean {
  const secret = process.env.SALESHELPER_SECRET?.trim();
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;

  const expectedSig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (!safeCompare(sig, expectedSig)) return false;

  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { v?: number; exp?: number };
    if (parsed.v !== 1 || typeof parsed.exp !== "number") return false;
    return parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function extractCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    if (trimmed.slice(0, eqIdx) === name) {
      return trimmed.slice(eqIdx + 1);
    }
  }
  return null;
}

/**
 * Verifica que la petición HTTP provenga de una sesión autenticada con PIN válido.
 */
export function verifyRequestSession(req: Request): boolean {
  const token = extractCookieFromHeader(req.headers.get("cookie"), SESSION_COOKIE_NAME);
  return verifySessionToken(token);
}

/**
 * Verifica autenticación de tareas programadas (Vercel Cron o cron-job.org).
 * Falla cerrado (false) si las variables no están configuradas.
 */
export function verifyCronAuth(
  req: Request,
  options: { allowQueryCron?: boolean } = {}
): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get("authorization") ?? "";

  if (cronSecret && authHeader.startsWith("Bearer ")) {
    const provided = authHeader.slice("Bearer ".length).trim();
    if (provided && safeCompare(provided, cronSecret)) {
      return true;
    }
  }

  if (options.allowQueryCron) {
    try {
      const url = new URL(req.url);
      const querySecret = url.searchParams.get("cron")?.trim() ?? "";
      const expectedQuerySecret = (process.env.CRON_QUERY_SECRET?.trim() || "saleshelper");
      if (querySecret && safeCompare(querySecret, expectedQuerySecret)) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
