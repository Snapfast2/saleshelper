import useSWR from "swr";
import type { Inmueble } from "@/types";

interface APIResponse {
  inmuebles: Inmueble[];
  fuente: string;
  total: number;
}

const CACHE_KEY_LS = "saleshelper_inmuebles_v1";

const fetcher = async (url: string): Promise<APIResponse> => {
  try {
    const controller = new AbortController();
    // Timeout de 10s — si el servidor tarda más, usamos caché local
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data: APIResponse = await res.json();

    // Persistir en localStorage solo si tiene datos reales
    if (data.inmuebles?.length > 0 && data.fuente !== "demo") {
      try {
        localStorage.setItem(CACHE_KEY_LS, JSON.stringify({
          ...data,
          cachedAt: Date.now(),
        }));
      } catch (_) { /* storage lleno */ }
    }

    return data;
  } catch (err: any) {
    // Timeout o error de red → intentar localStorage
    try {
      const raw = localStorage.getItem(CACHE_KEY_LS);
      if (raw) {
        const cached = JSON.parse(raw);
        return { ...cached, fuente: "offline" };
      }
    } catch (_) { /* nada */ }
    throw err;
  }
};

export function useInmuebles() {
  const { data, error, isLoading, mutate } = useSWR<APIResponse>(
    "/api/inmuebles",
    fetcher,
    {
      revalidateOnFocus: false,       // No re-fetch al volver de otra app
      revalidateOnReconnect: true,    // Sí re-fetch al recuperar red
      dedupingInterval: 30 * 60_000, // Deduplicar requests en 30 min
      refreshInterval: 0,            // Sin polling automático
      // Cargar desde localStorage como fallback inicial inmediato
      fallbackData: (() => {
        if (typeof window === "undefined") return undefined;
        try {
          const raw = localStorage.getItem(CACHE_KEY_LS);
          if (!raw) return undefined;
          const cached = JSON.parse(raw);
          // Solo usar si es reciente (< 2 horas)
          const age = Date.now() - (cached.cachedAt || 0);
          if (age > 2 * 60 * 60_000) return undefined;
          return { ...cached, fuente: "offline" };
        } catch {
          return undefined;
        }
      })(),
    }
  );

  return {
    inmuebles: data?.inmuebles || [],
    fuente: data?.fuente || "",
    total: data?.total || 0,
    isOffline: data?.fuente === "offline",
    isLoading,
    isError: error,
    mutate,
  };
}
