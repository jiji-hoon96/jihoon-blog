import { captureServerException } from './sentry-server.ts'

// 환경변수로 덮을 수 있다. 이 모듈의 `captureServerException` 이 리포에 남은 유일한
// 명시적 Sentry 보고 지점이라, 그것을 돌려 볼 수단이 없으면 절차가 죽은 문서가 된다.
// `@font-face` 가 없는 200 응답을 가리키면 아래 실패 경로가 그대로 재현된다.
// CLAUDE.md 의 「로컬 검증 방법」이 이 변수를 쓴다.
const FONT_CSS_URL =
  process.env.OG_FONT_CSS_URL ??
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap'

// satori(@vercel/og)는 woff2(Brotli)를 지원하지 않으므로
// IE11 UA로 요청하여 woff/ttf 포맷을 받아온다.
const LEGACY_UA =
  'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'

type WeightCache = Partial<Record<400 | 700, ArrayBuffer>>
let cache: WeightCache | null = null

async function resolveFontUrls() {
  const css = await fetch(FONT_CSS_URL, {
    headers: { 'User-Agent': LEGACY_UA },
    next: { revalidate: 60 * 60 * 24 * 7 },
  }).then(res => res.text())

  const blocks = css.split('@font-face').slice(1)
  const urls: Record<400 | 700, string | undefined> = { 400: undefined, 700: undefined }
  for (const block of blocks) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/)
    const srcMatch = block.match(/url\((https:[^)]+)\)\s*format\(['"](?:woff|truetype|opentype)['"]\)/)
    if (!weightMatch || !srcMatch) continue
    const weight = Number(weightMatch[1])
    if (weight === 400 || weight === 700) urls[weight] = srcMatch[1]
  }
  return urls
}

export async function loadNotoSansKR() {
  if (cache) return cache
  const urls = await resolveFontUrls()
  const [regular, bold] = await Promise.all([
    urls[400] ? fetch(urls[400]).then(r => r.arrayBuffer()) : Promise.resolve(null),
    urls[700] ? fetch(urls[700]).then(r => r.arrayBuffer()) : Promise.resolve(null),
  ])

  const resolved: WeightCache = {}
  if (regular) resolved[400] = regular
  if (bold) resolved[700] = bold

  // Google 이 CSS 응답 포맷이나 legacy UA 처리를 바꾸면 정규식이 하나도 맞지
  // 않아 폰트가 0개가 된다. 그러면 satori 가 `No fonts are loaded` 로 던지고,
  // 스트림이 이미 시작된 뒤라 응답이 상태 코드도 없이 끊긴다(실측: curl 이 000).
  // 소셜 unfurler 는 카드 이미지를 아예 못 받는다.
  //
  // 모듈 수준 캐시라 한 번 빈 값이 잡히면 그 Lambda 컨테이너가 사는 동안 계속
  // 빈 폰트를 돌려준다. 그래서 여기서 보고하고, 빈 결과는 캐시하지 않아 다음
  // 요청이 다시 시도하게 둔다. 이 경로를 돌려 보는 방법은 CLAUDE.md 의
  // 「로컬 검증 방법」에 있다.
  if (!regular && !bold) {
    captureServerException(
      new Error('OG font resolution returned no usable weights'),
      { routeKind: 'metadata', operation: 'loadNotoSansKR' },
    )
    return resolved
  }

  cache = resolved
  return cache
}
