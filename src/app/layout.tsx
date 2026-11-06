// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import PushAutoSubscribe from "@/components/PushAutoSubscribe";
import "./globals.css";

// ── Fuente optimizada vía next/font (zero layout shift, sin request externo) ──
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SalesHelper · L2L Bienes Raíces",
  description: "Copiloto comercial inmobiliario para L2L Bienes Raíces.",
  manifest: "/manifest.json",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SalesHelper",
  },
};

export const viewport: Viewport = {
  themeColor: "#C41E3A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
      </head>
      <body>
        <div className="app-shell">
          <DesktopSidebar />
          <div className="app-main">{children}</div>
          <BottomNav />
          <PushAutoSubscribe />
        </div>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              borderRadius: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
