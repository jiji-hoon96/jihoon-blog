import * as Sentry from '@sentry/nextjs'
import type { Locale } from '../i18n/locales.ts'

export type RouteKind =
  | 'analytics'
  | 'search'
  | 'metadata'
  | 'sitemap'
  | 'rss'
  | 'llms'

export type ServerExceptionContext = {
  locale?: Locale
  routeKind: RouteKind
  operation: string
}

type CaptureException = (
  error: unknown,
  hint: { tags: Record<string, string> },
) => string

export function createServerExceptionCapture(captureException: CaptureException) {
  return (
    error: unknown,
    context: ServerExceptionContext,
  ): string => {
    const tags: Record<string, string> = {
      routeKind: context.routeKind,
      operation: context.operation,
    }

    if (context.locale) tags.locale = context.locale

    return captureException(error, { tags })
  }
}

export const captureServerException = createServerExceptionCapture(
  Sentry.captureException,
)
