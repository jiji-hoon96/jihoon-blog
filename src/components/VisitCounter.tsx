'use client'

import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/locales'
import {
  bumpVisit,
  takeEarlyVisit,
  type VisitCounts,
} from '@/lib/visits-client'

/**
 * 홈 상단의 방문 수.
 *
 * **서버 컴포넌트로 읽지 않는다.** 홈 HTML 은 Netlify 의 durable 캐시에 실려서
 * 렌더가 방문마다 다시 돌지 않는다. 서버에서 세면 캐시가 살아 있는 동안 숫자가
 * 멈춘 채로 모두에게 같은 값이 나간다. 그래서 브라우저에서 부른다. 부수 효과로
 * JS 를 돌리지 않는 크롤러는 세어지지 않는다. 이 숫자에는 그게 맞다.
 *
 * **홈의 증가는 이 컴포넌트가 한다.** 루트 레이아웃의 `VisitPing` 은 홈에서
 * 비켜서고 나머지 경로만 올린다. 그래야 한 접근이 둘로 세어지지 않고, 화면에
 * 그리는 값이 이 접근을 이미 포함한 숫자가 된다.
 *
 * **라벨은 응답을 기다리지 않는다.** 전에는 숫자가 도착할 때까지 「오늘」과
 * 「전체」까지 통째로 비어 있다가 한꺼번에 나타나서, 그 순간 줄 전체가 생겼다.
 * 지금은 라벨을 처음부터 그리고 숫자 자리만 비워 둔다. 자리는 `tabular-nums` 와
 * `min-w` 로 미리 잡는데, 두 숫자의 자릿수가 다르다. 「오늘」은 두세 자리에
 * 머물고 「전체」는 과거 누적 10,741 을 얹어 시작하므로 쉼표까지 여섯 칸이다.
 * 자리가 모자라면 같은 줄의 뒤 텍스트가 밀린다. 왼쪽 정렬(`text-align: start`)
 * 이라 아래 본문은 움직이지 않지만, 자리를 맞춰 두면 그마저 0 이 된다.
 *
 * 실패하면 줄을 통째로 숨긴다. 「오늘 · 전체」만 남으면 고장이 정상처럼 보인다.
 */
export default function VisitCounter({
  locale,
  labels,
}: {
  locale: Locale
  labels: { today: string; total: string }
}) {
  const [state, setState] = useState<VisitCounts | 'loading' | 'failed'>(
    'loading',
  )

  useEffect(() => {
    let alive = true

    void (takeEarlyVisit() ?? bumpVisit()).then(counts => {
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
    <p
      className="home-meta min-h-[1.5rem] pt-8 text-stone sm:pt-10"
      aria-busy={state === 'loading'}
    >
      {/* 실패해도 마크업을 비우지 않고 `visibility` 로만 감춘다. 줄을 들어내면
          그만큼 아래 본문이 위로 올라와 시프트가 난다(실측 0.019). */}
      <span className={state === 'failed' ? 'invisible' : undefined}>
        {labels.today}{' '}
        <Value width="min-w-[3ch]" placeholder="w-[2.5ch]">
          {counts && format(counts.today)}
        </Value>
        <span aria-hidden="true" className="px-2 text-mineral">
          ·
        </span>
        {labels.total}{' '}
        <Value width="min-w-[6ch]" placeholder="w-[5ch]">
          {counts && format(counts.total)}
        </Value>
      </span>
    </p>
  )
}

/**
 * `width` 와 `placeholder` 는 Tailwind 가 빌드 때 훑을 수 있도록 완성된 클래스명으로
 * 받는다.
 *
 * 숫자가 오기 전에는 자리 안에 회색 막대를 깜빡인다. 빈칸으로 두면 응답을 기다리는
 * 중인지 고장인지 구분되지 않는다. 막대는 `min-w` 로 잡은 자리보다 좁게 둬서 숫자가
 * 들어와도 줄 폭이 바뀌지 않게 한다. 높이는 글자 높이보다 낮아 줄 높이도 그대로다.
 * 실패하면 부모가 `invisible` 로 막대까지 같이 감춘다.
 */
function Value({
  children,
  width,
  placeholder,
}: {
  children: React.ReactNode
  width: string
  placeholder: string
}) {
  return (
    <span className={`inline-block tabular-nums ${width}`}>
      {children ? (
        <span className="qa-fade-in inline-block">{children}</span>
      ) : (
        <span
          aria-hidden="true"
          className={`inline-block h-[0.85em] ${placeholder} rounded-sm bg-mineral align-[-0.1em] motion-safe:animate-pulse`}
        />
      )}
    </span>
  )
}
