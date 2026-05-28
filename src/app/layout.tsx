// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesHelper | Patricia Vásquez - L2L Bienes Raíces",
  description:
    "Asistente de ventas inmobiliarias para Patricia Vásquez, asesora de L2L Bienes Raíces. Comparte fichas de inmuebles por WhatsApp y publica en redes sociales.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SalesHelper",
  },
};

export const viewport: Viewport = {
  themeColor: "#C41E3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body>
        <div className="app-shell">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
