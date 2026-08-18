import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function frontmatterValue(markdown, field) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/u)?.[1] ?? ''
  const value = frontmatter.match(
    new RegExp(`^${field}:\\s*(.+)$`, 'mu'),
  )?.[1]?.trim()

  return value?.replace(/^(['"])(.*)\1$/u, '$2')
}

export function validateMarkdownDates(markdown) {
  const date = frontmatterValue(markdown, 'date')
  const updatedAt = frontmatterValue(markdown, 'updatedAt')
  const violations = []

  if (!date) {
    violations.push('date is required')
  } else if (!isCalendarDate(date)) {
    violations.push('date must be a real calendar date in YYYY-MM-DD format')
  }
  if (updatedAt && !isCalendarDate(updatedAt)) {
    violations.push(
      'updatedAt must be a real calendar date in YYYY-MM-DD format',
    )
  }

  if (
    violations.length === 0 &&
    date &&
    updatedAt &&
    updatedAt < date
  ) {
    violations.push('updatedAt must be on or after date')
  }

  return violations
}

function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (!match) return false

  const [, year, month, day] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return parsed.toISOString().slice(0, 10) === value
}

async function markdownPaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const paths = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return markdownPaths(entryPath)
      return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : []
    }),
  )

  return paths.flat()
}

export async function validateContentDates(rootDirectory = process.cwd()) {
  const contentDirectory = path.join(rootDirectory, 'content')
  const violations = []

  for (const postPath of await markdownPaths(contentDirectory)) {
    const markdown = await readFile(postPath, 'utf8')
    for (const message of validateMarkdownDates(markdown)) {
      violations.push({
        file: path.relative(rootDirectory, postPath),
        message,
      })
    }
  }

  return violations
}

async function main() {
  const violations = await validateContentDates()

  if (violations.length === 0) {
    console.log('Content date validation passed.')
    return
  }

  for (const { file, message } of violations) {
    console.error(`${file}: ${message}`)
  }
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
