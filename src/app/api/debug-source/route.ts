// src/app/api/debug-source/route.ts
// ENDPOINT TEMPORAL — solo para diagnosticar el campo "source" de Domus
// Eliminar después de usar

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET(_req: NextRequest) {
  // Endpoint temporal de debug — SIN autenticación (eliminar después de usar)

  try {
    const redis = Redis.fromEnv();
    const session = await redis.get<{ crmSessionCookie: string; ua: string }>("domus_session");
    if (!session?.crmSessionCookie) {
      return NextResponse.json({ error: "Sin sesión en Redis" }, { status: 500 });
    }

    const res = await fetch("https://crm.domusweb.co/api/get", {
      method: "POST",
      headers: {
        "Cookie": session.crmSessionCookie,
        "User-Agent": session.ua,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "es-CO,es;q=0.9",
        "Referer": "https://crm.domusweb.co/",
      },
      body: JSON.stringify({ url: "contacts?page=1&contact_status_type=1&order=created_at_new" }),
      cache: "no-store",
    });

    const json = await res.json();
    const primeros = (json?.data ?? []).slice(0, 2).map((c: any) => ({
      code: c.code,
      full_name: c.full_name,
      source: c.source,
      autoleads: c.autoleads,
      profiles: c.profiles,
      searches: c.searches,
      tags: c.tags,
    }));

    return NextResponse.json({ primeros });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
