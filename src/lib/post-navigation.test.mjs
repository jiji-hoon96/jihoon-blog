import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdjacentPosts, getRelatedPosts } from './post-navigation.ts'

function post({ slug, date, categories = 'AI', draft = false }) {
  return {
    slug,
    date,
    categories,
    categoryArray: categories.split(/\s+/),
    draft,
  }
}

test('excludes hidden posts from adjacent navigation', () => {
  const posts = [
    post({ slug: '/newer', date: '2026-06-22' }),
    post({
      slug: '/hidden',
      date: '2026-06-17',
      categories: 'ignore AI',
    }),
    post({ slug: '/current', date: '2026-06-11' }),
  ]

  assert.deepEqual(getAdjacentPosts('/current', posts), {
    prev: posts[0],
    next: null,
  })
})

test('excludes hidden posts from related posts', () => {
  const posts = [
    post({ slug: '/current', date: '2026-06-22' }),
    post({
      slug: '/hidden',
      date: '2026-06-17',
      categories: 'ignore AI',
    }),
    post({ slug: '/public', date: '2026-06-11' }),
  ]

  assert.deepEqual(
    getRelatedPosts('/current', 3, posts).map(candidate => candidate.slug),
    ['/public'],
  )
})
