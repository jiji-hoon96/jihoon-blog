import * as Sentry from '@sentry/nextjs'
import { getSentryRuntimeOptions } from './lib/sentry-options'

/**
 * Edge 런타임 Sentry 초기화.
 *
 * 현재 이 블로그에는 edge 런타임을 쓰는 라우트나 미들웨어가 없지만,
 * withSentryConfig 는 edge 빌드를 조건 없이 배선하므로 파일을 두는 편이 안전하다.
 */

Sentry.init(getSentryRuntimeOptions(process.env))
