type SentryEnvironment = {
  SENTRY_DSN?: string
  NEXT_PUBLIC_SENTRY_DSN?: string
  NODE_ENV?: string
  SENTRY_RELEASE?: string
  SENTRY_ENVIRONMENT?: string
  /** Netlify 가 넣어 주는 빌드 컨텍스트: production, deploy-preview, branch-deploy */
  CONTEXT?: string
}

export function getSentryRuntimeOptions(env: SentryEnvironment) {
  const dsn = env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN

  // Deploy Preview 빌드도 NODE_ENV 가 production 이라 게이트를 통과한다.
  // 환경 이름을 붙이지 않으면 프리뷰 트래픽이 프로덕션 이슈에 섞여서
  // 알림을 걸거나 이슈를 분류할 때 걸러낼 방법이 없다.
  const environment = env.SENTRY_ENVIRONMENT ?? env.CONTEXT

  return {
    dsn,
    enabled: Boolean(dsn) && env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
    ...(environment ? { environment } : {}),
  }
}
