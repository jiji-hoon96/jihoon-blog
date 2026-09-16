import type { Post } from 'contentlayer/generated'
import { isHiddenPost } from './filter-posts.ts'

export function getAdjacentPosts(slug: string, posts: Post[]) {
  const sortedPosts = posts
    .filter(post => !isHiddenPost(post))
    .sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

  const currentIndex = sortedPosts.findIndex(p => p.slug === slug)

  // 현재 글이 목록에 없다는 것은 숨긴 글이라는 뜻이다. -1 을 그대로 쓰면
  // next 가 sortedPosts[0], 곧 블로그 최신 글을 가리킨다.
  if (currentIndex === -1) return { prev: null, next: null }

  return {
    prev: sortedPosts[currentIndex - 1] || null,
    next: sortedPosts[currentIndex + 1] || null,
  }
}

export function getRelatedPosts(slug: string, limit: number, posts: Post[]) {
  const current = posts.find(p => p.slug === slug)
  if (!current) return []

  const currentCategories = new Set(current.categoryArray)

  const scored = posts
    .filter(post => !isHiddenPost(post) && post.slug !== slug)
    .map(p => {
      const overlap = p.categoryArray.filter((c: string) =>
        currentCategories.has(c),
      ).length
      return { post: p, score: overlap }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.post.date).getTime() - new Date(a.post.date).getTime()
    })
    .slice(0, limit)
    .map(item => item.post)

  return scored
}
