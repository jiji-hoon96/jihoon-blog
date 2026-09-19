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

test('redirects ko-prefixed feeds so they do not duplicate the canonical ones', () => {
  // 점이 든 경로는 파일처럼 보여서 아래 규칙에 걸린다. 명시적으로 처리하지 않으면
  // /ko/rss.xml 이 /rss.xml 과 같은 바이트를 내주는 중복 콘텐츠가 된다.
  assert.deepEqual(classifyLocaleRequest('/ko/rss.xml'), {
    kind: 'redirect',
    pathname: '/rss.xml',
  })
  assert.deepEqual(classifyLocaleRequest('/ko/llms.txt'), {
    kind: 'redirect',
    pathname: '/llms.txt',
  })

  // 내부 rewrite 로 들어온 같은 경로는 그대로 통과해야 한다. 아니면 무한 루프다.
  assert.deepEqual(
    classifyLocaleRequest('/ko/rss.xml', { internalRewrite: true }),
    { kind: 'next' },
  )

  // 다른 로케일의 피드는 그 자체가 정규 경로다.
  assert.deepEqual(classifyLocaleRequest('/en/rss.xml'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/pt-BR/llms.txt'), { kind: 'next' })
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
    pathname: '/260913',
    permanent: true,
  })
  assert.deepEqual(classifyLocaleRequest('/en/260703'), {
    kind: 'redirect',
    pathname: '/en/260913',
    permanent: true,
  })
  assert.deepEqual(classifyLocaleRequest('/pt-BR/260703'), {
    kind: 'redirect',
    pathname: '/pt-BR/260913',
    permanent: true,
  })
  // /ko 는 정규 경로가 아니므로 두 번 튀지 않고 한 번에 간다.
  assert.deepEqual(classifyLocaleRequest('/ko/260703'), {
    kind: 'redirect',
    pathname: '/260913',
    permanent: true,
  })
  assert.deepEqual(classifyLocaleRequest('/260703/'), {
    kind: 'redirect',
    pathname: '/260913',
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

// 프로덕션에서 /posts/%E0 가 404 가 아니라 500 을 냈다. Next 의 URL 정규화가
// 디코딩 불가능한 escape 에서 URIError 를 던지는데, 그 예외는 not-found 경로를
// 타지 않아 서버 오류로 집계된다. 스캐너가 흔히 만드는 입력이다.
test('answers 404 for paths with undecodable percent escapes', () => {
  for (const pathname of ['/%E0', '/posts/%E0', '/posts/%ED%95', '/en/%E0']) {
    assert.deepEqual(
      classifyLocaleRequest(pathname),
      { kind: 'not-found' },
      pathname,
    )
  }

  const response = proxy(
    new NextRequest(new URL('https://hooninedev.com/posts/%E0')),
  )
  assert.equal(response.status, 404)
  assert.equal(response.headers.get('x-middleware-rewrite'), null)
})

test('leaves well-formed percent escapes alone', () => {
  assert.deepEqual(classifyLocaleRequest('/posts/%ED%95%9C%EA%B8%80'), {
    kind: 'rewrite',
    pathname: '/ko/posts/%ED%95%9C%EA%B8%80',
  })
})

// OG 이미지는 파일 컨벤션이 만들고 Next 가 그 내부 경로를 메타태그에 그대로 쓴다.
// 한국어만 접두사가 없어서 `/ko/opengraph-image` 가 광고되는데, 정규화 리다이렉트가
// 그것을 307 로 돌리면 리다이렉트를 따르지 않는 소셜 unfurler 가 카드를 비운다.
test('serves the ko OG image path directly instead of canonicalizing it', () => {
  assert.deepEqual(classifyLocaleRequest('/ko/opengraph-image'), { kind: 'next' })
  assert.deepEqual(classifyLocaleRequest('/ko/260913/opengraph-image'), {
    kind: 'next',
  })
  // 다른 /ko 경로는 그대로 정규화한다
  assert.deepEqual(classifyLocaleRequest('/ko/posts'), {
    kind: 'redirect',
    pathname: '/posts',
  })
})
