import Link from 'next/link'
import { allPosts } from 'contentlayer/generated'
import { getAllCategories } from '@/lib/categories'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '모든 글',
  description: '모든 블로그 포스트',
}

export default function AllPostsPage() {
  const categories = getAllCategories()
  const sortedPosts = allPosts.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">모든 글</h1>
        <p className="text-light-gray60 dark:text-dark-gray60">
          {allPosts.length}개의 글
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-8 pb-2">
        {categories.map(cat => (
          <Link
            key={cat}
            href={`/posts/${encodeURIComponent(cat)}`}
            className="px-4 py-2 rounded-lg whitespace-nowrap bg-light-gray10 dark:bg-dark-gray10 hover:bg-light-gray20 dark:hover:bg-dark-gray20 transition-colors"
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {sortedPosts.map(post => (
          <Link
            key={post.slug}
            href={post.slug}
            className="block p-6 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{post.emoji}</span>
              <h3 className="text-xl font-bold">{post.title}</h3>
            </div>
            <p className="text-sm text-light-gray60 dark:text-dark-gray60 mb-2">
              {new Date(post.date).toLocaleDateString('ko-KR')} · {post.readingTime}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {post.categoryArray.map((category: string) => (
                <span
                  key={category}
                  className="px-2 py-1 text-xs rounded bg-light-gray10 dark:bg-dark-gray10"
                >
                  {category}
                </span>
              ))}
            </div>
            <p className="text-light-gray80 dark:text-dark-gray80 line-clamp-2">
              {post.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
