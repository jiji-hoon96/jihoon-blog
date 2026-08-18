import { createHash } from 'node:crypto'

function normalizeMarkdown(markdown) {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/^sourceHash:\s*.*\n?/mu, '')
}

export function normalizedSourceHash(markdown) {
  return createHash('sha256')
    .update(normalizeMarkdown(markdown))
    .digest('hex')
}

export function extractProtectedStructure(markdown) {
  const normalized = normalizeMarkdown(markdown)
  const fencedCode = normalized.match(/```[^\n]*\n[\s\S]*?\n```/gu) ?? []
  const prose = fencedCode.reduce(
    (value, block) => value.replace(block, ''),
    normalized,
  )

  return {
    headingLevels: [...normalized.matchAll(/^(#{1,6})\s+/gmu)]
      .map(match => match[1].length),
    fencedCode,
    inlineCode: [...prose.matchAll(/(?<!`)`([^`\n]+)`(?!`)/gu)]
      .map(match => match[1]),
    linkDestinations: [
      ...normalized.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/gu),
    ].map(match => match[1]),
    imageDestinations: [
      ...normalized.matchAll(/!\[[^\]]*\]\(([^)]+)\)/gu),
    ].map(match => match[1]),
    directives: [...normalized.matchAll(/^:::(\w+)?(?:\{[^}]*\})?\s*$/gmu)]
      .map(match => match[1] ?? '/'),
    originalQuotes: [
      ...normalized.matchAll(/^:::original\s*\n([\s\S]*?)\n^:::\s*$/gmu),
    ].map(match => match[1].trim()),
  }
}
