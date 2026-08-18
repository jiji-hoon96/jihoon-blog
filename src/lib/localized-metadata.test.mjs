import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLocalizedPostMetadata,
  truncateMetadataText,
} from './localized-metadata.ts'

const translations = [
  ['ko', '/260703'],
  ['en', '/en/260703'],
  ['ja', '/ja/260703'],
  ['es', '/es/260703'],
  ['pt-BR', '/pt-BR/260703'],
  ['zh-CN', '/zh-CN/260703'],
].map(([contentLocale, slug]) => ({
  contentLocale,
  translationKey: '260703',
  slug,
  title: `${contentLocale} title`,
  description: `${contentLocale} description`,
  excerpt: `${contentLocale} excerpt`,
  categoryArray: ['Sentry'],
  date: '2026-07-03T00:00:00.000Z',
}))

translations[1].updatedAt = '2026-07-05T00:00:00.000Z'

const site = {
  siteUrl: 'https://example.com',
  siteName: 'Hooni Blog',
  authorName: 'Jihoon Lee',
}

test('builds a self-canonical with reciprocal language alternates', () => {
  const metadata = buildLocalizedPostMetadata(translations[1], translations, site)

  assert.deepEqual(metadata.title, { absolute: 'en title' })
  assert.equal(metadata.alternates.canonical, 'https://example.com/en/260703')
  assert.deepEqual(metadata.alternates.languages, {
    ko: 'https://example.com/260703',
    en: 'https://example.com/en/260703',
    ja: 'https://example.com/ja/260703',
    es: 'https://example.com/es/260703',
    'pt-BR': 'https://example.com/pt-BR/260703',
    'zh-Hans': 'https://example.com/zh-CN/260703',
    'x-default': 'https://example.com/260703',
  })
  assert.equal(metadata.openGraph.locale, 'en_US')
  assert.deepEqual(metadata.openGraph.images, [
    'https://example.com/en/260703/opengraph-image',
  ])
  assert.equal(metadata.openGraph.publishedTime, '2026-07-03T00:00:00.000Z')
  assert.equal(metadata.openGraph.modifiedTime, '2026-07-05T00:00:00.000Z')
})

test('uses Simplified Chinese locale metadata without changing its public URL', () => {
  const metadata = buildLocalizedPostMetadata(translations[5], translations, site)

  assert.equal(metadata.alternates.canonical, 'https://example.com/zh-CN/260703')
  assert.equal(metadata.openGraph.locale, 'zh_CN')
  assert.equal(metadata.openGraph.url, 'https://example.com/zh-CN/260703')
})

test('shortens metadata at a word boundary without changing short text', () => {
  assert.equal(truncateMetadataText('A concise title', 70), 'A concise title')
  assert.equal(
    truncateMetadataText('Frontend state management principles for reliable React applications', 45),
    'Frontend state management principles for…',
  )
  assert.equal(truncateMetadataText('가나다라마바사', 5), '가나다라…')
})

test('keeps generated post title and description within crawler limits', () => {
  const longPost = {
    ...translations[1],
    seoTitle: 'Frontend Error Handling — A Guide to Combining Error Boundaries with TanStack Query throwOnError',
    description: 'This deliberately long description explains error boundaries, asynchronous failures, query errors, recovery behavior, and practical debugging patterns in enough detail to exceed the metadata limit used by search crawlers.',
  }

  const metadata = buildLocalizedPostMetadata(longPost, [longPost], site)

  assert.ok(metadata.title.absolute.length <= 60)
  assert.ok(metadata.description.length <= 155)
  assert.equal(metadata.openGraph.title, metadata.title.absolute)
  assert.equal(metadata.openGraph.description, metadata.description)
  assert.equal(metadata.twitter.title, metadata.title.absolute)
  assert.equal(metadata.twitter.description, metadata.description)
})
