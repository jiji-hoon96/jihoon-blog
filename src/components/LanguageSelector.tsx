'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import {
  getLocaleSwitchPath,
  HREF_LANG,
  type Locale,
  LOCALES,
} from '@/i18n/locales'

const localeLabels: Record<Locale, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  es: 'ES',
  'pt-BR': 'PT',
  'zh-CN': 'ZH',
}

export default function LanguageSelector({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const selectorRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    for (const targetLocale of LOCALES) {
      const alternate = document.querySelector<HTMLLinkElement>(
        `link[rel="alternate"][hreflang="${HREF_LANG[targetLocale]}"]`,
      )
      const anchor = selectorRef.current?.querySelector<HTMLAnchorElement>(
        `a[data-locale="${targetLocale}"]`,
      )

      if (alternate && anchor) anchor.href = alternate.href
    }

    // 같은 로케일 안에서의 이동은 클라이언트 내비게이션이라 이 컴포넌트가
    // 언마운트되지 않는다. `<details>` 의 `open` 은 DOM 속성이므로 React 가
    // 되돌려 주지도 않는다. 그래서 경로가 바뀌면 직접 닫는다.
    if (selectorRef.current) selectorRef.current.open = false
  }, [pathname])

  // 바깥을 누르거나 Escape 를 누르면 닫는다. `<details>` 는 둘 다 기본 제공하지
  // 않아서, 열어 두고 다른 곳을 누르면 목록이 그대로 남는다.
  useEffect(() => {
    const close = () => {
      if (selectorRef.current) selectorRef.current.open = false
    }
    const onPointerDown = (event: PointerEvent) => {
      const selector = selectorRef.current
      if (!selector?.open) return
      if (!selector.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const selector = selectorRef.current
      if (!selector?.open) return
      close()
      selector.querySelector('summary')?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <details ref={selectorRef} className="group relative">
      <summary className="home-meta flex cursor-pointer list-none items-center gap-1 text-stone transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
        <span>{localeLabels[locale]}</span>
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200 group-open:-rotate-180 motion-reduce:transition-none"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ul className="qa-rise-in absolute right-0 top-full z-50 mt-2 w-20 origin-top-right border border-mineral bg-canvas p-1 shadow-lg">
        {LOCALES.map(targetLocale => (
          <li key={targetLocale}>
            <a
              href={getLocaleSwitchPath(targetLocale, pathname)}
              data-locale={targetLocale}
              hrefLang={HREF_LANG[targetLocale]}
              lang={targetLocale}
              aria-current={targetLocale === locale ? 'page' : undefined}
              className="home-meta block px-3 py-1.5 text-stone transition-colors hover:bg-surface hover:text-accent aria-[current=page]:font-bold aria-[current=page]:text-ink"
              onClick={() => {
                localStorage.setItem('preferred-locale', targetLocale)
                if (selectorRef.current) selectorRef.current.open = false
              }}
            >
              {localeLabels[targetLocale]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
