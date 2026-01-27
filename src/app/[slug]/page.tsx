import { notFound } from 'next/navigation'
import { allPosts } from 'contentlayer/generated'
import { getAdjacentPosts } from '@/lib/post-navigation'
import { siteMetadata } from '@/lib/site-metadata'
import Utterances from '@/components/Utterances'
import TableOfContents from '@/components/TableOfContents'
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

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [siteMetadata.author.name],
      tags: post.categoryArray,
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

  return (
    <article className="py-12">
      {/* Post Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
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

      {/* Table of Contents */}
      <TableOfContents content={post.body.html} />

      {/* Post Content */}
      <div
        className="prose prose-lg dark:prose-invert max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: post.body.html }}
      />

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
        <h3 className="text-xl font-bold mb-4">💬 댓글</h3>
        <Utterances
          repo={siteMetadata.comments.utterances.repo}
          path={post.slug}
        />
      </div>
    </article>
  )
}
