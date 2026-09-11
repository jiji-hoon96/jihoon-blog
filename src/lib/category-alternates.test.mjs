import assert from 'node:assert/strict'
import test from 'node:test'
import { findCategoryTranslations } from './category-alternates.ts'

const posts = [
  { translationKey: '260610', contentLocale: 'ko', categoryArray: ['AI', '토큰'] },
  { translationKey: '260610', contentLocale: 'en', categoryArray: ['AI', 'Tokens'] },
  { translationKey: '260610', contentLocale: 'es', categoryArray: ['IA', 'Tokens'] },
  { translationKey: '260610', contentLocale: 'zh-CN', categoryArray: ['AI', 'Token'] },
  { translationKey: '260703', contentLocale: 'ko', categoryArray: ['관측', 'Sentry'] },
  { translationKey: '260703', contentLocale: 'en', categoryArray: ['observability', 'Sentry'] },
  { translationKey: '260703', contentLocale: 'es', categoryArray: ['observabilidad', 'Sentry'] },
]

test('번역된 카테고리 이름을 인덱스로 이어 붙인다', () => {
  assert.deepEqual(findCategoryTranslations(posts, 'es', 'IA'), {
    ko: 'AI',
    en: 'AI',
    es: 'IA',
    'zh-CN': 'AI',
  })
})

test('비한국어 카테고리도 ko 대응을 찾아 x-default 근거를 만든다', () => {
  const translations = findCategoryTranslations(posts, 'es', 'observabilidad')
  assert.equal(translations.ko, '관측')
})

test('한국어 카테고리는 모든 번역 로케일로 펼쳐진다', () => {
  assert.deepEqual(findCategoryTranslations(posts, 'ko', '관측'), {
    ko: '관측',
    en: 'observability',
    es: 'observabilidad',
  })
})

test('번역본이 없는 로케일은 넣지 않는다', () => {
  const translations = findCategoryTranslations(posts, 'ko', 'AI')
  assert.equal('ja' in translations, false)
  assert.equal('pt-BR' in translations, false)
})

test('All 은 글이 있는 모든 로케일에서 같은 경로다', () => {
  assert.deepEqual(findCategoryTranslations(posts, 'en', 'All'), {
    ko: 'All',
    en: 'All',
    es: 'All',
    'zh-CN': 'All',
  })
})

test('모르는 카테고리는 빈 결과를 준다', () => {
  assert.deepEqual(findCategoryTranslations(posts, 'ko', '없는카테고리'), {})
})

test('글마다 인덱스가 갈리면 최다 득표를 고른다', () => {
  const ambiguous = [
    { translationKey: 'a', contentLocale: 'ko', categoryArray: ['공통', 'x'] },
    { translationKey: 'a', contentLocale: 'en', categoryArray: ['shared', 'x'] },
    { translationKey: 'b', contentLocale: 'ko', categoryArray: ['공통', 'y'] },
    { translationKey: 'b', contentLocale: 'en', categoryArray: ['shared', 'y'] },
    { translationKey: 'c', contentLocale: 'ko', categoryArray: ['z', '공통'] },
    { translationKey: 'c', contentLocale: 'en', categoryArray: ['z', 'odd'] },
  ]

  assert.equal(findCategoryTranslations(ambiguous, 'ko', '공통').en, 'shared')
})
