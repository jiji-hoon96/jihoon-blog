import assert from 'node:assert/strict'
import test from 'node:test'

import {
  HREF_LANG,
  LOCALES,
  getLanguageAlternates,
  getLocaleSwitchPath,
  isLocale,
  toPublicPath,
} from '../i18n/locales.ts'
import { getDictionary, interpolate } from '../i18n/dictionaries.ts'
import {
  findTranslation,
  getLocalizedPostParams,
  getPostsForLocale,
  parseContentIdentity,
} from './localized-posts.ts'

test('defines the six supported locales in display order', () => {
  assert.deepEqual(LOCALES, ['ko', 'en', 'ja', 'es', 'pt-BR', 'zh-CN'])
  assert.equal(isLocale('pt-BR'), true)
  assert.equal(isLocale('zh-CN'), true)
  assert.equal(isLocale('fr'), false)
})

test('keeps Korean URLs unprefixed and prefixes other locales', () => {
  assert.equal(toPublicPath('ko', '/'), '/')
  assert.equal(toPublicPath('ko', '/260703'), '/260703')
  assert.equal(toPublicPath('en', '/260703'), '/en/260703')
  assert.equal(toPublicPath('pt-BR', '/posts'), '/pt-BR/posts')
})

test('emits Simplified Chinese as zh-Hans in language alternates', () => {
  const alternates = getLanguageAlternates('https://example.com/', '/260703')

  assert.equal(HREF_LANG['zh-CN'], 'zh-Hans')
  assert.equal(alternates.ko, 'https://example.com/260703')
  assert.equal(alternates.en, 'https://example.com/en/260703')
  assert.equal(alternates['zh-Hans'], 'https://example.com/zh-CN/260703')
  assert.equal(alternates['x-default'], 'https://example.com/260703')
})

test('switches shared routes directly and uses the post index as a safe fallback', () => {
  assert.equal(getLocaleSwitchPath('ko', '/en/260703'), '/posts')
  assert.equal(getLocaleSwitchPath('ja', '/en/260703'), '/ja/posts')
  assert.equal(getLocaleSwitchPath('en', '/260703'), '/en/posts')
  assert.equal(
    getLocaleSwitchPath('es', '/pt-BR/posts/AI'),
    '/es/posts',
  )
  assert.equal(getLocaleSwitchPath('es', '/pt-BR/about'), '/es/posts')
  assert.equal(getLocaleSwitchPath('ko', '/en/posts'), '/posts')
  assert.equal(getLocaleSwitchPath('ko', '/ko/260703'), '/260703')
})

test('filters and finds posts without crossing locale boundaries', () => {
  const posts = [
    { translationKey: '260703', contentLocale: 'ko', title: '한국어' },
    { translationKey: '260703', contentLocale: 'en', title: 'English' },
    { translationKey: '260703', contentLocale: 'ja', title: '日本語' },
    { translationKey: '260723', contentLocale: 'en', title: 'Another post' },
  ]

  assert.deepEqual(
    getPostsForLocale(posts, 'en').map(post => post.title),
    ['English', 'Another post'],
  )
  assert.equal(findTranslation(posts, '260703', 'ja')?.title, '日本語')
  assert.equal(findTranslation(posts, '260723', 'ko'), undefined)
  assert.deepEqual(getLocalizedPostParams(posts), [
    { lang: 'ko', slug: '260703' },
    { lang: 'en', slug: '260703' },
    { lang: 'ja', slug: '260703' },
    { lang: 'en', slug: '260723' },
  ])
})

test('provides shared navigation labels for every locale', () => {
  for (const locale of LOCALES) {
    const dictionary = getDictionary(locale)

    assert.ok(dictionary.siteDescription)
    assert.ok(dictionary.navigation.posts)
    assert.ok(dictionary.navigation.guestbook)
    assert.ok(dictionary.actions.openMenu)
    assert.equal(dictionary.home.values.length, 4)
    assert.ok(dictionary.home.values.every(value => value.length > 0))
    assert.ok(dictionary.home.recentPosts)
    assert.ok(dictionary.home.viewAll)
    assert.ok(dictionary.posts.allPosts)
    assert.ok(dictionary.posts.count)
    assert.ok(dictionary.post.tableOfContents)
    assert.ok(dictionary.post.relatedPosts)
    assert.ok(dictionary.post.updated)
    assert.ok(dictionary.category.label)
    assert.ok(dictionary.guestbook.title)
    assert.ok(dictionary.llms.intro)
    assert.ok(dictionary.llms.rss)
    assert.ok(dictionary.llms.sitemap)
    assert.ok(dictionary.llms.posts)
    assert.ok(dictionary.playground.title)
    assert.ok(dictionary.playground.empty)
    assert.ok(dictionary.actions.search)
    assert.ok(dictionary.actions.changeTheme)
    assert.ok(dictionary.search.placeholder)
    assert.ok(dictionary.search.loading)
    assert.ok(dictionary.search.empty)
    assert.ok(dictionary.search.help)
    assert.ok(dictionary.search.shortcut)
  }
})

test('provides descriptive metadata for category and guestbook pages', () => {
  for (const locale of LOCALES) {
    const dictionary = getDictionary(locale)
    const categoryDescription = interpolate(dictionary.category.description, {
      category: 'React',
      count: 3,
    })

    assert.ok(categoryDescription.includes('React'))
    assert.ok(categoryDescription.includes('3'))
    assert.ok(categoryDescription.length >= 70)
    assert.ok(dictionary.guestbook.description.length >= 70)
    assert.ok(dictionary.siteDescription.length >= 70)
    assert.ok(dictionary.playground.description.length >= 70)
  }
})

test('derives locale and translation key from content filenames', () => {
  assert.deepEqual(parseContentIdentity('240706'), {
    locale: 'ko',
    translationKey: '240706',
    slug: '/240706',
  })
  assert.deepEqual(parseContentIdentity('240706/index'), {
    locale: 'ko',
    translationKey: '240706',
    slug: '/240706',
  })
  assert.deepEqual(parseContentIdentity('260703/index.en'), {
    locale: 'en',
    translationKey: '260703',
    slug: '/en/260703',
  })
  assert.deepEqual(parseContentIdentity('260703/index.pt-BR'), {
    locale: 'pt-BR',
    translationKey: '260703',
    slug: '/pt-BR/260703',
  })
})

test('rejects unknown translation filename suffixes', () => {
  assert.throws(
    () => parseContentIdentity('260703/index.fr'),
    /Unsupported content locale suffix: fr/,
  )
})
