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

function extractFencedCode(markdown) {
  const lines = markdown.split('\n')
  const blocks = []
  const spans = []
  let offset = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const opening = line.match(/^([ \t]*)(`{3,}|~{3,})[^\n]*$/u)

    if (!opening) {
      offset += line.length + 1
      continue
    }

    const start = offset
    const indentation = opening[1]
    const marker = opening[2]
    const markerCharacter = marker[0]
    const closingPattern = new RegExp(
      `^${markerCharacter}{${marker.length},}[ \\t]*$`,
      'u',
    )

    offset += line.length + 1

    for (index += 1; index < lines.length; index += 1) {
      const candidate = lines[index]
      const hasMatchingIndentation = candidate.startsWith(indentation)
      const withoutIndentation = candidate.slice(indentation.length)

      if (hasMatchingIndentation && closingPattern.test(withoutIndentation)) {
        const end = offset + candidate.length
        blocks.push(markdown.slice(start, end))
        spans.push([start, end])
        offset = end + 1
        break
      }

      offset += candidate.length + 1
    }
  }

  return { blocks, spans }
}

export function extractProtectedStructure(markdown) {
  const normalized = normalizeMarkdown(markdown)
  const { blocks: fencedCode, spans } = extractFencedCode(normalized)
  let prose = ''
  let proseOffset = 0

  for (const [start, end] of spans) {
    prose += normalized.slice(proseOffset, start)
    proseOffset = end
  }

  prose += normalized.slice(proseOffset)

  return {
    headingLevels: [...prose.matchAll(/^(#{1,6})\s+/gmu)]
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
