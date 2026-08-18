import assert from 'node:assert/strict'
import test from 'node:test'

import { buildLlmsText } from './llms-text.ts'

const baseInput = {
  siteUrl: 'https://example.com',
  siteTitle: 'Test Blog',
  authorName: '이지훈',
  authorNickname: '후니',
  stack: ['React', 'TypeScript'],
  posts: [
    {
      slug: '/260818',
      title: '원래 제목',
      seoTitle: 'SEO 제목',
      description: '글\n설명',
      excerpt: '요약',
    },
  ],
}

test('builds a Korean guide with canonical Korean links', () => {
  const text = buildLlmsText({
    ...baseInput,
    locale: 'ko',
    siteDescription: '한국어 설명',
    labels: {
      intro: '{authorName}({authorNickname})의 기술 블로그입니다.',
      about: '저자 소개',
      rss: 'RSS 구독',
      sitemap: '사이트 전체 URL',
      posts: '글',
    },
  })

  assert.match(text, /^# Test Blog$/m)
  assert.match(text, /> 한국어 설명/)
  assert.match(
    text,
    /\[RSS Feed\]\(https:\/\/example.com\/rss.xml\): RSS 구독/,
  )
  assert.match(
    text,
    /\[SEO 제목\]\(https:\/\/example.com\/260818\): 글 설명/,
  )
  assert.doesNotMatch(text, /English site description/)
})

test('builds an English guide with localized links', () => {
  const text = buildLlmsText({
    ...baseInput,
    locale: 'en',
    siteDescription: 'English site description',
    labels: {
      intro: 'Technical blog by {authorName} ({authorNickname}).',
      about: 'Author profile',
      rss: 'RSS subscription',
      sitemap: 'All site URLs',
      posts: 'Posts',
    },
  })

  assert.match(text, /https:\/\/example.com\/en\/about/)
  assert.match(text, /https:\/\/example.com\/en\/rss.xml/)
  assert.match(text, /English site description/)
  assert.doesNotMatch(text, /한국어 설명/)
})
