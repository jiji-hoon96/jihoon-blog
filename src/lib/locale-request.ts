import { isLocale, LOCALES } from '../i18n/locales.ts'

// 내려간 글의 슬러그와 그 자리를 대신할 글. 통합본이던 260703 을 관측 시리즈로
// 쪼개면서 원글을 내렸다. 시리즈를 4편으로 다시 짜면서 첫 편인 260913 을 가리킨다.
//
// next.config.ts 의 redirects 로는 부족하다. Netlify 에서는 이 미들웨어가 edge 에서
// 먼저 돌아 `/260703` 을 `/ko/260703` 으로 rewrite 해버리고, rewrite 된 경로는
// redirects 를 다시 타지 않아 404 가 된다. 로컬 `next start` 는 redirects 를 먼저
// 평가해서 308 이 나오므로 로컬 실측만으로는 드러나지 않는다. (프로덕션에서 확인)
const RETIRED_POSTS: Record<string, string> = {
  '260703': '260913',
}

const RETIRED_POST_PATTERN = new RegExp(
  `^(/(?:${LOCALES.join('|')}))?/(\\d{6})/?$`,
  'u',
)

// 한국어는 접두사 없는 경로가 정규 경로다. 다른 로케일은 /en/rss.xml 처럼 그대로 쓴다.
const FEED_PATHS = ['/rss.xml', '/llms.txt']

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

  // 피드 경로에는 점이 들어 있어서 아래 정적 파일 규칙에 먼저 걸린다.
  // 그래서 여기서 명시적으로 처리한다. 빠뜨리면 /ko/rss.xml 이 /rss.xml 과
  // 바이트 단위로 같은 응답을 내주는 중복 콘텐츠가 된다. route handler 라
  // canonical 태그를 달 수단도 없다. (프로덕션에서 확인)
  if (FEED_PATHS.includes(pathname)) {
    return { kind: 'rewrite', pathname: `/ko${pathname}` }
  }

  const koFeed = FEED_PATHS.find(feed => pathname === `/ko${feed}`)
  if (koFeed) {
    return internalRewrite ? { kind: 'next' } : { kind: 'redirect', pathname: koFeed }
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
