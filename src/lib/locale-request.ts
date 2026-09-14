import { isLocale, LOCALES } from '../i18n/locales.ts'

// 내려간 글의 슬러그와 그 자리를 대신할 글. 통합본이던 260703 을 관측 3부작으로
// 쪼개면서 원글을 내렸다.
//
// next.config.ts 의 redirects 로는 부족하다. Netlify 에서는 이 미들웨어가 edge 에서
// 먼저 돌아 `/260703` 을 `/ko/260703` 으로 rewrite 해버리고, rewrite 된 경로는
// redirects 를 다시 타지 않아 404 가 된다. 로컬 `next start` 는 redirects 를 먼저
// 평가해서 308 이 나오므로 로컬 실측만으로는 드러나지 않는다. (프로덕션에서 확인)
const RETIRED_POSTS: Record<string, string> = {
  '260703': '260914',
}

const RETIRED_POST_PATTERN = new RegExp(
  `^(/(?:${LOCALES.join('|')}))?/(\\d{6})/?$`,
  'u',
)

export type LocaleRequestDecision =
  | { kind: 'next' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'redirect'; pathname: string; permanent?: boolean }

type LocaleRequestContext = {
  internalRewrite?: boolean
}

export function classifyLocaleRequest(
  pathname: string,
  { internalRewrite = false }: LocaleRequestContext = {},
): LocaleRequestDecision {
  const retired = RETIRED_POST_PATTERN.exec(pathname)
  const replacement = retired && RETIRED_POSTS[retired[2]]
  if (replacement) {
    // /ko 는 정규 경로가 아니므로 접두사를 떼고 한 번에 보낸다.
    const prefix = retired[1] === '/ko' ? '' : (retired[1] ?? '')
    return {
      kind: 'redirect',
      pathname: `${prefix}/${replacement}`,
      permanent: true,
    }
  }

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
