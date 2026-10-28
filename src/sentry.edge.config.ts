import * as Sentry from '@sentry/nextjs'
import { getSentryRuntimeOptions } from './lib/sentry-options'

/**
 * Edge 런타임 Sentry 초기화.
 *
 * 현재 이 블로그에는 edge 런타임을 쓰는 라우트나 미들웨어가 없지만,
 * withSentryConfig 는 edge 빌드를 조건 없이 배선하므로 파일을 두는 편이 안전하다.
 */

// SENTRY_BUILD_CONTEXT 는 next.config.ts 의 env 로 빌드 때 치환된다. 치환은
// `process.env.X` 꼴의 접근에만 일어나므로 객체째 넘기지 않고 따로 꺼낸다.
Sentry.init(getSentryRuntimeOptions({
  ...process.env,
  SENTRY_BUILD_CONTEXT: process.env.SENTRY_BUILD_CONTEXT,
}))
