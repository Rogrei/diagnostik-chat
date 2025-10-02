import type { NextConfig } from "next";

// Minimal Next.js config for M1
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true }
};

export default nextConfig;
