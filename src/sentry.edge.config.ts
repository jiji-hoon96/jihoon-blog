import * as Sentry from '@sentry/nextjs'

/**
 * Edge 런타임 Sentry 초기화.
 *
 * 현재 이 블로그에는 edge 런타임을 쓰는 라우트나 미들웨어가 없지만,
 * withSentryConfig 는 edge 빌드를 조건 없이 배선하므로 파일을 두는 편이 안전하다.
 */

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
})
