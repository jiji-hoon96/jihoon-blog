/**
 * Wanted Sans 의 굵기 2종만 남긴 CSS 를 만들어 self-host 한다.
 *
 * 업스트림 CSS 는 서브셋 92개 × 굵기 7종 = `@font-face` 644개, 304,630 B 다.
 * 그런데 이 블로그가 쓰는 굵기는 400 과 700 두 종이다(`globals.css` 에 근거가 있다).
 * 나머지 5종은 한 글자도 렌더하지 않는데 render-blocking 경로에서 파싱된다.
 *
 * 그리고 origin 이 하나 줄어든다. 업스트림을 `cdn.jsdelivr.net` 에서 직접 받으면
 * 첫 렌더를 막는 요청이 남의 origin 에 걸린다. CSS 만 자기 origin 에 두면 그 연결이
 * 이미 열려 있다. 폰트 파일 자체는 그대로 jsdelivr 에서 받는다. 업스트림의
 * `src:url("woff2/...")` 이 상대 경로라 절대 URL 로 바꿔야 한다.
 *
 * 버전을 올릴 때 다시 돌린다.
 *   node scripts/build-font-css.mjs
 */
import { writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const VERSION = 'v1.0.3'
const BASE = `https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@${VERSION}/packages/wanted-sans/fonts/webfonts/static/split/`
const SOURCE = `${BASE}WantedSans.min.css`
const OUTPUT = 'public/fonts/wanted-sans.css'

/** 이 블로그가 쓰는 굵기. 위계는 크기로 주고 굵기는 둘로 고정한다. */
const KEPT_WEIGHTS = new Set([400, 700])

const response = await fetch(SOURCE)
if (!response.ok) {
  throw new Error(`업스트림 CSS 를 받지 못했다: ${response.status}`)
}
const upstream = await response.text()

const blocks = upstream.split('@font-face').slice(1)
if (blocks.length === 0) {
  throw new Error('@font-face 를 하나도 찾지 못했다. 업스트림 포맷이 바뀌었다')
}

const kept = []
for (const block of blocks) {
  const weight = Number(/font-weight:(\d+)/.exec(block)?.[1])
  if (!KEPT_WEIGHTS.has(weight)) continue

  const body = block.slice(0, block.lastIndexOf('}') + 1)
  const absolute = body.replace(
    /url\("(?!https?:)([^"]+)"\)/g,
    (_, relative) => `url("${BASE}${relative}")`,
  )

  if (/url\("(?!https:\/\/)/.test(absolute)) {
    throw new Error('상대 경로가 남았다. url 치환이 실패했다')
  }
  kept.push(`@font-face${absolute}`)
}

const expected = KEPT_WEIGHTS.size * (blocks.length / 7)
if (kept.length !== expected) {
  throw new Error(`블록 수가 맞지 않는다: ${kept.length}, 기대 ${expected}`)
}

const header = `/* Wanted Sans ${VERSION}, 굵기 400/700 만. scripts/build-font-css.mjs 가 만든다. 직접 고치지 않는다. */\n`
const output = header + kept.join('')
await writeFile(OUTPUT, output)

const size = (text) => Buffer.byteLength(text)
console.log(`업스트림  ${size(upstream).toLocaleString()} B / gzip ${gzipSync(upstream).length.toLocaleString()} B / @font-face ${blocks.length}`)
console.log(`산출물    ${size(output).toLocaleString()} B / gzip ${gzipSync(output).length.toLocaleString()} B / @font-face ${kept.length}`)
console.log(`→ ${OUTPUT}`)
