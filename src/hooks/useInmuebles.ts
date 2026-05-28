import useSWR from "swr";
import type { Inmueble } from "@/types";

interface APIResponse {
  inmuebles: Inmueble[];
  fuente: string;
  total: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useInmuebles() {
  const { data, error, isLoading, mutate } = useSWR<APIResponse>(
    "/api/inmuebles",
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch on tab switch to avoid spamming L2L
      refreshInterval: 0,
    }
  );

  return {
    inmuebles: data?.inmuebles || [],
    fuente: data?.fuente || "",
    total: data?.total || 0,
    isLoading,
    isError: error,
    mutate,
  };
}
