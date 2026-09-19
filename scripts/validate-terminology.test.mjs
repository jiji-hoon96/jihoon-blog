import assert from 'node:assert/strict'
import test from 'node:test'

import { validateContent, withoutCode } from './validate-terminology.mjs'

const policy = {
  banned: [
    { pattern: 'computer siense', replacement: 'Computer Science' },
    { pattern: '벽시계 경과', replacement: 'wall-clock time(실제 경과 시간)' },
  ],
}

test('rejects misspellings and destructive technical calques', () => {
  assert.deepEqual(
    validateContent('computer siense와 벽시계 경과를 측정한다.', policy),
    [
      { pattern: 'computer siense', replacement: 'Computer Science' },
      { pattern: '벽시계 경과', replacement: 'wall-clock time(실제 경과 시간)' },
    ],
  )
})

test('allows precise English terms with an optional first-use explanation', () => {
  assert.deepEqual(
    validateContent(
      'Computer Science에서 wall-clock time(실제 경과 시간)을 측정한다.',
      policy,
    ),
    [],
  )
})

test('matches banned spellings case-insensitively', () => {
  assert.equal(validateContent('Computer Siense', policy).length, 1)
})

test('ignores code fences and inline code but checks frontmatter', () => {
  const p = { banned: [{ pattern: '타임존', replacement: 'timezone' }] }
  const codeOnly = [
    '---',
    "keywords: 'React DatePicker timezone'",
    '---',
    '',
    '본문에서는 timezone 이라고 적는다.',
    '',
    '```ts',
    'const 타임존 = 1',
    '```',
    '',
    '인라인 `타임존` 도 식별자다.',
  ].join('\n')
  assert.deepEqual(validateContent(withoutCode(codeOnly), p), [])

  const inFrontmatter = codeOnly.replace(
    "keywords: 'React DatePicker timezone'",
    "keywords: 'React DatePicker 타임존'",
  )
  assert.equal(validateContent(withoutCode(inFrontmatter), p).length, 1)
})
