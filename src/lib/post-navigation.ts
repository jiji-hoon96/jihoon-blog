import { allPosts } from 'contentlayer/generated'

export function getAdjacentPosts(slug: string) {
  const sortedPosts = allPosts
    .filter(p => !p.draft)
    .sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

  const currentIndex = sortedPosts.findIndex(p => p.slug === slug)

  return {
    prev: sortedPosts[currentIndex - 1] || null,
    next: sortedPosts[currentIndex + 1] || null,
  }
}
