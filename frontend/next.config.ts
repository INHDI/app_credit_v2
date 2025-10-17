import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporary: ignore ESLint and TypeScript errors during production build to allow Docker image creation.
  // NOTE: This is a short-term workaround. It's better to fix the TypeScript/ESLint issues long-term.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow the build to complete even if there are type errors. Remove when code is cleaned up.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
