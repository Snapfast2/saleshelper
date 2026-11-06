'use client';
// src/components/BottomNav.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Users, Building2, History, Share2 } from "lucide-react";
import { getRecordatoriosPendientes } from "@/lib/recordatorios";

const TABS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/clientes", icon: Users, label: "Clientes" },
  { href: "/inmuebles", icon: Building2, label: "Catálogo" },
  { href: "/bitacora", icon: History, label: "Historial" },
  { href: "/redes", icon: Share2, label: "Publicar" },
] as const;

export default function BottomNav() {
  const pathname = usePathname() || "";
  const [pendientesCount, setPendientesCount] = useState(0);

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

  return (
    <nav className="bottom-nav" aria-label="Navegación móvil">
      {TABS.map(({ href, icon: Icon, label }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const showBadge = href === "/" && pendientesCount > 0;

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            style={{ textDecoration: "none", flex: 1, minHeight: 48, display: "flex" }}
          >
            <motion.div
              className={`nav-item ${isActive ? "active" : ""}`}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 30,
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "10px",
                      background: "rgba(184, 15, 18, 0.1)",
                    }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon size={21} style={{ position: "relative", zIndex: 1 }} />
                {showBadge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: 1,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 999,
                      background: "#B80F12",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: 700,
                      lineHeight: "16px",
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                      boxShadow: "0 0 0 2px #FFFFFF",
                      zIndex: 2,
                    }}
                  >
                    {pendientesCount > 99 ? "99+" : pendientesCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}
