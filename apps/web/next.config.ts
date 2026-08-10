import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@platform/ui", "@platform/contracts", "@platform/auth"],
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_API_URL || "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
