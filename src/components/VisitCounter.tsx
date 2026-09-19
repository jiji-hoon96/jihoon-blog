'use client'

import { useEffect, useState } from 'react'

import { getDictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/locales'

type VisitCounts = { total: number; today: number }

const SESSION_KEY = 'counted-visit'

/**
 * 홈 하단의 방문 수.
 *
 * **서버 컴포넌트로 읽지 않는다.** 홈 HTML 은 Netlify 의 durable 캐시에 실려서
 * 렌더가 방문마다 다시 돌지 않는다. 서버에서 세면 캐시가 살아 있는 동안 숫자가
 * 멈춘 채로 모두에게 같은 값이 나간다. 그래서 브라우저에서 부른다. 부수 효과로
 * JS 를 돌리지 않는 크롤러는 세어지지 않는다. 이 숫자에는 그게 맞다.
 *
 * 한 세션에 한 번만 올린다. 같은 사람이 글 사이를 오가며 홈으로 돌아올 때마다
 * 더하면 방문 수가 아니라 조회 수가 된다.
 *
 * 실패하면 아무것도 그리지 않는다. 0 을 보여주면 「고장」과 「아직 아무도」가
 * 화면에서 같아진다.
 */
export default function VisitCounter({ locale }: { locale: Locale }) {
  const [counts, setCounts] = useState<VisitCounts | null>(null)
  const dictionary = getDictionary(locale)

  useEffect(() => {
    let alive = true

    const counted = sessionStorage.getItem(SESSION_KEY) === '1'
    fetch('/api/visits', { method: counted ? 'GET' : 'POST' })
      .then(response => (response.ok ? response.json() : null))
      .then((data: VisitCounts | null) => {
        if (!alive || !data) return
        sessionStorage.setItem(SESSION_KEY, '1')
        setCounts(data)
      })
      .catch(() => undefined)

    return () => {
      alive = false
    }
  }, [])

  if (!counts) return null

  const format = new Intl.NumberFormat(locale).format

  return (
    <p className="qa-fade-in home-meta mt-14 text-stone sm:mt-16">
      {dictionary.home.visitsToday} {format(counts.today)}
      <span aria-hidden="true" className="px-2 text-mineral">
        ·
      </span>
      {dictionary.home.visitsTotal} {format(counts.total)}
    </p>
  )
}
