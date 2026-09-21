'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { LOCALES } from '@/i18n/locales'
import { bumpVisit } from '@/lib/visits-client'

/** `/` 와 `/en` 처럼 로케일 접두사만 있는 경로가 홈이다. */
function isHome(pathname: string): boolean {
  return pathname === '/' || LOCALES.some(locale => pathname === `/${locale}`)
}

/**
 * 방문을 올리기만 하고 아무것도 그리지 않는다. 루트 레이아웃에 있어서 홈뿐
 * 아니라 글, 목록, 소개 페이지로 들어온 접근도 세어진다. 검색 유입은 대부분
 * 글 URL 로 바로 들어오므로 홈에서만 세면 실제의 일부만 보게 된다.
 *
 * **홈에서는 올리지 않는다.** 거기서는 `VisitCounter` 가 올리고 그 응답을
 * 그대로 그린다. 둘 다 올리면 한 접근이 둘로 세어지고, 나눠서 한쪽이 `GET`
 * 만 하면 증가가 반영되기 전 값을 읽을 수 있다.
 *
 * `usePathname()` 에 의존하므로 client-side navigation 으로 글 사이를 옮겨도
 * 각각 세어진다.
 */
export default function VisitPing() {
  const pathname = usePathname()

  useEffect(() => {
    if (isHome(pathname)) return
    void bumpVisit()
  }, [pathname])

  return null
}
