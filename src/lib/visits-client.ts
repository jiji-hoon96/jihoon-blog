/**
 * 브라우저에서 방문을 한 번 올리고 그 결과를 돌려준다.
 *
 * **세션당 한 번이 아니라 페이지 접근마다 센다.** 처음에는 `sessionStorage` 로
 * 한 세션에 한 번만 올렸다. 그러면 같은 사람이 글 다섯 개를 봐도 1 이라 세션
 * 수가 되는데, 화면에 두려던 숫자는 페이지 접근의 총합이다. GA4 의 `page_view`
 * 와 같은 단위라 과거 수치를 이어 붙일 수도 있다.
 *
 * 이 블로그는 글 사이 이동이 전체 재적재가 아니라 client-side navigation 이다.
 * 그래서 부르는 쪽이 `usePathname()` 변화마다 호출한다. 문서 로드만 세면
 * 링크를 타고 읽어 나가는 방문이 한 번으로 줄어든다.
 */

export type VisitCounts = { total: number; today: number }

export async function bumpVisit(): Promise<VisitCounts | null> {
  try {
    const response = await fetch('/api/visits', { method: 'POST' })
    // 실패는 503 으로 온다. `null` 을 돌려주고 부르는 쪽이 숨긴다. 0 을 그리면
    // 「고장」과 「아직 아무도 안 왔다」가 화면에서 같아진다.
    if (!response.ok) return null
    return (await response.json()) as VisitCounts
  } catch {
    return null
  }
}
