import { allPosts } from 'contentlayer/generated'
import { getSortedPublishedPosts } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'
import { getPostsForLocale } from '@/lib/localized-posts'
import { isLocale } from '@/i18n/locales'
import { getDictionary } from '@/i18n/dictionaries'
import { buildLlmsText } from '@/lib/llms-text'
import { notFound } from 'next/navigation'

/**
 * /llms.txt
 *
 * llms.txt 비공식 표준(llmstxt.org)에 따라, ChatGPT/Perplexity/Claude 같은
 * AI 검색·요약 도구가 사이트의 구조와 핵심 콘텐츠를 파악하기 쉽도록 정보를 제공.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  const posts = getSortedPublishedPosts(getPostsForLocale(allPosts, lang))
  const dictionary = getDictionary(lang)
  const body = buildLlmsText({
    locale: lang,
    siteUrl: siteMetadata.siteUrl,
    siteTitle: siteMetadata.title,
    siteDescription: dictionary.siteDescription,
    authorName: siteMetadata.author.name,
    authorNickname: siteMetadata.author.nickname,
    stack: siteMetadata.author.stack,
    labels: dictionary.llms,
    posts,
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
