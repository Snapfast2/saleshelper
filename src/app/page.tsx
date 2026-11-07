'use client';
// src/app/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  Send,
  Share2,
  BookOpen,
  FileText,
  MessageCircle,
  Check,
  ArrowRight,
  RefreshCw,
  Search,
} from "lucide-react";

import L2LLogo from "@/components/L2LLogo";
import PropCard from "@/components/PropCard";
import PropertyPickerDrawer from "@/components/PropertyPickerDrawer";
import EmptyState from "@/components/EmptyState";
import NotificationBanner, {
  NotificationHeaderButton,
} from "@/components/NotificationBanner";
import { AGENTE_PATRICIA } from "@/lib/agente";
import { useInmuebles } from "@/hooks/useInmuebles";
import { useFichaViews } from "@/hooks/useFichaViews";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  getRecordatoriosPendientes,
  marcarCompletado,
  restaurarRecordatorio,
  formatearFechaRecordatorio,
  type Recordatorio,
} from "@/lib/recordatorios";
import type { Cliente, Inmueble } from "@/types";

const WhatsAppModal = dynamic(() => import("@/components/WhatsAppModal"), {
  ssr: false,
});

function formatPortafolioCOP(valor: number): string {
  if (!valor || valor <= 0) return "$0";
  const millones = Math.round(valor / 1_000_000);
  if (millones >= 1) {
    return `$${millones.toLocaleString("es-CO")}M`;
  }
  return `$${valor.toLocaleString("es-CO")}`;
}

function capitalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ");
}

export default function Home() {
  const router = useRouter();
  const { inmuebles, isLoading, mutate } = useInmuebles();
  const { views } = useFichaViews();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [saludo, setSaludo] = useState("Hola, Patricia");
  const [fechaCorta, setFechaCorta] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const { isSubscribed, checkReminders } = usePushNotifications();

  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waModalData, setWaModalData] = useState<{
    cliente: Cliente;
    tel: string;
    inmueble?: Inmueble;
  } | null>(null);

  useEffect(() => {
    const ahora = new Date();
    const hora = ahora.getHours();
    if (hora < 12) {
      setSaludo("Buenos días, Patricia");
    } else if (hora < 18) {
      setSaludo("Buenas tardes, Patricia");
    } else {
      setSaludo("Buenas noches, Patricia");
    }

    const rawFecha = new Intl.DateTimeFormat("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
      .format(ahora)
      .replace(/\./g, "");
    setFechaCorta(rawFecha.charAt(0).toUpperCase() + rawFecha.slice(1));

    const syncRecordatorios = () => {
      setRecordatorios(getRecordatoriosPendientes());
    };

    syncRecordatorios();
    window.addEventListener("sh-recordatorios-changed", syncRecordatorios);
    window.addEventListener("storage", syncRecordatorios);
    return () => {
      window.removeEventListener("sh-recordatorios-changed", syncRecordatorios);
      window.removeEventListener("storage", syncRecordatorios);
    };
  }, []);

  useEffect(() => {
    if (!isSubscribed) return;
    checkReminders();
  }, [isSubscribed, checkReminders]);

  const handleCompletarRecordatorio = (rec: Recordatorio) => {
    marcarCompletado(rec.id);
    setRecordatorios(getRecordatoriosPendientes());

    fetch("/api/push/check-reminders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec.id }),
    }).catch(() => {});

    const primerNombre = capitalizarNombre(
      rec.nombre.trim().split(/\s+/)[0] || "cliente"
    );
    toast.success(`Seguimiento con ${primerNombre} completado`, {
      action: {
        label: "Deshacer",
        onClick: () => {
          restaurarRecordatorio(rec.id);
          setRecordatorios(getRecordatoriosPendientes());
        },
      },
    });
  };

  const ventas = inmuebles.filter((i) => i.gestion === "venta");
  const arriendos = inmuebles.filter((i) => i.gestion === "arriendo");
  const ventasCount = ventas.length;
  const arriendosCount = arriendos.length;
  const valorPortafolioVenta = ventas.reduce(
    (acc, inm) => acc + (inm.precio || 0),
    0
  );

  return (
    <div className="page">
      {/* 1. Barra Ejecutiva Integrada Móvil (< 900px; en desktop vive en DesktopSidebar) */}
      <div className="home-topbar">
        <L2LLogo height={30} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexShrink: 0,
          }}
        >
          <Link
            href="/equipo"
            className="workspace-pill"
            style={{
              minHeight: 34,
              padding: "4px 10px",
              textDecoration: "none",
            }}
          >
            <Building2 size={13} color="var(--red)" />
            <span>Agencia</span>
          </Link>

          <NotificationHeaderButton />

          <a
            href={AGENTE_PATRICIA.urlPerfil}
            target="_blank"
            rel="noopener noreferrer"
            title="Olga Patricia Vásquez · L2L Bienes Raíces"
            style={{
              position: "relative",
              width: 34,
              height: 34,
              borderRadius: "50%",
              flexShrink: 0,
              display: "inline-flex",
              textDecoration: "none",
            }}
          >
            {!avatarError && AGENTE_PATRICIA.foto ? (
              <Image
                src={AGENTE_PATRICIA.foto}
                alt="Olga Patricia Vásquez"
                width={34}
                height={34}
                priority
                onError={() => setAvatarError(true)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1.5px solid var(--border-red)",
                }}
              />
            ) : (
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(184, 15, 18, 0.1)",
                  border: "1.5px solid var(--border-red)",
                  color: "var(--red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11.5,
                  fontWeight: 800,
                }}
              >
                PV
              </span>
            )}
            <span
              aria-label="En línea"
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#16A34A",
                border: "2px solid var(--bg-base)",
              }}
            />
          </a>
        </div>
      </div>

      {/* 2. Saludo Ejecutivo de 1 línea + Fecha / Controles Desktop */}
      <header className="home-greeting-row">
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "var(--text-primary)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {saludo}
          </h1>
          {fechaCorta && (
            <span
              className="desktop-only-inline"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              · {fechaCorta}
            </span>
          )}
        </div>

        {/* Fecha corta en móvil */}
        {fechaCorta && (
          <span
            className="mobile-only-inline"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {fechaCorta}
          </span>
        )}

        {/* Controles rápidos en escritorio */}
        <div
          className="desktop-only-inline"
          style={{ alignItems: "center", gap: 8, flexShrink: 0 }}
        >
          <Link
            href="/equipo"
            className="workspace-pill"
            style={{
              minHeight: 34,
              padding: "4px 11px",
              textDecoration: "none",
            }}
          >
            <Building2 size={13} color="var(--red)" />
            <span>Agencia</span>
          </Link>
          <NotificationHeaderButton />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 9px",
              borderRadius: 999,
              background: "rgba(22, 163, 74, 0.08)",
              border: "1px solid rgba(22, 163, 74, 0.2)",
              fontSize: 11,
              fontWeight: 700,
              color: "#15803D",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#16A34A",
              }}
            />
            <span>En línea</span>
          </span>
        </div>
      </header>

      {/* Banner compacto de notificaciones (solo si falta activar) */}
      <NotificationBanner />

      {/* 3. Typographic KPI Strip */}
      <section className="kpi-strip" aria-label="Indicadores clave">
        <Link
          href="/inmuebles"
          className="kpi-cell"
          style={{ textDecoration: "none" }}
        >
          <span className="kpi-label">Inmuebles activos</span>
          <span className="kpi-value">
            {isLoading ? "—" : inmuebles.length}
          </span>
          <span className="kpi-sub">
            {isLoading
              ? "Sincronizando…"
              : `${ventasCount} venta · ${arriendosCount} arr.`}
          </span>
        </Link>

        <Link
          href="/clientes"
          className="kpi-cell"
          style={{ textDecoration: "none" }}
        >
          <span className="kpi-label">Por contactar hoy</span>
          <span
            className="kpi-value"
            style={{
              color: recordatorios.length > 0 ? "var(--red)" : "#16A34A",
            }}
          >
            {recordatorios.length}
          </span>
          <span className="kpi-sub">
            {recordatorios.length > 0 ? "Prioridad alta" : "Al día · Ver CRM"}
          </span>
        </Link>

        <Link
          href="/inmuebles"
          className="kpi-cell"
          style={{ textDecoration: "none" }}
        >
          <span className="kpi-label">Portafolio venta</span>
          <span className="kpi-value">
            {isLoading ? "—" : formatPortafolioCOP(valorPortafolioVenta)}
          </span>
          <span className="kpi-sub">Inventario L2L</span>
        </Link>
      </section>

      {/* 4. Buscador Instantáneo 1-Toque (abre CMDK nativo para enviar ficha al instante) */}
      <div style={{ padding: "0 20px", marginBottom: 16 }}>
        <PropertyPickerDrawer
          inmuebles={inmuebles}
          selected={null}
          loading={isLoading}
          views={views}
          drawerTitle="Ir a inmueble · Enviar ficha"
          onSelect={(inm) => router.push(`/whatsapp?inmueble=${inm.id}`)}
          customTrigger={
            <button type="button" className="home-search-trigger">
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                <Search
                  size={15}
                  color="var(--red)"
                  style={{ flexShrink: 0 }}
                />
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Buscar inmueble por barrio o #código…
                </span>
              </span>
              <span className="home-search-kbd">
                {isLoading ? "…" : `${inmuebles.length} disp.`}
              </span>
            </button>
          }
        />
      </div>

      {/* 5. Cola de Seguimientos (solo aparece cuando hay pendientes reales) */}
      {recordatorios.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div
            className="section-header"
            style={{ padding: "0 20px 8px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <h2
                className="section-title"
                style={{ fontSize: 15, letterSpacing: "-0.01em" }}
              >
                Cola de seguimientos
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  background: "var(--red)",
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {recordatorios.length}
              </span>
            </div>
            <Link
              href="/clientes"
              className="section-link"
              style={{ fontSize: 12.5, fontWeight: 600 }}
            >
              Ver CRM →
            </Link>
          </div>

          <div
            style={{
              padding: "0 20px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {recordatorios.map((rec) => {
              const telefonoCompleto = `${(
                rec.telefonoIndicativo || "+57"
              ).replace(/\D/g, "")}${(rec.telefono || "").replace(/\D/g, "")}`;
              const fechaTexto = formatearFechaRecordatorio(
                rec.fechaRecordatorio
              );
              const esVencido = fechaTexto.toLowerCase().includes("vencido");
              const inmuebleMatch = inmuebles.find(
                (i) =>
                  i.id === rec.inmuebleInteres ||
                  i.codigoDomus === rec.inmuebleInteres
              );
              const nombreFormateado = capitalizarNombre(rec.nombre);
              const primerNombre =
                nombreFormateado.split(" ")[0] || nombreFormateado;

              return (
                <div
                  key={rec.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: esVencido
                      ? "3px solid var(--red)"
                      : "3px solid #D97706",
                    borderRadius: 12,
                    padding: "11px 13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                      marginBottom: 9,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14.5,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {nombreFormateado}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "1px 7px",
                            borderRadius: 6,
                            background: esVencido ? "#FEF2F2" : "#FFFBEB",
                            border: esVencido
                              ? "1px solid #FECACA"
                              : "1px solid #FDE68A",
                            color: esVencido ? "#DC2626" : "#B45309",
                          }}
                        >
                          {fechaTexto}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        {rec.inmuebleInteres && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: 5,
                              background: "var(--bg-base)",
                              border: "1px solid var(--border)",
                              color: "var(--text-secondary)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            #{rec.inmuebleInteres}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 12.5,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {inmuebleMatch
                            ? `${inmuebleMatch.tipo} en ${inmuebleMatch.barrio}`
                            : "Seguimiento comercial pendiente"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setWaModalData({
                          cliente: {
                            id: rec.clienteId || rec.id,
                            nombre: rec.nombre,
                            telefono: rec.telefono,
                            telefonoIndicativo: rec.telefonoIndicativo,
                            email: "",
                            inmuebleInteres: rec.inmuebleInteres,
                            origen: "",
                            estado: "Seguimiento",
                            fecha: new Date().toISOString(),
                          } as Cliente,
                          tel: telefonoCompleto,
                          inmueble: inmuebleMatch,
                        });
                        setWaModalOpen(true);
                      }}
                      className="btn-ws"
                      style={{
                        flex: 1,
                        minHeight: 38,
                        fontSize: 13,
                        padding: "7px 12px",
                        borderRadius: 10,
                      }}
                    >
                      <MessageCircle size={15} />
                      <span>Escribir a {primerNombre}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompletarRecordatorio(rec)}
                      style={{
                        minHeight: 38,
                        padding: "0 12px",
                        borderRadius: 10,
                        background: "var(--bg-base)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        fontSize: 12.5,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Check size={14} color="#16A34A" />
                      <span>Listo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Dock Ejecutivo Compacto 2x2 — Herramientas Comerciales */}
      <section aria-label="Herramientas comerciales">
        <div
          className="section-header"
          style={{ padding: "0 20px 8px" }}
        >
          <h2
            className="section-title"
            style={{ fontSize: 15, letterSpacing: "-0.01em" }}
          >
            Herramientas
          </h2>
          <Link
            href="/clientes"
            className="section-link"
            style={{ fontSize: 12.5, fontWeight: 600 }}
          >
            Clientes CRM →
          </Link>
        </div>

        <div className="quick-actions">
          <Link
            href="/informes"
            className="qa-btn"
            style={{
              textDecoration: "none",
              borderColor: "rgba(184, 15, 18, 0.26)",
              background:
                "linear-gradient(180deg, rgba(184, 15, 18, 0.035) 0%, #FFFFFF 100%)",
            }}
          >
            <div
              className="qa-icon"
              style={{
                background: "rgba(184, 15, 18, 0.09)",
                border: "1px solid rgba(184, 15, 18, 0.2)",
                color: "var(--red)",
              }}
            >
              <FileText size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span className="qa-label">Informes</span>
                <span
                  style={{
                    padding: "1px 5px",
                    borderRadius: 999,
                    background: "var(--red)",
                    color: "#FFFFFF",
                    fontSize: 9.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    lineHeight: 1.35,
                    flexShrink: 0,
                  }}
                >
                  Mes
                </span>
              </div>
              <div className="qa-sub">Portales y citas</div>
            </div>
          </Link>

          <Link
            href="/whatsapp"
            className="qa-btn"
            style={{ textDecoration: "none" }}
          >
            <div
              className="qa-icon"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Send size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="qa-label">Enviar Ficha</div>
              <div className="qa-sub">Por WhatsApp</div>
            </div>
          </Link>

          <Link
            href="/redes"
            className="qa-btn"
            style={{ textDecoration: "none" }}
          >
            <div
              className="qa-icon"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Share2 size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="qa-label">Publicar Post</div>
              <div className="qa-sub">IG y Facebook</div>
            </div>
          </Link>

          <Link
            href="/respuestas"
            className="qa-btn"
            style={{ textDecoration: "none" }}
          >
            <div
              className="qa-icon"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <BookOpen size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="qa-label">Objeciones</div>
              <div className="qa-sub">Guiones rápidos</div>
            </div>
          </Link>
        </div>
      </section>

      {/* 7. Mis Inmuebles Recientes (ahora visible en el primer pantallazo) */}
      <section aria-label="Mis inmuebles recientes">
        <div
          className="section-header"
          style={{ padding: "0 20px 8px" }}
        >
          <h2
            className="section-title"
            style={{ fontSize: 15, letterSpacing: "-0.01em" }}
          >
            Inmuebles recientes
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => mutate()}
              title="Actualizar inventario"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                minHeight: 30,
                padding: "3px 7px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: isLoading ? "spin 1s linear infinite" : "none",
                }}
              />
              <span>Sincronizar</span>
            </button>
            <Link
              href="/inmuebles"
              className="section-link"
              style={{ fontSize: 12.5, fontWeight: 600 }}
            >
              {!isLoading && inmuebles.length > 0
                ? `Ver los ${inmuebles.length} →`
                : "Ver todos →"}
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="h-scroll" aria-busy="true">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="card animate-pulse"
                style={{
                  width: 220,
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: 116,
                    background: "var(--bg-card-hover)",
                  }}
                />
                <div style={{ padding: "10px 12px" }}>
                  <div
                    style={{
                      width: "45%",
                      height: 10,
                      borderRadius: 5,
                      background: "var(--bg-card-hover)",
                      marginBottom: 6,
                    }}
                  />
                  <div
                    style={{
                      width: "80%",
                      height: 13,
                      borderRadius: 5,
                      background: "var(--bg-card-hover)",
                      marginBottom: 7,
                    }}
                  />
                  <div
                    style={{
                      width: "55%",
                      height: 10,
                      borderRadius: 5,
                      background: "var(--bg-card-hover)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : inmuebles.length > 0 ? (
          <div className="h-scroll">
            {inmuebles.slice(0, 6).map((inmueble) => (
              <PropCard
                key={inmueble.id}
                inmueble={inmueble}
                compact
                viewsCount={views[inmueble.id] ?? 0}
                onClick={() => router.push(`/whatsapp?inmueble=${inmueble.id}`)}
              />
            ))}
            <Link
              href="/inmuebles"
              className="card"
              style={{
                width: 124,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                padding: 14,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowRight size={16} />
              </div>
              <span>Ver todos</span>
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={<Building2 size={40} />}
            title="Sin inmuebles activos"
            description="No se encontraron inmuebles sincronizados en tu perfil de L2L."
          />
        )}
      </section>

      {waModalOpen && waModalData && (
        <WhatsAppModal
          cliente={waModalData.cliente}
          tel={waModalData.tel}
          inmueble={waModalData.inmueble}
          defaultTemplateId="seguimiento"
          onClose={() => {
            setWaModalOpen(false);
            setWaModalData(null);
          }}
        />
      )}
    </div>
  );
}
