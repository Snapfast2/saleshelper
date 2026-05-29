// src/app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/serverStorage";

const FILE = "push-subscription.json";

export async function POST(req: Request) {
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }
    writeJSON(FILE, subscription);
    console.log("[Push] Suscripción guardada:", subscription.endpoint.slice(-30));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Push Subscribe] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  const sub = readJSON<{ endpoint?: string } | null>(FILE, null);
  return NextResponse.json({
    subscribed: !!sub?.endpoint,
    endpoint: sub?.endpoint?.slice(-30) ?? null,
  });
}
