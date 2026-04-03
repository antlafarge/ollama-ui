import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
