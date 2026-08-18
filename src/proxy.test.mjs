import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyLocaleRequest } from './lib/locale-request.ts'

test('rewrites legacy Korean page URLs to the internal ko locale tree', () => {
  assert.deepEqual(classifyLocaleRequest('/'), {
    kind: 'rewrite',
    pathname: '/ko',
  })
  assert.deepEqual(classifyLocaleRequest('/260703'), {
    kind: 'rewrite',
    pathname: '/ko/260703',
  })
  assert.deepEqual(classifyLocaleRequest('/posts'), {
    kind: 'rewrite',
    pathname: '/ko/posts',
  })
})

test('leaves supported foreign locale URLs unchanged', () => {
  assert.deepEqual(classifyLocaleRequest('/en/260703'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/pt-BR/posts'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/zh-CN'), { kind: 'next' })
})

test('redirects visible ko-prefixed URLs to canonical legacy URLs', () => {
  assert.deepEqual(classifyLocaleRequest('/ko'), {
    kind: 'redirect',
    pathname: '/',
  })
  assert.deepEqual(classifyLocaleRequest('/ko/260703'), {
    kind: 'redirect',
    pathname: '/260703',
  })
})

test('does not localize APIs, Next assets, or file-like paths', () => {
  assert.deepEqual(classifyLocaleRequest('/api/search'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/_next/static/app.js'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/icon.svg'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/sitemap.xml'), { kind: 'next' })
})
