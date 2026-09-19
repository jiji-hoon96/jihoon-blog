import { Feed } from 'feed'
import { allPosts } from 'contentlayer/generated'
import { siteMetadata } from '@/lib/site-metadata'
import { getSortedPublishedPosts } from '@/lib/filter-posts'
import { getPostsForLocale } from '@/lib/localized-posts'
import { isLocale, toPublicPath } from '@/i18n/locales'
import { notFound } from 'next/navigation'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  const homeUrl = `${siteMetadata.siteUrl}${toPublicPath(lang, '/')}`
  const feedUrl = `${siteMetadata.siteUrl}${toPublicPath(lang, '/rss.xml')}`
  const feed = new Feed({
    title: siteMetadata.title,
    description: siteMetadata.description,
    id: homeUrl,
    link: homeUrl,
    language: lang,
    favicon: `${siteMetadata.siteUrl}/icon.svg`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${siteMetadata.author.name}`,
    feedLinks: {
      rss2: feedUrl,
      atom: feedUrl,
    },
    author: {
      name: siteMetadata.author.name,
      email: siteMetadata.author.bio.email,
      link: homeUrl,
    },
  })

  const sortedPosts = getSortedPublishedPosts(getPostsForLocale(allPosts, lang))

  sortedPosts.forEach(post => {
    // Encode Korean characters in URL
    const url = encodeURI(`${siteMetadata.siteUrl}${post.slug}`)

    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.excerpt,
      content: post.body.html,
      author: [
        {
          name: siteMetadata.author.name,
          email: siteMetadata.author.bio.email,
          link: homeUrl,
        },
      ],
      date: new Date(post.date),
      category: post.categoryArray.map((cat: string) => ({ name: cat })),
    })
  })

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // 이 응답은 1.2MB 다. `content: post.body.html` 로 글 전체 본문을 싣기
      // 때문이다. 헤더가 없으면 Next 가 동적으로 취급해 Netlify durable 캐시가
      // bypass 되고, 폴링이 올 때마다 함수 호출과 407KB egress 가 로케일 6개에서
      // 각각 일어난다. 이웃 라우트인 llms.txt 와 같은 값을 쓴다.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
