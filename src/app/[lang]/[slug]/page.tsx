import { notFound } from 'next/navigation'
import { allPosts } from 'contentlayer/generated'
import { getAdjacentPosts, getRelatedPosts } from '@/lib/post-navigation'
import { isHiddenPost } from '@/lib/filter-posts'
import { siteMetadata } from '@/lib/site-metadata'
import Utterances from '@/components/Utterances'
import TableOfContents from '@/components/TableOfContents'
import ReadingProgress from '@/components/ReadingProgress'
import CodeCopyButton from '@/components/CodeCopyButton'
import InteractiveWidgets from '@/components/InteractiveWidgets'
import type { Metadata } from 'next'
import {
  findTranslation,
  getLocalizedPostParams,
  getPostsForLocale,
} from '@/lib/localized-posts'
import { isLocale, toPublicPath } from '@/i18n/locales'
import { buildLocalizedPostMetadata } from '@/lib/localized-metadata'
import { getDictionary, interpolate } from '@/i18n/dictionaries'
import { getPostModifiedDate } from '@/lib/post-dates'
import { getAuthorEntityId } from '@/lib/author-identity'

type Props = {
  params: Promise<{ lang: string; slug: string }>
}

export async function generateStaticParams() {
  return getLocalizedPostParams(allPosts.filter(post => !isHiddenPost(post)))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  const post = isLocale(lang)
    ? findTranslation(allPosts, slug, lang)
    : undefined

  if (!post) {
    return {}
  }

  // 비공개(draft/ignore) 글은 색인 차단
  if (isHiddenPost(post)) {
    return { robots: { index: false, follow: false } }
  }

  const translations = allPosts.filter(
    candidate =>
      candidate.translationKey === post.translationKey &&
      !isHiddenPost(candidate),
  )

  return buildLocalizedPostMetadata(post, translations, {
    siteUrl: siteMetadata.siteUrl,
    siteName: siteMetadata.title,
    authorName: siteMetadata.author.name,
  })
}

export default async function PostPage({ params }: Props) {
  const { lang, slug } = await params
  if (!isLocale(lang)) notFound()

  const post = findTranslation(allPosts, slug, lang)

  if (!post || isHiddenPost(post)) {
    notFound()
  }

  const localePosts = getPostsForLocale(allPosts, lang)
  const dictionary = getDictionary(lang)
  const { prev, next } = getAdjacentPosts(post.slug, localePosts)
  const relatedPosts = getRelatedPosts(post.slug, 3, localePosts)

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
      '@id': getAuthorEntityId(siteMetadata.siteUrl),
      name: siteMetadata.author.name,
      alternateName: siteMetadata.author.nickname,
      email: siteMetadata.author.bio.email,
      jobTitle: 'Frontend Developer',
      url: `${siteMetadata.siteUrl}${toPublicPath(lang, '/')}`,
      sameAs: [
        siteMetadata.author.social.github,
        siteMetadata.author.social.linkedIn,
      ],
      knowsAbout: siteMetadata.author.stack,
    },
    datePublished: post.date,
    dateModified: getPostModifiedDate(post),
    url: postUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    publisher: {
      '@type': 'Person',
      '@id': getAuthorEntityId(siteMetadata.siteUrl),
      name: siteMetadata.author.name,
      url: `${siteMetadata.siteUrl}${toPublicPath(lang, '/')}`,
      logo: {
        '@type': 'ImageObject',
        url: siteIconUrl,
      },
    },
    inLanguage: lang,
    license: siteMetadata.license,
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
        item: `${siteMetadata.siteUrl}${toPublicPath(lang, '/')}`,
      },
      ...(primaryCategory
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: primaryCategory,
              item: `${siteMetadata.siteUrl}${toPublicPath(lang, `/posts/${encodeURIComponent(primaryCategory)}`)}`,
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
        <header className="mb-10 sm:mb-14 pb-8 border-b border-mineral">
          <h1 className="text-[2rem] sm:text-[2.75rem] font-bold mb-5 leading-[1.18] tracking-[-0.03em] break-keep">
            {post.title}
          </h1>
          <div className="home-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-stone">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(lang, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            {post.updatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={post.updatedAt}>
                  {dictionary.post.updated}{' '}
                  {new Date(post.updatedAt).toLocaleDateString(lang, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{interpolate(dictionary.post.readingTime, { minutes: post.readingMinutes })}</span>
          </div>
          <div className="home-meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-stone">
            {post.categoryArray.map((category: string) => (
              <a
                key={category}
                href={toPublicPath(lang, `/posts/${encodeURIComponent(category)}`)}
                className="transition-colors hover:text-accent"
              >
                {category}
              </a>
            ))}
          </div>
        </header>

        <TableOfContents
          content={post.body.html}
          labels={{
            title: dictionary.post.tableOfContents,
            open: dictionary.post.openTableOfContents,
            close: dictionary.post.closeTableOfContents,
          }}
        />

        <div
          className="prose dark:prose-invert max-w-none mb-16"
          dangerouslySetInnerHTML={{ __html: post.body.html }}
        />
        <CodeCopyButton />
        <InteractiveWidgets />

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-12 pt-10 border-t border-mineral">
          <h2 className="text-xl font-bold tracking-[-0.02em] mb-1">
            {dictionary.post.relatedPosts}
          </h2>
          <div className="flex flex-col">
            {relatedPosts.map(related => (
              <a
                key={related.slug}
                href={related.slug}
                className="group block border-t border-mineral py-5"
              >
                <p className="home-meta text-stone">
                  {new Date(related.date).toLocaleDateString(lang)} ·{' '}
                  {interpolate(dictionary.post.readingTime, { minutes: related.readingMinutes })}
                </p>
                <h3 className="mt-1.5 text-base font-bold leading-snug line-clamp-2 transition-colors group-hover:text-accent">
                  {related.title}
                </h3>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Post Navigation */}
      <nav className="flex justify-between items-start gap-8 py-8 border-t border-mineral">
        {prev ? (
          <a
            href={prev.slug}
            className="flex-1 group text-left"
          >
            <div className="home-meta text-stone mb-1.5">
              ← {dictionary.post.previousPost}
            </div>
            <div className="font-bold leading-snug transition-colors group-hover:text-accent">
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
            <div className="home-meta text-stone mb-1.5">
              {dictionary.post.nextPost} →
            </div>
            <div className="font-bold leading-snug transition-colors group-hover:text-accent">
              {next.title}
            </div>
          </a>
        ) : (
          <div className="flex-1" />
        )}
      </nav>

      {/* Comments */}
      <div className="mt-12">
        <h3 className="text-xl font-bold tracking-[-0.02em] mb-4">{dictionary.post.comments}</h3>
        <Utterances
          repo={siteMetadata.comments.utterances.repo}
          path={post.slug}
        />
      </div>
    </article>
    </>
  )
}
