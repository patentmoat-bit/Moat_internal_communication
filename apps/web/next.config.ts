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
  // The app writes users, notifications and uploads under ./data at runtime. Tracing sees those
  // paths and would otherwise copy whatever is in the folder into the build output.
  outputFileTracingExcludes: { "*": ["./data/**"] },

  async rewrites() {
    // Proxy the API through the web origin so the session cookie is
    // first-party. Using fallback ensures local App Router API endpoints
    // (such as /api/ip-news/[id]) are served locally first before proxying.
    return {
      fallback: [
        { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      ],
    };
  },
};

export default nextConfig;
