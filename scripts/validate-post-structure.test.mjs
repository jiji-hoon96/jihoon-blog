import assert from 'node:assert/strict'
import test from 'node:test'

import { findBrokenEmphasis, validatePostStructure } from './validate-post-structure.mjs'

const ids = (body) =>
  validatePostStructure(`---\ntitle: t\n---\n\n${body}\n`).map((v) => v.id)

test('passes the sample post shapes', () => {
  assert.deepEqual(
    ids([
      '## 챕터',
      '### 절',
      '**요점.** 이어지는 문장',
      '- **라벨**: 설명',
      '  - 한 단계 중첩',
      '1. 단계',
      ':::ref',
      '- [docs] [제목](https://example.com)',
      ':::',
    ].join('\n')),
    [],
  )
})

test('flags bold-only lines, numbered headings and separators', () => {
  assert.deepEqual(
    ids('**규칙 1. 배열로 쓴다.**\n\n### 1. 인라인 배열\n\n---\n\n<hr>'),
    ['bold-line', 'numbered-heading', 'separator', 'separator'],
  )
})

test('flags old label forms', () => {
  assert.deepEqual(
    ids('- **라벨** : 설명\n- **라벨.** 설명'),
    ['label-space-colon', 'label-period'],
  )
})

test('ignores code blocks and frontmatter', () => {
  assert.deepEqual(ids('```md\n# 제목\n---\n**굵게**\n```'), [])
})

test('flags a heading right before :::ref', () => {
  assert.deepEqual(ids('## 참고 자료\n\n:::ref\n:::'), ['heading-before-ref'])
})

test('counts list depth, not indentation of item paragraphs', () => {
  assert.deepEqual(ids('- 항목\n\n    항목 안 문단\n\n  - 중첩'), [])
  assert.deepEqual(ids('- 하나\n  - 둘\n    - 셋'), ['deep-nesting'])
})

test('flags :::ref items without a dash', () => {
  assert.deepEqual(ids(':::ref\n[docs] [제목](https://example.com)\n:::'), ['ref-item'])
})

test('allows a list item that opens with a bold sentence', () => {
  assert.deepEqual(ids('- **로직은 컴포넌트 밖으로 뺀다.** 순수 함수로 만든다'), [])
})

test('finds bold that CommonMark leaves as literal asterisks', () => {
  const lines = (md) => findBrokenEmphasis(md).map((v) => v.line)
  assert.deepEqual(lines('---\nlocale: ja\n---\n\n**決める。**ひとつ'), [5])
  assert.deepEqual(lines('**決める**。ひとつ\n\n`a ** b`\n\n```js\n2 ** 3\n```'), [])
})
