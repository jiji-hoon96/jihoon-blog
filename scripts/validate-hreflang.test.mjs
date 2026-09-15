import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { findHreflangErrors, validateHreflang } from './validate-hreflang.mjs'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const post = (translationKey, contentLocale, categoryArray) => ({
  translationKey,
  contentLocale,
  categoryArray,
})

test('accepts categories translated the same way in every post', () => {
  assert.deepEqual(
    findHreflangErrors([
      post('a', 'ko', ['관측']),
      post('a', 'ja', ['観測']),
      post('b', 'ko', ['관측']),
      post('b', 'ja', ['観測']),
    ]),
    [],
  )
})

test('rejects a category translated two different ways', () => {
  const errors = findHreflangErrors([
    post('a', 'ko', ['관측']),
    post('a', 'ja', ['可観測性']),
    post('b', 'ko', ['관측']),
    post('b', 'ja', ['観測']),
    post('c', 'ko', ['관측']),
    post('c', 'ja', ['観測']),
  ])

  assert.deepEqual(errors, [
    '/ja/posts/可観測性 points at /ko/posts/관측, which points back at /ja/posts/観測',
  ])
})

test('every category in the repository translates reciprocally', async () => {
  assert.deepEqual(
    await validateHreflang({ rootDirectory: repositoryRoot }),
    [],
  )
})
