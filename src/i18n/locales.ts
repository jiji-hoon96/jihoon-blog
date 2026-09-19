export const LOCALES = ['ko', 'en', 'ja', 'es', 'pt-BR', 'zh-CN'] as const

export type Locale = (typeof LOCALES)[number]

export const HREF_LANG = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  es: 'es',
  'pt-BR': 'pt-BR',
  'zh-CN': 'zh-Hans',
} satisfies Record<Locale, string>

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale)
}

export function toPublicPath(locale: Locale, pathname: string): string {
  const normalizedPath = pathname === '/' ? '' : `/${pathname.replace(/^\/+|\/+$/g, '')}`

  if (locale === 'ko') {
    return normalizedPath || '/'
  }

  return `/${locale}${normalizedPath}`
}

export function getLanguageAlternates(
  siteUrl: string,
  pathname: string,
): Record<string, string> {
  const baseUrl = siteUrl.replace(/\/+$/, '')
  const alternates = Object.fromEntries(
    LOCALES.map(locale => [
      HREF_LANG[locale],
      `${baseUrl}${toPublicPath(locale, pathname)}`,
    ]),
  )

  return {
    ...alternates,
    'x-default': `${baseUrl}${toPublicPath('ko', pathname)}`,
  }
}

export function getLocaleSwitchPath(
  targetLocale: Locale,
  currentPathname: string,
): string {
  const firstSegment = currentPathname.split('/')[1]
  const currentLocale = isLocale(firstSegment) ? firstSegment : 'ko'
  const contentPath = isLocale(firstSegment)
    ? currentPathname.slice(firstSegment.length + 1) || '/'
    : currentPathname

  if (targetLocale === currentLocale) {
    return toPublicPath(targetLocale, contentPath)
  }

  // 모든 로케일에 같은 경로로 존재하는 페이지들. 여기 없는 경로는 글 목록으로 보낸다.
  // `/resume` 은 6개 로케일 전부에 있으므로 넣는다. 빼두면 JS 가 꺼진 브라우저에서
  // 이력서를 보다가 언어를 바꾼 사람이 글 목록으로 떨어진다.
  const sharedPaths = new Set(['/', '/posts', '/guestbook', '/playground', '/resume'])
  if (!sharedPaths.has(contentPath)) {
    return toPublicPath(targetLocale, '/posts')
  }

  return toPublicPath(targetLocale, contentPath)
}
