import { isLocale } from '../i18n/locales.ts'

export type LocaleRequestDecision =
  | { kind: 'next' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'redirect'; pathname: string }

type LocaleRequestContext = {
  internalRewrite?: boolean
}

export function classifyLocaleRequest(
  pathname: string,
  { internalRewrite = false }: LocaleRequestContext = {},
): LocaleRequestDecision {
  if (pathname === '/rss.xml' || pathname === '/llms.txt') {
    return { kind: 'rewrite', pathname: `/ko${pathname}` }
  }

  if (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/_next' ||
    pathname.startsWith('/_next/') ||
    /\/[^/]+\.[^/]+$/.test(pathname)
  ) {
    return { kind: 'next' }
  }

  const firstSegment = pathname.split('/')[1]

  if (firstSegment === 'ko' && internalRewrite) {
    return { kind: 'next' }
  }

  if (firstSegment === 'ko') {
    const canonicalPath = pathname.slice('/ko'.length)
    return { kind: 'redirect', pathname: canonicalPath || '/' }
  }

  if (isLocale(firstSegment)) {
    return { kind: 'next' }
  }

  return {
    kind: 'rewrite',
    pathname: pathname === '/' ? '/ko' : `/ko${pathname}`,
  }
}
