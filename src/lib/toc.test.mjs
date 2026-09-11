import assert from 'node:assert/strict'
import test from 'node:test'
import { extractToc } from './toc.ts'

test('rehypeSlug 가 박아 둔 id 를 그대로 쓴다', () => {
  const html = '<h2 id="추상과-추상화"><a class="anchor" href="#추상과-추상화">추상과 추상화</a></h2>'

  assert.deepEqual(extractToc(html), [
    { id: '추상과-추상화', text: '추상과 추상화', level: 2 },
  ])
})

test('h2 와 h3 를 문서 순서대로 모으고 level 을 구분한다', () => {
  const html = `
    <h2 id="a">A</h2>
    <p>본문</p>
    <h3 id="b">B</h3>
    <h2 id="c">C</h2>
  `

  assert.deepEqual(
    extractToc(html).map(item => [item.id, item.level]),
    [['a', 2], ['b', 3], ['c', 2]],
  )
})

test('h1 과 h4 는 목차에 넣지 않는다', () => {
  const html = '<h1 id="t">제목</h1><h2 id="a">A</h2><h4 id="d">D</h4>'

  assert.deepEqual(extractToc(html).map(item => item.id), ['a'])
})

test('heading 안의 태그를 걷어내고 텍스트만 남긴다', () => {
  const html = '<h2 id="x">왜 <code>useSyncExternalStore</code> 인가</h2>'

  assert.equal(extractToc(html)[0].text, '왜 useSyncExternalStore 인가')
})

test('엔티티를 되돌린다', () => {
  const html = '<h2 id="x">a &amp; b &lt;c&gt; &#39;d&#39;</h2>'

  assert.equal(extractToc(html)[0].text, "a & b <c> 'd'")
})

test('id 가 없으면 예전 클라이언트 파싱과 같은 방식으로 만든다', () => {
  const html = '<h2>추상과 추상화</h2>'

  assert.equal(extractToc(html)[0].id, '추상과-추상화')
})

test('heading 이 없으면 빈 배열이다', () => {
  assert.deepEqual(extractToc('<p>본문뿐이다</p>'), [])
})

test('여러 줄에 걸친 heading 도 잡는다', () => {
  const html = '<h2 id="m">\n  여러 줄\n  제목\n</h2>'

  assert.deepEqual(extractToc(html), [{ id: 'm', text: '여러 줄 제목', level: 2 }])
})
