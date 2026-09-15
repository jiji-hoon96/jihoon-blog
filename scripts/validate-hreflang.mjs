import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  ALL_CATEGORY,
  findCategoryTranslations,
} from '../src/lib/category-alternates.ts'
import { LOCALES } from '../src/i18n/locales.ts'

/**
 * 카테고리 페이지의 hreflang 은 글의 `categories` 에서 파생된다. 같은 카테고리를
 * 글마다 다르게 번역하면 `/ja/posts/A -> /posts/가` 는 걸리는데 그 반대가 안 걸려서
 * 검색엔진이 return-tag 없는 hreflang 으로 본다. (Ahrefs Site Audit 에서 실제로
 * 에러 4건으로 잡혔다. ja `可観測性`/`観測`, zh-CN `可观测性`/`观测`, es·pt-BR `AI`/`IA`)
 *
 * 이 검사는 모든 로케일의 모든 카테고리에서 왕복이 성립하는지 본다. 원인은 코드가
 * 아니라 콘텐츠이므로 투표 알고리즘을 대칭으로 만드는 대신 불일치를 빌드에서 막는다.
 */

function frontmatterValue(markdown, field) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/u)?.[1] ?? ''
  const value = frontmatter.match(
    new RegExp(`^${field}:\\s*(.+)$`, 'mu'),
  )?.[1]?.trim()

  return value?.replace(/^(['"])(.*)\1$/u, '$2')
}

function isHidden(markdown) {
  if (frontmatterValue(markdown, 'draft') === 'true') return true
  const categories = frontmatterValue(markdown, 'categories') ?? ''
  return categories.split(/\s+/u).some(category => category.includes('ignore'))
}

async function collectPosts(contentDirectory) {
  const entries = await readdir(contentDirectory, { withFileTypes: true })
  const posts = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const files = await readdir(path.join(contentDirectory, entry.name))

    for (const file of files) {
      if (!/^index(?:\.[\w-]+)?\.md$/u.test(file)) continue
      const markdown = await readFile(
        path.join(contentDirectory, entry.name, file),
        'utf8',
      )
      if (isHidden(markdown)) continue

      posts.push({
        contentLocale: frontmatterValue(markdown, 'locale') ?? 'ko',
        translationKey: entry.name,
        categoryArray: (frontmatterValue(markdown, 'categories') ?? '')
          .split(/\s+/u)
          .filter(Boolean),
      })
    }
  }

  return posts
}

export function findHreflangErrors(posts) {
  const categoriesByLocale = new Map(
    LOCALES.map(locale => [
      locale,
      new Set(
        posts
          .filter(post => post.contentLocale === locale)
          .flatMap(post => post.categoryArray),
      ),
    ]),
  )
  const errors = []

  for (const locale of LOCALES) {
    for (const category of categoriesByLocale.get(locale)) {
      if (category === ALL_CATEGORY) continue
      const translations = findCategoryTranslations(posts, locale, category)

      for (const [target, name] of Object.entries(translations)) {
        if (target === locale) continue

        if (!categoriesByLocale.get(target)?.has(name)) {
          errors.push(
            `/${locale}/posts/${category} points at /${target}/posts/${name}, which no post produces`,
          )
          continue
        }

        const roundTrip = findCategoryTranslations(posts, target, name)[locale]
        if (roundTrip !== category) {
          errors.push(
            `/${locale}/posts/${category} points at /${target}/posts/${name}, which points back at ${roundTrip ? `/${locale}/posts/${roundTrip}` : 'nothing'}`,
          )
        }
      }
    }
  }

  return errors
}

export async function validateHreflang({ rootDirectory = process.cwd() } = {}) {
  return findHreflangErrors(
    await collectPosts(path.join(rootDirectory, 'content')),
  )
}

async function main() {
  const errors = await validateHreflang()

  if (errors.length === 0) {
    console.log('Hreflang validation passed.')
    return
  }

  for (const error of errors) console.error(error)
  console.error(
    'Categories that translate to each other must do so in both directions.',
  )
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
