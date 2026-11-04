import { useEffect } from "react";
import useSWR from "swr";
import type { Inmueble } from "@/types";

interface APIResponse {
  inmuebles: Inmueble[];
  fuente: string;
  total: number;
  cachedAt?: number;
}

const CACHE_KEY_LS = "saleshelper_inmuebles_v1";
const MAX_LOCAL_AGE_MS = 2 * 60 * 60_000;

let parsedLocalCache: APIResponse | null | undefined = undefined;

function readLocalCacheOnce(): APIResponse | undefined {
  if (typeof window === "undefined") return undefined;
  if (parsedLocalCache !== undefined) {
    return parsedLocalCache ?? undefined;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY_LS);
    if (!raw) {
      parsedLocalCache = null;
      return undefined;
    }
    const cached = JSON.parse(raw) as APIResponse;
    const age = Date.now() - (cached.cachedAt || 0);
    if (!Array.isArray(cached.inmuebles) || cached.inmuebles.length === 0 || age > MAX_LOCAL_AGE_MS) {
      parsedLocalCache = null;
      return undefined;
    }
    parsedLocalCache = { ...cached, fuente: "offline" };
    return parsedLocalCache;
  } catch {
    parsedLocalCache = null;
    return undefined;
  }
}

const fetcher = async (url: string): Promise<APIResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data: APIResponse = await res.json();

    if (data.inmuebles?.length > 0 && data.fuente !== "demo") {
      const payload: APIResponse = { ...data, cachedAt: Date.now() };
      parsedLocalCache = { ...payload, fuente: "offline" };
      try {
        localStorage.setItem(CACHE_KEY_LS, JSON.stringify(payload));
      } catch {
        // storage lleno
      }
    }

    return data;
  } catch (err) {
    const fallback = readLocalCacheOnce();
    if (fallback) return fallback;
    throw err;
  }
};

export function useInmuebles() {
  const { data, error, isLoading, mutate } = useSWR<APIResponse>(
    "/api/inmuebles",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30 * 60_000,
      refreshInterval: 0,
      keepPreviousData: true,
    }
  );

  // Hidratar caché local una sola vez tras montar para evitar mismatch SSR/cliente
  useEffect(() => {
    if (data) return;
    const local = readLocalCacheOnce();
    if (local) {
      mutate(local, { revalidate: true });
    }
  }, [data, mutate]);

  return {
    inmuebles: data?.inmuebles || [],
    fuente: data?.fuente || "",
    total: data?.total || 0,
    isOffline: data?.fuente === "offline",
    isLoading: isLoading && !data,
    isError: error,
    mutate,
  };
}
