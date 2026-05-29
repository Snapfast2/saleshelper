import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3-us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "pictures.domus.la" },
      { protocol: "https", hostname: "s3.amazonaws.com" },
    ],
  },
  allowedDevOrigins: ['192.168.1.3'],
};

export default nextConfig;
