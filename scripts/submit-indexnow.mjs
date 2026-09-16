import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { isLocale, toPublicPath } from '../src/i18n/locales.ts'

/**
 * IndexNow 는 바뀐 URL 을 검색엔진에 직접 알리는 프로토콜이다. Google 은 쓰지 않고
 * Bing, Yandex, 그리고 Ahrefs 가 AI Discoverability 로 묶는 크롤러들이 받는다.
 *
 * 키는 비밀이 아니다. `public/<key>.txt` 로 공개 서빙되는 것이 프로토콜의 검증
 * 방식이므로 리포에 그대로 둔다. 그래서 GitHub Secret 이 필요 없다.
 *
 * 바뀐 URL 만 보낸다. 안 바뀐 URL 을 배포마다 다시 밀어 넣는 것은 프로토콜이
 * 명시적으로 권하지 않는다. 그래서 기본 입력은 커밋 범위의 `content/` diff 다.
 */

const KEY = '3176e9bf8c16a1051a52edd5ce330de5'
const SITE_URL = 'https://hooninedev.com'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

function frontmatterValue(markdown, field) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/u)?.[1] ?? ''
  const value = frontmatter.match(
    new RegExp(`^${field}:\\s*(.+)$`, 'mu'),
  )?.[1]?.trim()

  return value?.replace(/^(['"])(.*)\1$/u, '$2')
}

export function isHiddenMarkdown(markdown) {
  if (frontmatterValue(markdown, 'draft') === 'true') return true
  const categories = frontmatterValue(markdown, 'categories') ?? ''
  return categories.split(/\s+/u).some(category => category.includes('ignore'))
}

/**
 * `content/260201/index.ja.md` 를 `/ja/260201` 로 옮긴다. 한글 원문은 접두사가 없다.
 * 매칭되지 않는 경로(이미지, translations.json, glossary.json)는 버린다.
 */
export function contentPathToPublicPath(contentPath) {
  const match = /(?:^|\/)content\/(\d{6})\/index(?:\.([\w-]+))?\.md$/u.exec(
    contentPath.replaceAll('\\', '/'),
  )
  if (!match) return undefined

  const [, slug, suffix] = match
  const locale = suffix ?? 'ko'
  if (!isLocale(locale)) return undefined

  return toPublicPath(locale, `/${slug}`)
}

export async function toSubmittableUrls(contentPaths, rootDirectory) {
  const urls = []

  for (const contentPath of new Set(contentPaths)) {
    const publicPath = contentPathToPublicPath(contentPath)
    if (!publicPath) continue

    // 지워진 파일과 비공개 글은 보내지 않는다. noindex URL 을 알리는 것이
    // 이 기능이 해를 끼칠 수 있는 유일한 경로다.
    let markdown
    try {
      markdown = await readFile(path.join(rootDirectory, contentPath), 'utf8')
    } catch {
      continue
    }
    if (isHiddenMarkdown(markdown)) continue

    urls.push(`${SITE_URL}${publicPath}`)
  }

  return urls.sort()
}

async function allContentPaths(rootDirectory) {
  const contentDirectory = path.join(rootDirectory, 'content')
  const entries = await readdir(contentDirectory, { withFileTypes: true })
  const paths = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    for (const file of await readdir(path.join(contentDirectory, entry.name))) {
      if (/^index(?:\.[\w-]+)?\.md$/u.test(file)) {
        paths.push(`content/${entry.name}/${file}`)
      }
    }
  }

  return paths
}

export async function submitUrls(urls) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList: urls,
    }),
  })

  return { status: response.status, body: await response.text() }
}

async function main(argv) {
  const rootDirectory = process.cwd()
  const submit = argv.includes('--submit')
  const all = argv.includes('--all')
  const paths = all
    ? await allContentPaths(rootDirectory)
    : argv.filter(argument => argument.endsWith('.md'))

  if (!all && paths.length === 0) {
    console.log('No content files given. Pass paths, or --all.')
    return
  }

  const urls = await toSubmittableUrls(paths, rootDirectory)

  if (urls.length === 0) {
    console.log('Nothing to submit.')
    return
  }

  for (const url of urls) console.log(url)

  if (!submit) {
    console.log(`\n${urls.length} URLs. Dry run, pass --submit to send them.`)
    return
  }

  const { status, body } = await submitUrls(urls)
  console.log(`\nIndexNow responded ${status} ${body || '(empty body)'}`)

  // 200 은 접수, 202 는 키 검증 대기다. 나머지는 실패로 본다.
  if (status !== 200 && status !== 202) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2))
}
