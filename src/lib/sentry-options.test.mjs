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

test('falls back to the Netlify build context so previews do not look like production', () => {
  assert.equal(getSentryRuntimeOptions({
    SENTRY_DSN: 'https://public@example.invalid/3',
    NODE_ENV: 'production',
    CONTEXT: 'deploy-preview',
  }).environment, 'deploy-preview')

  // 명시적으로 준 값이 항상 이긴다.
  assert.equal(getSentryRuntimeOptions({
    SENTRY_DSN: 'https://public@example.invalid/3',
    NODE_ENV: 'production',
    SENTRY_ENVIRONMENT: 'staging',
    CONTEXT: 'deploy-preview',
  }).environment, 'staging')
})

test('uses the build-time context so local production builds are not reported as production', () => {
  assert.equal(getSentryRuntimeOptions({
    SENTRY_DSN: 'https://public@example.invalid/4',
    NODE_ENV: 'production',
    SENTRY_BUILD_CONTEXT: 'local',
  }).environment, 'local')

  // 런타임에 CONTEXT 가 보이면 그쪽이 이긴다.
  assert.equal(getSentryRuntimeOptions({
    SENTRY_DSN: 'https://public@example.invalid/4',
    NODE_ENV: 'production',
    CONTEXT: 'deploy-preview',
    SENTRY_BUILD_CONTEXT: 'production',
  }).environment, 'deploy-preview')
})
