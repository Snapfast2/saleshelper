// src/lib/redis.ts
import { Redis } from "@upstash/redis";

if (typeof window !== "undefined") {
  throw new Error("src/lib/redis.ts solo puede importarse en el servidor.");
}

let redisClient: Redis | null = null;
let initialized = false;

/**
 * Obtiene el cliente compartido de Upstash Redis soportando tanto las variables
 * estándar UPSTASH_REDIS_REST_* como la integración de Vercel KV (KV_REST_API_*).
 */
export function getRedis(): Redis | null {
  if (initialized) return redisClient;
  initialized = true;

  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    "";

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

/**
 * Adquiere un candado distribuido atómico (SET key "1" NX EX ttlSeconds).
 * Si Redis no está configurado localmente, permite continuar (true).
 */
export async function acquireRedisLock(key: string, ttlSeconds: number): Promise<boolean> {
  const kv = getRedis();
  if (!kv) return true;
  try {
    const res = await kv.set(key, "1", { nx: true, ex: ttlSeconds });
    return res === "OK";
  } catch {
    return true;
  }
}

export async function releaseRedisLock(key: string): Promise<void> {
  const kv = getRedis();
  if (!kv) return;
  try {
    await kv.del(key);
  } catch {
    // Ignorar errores de red al liberar candado (expira solo por TTL)
  }
}

export async function getRedisTtl(key: string): Promise<number> {
  const kv = getRedis();
  if (!kv) return -2;
  try {
    return await kv.ttl(key);
  } catch {
    return -2;
  }
}
