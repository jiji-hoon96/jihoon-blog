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
  assert.doesNotMatch(text, /\/about|## About/)
  assert.doesNotMatch(text, /English site description/)
})

test('builds an English guide with localized links', () => {
  const text = buildLlmsText({
    ...baseInput,
    locale: 'en',
    siteDescription: 'English site description',
    labels: {
      intro: 'Technical blog by {authorName} ({authorNickname}).',
      rss: 'RSS subscription',
      sitemap: 'All site URLs',
      posts: 'Posts',
    },
  })

  assert.doesNotMatch(text, /\/about|## About/)
  assert.match(text, /https:\/\/example.com\/en\/rss.xml/)
  assert.match(text, /English site description/)
  assert.doesNotMatch(text, /한국어 설명/)
})

test('lists the resume in Resources only when it is given', () => {
  const labels = {
    intro: '{authorName} 의 블로그입니다.',
    rss: 'RSS 구독',
    sitemap: '사이트 전체 URL',
    posts: '글',
  }

  const withResume = buildLlmsText({
    ...baseInput,
    locale: 'ko',
    siteDescription: '한국어 설명',
    labels,
    resume: { path: '/resume', title: '이력서', description: '경력과 작업' },
  })

  assert.match(
    withResume,
    /\[이력서\]\(https:\/\/example.com\/resume\): 경력과 작업/,
  )

  const withoutResume = buildLlmsText({
    ...baseInput,
    locale: 'ko',
    siteDescription: '한국어 설명',
    labels,
  })

  assert.doesNotMatch(withoutResume, /resume/)
})
