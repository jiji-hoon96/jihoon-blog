import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  contentPathToPublicPath,
  isHiddenMarkdown,
  toSubmittableUrls,
} from './submit-indexnow.mjs'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

test('maps content files to their public paths', () => {
  assert.equal(contentPathToPublicPath('content/260201/index.md'), '/260201')
  assert.equal(
    contentPathToPublicPath('content/260201/index.ja.md'),
    '/ja/260201',
  )
  assert.equal(
    contentPathToPublicPath('content/260201/index.pt-BR.md'),
    '/pt-BR/260201',
  )
})

test('ignores files that are not posts', () => {
  assert.equal(contentPathToPublicPath('content/260201/1.png'), undefined)
  assert.equal(contentPathToPublicPath('content/translations.json'), undefined)
  assert.equal(contentPathToPublicPath('content/260201/index.de.md'), undefined)
})

test('treats draft and ignore posts as hidden', () => {
  assert.equal(isHiddenMarkdown('---\ncategories: AI 토큰\n---\n'), false)
  assert.equal(isHiddenMarkdown('---\ncategories: AI ignore\n---\n'), true)
  assert.equal(
    isHiddenMarkdown('---\ndraft: true\ncategories: AI\n---\n'),
    true,
  )
})

test('drops deleted files and hidden posts before submitting', async () => {
  assert.deepEqual(
    await toSubmittableUrls(
      [
        'content/260201/index.md',
        'content/999999/index.md',
        'content/260617/index.md',
      ],
      repositoryRoot,
    ),
    ['https://hooninedev.com/260201'],
  )
})
