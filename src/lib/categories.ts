import { allPosts } from 'contentlayer/generated'
import { filterPublishedPosts } from './filter-posts'

export function getAllCategories(): string[] {
  const categorySet = new Set<string>(['All'])
  const publishedPosts = filterPublishedPosts(allPosts)

  publishedPosts.forEach(post => {
    post.categoryArray.forEach((category: string) => {
      if (!category.includes('ignore')) {
        categorySet.add(category)
      }
    })
  })

  return Array.from(categorySet).sort()
}

export function getPostsByCategory(category: string) {
  const publishedPosts = filterPublishedPosts(allPosts)
  
  if (category === 'All') {
    return publishedPosts.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  return publishedPosts
    .filter(post => post.categoryArray.includes(category))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
