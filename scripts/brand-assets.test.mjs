import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

test('uses a transparent responsive Hunji wordmark favicon', () => {
  for (const path of ['src/app/icon.svg', 'public/favicon.svg']) {
    const svg = readFileSync(path, 'utf8')

    assert.match(svg, /훈지/)
    assert.match(svg, /prefers-color-scheme:\s*dark/)
    assert.match(svg, /<path/)
    assert.doesNotMatch(svg, /<rect|<circle|<text/)
  }

  assert.equal(existsSync('src/app/favicon.ico'), false)
})
