export type PostDateFields = {
  date: string
  updatedAt?: string
}

export function getPostModifiedDate(post: PostDateFields): string {
  return post.updatedAt ?? post.date
}

export function getLatestPostModifiedDate(
  posts: readonly PostDateFields[],
): Date | undefined {
  if (posts.length === 0) return undefined

  return new Date(
    Math.max(
      ...posts.map(post =>
        new Date(getPostModifiedDate(post)).getTime(),
      ),
    ),
  )
}

