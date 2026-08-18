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

    for (const violation of validateContent(content, policy)) {
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
