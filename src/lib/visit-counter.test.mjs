import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bumpVisits,
  nextCounts,
  readVisits,
  seoulDay,
  toCounts,
  VISITS_KEY,
} from './visit-counter.ts'

/** etag 로 조건부 쓰기를 흉내 내는 최소 저장소. */
function createStore(initial = null) {
  const state = { record: initial, etag: initial ? 'e0' : undefined, writes: 0 }
  return {
    state,
    async getWithMetadata() {
      if (!state.record) return null
      return { data: state.record, etag: state.etag }
    },
    async setJSON(_key, value, options = {}) {
      state.writes += 1
      const stale =
        (options.onlyIfNew && state.record !== null) ||
        (options.onlyIfMatch !== undefined && options.onlyIfMatch !== state.etag)
      if (stale) return { modified: false }
      state.record = value
      state.etag = `e${state.writes}`
      return { modified: true }
    },
  }
}

test('seoulDay는 Asia/Seoul 기준 YYYY-MM-DD를 돌려준다', () => {
  // UTC 로는 전날 15:00 이지만 서울은 이미 다음 날이다.
  const day = seoulDay(new Date('2026-09-18T15:30:00Z'))
  assert.equal(day, '2026-09-19')
  assert.match(day, /^\d{4}-\d{2}-\d{2}$/)
})

test('날짜가 바뀌면 today만 1로 되돌리고 total은 잇는다', () => {
  const carried = nextCounts(
    { total: 1042, today: 37, day: '2026-09-18' },
    '2026-09-19',
  )
  assert.deepEqual(carried, { total: 1043, today: 1, day: '2026-09-19' })
})

test('같은 날이면 둘 다 올린다', () => {
  assert.deepEqual(
    nextCounts({ total: 10, today: 2, day: '2026-09-19' }, '2026-09-19'),
    { total: 11, today: 3, day: '2026-09-19' },
  )
})

test('빈 저장소에서 첫 방문은 1 · 1이다', () => {
  assert.deepEqual(nextCounts(null, '2026-09-19'), {
    total: 1,
    today: 1,
    day: '2026-09-19',
  })
})

test('어제 레코드를 읽으면 today는 0이다', () => {
  assert.deepEqual(
    toCounts({ total: 1042, today: 37, day: '2026-09-18' }, '2026-09-19'),
    { total: 1042, today: 0 },
  )
})

test('bumpVisits는 CAS가 성공할 때까지 다시 읽는다', async () => {
  const store = createStore({ total: 5, today: 5, day: '2026-09-19' })
  let raced = false

  const original = store.getWithMetadata
  store.getWithMetadata = async () => {
    const entry = await original()
    // 첫 읽기 직후 다른 요청이 끼어들어 etag 를 바꾼 상황을 만든다.
    if (!raced) {
      raced = true
      store.state.record = { total: 6, today: 6, day: '2026-09-19' }
      store.state.etag = 'intruder'
    }
    return entry
  }

  assert.deepEqual(await bumpVisits(store, '2026-09-19'), {
    total: 7,
    today: 7,
  })
})

test('경쟁에서 계속 지면 조용히 성공하지 않고 던진다', async () => {
  const store = {
    async getWithMetadata() {
      return { data: { total: 1, today: 1, day: '2026-09-19' }, etag: 'stale' }
    },
    async setJSON() {
      return { modified: false }
    },
  }
  await assert.rejects(() => bumpVisits(store, '2026-09-19'), /conditional writes/)
})

test('깨진 레코드는 0에서 다시 센다', async () => {
  const store = {
    async getWithMetadata() {
      return { data: { total: 'many' }, etag: 'e0' }
    },
    async setJSON(key, value) {
      assert.equal(key, VISITS_KEY)
      assert.deepEqual(value, { total: 1, today: 1, day: '2026-09-19' })
      return { modified: true }
    },
  }
  assert.deepEqual(await bumpVisits(store, '2026-09-19'), { total: 1, today: 1 })
})

test('readVisits는 아무것도 없을 때 0을 돌려준다', async () => {
  assert.deepEqual(await readVisits(createStore(), '2026-09-19'), {
    total: 0,
    today: 0,
  })
})
