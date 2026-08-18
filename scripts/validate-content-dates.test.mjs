import assert from 'node:assert/strict'
import test from 'node:test'

import { validateMarkdownDates } from './validate-content-dates.mjs'

test('rejects updatedAt before date', () => {
  assert.deepEqual(
    validateMarkdownDates(
      '---\ndate: 2026-08-18\nupdatedAt: 2026-08-17\n---\n',
    ),
    ['updatedAt must be on or after date'],
  )
})

test('allows absent or later updatedAt', () => {
  assert.deepEqual(
    validateMarkdownDates('---\ndate: 2026-08-18\n---\n'),
    [],
  )
  assert.deepEqual(
    validateMarkdownDates(
      '---\ndate: 2026-08-18\nupdatedAt: 2026-08-20\n---\n',
    ),
    [],
  )
})

test('accepts quoted frontmatter dates', () => {
  assert.deepEqual(
    validateMarkdownDates(
      '---\ndate: "2026-08-18"\nupdatedAt: \'2026-08-18\'\n---\n',
    ),
    [],
  )
})

test('rejects malformed and impossible calendar dates', () => {
  assert.deepEqual(
    validateMarkdownDates(
      '---\ndate: nope\nupdatedAt: definitely-not-a-date\n---\n',
    ),
    [
      'date must be a real calendar date in YYYY-MM-DD format',
      'updatedAt must be a real calendar date in YYYY-MM-DD format',
    ],
  )
  assert.deepEqual(
    validateMarkdownDates(
      '---\ndate: 2026-02-30\nupdatedAt: 2026-02-31\n---\n',
    ),
    [
      'date must be a real calendar date in YYYY-MM-DD format',
      'updatedAt must be a real calendar date in YYYY-MM-DD format',
    ],
  )
})
