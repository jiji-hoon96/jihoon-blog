import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateContent(content, policy) {
  return policy.banned.filter(({ pattern }) =>
    new RegExp(escapeRegExp(pattern), 'iu').test(content),
  )
}

// 코드만 걷어낸다. 코드 블록과 인라인 코드는 식별자라 번역 대상이 아니다.
// 프론트매터는 검사한다. seoTitle 과 description 은 검색 결과에 그대로 노출되는 문장이고,
// keywords 도 본문과 표기가 갈리면 같은 글이 두 가지 이름을 갖게 된다.
export function withoutCode(content) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
}

async function koreanPostPaths(contentDirectory) {
  const entries = await readdir(contentDirectory, { withFileTypes: true })

  return entries
    .filter(entry => entry.isDirectory() && /^\d{6}$/.test(entry.name))
    .map(entry => path.join(contentDirectory, entry.name, 'index.md'))
}

export async function validateRepository(rootDirectory = process.cwd()) {
  const contentDirectory = path.join(rootDirectory, 'content')
  const policy = JSON.parse(
    await readFile(path.join(contentDirectory, 'terminology.yml'), 'utf8'),
  )
  const violations = []

  for (const postPath of await koreanPostPaths(contentDirectory)) {
    let content
    try {
      content = await readFile(postPath, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }

    for (const violation of validateContent(withoutCode(content), policy)) {
      violations.push({
        file: path.relative(rootDirectory, postPath),
        ...violation,
      })
    }
  }

  return violations
}

async function main() {
  const violations = await validateRepository()
  if (violations.length === 0) {
    console.log('Technical terminology validation passed.')
    return
  }

  for (const { file, pattern, replacement } of violations) {
    console.error(`${file}: replace "${pattern}" with "${replacement}"`)
  }
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
