import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  extractProtectedStructure,
  normalizedSourceHash,
} from './lib/translation-structure.mjs'
import { validateTranslations } from './validate-translations.mjs'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

test('source hash ignores a sourceHash frontmatter field', () => {
  const first = '---\ntitle: Test\nsourceHash: old\n---\nBody\n'
  const second = '---\ntitle: Test\nsourceHash: new\n---\nBody\n'

  assert.equal(normalizedSourceHash(first), normalizedSourceHash(second))
})

test('extracts syntax that translations must preserve', () => {
  const markdown = `# 제목

[문서](https://example.com/docs)와 \`captureException\`.

![도표](1.png?w=720)

## 코드

\`\`\`ts
const locale = 'ko'
\`\`\`

:::quote
:::translation
번역
:::
:::original
English original.
:::
:::
`

  assert.deepEqual(extractProtectedStructure(markdown), {
    headingLevels: [1, 2],
    fencedCode: ["```ts\nconst locale = 'ko'\n```"],
    inlineCode: ['captureException'],
    linkDestinations: ['https://example.com/docs'],
    imageDestinations: ['1.png?w=720'],
    directives: ['quote', 'translation', '/', 'original', '/', '/'],
    termKeys: [],
    originalQuotes: ['English original.'],
  })
})

test('keeps indented list fences separate from translatable prose', () => {
  const markdown = `- 설명

    \`\`\`ts
    # this is code, not a heading
    const first = 1
    \`\`\`

    번역해야 하는 본문과 \`inlineCode\`.

    \`\`\`ts
    const second = 2
    \`\`\`
`

  const structure = extractProtectedStructure(markdown)

  assert.equal(structure.fencedCode.length, 2)
  assert.equal(structure.fencedCode[0].includes('번역해야 하는 본문'), false)
  assert.deepEqual(structure.headingLevels, [])
  assert.deepEqual(structure.inlineCode, ['inlineCode'])
})

test('protects glossary keys while allowing translated labels', () => {
  const source = ':term[실제 사용자 모니터링]{key="rum"}'
  const translation = ':term[Real User Monitoring]{key="rum"}'

  assert.deepEqual(
    extractProtectedStructure(source).termKeys,
    extractProtectedStructure(translation).termKeys,
  )
  assert.deepEqual(extractProtectedStructure(source).termKeys, ['rum'])
})

test('detects reordered or changed glossary keys', () => {
  const source = [
    ':term[RUM]{key="rum"}',
    ':term[Web Vitals]{key="web-vitals"}',
  ].join('\n')
  const translation = [
    ':term[Web Vitals]{key="web-vitals"}',
    ':term[RUM]{key="real-user-monitoring"}',
  ].join('\n')

  assert.notDeepEqual(
    extractProtectedStructure(source).termKeys,
    extractProtectedStructure(translation).termKeys,
  )
})

test('every Korean post keeps current translations in all locales', async () => {
  assert.deepEqual(
    await validateTranslations({ rootDirectory: repositoryRoot }),
    [],
  )
})
