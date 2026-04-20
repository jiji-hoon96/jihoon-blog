import { notFound } from 'next/navigation'
import { allPosts } from 'contentlayer/generated'
import { getAdjacentPosts } from '@/lib/post-navigation'
import { siteMetadata } from '@/lib/site-metadata'
import Utterances from '@/components/Utterances'
import TableOfContents from '@/components/TableOfContents'
import ReadingProgress from '@/components/ReadingProgress'
import CodeCopyButton from '@/components/CodeCopyButton'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return allPosts.map(post => ({
    slug: post.slug.replace('/', ''),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = allPosts.find(p => p.slug === `/${slug}`)

  if (!post) {
    return {}
  }

  const url = `${siteMetadata.siteUrl}${post.slug}`

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.categoryArray,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: url,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [siteMetadata.author.name],
      tags: post.categoryArray,
      locale: 'ko_KR',
      siteName: siteMetadata.title,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = allPosts.find(p => p.slug === `/${slug}`)

  if (!post || post.draft) {
    notFound()
  }

  const { prev, next } = getAdjacentPosts(post.slug)

  const postUrl = `${siteMetadata.siteUrl}${post.slug}`
  const ogImageUrl = `${postUrl}/opengraph-image`
  const primaryCategory = post.categoryArray[0]

  const blogPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: [ogImageUrl],
    author: {
      '@type': 'Person',
      name: siteMetadata.author.name,
      url: siteMetadata.siteUrl,
      sameAs: [
        siteMetadata.author.social.github,
        siteMetadata.author.social.linkedIn,
      ],
    },
    datePublished: post.date,
    dateModified: post.date,
    url: postUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    publisher: {
      '@type': 'Person',
      name: siteMetadata.author.name,
      url: siteMetadata.siteUrl,
    },
    inLanguage: 'ko-KR',
    keywords: post.categoryArray.join(', '),
    ...(primaryCategory ? { articleSection: primaryCategory } : {}),
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteMetadata.siteUrl,
      },
      ...(primaryCategory
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: primaryCategory,
              item: `${siteMetadata.siteUrl}/posts/${encodeURIComponent(primaryCategory)}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: post.title,
              item: postUrl,
            },
          ]
        : [
            {
              '@type': 'ListItem',
              position: 2,
              name: post.title,
              item: postUrl,
            },
          ]),
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ReadingProgress />
      <article className="py-8 sm:py-12">
        {/* Post Header */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-light-gray60 dark:text-dark-gray60">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {post.categoryArray.map((category: string) => (
            <a
              key={category}
              href={`/posts/${encodeURIComponent(category)}`}
              className="px-3 py-1 text-sm rounded-full bg-light-gray10 dark:bg-dark-gray10 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors"
            >
              {category}
            </a>
          ))}
        </div>
      </header>

      {/* 본문 + 사이드바 목차 */}
      <div className="relative lg:flex lg:gap-10">
        <div className="min-w-0 flex-1 lg:max-w-[calc(100%-240px-2.5rem)]">
          {/* 모바일 목차 */}
          <div className="lg:hidden">
            <TableOfContents content={post.body.html} />
          </div>
          <div
            className="prose sm:prose-lg dark:prose-invert max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: post.body.html }}
          />
          <CodeCopyButton />

          {/* Post Navigation */}
          <nav className="flex justify-between items-center py-8 border-t border-light-gray20 dark:border-dark-gray20">
            {prev ? (
              <a
                href={prev.slug}
                className="flex-1 group text-left"
              >
                <div className="text-sm text-light-gray60 dark:text-dark-gray60 mb-1">
                  ← 이전 글
                </div>
                <div className="font-medium group-hover:text-light-gray80 dark:group-hover:text-dark-gray80 transition-colors">
                  {prev.title}
                </div>
              </a>
            ) : (
              <div className="flex-1" />
            )}

            {next ? (
              <a
                href={next.slug}
                className="flex-1 group text-right"
              >
                <div className="text-sm text-light-gray60 dark:text-dark-gray60 mb-1">
                  다음 글 →
                </div>
                <div className="font-medium group-hover:text-light-gray80 dark:group-hover:text-dark-gray80 transition-colors">
                  {next.title}
                </div>
              </a>
            ) : (
              <div className="flex-1" />
            )}
          </nav>

          {/* Comments */}
          <div className="mt-12">
            <h3 className="text-xl font-bold mb-4">댓글</h3>
            <Utterances
              repo={siteMetadata.comments.utterances.repo}
              path={post.slug}
            />
          </div>
        </div>

        {/* 데스크탑 사이드바 목차 */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-24">
            <TableOfContents content={post.body.html} variant="sidebar" />
          </div>
        </aside>
      </div>
    </article>
    </>
  )
}
