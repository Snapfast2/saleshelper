// src/lib/ownerReportToken.ts
import { createHmac, randomBytes } from "node:crypto";
import { safeCompare } from "@/lib/auth";
import { getRedis } from "@/lib/redis";
import type { InformePropietarioPayload } from "@/types";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ownerReportToken.ts solo puede importarse en el servidor.");
}

const REPORT_TTL_SEC = 90 * 24 * 60 * 60; // 90 días para links enviados a propietarios
const DRAFT_TTL_SEC = 180 * 24 * 60 * 60; // 6 meses para borradores mensuales

function getSigningSecret(): string {
  const secret = process.env.SALESHELPER_SECRET?.trim();
  if (!secret) {
    throw new Error("SALESHELPER_SECRET no configurado");
  }
  return secret;
}

export function signStatelessReportToken(payload: InformePropietarioPayload): string {
  const secret = getSigningSecret();
  const rawJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(rawJson, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(`owner_report_v1:${payloadB64}`)
    .digest("base64url");
  return `v1.${payloadB64}.${sig}`;
}

export function verifyStatelessReportToken(token: string): InformePropietarioPayload | null {
  try {
    const secret = getSigningSecret();
    if (!token.startsWith("v1.")) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [, payloadB64, sig] = parts;
    if (!payloadB64 || !sig) return null;

    const expectedSig = createHmac("sha256", secret)
      .update(`owner_report_v1:${payloadB64}`)
      .digest("base64url");

    if (!safeCompare(sig, expectedSig)) return null;

    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as InformePropietarioPayload;

    if (!parsed || typeof parsed.inmuebleId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Guarda el informe en Redis con un ID corto (si Redis está disponible) para links
 * ultra-limpios en WhatsApp, o retorna un token firmado stateless como respaldo 100% funcional.
 */
export async function saveAndCreateOwnerReportToken(
  payload: InformePropietarioPayload
): Promise<string> {
  const kv = getRedis();
  if (kv) {
    try {
      const shortId = randomBytes(8).toString("base64url");
      await kv.set(`owner_rep_v1:${shortId}`, payload, { ex: REPORT_TTL_SEC });
      // Guardar también el último borrador de ese inmueble + mes
      await kv.set(
        `owner_draft_v1:${payload.inmuebleId}:${payload.mesClave}`,
        payload,
        { ex: DRAFT_TTL_SEC }
      );
      return `r_${shortId}`;
    } catch {
      // Fallback automático a token firmado si Redis falla
    }
  }
  return signStatelessReportToken(payload);
}

export async function resolveOwnerReportToken(
  token: string
): Promise<InformePropietarioPayload | null> {
  if (!token || token.length > 4096) return null;

  if (token.startsWith("r_")) {
    const shortId = token.slice(2);
    if (!/^[A-Za-z0-9_-]{6,32}$/.test(shortId)) return null;
    const kv = getRedis();
    if (!kv) return null;
    try {
      const stored = await kv.get<InformePropietarioPayload>(`owner_rep_v1:${shortId}`);
      if (stored && typeof stored.inmuebleId === "string") {
        return stored;
      }
      return null;
    } catch {
      return null;
    }
  }

  return verifyStatelessReportToken(token);
}

export async function getOwnerReportDraft(
  inmuebleId: string,
  mesClave: string
): Promise<InformePropietarioPayload | null> {
  if (!/^\d{1,12}$/.test(inmuebleId) || !/^[0-9A-Za-z_-]{4,20}$/.test(mesClave)) {
    return null;
  }
  const kv = getRedis();
  if (!kv) return null;
  try {
    return await kv.get<InformePropietarioPayload>(
      `owner_draft_v1:${inmuebleId}:${mesClave}`
    );
  } catch {
    return null;
  }
}
