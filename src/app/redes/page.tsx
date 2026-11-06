'use client';
// src/app/redes/page.tsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Share,
  ImageIcon,
  Copy,
  Download,
  Share2,
  Building2,
  ExternalLink,
} from "lucide-react";
import type { Inmueble } from "@/types";
import { generarPostRedes } from "@/lib/mensajes";
import { useInmuebles } from "@/hooks/useInmuebles";
import { useFichaViews } from "@/hooks/useFichaViews";
import PropertyPickerDrawer from "@/components/PropertyPickerDrawer";
import EmptyState from "@/components/EmptyState";

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildOgUrl(inm: Inmueble, formato: "feed" | "story"): string {
  const params = new URLSearchParams({
    imagen: inm.imagen,
    tipo: inm.tipo,
    barrio: inm.barrio,
    ciudad: inm.ciudad,
    gestion: inm.gestion,
    precio: String(inm.precio),
    habitaciones: String(inm.habitaciones),
    banos: String(inm.banos),
    area: String(inm.areaTotal),
    garajes: String(inm.garajes),
    formato,
  });
  return `/api/og/inmueble?${params.toString()}`;
}

export default function RedesPage() {
  const { inmuebles, isLoading } = useInmuebles();
  const { views } = useFichaViews();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [red, setRed] = useState<"facebook" | "instagram">("instagram");
  const [formato, setFormato] = useState<"feed" | "story">("feed");
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cardLoaded, setCardLoaded] = useState(false);

  useEffect(() => {
    if (!selectedId && inmuebles.length > 0) {
      setSelectedId(inmuebles[0].id);
    }
  }, [inmuebles, selectedId]);

  const inmuebleActual =
    inmuebles.find((i) => i.id === selectedId) ?? inmuebles[0] ?? null;

  const ogUrl = inmuebleActual ? buildOgUrl(inmuebleActual, formato) : null;
  const postText = inmuebleActual ? generarPostRedes(inmuebleActual, red) : "";

  useEffect(() => {
    setCardLoaded(false);
  }, [inmuebleActual?.id, formato]);

  const handleCopy = async () => {
    if (!postText) return;
    try {
      await navigator.clipboard.writeText(postText);
      toast.success("Texto del post copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el texto");
    }
  };

  const handleDownload = async () => {
    if (!ogUrl || !inmuebleActual) return;
    setDownloading(true);
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `post-${inmuebleActual.id}-${formato}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Imagen descargada en alta resolución");
    } catch (e) {
      console.error("Download error", e);
      toast.error("No se pudo descargar la imagen");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!ogUrl || !inmuebleActual) return;
    setSharing(true);
    try {
      // Auto-copiar el texto antes de abrir el menú nativo:
      // Instagram en Android ignora `text` al adjuntar imagen, así queda listo para pegar.
      if (postText) {
        try {
          await navigator.clipboard.writeText(postText);
          toast.success("Texto copiado · Pégalo al publicar tu imagen");
        } catch {
          // continuar aún si clipboard falla
        }
      }

      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `post-${inmuebleActual.id}-${formato}.png`,
        { type: "image/png" }
      );

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: inmuebleActual.titulo,
          text: postText,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: inmuebleActual.titulo,
          text: postText,
        });
      } else {
        await handleDownload();
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("Share error", e);
      }
    } finally {
      setSharing(false);
    }
  };

  const openApp = () => {
    window.open(
      red === "facebook"
        ? "https://www.facebook.com/"
        : "https://www.instagram.com/",
      "_blank"
    );
  };

  return (
    <div className="page" style={{ paddingBottom: 100, maxWidth: 760 }}>
      <div className="header">
        <div>
          <h1 className="header-title">Publicar Post</h1>
          <p className="header-sub">
            Pieza gráfica y copy listos para Instagram y Facebook
          </p>
        </div>
      </div>

      {!isLoading && inmuebles.length === 0 ? (
        <EmptyState
          icon={<Building2 size={44} />}
          title="Sin inmuebles disponibles"
          description="No hay inmuebles activos para generar piezas gráficas."
        />
      ) : (
        <div
          style={{
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* ── 1. Selector Instantáneo CMDK ── */}
          <div>
            <label className="form-label">1. Inmueble a promocionar</label>
            <PropertyPickerDrawer
              inmuebles={inmuebles}
              selected={inmuebleActual}
              onSelect={(inm) => setSelectedId(inm.id)}
              loading={isLoading}
              views={views}
            />
          </div>

          {/* ── 2. Red Social y Formato ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label className="form-label">2. Red social</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["instagram", "facebook"] as const).map((r) => {
                  const active = red === r;
                  const accent = r === "instagram" ? "#E1306C" : "#1877F2";
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRed(r)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        padding: "11px 10px",
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : "var(--border)"}`,
                        background: active
                          ? r === "instagram"
                            ? "rgba(225, 48, 108, 0.08)"
                            : "rgba(24, 119, 242, 0.08)"
                          : "var(--bg-card)",
                        color: active ? accent : "var(--text-secondary)",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "all 0.18s",
                      }}
                    >
                      {r === "instagram" ? (
                        <ImageIcon size={17} />
                      ) : (
                        <Share size={17} />
                      )}
                      {r === "instagram" ? "Instagram" : "Facebook"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="form-label">3. Formato gráfico</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["feed", "story"] as const).map((f) => {
                  const active = formato === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormato(f)}
                      style={{
                        flex: 1,
                        padding: "11px 10px",
                        borderRadius: 12,
                        border: `1.5px solid ${
                          active ? "var(--text-primary)" : "var(--border)"
                        }`,
                        background: active
                          ? "var(--text-primary)"
                          : "var(--bg-card)",
                        color: active
                          ? "var(--bg-card)"
                          : "var(--text-secondary)",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "all 0.18s",
                      }}
                    >
                      {f === "feed" ? "Feed (1:1)" : "Story (9:16)"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {inmuebleActual && (
            <>
              {/* ── Preview Card ── */}
              <div>
                <div className="form-label">
                  Vista previa · {formato === "feed" ? "1080 × 1080" : "1080 × 1920"}
                </div>
                <div
                  style={{
                    position: "relative",
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    aspectRatio: formato === "feed" ? "1 / 1" : "9 / 16",
                    width: formato === "story" ? "min(72%, 340px)" : "min(100%, 480px)",
                    margin: "0 auto",
                    background: "var(--bg-card)",
                  }}
                >
                  {!cardLoaded && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        background: "var(--bg-card)",
                      }}
                    >
                      <ImageIcon size={30} color="var(--text-muted)" />
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Generando pieza gráfica...
                      </span>
                    </div>
                  )}
                  {ogUrl && (
                    <motion.img
                      key={ogUrl}
                      src={ogUrl}
                      alt={`Pieza gráfica ${inmuebleActual.barrio}`}
                      onLoad={() => setCardLoaded(true)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: cardLoaded ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* ── Acciones de Imagen ── */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || !cardLoaded}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    background: "var(--bg-card)",
                    padding: "14px 12px",
                    fontSize: 15,
                    borderRadius: 14,
                    cursor: downloading || !cardLoaded ? "not-allowed" : "pointer",
                    opacity: downloading || !cardLoaded ? 0.5 : 1,
                  }}
                >
                  <Download size={18} />
                  {downloading ? "Descargando..." : "Descargar PNG"}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  disabled={sharing || !cardLoaded}
                  className={red === "instagram" ? "btn-ig" : "btn-fb"}
                  style={{
                    flex: 1,
                    padding: "14px 12px",
                    fontSize: 15,
                    borderRadius: 14,
                    cursor: sharing || !cardLoaded ? "not-allowed" : "pointer",
                    opacity: sharing || !cardLoaded ? 0.5 : 1,
                  }}
                >
                  <Share2 size={18} />
                  {sharing ? "Compartiendo..." : "Compartir"}
                </button>
              </div>

              {/* ── Copy del Post ── */}
              <div>
                <div className="form-label">Texto sugerido para la publicación</div>
                <motion.div
                  className="msg-preview"
                  key={`${inmuebleActual.id}-${red}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border)",
                    userSelect: "all",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {postText}
                </motion.div>
              </div>

              {/* ── Acciones de Copy ── */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    background: "var(--bg-card)",
                    padding: "13px 12px",
                    fontSize: 15,
                    borderRadius: 14,
                  }}
                >
                  <Copy size={17} />
                  Copiar texto
                </button>

                <button
                  type="button"
                  onClick={openApp}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    background: "var(--bg-card)",
                    padding: "13px 12px",
                    fontSize: 15,
                    borderRadius: 14,
                  }}
                >
                  <ExternalLink size={17} />
                  Abrir {red === "instagram" ? "Instagram" : "Facebook"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
