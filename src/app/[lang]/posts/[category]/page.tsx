import { notFound } from 'next/navigation'
import { CategoryNav, PostList } from '@/components/PostList'
import { getAllCategories, getPostsByCategory } from '@/lib/categories'
import { siteMetadata } from '@/lib/site-metadata'
import type { Metadata } from 'next'
import { allPosts } from 'contentlayer/generated'
import { getPostsForLocale } from '@/lib/localized-posts'
import {
  HREF_LANG,
  isLocale,
  LOCALES,
  toPublicPath,
} from '@/i18n/locales'
import {
  getLocalizedOpenGraphImageUrl,
  getOpenGraphLocale,
} from '@/lib/localized-metadata'
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
  const languages = Object.fromEntries(
    LOCALES.flatMap(candidateLocale => {
      const candidatePosts = getPostsForLocale(allPosts, candidateLocale)
      return getAllCategories(candidatePosts).includes(decodedCategory)
        ? [[
            HREF_LANG[candidateLocale],
            `${siteMetadata.siteUrl}${toPublicPath(candidateLocale, `/posts/${encodeURIComponent(decodedCategory)}`)}`,
          ]]
        : []
    }),
  )

  if (languages.ko) languages['x-default'] = languages.ko

  return {
    title,
    description,
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

      <PostList posts={posts} lang={lang} emptyLabel={dictionary.category.empty} />

    </div>
  )
}
