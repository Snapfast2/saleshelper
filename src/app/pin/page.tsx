"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PinPage() {
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  async function submitPin(fullPin: string) {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: fullPin }),
      });
      if (res.ok) {
        window.location.href = "/";
      } else {
        setError(true);
        setShake(true);
        setPin(["", "", "", ""]);
        setTimeout(() => { setShake(false); inputs.current[0]?.focus(); }, 600);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleChange(value: string, index: number) {
    if (!/^\d*$/.test(value)) return;
    const next = [...pin];
    next[index] = value.slice(-1);
    setPin(next);
    setError(false);
    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every(d => d !== "") && next.join("").length === 4) {
      submitPin(next.join(""));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: 24,
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
        animation: shake ? "shake 0.5s ease" : "none",
      }}>
        {/* Logo */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "linear-gradient(135deg, #C41E3A, #8b0000)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          boxShadow: "0 8px 32px rgba(196,30,58,0.4)",
        }}>
          🏠
        </div>

        {/* Título */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
            SalesHelper
          </h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
            {loading ? "Verificando..." : "Ingresa tu PIN de acceso"}
          </p>
        </div>

        {/* Inputs PIN */}
        <div style={{ display: "flex", gap: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={pin[i]}
              onChange={e => handleChange(e.target.value, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              disabled={loading}
              autoFocus={i === 0}
              style={{
                width: 56,
                height: 64,
                borderRadius: 14,
                border: error
                  ? "2px solid #f87171"
                  : pin[i]
                  ? "2px solid #C41E3A"
                  : "2px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "#e2e8f0",
                fontSize: 28,
                textAlign: "center",
                outline: "none",
                transition: "border-color 0.2s, transform 0.1s",
                transform: pin[i] ? "scale(1.05)" : "scale(1)",
                backdropFilter: "blur(10px)",
                cursor: loading ? "not-allowed" : "text",
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>
            PIN incorrecto. Intenta de nuevo.
          </p>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
