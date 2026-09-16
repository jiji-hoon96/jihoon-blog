import assert from 'node:assert/strict'
import test from 'node:test'

import { sendGaEvent } from './ga-event.ts'

function withWindow(run) {
  const previous = globalThis.window
  globalThis.window = {}
  try {
    return run(globalThis.window)
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
}

test('queues events even when gtag.js has not loaded yet', () => {
  withWindow(target => {
    sendGaEvent('web_vitals', { metric_id: 'v1-1' })

    assert.equal(target.dataLayer.length, 1)
    assert.deepEqual(Array.from(target.dataLayer[0]), [
      'event',
      'web_vitals',
      { metric_id: 'v1-1' },
    ])
  })
})

test('reuses the queue the inline gtag snippet created', () => {
  withWindow(target => {
    target.dataLayer = ['existing']
    sendGaEvent('ai_referral', { ai_source: 'chatgpt' })

    assert.equal(target.dataLayer.length, 2)
    assert.equal(target.dataLayer[0], 'existing')
  })
})

test('does nothing on the server instead of throwing', () => {
  assert.equal(typeof window, 'undefined')
  assert.doesNotThrow(() => sendGaEvent('web_vitals', {}))
})
