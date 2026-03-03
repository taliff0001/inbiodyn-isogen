import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large image responses from API routes
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
