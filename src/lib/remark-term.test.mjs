import assert from 'node:assert/strict'
import test from 'node:test'

import { remarkTerm } from './remark-term.ts'

function term({ label = 'RUM', key = 'rum', attributes = {} } = {}) {
  return {
    type: 'textDirective',
    name: 'term',
    attributes: { key, ...attributes },
    children: label ? [{ type: 'text', value: label }] : [],
  }
}

test('turns a term directive into progressive inline markup', () => {
  const tree = {
    type: 'root',
    children: [{ type: 'paragraph', children: [term()] }],
  }
  remarkTerm()(tree, { path: '/content/260703/index.md' })

  const node = tree.children[0].children[0]
  assert.deepEqual(node.data, {
    hName: 'span',
    hProperties: {
      className: ['glossary-term-source'],
      'data-glossary-key': 'rum',
    },
  })
  assert.deepEqual(node.children, [{ type: 'text', value: 'RUM' }])
})

test('rejects missing labels, invalid keys, and extra attributes', () => {
  for (const node of [
    term({ label: '' }),
    term({ key: 'RUM Value' }),
    term({ attributes: { title: 'not allowed' } }),
  ]) {
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [node] }],
    }
    assert.throws(
      () => remarkTerm()(tree, { path: '/content/test/index.md' }),
      /Invalid term directive/u,
    )
  }
})
