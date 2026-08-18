import assert from 'node:assert/strict'
import test from 'node:test'

import { getCrawlerRules } from './crawler-policy.ts'

test('allows search, user-fetch, training, and fallback crawlers', () => {
  assert.deepEqual(getCrawlerRules(), [
    { userAgent: 'Googlebot', allow: '/' },
    { userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot'], allow: '/' },
    { userAgent: ['Claude-SearchBot', 'Claude-User', 'ClaudeBot'], allow: '/' },
    { userAgent: ['PerplexityBot', 'Perplexity-User'], allow: '/' },
    { userAgent: '*', allow: '/' },
  ])
})
