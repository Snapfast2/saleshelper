import useSWR from "swr";
import type { Inmueble } from "@/types";

interface APIResponse {
  inmuebles: Inmueble[];
  fuente: string;
  total: number;
}

const CACHE_KEY = "saleshelper_inmuebles_v1";

const fetcher = async (url: string): Promise<APIResponse> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data: APIResponse = await res.json();
    // Guardar en localStorage si tiene datos
    if (data.inmuebles && data.inmuebles.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (_) {
        // localStorage lleno o bloqueado — ignorar silenciosamente
      }
    }
    return data;
  } catch (err) {
    // Si la API falla, intentar cargar desde caché local (Modo Sótano)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: APIResponse = JSON.parse(cached);
        return { ...data, fuente: "offline" };
      }
    } catch (_) {
      // nada
    }
    throw err;
  }
};

export function useInmuebles() {
  const { data, error, isLoading, mutate } = useSWR<APIResponse>(
    "/api/inmuebles",
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
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
