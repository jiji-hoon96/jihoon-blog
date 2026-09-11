import { allPosts } from 'contentlayer/generated'
import { filterPublishedPosts } from './filter-posts'
import { ALL_CATEGORY } from './category-alternates'
import type { Post } from 'contentlayer/generated'

export function getAllCategories(posts: Post[] = allPosts): string[] {
  const categorySet = new Set<string>([ALL_CATEGORY])
  const publishedPosts = filterPublishedPosts(posts)

  publishedPosts.forEach(post => {
    post.categoryArray.forEach((category: string) => {
      if (!category.includes('ignore')) {
        categorySet.add(category)
      }
    })
  })

  return Array.from(categorySet).sort()
}

export function getPostsByCategory(category: string, posts: Post[] = allPosts) {
  const publishedPosts = filterPublishedPosts(posts)
  
  if (category === ALL_CATEGORY) {
    return publishedPosts.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  return publishedPosts
    .filter(post => post.categoryArray.includes(category))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
