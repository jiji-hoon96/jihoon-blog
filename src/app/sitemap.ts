import { MetadataRoute } from 'next'
import { allPosts } from 'contentlayer/generated'
import { getAllCategories, getPostsByCategory } from '@/lib/categories'
import { getSortedPublishedPosts } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'
import { getPostsForLocale } from '@/lib/localized-posts'
import { buildTranslationAlternates } from '@/lib/localized-metadata'
import {
  getLanguageAlternates,
  HREF_LANG,
  LOCALES,
  toPublicPath,
} from '@/i18n/locales'

export default function sitemap(): MetadataRoute.Sitemap {
  const publishedPosts = getSortedPublishedPosts(allPosts)

  const latestPostDate =
    publishedPosts.length > 0 ? new Date(publishedPosts[0].date) : new Date()

  const pinnedSet = new Set(siteMetadata.pinnedPosts)

  const posts = publishedPosts.map(post => {
    const isPinned = pinnedSet.has(post.slug)
    const translations = publishedPosts.filter(
      candidate => candidate.translationKey === post.translationKey,
    )
    return {
      url: `${siteMetadata.siteUrl}${post.slug}`,
      lastModified: isPinned ? new Date() : new Date(post.date),
      changeFrequency: (isPinned ? 'weekly' : 'monthly') as
        | 'weekly'
        | 'monthly',
      priority: isPinned ? 0.95 : 0.7,
      alternates: {
        languages: buildTranslationAlternates(
          translations,
          siteMetadata.siteUrl,
        ),
      },
    }
  })

  const categories = LOCALES.flatMap(locale => {
    const localePosts = getPostsForLocale(publishedPosts, locale)

    return getAllCategories(localePosts)
      .filter(category => category !== 'All')
      .map(category => {
        const categoryPosts = getPostsByCategory(category, localePosts)
        const latest = categoryPosts.length > 0
          ? new Date(categoryPosts[0].date)
          : new Date()
        const languages = Object.fromEntries(
          LOCALES.flatMap(candidateLocale => {
            const candidatePosts = getPostsForLocale(
              publishedPosts,
              candidateLocale,
            )
            return getAllCategories(candidatePosts).includes(category)
              ? [[
                  HREF_LANG[candidateLocale],
                  `${siteMetadata.siteUrl}${toPublicPath(candidateLocale, `/posts/${encodeURIComponent(category)}`)}`,
                ]]
              : []
          }),
        )

        if (languages.ko) languages['x-default'] = languages.ko

        return {
          url: `${siteMetadata.siteUrl}${toPublicPath(locale, `/posts/${encodeURIComponent(category)}`)}`,
          lastModified: latest,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
          alternates: { languages },
        }
      })
  })

  const routeDefinitions = [
    { path: '/', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/posts', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/guestbook', changeFrequency: 'weekly' as const, priority: 0.5 },
  ]
  const routes: MetadataRoute.Sitemap = routeDefinitions.flatMap(route =>
    LOCALES.map(locale => ({
      url: `${siteMetadata.siteUrl}${toPublicPath(locale, route.path)}`,
      lastModified: latestPostDate,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: getLanguageAlternates(siteMetadata.siteUrl, route.path),
      },
    })),
  )

  return [...routes, ...categories, ...posts]
}
