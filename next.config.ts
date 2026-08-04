import type { NextConfig } from "next";
import { withContentlayer } from "next-contentlayer";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 720, 1080, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizePackageImports: ["react-icons", "date-fns"],
  },
  // Match Gatsby's trailing slash behavior
  trailingSlash: false,
  // Turbopack config to silence webpack warning
  turbopack: {
    root: process.cwd(),
  },
};

export default withSentryConfig(withContentlayer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },

  silent: true,
  telemetry: false,

  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
});
