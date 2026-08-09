import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@platform/ui", "@platform/contracts", "@platform/auth"],
  reactStrictMode: true,
};

export default nextConfig;
