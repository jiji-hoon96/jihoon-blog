import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractProtectedStructure,
  normalizedSourceHash,
} from './lib/translation-structure.mjs'

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
