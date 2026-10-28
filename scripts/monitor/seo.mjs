/**
 * 프로덕션을 직접 크롤해 Ahrefs Site Audit 이 경고하는 항목을 다시 잰다.
 *
 * Ahrefs 는 조직 정책으로 브라우저 접근이 막혀 있고, API 는 유료 단위가 든다.
 * 그래서 경고 메일이 오는 항목 중 이 리포에서 고칠 수 있는 것을 여기서 같은 기준으로 본다.
 * 2026-10-27 크롤의 "Meta description too short" 79개를 이 크롤러가 그대로 재현했다.
 */

// Ahrefs 의 "Meta description too short" 기준. scripts/validate-metadata-length.mjs 와 같다.
export const DESCRIPTION_MIN_LENGTH = 110
// localized-metadata.ts 가 155 에서 자르므로 이보다 길면 렌더가 이미 잘못된 것이다.
export const DESCRIPTION_MAX_LENGTH = 160

/**
 * 일부러 noindex 로 둔 경로. 여기 걸리는 noindex 는 문제로 보지 않는다.
 * 글 하나짜리 카테고리는 src/lib/category-indexing.ts 가 정하고 사이트맵도 같은 판단을 쓴다.
 * 그래서 카테고리 경로는 "사이트맵에 없으면 의도한 noindex" 로 본다.
 */
const EXPECTED_NOINDEX = [
  { pattern: /^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?posts\/[^/]+$/u, reason: '글 하나짜리 카테고리' },
  { pattern: /^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?playground$/u, reason: '놀이터 페이지' },
]

const decodeEntities = text =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const metaContent = (html, name) =>
  decodeEntities(html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`, 'u'))?.[1] ?? '')

export function inspectPage(html) {
  return {
    robots: metaContent(html, 'robots'),
    description: metaContent(html, 'description'),
    title: decodeEntities(html.match(/<title>([^<]*)<\/title>/u)?.[1] ?? ''),
    canonical: html.match(/<link rel="canonical" href="([^"]*)"/u)?.[1] ?? '',
    h1Count: (html.match(/<h1[\s>]/gu) ?? []).length,
    links: [...html.matchAll(/href="(\/[^"#?]*)"/gu)].map(match => match[1]),
  }
}

const isAsset = pathname =>
  /^\/(_next|fonts|content|api)\//u.test(pathname) ||
  /\.(xml|txt|png|jpe?g|svg|ico|css|js|json|webmanifest|pdf|woff2?)$/u.test(pathname)

export async function crawlSite(origin, { concurrency = 8, fetchImpl = fetch } = {}) {
  const queue = [`${origin}/`]
  const seen = new Set()
  const pages = []

  async function worker() {
    while (queue.length) {
      const url = queue.shift()
      if (seen.has(url)) continue
      seen.add(url)

      let response
      try {
        response = await fetchImpl(url, { redirect: 'manual' })
      } catch (error) {
        pages.push({ url, status: 0, error: String(error) })
        continue
      }

      const page = { url, status: response.status, location: response.headers.get('location') }
      if (response.status === 200 && (response.headers.get('content-type') ?? '').includes('html')) {
        Object.assign(page, inspectPage(await response.text()))
        for (const link of page.links) {
          if (isAsset(link)) continue
          const next = `${origin}${link}`
          if (!seen.has(next)) queue.push(next)
        }
        delete page.links
      }
      pages.push(page)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return pages
}

export async function fetchSitemapUrls(origin, fetchImpl = fetch) {
  const xml = await (await fetchImpl(`${origin}/sitemap.xml`)).text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(match => match[1])
}

/** 같은 문제가 매주 같은 키를 갖도록 code 와 URL 로 만든다. */
const problem = (severity, code, url, detail) => ({ severity, code, url, detail, key: `seo:${code}:${url}` })

export function findSeoProblems({ pages, sitemapUrls, origin }) {
  const problems = []
  const inSitemap = new Set(sitemapUrls.map(url => url.replace(/\/$/u, '')))
  const normalize = url => url.replace(/\/$/u, '')

  for (const page of pages) {
    const pathname = new URL(page.url).pathname
    const listed = inSitemap.has(normalize(page.url))

    if (page.status !== 200 && !(page.status >= 300 && page.status < 400)) {
      problems.push(problem('error', 'broken-link', page.url, `내부 링크가 ${page.status} 를 받는다`))
      continue
    }
    if (page.status >= 300 && page.status < 400) {
      problems.push(problem('warning', 'internal-redirect', page.url, `내부 링크가 ${page.status} 로 ${page.location ?? '?'} 에 간다`))
      continue
    }
    if (page.robots === undefined) continue

    const noindex = /noindex/u.test(page.robots)
    if (noindex) {
      if (listed) {
        problems.push(problem('error', 'noindex-in-sitemap', page.url, '사이트맵에 있는데 noindex 다'))
      } else if (!EXPECTED_NOINDEX.some(rule => rule.pattern.test(pathname))) {
        problems.push(problem('warning', 'unexpected-noindex', page.url, `robots: ${page.robots}`))
      }
      continue
    }

    const length = [...page.description].length
    if (!page.description) {
      problems.push(problem('error', 'description-missing', page.url, 'description 이 없다'))
    } else if (length < DESCRIPTION_MIN_LENGTH) {
      problems.push(problem('warning', 'description-too-short', page.url, `${length}자`))
    } else if (length > DESCRIPTION_MAX_LENGTH) {
      problems.push(problem('warning', 'description-too-long', page.url, `${length}자`))
    }
    if (!page.title) problems.push(problem('error', 'title-missing', page.url, '<title> 이 비었다'))
    if (page.h1Count !== 1) problems.push(problem('warning', 'h1-count', page.url, `h1 ${page.h1Count}개`))
    if (!page.canonical) {
      problems.push(problem('error', 'canonical-missing', page.url, 'canonical 이 없다'))
    } else if (normalize(page.canonical) !== normalize(page.url)) {
      problems.push(problem('warning', 'canonical-elsewhere', page.url, `canonical: ${page.canonical}`))
    }
    if (!listed) problems.push(problem('warning', 'indexable-not-in-sitemap', page.url, '색인 대상인데 사이트맵에 없다'))
  }

  const crawled = new Set(pages.map(page => normalize(page.url)))
  for (const url of sitemapUrls) {
    if (!url.startsWith(origin)) continue
    if (!crawled.has(normalize(url))) {
      problems.push(problem('warning', 'sitemap-orphan', url, '사이트맵에만 있고 내부 링크로는 닿지 않는다'))
    }
  }

  return problems
}
