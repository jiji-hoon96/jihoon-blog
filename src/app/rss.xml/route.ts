import { Feed } from 'feed'
import { allPosts } from 'contentlayer/generated'
import { siteMetadata } from '@/lib/site-metadata'

export async function GET() {
  const feed = new Feed({
    title: siteMetadata.title,
    description: siteMetadata.description,
    id: siteMetadata.siteUrl,
    link: siteMetadata.siteUrl,
    language: siteMetadata.language,
    favicon: `${siteMetadata.siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${siteMetadata.author.name}`,
    author: {
      name: siteMetadata.author.name,
      email: siteMetadata.author.bio.email,
      link: siteMetadata.siteUrl,
    },
  })

  const sortedPosts = allPosts.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

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
          link: siteMetadata.siteUrl,
        },
      ],
      date: new Date(post.date),
      category: post.categoryArray.map((cat: string) => ({ name: cat })),
    })
  })

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
