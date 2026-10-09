import { visit } from 'unist-util-visit'
import { Root } from 'hast'
import path from 'path'
import fs from 'fs'
import { imageSize } from 'image-size'

/**
 * Markdown 이미지/비디오 후처리:
 *  - 상대 경로 -> /content/{folder}/{src} 절대 경로 변환
 *  - 이미지에 width/height 주입 (CLS 방지)
 *  - 첫 이미지에 fetchpriority="high" (LCP 부스트), 이후는 loading="lazy"
 *  - 모든 이미지 decoding="async"
 *  - 비디오에 preload="metadata", playsInline 주입 (대역폭 절감 + LCP)
 *  - alt 텍스트 누락 시 빌드 경고 (이미지 SEO + 접근성)
 */
/**
 * SVG 치수는 루트 태그에서 직접 읽는다.
 *
 * `image-size` 는 파일 앞부분에서 `<svg ...>` 태그가 닫히는 것을 보고 SVG 로
 * 판별한다. draw.io 가 내보낸 SVG 는 루트 태그의 `content` 속성에 원본 다이어그램을
 * 통째로 싣기 때문에 태그가 그 범위 안에서 닫히지 않고, `unsupported file type` 으로
 * 던진다. 그러면 width/height 가 빠지고 그 그림 하나가 시프트를 만든다(241201/4.svg).
 */
function svgSize(source: string): { width?: number; height?: number } {
  const root = source.match(/<svg\b[\s\S]*?>/)?.[0] ?? ''
  const attr = (name: string) =>
    root.match(new RegExp(`\\s${name}="([\\d.]+)(?:px)?"`))?.[1]
  const width = Number(attr('width'))
  const height = Number(attr('height'))
  if (width && height) return { width: Math.round(width), height: Math.round(height) }

  const viewBox = root.match(/\sviewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/)
  if (viewBox?.length === 4) {
    return { width: Math.round(Number(viewBox[2])), height: Math.round(Number(viewBox[3])) }
  }
  return {}
}

export function rehypeImagePath() {
  return (tree: Root, file: any) => {
    let folderName = ''

    if (file.history && file.history.length > 0) {
      const filePath = file.history[0]
      const match = filePath.match(/content\/([^\/]+)\//)
      if (match) folderName = match[1]
    }

    if (!folderName && file.path) {
      const match = file.path.match(/content\/([^\/]+)\//)
      if (match) folderName = match[1]
    }

    if (!folderName && file.dirname) {
      folderName = path.basename(file.dirname)
    }

    if (!folderName && file.data?.rawDocumentData?.sourceFileDir) {
      folderName = file.data.rawDocumentData.sourceFileDir
    }

    if (!folderName) {
      console.warn(
        '[rehype-image-path] Could not determine folder name for:',
        file.path || file.history?.[0] || 'unknown',
      )
      return
    }

    let imageIndex = 0

    visit(tree, 'element', (node: any) => {
      if (node.tagName === 'img' && node.properties?.src) {
        const rawSrc = node.properties.src as string

        // alt 텍스트 누락 검증 (이미지 SEO + 접근성)
        // 빌드를 막지 않고 작성자에게 누락 이미지를 알린다.
        const alt = node.properties.alt
        if (alt === undefined || alt === null || String(alt).trim() === '') {
          console.warn(
            `[rehype-image-path] 이미지 alt 텍스트 누락 (${folderName}): ${rawSrc} — 검색엔진/접근성을 위해 ![설명](${rawSrc}) 형식으로 alt를 작성하세요.`,
          )
        }

        // 작성자 쿼리 파싱: ?w=400 으로 개별 이미지 가로폭 캡
        let srcWithoutQuery = rawSrc
        let widthCap: number | null = null
        const queryIdx = rawSrc.indexOf('?')
        if (queryIdx !== -1) {
          srcWithoutQuery = rawSrc.slice(0, queryIdx)
          const params = new URLSearchParams(rawSrc.slice(queryIdx + 1))
          const w = params.get('w') ?? params.get('width')
          if (w && /^\d+$/.test(w)) widthCap = parseInt(w, 10)
        }

        let resolvedSrc = srcWithoutQuery
        if (
          !srcWithoutQuery.startsWith('http') &&
          !srcWithoutQuery.startsWith('https') &&
          !srcWithoutQuery.startsWith('/')
        ) {
          resolvedSrc = `/content/${folderName}/${srcWithoutQuery}`
        }
        node.properties.src = resolvedSrc

        // `min()` 으로 캡을 건다. `max-width:720px` 만 주면 인라인 스타일이
        // `.prose img` 의 `max-w-full` 을 이겨서, 본문 폭이 358px 인 휴대폰에서도
        // 그림이 720px 로 그려지고 레이아웃 뷰포트가 그만큼 늘어난다.
        if (widthCap !== null) {
          const existing = (node.properties.style as string | undefined) ?? ''
          node.properties.style = `${existing}${existing && !existing.endsWith(';') ? ';' : ''}max-width:min(${widthCap}px, 100%);height:auto;`
        }

        // width/height 자동 주입 (CLS 방지)
        if (!node.properties.width || !node.properties.height) {
          try {
            const localPath = resolvedSrc.startsWith('/')
              ? path.join(process.cwd(), 'public', resolvedSrc)
              : null
            if (localPath && fs.existsSync(localPath)) {
              const buffer = fs.readFileSync(localPath)
              const dimensions = localPath.endsWith('.svg')
                ? svgSize(buffer.toString('utf8'))
                : imageSize(buffer)
              if (dimensions.width && dimensions.height) {
                node.properties.width = dimensions.width
                node.properties.height = dimensions.height
              }
            }
          } catch {
            // dimensions 를 못 읽으면 width/height 가 빠지고 CLS 가 나빠진다.
            // 그래도 빌드는 막지 않는다. 대신 로그로는 남긴다.
            console.warn(`[rehype-image-path] 치수를 읽지 못했다: ${resolvedSrc}`)
          }
        }

        // 첫 이미지는 LCP 후보 -> eager + high priority
        // 이후는 lazy + low priority
        if (imageIndex === 0) {
          node.properties.loading = 'eager'
          node.properties.fetchpriority = 'high'
        } else {
          node.properties.loading = 'lazy'
          node.properties.fetchpriority = 'low'
        }
        node.properties.decoding = 'async'

        imageIndex += 1
        return
      }

      if (node.tagName === 'video') {
        // 자동재생 미설정 비디오는 metadata만 미리 받기
        if (!node.properties.preload) {
          node.properties.preload = 'metadata'
        }
        if (node.properties.playsInline === undefined) {
          node.properties.playsInline = true
        }
      }

      if (node.tagName === 'source' && node.properties?.src) {
        const src = node.properties.src as string
        if (
          !src.startsWith('http') &&
          !src.startsWith('https') &&
          !src.startsWith('/')
        ) {
          node.properties.src = `/content/${folderName}/${src}`
        }
      }
    })
  }
}
