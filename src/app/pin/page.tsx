'use client';
// src/app/pin/page.tsx

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { AlertCircle, ArrowRight, Lock, ShieldCheck } from "lucide-react";

export default function PinPage() {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const otpRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const router = useRouter();

  async function submitPin(rawPin: string) {
    const cleanPin = rawPin.replace(/\D/g, "").slice(0, 4);
    if (cleanPin.length !== 4 || submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: cleanPin }),
      });

      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }

      let serverError = "";
      try {
        const payload = await res.json();
        if (payload && typeof payload.error === "string") {
          serverError = payload.error;
        }
      } catch {
        // Respuesta sin JSON adicional
      }

      if (res.status === 429) {
        setIsLockedOut(true);
        setErrorMsg(
          serverError ||
            "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar."
        );
      } else {
        setIsLockedOut(false);
        setErrorMsg(
          serverError || "PIN incorrecto. Verifica tus 4 dígitos e intenta de nuevo."
        );
      }

      setShake(true);
      setPin("");
      setLoading(false);
      submittingRef.current = false;

      setTimeout(() => {
        otpRef.current?.focus();
      }, 30);
      setTimeout(() => {
        setShake(false);
      }, 380);
    } catch {
      setErrorMsg("Error de conexión. Verifica tu red e intenta nuevamente.");
      setShake(true);
      setPin("");
      setLoading(false);
      submittingRef.current = false;

      setTimeout(() => {
        otpRef.current?.focus();
      }, 30);
      setTimeout(() => {
        setShake(false);
      }, 380);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length === 4 && !loading) {
      void submitPin(pin);
    } else {
      otpRef.current?.focus();
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(196, 30, 58, 0.05) 0%, transparent 55%), linear-gradient(to right, rgba(229, 231, 235, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(229, 231, 235, 0.45) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: "32px 26px 26px",
          boxShadow:
            "0 12px 32px rgba(17, 24, 39, 0.05), 0 2px 6px rgba(17, 24, 39, 0.02)",
        }}
      >
        {/* Co-branded Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "var(--red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(196, 30, 58, 0.24)",
              marginBottom: 14,
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 20V9.5L12 4L20 9.5V20H14.5V14H9.5V20H4Z"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 4V10"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 10,
            }}
          >
            <Lock size={12} color="var(--red)" />
            <span>L2L Bienes Raíces · Acceso Asesores</span>
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            SalesHelper
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--text-secondary)",
              marginTop: 6,
              lineHeight: 1.45,
            }}
          >
            {loading
              ? "Verificando credenciales..."
              : "Ingresa tu PIN comercial de 4 dígitos"}
          </p>
        </div>

        {/* OTP PIN Form */}
        <form onSubmit={handleFormSubmit} noValidate>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <OTPInput
              ref={otpRef}
              maxLength={4}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              disabled={loading}
              value={pin}
              onChange={(val) => {
                setPin(val);
                if (errorMsg) {
                  setErrorMsg(null);
                  setIsLockedOut(false);
                }
              }}
              onComplete={(val) => {
                void submitPin(val);
              }}
              aria-label="PIN de acceso de 4 dígitos"
              render={({ slots }) => (
                <div className={`otp-slots ${shake ? "pin-shake" : ""}`}>
                  {slots.map((slot, index) => {
                    const classes = [
                      "otp-slot",
                      slot.isActive ? "otp-slot-active" : "",
                      slot.char ? "otp-slot-filled" : "",
                      errorMsg ? "otp-slot-error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div key={index} className={classes}>
                        {slot.char ? (
                          <span
                            aria-hidden="true"
                            style={{
                              fontSize: 28,
                              lineHeight: 1,
                              color: "var(--text-primary)",
                            }}
                          >
                            {"\u2022"}
                          </span>
                        ) : null}
                        {slot.hasFakeCaret && <div className="otp-caret" />}
                      </div>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                padding: "11px 13px",
                marginBottom: 18,
                borderRadius: 12,
                background: isLockedOut ? "#FFFBEB" : "#FEF2F2",
                border: isLockedOut
                  ? "1px solid #FDE68A"
                  : "1px solid #FECACA",
                color: isLockedOut ? "#92400E" : "#B91C1C",
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.45,
              }}
            >
              <AlertCircle
                size={16}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Explicit Submit CTA */}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="btn-primary"
            style={{
              minHeight: 48,
              fontSize: 15.5,
              padding: "13px 18px",
              opacity: loading || pin.length < 4 ? 0.55 : 1,
              cursor: loading || pin.length < 4 ? "not-allowed" : "pointer",
            }}
          >
            <span>{loading ? "Ingresando..." : "Ingresar al panel"}</span>
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        {/* Subtle Security Note */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          <ShieldCheck size={14} color="var(--text-muted)" />
          <span>Sesión cifrada · Copiloto comercial L2L</span>
        </div>
      </div>
    </main>
  );
}
