import { captureServerException } from './sentry-server.ts'

const FONT_CSS_URL =
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
  // 않아 폰트 0개로 ImageResponse 가 렌더된다. 응답은 200 PNG 라 한글만 사라지고
  // Sentry 에도 안 잡힌다. 게다가 모듈 수준 캐시라 한 번 빈 값이 잡히면 그
  // Lambda 컨테이너가 사는 동안 계속 빈 폰트를 돌려준다. 그래서 보고하고,
  // 빈 결과는 캐시하지 않아 다음 요청이 다시 시도하게 둔다.
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
