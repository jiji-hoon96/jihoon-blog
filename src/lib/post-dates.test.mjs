import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLatestPostModifiedDate,
  getPostModifiedDate,
} from './post-dates.ts'

test('uses an explicit meaningful modification date', () => {
  assert.equal(
    getPostModifiedDate({ date: '2026-08-18', updatedAt: '2026-08-20' }),
    '2026-08-20',
  )
})

test('falls back to publication date', () => {
  assert.equal(getPostModifiedDate({ date: '2026-08-18' }), '2026-08-18')
})

test('finds the latest effective modification date', () => {
  assert.equal(
    getLatestPostModifiedDate([
      { date: '2026-08-18' },
      { date: '2026-08-17', updatedAt: '2026-08-21' },
    ])?.toISOString(),
    '2026-08-21T00:00:00.000Z',
  )
  assert.equal(getLatestPostModifiedDate([]), undefined)
})

