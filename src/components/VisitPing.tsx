'use client'

import { useEffect } from 'react'

import { reportVisit } from '@/lib/visits-client'

/**
 * 방문을 올리기만 하고 아무것도 그리지 않는다. 루트 레이아웃에 있어서 홈뿐
 * 아니라 글, 목록, 소개 페이지로 직접 들어온 방문도 세어진다. 검색으로 글에
 * 바로 들어오는 유입이 대부분이라 홈에서만 세면 실제의 일부만 보게 된다.
 *
 * 화면에 나오는 숫자는 홈의 `VisitCounter` 가 그린다. 둘 다 `reportVisit` 을
 * 부르지만 요청은 하나다.
 */
export default function VisitPing() {
  useEffect(() => {
    void reportVisit()
  }, [])

  return null
}
