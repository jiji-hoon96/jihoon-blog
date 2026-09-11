import { notFound } from 'next/navigation'
import { CategoryNav, PostList } from '@/components/PostList'
import { getAllCategories, getPostsByCategory } from '@/lib/categories'
import { ALL_CATEGORY, findCategoryTranslations } from '@/lib/category-alternates'
import { isIndexableCategory } from '@/lib/category-indexing'
import { filterPublishedPosts } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'
import type { Metadata } from 'next'
import { allPosts } from 'contentlayer/generated'
import { getPostsForLocale } from '@/lib/localized-posts'
import {
  HREF_LANG,
  isLocale,
  LOCALES,
  toPublicPath,
  type Locale,
} from '@/i18n/locales'
import {
  getLocalizedOpenGraphImageUrl,
  getOpenGraphLocale,
} from '@/lib/localized-metadata'
import { getDictionary, interpolate } from '@/i18n/dictionaries'

type Props = {
  params: Promise<{ lang: string; category: string }>
}

// 카테고리는 글에서 파생되므로 generateStaticParams 가 전부 만든다.
// 열어 두면 /posts/All 이나 임의 문자열이 온디맨드로 렌더된다.
export const dynamicParams = false

export async function generateStaticParams({
  params,
}: {
  params: { lang: string }
}) {
  if (!isLocale(params.lang)) return []

  // encodeURIComponent 를 직접 걸면 Next 가 한 번 더 인코딩해서 이중 인코딩된
  // 경로가 prerender 된다. 한글/일본어/중국어 카테고리 65개가 404 shell 로
  // 빌드되고 첫 요청마다 콜드 렌더로 떨어졌다. 인코딩은 Next 에 맡긴다.
  // 'All' 은 /posts 와 같은 목록이고 아무 데서도 링크하지 않으므로 만들지 않는다.
  const categories = getAllCategories(getPostsForLocale(allPosts, params.lang))
  return categories
    .filter(category => category !== ALL_CATEGORY)
    .map(category => ({ category }))
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
  const categoryTranslations = findCategoryTranslations(
    filterPublishedPosts(allPosts),
    lang,
    decodedCategory,
  )
  const categoryUrlFor = (candidateLocale: Locale, candidateCategory: string) =>
    `${siteMetadata.siteUrl}${toPublicPath(candidateLocale, `/posts/${encodeURIComponent(candidateCategory)}`)}`
  const languages = Object.fromEntries(
    LOCALES.flatMap(candidateLocale => {
      const candidateCategory = categoryTranslations[candidateLocale]
      return candidateCategory
        ? [[HREF_LANG[candidateLocale], categoryUrlFor(candidateLocale, candidateCategory)]]
        : []
    }),
  )

  if (categoryTranslations.ko) {
    languages['x-default'] = categoryUrlFor('ko', categoryTranslations.ko)
  }

  return {
    title,
    description,
    // 글 하나짜리 카테고리는 그 글과 겹치므로 색인에서 뺀다. 내부 링크는 계속 따라간다.
    ...(isIndexableCategory(posts.length)
      ? {}
      : { robots: { index: false, follow: true } }),
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title: `${title} | ${siteMetadata.title}`,
      description,
      url,
      images: [getLocalizedOpenGraphImageUrl(siteMetadata.siteUrl, lang)],
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
          {decodedCategory}
        </h1>
        <p className="home-meta mt-2 text-stone">
          {interpolate(dictionary.posts.count, { count: posts.length })}
        </p>
      </header>

      <CategoryNav
        categories={categories}
        activeCategory={decodedCategory}
        lang={lang}
        allLabel={dictionary.posts.allPosts}
        label={dictionary.category.label}
      />

      <PostList posts={posts} lang={lang} emptyLabel={dictionary.category.empty} readingTimeLabel={dictionary.post.readingTime} />

    </div>
  )
}
