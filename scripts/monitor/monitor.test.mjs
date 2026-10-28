import assert from 'node:assert/strict'
import test from 'node:test'

import { renderReport } from './report.mjs'
import { findSeoProblems, inspectPage } from './seo.mjs'
import { toSentryProblems } from './sentry.mjs'

const ORIGIN = 'https://hooninedev.com'
const page = (path, overrides = {}) => ({
  url: `${ORIGIN}${path}`,
  status: 200,
  robots: 'index, follow',
  description: '설'.repeat(120),
  title: '제목',
  canonical: `${ORIGIN}${path}`,
  h1Count: 1,
  ...overrides,
})
const codes = problems => problems.map(item => `${item.code} ${new URL(item.url).pathname}`)

test('reads the fields the checks need from rendered HTML', () => {
  const html = '<title>A &amp; B</title><meta name="description" content="설명 &#x27;x&#x27;"/>'
    + '<meta name="robots" content="noindex, follow"/><link rel="canonical" href="https://hooninedev.com/a"/>'
    + '<h1 class="x">제목</h1><a href="/posts/AI">AI</a>'
  assert.deepEqual(inspectPage(html), {
    robots: 'noindex, follow',
    description: "설명 'x'",
    title: 'A & B',
    canonical: 'https://hooninedev.com/a',
    h1Count: 1,
    links: ['/posts/AI'],
  })
})

test('a healthy indexable page in the sitemap has no problems', () => {
  assert.deepEqual(findSeoProblems({ pages: [page('/')], sitemapUrls: [`${ORIGIN}/`], origin: ORIGIN }), [])
})

test('single-post category noindex is expected, other noindex is not', () => {
  const problems = findSeoProblems({
    pages: [
      page('/posts/%ED%9A%8C%EA%B3%A0', { robots: 'noindex, follow' }),
      page('/ja/posts/AI', { robots: 'noindex, follow' }),
      page('/260723', { robots: 'noindex, nofollow' }),
    ],
    sitemapUrls: [],
    origin: ORIGIN,
  })
  assert.deepEqual(codes(problems), ['unexpected-noindex /260723'])
})

test('flags short descriptions with the Ahrefs threshold, counted in code points', () => {
  const problems = findSeoProblems({
    pages: [page('/a', { description: '설'.repeat(109) }), page('/b', { description: '설'.repeat(110) })],
    sitemapUrls: [`${ORIGIN}/a`, `${ORIGIN}/b`],
    origin: ORIGIN,
  })
  assert.deepEqual(codes(problems), ['description-too-short /a'])
})

test('flags sitemap entries nothing links to, and noindex pages in the sitemap', () => {
  const problems = findSeoProblems({
    pages: [page('/posts/AI', { robots: 'noindex, follow' })],
    sitemapUrls: [`${ORIGIN}/posts/AI`, `${ORIGIN}/guestbook`],
    origin: ORIGIN,
  })
  assert.deepEqual(codes(problems), ['noindex-in-sitemap /posts/AI', 'sitemap-orphan /guestbook'])
})

test('broken links and redirects stop further checks on that URL', () => {
  const problems = findSeoProblems({
    pages: [page('/gone', { status: 404, robots: undefined }), page('/ko', { status: 307, robots: undefined, location: '/' })],
    sitemapUrls: [],
    origin: ORIGIN,
  })
  assert.deepEqual(codes(problems), ['broken-link /gone', 'internal-redirect /ko'])
})

test('the report counts only items missing from the previous run as fresh', () => {
  const problems = [
    ...toSentryProblems([{ shortId: 'JIHOON-BLOG-A', title: 'x', culprit: 'y', count: '3', lastSeen: '2026-10-26T00:00:00Z', permalink: 'https://s/1' }]),
    { severity: 'warning', code: 'description-too-short', url: `${ORIGIN}/a`, detail: '100자', key: 'seo:description-too-short:https://hooninedev.com/a' },
  ]
  const report = renderReport({ problems, previousKeys: ['sentry:JIHOON-BLOG-A'], checkedAt: 'now', pageCount: 1 })
  assert.equal(report.actionable, 2)
  assert.equal(report.fresh, 1)
  assert.match(report.body, /<!-- monitor-keys: sentry:JIHOON-BLOG-A seo:description-too-short:https:\/\/hooninedev.com\/a -->/u)
})

test('an empty run says so instead of rendering nothing', () => {
  const report = renderReport({ problems: [], checkedAt: 'now', pageCount: 10 })
  assert.equal(report.actionable, 0)
  assert.match(report.body, /고칠 항목이 없다/u)
})
