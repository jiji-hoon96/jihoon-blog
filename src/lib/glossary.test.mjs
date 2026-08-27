import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertGlossarySource,
  getGlossaryForLocale,
  validateGlossarySource,
} from './glossary.ts'

const valid = {
  rum: {
    ko: { name: 'RUM', definition: '실제 사용자 환경에서 경험 데이터를 수집하는 방식' },
    en: { name: 'RUM', definition: 'Collection of experience data from real user environments' },
  },
}

test('validates and narrows a glossary by locale', () => {
  assert.deepEqual(validateGlossarySource(valid), [])
  assertGlossarySource(valid)
  assert.deepEqual(getGlossaryForLocale(valid, 'ko'), { rum: valid.rum.ko })
})

test('rejects invalid keys, empty text, and unknown locales', () => {
  const errors = validateGlossarySource({
    'RUM Value': { ko: { name: 'RUM', definition: '' } },
    trace: { fr: { name: 'Trace', definition: 'Chemin' } },
  })

  assert.ok(errors.some(error => error.includes('RUM Value')))
  assert.ok(errors.some(error => error.includes('definition')))
  assert.ok(errors.some(error => error.includes('fr')))
})

test('rejects arrays, empty locale maps, and unsupported entry fields', () => {
  const errors = validateGlossarySource({
    empty: {},
    array: [],
    extra: { ko: { name: 'Extra', definition: '설명', href: 'https://example.com' } },
  })

  assert.ok(errors.some(error => error.includes('expected at least one locale')))
  assert.ok(errors.some(error => error.includes('expected a locale object')))
  assert.ok(errors.some(error => error.includes('unsupported field')))
})
