import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
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
  // 숨김 글은 임시 디렉터리로 만든다. 실재하는 글을 픽스처로 쓰면 그 글을 발행하는 날
  // 이 테스트가 깨진다. 실제로 260617 을 쓰다가 그렇게 됐다.
  const root = await mkdtemp(path.join(tmpdir(), 'indexnow-'))
  await mkdir(path.join(root, 'content', '260201'), { recursive: true })
  await mkdir(path.join(root, 'content', '260202'), { recursive: true })
  await writeFile(
    path.join(root, 'content', '260201', 'index.md'),
    '---\ncategories: AI\n---\n\n본문\n',
  )
  await writeFile(
    path.join(root, 'content', '260202', 'index.md'),
    '---\ncategories: ignore AI\n---\n\n본문\n',
  )

  assert.deepEqual(
    await toSubmittableUrls(
      [
        'content/260201/index.md',
        'content/999999/index.md',
        'content/260202/index.md',
      ],
      root,
    ),
    ['https://hooninedev.com/260201'],
  )
})

test('submits every published post in the repository as it stands', async () => {
  const urls = await toSubmittableUrls(['content/260201/index.md'], repositoryRoot)
  assert.deepEqual(urls, ['https://hooninedev.com/260201'])
})
