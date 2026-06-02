// src/app/clientes/loading.tsx
import React from 'react';

export default function LoadingClientes() {
  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      {/* ── Header Skeleton ── */}
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <div
            className="animate-pulse"
            style={{
              height: 32,
              width: 180,
              background: "var(--border)",
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
          <div
            className="animate-pulse"
            style={{
              height: 16,
              width: 240,
              background: "var(--bg-card-hover)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* ── Tabs Skeleton ── */}
      <div style={{ padding: "0 20px 16px" }}>
        <div className="tabs" style={{ padding: 0 }}>
          <div
            className="animate-pulse"
            style={{
              height: 38,
              width: 100,
              background: "var(--red)",
              borderRadius: 20,
              opacity: 0.8,
            }}
          />
          <div
            className="animate-pulse"
            style={{
              height: 38,
              width: 120,
              background: "var(--bg-card)",
              borderRadius: 20,
            }}
          />
        </div>
      </div>

      {/* ── Cards Skeleton ── */}
      <div className="grid-1">
        {[1, 2, 3].map((card) => (
          <div key={card} className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Foto del inmueble Skeleton */}
            <div
              className="animate-pulse"
              style={{
                height: 130,
                width: "100%",
                background: "linear-gradient(135deg, var(--bg-card-hover) 0%, var(--border) 100%)",
              }}
            />

            {/* Header del grupo (n clientes) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div className="animate-pulse" style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(196,30,58,0.1)", marginRight: 8 }} />
              <div className="animate-pulse" style={{ height: 16, width: 140, borderRadius: 4, background: "var(--bg-card-hover)" }} />
            </div>

            {/* Filas de clientes Skeleton */}
            {[1, 2].map((row) => (
              <div
                key={row}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 18px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--bg-card)",
                }}
              >
                {/* Avatar Skeleton */}
                <div
                  className="animate-pulse"
                  style={{
                    width: 41,
                    height: 41,
                    borderRadius: "50%",
                    background: "var(--bg-card-hover)",
                    flexShrink: 0,
                  }}
                />
                
                {/* Text Lines Skeleton */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="animate-pulse" style={{ height: 16, width: "60%", borderRadius: 4, background: "var(--border)" }} />
                  <div className="animate-pulse" style={{ height: 12, width: "40%", borderRadius: 4, background: "var(--bg-card-hover)" }} />
                </div>

                {/* Actions Skeleton */}
                <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                  <div className="animate-pulse" style={{ width: 37, height: 37, borderRadius: "50%", background: "var(--bg-card-hover)" }} />
                  <div className="animate-pulse" style={{ width: 37, height: 37, borderRadius: "50%", background: "var(--bg-card-hover)" }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
