import assert from 'node:assert/strict'
import test from 'node:test'

import {
  chooseGlossaryPresentation,
  glossaryUiReducer,
  placeGlossaryTooltip,
} from './glossary-ui.ts'

test('uses a tooltip for keyboard and fine pointers, and a sheet for touch', () => {
  assert.equal(
    chooseGlossaryPresentation({ input: 'keyboard', hoverCapable: false }),
    'tooltip',
  )
  assert.equal(
    chooseGlossaryPresentation({ input: 'mouse', hoverCapable: true }),
    'tooltip',
  )
  assert.equal(
    chooseGlossaryPresentation({ input: 'touch', hoverCapable: false }),
    'sheet',
  )
  assert.equal(
    chooseGlossaryPresentation({ input: 'pen', hoverCapable: false }),
    'sheet',
  )
})

test('opens, pins, switches targets, and closes one shared explanation', () => {
  const closed = { status: 'closed' }
  const opened = glossaryUiReducer(closed, {
    type: 'open',
    key: 'rum',
    presentation: 'tooltip',
    pinned: false,
  })
  const pinned = glossaryUiReducer(opened, {
    type: 'toggle-pin',
    key: 'rum',
  })
  const switched = glossaryUiReducer(pinned, {
    type: 'open',
    key: 'span',
    presentation: 'tooltip',
    pinned: false,
  })

  assert.deepEqual(pinned, {
    status: 'open',
    key: 'rum',
    presentation: 'tooltip',
    pinned: true,
  })
  assert.deepEqual(switched, {
    status: 'open',
    key: 'span',
    presentation: 'tooltip',
    pinned: false,
  })
  assert.deepEqual(glossaryUiReducer(switched, { type: 'close' }), closed)
})

test('places above when possible and flips below near the top edge', () => {
  assert.deepEqual(
    placeGlossaryTooltip(
      { top: 200, left: 300, width: 80, height: 24 },
      { width: 240, height: 100 },
      { width: 800, height: 600 },
      8,
    ),
    { top: 92, left: 220, side: 'top' },
  )

  assert.deepEqual(
    placeGlossaryTooltip(
      { top: 20, left: 4, width: 40, height: 24 },
      { width: 240, height: 100 },
      { width: 320, height: 600 },
      8,
    ),
    { top: 52, left: 8, side: 'bottom' },
  )
})
