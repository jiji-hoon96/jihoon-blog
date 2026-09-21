/**
 * 방문자 카운터.
 *
 * **GA4 Data API 로 읽지 않는다.** 그 경로는 `c36577a` 에서 소비자가 없어 지웠고,
 * 지우기 전에 서버리스에서 응답 없이 매달리는 실패(JIHOON-BLOG-2, -8)를 냈다.
 * -8 은 아직 미해결이다. 함수가 freeze 된 동안 in-process 타이머가 발화하지
 * 못하므로 외부 RPC 를 in-process 타임아웃으로 경계 지을 수 없다. 그래서
 * 같은 모양의 실패를 다시 들이지 않고, Netlify Blobs 로 직접 센다.
 *
 * **Blobs 에는 원자적 증가 연산이 없다.** 대신 조건부 쓰기(`onlyIfMatch` /
 * `onlyIfNew`)가 있어서 compare-and-swap 을 만들 수 있다. 읽은 etag 가 그대로일
 * 때만 쓰고, 경쟁에서 지면 다시 읽는다. 세션이 아니라 페이지 접근마다 쓰므로
 * 쓰기 빈도가 전보다 높다. 그래도 하루 세 자릿수 규모에서 두 요청이 같은
 * 밀리초에 겹칠 일은 드물다. 지면 조용히 숫자가 하나 사라지는 종류의 버그라
 * 재시도를 두고, 여유를 보아 다섯 번까지 본다.
 *
 * 오늘/전체를 키 두 개로 나누지 않고 레코드 하나에 담는다. 그래야 두 숫자가
 * 한 번의 CAS 로 같이 움직인다. 나눠 두면 둘 중 하나만 성공하는 상태가 생긴다.
 */

export const VISITS_STORE = 'visits'
export const VISITS_KEY = 'counts'

const MAX_ATTEMPTS = 5

export type VisitCounts = {
  total: number
  today: number
}

export type CountsRecord = VisitCounts & {
  /** `YYYY-MM-DD`, Asia/Seoul 기준. 독자의 97% 가 한국에 있다. */
  day: string
}

export type CounterStore = {
  getWithMetadata(
    key: string,
    options: { type: 'json'; consistency?: 'strong' | 'eventual' },
  ): Promise<{ data: unknown; etag?: string } | null>
  setJSON(
    key: string,
    value: unknown,
    options?: { onlyIfMatch?: string; onlyIfNew?: boolean },
  ): Promise<{ modified: boolean }>
}

/** `YYYY-MM-DD` 를 돌려준다. `en-CA` 가 그 형식을 쓰는 유일한 표준 로케일이다. */
export function seoulDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * 다음 상태를 계산한다. 날짜가 바뀌면 `today` 만 1 로 되돌리고 `total` 은 잇는다.
 * 자정 초기화를 위한 크론이 필요 없는 이유다. 읽는 쪽이 날짜를 비교한다.
 */
export function nextCounts(
  current: CountsRecord | null,
  day: string,
): CountsRecord {
  if (!current || current.day !== day) {
    return { total: (current?.total ?? 0) + 1, today: 1, day }
  }
  return { total: current.total + 1, today: current.today + 1, day }
}

/** 저장된 레코드를 오늘 기준으로 읽는다. 어제 레코드의 `today` 는 0 으로 본다. */
export function toCounts(
  current: CountsRecord | null,
  day: string,
): VisitCounts {
  if (!current) return { total: 0, today: 0 }
  return {
    total: current.total,
    today: current.day === day ? current.today : 0,
  }
}

function asRecord(value: unknown): CountsRecord | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<CountsRecord>
  if (
    typeof candidate.total !== 'number' ||
    typeof candidate.today !== 'number' ||
    typeof candidate.day !== 'string'
  ) {
    return null
  }
  return { total: candidate.total, today: candidate.today, day: candidate.day }
}

export async function readVisits(
  store: CounterStore,
  day: string,
): Promise<VisitCounts> {
  const entry = await store.getWithMetadata(VISITS_KEY, { type: 'json' })
  return toCounts(asRecord(entry?.data), day)
}

export async function bumpVisits(
  store: CounterStore,
  day: string,
): Promise<VisitCounts> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    // 증가에는 강한 일관성이 필요하다. 기본값(eventual)으로 읽으면 방금 쓴
    // 값을 못 봐서 같은 숫자에 두 번 더하게 된다.
    const entry = await store.getWithMetadata(VISITS_KEY, {
      type: 'json',
      consistency: 'strong',
    })
    const current = asRecord(entry?.data)
    const next = nextCounts(current, day)
    const result = entry?.etag
      ? await store.setJSON(VISITS_KEY, next, { onlyIfMatch: entry.etag })
      : await store.setJSON(VISITS_KEY, next, { onlyIfNew: true })

    if (result.modified) return { total: next.total, today: next.today }
  }

  throw new Error(
    `visit counter lost ${MAX_ATTEMPTS} conditional writes in a row`,
  )
}
