import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Send visitors of the old Vercel address to the official domain.
  // Preview deployments use other *.vercel.app hostnames and are unaffected.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "santacoindotcom.vercel.app" }],
        destination: "https://santacoindotcom.com/:path*",
        permanent: false,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
