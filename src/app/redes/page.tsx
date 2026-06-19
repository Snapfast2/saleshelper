'use client';
// src/app/redes/page.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share, ImageIcon, Copy, CheckCircle,
  Download, Share2, ChevronLeft, ChevronRight
} from "lucide-react";
import type { Inmueble } from "@/types";
import { generarPostRedes } from "@/lib/mensajes";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildOgUrl(inm: Inmueble): string {
  const params = new URLSearchParams({
    imagen:       inm.imagen,
    tipo:         inm.tipo,
    barrio:       inm.barrio,
    ciudad:       inm.ciudad,
    gestion:      inm.gestion,
    precio:       String(inm.precio),
    habitaciones: String(inm.habitaciones),
    banos:        String(inm.banos),
    area:         String(inm.areaTotal),
    garajes:      String(inm.garajes),
  });
  return `/api/og/inmueble?${params.toString()}`;
}

export default function RedesPage() {
  const { inmuebles, isLoading } = useInmuebles();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [red, setRed] = useState<"facebook" | "instagram">("instagram");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cardLoaded, setCardLoaded] = useState(false);

  const inm = inmuebles[selectedIdx] ?? null;
  const ogUrl = inm ? buildOgUrl(inm) : null;
  const postText = inm ? generarPostRedes(inm, red) : "";

  // Reset card loaded on inmueble change
  useEffect(() => { setCardLoaded(false); }, [selectedIdx]);

  const prev = () => setSelectedIdx(i => Math.max(0, i - 1));
  const next = () => setSelectedIdx(i => Math.min(inmuebles.length - 1, i + 1));

  const handleCopy = async () => {
    if (!postText) return;
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = async () => {
    if (!ogUrl || !inm) return;
    setDownloading(true);
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `post-${inm.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download error", e);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!ogUrl || !inm) return;
    setSharing(true);
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const file = new File([blob], `post-${inm.id}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: inm.titulo,
          text: postText,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({ title: inm.titulo, text: postText });
      } else {
        // Fallback: descargar
        await handleDownload();
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Share error", e);
    } finally {
      setSharing(false);
    }
  };

  const openApp = () => {
    window.open(
      red === "facebook" ? "https://www.facebook.com/" : "https://www.instagram.com/",
      "_blank"
    );
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div className="header">
        <div>
          <h1 className="header-title">Publicar Post</h1>
          <p className="header-sub">Card lista para Instagram y Facebook</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState text="Cargando inmuebles..." />
      ) : inmuebles.length === 0 ? (
        <EmptyState title="Sin inmuebles" description="No hay inmuebles disponibles." />
      ) : (
        <div style={{ padding: "0 16px" }}>

          {/* ── Selector de red ──────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {(["instagram", "facebook"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRed(r)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: `1.5px solid ${red === r
                    ? (r === "instagram" ? "#E1306C" : "#1877F2")
                    : "var(--border)"}`,
                  background: red === r
                    ? (r === "instagram" ? "rgba(225,48,108,0.10)" : "rgba(24,119,242,0.10)")
                    : "var(--bg-card)",
                  color: red === r
                    ? (r === "instagram" ? "#E1306C" : "#1877F2")
                    : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {r === "instagram"
                  ? <ImageIcon size={18} />
                  : <Share size={18} />}
                {r === "instagram" ? "Instagram" : "Facebook"}
              </button>
            ))}
          </div>

          {/* ── Selector de inmueble con flechas ─────────────── */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 12px",
          }}>
            <button onClick={prev} disabled={selectedIdx === 0}
              style={{ background: "none", border: "none", padding: 4, cursor: selectedIdx === 0 ? "not-allowed" : "pointer", opacity: selectedIdx === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={20} color="var(--text-primary)" />
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                {inm.tipo} · {inm.barrio}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {selectedIdx + 1} / {inmuebles.length} — ${(inm.precio / 1_000_000).toFixed(0)}M
              </div>
            </div>
            <button onClick={next} disabled={selectedIdx === inmuebles.length - 1}
              style={{ background: "none", border: "none", padding: 4, cursor: selectedIdx === inmuebles.length - 1 ? "not-allowed" : "pointer", opacity: selectedIdx === inmuebles.length - 1 ? 0.3 : 1 }}>
              <ChevronRight size={20} color="var(--text-primary)" />
            </button>
          </div>

          {/* ── Card branded preview ──────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Preview card 1080×1080
            </div>
            <div style={{
              position: "relative",
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--border)",
              aspectRatio: "1 / 1",
              background: "var(--bg-input)",
            }}>
              {!cardLoaded && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--bg-input)" }}>
                  <ImageIcon size={32} color="var(--text-muted)" />
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Generando card…</span>
                </div>
              )}
              {ogUrl && (
                <motion.img
                  key={ogUrl}
                  src={ogUrl}
                  alt="Card para redes"
                  onLoad={() => setCardLoaded(true)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: cardLoaded ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>
          </div>

          {/* ── Botones de acción principales ────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={handleDownload}
              disabled={downloading || !cardLoaded}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px 0",
                borderRadius: 12,
                border: "1.5px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: 15,
                cursor: downloading || !cardLoaded ? "not-allowed" : "pointer",
                opacity: downloading || !cardLoaded ? 0.5 : 1,
              }}
            >
              <Download size={18} />
              {downloading ? "Descargando…" : "Descargar"}
            </button>

            <button
              onClick={handleShare}
              disabled={sharing || !cardLoaded}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: red === "instagram"
                  ? "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                  : "#1877F2",
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                cursor: sharing || !cardLoaded ? "not-allowed" : "pointer",
                opacity: sharing || !cardLoaded ? 0.5 : 1,
              }}
            >
              <Share2 size={18} />
              {sharing ? "Compartiendo…" : "Compartir"}
            </button>
          </div>

          {/* ── Texto del post ────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Texto para pegar en el post
            </div>
            <motion.div
              className="msg-preview"
              key={`${selectedIdx}-${red}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: "var(--bg-input)", borderColor: "var(--border)", userSelect: "all", whiteSpace: "pre-wrap" }}
            >
              {postText}
            </motion.div>
          </div>

          {/* ── Botones de texto ──────────────────────────────── */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 0",
                borderRadius: 12,
                border: "1.5px solid var(--border)",
                background: "var(--bg-card)",
                color: copied ? "#16a34a" : "var(--text-primary)",
                fontWeight: 700, fontSize: 15, cursor: "pointer",
              }}
            >
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copied ? "¡Copiado!" : "Copiar texto"}
            </button>

            <button
              onClick={openApp}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 0",
                borderRadius: 12,
                border: "1.5px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontWeight: 700, fontSize: 15, cursor: "pointer",
              }}
            >
              {red === "instagram" ? <ImageIcon size={18} /> : <Share size={18} />}
              Abrir app
            </button>
          </div>

        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {copied && (
          <motion.div className="toast success"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <CheckCircle size={16} /> ¡Texto copiado!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
