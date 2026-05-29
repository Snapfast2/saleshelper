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
  { href: "/whatsapp", icon: MessageCircle, label: "WhatsApp" },
  { href: "/redes", icon: Share2, label: "Redes" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {TABS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href;
        return (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <motion.div 
              className={`nav-item ${isActive ? "active" : ""}`}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <div style={{ position: "relative" }}>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: "absolute",
                      inset: "-8px -10px",
                      borderRadius: "10px",
                      background: "rgba(196,30,58,0.12)",
                      border: "1px solid rgba(196,30,58,0.2)",
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
