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
  Users,
  Send,
  Share2,
  BookOpen,
  FileText,
  MessageCircle,
  Check,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import PropCard from "@/components/PropCard";
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
  const [avatarError, setAvatarError] = useState(false);
  const { isSubscribed, checkReminders } = usePushNotifications();

  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waModalData, setWaModalData] = useState<{
    cliente: Cliente;
    tel: string;
    inmueble?: Inmueble;
  } | null>(null);

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora < 12) {
      setSaludo("Buenos días, Patricia");
    } else if (hora < 18) {
      setSaludo("Buenas tardes, Patricia");
    } else {
      setSaludo("Buenas noches, Patricia");
    }

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

    const primerNombre = capitalizarNombre(rec.nombre.trim().split(/\s+/)[0] || "cliente");
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
  const valorPortafolioVenta = ventas.reduce((acc, inm) => acc + (inm.precio || 0), 0);

  const subtituloOperativo =
    recordatorios.length > 0
      ? recordatorios.length === 1
        ? "Tienes 1 seguimiento listo para atender hoy"
        : `Tienes ${recordatorios.length} seguimientos listos para atender hoy`
      : "Tus seguimientos están al día · Revisa leads nuevos en CRM";

  return (
    <div className="page">
      {/* Top Workspace Bar */}
      <div className="workspace-bar">
        <a
          href={AGENTE_PATRICIA.urlPerfil}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            textDecoration: "none",
          }}
        >
          {!avatarError && AGENTE_PATRICIA.foto ? (
            <Image
              src={AGENTE_PATRICIA.foto}
              alt="Olga Patricia Vásquez"
              width={38}
              height={38}
              priority
              onError={() => setAvatarError(true)}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1.5px solid var(--border-red)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(196, 30, 58, 0.1)",
                border: "1.5px solid var(--border-red)",
                color: "var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              PV
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Olga Patricia Vásquez
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.25,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              L2L Bienes Raíces · Bogotá
            </div>
          </div>
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Link
            href="/equipo"
            className="workspace-pill"
            style={{
              minHeight: 38,
              padding: "6px 12px",
              textDecoration: "none",
            }}
          >
            <Building2 size={14} />
            <span>Agencia</span>
          </Link>
          <NotificationHeaderButton />
        </div>
      </div>

      {/* Greeting + Operational Status */}
      <header className="header" style={{ paddingTop: 6, paddingBottom: 14 }}>
        <div>
          <h1
            className="header-title"
            style={{ fontSize: 26, letterSpacing: "-0.02em" }}
          >
            {saludo}
          </h1>
          <p className="header-sub" style={{ fontSize: 14.5, marginTop: 4 }}>
            {subtituloOperativo}
          </p>
        </div>
      </header>

      {/* Push Notifications Banner */}
      <NotificationBanner />

      {/* Typographic KPI Strip */}
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
              ? "Sincronizando..."
              : `${ventasCount} venta · ${arriendosCount} arriendo`}
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
            {recordatorios.length > 0 ? "Prioridad alta" : "Todo al día"}
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

      {/* PRIMARY SECTION ABOVE THE FOLD — Cola de Seguimientos */}
      {recordatorios.length > 0 ? (
        <section style={{ marginBottom: 24 }}>
          <div className="section-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 className="section-title" style={{ fontSize: 18 }}>
                Cola de seguimientos
              </h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  background: "var(--red)",
                  padding: "2px 8px",
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
              style={{ fontSize: 13.5, fontWeight: 600 }}
            >
              Ver CRM
            </Link>
          </div>

          <div
            style={{
              padding: "0 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
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
                    borderRadius: 14,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15.5,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {nombreFormateado}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
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
                          marginTop: 6,
                        }}
                      >
                        {rec.inmuebleInteres && (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: "var(--bg-base)",
                              border: "1px solid var(--border)",
                              color: "var(--text-secondary)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            Ref #{rec.inmuebleInteres}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 13,
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
                        minHeight: 44,
                        fontSize: 14,
                        padding: "10px 14px",
                        borderRadius: 12,
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>Escribir a {primerNombre}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompletarRecordatorio(rec)}
                      style={{
                        minHeight: 44,
                        padding: "0 14px",
                        borderRadius: 12,
                        background: "var(--bg-base)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        fontSize: 13.5,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Check size={16} color="#16A34A" />
                      <span>Listo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div style={{ padding: "0 20px", marginBottom: 22 }}>
          <Link
            href="/clientes"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 48,
              padding: "12px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13.5,
                fontWeight: 500,
                color: "var(--text-secondary)",
                minWidth: 0,
              }}
            >
              <CheckCircle2
                size={17}
                color="#16A34A"
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Seguimientos al día · Revisa tus leads de Domus
              </span>
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--red)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span>Ir a Clientes CRM</span>
              <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      )}

      {/* Herramientas Comerciales */}
      <section aria-label="Herramientas comerciales">
        <div className="section-header">
          <h2 className="section-title" style={{ fontSize: 18 }}>
            Herramientas comerciales
          </h2>
        </div>

        {/* Acceso directo destacado: Informe Mensual a Propietarios */}
        <div style={{ padding: "0 20px 12px" }}>
          <Link
            href="/informes"
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "15px 16px",
              border: "1px solid var(--border-red)",
              background: "var(--bg-card)",
              boxShadow: "0 4px 16px rgba(196, 30, 58, 0.05)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(196, 30, 58, 0.08)",
                border: "1px solid rgba(196, 30, 58, 0.2)",
                color: "var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={21} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.25,
                  }}
                >
                  Informe Mensual a Propietarios
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--red)",
                    color: "#FFFFFF",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    lineHeight: 1.4,
                  }}
                >
                  Nuevo
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 3,
                  lineHeight: 1.35,
                }}
              >
                Estadística de Finca Raíz, Metrocuadrado y citas lista para enviar en PDF o WhatsApp
              </div>
            </div>

            <ArrowRight
              size={18}
              color="var(--red)"
              style={{ flexShrink: 0 }}
            />
          </Link>
        </div>

        <div className="quick-actions">
          <Link
            href="/clientes"
            className="qa-btn"
            style={{ textDecoration: "none", minHeight: 112 }}
          >
            <div
              className="qa-icon"
              style={{
                background: "rgba(196, 30, 58, 0.07)",
                border: "1px solid rgba(196, 30, 58, 0.18)",
                color: "var(--red)",
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <div className="qa-label">Clientes CRM</div>
              <div className="qa-sub">Leads y seguimiento Domus</div>
            </div>
          </Link>

          <Link
            href="/whatsapp"
            className="qa-btn"
            style={{ textDecoration: "none", minHeight: 112 }}
          >
            <div
              className="qa-icon"
              style={{
                background: "#F9FAFB",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Send size={20} />
            </div>
            <div>
              <div className="qa-label">Enviar Ficha</div>
              <div className="qa-sub">Mensaje listo para WhatsApp</div>
            </div>
          </Link>

          <Link
            href="/redes"
            className="qa-btn"
            style={{ textDecoration: "none", minHeight: 112 }}
          >
            <div
              className="qa-icon"
              style={{
                background: "#F9FAFB",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Share2 size={20} />
            </div>
            <div>
              <div className="qa-label">Publicar Post</div>
              <div className="qa-sub">Copy para Instagram y Facebook</div>
            </div>
          </Link>

          <Link
            href="/respuestas"
            className="qa-btn"
            style={{ textDecoration: "none", minHeight: 112 }}
          >
            <div
              className="qa-icon"
              style={{
                background: "#F9FAFB",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <div className="qa-label">Objeciones</div>
              <div className="qa-sub">Respuestas rápidas a clientes</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Mis Inmuebles Recientes */}
      <section aria-label="Mis inmuebles recientes">
        <div className="section-header">
          <h2 className="section-title" style={{ fontSize: 18 }}>
            Mis inmuebles recientes
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => mutate()}
              title="Actualizar inventario"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                minHeight: 36,
                padding: "4px 8px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isLoading ? "spin 1s linear infinite" : "none",
                }}
              />
              <span>Actualizar</span>
            </button>
            <Link
              href="/inmuebles"
              className="section-link"
              style={{ fontSize: 13.5, fontWeight: 600 }}
            >
              Ver todos
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
                  width: 250,
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: 140,
                    background: "var(--bg-card-hover)",
                  }}
                />
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      width: "45%",
                      height: 11,
                      borderRadius: 6,
                      background: "var(--bg-card-hover)",
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      width: "85%",
                      height: 15,
                      borderRadius: 6,
                      background: "var(--bg-card-hover)",
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      width: "60%",
                      height: 12,
                      borderRadius: 6,
                      background: "var(--bg-card-hover)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : inmuebles.length > 0 ? (
          <div className="h-scroll">
            {inmuebles.slice(0, 5).map((inmueble) => (
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
                width: 148,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 10,
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                padding: 16,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowRight size={18} />
              </div>
              <span>Ver todos</span>
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={<Building2 size={44} />}
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
