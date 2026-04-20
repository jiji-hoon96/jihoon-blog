import { MetadataRoute } from 'next'
import { allPosts } from 'contentlayer/generated'
import { getAllCategories, getPostsByCategory } from '@/lib/categories'
import { getSortedPublishedPosts } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'

export default function sitemap(): MetadataRoute.Sitemap {
  const publishedPosts = getSortedPublishedPosts(allPosts)

  const latestPostDate =
    publishedPosts.length > 0 ? new Date(publishedPosts[0].date) : new Date()

  const posts = publishedPosts.map(post => ({
    url: `${siteMetadata.siteUrl}${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'yearly' as const,
    priority: 0.7,
  }))

  const categories = getAllCategories()
    .filter(category => category !== 'All')
    .map(category => {
    const categoryPosts = getPostsByCategory(category)
    const latest = categoryPosts.length > 0 ? new Date(categoryPosts[0].date) : new Date()
    return {
      url: `${siteMetadata.siteUrl}/posts/${encodeURIComponent(category)}`,
      lastModified: latest,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }
  })

  const routes: MetadataRoute.Sitemap = [
    { url: siteMetadata.siteUrl, lastModified: latestPostDate, changeFrequency: 'daily', priority: 1 },
    { url: `${siteMetadata.siteUrl}/posts`, lastModified: latestPostDate, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteMetadata.siteUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteMetadata.siteUrl}/guestbook`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ]

  return [...routes, ...categories, ...posts]
}
