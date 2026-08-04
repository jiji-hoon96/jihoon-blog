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

const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(withContentlayer(nextConfig), {
  // org 는 슬러그 기준이다. Sentry org 슬러그를 바꾸면 이 값도 같이 바꿔야 업로드가 동작한다.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  sourcemaps: {
    // 토큰이 없으면 업로드를 아예 끈다. 토큰 없이 시도하다 빌드가 깨지면 배포가 막힌다.
    disable: !hasSentryAuthToken,

    // 업로드가 끝나면 빌드 산출물에서 .map 을 지운다.
    // Turbopack 이 만드는 서버 소스맵이 57MB 로 서버 JS(15MB) 보다 크고,
    // 그대로 두면 Netlify 함수 번들에 전부 실린다. 업로드 후에는 쓸모가 없다.
    deleteSourcemapsAfterUpload: hasSentryAuthToken,
  },

  // 업로드를 시도할 때만 로그를 남긴다.
  // silent 를 항상 켜두면 토큰 스코프 부족·만료로 업로드가 실패해도 조용히 넘어가,
  // 다음에 읽을 수 없는 스택 트레이스를 볼 때까지 알 수 없다.
  silent: !hasSentryAuthToken,
  telemetry: false,

  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
});
