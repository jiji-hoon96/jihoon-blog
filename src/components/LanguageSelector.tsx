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
  }, [pathname])

  return (
    <details ref={selectorRef} className="relative">
      <summary className="home-meta cursor-pointer list-none text-[11px] uppercase tracking-[0.06em] text-stone transition-colors hover:text-tide">
        <span>{localeLabels[locale]}</span>
      </summary>
      <ul className="absolute right-0 z-50 mt-3 min-w-28 border border-mineral bg-light-white100 p-2 dark:bg-dark-white100">
        {LOCALES.map(targetLocale => (
          <li key={targetLocale}>
            <a
              href={getLocaleSwitchPath(targetLocale, pathname)}
              data-locale={targetLocale}
              hrefLang={HREF_LANG[targetLocale]}
              lang={targetLocale}
              aria-current={targetLocale === locale ? 'page' : undefined}
              className="home-meta block px-3 py-2 text-[11px] tracking-[0.06em] text-stone hover:text-tide"
              onClick={() => localStorage.setItem('preferred-locale', targetLocale)}
            >
              {localeLabels[targetLocale]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
