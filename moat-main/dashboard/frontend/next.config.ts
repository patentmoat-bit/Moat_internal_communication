import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker build in Dockerfile, which copies .next/standalone —
  // that directory only exists when this is set. Self-hosting off Vercel (e.g.
  // Render) needs this; Vercel itself ignores it and deploys normally either way.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // NOTE: Content-Security-Policy is intentionally NOT set here. It is generated
          // per-request in src/middleware.ts (which embeds a fresh nonce into script-src).
          // Defining a second, static CSP here previously used 'unsafe-eval' 'unsafe-inline'
          // for script-src, which contradicted the nonce-based policy in middleware.ts and
          // defeated its protection. Keep CSP defined in exactly one place (middleware.ts).
        ],
      },
    ];
  },
};

export default nextConfig;
