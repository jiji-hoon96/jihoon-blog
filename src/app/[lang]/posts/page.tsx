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

  const postsUrl = `${siteMetadata.siteUrl}${toPublicPath(lang, '/posts')}`
  // 카테고리 페이지는 CollectionPage 를 내는데 상위인 전체 목록에는 없었다.
  // 목록 페이지가 어떤 글을 담고 있는지 크롤러가 HTML 파싱에만 의존하게 된다.
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: dictionary.posts.allPosts,
    description: dictionary.siteDescription,
    url: postsUrl,
    inLanguage: lang,
    isPartOf: {
      '@type': 'WebSite',
      name: siteMetadata.title,
      url: siteMetadata.siteUrl,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: sortedPosts.length,
      itemListElement: sortedPosts.slice(0, 20).map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteMetadata.siteUrl}${post.slug}`,
        name: post.title,
      })),
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteMetadata.siteUrl}${toPublicPath(lang, '/')}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: dictionary.posts.allPosts,
        item: postsUrl,
      },
    ],
  }

  return (
    <div className="py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
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

      <PostList posts={sortedPosts} lang={lang} emptyLabel={dictionary.posts.empty} readingTimeLabel={dictionary.post.readingTime} />

    </div>
  )
}
