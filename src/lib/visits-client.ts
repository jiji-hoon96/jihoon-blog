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

/**
 * 홈 HTML 의 인라인 스크립트가 파싱 시점에 미리 보낸 증가 요청.
 *
 * 컴포넌트의 `useEffect` 는 hydration 이 끝나야 돈다. 모바일 스로틀에서 재 보니
 * 요청이 first contentful paint 보다 0.7초 늦게 출발했고 응답에 다시 1.8초가
 * 걸렸다. 앞의 0.7초는 기다릴 이유가 없는 시간이라 HTML 이 직접 보낸다.
 *
 * **한 번만 꺼내 쓴다.** 꺼낸 뒤 지우지 않으면 홈을 떠났다가 client-side
 * navigation 으로 돌아왔을 때 첫 접근의 응답을 다시 그리고 증가를 건너뛴다.
 * 그 경로에서는 인라인 스크립트가 다시 실행되지 않으므로 `bumpVisit` 으로 간다.
 */
export const EARLY_VISIT_KEY = '__earlyVisit'

export const earlyVisitScript = `window.${EARLY_VISIT_KEY}=fetch('/api/visits',{method:'POST'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})`

export function takeEarlyVisit(): Promise<VisitCounts | null> | null {
  const holder = window as unknown as Record<string, unknown>
  const early = holder[EARLY_VISIT_KEY] as Promise<VisitCounts | null> | undefined
  if (!early) return null
  delete holder[EARLY_VISIT_KEY]
  return early
}

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
