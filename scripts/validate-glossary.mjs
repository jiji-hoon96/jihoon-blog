import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { validateGlossarySource } from '../src/lib/glossary.ts'

const LOCALES = new Set(['ko', 'en', 'ja', 'es', 'pt-BR', 'zh-CN'])
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const TERM_PATTERN = /:term(?:\[([^\]\n]*)\])?(?:\{([^}\n]*)\})?/gu
const ATTRIBUTE_PATTERN = /^key=(['"])([^'"]*)\1$/u
const OBSERVABILITY_DRAFTS = [
  'docs/research/observability-series/260703.md',
  'docs/research/observability-series/260704.md',
  'docs/research/observability-series/260705.md',
]

function fenceMarker(line) {
  const match = line.match(/^\s*(`{3,}|~{3,})/u)
  return match?.[1]
}

function scanTermCandidates(markdown) {
  const references = []
  const errors = []
  let openFence

  for (const [index, line] of markdown.split('\n').entries()) {
    const marker = fenceMarker(line)
    if (marker) {
      if (!openFence) {
        openFence = marker
      } else if (
        marker[0] === openFence[0] &&
        marker.length >= openFence.length
      ) {
        openFence = undefined
      }
      continue
    }
    if (openFence) continue

    for (const match of line.matchAll(TERM_PATTERN)) {
      const lineNumber = index + 1
      const label = match[1]
      const attributes = match[2]?.trim()

      if (label === undefined || label.trim() === '') {
        errors.push({ line: lineNumber, message: 'term label must not be empty' })
        continue
      }

      const attributeMatch = attributes?.match(ATTRIBUTE_PATTERN)
      if (!attributeMatch) {
        errors.push({
          line: lineNumber,
          message: 'term directive requires one key attribute',
        })
        continue
      }

      const key = attributeMatch[2]
      if (!KEY_PATTERN.test(key)) {
        errors.push({
          line: lineNumber,
          message: `invalid glossary key "${key}"`,
        })
        continue
      }

      references.push({ key, label: label.trim(), line: lineNumber })
    }
  }

  return { references, errors }
}

export function extractTermReferences(markdown) {
  return scanTermCandidates(markdown).references
}

export function validateMarkdownTerms({ markdown, locale, glossary, file }) {
  const { references, errors } = scanTermCandidates(markdown)
  const messages = errors.map(
    ({ line, message }) => `${file}:${line}: ${message}`,
  )

  for (const { key, line } of references) {
    if (!glossary[key]) {
      messages.push(`${file}:${line}: unknown glossary key "${key}"`)
    } else if (!glossary[key][locale]) {
      messages.push(
        `${file}:${line}: glossary key "${key}" has no "${locale}" entry`,
      )
    }
  }

  return messages
}

async function markdownPaths(directory) {
  const paths = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      paths.push(...await markdownPaths(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      paths.push(entryPath)
    }
  }
  return paths
}

function localeFromPath(file) {
  if (file.startsWith('docs/research/observability-series/')) return 'ko'
  const suffix = file.match(/\/index(?:\.([^.\/]+))?\.md$/u)?.[1]
  const locale = suffix ?? 'ko'
  return LOCALES.has(locale) ? locale : undefined
}

export async function validateRepository({
  rootDirectory = process.cwd(),
  includeDrafts = false,
} = {}) {
  const glossaryPath = path.join(rootDirectory, 'content/glossary.json')
  const glossary = JSON.parse(await readFile(glossaryPath, 'utf8'))
  const glossaryErrors = validateGlossarySource(glossary)
  if (glossaryErrors.length > 0) {
    return glossaryErrors.map(error => `content/glossary.json: ${error}`)
  }

  const files = await markdownPaths(path.join(rootDirectory, 'content'))
  if (includeDrafts) {
    files.push(
      ...OBSERVABILITY_DRAFTS.map(file => path.join(rootDirectory, file)),
    )
  }

  const errors = []
  for (const absolutePath of files.sort()) {
    const file = path.relative(rootDirectory, absolutePath)
    const locale = localeFromPath(file)
    if (!locale) {
      errors.push(`${file}: unsupported locale suffix`)
      continue
    }

    const markdown = await readFile(absolutePath, 'utf8')
    errors.push(...validateMarkdownTerms({ markdown, locale, glossary, file }))
  }

  return errors
}

async function main() {
  const errors = await validateRepository({
    includeDrafts: process.argv.includes('--drafts'),
  })

  if (errors.length === 0) {
    console.log('Glossary validation passed.')
    return
  }

  for (const error of errors) console.error(error)
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
