import { notFound } from 'next/navigation'
import { allPosts } from 'contentlayer/generated'
import { getAdjacentPosts, getRelatedPosts } from '@/lib/post-navigation'
import { isHiddenPost } from '@/lib/filter-posts'
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
  return allPosts
    .filter(post => !isHiddenPost(post))
    .map(post => ({
      slug: post.slug.replace('/', ''),
    }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = allPosts.find(p => p.slug === `/${slug}`)

  if (!post) {
    return {}
  }

  // 비공개(draft/ignore) 글은 색인 차단
  if (isHiddenPost(post)) {
    return { robots: { index: false, follow: false } }
  }

  const url = `${siteMetadata.siteUrl}${post.slug}`
  const description = post.description || post.excerpt
  const keywords = post.keywords
    ? post.keywords.split(',').map((k: string) => k.trim())
    : post.categoryArray
  const metaTitle = post.seoTitle || post.title

  return {
    title: metaTitle,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: metaTitle,
      description,
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
      title: metaTitle,
      description,
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = allPosts.find(p => p.slug === `/${slug}`)

  if (!post || isHiddenPost(post)) {
    notFound()
  }

  const { prev, next } = getAdjacentPosts(post.slug)
  const relatedPosts = getRelatedPosts(post.slug, 3)

  const postUrl = `${siteMetadata.siteUrl}${post.slug}`
  const ogImageUrl = `${postUrl}/opengraph-image`
  const primaryCategory = post.categoryArray[0]

  const siteIconUrl = `${siteMetadata.siteUrl}/icon.svg`

  const blogPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.seoTitle ? { alternativeHeadline: post.seoTitle } : {}),
    name: post.seoTitle || post.title,
    description: post.description || post.excerpt,
    image: [ogImageUrl],
    author: {
      '@type': 'Person',
      name: siteMetadata.author.name,
      alternateName: siteMetadata.author.nickname,
      email: siteMetadata.author.bio.email,
      jobTitle: 'Frontend Developer',
      url: `${siteMetadata.siteUrl}/about`,
      sameAs: [
        siteMetadata.author.social.github,
        siteMetadata.author.social.linkedIn,
      ],
      knowsAbout: siteMetadata.author.stack,
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
      logo: {
        '@type': 'ImageObject',
        url: siteIconUrl,
      },
    },
    inLanguage: 'ko-KR',
    keywords: post.keywords || post.categoryArray.join(', '),
    ...(typeof post.wordCount === 'number'
      ? { wordCount: post.wordCount }
      : {}),
    ...(primaryCategory ? { articleSection: primaryCategory } : {}),
    isPartOf: {
      '@type': 'Blog',
      '@id': siteMetadata.siteUrl,
      name: siteMetadata.title,
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
      <article className="py-10 sm:py-16">
        {/* Post Header */}
        <header className="mb-10 sm:mb-14 pb-8 border-b border-light-gray20 dark:border-dark-gray20">
          <h1 className="text-2xl sm:text-[2.5rem] font-extrabold mb-5 leading-tight tracking-tight break-keep">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-light-gray60 dark:text-dark-gray60">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span aria-hidden="true">·</span>
            <span>{post.readingTime}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {post.categoryArray.map((category: string) => (
              <a
                key={category}
                href={`/posts/${encodeURIComponent(category)}`}
                className="px-3 py-1 text-xs sm:text-sm rounded-full bg-light-gray10 dark:bg-dark-gray10 text-light-black60 dark:text-dark-black60 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors"
              >
                {category}
              </a>
            ))}
          </div>
        </header>

        <TableOfContents content={post.body.html} />

        <div
          className="prose dark:prose-invert max-w-none mb-16"
          dangerouslySetInnerHTML={{ __html: post.body.html }}
        />
        <CodeCopyButton />

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-light-gray20 dark:border-dark-gray20">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">
            <span className="mr-2">📚</span>
            함께 읽으면 좋은 글
          </h2>
          <div className="flex flex-col gap-4">
            {relatedPosts.map(related => (
              <a
                key={related.slug}
                href={related.slug}
                className="block p-3 sm:p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
              >
                <h3 className="text-base font-bold line-clamp-2 mb-2">
                  {related.title}
                </h3>
                <p className="text-xs text-light-gray60 dark:text-dark-gray60 mb-2">
                  {new Date(related.date).toLocaleDateString('ko-KR')} ·{' '}
                  {related.readingTime}
                </p>
                <p className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-2">
                  {related.excerpt}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

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
    </article>
    </>
  )
}
