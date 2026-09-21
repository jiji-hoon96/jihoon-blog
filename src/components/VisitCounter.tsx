'use client'

import { useEffect, useState } from 'react'

import { getDictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/locales'
import { reportVisit, type VisitCounts } from '@/lib/visits-client'

/**
 * 홈 상단의 방문 수.
 *
 * **서버 컴포넌트로 읽지 않는다.** 홈 HTML 은 Netlify 의 durable 캐시에 실려서
 * 렌더가 방문마다 다시 돌지 않는다. 서버에서 세면 캐시가 살아 있는 동안 숫자가
 * 멈춘 채로 모두에게 같은 값이 나간다. 그래서 브라우저에서 부른다. 부수 효과로
 * JS 를 돌리지 않는 크롤러는 세어지지 않는다. 이 숫자에는 그게 맞다.
 *
 * **증가는 이 컴포넌트가 하지 않는다.** 루트 레이아웃의 `VisitPing` 이 모든
 * 페이지에서 올리고, 여기는 그 결과를 그린다. 요청은 `reportVisit` 이 하나로
 * 묶는다.
 *
 * **라벨은 응답을 기다리지 않는다.** 전에는 숫자가 도착할 때까지 「오늘」과
 * 「전체」까지 통째로 비어 있다가 한꺼번에 나타나서, 그 순간 줄 전체가 생겼다.
 * 지금은 라벨을 처음부터 그리고 숫자 자리만 비워 둔다. 자리는 `min-w-[3ch]` 와
 * `tabular-nums` 로 미리 잡는다. 세 자리까지는 값이 들어와도 좌우로 밀리지 않고,
 * 넘어가면 같은 줄의 뒤 텍스트만 밀린다. 왼쪽 정렬(`text-align: start`)이라 아래
 * 본문은 움직이지 않는다. 네 자리 실측이 0.0008 이다.
 *
 * 실패하면 줄을 통째로 숨긴다. 「오늘 · 전체」만 남으면 고장이 정상처럼 보인다.
 */
export default function VisitCounter({ locale }: { locale: Locale }) {
  const [state, setState] = useState<VisitCounts | 'loading' | 'failed'>(
    'loading',
  )
  const dictionary = getDictionary(locale)

  useEffect(() => {
    let alive = true

    void reportVisit().then(counts => {
      if (!alive) return
      setState(counts ?? 'failed')
    })

    return () => {
      alive = false
    }
  }, [])

  const counts = typeof state === 'string' ? null : state
  const format = new Intl.NumberFormat(locale).format

  return (
    <p className="home-meta min-h-[1.5rem] pt-8 text-stone sm:pt-10">
      {/* 실패해도 마크업을 비우지 않고 `visibility` 로만 감춘다. 줄을 들어내면
          그만큼 아래 본문이 위로 올라와 시프트가 난다(실측 0.019). */}
      <span className={state === 'failed' ? 'invisible' : undefined}>
        {dictionary.home.visitsToday}{' '}
        <Value>{counts && format(counts.today)}</Value>
        <span aria-hidden="true" className="px-2 text-mineral">
          ·
        </span>
        {dictionary.home.visitsTotal}{' '}
        <Value>{counts && format(counts.total)}</Value>
      </span>
    </p>
  )
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block min-w-[3ch] tabular-nums">
      {children && <span className="qa-fade-in inline-block">{children}</span>}
    </span>
  )
}
