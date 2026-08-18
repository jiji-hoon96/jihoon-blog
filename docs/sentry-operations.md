# Sentry operations

This blog intentionally uses Sentry on the server and Edge runtimes only. There is no `src/instrumentation-client.ts`: the measured browser SDK cost was about 79 KB gzip, while the current failures of interest occur in server-side Google Analytics calls. Core Web Vitals remain in the lightweight GA reporter.

## Runtime configuration

- `SENTRY_DSN` (or the existing `NEXT_PUBLIC_SENTRY_DSN` fallback): event destination.
- `SENTRY_RELEASE`: stable release identifier shared with source-map uploads.
- `SENTRY_ENVIRONMENT`: low-cardinality deployment environment such as `production` or `deploy-preview`.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`: build-time source-map upload credentials.

Runtime capture is enabled only when a DSN exists and `NODE_ENV=production`. Default PII is disabled and tracing is sampled at 10%.

Handled server failures go through `captureServerException`. It emits only `locale`, `routeKind`, and `operation` tags; never pass article bodies, search queries, credentials, or request objects. Unhandled request failures are left to Next.js `onRequestError` so events are not duplicated.

## Deployment checks

1. Confirm the build log shows the Sentry source-map upload when `SENTRY_AUTH_TOKEN` is present. Upload logs intentionally remain visible.
2. Confirm the Sentry release matches `SENTRY_RELEASE` and a production stack resolves to `src/` source lines.
3. Confirm uploaded maps are removed from `.next/server` and `.next/static` after upload. Without an auth token, upload and deletion are both skipped.
4. Confirm no `src/instrumentation-client.ts` or browser Sentry chunk appears in the build unless a new bundle measurement explicitly justifies it.
