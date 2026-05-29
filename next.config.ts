import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the MT5 bot to push from any IP
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-phoenix-secret" },
        ],
      },
    ];
  },
  // Disable static optimization on API routes (all must be dynamic)
  experimental: {
    // Required for in-memory store to persist between requests in dev
  },
};

export default nextConfig;
