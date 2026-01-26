import { allPosts } from 'contentlayer/generated'

export function getAllCategories(): string[] {
  const categorySet = new Set<string>(['All'])

  allPosts.forEach(post => {
    post.categoryArray.forEach((category: string) => {
      if (!category.includes('ignore')) {
        categorySet.add(category)
      }
    })
  })

  return Array.from(categorySet).sort()
}

export function getPostsByCategory(category: string) {
  if (category === 'All') {
    return allPosts.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  return allPosts
    .filter(post => post.categoryArray.includes(category))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
