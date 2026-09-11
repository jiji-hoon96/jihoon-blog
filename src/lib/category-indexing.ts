/**
 * 글 하나짜리 카테고리 페이지는 그 글과 내용이 겹친다.
 *
 * 28개 카테고리 중 21개가 글 1개였고, 로케일까지 치면 126개 페이지가 자기가
 * 나열하는 글 하나와 같은 검색어를 놓고 경쟁했다. 실제로 쿼리 `querykey` 에서
 * `/es/posts/queryKey`(노출 9)가 본문인 `/ja/260104`(2), `/en/260104`(1)를
 * 눌렀다. 그러면서 카테고리 페이지 전체의 28일 성과는 노출 62, 클릭 0 이다.
 *
 * 그래서 얇은 카테고리는 색인에서 빼고 sitemap 에서도 뺀다. `follow` 는
 * 유지하므로 카테고리를 거쳐 글로 가는 내부 링크는 그대로 크롤된다.
 *
 * 이 판단을 한 곳에 두는 이유는 sitemap 과 페이지가 갈린 적이 있어서다.
 * 같은 hreflang 조립을 양쪽에 복사해 뒀다가 288개 중 97개가 x-default 없이
 * 색인됐다. 같은 실수를 반복하지 않으려고 규칙 자체를 공유한다.
 */

/** 이 수 미만의 글을 가진 카테고리는 색인 대상이 아니다. */
export const MIN_INDEXABLE_CATEGORY_POSTS = 2

export function isIndexableCategory(postCount: number): boolean {
  return postCount >= MIN_INDEXABLE_CATEGORY_POSTS
}
