type SentryEnvironment = {
  SENTRY_DSN?: string
  NEXT_PUBLIC_SENTRY_DSN?: string
  NODE_ENV?: string
  SENTRY_RELEASE?: string
  SENTRY_ENVIRONMENT?: string
  /** Netlify 가 넣어 주는 빌드 컨텍스트: production, deploy-preview, branch-deploy */
  CONTEXT?: string
  /** next.config.ts 가 빌드 시점의 CONTEXT 를 박아 넣은 값. Netlify 밖의 빌드는 local */
  SENTRY_BUILD_CONTEXT?: string
}

export function getSentryRuntimeOptions(env: SentryEnvironment) {
  const dsn = env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN

  // Deploy Preview 빌드도 NODE_ENV 가 production 이라 게이트를 통과한다.
  // 환경 이름을 붙이지 않으면 프리뷰 트래픽이 프로덕션 이슈에 섞여서
  // 알림을 걸거나 이슈를 분류할 때 걸러낼 방법이 없다.
  //
  // Netlify 함수에서는 CONTEXT 가 보인다(2026-10-28 에 deploy-preview 이벤트로 확인).
  // 로컬 `next start` 에는 둘 다 없어서 SDK 기본값인 production 으로 들어갔다
  // (JIHOON-BLOG-B, -E). 그래서 빌드 시점 값을 마지막 폴백으로 둔다. 로컬 빌드는 local 이다.
  const environment =
    env.SENTRY_ENVIRONMENT ?? env.CONTEXT ?? env.SENTRY_BUILD_CONTEXT

  return {
    dsn,
    enabled: Boolean(dsn) && env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
    ...(environment ? { environment } : {}),
  }
}
