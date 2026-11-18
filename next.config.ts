import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Off, so the published site doesn't ship its full source and comments.
  productionBrowserSourceMaps: false,
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
