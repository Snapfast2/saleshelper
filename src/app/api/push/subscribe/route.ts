// src/app/api/push/subscribe/route.ts
// Guarda la suscripción push del dispositivo de Patricia
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUBS_FILE = path.join(process.cwd(), "data", "push-subscription.json");

function ensureDataDir() {
  const dir = path.dirname(SUBS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    ensureDataDir();
    // Guardamos la suscripción (solo un dispositivo por ahora)
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subscription, null, 2));

    console.log("[Push] Suscripción guardada:", subscription.endpoint.slice(-30));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Push Subscribe] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    ensureDataDir();
    if (!fs.existsSync(SUBS_FILE)) {
      return NextResponse.json({ subscribed: false });
    }
    const sub = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
    return NextResponse.json({ subscribed: true, endpoint: sub.endpoint?.slice(-30) });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}
