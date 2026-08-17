import { isLocale, toPublicPath, type Locale } from '../i18n/locales.ts'

type LocalizedPost = {
  locale: string
  translationKey: string
}

export function getPostsForLocale<T extends LocalizedPost>(
  posts: readonly T[],
  locale: Locale,
): T[] {
  return posts.filter(post => post.locale === locale)
}

export function findTranslation<T extends LocalizedPost>(
  posts: readonly T[],
  translationKey: string,
  locale: Locale,
): T | undefined {
  return posts.find(
    post => post.translationKey === translationKey && post.locale === locale,
  )
}

export function parseContentIdentity(flattenedPath: string): {
  locale: Locale
  translationKey: string
  slug: string
} {
  if (/^\d{6}$/.test(flattenedPath)) {
    return {
      locale: 'ko',
      translationKey: flattenedPath,
      slug: toPublicPath('ko', `/${flattenedPath}`),
    }
  }

  const parts = flattenedPath.split('/')
  const filename = parts.at(-1) ?? ''
  const translationKey = parts.at(-2) ?? ''
  const match = /^index(?:\.(.+))?$/.exec(filename)

  if (!match || !translationKey) {
    throw new Error(`Unsupported content path: ${flattenedPath}`)
  }

  const suffix = match[1]
  const locale = suffix ?? 'ko'

  if (!isLocale(locale) || locale === 'ko' && suffix) {
    throw new Error(`Unsupported content locale suffix: ${locale}`)
  }

  return {
    locale,
    translationKey,
    slug: toPublicPath(locale, `/${translationKey}`),
  }
}
