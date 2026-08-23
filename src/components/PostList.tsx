import Link from 'next/link'
import type { allPosts } from 'contentlayer/generated'
import { toPublicPath, type Locale } from '@/i18n/locales'
import { formatHomepageDate } from '@/lib/homepage-index'
import { interpolate } from '@/i18n/dictionaries'

type Post = (typeof allPosts)[number]

/**
 * 목록 페이지(/posts, /posts/[category])가 공유하는 행과 카테고리 내비게이션.
 * 이전에는 두 페이지가 각각 모바일/데스크톱 마크업을 따로 들고 있어서
 * 같은 목록이 네 벌로 존재했고, 행 모양이 서로 어긋났다.
 */
export function CategoryNav({
  categories,
  activeCategory,
  lang,
  allLabel,
  label,
}: {
  categories: readonly string[]
  activeCategory?: string
  lang: Locale
  allLabel: string
  label: string
}) {
  // getAllCategories 는 단순 정렬이라 'All' 이 'AI' 뒤로 밀린다. 노출 순서만 바로잡는다.
  const ordered = [
    ...categories.filter(cat => cat === 'All'),
    ...categories.filter(cat => cat !== 'All'),
  ]

  return (
    <nav
      aria-label={label}
      className="home-meta flex flex-wrap gap-x-4 gap-y-2 border-b border-mineral pb-5 text-stone"
    >
      {ordered.map(cat => {
        const isActive = activeCategory ? cat === activeCategory : cat === 'All'
        return (
          <Link
            key={cat}
            href={toPublicPath(
              lang,
              cat === 'All' ? '/posts' : `/posts/${encodeURIComponent(cat)}`,
            )}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'text-ink'
                : 'transition-colors hover:text-accent'
            }
          >
            {cat === 'All' ? allLabel : cat}
          </Link>
        )
      })}
    </nav>
  )
}

export function PostList({
  posts,
  lang,
  emptyLabel,
  readingTimeLabel,
}: {
  posts: readonly Post[]
  lang: Locale
  emptyLabel: string
  readingTimeLabel: string
}) {
  if (posts.length === 0) {
    return (
      <p className="home-meta py-16 text-center text-stone">{emptyLabel}</p>
    )
  }

  return (
    <div>
      {posts.map(post => (
        <Link
          key={post.slug}
          href={post.slug}
          className="group block border-b border-mineral py-6 sm:py-7"
        >
          <p className="home-meta text-stone">
            {formatHomepageDate(post.date, lang)} ·{' '}
            {interpolate(readingTimeLabel, { minutes: post.readingMinutes })}
          </p>
          <h2 className="mt-1.5 text-lg font-bold leading-[1.45] tracking-[-0.02em] transition-colors group-hover:text-accent sm:text-xl">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-[15px] leading-[1.7] text-stone">
            {post.description || post.excerpt}
          </p>
        </Link>
      ))}
    </div>
  )
}
