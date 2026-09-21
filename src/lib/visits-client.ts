/**
 * 브라우저에서 방문을 한 번 올리고 그 결과를 돌려준다.
 *
 * **왜 모듈에 promise 를 캐시하는가.** 증가는 모든 페이지에서 일어나야 하고
 * (`VisitPing` 이 루트 레이아웃에 있다) 표시는 홈에서만 한다(`VisitCounter`).
 * 홈에서는 둘이 같이 마운트되는데, 각자 `sessionStorage` 를 읽고 각자 `POST`
 * 하면 한 방문이 둘로 세어진다. 먼저 만들어진 promise 를 함께 기다리게 해서
 * 요청 자체를 하나로 만든다.
 *
 * 한 세션에 한 번만 올린다. 같은 사람이 글 사이를 오가며 다시 와도 더하면
 * 방문 수가 아니라 조회 수가 된다. SPA 내비게이션에서는 이 모듈이 살아 있어
 * 요청이 다시 나가지 않고, 홈으로 돌아올 때 캐시된 값이 바로 그려진다.
 */

export type VisitCounts = { total: number; today: number }

const SESSION_KEY = 'counted-visit'

let pending: Promise<VisitCounts | null> | null = null

async function request(): Promise<VisitCounts | null> {
  const counted = sessionStorage.getItem(SESSION_KEY) === '1'
  try {
    const response = await fetch('/api/visits', {
      method: counted ? 'GET' : 'POST',
    })
    // 실패는 503 으로 온다. `null` 을 돌려주고 부르는 쪽이 숨긴다. 0 을 그리면
    // 「고장」과 「아직 아무도 안 왔다」가 화면에서 같아진다.
    if (!response.ok) return null
    sessionStorage.setItem(SESSION_KEY, '1')
    return (await response.json()) as VisitCounts
  } catch {
    return null
  }
}

export function reportVisit(): Promise<VisitCounts | null> {
  pending ??= request()
  return pending
}
