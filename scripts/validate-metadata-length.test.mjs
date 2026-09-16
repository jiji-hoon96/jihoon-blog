import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { validateMetadataLength } from './validate-metadata-length.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')

async function fixture(frontmatter) {
  const directory = await mkdtemp(path.join(tmpdir(), 'meta-length-'))
  await mkdir(path.join(directory, 'content', '260101'), { recursive: true })
  await mkdir(path.join(directory, 'src', 'lib'), { recursive: true })
  await cp(
    path.join(ROOT, 'src/lib/localized-metadata.ts'),
    path.join(directory, 'src/lib/localized-metadata.ts'),
  )
  await writeFile(
    path.join(directory, 'content', '260101', 'index.md'),
    `---\n${frontmatter}\n---\n\n본문\n`,
  )
  return directory
}

test('reads the limits from the truncation call sites', async () => {
  const { limits } = await validateMetadataLength({ rootDirectory: ROOT })
  assert.equal(limits.seoTitle, 60)
  assert.equal(limits.description, 155)
})

test('the repository is currently within the limits', async () => {
  const { errors } = await validateMetadataLength({ rootDirectory: ROOT })
  assert.deepEqual(errors, [])
})

test('flags a seoTitle that the renderer would truncate', async () => {
  const directory = await fixture(
    `title: "짧은 제목"\nseoTitle: "${'a'.repeat(61)}"\ndescription: "설명"`,
  )
  const { errors } = await validateMetadataLength({ rootDirectory: directory })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /seoTitle 61자/u)
})

test('falls back to title when seoTitle is absent', async () => {
  const directory = await fixture(`title: "${'a'.repeat(61)}"\ndescription: "설명"`)
  const { errors } = await validateMetadataLength({ rootDirectory: directory })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /seoTitle 61자/u)
})

test('flags a description that the renderer would truncate', async () => {
  const directory = await fixture(
    `title: "제목"\ndescription: "${'a'.repeat(156)}"`,
  )
  const { errors } = await validateMetadataLength({ rootDirectory: directory })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /description 156자/u)
})
