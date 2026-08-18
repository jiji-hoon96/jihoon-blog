import { allPosts } from 'contentlayer/generated'
import { getSortedPublishedPosts } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'

/**
 * /llms.txt
 *
 * llms.txt 비공식 표준(llmstxt.org)에 따라, ChatGPT/Perplexity/Claude 같은
 * AI 검색·요약 도구가 사이트의 구조와 핵심 콘텐츠를 파악하기 쉽도록 정보를 제공.
 */
export async function GET() {
  const posts = getSortedPublishedPosts(allPosts)
  const stack = siteMetadata.author.stack.join(', ')

  const header = [
    `# ${siteMetadata.title}`,
    '',
    `> ${siteMetadata.description}`,
    '',
    `프론트엔드 개발자 ${siteMetadata.author.name}(${siteMetadata.author.nickname})의 기술 블로그입니다.`,
    `주요 스택: ${stack}`,
    `사이트 URL: ${siteMetadata.siteUrl}`,
    '',
    '## About',
    '',
    `- [About](${siteMetadata.siteUrl}/about): 저자 소개, 커리어, 활동 이력`,
    `- [RSS Feed](${siteMetadata.siteUrl}/rss.xml): 전체 글 RSS`,
    `- [Sitemap](${siteMetadata.siteUrl}/sitemap.xml): 사이트 전체 URL`,
    '',
    '## Posts',
    '',
  ].join('\n')

  const postLines = posts
    .map(post => {
      const url = `${siteMetadata.siteUrl}${post.slug}`
      const summary = (post.description || post.excerpt || '').replace(
        /\s+/g,
        ' ',
      )
      const title = post.seoTitle || post.title
      return `- [${title}](${url}): ${summary}`
    })
    .join('\n')

  const body = `${header}${postLines}\n`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
