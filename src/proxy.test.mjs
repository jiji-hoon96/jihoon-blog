import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server.js'

import { classifyLocaleRequest } from './lib/locale-request.ts'
import { proxy } from './proxy.ts'

test('rewrites legacy Korean page URLs to the internal ko locale tree', () => {
  assert.deepEqual(classifyLocaleRequest('/'), {
    kind: 'rewrite',
    pathname: '/ko',
  })
  assert.deepEqual(classifyLocaleRequest('/260723'), {
    kind: 'rewrite',
    pathname: '/ko/260723',
  })
  assert.deepEqual(classifyLocaleRequest('/posts'), {
    kind: 'rewrite',
    pathname: '/ko/posts',
  })
  assert.deepEqual(classifyLocaleRequest('/rss.xml'), {
    kind: 'rewrite',
    pathname: '/ko/rss.xml',
  })
  assert.deepEqual(classifyLocaleRequest('/llms.txt'), {
    kind: 'rewrite',
    pathname: '/ko/llms.txt',
  })
})

test('leaves supported foreign locale URLs unchanged', () => {
  assert.deepEqual(classifyLocaleRequest('/en/260723'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/pt-BR/posts'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/zh-CN'), { kind: 'next' })
})

test('redirects visible ko-prefixed URLs to canonical legacy URLs', () => {
  assert.deepEqual(classifyLocaleRequest('/ko'), {
    kind: 'redirect',
    pathname: '/',
  })
  assert.deepEqual(classifyLocaleRequest('/ko/260723'), {
    kind: 'redirect',
    pathname: '/260723',
  })
})

test('does not localize APIs, Next assets, or file-like paths', () => {
  assert.deepEqual(classifyLocaleRequest('/api/search'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/_next/static/app.js'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/icon.svg'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/sitemap.xml'), { kind: 'next' })
})

test('does not redirect a ko path produced by an internal rewrite', () => {
  assert.deepEqual(
    classifyLocaleRequest('/ko/260723', { internalRewrite: true }),
    { kind: 'next' },
  )
})

test('marks internal locale rewrites so they are not canonicalized again', () => {
  const response = proxy(new NextRequest('http://localhost/260723'))

  assert.equal(
    response.headers.get('x-middleware-request-x-internal-locale-rewrite'),
    '1',
  )
  assert.match(
    response.headers.get('x-middleware-override-headers') ?? '',
    /x-internal-locale-rewrite/,
  )
})

test('redirects retired post slugs to the article that replaced them', () => {
  assert.deepEqual(classifyLocaleRequest('/260703'), {
    kind: 'redirect',
    pathname: '/260914',
    permanent: true,
  })
  assert.deepEqual(classifyLocaleRequest('/en/260703'), {
    kind: 'redirect',
    pathname: '/en/260914',
    permanent: true,
  })
  assert.deepEqual(classifyLocaleRequest('/pt-BR/260703'), {
    kind: 'redirect',
    pathname: '/pt-BR/260914',
    permanent: true,
  })
  // /ko 는 정규 경로가 아니므로 두 번 튀지 않고 한 번에 간다.
  assert.deepEqual(classifyLocaleRequest('/ko/260703'), {
    kind: 'redirect',
    pathname: '/260914',
    permanent: true,
  })
  assert.deepEqual(classifyLocaleRequest('/260703/'), {
    kind: 'redirect',
    pathname: '/260914',
    permanent: true,
  })
})

test('leaves live post slugs alone', () => {
  assert.deepEqual(classifyLocaleRequest('/260914'), {
    kind: 'rewrite',
    pathname: '/ko/260914',
  })
  assert.deepEqual(classifyLocaleRequest('/en/260914'), { kind: 'next' })
})
