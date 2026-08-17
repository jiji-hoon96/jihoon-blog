import assert from 'node:assert/strict'
import test from 'node:test'

import { rehypeOpenLinksInNewTab } from './rehype-open-links-in-new-tab.ts'

test('opens authored links in a new tab while preserving heading anchors', () => {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'a',
        properties: { href: '/about' },
        children: [],
      },
      {
        type: 'element',
        tagName: 'a',
        properties: { href: 'https://example.com', rel: ['nofollow'] },
        children: [],
      },
      {
        type: 'element',
        tagName: 'a',
        properties: { href: '#section', className: ['anchor'] },
        children: [],
      },
    ],
  }

  rehypeOpenLinksInNewTab()(tree)

  assert.deepEqual(tree.children[0].properties, {
    href: '/about',
    target: '_blank',
    rel: ['noopener', 'noreferrer'],
  })
  assert.deepEqual(tree.children[1].properties, {
    href: 'https://example.com',
    target: '_blank',
    rel: ['nofollow', 'noopener', 'noreferrer'],
  })
  assert.deepEqual(tree.children[2].properties, {
    href: '#section',
    className: ['anchor'],
  })
})
