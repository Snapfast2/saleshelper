'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function RefreshCrmButton({ status }: { status: "1" | "2" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const busy = isFetching || isPending;

  const handleRefresh = async () => {
    if (busy) return;
    setIsFetching(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/crm/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));

      startTransition(() => {
        router.refresh();
      });

      if (data?.cached) {
        setFeedback("Ya está al día");
      } else if (res.ok) {
        setFeedback("Actualizado");
      } else {
        setFeedback("Reintenta en breve");
      }
    } catch {
      setFeedback("Sin conexión");
    } finally {
      setIsFetching(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {feedback && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
          }}
        >
          {feedback}
        </span>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={busy}
        title="Sincronizar contactos desde Domus"
        aria-label="Sincronizar contactos desde Domus"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          background: busy ? "var(--red)" : "var(--bg-card)",
          color: busy ? "#fff" : "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--border)",
          cursor: busy ? "default" : "pointer",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        <RefreshCw
          size={18}
          style={{
            animation: busy ? "spin 1s linear infinite" : "none",
          }}
        />
      </button>
    </div>
  );
}
