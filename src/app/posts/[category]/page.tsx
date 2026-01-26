import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllCategories, getPostsByCategory } from '@/lib/categories'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ category: string }>
}

export async function generateStaticParams() {
  const categories = getAllCategories()
  return categories.map(category => ({
    category: encodeURIComponent(category),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const decodedCategory = decodeURIComponent(category)

  return {
    title: `${decodedCategory} 카테고리`,
    description: `${decodedCategory} 카테고리의 모든 글`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const decodedCategory = decodeURIComponent(category)
  const categories = getAllCategories()
  const posts = getPostsByCategory(decodedCategory)

  if (!categories.includes(decodedCategory)) {
    notFound()
  }

  return (
    <div className="py-12">
      {/* Category Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{decodedCategory}</h1>
        <p className="text-light-gray60 dark:text-dark-gray60">
          {posts.length}개의 글
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-8 pb-2">
        {categories.map(cat => {
          const isActive = cat === decodedCategory
          return (
            <Link
              key={cat}
              href={`/posts/${encodeURIComponent(cat)}`}
              className={`
                px-4 py-2 rounded-lg whitespace-nowrap transition-colors
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

      {/* Posts Grid */}
      <div className="space-y-6">
        {posts.map(post => (
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

      {posts.length === 0 && (
        <div className="text-center py-12 text-light-gray60 dark:text-dark-gray60">
          이 카테고리에는 아직 글이 없습니다.
        </div>
      )}
    </div>
  )
}
