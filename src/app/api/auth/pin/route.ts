// src/app/api/auth/pin/route.ts
import {
  createSessionToken,
  safeCompare,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth";
import { getRedis } from "@/lib/redis";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutos

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "local";
}

export async function POST(req: Request) {
  const correctPin = process.env.SALESHELPER_PIN?.trim();
  const secret = process.env.SALESHELPER_SECRET?.trim();

  if (!correctPin || !secret) {
    return Response.json({ ok: false, error: "No configurado" }, { status: 503 });
  }

  const kv = getRedis();
  const ip = getClientIp(req);
  const rlKey = `pin_rl:${ip}`;

  if (kv) {
    try {
      const currentAttempts = Number((await kv.get<number>(rlKey)) ?? 0);
      if (currentAttempts >= MAX_ATTEMPTS) {
        return Response.json(
          { ok: false, error: "Demasiados intentos. Espera 15 minutos." },
          { status: 429 }
        );
      }
    } catch {
      // Continuar si Redis falla puntualmente
    }
  }

  const body = (await req.json().catch(() => ({}))) as { pin?: unknown };
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (!pin || pin.length > 16 || !safeCompare(pin, correctPin)) {
    if (kv) {
      try {
        const count = await kv.incr(rlKey);
        if (count === 1) {
          await kv.expire(rlKey, WINDOW_SECONDS);
        }
      } catch {
        // Ignorar error de Redis
      }
    }
    return Response.json({ ok: false }, { status: 401 });
  }

  if (kv) {
    await kv.del(rlKey).catch(() => {});
  }

  const token = createSessionToken();
  if (!token) {
    return Response.json({ ok: false, error: "Error de configuración" }, { status: 503 });
  }

  const secureAttr = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=Lax${secureAttr}`,
    },
  });
}
