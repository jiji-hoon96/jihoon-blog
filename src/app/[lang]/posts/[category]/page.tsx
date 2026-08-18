import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllCategories, getPostsByCategory } from '@/lib/categories'
import { siteMetadata } from '@/lib/site-metadata'
import type { Metadata } from 'next'
import { allPosts } from 'contentlayer/generated'
import { getPostsForLocale } from '@/lib/localized-posts'
import {
  getLanguageAlternates,
  isLocale,
  toPublicPath,
} from '@/i18n/locales'
import { getOpenGraphLocale } from '@/lib/localized-metadata'
import { getDictionary, interpolate } from '@/i18n/dictionaries'

type Props = {
  params: Promise<{ lang: string; category: string }>
}

export async function generateStaticParams({
  params,
}: {
  params: { lang: string }
}) {
  if (!isLocale(params.lang)) return []

  const categories = getAllCategories(getPostsForLocale(allPosts, params.lang))
  return categories.map(category => ({
    category: encodeURIComponent(category),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, category } = await params
  if (!isLocale(lang)) return {}
  const decodedCategory = decodeURIComponent(category)
  const localePosts = getPostsForLocale(allPosts, lang)
  const posts = getPostsByCategory(decodedCategory, localePosts)
  const dictionary = getDictionary(lang)
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, `/posts/${encodeURIComponent(decodedCategory)}`)}`
  const description = interpolate(dictionary.category.description, {
    category: decodedCategory,
    count: posts.length,
  })
  const title = `${decodedCategory} · ${dictionary.category.label}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: getLanguageAlternates(
        siteMetadata.siteUrl,
        `/posts/${encodeURIComponent(decodedCategory)}`,
      ),
    },
    openGraph: {
      title: `${title} | ${siteMetadata.title}`,
      description,
      url,
      type: 'website',
      locale: getOpenGraphLocale(lang),
      siteName: siteMetadata.title,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { lang, category } = await params
  if (!isLocale(lang)) notFound()
  const decodedCategory = decodeURIComponent(category)
  const localePosts = getPostsForLocale(allPosts, lang)
  const categories = getAllCategories(localePosts)
  const posts = getPostsByCategory(decodedCategory, localePosts)
  const dictionary = getDictionary(lang)

  if (!categories.includes(decodedCategory)) {
    notFound()
  }

  const categoryUrl = `${siteMetadata.siteUrl}${toPublicPath(lang, `/posts/${encodeURIComponent(decodedCategory)}`)}`
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${decodedCategory} · ${dictionary.category.label}`,
    description: interpolate(dictionary.category.description, {
      category: decodedCategory,
      count: posts.length,
    }),
    url: categoryUrl,
    inLanguage: lang,
    isPartOf: {
      '@type': 'WebSite',
      name: siteMetadata.title,
      url: siteMetadata.siteUrl,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.slice(0, 20).map((post, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
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
        name: dictionary.category.label,
        item: `${siteMetadata.siteUrl}${toPublicPath(lang, '/posts')}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: decodedCategory,
        item: categoryUrl,
      },
    ],
  }

  return (
    <div className="py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {/* Category Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">{decodedCategory}</h1>
        <p className="text-light-gray60 dark:text-dark-gray60">
          {interpolate(dictionary.posts.count, { count: posts.length })}
        </p>
      </div>

      {/* Mobile: 가로 탭 */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 sm:hidden">
        {categories.map(cat => {
          const isActive = cat === decodedCategory
          return (
            <Link
              key={cat}
              href={toPublicPath(lang, `/posts/${encodeURIComponent(cat)}`)}
              className={`
                px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors
                ${
                  isActive
                    ? 'bg-light-black100 dark:bg-dark-black100 text-light-white100 dark:text-dark-white100'
                    : 'bg-light-gray10 dark:bg-dark-gray10 hover:bg-light-gray20 dark:hover:bg-dark-gray20'
                }
              `}
            >
              {cat}
            </Link>
          )
        })}
      </div>

      {/* Desktop: 사이드바 + 콘텐츠 */}
      <div className="hidden sm:flex gap-8">
        {/* 왼쪽 카테고리 사이드바 */}
        <aside className="w-40 flex-shrink-0">
          <nav className="flex flex-col gap-2 sticky top-8">
            {categories.map(cat => {
              const isActive = cat === decodedCategory
              return (
                <Link
                  key={cat}
                  href={toPublicPath(lang, `/posts/${encodeURIComponent(cat)}`)}
                  className={`
                    px-3 py-2 rounded-lg transition-colors text-sm
                    ${
                      isActive
                        ? 'bg-light-black100 dark:bg-dark-black100 text-light-white100 dark:text-dark-white100'
                        : 'hover:bg-light-gray10 dark:hover:bg-dark-gray10'
                    }
                  `}
                >
                  {cat}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* 오른쪽 글 목록 */}
        <div className="flex-1 space-y-4">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={post.slug}
              className="block p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
            >
              <h3 className="text-lg font-bold mb-2">{post.title}</h3>
              <p className="text-sm text-light-gray60 dark:text-dark-gray60 mb-2">
                {new Date(post.date).toLocaleDateString(lang)} · {post.readingTime}
              </p>
              <p className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-2">
                {post.excerpt}
              </p>
            </Link>
          ))}

          {posts.length === 0 && (
            <div className="text-center py-12 text-light-gray60 dark:text-dark-gray60">
              {dictionary.category.empty}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: 글 목록 */}
      <div className="sm:hidden space-y-4">
        {posts.map(post => (
          <Link
            key={post.slug}
            href={post.slug}
            className="block p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
          >
            <h3 className="text-base font-bold mb-2">{post.title}</h3>
            <p className="text-xs text-light-gray60 dark:text-dark-gray60 mb-2">
              {new Date(post.date).toLocaleDateString(lang)} · {post.readingTime}
            </p>
            <p className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-2">
              {post.excerpt}
            </p>
          </Link>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12 text-light-gray60 dark:text-dark-gray60">
            {dictionary.category.empty}
          </div>
        )}
      </div>
    </div>
  )
}
