import * as Sentry from '@sentry/nextjs'

/**
 * Next 의 instrumentation 훅. 런타임별로 Sentry 초기화 파일을 불러온다.
 *
 * `src/app` 을 쓰는 프로젝트이므로 이 파일도 `src/` 에 둔다.
 * (next/dist/build/index.js 가 app/pages 와 같은 레벨에서 instrumentation 을 탐지한다)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * 서버에서 발생한 요청 에러를 Sentry 로 보낸다.
 *
 * async context 전파에 의존하지 않고 Next 가 직접 넘겨주는 훅이라,
 * Vercel 이 아닌 런타임(여기서는 Netlify)에서도 상대적으로 안전한 경로다.
 */
export const onRequestError = Sentry.captureRequestError
