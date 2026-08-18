import assert from 'node:assert/strict'
import test from 'node:test'

import { getAuthorEntityId } from './author-identity.ts'

test('builds one locale-independent author entity id', () => {
  assert.equal(
    getAuthorEntityId('https://example.com'),
    'https://example.com/about#person',
  )
})

test('normalizes a trailing slash in the site url', () => {
  assert.equal(
    getAuthorEntityId('https://example.com/'),
    'https://example.com/about#person',
  )
})
