import { getStore } from '@netlify/blobs'
import { NextResponse } from 'next/server'

import { captureServerException } from '@/lib/sentry-server'
import {
  bumpVisits,
  readVisits,
  seoulDay,
  VISITS_STORE,
  type CounterStore,
  type VisitCounts,
} from '@/lib/visit-counter'

/**
 * `GET` 은 읽고 `POST` 는 하나 올린다. 증가를 `GET` 에 두면 링크 프리페치나
 * 프리뷰 봇의 조회 한 번이 그대로 방문 한 번이 된다.
 *
 * 캐시하지 않는다. Netlify 의 durable 캐시가 이 응답을 잡으면 모든 방문자가
 * 같은 숫자를 본다.
 */
export const dynamic = 'force-dynamic'

/**
 * 로컬에는 Blobs 환경변수가 없어서 `getStore` 가 던진다. 프로세스 메모리로
 * 대신한다. 이 값은 서버를 다시 켜면 사라진다. UI 를 눈으로 확인하기 위한
 * 것이지 통계가 아니다.
 *
 * `next start` 는 `NODE_ENV` 가 production 이라 그 조건만으로는 걸리지 않는다.
 * 프로덕션 빌드로 화면을 확인할 때는 `VISITS_MEMORY_STORE=1` 을 준다.
 * `og-font.ts` 의 `OG_FONT_CSS_URL` 과 같은 자리에 있는 검증용 스위치다.
 */
const devStore: { value: unknown; etag: string } = { value: null, etag: '0' }

function createDevStore(): CounterStore {
  return {
    async getWithMetadata() {
      if (devStore.value === null) return null
      return { data: devStore.value, etag: devStore.etag }
    },
    async setJSON(_key, value) {
      devStore.value = value
      devStore.etag = String(Number(devStore.etag) + 1)
      return { modified: true }
    },
  }
}

function resolveStore(): CounterStore {
  if (process.env.VISITS_MEMORY_STORE === '1') return createDevStore()
  try {
    return getStore({ name: VISITS_STORE, consistency: 'strong' })
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error
    return createDevStore()
  }
}

/**
 * 이 라우트가 조용히 매달리는 것을 막는다.
 *
 * **이 타이머가 모든 실패를 막지는 못한다.** 함수가 freeze 되면 wall-clock
 * 타이머가 발화하지 못하고 thaw 뒤에야 만료된다(JIHOON-BLOG-8). 다만 여기서는
 * 실패의 결과가 「숫자가 안 보인다」 뿐이고, 실패는 200 이 아니라 503 으로
 * 나가므로 조용히 0 으로 보이지 않는다.
 */
async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`visit counter timed out after ${ms}ms`)),
          ms,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// 컨테이너 하나가 같은 고장을 반복 보고하지 않게 한다. Blobs 가 죽으면
// 방문 수만큼 이벤트가 생겨서 무료 티어 쿼터를 태운다.
let reported = false

async function respond(
  operation: 'read' | 'bump',
  run: (store: CounterStore, day: string) => Promise<VisitCounts>,
) {
  try {
    const day = seoulDay()
    const counts = await withDeadline(run(resolveStore(), day), 2500)
    return NextResponse.json(counts, {
      headers: { 'cache-control': 'no-store' },
    })
  } catch (error) {
    // Sentry 는 DSN 이 있고 프로덕션일 때만 보낸다. 그 조건이 아닌 환경에서도
    // 원인을 볼 수 있게 함수 로그에는 항상 남긴다.
    console.error(`visit counter ${operation} failed`, error)
    if (!reported) {
      reported = true
      captureServerException(error, { routeKind: 'visits', operation })
    }
    // 200 에 0 을 실어 보내지 않는다. 실패한 조회와 「아직 아무도 안 왔다」 가
    // 같은 응답으로 나가면 화면에서 구분할 수 없다.
    return new NextResponse(null, { status: 503 })
  }
}

export function GET() {
  return respond('read', readVisits)
}

export function POST() {
  return respond('bump', bumpVisits)
}
