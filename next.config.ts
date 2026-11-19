import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/*
 * The page only ever loads its own files: scripts, styles, the bundled
 * font and the images in public/. Next.js and the theme script run inline,
 * so scripts and styles need 'unsafe-inline' (no nonces: the site is fully
 * static). Dev mode also needs 'unsafe-eval' for fast refresh.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Off, so the published site doesn't ship its full source and comments.
  productionBrowserSourceMaps: false,
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  // This folder is the project root, not a lockfile found further up.
  turbopack: { root: process.cwd() },
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
