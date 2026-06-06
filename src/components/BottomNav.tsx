'use client';
// src/components/BottomNav.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Building2, MessageCircle, Share2, Users } from "lucide-react";

const TABS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/inmuebles", icon: Building2, label: "Inmuebles" },
  { href: "/clientes", icon: Users, label: "Clientes" },
  { href: "/bitacora", icon: MessageCircle, label: "Historial" },
  { href: "/redes", icon: Share2, label: "Redes" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // No mostrar en fichas públicas
  if (pathname.startsWith("/ficha")) return null;

  return (
    <nav className="bottom-nav">
      {TABS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href;
        return (
          <Link key={href} href={href} style={{ textDecoration: "none", flex: 1 }}>
            <motion.div
              className={`nav-item ${isActive ? "active" : ""}`}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 32 }}>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "10px",
                      background: "rgba(196,30,58,0.12)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={22} style={{ position: "relative", zIndex: 1 }} />
              </div>
              <span>{label}</span>
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}
