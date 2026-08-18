import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyAiReferral } from './ai-referral.ts'

test('classifies only known AI sources', () => {
  const cases = [
    [{ utmSource: 'chatgpt.com' }, 'chatgpt'],
    [{ utmSource: 'Claude' }, 'claude'],
    [{ referrer: 'https://www.perplexity.ai/search/example' }, 'perplexity'],
    [{ referrer: 'https://copilot.microsoft.com/' }, 'copilot'],
    [{ referrer: 'https://gemini.google.com/app' }, 'gemini'],
  ]

  for (const [input, expected] of cases) {
    assert.equal(classifyAiReferral(input), expected)
  }
})

test('ignores unknown and malformed referral data', () => {
  assert.equal(
    classifyAiReferral({
      utmSource: 'newsletter',
      referrer: 'https://google.com/',
    }),
    undefined,
  )
  assert.equal(classifyAiReferral({ referrer: 'not a URL' }), undefined)
})

test('prefers a recognized utm source over the referrer', () => {
  assert.equal(
    classifyAiReferral({
      utmSource: 'claude',
      referrer: 'https://www.perplexity.ai/',
    }),
    'claude',
  )
})
