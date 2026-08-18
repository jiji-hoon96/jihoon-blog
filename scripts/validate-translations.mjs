import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  extractProtectedStructure,
  normalizedSourceHash,
} from './lib/translation-structure.mjs'

const TARGET_LOCALES = ['en', 'ja', 'es', 'pt-BR', 'zh-CN']

function frontmatterValue(markdown, field) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/u)?.[1] ?? ''
  const value = frontmatter.match(
    new RegExp(`^${field}:\\s*(.+)$`, 'mu'),
  )?.[1]?.trim()

  return value?.replace(/^(['"])(.*)\1$/u, '$2')
}

function firstStructureMismatch(source, translation) {
  const sourceStructure = extractProtectedStructure(source)
  const translationStructure = extractProtectedStructure(translation)

  for (const key of Object.keys(sourceStructure)) {
    try {
      assert.deepEqual(translationStructure[key], sourceStructure[key])
    } catch {
      return key
    }
  }

  return undefined
}

export async function validateTranslations({
  rootDirectory = process.cwd(),
  post,
} = {}) {
  const contentDirectory = path.join(rootDirectory, 'content')
  const manifest = JSON.parse(
    await readFile(path.join(contentDirectory, 'translations.json'), 'utf8'),
  )
  const errors = []

  for (const entry of manifest.posts) {
    if (post && entry.key !== post) continue

    const sourcePath = path.join(rootDirectory, entry.source)
    const source = await readFile(sourcePath, 'utf8')
    const currentHash = normalizedSourceHash(source)

    if (entry.sourceHash !== currentHash) {
      errors.push(`${entry.key}: manifest sourceHash is stale`)
    }

    for (const locale of TARGET_LOCALES) {
      const relativePath = `content/${entry.key}/index.${locale}.md`
      let translation
      try {
        translation = await readFile(path.join(rootDirectory, relativePath), 'utf8')
      } catch (error) {
        if (error?.code === 'ENOENT') {
          errors.push(`${entry.key}/${locale}: missing ${relativePath}`)
          continue
        }
        throw error
      }

      if (frontmatterValue(translation, 'locale') !== locale) {
        errors.push(`${entry.key}/${locale}: invalid locale frontmatter`)
      }
      if (frontmatterValue(translation, 'translationOf') !== entry.key) {
        errors.push(`${entry.key}/${locale}: invalid translationOf frontmatter`)
      }
      if (frontmatterValue(translation, 'sourceHash') !== currentHash) {
        errors.push(`${entry.key}/${locale}: stale sourceHash`)
      }

      const mismatch = firstStructureMismatch(source, translation)
      if (mismatch) {
        errors.push(`${entry.key}/${locale}: ${mismatch} differs from source`)
      }
    }
  }

  return errors
}

async function main() {
  const postIndex = process.argv.indexOf('--post')
  const post = postIndex >= 0 ? process.argv[postIndex + 1] : undefined
  const errors = await validateTranslations({ post })

  if (errors.length === 0) {
    console.log(post
      ? `Translations for ${post} passed.`
      : 'All translations passed.')
    return
  }

  for (const error of errors) console.error(error)
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
