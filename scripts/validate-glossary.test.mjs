import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractTermReferences,
  validateMarkdownTerms,
} from './validate-glossary.mjs'

const glossary = {
  rum: { ko: { name: 'RUM', definition: '실제 사용자 관측' } },
}

test('extracts valid terms with one-based line numbers and ignores code fences', () => {
  const markdown = [
    ':term[RUM]{key="rum"}',
    '```md',
    ':term[예시]{key="missing"}',
    '```',
    ':term[실제 사용자 모니터링]{key=\'rum\'}',
  ].join('\n')

  assert.deepEqual(extractTermReferences(markdown), [
    { key: 'rum', label: 'RUM', line: 1 },
    { key: 'rum', label: '실제 사용자 모니터링', line: 5 },
  ])
})

test('reports malformed directives, unknown keys, and missing locale entries', () => {
  assert.deepEqual(
    validateMarkdownTerms({
      markdown: [
        ':term[]{key="rum"}',
        ':term[Trace]{key="trace"}',
        ':term[RUM]{key="rum"}',
      ].join('\n'),
      locale: 'en',
      glossary,
      file: 'content/260703/index.en.md',
    }),
    [
      'content/260703/index.en.md:1: term label must not be empty',
      'content/260703/index.en.md:2: unknown glossary key "trace"',
      'content/260703/index.en.md:3: glossary key "rum" has no "en" entry',
    ],
  )
})

test('rejects missing keys, invalid keys, and extra attributes', () => {
  const errors = validateMarkdownTerms({
    markdown: [
      ':term[RUM]',
      ':term[RUM]{key="RUM Value"}',
      ':term[RUM]{key="rum" title="extra"}',
    ].join('\n'),
    locale: 'ko',
    glossary,
    file: 'draft.md',
  })

  assert.deepEqual(errors, [
    'draft.md:1: term directive requires one key attribute',
    'draft.md:2: invalid glossary key "RUM Value"',
    'draft.md:3: term directive requires one key attribute',
  ])
})
