import { CategoryNav, PostList } from '@/components/PostList'
import { allPosts } from 'contentlayer/generated'
import { getAllCategories } from '@/lib/categories'
import { getSortedPublishedPosts } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'
import type { Metadata } from 'next'
import { getPostsForLocale } from '@/lib/localized-posts'
import { isLocale, toPublicPath } from '@/i18n/locales'
import { notFound } from 'next/navigation'
import { getDictionary, interpolate } from '@/i18n/dictionaries'
import { getLanguageAlternates } from '@/i18n/locales'
import {
  getLocalizedOpenGraphImageUrl,
  getOpenGraphLocale,
} from '@/lib/localized-metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}

  const dictionary = getDictionary(lang)
  const title = dictionary.navigation.posts
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, '/posts')}`

  return {
    title,
    description: dictionary.siteDescription,
    alternates: {
      canonical: url,
      languages: getLanguageAlternates(siteMetadata.siteUrl, '/posts'),
    },
    openGraph: {
      title: `${title} | ${siteMetadata.title}`,
      description: dictionary.siteDescription,
      url,
      images: [getLocalizedOpenGraphImageUrl(siteMetadata.siteUrl, lang)],
      type: 'website',
      locale: getOpenGraphLocale(lang),
      siteName: siteMetadata.title,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: dictionary.siteDescription,
    },
  }
}

export default async function AllPostsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!isLocale(lang)) notFound()

  const localePosts = getPostsForLocale(allPosts, lang)
  const dictionary = getDictionary(lang)
  const categories = getAllCategories(localePosts)
  const sortedPosts = getSortedPublishedPosts(localePosts)

  return (
    <div className="py-10 sm:py-16">
      <header className="pb-6">
        <h1 className="text-[2rem] sm:text-[2.5rem] font-bold leading-[1.18] tracking-[-0.03em]">
          {dictionary.posts.allPosts}
        </h1>
        <p className="home-meta mt-2 text-stone">
          {interpolate(dictionary.posts.count, { count: sortedPosts.length })}
        </p>
      </header>

      <CategoryNav
        categories={categories}
        lang={lang}
        allLabel={dictionary.posts.allPosts}
        label={dictionary.category.label}
      />

      <PostList posts={sortedPosts} lang={lang} emptyLabel={dictionary.posts.empty} />

    </div>
  )
}
