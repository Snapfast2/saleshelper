'use client';
// src/components/DesktopSidebar.tsx

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Building2,
  FileText,
  Send,
  Share2,
  BookOpen,
  Clock,
  BarChart3,
} from "lucide-react";
import { AGENTE_PATRICIA, DOMUS_PROFILE_ID } from "@/lib/agente";
import { getRecordatoriosPendientes } from "@/lib/recordatorios";

const OPERACION_ITEMS = [
  { href: "/", label: "Inicio", icon: Home, showPendingBadge: true },
  { href: "/clientes", label: "Clientes CRM", icon: Users },
  { href: "/inmuebles", label: "Catálogo L2L", icon: Building2 },
  { href: "/informes", label: "Informes Propietarios", icon: FileText },
  { href: "/whatsapp", label: "Ficha WhatsApp", icon: Send },
  { href: "/redes", label: "Publicar en Redes", icon: Share2 },
  { href: "/respuestas", label: "Guiones y Objeciones", icon: BookOpen },
  { href: "/bitacora", label: "Historial de Envíos", icon: Clock },
] as const;

export default function DesktopSidebar() {
  const pathname = usePathname() || "";
  const [pendientesCount, setPendientesCount] = useState(0);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const syncPendientes = () => {
      setPendientesCount(getRecordatoriosPendientes().length);
    };

    syncPendientes();
    window.addEventListener("sh-recordatorios-changed", syncPendientes);
    window.addEventListener("storage", syncPendientes);
    return () => {
      window.removeEventListener("sh-recordatorios-changed", syncPendientes);
      window.removeEventListener("storage", syncPendientes);
    };
  }, [pathname]);

  if (pathname.startsWith("/ficha") || pathname.startsWith("/pin")) return null;

  const isEquipoActive = pathname.startsWith("/equipo");

  return (
    <aside className="desktop-sidebar" aria-label="Navegación de escritorio">
      {/* Top Brand Header */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "4px 8px 16px",
          marginBottom: 14,
          borderBottom: "1px solid var(--border)",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "var(--red)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(196, 30, 58, 0.22)",
          }}
        >
          <svg
            width="20"
            height="20"
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
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            SalesHelper
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginTop: 3,
              padding: "1px 7px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--text-secondary)",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
            }}
          >
            L2L Bienes Raíces
          </div>
        </div>
      </Link>

      {/* Main Navigation Section */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.07em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            padding: "0 10px",
            marginBottom: 6,
          }}
        >
          OPERACIÓN DIARIA
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {OPERACION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const showBadge =
              "showPendingBadge" in item &&
              item.showPendingBadge &&
              pendientesCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  minHeight: 40,
                  padding: "8px 10px",
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--red)" : "var(--text-secondary)",
                  background: isActive ? "rgba(196, 30, 58, 0.08)" : "transparent",
                  border: isActive
                    ? "1px solid rgba(196, 30, 58, 0.18)"
                    : "1px solid transparent",
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <Icon
                    size={17}
                    style={{
                      flexShrink: 0,
                      color: isActive ? "var(--red)" : "var(--text-muted)",
                    }}
                  />
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.label}
                  </span>
                </span>

                {showBadge && (
                  <span
                    style={{
                      minWidth: 20,
                      height: 20,
                      padding: "0 6px",
                      borderRadius: 999,
                      background: "#C41E3A",
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: "20px",
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                    }}
                  >
                    {pendientesCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Executive B2B Section */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.07em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            padding: "0 10px",
            marginBottom: 6,
          }}
        >
          DIRECCIÓN COMERCIAL
        </div>

        <Link
          href="/equipo"
          aria-current={isEquipoActive ? "page" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            minHeight: 40,
            padding: "8px 10px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: isEquipoActive ? 700 : 600,
            color: isEquipoActive ? "var(--red)" : "var(--text-primary)",
            background: isEquipoActive
              ? "rgba(196, 30, 58, 0.08)"
              : "var(--bg-base)",
            border: isEquipoActive
              ? "1px solid rgba(196, 30, 58, 0.22)"
              : "1px solid var(--border)",
            textDecoration: "none",
            transition: "background 0.15s, color 0.15s, border-color 0.15s",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <BarChart3
              size={17}
              style={{
                flexShrink: 0,
                color: isEquipoActive ? "var(--red)" : "var(--text-secondary)",
              }}
            />
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Panel Agencia L2L
            </span>
          </span>

          <span
            style={{
              padding: "2px 6px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: isEquipoActive ? "var(--red)" : "var(--text-secondary)",
              background: isEquipoActive
                ? "rgba(196, 30, 58, 0.12)"
                : "#FFFFFF",
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            B2B
          </span>
        </Link>
      </div>

      {/* Bottom Broker Card */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            padding: "10px",
            borderRadius: 12,
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {!avatarError && AGENTE_PATRICIA.foto ? (
            <Image
              src={AGENTE_PATRICIA.foto}
              alt="Olga Patricia Vásquez"
              width={36}
              height={36}
              onError={() => setAvatarError(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1.5px solid var(--border-red)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(196, 30, 58, 0.1)",
                border: "1.5px solid var(--border-red)",
                color: "var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              PV
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Olga Patricia Vásquez
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontVariantNumeric: "tabular-nums",
                marginTop: 1,
              }}
            >
              Asesora · Perfil #{DOMUS_PROFILE_ID}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#16A34A",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#15803D",
                }}
              >
                Sincronizado
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
