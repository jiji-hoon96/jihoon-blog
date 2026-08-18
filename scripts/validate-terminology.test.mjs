import assert from 'node:assert/strict'
import test from 'node:test'

import { validateContent } from './validate-terminology.mjs'

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
