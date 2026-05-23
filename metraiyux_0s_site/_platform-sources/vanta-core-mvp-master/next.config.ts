import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const isDev = process.env.NODE_ENV === "development";
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3013",
        "127.0.0.1:3013",
        "*.github.dev",
        "*.app.github.dev",
      ],
    },
  },
  turbopack: {
    root: projectRoot,
  },
  typescript: {
    // Only allow build-time TS errors in development.
    // Production builds must be clean — Section 20 "No-Theater" compliance.
    ignoreBuildErrors: isDev,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
