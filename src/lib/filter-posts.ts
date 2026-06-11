import { Post } from 'contentlayer/generated'

/**
 * 비공개(숨김) 글 여부를 판별합니다.
 * 비공개 조건:
 *  - draft: true 이거나
 *  - categories 에 'ignore' 가 포함된 경우 (이 블로그의 비공개 규칙)
 *
 * @param post - 판별할 게시글
 * @returns 비공개면 true
 */
export function isHiddenPost(post: Post): boolean {
  if (post.draft) return true
  return post.categories.split(/\s+/).some(c => c.includes('ignore'))
}

/**
 * draft가 아니고 ignore 처리되지 않은 공개 게시글만 필터링합니다.
 *
 * @param posts - 필터링할 게시글 배열
 * @returns 공개된 게시글 배열
 */
export function filterPublishedPosts(posts: Post[]): Post[] {
  return posts.filter(post => !isHiddenPost(post))
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
