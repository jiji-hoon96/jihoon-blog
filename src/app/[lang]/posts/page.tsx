import Link from 'next/link'
import { allPosts } from 'contentlayer/generated'
import { getAllCategories } from '@/lib/categories'
import { getSortedPublishedPosts } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'
import type { Metadata } from 'next'
import { getPostsForLocale } from '@/lib/localized-posts'
import { isLocale, toPublicPath } from '@/i18n/locales'
import { notFound } from 'next/navigation'
import { getDictionary } from '@/i18n/dictionaries'
import { getLanguageAlternates } from '@/i18n/locales'
import { getOpenGraphLocale } from '@/lib/localized-metadata'

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
  const categories = getAllCategories(localePosts)
  const sortedPosts = getSortedPublishedPosts(localePosts)

  return (
    <div className="py-8 sm:py-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">모든 글</h1>
        <p className="text-light-gray60 dark:text-dark-gray60">
          {sortedPosts.length}개의 글
        </p>
      </div>

      {/* Mobile: 가로 탭 */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 sm:hidden">
        {categories.map(cat => (
          <Link
            key={cat}
            href={toPublicPath(lang, `/posts/${encodeURIComponent(cat)}`)}
            className="px-3 py-1.5 text-sm rounded-lg whitespace-nowrap bg-light-gray10 dark:bg-dark-gray10 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors"
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Desktop: 사이드바 + 콘텐츠 */}
      <div className="hidden sm:flex gap-8">
        {/* 왼쪽 카테고리 사이드바 */}
        <aside className="w-40 flex-shrink-0">
          <nav className="flex flex-col gap-2 sticky top-8">
            {categories.map(cat => (
              <Link
                key={cat}
                href={toPublicPath(lang, `/posts/${encodeURIComponent(cat)}`)}
                className="px-3 py-2 rounded-lg transition-colors text-sm hover:bg-light-gray10 dark:hover:bg-dark-gray10"
              >
                {cat}
              </Link>
            ))}
          </nav>
        </aside>

        {/* 오른쪽 글 목록 */}
        <div className="flex-1 space-y-4">
          {sortedPosts.map(post => (
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

          {sortedPosts.length === 0 && (
            <div className="text-center py-12 text-light-gray60 dark:text-dark-gray60">
              아직 작성된 글이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Mobile: 글 목록 */}
      <div className="sm:hidden space-y-4">
        {sortedPosts.map(post => (
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

        {sortedPosts.length === 0 && (
          <div className="text-center py-12 text-light-gray60 dark:text-dark-gray60">
            아직 작성된 글이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
