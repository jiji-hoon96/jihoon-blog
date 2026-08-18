import assert from 'node:assert/strict'
import test from 'node:test'

import { remarkBilingualQuote } from './remark-bilingual-quote.ts'

function directive(name, children) {
  return { type: 'containerDirective', name, children }
}

function quoteTree({ translation, original }) {
  return {
    type: 'root',
    children: [
      directive('quote', [
        ...(translation === undefined ? [] : [directive('translation', translation)]),
        ...(original === undefined ? [] : [directive('original', original)]),
      ]),
    ],
  }
}

test('turns a complete quote directive into a bilingual blockquote', () => {
  const tree = quoteTree({
    translation: [{ type: 'paragraph', children: [{ type: 'text', value: '한국어 번역' }] }],
    original: [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }],
  })

  remarkBilingualQuote()(tree)

  const quote = tree.children[0]
  assert.deepEqual(quote.data, {
    hName: 'blockquote',
    hProperties: { className: ['bilingual-quote'] },
  })
  assert.deepEqual(quote.children[0].data, {
    hName: 'div',
    hProperties: { className: ['quote-translation'], lang: 'ko' },
  })
  assert.deepEqual(quote.children[1].data, {
    hName: 'div',
    hProperties: { className: ['quote-original'], lang: 'en' },
  })
})

test('renders translation before original when source children are reversed', () => {
  const tree = {
    type: 'root',
    children: [directive('quote', [
      directive('original', [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }]),
      directive('translation', [{ type: 'paragraph', children: [{ type: 'text', value: '한국어 번역' }] }]),
    ])],
  }

  remarkBilingualQuote()(tree)

  assert.equal(tree.children[0].children[0].name, 'translation')
  assert.equal(tree.children[0].children[1].name, 'original')
})

test('rejects missing, duplicate, and empty quote children', () => {
  const cases = [
    ['missing translation', quoteTree({ original: [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }] })],
    ['missing original', quoteTree({ translation: [{ type: 'paragraph', children: [{ type: 'text', value: '한국어 번역' }] }] })],
    ['duplicate translation', {
      type: 'root',
      children: [directive('quote', [
        directive('translation', [{ type: 'paragraph', children: [{ type: 'text', value: '첫 번역' }] }]),
        directive('translation', [{ type: 'paragraph', children: [{ type: 'text', value: '두 번역' }] }]),
        directive('original', [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }]),
      ])],
    }],
    ['duplicate original', {
      type: 'root',
      children: [directive('quote', [
        directive('translation', [{ type: 'paragraph', children: [{ type: 'text', value: '한국어 번역' }] }]),
        directive('original', [{ type: 'paragraph', children: [{ type: 'text', value: 'First original' }] }]),
        directive('original', [{ type: 'paragraph', children: [{ type: 'text', value: 'Second original' }] }]),
      ])],
    }],
    ['empty translation', quoteTree({ translation: [{ type: 'paragraph', children: [] }], original: [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }] })],
    ['empty original', quoteTree({ translation: [{ type: 'paragraph', children: [{ type: 'text', value: '한국어 번역' }] }], original: [{ type: 'paragraph', children: [] }] })],
  ]

  for (const [name, tree] of cases) {
    assert.throws(() => remarkBilingualQuote()(tree), {
      name: 'Error',
      message: 'Invalid bilingual quote: expected exactly one non-empty translation and original',
    }, name)
  }
})

test('leaves ordinary blockquotes unchanged', () => {
  const tree = {
    type: 'root',
    children: [{
      type: 'blockquote',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Unchanged' }] }],
    }],
  }
  const before = structuredClone(tree)

  remarkBilingualQuote()(tree)

  assert.deepEqual(tree, before)
})

test('uses the document locale for translated quote text', () => {
  const tree = quoteTree({
    translation: [{ type: 'paragraph', children: [{ type: 'text', value: 'Traducción' }] }],
    original: [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }],
  })

  remarkBilingualQuote()(tree, { path: '/content/260703/index.es.md' })

  assert.equal(tree.children[0].children[0].data.hProperties.lang, 'es')
  assert.equal(tree.children[0].children[1].data.hProperties.lang, 'en')
})

test('renders one primary quote when the page locale matches the English original', () => {
  const tree = quoteTree({
    translation: [{ type: 'paragraph', children: [{ type: 'text', value: 'English translation' }] }],
    original: [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }],
  })

  remarkBilingualQuote()(tree, { path: '/content/260703/index.en.md' })

  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[0].children[0].name, 'original')
  assert.deepEqual(tree.children[0].children[0].data, {
    hName: 'div',
    hProperties: { className: ['quote-translation'], lang: 'en' },
  })
})
