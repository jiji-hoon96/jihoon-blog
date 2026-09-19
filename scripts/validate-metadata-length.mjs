#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * seoTitle 과 description 이 렌더 한도를 넘지 않는지 본다.
 *
 * src/lib/localized-metadata.ts 의 truncateMetadataText 가 한도를 넘는 값을
 * 말줄임표로 잘라 낸다. 잘린다고 빌드가 실패하지는 않으므로, 넘긴 값은
 * 초록 빌드를 통과해 그대로 배포된다. 실제로 그렇게 나갔다.
 * /es/260914 의 <title> 이 "Observabilidad del navegador en frontend:…" 42자로
 * 콜론에서 끊긴 채 SERP 와 소셜 카드에 노출됐다. 키워드는 통째로 사라졌다.
 *
 * 한도는 truncateMetadataText 호출부의 숫자와 같아야 한다. 한쪽만 바꾸면
 * 검사가 무의미해지므로 그 파일에서 직접 읽어 온다.
 */
const LIMIT_SOURCE = 'src/lib/localized-metadata.ts'

function frontmatterValue(markdown, field) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/u)?.[1] ?? ''
  const value = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'mu'))?.[1]?.trim()
  return value?.replace(/^(['"])([\s\S]*)\1$/u, '$2')
}

async function readLimits(rootDirectory) {
  const source = await readFile(path.join(rootDirectory, LIMIT_SOURCE), 'utf8')
  const title = source.match(/truncateMetadataText\(\s*post\.seoTitle[^)]*?,\s*(\d+)\s*\)/u)?.[1]
  const description = source.match(/truncateMetadataText\(\s*post\.description[^)]*?,\s*(\d+)\s*\)/u)?.[1]

  if (!title || !description) {
    throw new Error(`${LIMIT_SOURCE} 에서 truncateMetadataText 한도를 찾지 못했다`)
  }
  return { seoTitle: Number(title), description: Number(description) }
}

export async function validateMetadataLength({ rootDirectory = process.cwd(), post } = {}) {
  const limits = await readLimits(rootDirectory)
  const contentDirectory = path.join(rootDirectory, 'content')
  const errors = []

  const directories = (await readdir(contentDirectory, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && /^\d{6}$/u.test(entry.name))
    .map(entry => entry.name)
    .sort()

  for (const directory of directories) {
    if (post && directory !== post) continue

    const files = (await readdir(path.join(contentDirectory, directory)))
      .filter(name => /^index(\.[\w-]+)?\.md$/u.test(name))
      .sort()

    for (const file of files) {
      const relative = `content/${directory}/${file}`
      const markdown = await readFile(path.join(contentDirectory, directory, file), 'utf8')

      // seoTitle 이 없으면 title 이 그 자리에 쓰인다. 잘리는 것은 실제로 쓰이는 쪽이다.
      const title = frontmatterValue(markdown, 'seoTitle') ?? frontmatterValue(markdown, 'title')
      const description = frontmatterValue(markdown, 'description')

      // 상한만 보면 `description` 이 아예 없는 글이 조용히 지나간다. 이 필드가
      // 비면 검색 노출은 되어도 클릭이 0 에 수렴한 사례가 운영에서 확인됐는데,
      // 그것을 막는 검사가 없었다. falsy 를 통과시키는 것이 그 구멍이다.
      if (!title) {
        errors.push(`${relative}: title 과 seoTitle 이 모두 비어 있다`)
      } else if (title.length > limits.seoTitle) {
        errors.push(`${relative}: seoTitle ${title.length}자, 한도 ${limits.seoTitle}자`)
      }
      if (!description) {
        errors.push(`${relative}: description 이 비어 있다`)
      } else if (description.length > limits.description) {
        errors.push(`${relative}: description ${description.length}자, 한도 ${limits.description}자`)
      }
    }
  }

  return { errors, limits }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const postIndex = process.argv.indexOf('--post')
  const { errors } = await validateMetadataLength({
    post: postIndex === -1 ? undefined : process.argv[postIndex + 1],
  })

  if (errors.length) {
    console.error('Metadata length validation failed:')
    for (const error of errors) console.error(`  ${error}`)
    process.exit(1)
  }
  console.log('Metadata length validation passed.')
}
