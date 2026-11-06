'use client';
// src/components/FichaViewTracker.tsx

import { useEffect } from "react";

interface FichaViewTrackerProps {
  id: string;
}

export default function FichaViewTracker({ id }: FichaViewTrackerProps) {
  useEffect(() => {
    if (!id) return;

    const timer = window.setTimeout(() => {
      fetch("/ficha/view-beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        keepalive: true,
      }).catch(() => {});
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [id]);

  return null;
}
