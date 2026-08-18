type SentryEnvironment = {
  SENTRY_DSN?: string
  NEXT_PUBLIC_SENTRY_DSN?: string
  NODE_ENV?: string
  SENTRY_RELEASE?: string
  SENTRY_ENVIRONMENT?: string
}

export function getSentryRuntimeOptions(env: SentryEnvironment) {
  const dsn = env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN

  return {
    dsn,
    enabled: Boolean(dsn) && env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
    ...(env.SENTRY_ENVIRONMENT
      ? { environment: env.SENTRY_ENVIRONMENT }
      : {}),
  }
}
