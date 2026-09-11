import { LOCALES, type Locale } from '../i18n/locales.ts'

/**
 * 카테고리 이름은 로케일마다 번역된다. (`AI` / `IA`, `관측` / `observabilidad`)
 * 그래서 `/es/posts/IA` 와 `/posts/AI` 는 같은 카테고리인데도 문자열이 달라,
 * 이름이 같은 로케일끼리만 hreflang 으로 묶이고 나머지는 서로를 모른다.
 * x-default 를 `languages.ko` 로 정하는 코드도 같은 이유로 비한국어 페이지에서
 * 항상 비어 있었다. (프로덕션 sitemap 288개 중 97개가 x-default 없음)
 *
 * 번역본의 `categories` 는 원문과 같은 순서로 쓰기 때문에, 같은 글의 번역끼리
 * 같은 인덱스를 보면 카테고리 대응을 복원할 수 있다. 한 카테고리에 글이 여러 개면
 * 인덱스가 글마다 다를 수 있으므로 최다 득표를 고른다.
 */

export const ALL_CATEGORY = 'All'

type CategoryPost = {
  contentLocale: string
  translationKey: string
  categoryArray: string[]
}

function tallyVotes(votes: Map<string, number>): string | undefined {
  let winner: string | undefined
  let winningCount = 0

  for (const [name, count] of votes) {
    if (count > winningCount || (count === winningCount && name < (winner ?? ''))) {
      winner = name
      winningCount = count
    }
  }

  return winner
}

export function findCategoryTranslations(
  posts: readonly CategoryPost[],
  locale: Locale,
  category: string,
): Partial<Record<Locale, string>> {
  const localesWithPosts = LOCALES.filter(candidate =>
    posts.some(post => post.contentLocale === candidate),
  )

  // 'All' 은 글에서 파생된 이름이 아니라 모든 로케일이 공유하는 고정 경로다.
  if (category === ALL_CATEGORY) {
    return Object.fromEntries(
      localesWithPosts.map(candidate => [candidate, ALL_CATEGORY]),
    )
  }

  const translationsByKey = new Map<string, Map<string, string[]>>()
  for (const post of posts) {
    const byLocale = translationsByKey.get(post.translationKey) ?? new Map()
    byLocale.set(post.contentLocale, post.categoryArray)
    translationsByKey.set(post.translationKey, byLocale)
  }

  const votesByLocale = new Map<Locale, Map<string, number>>()

  for (const post of posts) {
    if (post.contentLocale !== locale) continue
    const index = post.categoryArray.indexOf(category)
    if (index === -1) continue

    const byLocale = translationsByKey.get(post.translationKey)
    if (!byLocale) continue

    for (const candidate of LOCALES) {
      const name = byLocale.get(candidate)?.[index]
      if (!name) continue

      const votes = votesByLocale.get(candidate) ?? new Map<string, number>()
      votes.set(name, (votes.get(name) ?? 0) + 1)
      votesByLocale.set(candidate, votes)
    }
  }

  const translations: Partial<Record<Locale, string>> = {}
  for (const [candidate, votes] of votesByLocale) {
    const winner = tallyVotes(votes)
    if (winner) translations[candidate] = winner
  }

  return translations
}
