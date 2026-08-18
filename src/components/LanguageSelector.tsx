'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  getLocaleSwitchPath,
  type Locale,
  LOCALES,
} from '@/i18n/locales'

const localeLabels: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  es: 'Español',
  'pt-BR': 'Português',
  'zh-CN': '简体中文',
}

export default function LanguageSelector({ locale }: { locale: Locale }) {
  const pathname = usePathname()

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-sm hover:bg-light-gray10 dark:hover:bg-dark-gray10">
        <span aria-hidden="true">🌐</span>{' '}
        <span>{localeLabels[locale]}</span>
      </summary>
      <ul className="absolute right-0 z-50 mt-2 min-w-36 rounded-lg border border-light-gray20 bg-white p-1 shadow-lg dark:border-dark-gray20 dark:bg-dark-black100">
        {LOCALES.map(targetLocale => (
          <li key={targetLocale}>
            <Link
              href={getLocaleSwitchPath(targetLocale, pathname)}
              hrefLang={targetLocale}
              lang={targetLocale}
              aria-current={targetLocale === locale ? 'page' : undefined}
              className="block rounded-md px-3 py-2 text-sm hover:bg-light-gray10 dark:hover:bg-dark-gray10"
              onClick={() => localStorage.setItem('preferred-locale', targetLocale)}
            >
              {localeLabels[targetLocale]}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )
}
