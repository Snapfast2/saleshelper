import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  disable: false, // Habilitado en todos los entornos para soportar push notifications
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker", // next-pwa inyecta worker/index.js en el SW generado
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3-us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "pictures.domus.la" },
      { protocol: "https", hostname: "s3.amazonaws.com" },
    ],
  },
  turbopack: {},
  allowedDevOrigins: ['192.168.1.3'],
};

module.exports = withPWA(nextConfig);
