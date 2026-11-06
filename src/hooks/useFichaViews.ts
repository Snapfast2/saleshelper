'use client';
// src/hooks/useFichaViews.ts

import useSWR from "swr";

interface FichaViewsResponse {
  views: Record<string, number>;
}

const EMPTY_VIEWS: Record<string, number> = {};

const fetcher = async (url: string): Promise<FichaViewsResponse> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return { views: EMPTY_VIEWS };
    const data = (await res.json()) as Partial<FichaViewsResponse>;
    return {
      views: data?.views && typeof data.views === "object" ? data.views : EMPTY_VIEWS,
    };
  } catch {
    return { views: EMPTY_VIEWS };
  }
};

export function useFichaViews() {
  const { data, isLoading } = useSWR<FichaViewsResponse>(
    "/api/ficha-views",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    views: data?.views ?? EMPTY_VIEWS,
    isLoading: Boolean(isLoading && !data),
  };
}
