import assert from 'node:assert/strict'
import test from 'node:test'

import { createServerExceptionCapture } from './sentry-server.ts'

test('captures only low-cardinality server context as tags', () => {
  const calls = []
  const capture = createServerExceptionCapture((error, hint) => {
    calls.push({ error, hint })
    return 'event-id'
  })
  const error = new Error('failed')

  const eventId = capture(error, {
    locale: 'ja',
    routeKind: 'rss',
    operation: 'generate',
    query: 'private search text',
    body: 'article body',
  })

  assert.equal(eventId, 'event-id')
  assert.deepEqual(calls, [{
    error,
    hint: {
      tags: { locale: 'ja', routeKind: 'rss', operation: 'generate' },
    },
  }])
})

test('omits an absent locale instead of inventing request context', () => {
  let capturedHint
  const capture = createServerExceptionCapture((_error, hint) => {
    capturedHint = hint
    return 'event-id'
  })

  capture('failure', { routeKind: 'analytics', operation: 'stats' })

  assert.deepEqual(capturedHint, {
    tags: { routeKind: 'analytics', operation: 'stats' },
  })
})
