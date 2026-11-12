import type { NextConfig } from "next";

// Every page is per-visitor (session cookie), so Cache Components buys nothing here.
const nextConfig: NextConfig = {
  // The homepage's "Try the demo" link. proxy.ts gives the visitor an anonymous session and a fresh sandbox on /today, where the role picker opens.
  redirects: async () => [{ source: "/app", destination: "/today?welcome=1", permanent: false }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
