import type { NextConfig } from "next";

const API_ORIGIN = process.env.MOAT_API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // The design system ships as TypeScript source, not a prebuilt bundle.
  transpilePackages: ["@moat/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  // Emits a self-contained server bundle so the runtime image carries neither
  // the build toolchain nor the full node_modules tree.
  output: "standalone",

  async rewrites() {
    // Proxy the API through the web origin so the session cookie is
    // first-party. Without this the cookie is cross-site, which means fighting
    // SameSite=None + Secure in development for no benefit. In production the
    // gateway routes /api to the same place.
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
