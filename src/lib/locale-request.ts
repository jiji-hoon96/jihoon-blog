import { isLocale } from '../i18n/locales.ts'

export type LocaleRequestDecision =
  | { kind: 'next' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'redirect'; pathname: string }

export function classifyLocaleRequest(pathname: string): LocaleRequestDecision {
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
