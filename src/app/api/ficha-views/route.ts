// src/app/api/ficha-views/route.ts
import { verifyRequestSession } from "@/lib/auth";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
};

export async function GET(req: Request) {
  if (!verifyRequestSession(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const kv = getRedis();
  if (!kv) {
    return Response.json({ views: {} }, { headers: CACHE_HEADERS });
  }

  const views: Record<string, number> = {};
  try {
    const raw = await kv.hgetall<Record<string, number | string>>("ficha_views_v1");
    if (raw && typeof raw === "object") {
      for (const [key, val] of Object.entries(raw)) {
        const parsed = Number(val);
        if (Number.isFinite(parsed) && parsed > 0) {
          views[key] = Math.floor(parsed);
        }
      }
    }
  } catch {
    // Fallback silencioso si Redis no responde temporalmente
  }

  return Response.json({ views }, { headers: CACHE_HEADERS });
}
