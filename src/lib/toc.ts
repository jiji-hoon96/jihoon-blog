export interface TocItem {
  id: string
  text: string
  level: number
}

/**
 * 본문 HTML 에서 h2, h3 를 뽑아 목차 항목을 만든다.
 *
 * 원래는 클라이언트에서 `DOMParser` 로 파싱했는데, 그러려면 본문 HTML 전체를
 * 클라이언트 컴포넌트의 prop 으로 넘겨야 했다. 그러면 같은 HTML 이 렌더 결과,
 * RSC flight 의 본문, flight 의 prop 까지 세 벌로 실려 나간다. 260201 기준
 * 페이지 405KB 중 351KB(87%)가 같은 본문이었다.
 *
 * 파싱 결과는 브라우저에서 하던 것과 같다. `rehypeSlug` 가 빌드 때 id 를 이미
 * 박아 두므로 여기서 다시 만들 필요가 없고, id 가 없는 heading 만 예전과 같은
 * 방식으로 보완한다.
 */
export function extractToc(html: string): TocItem[] {
  const items: TocItem[] = []
  const headingPattern = /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi

  for (const match of html.matchAll(headingPattern)) {
    const [, levelText, attributes, inner] = match
    const text = stripTags(inner).replace(/\s+/g, ' ').trim()
    const idMatch = attributes.match(/\sid="([^"]*)"/i)
    const id = idMatch?.[1] || text.toLowerCase().replace(/\s+/g, '-')

    items.push({ id, text, level: Number(levelText) })
  }

  return items
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ''))
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  }

  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    }
    return named[entity.toLowerCase()] ?? whole
  })
}
