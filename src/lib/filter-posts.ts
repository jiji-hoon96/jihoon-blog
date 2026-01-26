import { Post } from 'contentlayer/generated'

/**
 * draft가 아닌 공개된 게시글만 필터링합니다.
 * draft: true인 글은 제외됩니다.
 * 
 * @param posts - 필터링할 게시글 배열
 * @returns draft가 아닌 게시글 배열
 */
export function filterPublishedPosts(posts: Post[]): Post[] {
  return posts.filter(post => !post.draft)
}

/**
 * 날짜순으로 정렬된 공개 게시글을 반환합니다.
 * 
 * @param posts - 정렬할 게시글 배열
 * @returns 날짜 내림차순으로 정렬된 공개 게시글 배열
 */
export function getSortedPublishedPosts(posts: Post[]): Post[] {
  return filterPublishedPosts(posts).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}
