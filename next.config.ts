import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3-us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "pictures.domus.la" },
      { protocol: "https", hostname: "s3.amazonaws.com" },
      { protocol: "https", hostname: "www.l2lbienesraices.com" },
      { protocol: "https", hostname: "l2lbienesraices.com" },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
    optimizePackageImports: ["framer-motion"],
  },
  allowedDevOrigins: ["192.168.1.3"],
};

export default nextConfig;
