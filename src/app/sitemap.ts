import { MetadataRoute } from 'next'
import { allPosts } from 'contentlayer/generated'
import { getAllCategories } from '@/lib/categories'
import { siteMetadata } from '@/lib/site-metadata'

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = allPosts.map(post => ({
    url: `${siteMetadata.siteUrl}${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const categories = getAllCategories().map(category => ({
    url: `${siteMetadata.siteUrl}/posts/${encodeURIComponent(category)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  const routes = ['', '/posts', '/about'].map(route => ({
    url: `${siteMetadata.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  return [...routes, ...posts, ...categories]
}
