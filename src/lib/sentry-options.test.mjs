import assert from 'node:assert/strict'
import test from 'node:test'

import { getSentryRuntimeOptions } from './sentry-options.ts'

test('enables Sentry only in production with a DSN and disables default PII', () => {
  assert.deepEqual(getSentryRuntimeOptions({
    SENTRY_DSN: 'https://public@example.invalid/1',
    NODE_ENV: 'production',
  }), {
    dsn: 'https://public@example.invalid/1',
    enabled: true,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })

  assert.equal(getSentryRuntimeOptions({
    SENTRY_DSN: 'https://public@example.invalid/1',
    NODE_ENV: 'development',
  }).enabled, false)
})

test('adds explicit release and deployment environment when configured', () => {
  const options = getSentryRuntimeOptions({
    NEXT_PUBLIC_SENTRY_DSN: 'https://public@example.invalid/2',
    NODE_ENV: 'production',
    SENTRY_RELEASE: 'blog@abc123',
    SENTRY_ENVIRONMENT: 'netlify-production',
  })

  assert.equal(options.release, 'blog@abc123')
  assert.equal(options.environment, 'netlify-production')
})
