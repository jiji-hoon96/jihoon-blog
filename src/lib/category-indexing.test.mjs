import assert from 'node:assert/strict'
import test from 'node:test'
import { isIndexableCategory, MIN_INDEXABLE_CATEGORY_POSTS } from './category-indexing.ts'

test('글 하나짜리 카테고리는 색인하지 않는다', () => {
  assert.equal(isIndexableCategory(1), false)
  assert.equal(isIndexableCategory(0), false)
})

test('글이 둘 이상이면 색인한다', () => {
  assert.equal(isIndexableCategory(2), true)
  assert.equal(isIndexableCategory(17), true)
})

test('경계는 상수 하나로 정해진다', () => {
  assert.equal(isIndexableCategory(MIN_INDEXABLE_CATEGORY_POSTS), true)
  assert.equal(isIndexableCategory(MIN_INDEXABLE_CATEGORY_POSTS - 1), false)
})
