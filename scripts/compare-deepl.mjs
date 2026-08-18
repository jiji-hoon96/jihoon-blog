import { readFile } from 'node:fs/promises'

const TARGET_LANGUAGE = {
  en: 'EN-US',
  ja: 'JA',
  es: 'ES',
  'pt-BR': 'PT-BR',
  'zh-CN': 'ZH-HANS',
}

function usage() {
  console.log('Usage: node scripts/compare-deepl.mjs --source FILE --translation FILE --locale LOCALE')
}

function proseSegments(markdown) {
  const segments = []
  let inFrontmatter = false
  let frontmatterSeen = false
  let inFence = false

  for (const [index, line] of markdown.replace(/\r\n?/g, '\n').split('\n').entries()) {
    if (line === '---' && !frontmatterSeen) {
      inFrontmatter = !inFrontmatter
      if (!inFrontmatter) frontmatterSeen = true
      continue
    }
    if (inFrontmatter) continue
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence || !line.trim() || /^<[^>]+>$/u.test(line.trim())) continue
    if (/^:::/u.test(line.trim())) continue

    const text = line
      .replace(/^#{1,6}\s+/u, '')
      .replace(/^[-*+]\s+/u, '')
      .replace(/^\d+\.\s+/u, '')
      .replace(/!\[[^\]]*\]\([^)]+\)/gu, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
      .trim()

    if (text) segments.push({ line: index + 1, text })
  }

  return segments
}

async function translate(texts, locale, apiKey) {
  const endpoint = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      source_lang: 'KO',
      target_lang: TARGET_LANGUAGE[locale],
      preserve_formatting: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepL comparison failed with HTTP ${response.status}`)
  }

  return (await response.json()).translations.map(item => item.text)
}

async function main() {
  if (process.argv.includes('--help')) {
    usage()
    return
  }

  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) {
    console.log('DeepL comparison skipped: DEEPL_API_KEY is not configured.')
    return
  }

  const argument = name => {
    const index = process.argv.indexOf(name)
    return index >= 0 ? process.argv[index + 1] : undefined
  }
  const sourcePath = argument('--source')
  const translationPath = argument('--translation')
  const locale = argument('--locale')

  if (!sourcePath || !translationPath || !TARGET_LANGUAGE[locale]) {
    usage()
    process.exitCode = 1
    return
  }

  const sourceSegments = proseSegments(await readFile(sourcePath, 'utf8'))
  const translatedSegments = proseSegments(await readFile(translationPath, 'utf8'))
  if (sourceSegments.length !== translatedSegments.length) {
    console.log(`Segment count differs: source=${sourceSegments.length}, translation=${translatedSegments.length}`)
  }

  let disagreementCount = 0
  for (let start = 0; start < sourceSegments.length; start += 50) {
    const batch = sourceSegments.slice(start, start + 50)
    const independent = await translate(batch.map(item => item.text), locale, apiKey)

    independent.forEach((text, offset) => {
      const candidate = translatedSegments[start + offset]?.text
      if (candidate && text.trim().toLocaleLowerCase(locale) !== candidate.trim().toLocaleLowerCase(locale)) {
        disagreementCount += 1
        console.log(`Review source line ${batch[offset].line}: independent translation differs.`)
      }
    })
  }

  console.log(`DeepL comparison complete: ${disagreementCount} segment(s) need review.`)
}

await main()
