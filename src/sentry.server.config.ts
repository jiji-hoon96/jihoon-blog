import * as Sentry from '@sentry/nextjs'
import { getSentryRuntimeOptions } from './lib/sentry-options'

/**
 * Node 런타임(서버) Sentry 초기화. `src/instrumentation.ts` 의 register() 가 불러온다.
 *
 * 이 블로그에서 Sentry 를 도입한 가장 큰 이유가 서버 쪽이다.
 * /api/analytics 가 서비스 계정으로 Google Analytics Data API 를 호출하는데,
 * 키 만료·쿼터 초과·GA 측 5xx 가 나면 Netlify 함수 로그에만 남고 아무 알림이 없었다.
 */

// SENTRY_BUILD_CONTEXT 는 next.config.ts 의 env 로 빌드 때 치환된다. 치환은
// `process.env.X` 꼴의 접근에만 일어나므로 객체째 넘기지 않고 따로 꺼낸다.
Sentry.init(getSentryRuntimeOptions({
  ...process.env,
  SENTRY_BUILD_CONTEXT: process.env.SENTRY_BUILD_CONTEXT,
}))
