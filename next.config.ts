import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3-us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "pictures.domus.la" },
      { protocol: "https", hostname: "s3.amazonaws.com" },
    ],
  },
  // Disable turbopack warnings for next-pwa webpack config
  turbopack: {},
  allowedDevOrigins: ['192.168.1.3'],
};

module.exports = withPWA(nextConfig);
